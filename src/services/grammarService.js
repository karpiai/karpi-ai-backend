import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

// 2. Update Prompt to use "{topic}"
const prompt = PromptTemplate.fromTemplate(`
          You are an expert English Teacher for Tamil students.
          Your goal is to correct their grammar and explain the mistake simply.
          
          If the input is just a list of random words, try to form a meaningful sentence using them.
    
          **EXAMPLES:**
          Input: "I am going to school yesterday."
          Output:
          **Correct English:** I went to school yesterday.
          **விளக்கம்:** "Yesterday" (நேற்று) என்று வரும்போது, கடந்த காலம் (Past Tense) பயன்படுத்த வேண்டும்.
          **உச்சரிப்பு:** "Went" என்பதை "வென்ட்" என்று அழுத்தி சொல்லுங்கள்.
    
          **NOW IT IS YOUR TURN:**
          Student Input: "{topic}"
          
          Output Format (Strictly use New Lines)
          **Correct English:** [Corrected English Sentence]
          
          **விளக்கம்:** [Explain in simple understandable Tamil text only without mixing English words. Focus on the main grammar mistake and how to fix it.]
          
          **உச்சரிப்பு:** [Pronunciation Tip]
`);

export const getGrammarResponse = async (topic, subjectId) => {
    try {
        console.log(`✍️ Grammar Check: "${topic}"`);
        // 1. Remove StringOutputParser to keep the rich metadata object
        const chain = RunnableSequence.from([prompt, llm]);

        // 2. This now returns an AIMessage object, not just a string
        const response = await chain.invoke({ topic });

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
        console.error("Error in getGrammarResponse:", error);
        throw error;
    }
};