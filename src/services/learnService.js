import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";
import { supabase } from "../config/supabase.js";

// --- PROMPT 1: ANTI-HALLUCINATION ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC / QUESTION:** "{topic}"

**STRICT SYSTEM INSTRUCTIONS:**
You are an expert Syllabus Tutor. You must read the CONTEXT above extremely carefully to find the USER TOPIC. 

CRITICAL RULES:
1. Be highly lenient with naming. "Programme of Action (1992)", "Programme of Action, 1992", "POA", or just "Programme of Action" are all the EXACT SAME topic.
2. Even if the topic is just a single sentence hidden inside a much larger paragraph, YOU MUST EXTRACT IT and explain its connection.
3. ABSOLUTE RULE: DO NOT GUESS OR INFER. If the topic is truly missing from the CONTEXT, you must NOT write "it can be inferred" or try to invent an answer.
4. If it is completely missing, output EXACTLY AND ONLY this:
### ⚠️ Topic Not Found in Syllabus
I cannot find information about this concept in the selected textbook context. 
**Suggestion:** Try rephrasing your question or asking for other syllabus concepts.

**SCENARIO B: TOPIC FOUND**
Generate the response in the following format. Do not indent the text.

### 📖 Concept: {topic}

**Explanation**
[Clear academic explanation based ONLY on the context. If it's a sub-topic, explain how it connects to the main topic in the text.]

**Simple Explanation**
[A casual, easy-to-understand explanation of the above.]

**தமிழ் விளக்கம்:**
[Clear Tamil explanation. Use 'உளவியல்' for Psychology.]

**எளிய விளக்கம்**
[Casual explanation like a friend only in tamil do not mix english words.]

**🔑 Exam Keywords:**
* [List 3-5 key terms found in the text]

**💡 Practical Example (For Exam)**
[A classroom example demonstrating the concept, based on the text]`);


// --- PROMPT 2: ANTI-HALLUCINATION TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு / கேள்வி (USER TOPIC):** "{topic}"

**கண்டிப்பான வழிமுறைகள் (STRICT SYSTEM INSTRUCTIONS):**
நீங்கள் ஒரு சிறந்த பாடத்திட்ட ஆசிரியர். பயனர் கேட்ட தலைப்பைக் கண்டறிய, மேலே உள்ள சூழலை (CONTEXT) மிகக் கவனமாகப் படிக்க வேண்டும்.

முக்கிய விதிகள் (CRITICAL RULES):
1. பெயர்களில் சற்று நெகிழ்வுத்தன்மையுடன் இருக்கவும். எடுத்துக்காட்டாக, "Programme of Action (1992)", "POA" ஆகியவை ஒன்றே.
2. தலைப்பு ஒரு பெரிய பத்தியின் உள்ளே ஒரு சிறிய வரியாக இருந்தாலும், அதை எடுத்து விளக்கவும்.
3. கற்பனையாக எதையும் கூற வேண்டாம் (DO NOT GUESS). சூழலில் அந்த தலைப்பு இல்லையென்றால், நீங்களாகவே எதையும் ஊகித்து எழுதக்கூடாது.
4. தலைப்பு முற்றிலும் இல்லை எனில், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான பதிலை என்னால் வழங்க முடியாது.
**பரிந்துரை:** கேள்வியை மாற்றி அமைக்கவும் அல்லது தொடர்புடைய கருத்துருக்களைக் கேட்கவும்.

**வடிவமைப்பு (FORMAT) - தலைப்பு உள்ளபோது மட்டும்:**
கீழ்க்கண்ட வடிவமைப்பில் பதிலை வழங்கவும். எந்த இடத்திலும் உள்தள்ளல் (indentation) பயன்படுத்த வேண்டாம்.

### 📖 கருத்துரு: {topic}

**விளக்கம்**
[பாடப்புத்தகத்தின் அடிப்படையில் தெளிவான, முறையான கல்வி விளக்கம். சிறிய குறிப்பாக இருந்தால், அது முதன்மை தலைப்புடன் எவ்வாறு தொடர்புடையது என்பதை விளக்குக.]

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

        // 1. STANDARD RETRIEVAL (Cast a Wide Net)
        const retriever = vectorStore.asRetriever({
            searchType: "mmr",
            searchKwargs: {
                fetchK: 150,
                k: 8
            }
        });

        const contextDocs = await retriever.invoke(topic);
        let contextText = contextDocs ? contextDocs.map((doc) => doc.pageContent).join("\n") : "";

        // ====================================================================
        // 🚀 THE KEYWORD BOOSTER (HYBRID SEARCH FALLBACK)
        // ====================================================================
        // Clean the topic (remove numbers, brackets, and make lowercase)
        const cleanTopic = topic
            .replace(/[^a-zA-Z\s]/g, ' ') 
            .replace(/\b(explain|about|what|is|the|define|discuss|briefly)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        // Only run the fallback if the topic is a meaningful word and vector missed it
        if (cleanTopic.length > 3 && !contextText.toLowerCase().includes(cleanTopic)) {
            console.log(`⚠️ Vector Search missed "${cleanTopic}". Triggering Exact Keyword Booster...`);

            const { data: emergencyDocs, error } = await supabase
                .from('syllabus_knowledge')
                .select('chunk_text')
                .eq('subject_id', subjectId)
                .ilike('chunk_text', `%${cleanTopic}%`)
                .limit(3);

            if (error) {
                console.error("Database fallback error:", error);
            } else if (emergencyDocs && emergencyDocs.length > 0) {
                console.log("✅ Keyword Booster FOUND the text! Injecting into AI context.");
                const emergencyText = emergencyDocs.map(d => d.chunk_text).join("\n");

                // Force the found text to the very top so the AI reads it first
                contextText = emergencyText + "\n\n" + contextText;
            } else {
                console.log("❌ Keyword Booster also failed. The text truly does not exist in the DB.");
            }
        }
        // ====================================================================

        // --- THE ZERO-TOKEN EARLY EXIT GUARDRAIL ---
        // Notice we now check 'contextText' instead of 'contextDocs' just in case the fallback found it!
        if (!contextText || contextText.trim() === "") {
            console.log("⚠️ No context found in vector DB or Fallback. Blocking LLM call to save tokens.");

            return {
                answer: medium === "Tamil"
                    ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான பதிலை என்னால் வழங்க முடியாது.\n\n**பரிந்துரை:** கேள்வியை மாற்றி அமைக்கவும் அல்லது தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
                    : "### ⚠️ Topic Not Found in Syllabus\nI cannot find information about this concept in the selected textbook context.\n\n**Suggestion:** Try rephrasing your question or asking for other syllabus concepts.",
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

        return {
            answer,
            tokensUsed
        };

    } catch (error) {
        console.error("Error in getLearnResponse:", error);
        throw error;
    }
};