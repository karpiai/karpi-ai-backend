import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm } from "../config/aiConfig.js";

// 1. Enhanced Prompt for Structured Coaching Output
const prompt = PromptTemplate.fromTemplate(`
  You are an expert English Teacher for Tamil students. 
  Your goal is to evaluate a student's English input and provide detailed coaching.

  If the input is just a list of random words, form a meaningful sentence.

  Student Input: "{topic}"

  **Strict JSON Output Format:**
  {{
    "correctedEnglish": "[The full corrected sentence]",
    "fluencyScore": [0 to 100],
    "analysis": {{
      "accuracy": [0 to 100],
      "vocabulary": [0 to 100],
      "coherence": [0 to 100]
    }},
    "tamilExplanation": "[Simple Tamil explanation focusing on the core grammar rule without mixing English words]",
    "englishExplanation": "[Detailed English explanation of the grammar rule]",
    "suggestions": [
      "Detail 1 on how to improve",
      "Detail 2 on how to improve"
    ]
  }}
`);

/**
 * Enhanced Grammar Response with Fluency Scoring and Metadata
 */
export const getGrammarResponse = async (topic, subjectId) => {
    try {
        console.log(`✍️ Grammar Coaching Session: "${topic}"`);
        
        // 1. Use JsonOutputParser to ensure the response is a machine-readable object
        const parser = new JsonOutputParser();
        
        // 2. Build the chain - we keep the parser here to get the JSON object
        const chain = RunnableSequence.from([prompt, llm]);

        // 3. Invoke the chain to get the AIMessage (to preserve metadata)
        const response = await chain.invoke({ topic });

        // 4. Parse the content into JSON
        // Since we want the tokensUsed, we invoke the chain without the parser at the end 
        // and manually parse the content string.
        const parsedAnswer = JSON.parse(response.content);

        // 5. Extract the token usage safely (Maintaining your existing logic)
        let tokensUsed = 0;
        if (response.usage_metadata) {
            tokensUsed = response.usage_metadata.total_tokens; // Modern Langchain format
        } else if (response.response_metadata?.tokenUsage) {
            tokensUsed = response.response_metadata.tokenUsage.totalTokens; // Older format
        }

        // 6. Return the structured object containing both the coaching data and token stats
        return {
            answer: parsedAnswer,
            tokensUsed: tokensUsed
        };
    } catch (error) {
        console.error("Error in getGrammarResponse:", error);
        // Fallback in case the AI fails to output valid JSON
        throw new Error("Failed to generate a structured grammar response.");
    }
};