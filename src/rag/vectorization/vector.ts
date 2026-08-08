import { config } from "dotenv";
import { loadDocuments } from "../chunking/documentLoader.ts";
import { splitDocuments } from "../chunking/chunking.ts";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import cliProgress from "cli-progress";
config();

console.log("=== Starting DOM-Aware Chunking + Vectorization ===");
const rawDocuments = await loadDocuments();
const chunked = await splitDocuments(rawDocuments);
console.log(`\n✓ Chunking complete. Ready to vectorize ${chunked.length} semantic chunks.\n`);

const embeddingLLM = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
});
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
});

const indexName = "portfolio-production";

try {
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);
    
    if (!indexExists) {
        console.log(`Index "${indexName}" not found. Creating index...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536,
            metric: "cosine",
            spec: {
                serverless: {
                    cloud: "aws",
                    region: "us-east-1"
                }
            }
        });
        console.log(`Index "${indexName}" created successfully.`);
        console.log("Waiting for index to be ready...");
        await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
        console.log(`Index "${indexName}" already exists.`);
    }
} catch (error) {
    console.error("Error checking/creating index:", error);
    throw error;
}

const pineconeIndex = pinecone.Index(indexName);

// Clear existing vectors so stale chunks do not pollute retrieval
console.log("\n=== Clearing existing vectors ===");
try {
    await pineconeIndex.deleteAll();
    console.log("Deleted all vectors in default namespace.");
    // Brief wait for delete to settle on serverless
    await new Promise(resolve => setTimeout(resolve, 3000));
} catch (error: any) {
    // Empty index can throw; continue
    console.warn("deleteAll note:", error?.message || error);
}

const progressBar = new cliProgress.SingleBar({});
progressBar.start(chunked.length, 0);

for (let i = 0; i < chunked.length; i += 100) {
    const batch = chunked.slice(i, i + 100);
    await PineconeStore.fromDocuments(batch, embeddingLLM, {
        pineconeIndex: pineconeIndex
    });
    progressBar.increment(batch.length);
}

progressBar.stop();
console.log("Documents indexed successfully");

console.log("\n=== Verifying Vector Storage ===");
try {
    const stats = await pineconeIndex.describeIndexStats();
    console.log(`Total vectors stored: ${stats.totalRecordCount || stats.namespaces?.default?.recordCount || 'N/A'}`);
    
    const queryResponse = await pineconeIndex.query({
        vector: new Array(1536).fill(0),
        topK: 1,
        includeMetadata: true,
        includeValues: true,
    });
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
        const sample = queryResponse.matches[0];
        console.log(`\nSample Vector Record:`);
        console.log(`- ID: ${sample.id}`);
        console.log(`- Score: ${sample.score}`);
        console.log(`- Vector Dimension: ${sample.values?.length || 'N/A'} (should be 1536)`);
        console.log(`- Metadata:`, JSON.stringify(sample.metadata, null, 2));
        console.log(`\n✓ Vectors stored successfully.`);
    }
} catch (error) {
    console.error("Error verifying vectors:", error);
}
