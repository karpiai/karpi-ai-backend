import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

// --- PROMPT 1: STRICTLY ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`You are an expert Teacher Trainer for B.Ed students.
      
**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC:** "{topic}"

**STEP 1: SYLLABUS VERIFICATION**
Check if the CONTEXT contains the educational theory or concept mentioned in the USER TOPIC.
If the concept is COMPLETELY missing, output exactly:
### ⚠️ Topic Not Found in Syllabus
I cannot create an activity for this concept as it is not in the selected textbook.

If the concept exists, you MUST INVENT a classroom activity based on it. Do not indent your output.

**ACTIVITY PLAN FORMAT:**
### 🎨 Activity Plan: {topic}

**1. Activity Name**
[Creative name]

**2. Objective**
[What students will learn]

**3. Materials Needed**
* [Item 1]

**4. Step-by-Step Procedure**
* **Step 1 (Teacher's Setup):** [Action]
* **Step 2 (Student Execution):** [Action]
* **Step 3 (Conclusion):** [Action]

**5. Learning Outcome**
[Outcome]`);

// --- PROMPT 2: STRICTLY TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`நீங்கள் B.Ed மாணவர்களுக்கான ஒரு சிறந்த ஆசிரியர் பயிற்சியாளர்.
        
**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு (USER TOPIC):** "{topic}"

**படி 1: பாடத்திட்ட சரிபார்ப்பு**
பயனர் கேட்ட தலைப்பு பாடப்புத்தக சூழலில் உள்ளதா என சரிபார்க்கவும்.
முற்றிலும் தொடர்பில்லாத தலைப்பாக இருந்தால், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான ஒரு வகுப்பறை செயல்பாட்டை என்னால் உருவாக்க முடியாது.

தலைப்பு சூழலில் இருந்தால், அதனடிப்படையில் ஒரு வகுப்பறை செயல்பாட்டை (Classroom Activity) நீங்கள் கட்டாயம் உருவாக்க வேண்டும். முழு பதிலும் கட்டாயம் தமிழில் மட்டுமே இருக்க வேண்டும். பதிலில் எந்த இடத்திலும் உள்தள்ளல் (indentation) பயன்படுத்த வேண்டாம். 

**செயல்பாட்டுத் திட்டத்தின் வடிவம் (ACTIVITY PLAN FORMAT):**
### 🎨 செயல்பாட்டுத் திட்டம்: {topic}

**1. செயல்பாட்டின் பெயர்**
[தமிழில் ஒரு சுவாரஸ்யமான பெயர்]

**2. நோக்கம்**
[பள்ளி மாணவர்கள் இந்த செயல்பாட்டின் மூலம் என்ன கற்றுக்கொள்வார்கள்]

**3. தேவையான பொருட்கள்**
* [பொருள் 1]
* [பொருள் 2]

**4. படிப்படியான செயல்முறை**
* **படி 1 (ஆசிரியரின் தயாரிப்பு):** [ஆசிரியர் என்ன செய்ய வேண்டும்]
* **படி 2 (மாணவர்களின் செயல்பாடு):** [மாணவர்கள் என்ன செய்ய வேண்டும்]
* **படி 3 (முடிவுரை):** [ஆசிரியர் இதை எப்படி முடித்து வைக்க வேண்டும்]

**5. கற்றல் விளைவு**
[மாணவர்கள் அடைந்த கல்வி விளைவு]`);

export const getActivityResponse = async (topic, subjectId, medium = "English") => {
  try {
    console.log(`🎨 Activity Query: "${topic}" in Subject UUID: "${subjectId}" | Medium: ${medium}`);

    const vectorStore = getVectorStore(subjectId);
    const retriever = vectorStore.asRetriever({
      k: 8
    });
    const contextDocs = await retriever.invoke(topic);

    // --- NEW: THE ZERO-TOKEN EARLY EXIT GUARDRAIL ---
    // If the database has no data for this subject, stop immediately!
    if (!contextDocs || contextDocs.length === 0) {
      console.log("⚠️ No context found in vector DB. Blocking LLM call to save tokens.");

      return {
        answer: medium === "Tamil"
          ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.\n\n**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
          : "### ⚠️ Topic Not Found in Syllabus\nI cannot generate activity plans for this concept as it is not in the selected subject context.\n\n**Suggestion:** Try asking for syllabus concepts related to your current subject.",
        tokensUsed: 0 // You spent 0 tokens because you didn't call the AI!
      };
    }
    // ------------------------------------------------

    const contextText = contextDocs.map((doc) => doc.pageContent).join("\n");

    // DYNAMICALLY SELECT THE PROMPT BASED ON THE TOGGLE
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

    return { answer, tokensUsed };
  } catch (error) {
    console.error("Error in getActivityResponse:", error);
    throw error;
  }
};