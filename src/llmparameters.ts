// auto completing sentences
// llm paramters will check the probaliblity of the next word now it will sampling and will select the subset
// of the words form the set of words to a subset of words
// top_p - 0.0 - 1.0 - 0.5 means 50% of the words will be selected
// temperature - 0.0 - 1.0 - 0  means top k words will be selected
// temperature - 0.0 - 1.0 - 1.0 means all words will be selected

// some have top_k based on the fixed number words rather than the probability


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
        temperature: 0, // lower the temperature more predictable the output [0.0 - 1.0]
        topP: 0.5 // higher the topP more random the output [0.0 - 1.0]
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
