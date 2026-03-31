import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

// --- PROMPT 1: BALANCED ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`You are an expert Syllabus Tutor for B.Ed students.
      
**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC / QUESTION:** "{topic}"

**STEP 1: SYLLABUS VERIFICATION**
Check if the CONTEXT contains information, definitions, or introductions related to the topic.
- If the topic is COMPLETELY missing from the context, output exactly:
### ⚠️ Topic Not Found in Syllabus
I cannot find information about this concept in the selected textbook context. 
**Suggestion:** Try rephrasing your question or asking for other syllabus concepts.

- If the CONTEXT contains relevant details, YOU MUST ANSWER using ONLY the provided text. If the text only contains a partial explanation, summarize what is there. DO NOT invent outside information.

**SCENARIO B: TOPIC FOUND**
Generate the response in the following format. Do not indent the text.

### 📖 Concept: {topic}

**Explanation**
[Clear academic explanation based ONLY on the context. Summarize what the text says about the topic.]

**Simple Explanation**
[A casual, easy-to-understand explanation of the above.]

**🔑 Exam Keywords:**
* [List 3-5 key terms found in the text]

**💡 Practical Example (For Exam)**
[A classroom example demonstrating the concept, based on the text]`);


// --- PROMPT 2: BALANCED TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`நீங்கள் B.Ed மாணவர்களுக்கான ஒரு சிறந்த பாடத்திட்ட ஆசிரியர்.
      
**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு / கேள்வி (USER TOPIC):** "{topic}"

**படி 1: பாடத்திட்ட சரிபார்ப்பு**
பயனர் கேட்ட தலைப்பு தொடர்பான தகவல்களோ அல்லது அறிமுகமோ பாடப்புத்தக சூழலில் உள்ளதா என சரிபார்க்கவும்.
- தலைப்பு முற்றிலும் இல்லை எனில், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான பதிலை என்னால் வழங்க முடியாது.
**பரிந்துரை:** கேள்வியை மாற்றி அமைக்கவும் அல்லது தொடர்புடைய கருத்துருக்களைக் கேட்கவும்.

- தலைப்பு சூழலில் இருந்தால், சூழலில் உள்ள தகவல்களை வைத்து மட்டுமே பதிலளிக்க வேண்டும். சூழலில் பாதி தகவல் மட்டுமே இருந்தாலும், அதை வைத்து விளக்கமளிக்கவும். கற்பனையாக எதையும் கூற வேண்டாம்.

**வடிவமைப்பு (FORMAT):**
கீழ்க்கண்ட வடிவமைப்பில் பதிலை வழங்கவும். எந்த இடத்திலும் உள்தள்ளல் (indentation) பயன்படுத்த வேண்டாம்.

### 📖 கருத்துரு: {topic}

**விளக்கம்**
[பாடப்புத்தகத்தின் அடிப்படையில் தெளிவான, முறையான கல்வி விளக்கம்.]

**எளிய விளக்கம்**
[ஒரு நண்பர் விளக்குவது போல் எளிதில் புரிந்துகொள்ளக்கூடிய எளிய விளக்கம்.]

**🔑 முக்கிய வார்த்தைகள்:**
* [3 முதல் 5 முக்கிய வார்த்தைகளை பட்டியலிடவும்]

**💡 நடைமுறை உதாரணம் (தேர்விற்காக)**
[இந்த கருத்துருவை விளக்கும் ஒரு வகுப்பறை உதாரணம்]`);


export const getLearnResponse = async (topic, subjectId, medium = "English") => {
    try {
        console.log(`📖 Learn Query: "${topic}" in Subject UUID: "${subjectId}" | Medium: ${medium}`);

        const vectorStore = getVectorStore(subjectId);
        // Using k: 8 to ensure we grab both the heading and the bullet points!
        const retriever = vectorStore.asRetriever({ k: 8 }); 
        const contextDocs = await retriever.invoke(topic);

        // --- NEW: THE ZERO-TOKEN EARLY EXIT GUARDRAIL ---
        // If the database has no data for this subject, stop immediately!
        if (!contextDocs || contextDocs.length === 0) {
            console.log("⚠️ No context found in vector DB. Blocking LLM call to save tokens.");
            
            return {
                answer: medium === "Tamil" 
                    ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.\n\n**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
                    : "### ⚠️ Topic Not Found in Syllabus\nI cannot generate answers for this concept as it is not in the selected subject context.\n\n**Suggestion:** Try asking for syllabus concepts related to your current subject.",
                tokensUsed: 0 // You spent 0 tokens because you didn't call the AI!
            };
        }
        // ------------------------------------------------

        const contextText = contextDocs.map((doc) => doc.pageContent).join("\n");

        const selectedPrompt = medium === "Tamil" ? tamilPrompt : englishPrompt;

        const chain = RunnableSequence.from([selectedPrompt, llm]);
        
        const response = await chain.invoke({ 
            topic, 
            context: contextText
        });

        const answer = response.content;

        let tokensUsed = 0;
        if (response.usage_metadata) {
            tokensUsed = response.usage_metadata.total_tokens; 
        } else if (response.response_metadata?.tokenUsage) {
            tokensUsed = response.response_metadata.tokenUsage.totalTokens; 
        }

        return { 
            answer, 
            tokensUsed 
        };

    } catch (error) {
        console.error("Error in getLearnResponse:", error);
        throw error;
    }
};