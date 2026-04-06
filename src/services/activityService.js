import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";
import { supabase } from "../config/supabase.js"; // <-- Imported Supabase!

// --- PROMPT 1: ANTI-HALLUCINATION ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC / QUESTION:** "{topic}"

**STRICT SYSTEM INSTRUCTIONS:**
You are an expert Teacher Trainer for B.Ed students. You must read the CONTEXT above extremely carefully.

CRITICAL RULES:
1. Be highly lenient with naming. Acronyms, years, and full forms are the EXACT SAME topic.
2. Even if the topic is just a single sentence hidden inside a much larger paragraph, YOU MUST USE IT to invent the activity.
3. ABSOLUTE RULE: DO NOT GUESS OR INFER. If the topic is truly missing from the CONTEXT, you must NOT invent an activity based on outside knowledge.
4. If it is completely missing, output EXACTLY AND ONLY this:
### ⚠️ Topic Not Found in Syllabus
I cannot create an activity for this concept as it is not in the selected textbook context.

**SCENARIO B: TOPIC FOUND**
If the concept exists in the context, you MUST INVENT a classroom activity based on it. Do not indent your output.

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

// --- PROMPT 2: ANTI-HALLUCINATION TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு (USER TOPIC):** "{topic}"

**கண்டிப்பான வழிமுறைகள் (STRICT SYSTEM INSTRUCTIONS):**
நீங்கள் B.Ed மாணவர்களுக்கான ஒரு சிறந்த ஆசிரியர் பயிற்சியாளர். மேலே உள்ள சூழலை மிகக் கவனமாகப் படிக்க வேண்டும்.

முக்கிய விதிகள்:
1. பெயர்களில் சற்று நெகிழ்வுத்தன்மையுடன் இருக்கவும். 
2. தலைப்பு ஒரு பெரிய பத்தியின் உள்ளே ஒரு சிறிய வரியாக இருந்தாலும், அதை வைத்து செயல்பாட்டை உருவாக்கவும்.
3. கற்பனையாக எதையும் கூற வேண்டாம் (DO NOT GUESS). சூழலில் அந்த தலைப்பு இல்லையென்றால், நீங்களாகவே எதையும் ஊகித்து எழுதக்கூடாது.
4. தலைப்பு முற்றிலும் இல்லை எனில், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான ஒரு வகுப்பறை செயல்பாட்டை என்னால் உருவாக்க முடியாது.

**வடிவமைப்பு (FORMAT) - தலைப்பு உள்ளபோது மட்டும்:**
முழு பதிலும் கட்டாயம் தமிழில் மட்டுமே இருக்க வேண்டும். பதிலில் எந்த இடத்திலும் உள்தள்ளல் (indentation) பயன்படுத்த வேண்டாம். 

### 🎨 செயல்பாட்டுத் திட்டம்: {topic}

**1. செயல்பாட்டின் பெயர்**
[தமிழில் ஒரு சுவாரஸ்யமான பெயர்]

**2. நோக்கம்**
[பள்ளி மாணவர்கள் இந்த செயல்பாட்டின் மூலம் என்ன கற்றுக்கொள்வார்கள்]

**3. தேவையான பொருட்கள்**
* [பொருள் 1]

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

    // 1. STANDARD RETRIEVAL (Optimized for Tokens)
    const retriever = vectorStore.asRetriever({
      searchType: "mmr",
      searchKwargs: {
        fetchK: 50, 
        k: 8        
      }
    });
    
    const contextDocs = await retriever.invoke(topic);
    let contextText = contextDocs ? contextDocs.map((doc) => doc.pageContent).join("\n") : "";

    // ====================================================================
    // 🚀 THE KEYWORD BOOSTER (HYBRID SEARCH FALLBACK)
    // ====================================================================
    const cleanTopic = topic
        .replace(/[^a-zA-Z\s]/g, ' ') 
        .replace(/\b(explain|about|what|is|the|define|discuss|briefly|create|activity|for)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    if (cleanTopic.length > 3 && !contextText.toLowerCase().includes(cleanTopic)) {
        console.log(`⚠️ Vector Search missed "${cleanTopic}". Triggering Keyword Booster...`);
        const { data: emergencyDocs, error } = await supabase
            .from('syllabus_knowledge')
            .select('chunk_text')
            .eq('subject_id', subjectId)
            .ilike('chunk_text', `%${cleanTopic}%`) 
            .limit(3);

        if (emergencyDocs && emergencyDocs.length > 0) {
            console.log("✅ Keyword Booster FOUND the text!");
            const emergencyText = emergencyDocs.map(d => d.chunk_text).join("\n");
            contextText = emergencyText + "\n\n" + contextText; 
        }
    }
    // ====================================================================

    // --- THE ZERO-TOKEN EARLY EXIT GUARDRAIL ---
    if (!contextText || contextText.trim() === "") {
      console.log("⚠️ No context found in DB. Blocking LLM call to save tokens.");
      return {
        answer: medium === "Tamil"
          ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான ஒரு வகுப்பறை செயல்பாட்டை என்னால் உருவாக்க முடியாது.\n\n**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
          : "### ⚠️ Topic Not Found in Syllabus\nI cannot generate activity plans for this concept as it is not in the selected subject context.\n\n**Suggestion:** Try asking for syllabus concepts related to your current subject.",
        tokensUsed: 0 
      };
    }
    // ------------------------------------------------

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