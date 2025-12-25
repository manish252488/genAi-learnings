// lang chain expression language (lcel) and use of json parser

import { JsonOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "dotenv";
config();
const lcelComponent = async () => {
    const lec = new PromptTemplate({
        template: "JavaScript has been used for about {years} to build {typeOfApps} across {platforms}. limit output to {limit} words. give the output in json",
        inputVariables: ["years", "typeOfApps", "platforms", "limit"]
    });
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
    });
    const formattedPrompt = await lec.format({
        years: 20,
        typeOfApps: "web applications",
        platforms: "web, mobile, desktop",
        limit: 50,
    });
    console.log('formattedPrompt --> ', formattedPrompt);

    // const outputParser = new StringOutputParser();
    const jsonParser = new JsonOutputParser();

    // chain
    const lcelChain = lec.pipe(model).pipe(jsonParser);
    const answer = await lcelChain.invoke({
        years: 20,
        typeOfApps: "web applications",
        platforms: "web, mobile, desktop",
        limit: 50,
    });
    console.log('answer --> ', answer);
}

lcelComponent();