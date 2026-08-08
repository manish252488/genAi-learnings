import { Document } from "@langchain/core/documents";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import cliProgress from "cli-progress";
import { crawlResumeUrls, Resume_URL } from "./webcrawler.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_INDEX_HTML = path.resolve(__dirname, "../../../index.html");

/**
 * Load HTML that preserves DOM structure for semantic chunking.
 * - RAG_SOURCE=local → read project root index.html
 * - otherwise fetch raw HTML from crawled Netlify URLs (not text-only CheerioWebBaseLoader)
 */
export async function loadDocuments(): Promise<Document[]> {
  const source = (process.env.RAG_SOURCE || "remote").toLowerCase();

  if (source === "local") {
    console.log(`Loading local HTML: ${LOCAL_INDEX_HTML}`);
    const html = await fs.readFile(LOCAL_INDEX_HTML, "utf-8");
    const doc = new Document({
      pageContent: html,
      metadata: {
        source: LOCAL_INDEX_HTML,
        url: "local://index.html",
        contentType: "text/html",
      },
    });
    console.log(`1 document loaded from local index.html (${html.length} chars).`);
    return [doc];
  }

  const resumeUrls = await crawlResumeUrls();
  const urls = resumeUrls.length > 0 ? resumeUrls : [Resume_URL];

  console.log(`Starting HTML download. ${urls.length} total documents.`);

  const progressBar = new cliProgress.SingleBar({});
  progressBar.start(urls.length, 0);

  const rawDocuments: Document[] = [];

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    rawDocuments.push(
      new Document({
        pageContent: html,
        metadata: {
          source: url,
          url,
          contentType: "text/html",
        },
      })
    );
    progressBar.increment();
  }

  progressBar.stop();
  console.log(`${rawDocuments.length} HTML documents loaded.`);
  return rawDocuments;
}
