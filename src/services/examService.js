import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";
import { supabase } from "../config/supabase.js"; // <-- Imported Supabase!

// --- PROMPT 1: ANTI-HALLUCINATION ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC / CONCEPT:** "{topic}"

**STRICT SYSTEM INSTRUCTIONS:**
You are an expert Exam Setter for B.Ed students. You must read the CONTEXT above extremely carefully.

CRITICAL RULES:
1. Be highly lenient with naming. Acronyms, years, and full forms are the EXACT SAME topic.
2. Even if the topic is just a single sentence hidden inside a much larger paragraph, YOU MUST USE IT to generate questions.
3. ABSOLUTE RULE: DO NOT GUESS OR INFER. If the topic is truly missing from the CONTEXT, you must NOT invent exam questions based on outside knowledge.
4. If it is completely missing, output EXACTLY AND ONLY this:
### ⚠️ Topic Not Found in Syllabus
I cannot generate exam questions for this concept as it is not in the selected textbook context. 
**Suggestion:** Try asking for syllabus concepts related to your current subject.

**SCENARIO B: TOPIC FOUND**
If the CONTEXT contains relevant details, YOU MUST PROCEED. 
CRITICAL RULE: You MUST write the actual question text inside the designated [Write the exact question here] placeholders. Do not leave them blank. Ensure you complete the entire output down to the Conclusion. Do not indent the output.

**FORMAT:**
### 📝 Exam Prep: {topic}

**Q1 (Short Answer - 5 Marks):** [Write the exact 5-mark question here based on the text]
* **Bloom's Level:** Knowledge / Understanding
* **💡 Key Points:**
* [Point 1]
* [Point 2]

**Q2 (Short Answer - 5 Marks):** [Write the exact application-based 5-mark question here]
* **Bloom's Level:** Application / Analysis
* **💡 Key Points:**
* [Point 1]
* [Point 2]

---

**Q3 (Essay - 10 Marks):** [Write the exact 10-mark essay question here]
* **Bloom's Level:** Synthesis / Evaluation
* **💡 Structure of Essay:**
* **Intro:** [Brief definition/intro point]
* **Side Headings:** [List 3-4 headings the student should use]
* **Conclusion:** [Summary point]`);


// --- PROMPT 2: ANTI-HALLUCINATION TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு (USER TOPIC):** "{topic}"

**கண்டிப்பான வழிமுறைகள் (STRICT SYSTEM INSTRUCTIONS):**
நீங்கள் B.Ed மாணவர்களுக்கான சிறந்த தேர்வு வினாத்தாள் அமைப்பாளர். மேலே உள்ள சூழலை மிகக் கவனமாகப் படிக்க வேண்டும்.

முக்கிய விதிகள்:
1. பெயர்களில் சற்று நெகிழ்வுத்தன்மையுடன் இருக்கவும்.
2. தலைப்பு ஒரு பெரிய பத்தியின் உள்ளே ஒரு சிறிய வரியாக இருந்தாலும், அதை வைத்து வினாக்களை உருவாக்கவும்.
3. கற்பனையாக எதையும் கூற வேண்டாம் (DO NOT GUESS). சூழலில் அந்த தலைப்பு இல்லையென்றால், நீங்களாகவே எதையும் ஊகித்து வினாக்களை உருவாக்கக் கூடாது.
4. தலைப்பு முற்றிலும் இல்லை எனில், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.
**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்.

**வடிவமைப்பு (FORMAT) - தலைப்பு உள்ளபோது மட்டும்:**
முக்கிய விதி: [இந்த இடத்தில் கேள்வியை எழுதவும்] என்று குறிப்பிட்டுள்ள இடங்களில், நீங்கள் சுயமாக உருவாக்கிய உண்மையான கேள்வியை (Actual Question) கட்டாயம் தமிழில் எழுத வேண்டும். பதிலை பாதியிலேயே நிறுத்த வேண்டாம்; முடிவுரை வரை முழுமையாக எழுதவும். உள்தள்ளல் (indentation) வேண்டாம்.

### 📝 தேர்வுத் தயாரிப்பு: {topic}

**வினா 1 (சிறு வினா - 5 மதிப்பெண்கள்):** [இந்த இடத்தில் 5 மதிப்பெண்ணுக்கான கேள்வியை தமிழில் சுயமாக உருவாக்கி எழுதவும்]
* **ப்ளூமின் வகைப்பாடு (Bloom's Level):** அறிவு (Knowledge) / புரிதல் (Understanding)
* **💡 முக்கிய குறிப்புகள்:**
* [விடைக்கான குறிப்பு 1]
* [விடைக்கான குறிப்பு 2]

**வினா 2 (சிறு வினா - 5 மதிப்பெண்கள்):** [இந்த இடத்தில் பயன்பாடு சார்ந்த 5 மதிப்பெண் கேள்வியை தமிழில் சுயமாக உருவாக்கி எழுதவும்]
* **ப்ளூமின் வகைப்பாடு (Bloom's Level):** பயன்பாடு (Application) / பகுப்பாய்வு (Analysis)
* **💡 முக்கிய குறிப்புகள்:**
* [விடைக்கான குறிப்பு 1]
* [விடைக்கான குறிப்பு 2]

---

**வினா 3 (கட்டுரை வினா - 10 மதிப்பெண்கள்):** [இந்த இடத்தில் விரிவான 10 மதிப்பெண் கட்டுரை வினாவை தமிழில் சுயமாக உருவாக்கி எழுதவும்]
* **ப்ளூமின் வகைப்பாடு (Bloom's Level):** தொகுத்தறிதல் (Synthesis) / மதிப்பீடு (Evaluation)
* **💡 கட்டுரை அமைப்பு:**
* **முன்னுரை:** [சிறிய அறிமுகம்]
* **உட்பிரிவுத் தலைப்புகள்:** [மாணவர்கள் விடை எழுத பயன்படுத்த வேண்டிய 3-4 உட்தலைப்புகள்]
* **முடிவுரை:** [சுருக்கமான முடிவுரை]`);


export const getExamResponse = async (topic, subjectId, medium = "English") => {
    try {
        console.log(`📝 Exam Query: "${topic}" in Subject UUID: "${subjectId}" | Medium: ${medium}`);

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
            .replace(/\b(explain|about|what|is|the|define|discuss|briefly|create|questions|exam|for)\b/gi, '')
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
                    ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.\n\n**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
                    : "### ⚠️ Topic Not Found in Syllabus\nI cannot generate exam questions for this concept as it is not in the selected textbook context.\n\n**Suggestion:** Try asking for syllabus concepts related to your current subject.",
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
        console.error("Error in getExamResponse:", error);
        throw error;
    }
};