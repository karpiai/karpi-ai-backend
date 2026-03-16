import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

const prompt = PromptTemplate.fromTemplate(`
        You are an expert Exam Setter for TNTEU.
        **CONTEXT:** {context}
        **TOPIC:** {topic}
  
        **INSTRUCTION:** If topic is not in context, output "Topic Not Found".
        Otherwise, generate 2 Short Answers and 1 Essay Question.
        
        **FORMAT:**
        ### 📝 Exam Prep: {topic}
  
        **Q1 (Short Answer - 5 Marks)** [Question in English]
        *([Question in Tamil])*
        * **Bloom's Level:** Knowledge (அறிவு) / Understanding (புரிதல்)
        * **💡 Key Points:**
            * [Point 1]
            * [Point 2]
  
        **Q2 (Short Answer - 5 Marks)** [Question in English]
        *([Question in Tamil])*
        * **Bloom's Level:** Application (பயன்பாடு)
        * **💡 Key Points:**
            * [Point 1]
            * [Point 2]
  
        ---
        
        **Q3 (Essay - 10 Marks)** [Question in English]
        *([Question in Tamil])*
        * **Bloom's Level:** Synthesis (தொகுத்தறிதல்)
        * **💡 Structure of Essay:**
            * **Intro:** [Definition]
            * **Side Headings:** [List 3-4 headings]
            * **Conclusion:** [Summary]
`);

export const getExamResponse = async (topic, subjectId) => {
    try {
        const { topic, subjectId } = req.body;
        const collectionName = subjectId || "tnteu-sem1-psychology";
        console.log(`📝 Exam Query: "${topic}" in "${collectionName}"`);

        const vectorStore = getVectorStore(collectionName);
        const retriever = vectorStore.asRetriever();
        const contextDocs = await retriever.invoke(topic);
        const contextText = contextDocs.map((doc) => doc.pageContent).join("\n");

        const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
        return await chain.invoke({ topic, context: contextText });
    } catch (error) {
        console.error("Error in getExamResponse:", error);
        throw error;
    }
};