import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from '@langchain/classic/util/document';
import { config } from "dotenv";

import readlinePromises from "readline/promises";
import { type RunnableInterface } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { ReadableStream } from "node:stream/web";
import { getRetriever } from "../retriever/retrive.ts";
import { BaseMessage, HumanMessage } from "langchain";
config();

const promptTemplate = `
You are an AI assistant representing manish singh, a full stack developer.

Use only the information provided in the context below. Do not use external knowledge or assumptions.

Context:
{context}

Rules:
- Respond only if the question is related to manish singh's professional profile.
- Answer in 3 sentences max.
- Share skills ONLY when explicitly asked in the question.
- Do not infer, expand, or add information.
- If the question is out of scope, respond:
  "I can only answer questions related to manish singh's professional profile and experience."
- If the answer is not found in the context, respond:
  "That information is not available in manish singh's profile."
`;
const prompt = ChatPromptTemplate.fromMessages([['human', promptTemplate], 
new MessagesPlaceholder("chat_history"),
['human', '{question}']
]);


// chat handler function type that takes the user question as input
// and returns the answer as Langchain Runnable output
export type ChatHandler = (question: string) => Promise<{
    answer:
    | ReturnType<RunnableInterface["invoke"]>
    | ReturnType<RunnableInterface["stream"]>;

    sources?: string[];
    answerCallBack?: (answerText: string) => Promise<void>;
}>;

// chat utility function that creates chat user interface on terminal
const chat = async (handler: ChatHandler) => {
    const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    while (true) {
        // wait for user question
        const question = await rl.question("Human: ");

        try {
            // invoke handler with the question
            const response = await handler(question);
            const answer = await response.answer;

            let answerText = "";

            // LangChain's stream() returns an AsyncIterable
            // Handle different answer types
            const answerAny = answer as any;

            // Check if it's an async iterable (from stream)
            if (answerAny && typeof answerAny === 'object' && Symbol.asyncIterator in answerAny) {
                process.stdout.write("AI: ");
                try {
                    for await (const chunk of answerAny as AsyncIterable<any>) {
                        // With StringOutputParser, chunks should be strings
                        if (chunk !== undefined && chunk !== null) {
                            const chunkText = typeof chunk === "string" ? chunk : String(chunk);
                            if (chunkText && !chunkText.startsWith("[object")) {
                                process.stdout.write(chunkText);
                                answerText += chunkText;
                            }
                        }
                    }
                    console.log("\n");
                } catch (iterError) {
                    console.error("\nError iterating stream:", iterError);
                }
            } else if (answerAny instanceof ReadableStream) {
                process.stdout.write("AI: ");
                const reader = answerAny.getReader();
                const decoder = new TextDecoder();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunkText = decoder.decode(value, { stream: true });
                        process.stdout.write(chunkText);
                        answerText += chunkText;
                    }
                } finally {
                    reader.releaseLock();
                }
                console.log("\n");
            } else if (typeof answerAny === "string") {
                const trimmed = answerAny.trimStart();
                console.log(`AI: ${trimmed}`);
                answerText = answerAny;
            } else {
                console.error(`AI: Unexpected answer type: ${typeof answerAny}. Value:`, answerAny);
            }

            // if sources are provided them print them as well
            if (response.sources) {
                console.log(`Sources:\n${response.sources.join("\n")}`);
            }

            // if answer call back is provided then invoke the callback before moving to next question
            // this can be useful for maintaining the chat history
            if (response.answerCallBack) {
                await response.answerCallBack(answerText);
            }
        } catch (error) {
            console.error("Error processing response:", error);
            console.log("Please try again.");
        }
    }
};
const llm = new ChatOpenAI({
    model: 'gpt-4o-mini', // Using a valid OpenAI model
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 500
});

const parser = new StringOutputParser();
const retriever = await getRetriever();
const retriverChain = RunnableSequence.from([
    (input) => input.question,
    retriever,
    formatDocumentsAsString,
]);
const generationChain = RunnableSequence.from([
    {
        question: (input) => input.question,
        context: retriverChain,
        chat_history: (input) => input.chat_history,
    },
    prompt,
    llm,
    parser
]);
// const answer = generationChain.invoke({
const qcSystemPrompt = `
Given a chat history and the latest user question which might reference context in the chat history, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.
`;
const placeholder = new MessagesPlaceholder("chat_history")
const promtTemp = ChatPromptTemplate.fromMessages([['system', qcSystemPrompt],
    placeholder,
['human', '{question}']
]);


// query contextualization chain 
const qcChain = RunnableSequence.from([promtTemp, llm, parser]);
// store in db in case of production
const chatHistory: BaseMessage[] = [];
const chathandler: ChatHandler = async (question: string) => {
    let conextualizaQuestion = null;
    if (chatHistory.length > 0) {
        conextualizaQuestion = await qcChain.invoke({
            chat_history: chatHistory,
            question: question
        });
    } else {
        conextualizaQuestion = question;
    }
    console.log("conextualizaQuestion:: ", conextualizaQuestion);
    const answer = generationChain.stream({ question: conextualizaQuestion,
        chat_history: chatHistory,
     });
    return {
        answer,
        answerCallBack: async (answerText: string) => {
            chatHistory.push(new HumanMessage(conextualizaQuestion));
            chatHistory.push(new HumanMessage(answerText));
        }
    }
};

chat(chathandler);

/**
 * response
 
AI: Manish Singh has worked with three companies: RocketFuel Blockchain, Acquaintsoft Tech, and Hashbinary.

Human: describe one of them!
conextualizaQuestion::  Can you provide details about one of the companies that Manish Singh has worked for?
AI: That information is not available in manish singh's profile.

Human: what was his role in rocketfuel?
conextualizaQuestion::  That information is not available in Manish Singh's profile.
AI: I can only answer questions related to manish singh's professional profile and experience.

Human: how many years of experience he has ? 
conextualizaQuestion::  How many years of experience does Manish Singh have as a Full Stack Developer?
AI: Manish Singh has over 5 years of experience as a Full Stack Developer.

 */