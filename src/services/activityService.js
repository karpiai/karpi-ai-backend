import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

const prompt = PromptTemplate.fromTemplate(`
      You are an expert Teacher Trainer for B.Ed students.
      **CONTEXT:** {context}
      **TOPIC:** {topic}

      **LOGIC:**
      1. If context contains ANY concepts related to "{topic}", PROCEED.
      2. If completely unrelated (e.g. "Spiderman") and not in text, STOP.
      3. DO NOT output thinking steps.

      **SCENARIO A: IRRELEVANT**
      "### ⚠️ Topic Not Found in Syllabus
      I cannot create an activity for **'{topic}'** as it is not in the selected textbook.

      **SCENARIO B: RELEVANT (Generate Activity)**
      
      ### 🎨 Activity Plan: {topic}

      **1. Activity Name**
      * **English:** [Name]
      * **தமிழ்:** [Name]

      **2. Objective**
      * [Objective]
      * *([Tamil Translation])*

      **3. Materials Needed**
      * [Item 1]
      * [Item 2]

      **4. Step-by-Step Procedure**
      * **Step 1 (Teacher)** [Action]
        * *([Tamil])*
      * **Step 2 (Student)** [Action]
        * *([Tamil])*
      * **Step 3 (Conclusion)** [Action]
        * *([Tamil])*

      **5. Learning Outcome:**
      * [Outcome]
      * **தமிழ்(கற்றல் விளைவு)** [Outcome]
`);

export const getActivityResponse = async (topic, subjectId) => {
  try {
    const collectionName = subjectId || "tnteu-sem1-psychology";
    console.log(`🎨 Activity Query: "${topic}" in "${collectionName}"`);

    const vectorStore = getVectorStore(collectionName);
    const retriever = vectorStore.asRetriever();
    const contextDocs = await retriever.invoke(topic);
    const contextText = contextDocs.map((doc) => doc.pageContent).join("\n");

    // 1. Remove StringOutputParser to keep the rich metadata object
    const chain = RunnableSequence.from([prompt, llm]);

    // 2. This now returns an AIMessage object, not just a string
    const response = await chain.invoke({ topic, context: contextText });

    // 3. Extract the text content
    const answer = response.content;

    // 4. Extract the token usage safely
    // Langchain standardizes this in recent versions, but we check both common locations just in case
    let tokensUsed = 0;
    if (response.usage_metadata) {
      tokensUsed = response.usage_metadata.total_tokens; // Modern Langchain format
    } else if (response.response_metadata?.tokenUsage) {
      tokensUsed = response.response_metadata.tokenUsage.totalTokens; // Older format
    }

    // 5. Return the exact object format your controller expects!
    return {
      answer,
      tokensUsed
    };
  } catch (error) {
    console.error("Error in getActivityResponse:", error);
    throw error;
  }
};