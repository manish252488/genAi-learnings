import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "dotenv";
config();
// basic prompt template

async function gemini() {
    const promptTemplate = new PromptTemplate({
        template: "Who created {language} and what is it?",
        inputVariables: ["language"],
    });
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,

    });
    const outputParser = new StringOutputParser();
    const chain = promptTemplate.pipe(model).pipe(outputParser);
    const answer = await chain.invoke({
        language: 'Node.js',
    });
    console.log('answer --> ', answer);
}

gemini();