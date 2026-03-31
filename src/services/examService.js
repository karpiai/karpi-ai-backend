import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { llm, getVectorStore } from "../config/aiConfig.js";

// --- PROMPT 1: STRICTLY ENGLISH ---
const englishPrompt = PromptTemplate.fromTemplate(`You are an expert Exam Setter for B.Ed students.
      
**CONTEXT FROM TEXTBOOK:**
{context}

**USER TOPIC / CONCEPT:** "{topic}"

**STEP 1: SYLLABUS VERIFICATION**
Check if the CONTEXT contains information related to the topic.
- If the concept is COMPLETELY missing, output exactly:
### ⚠️ Topic Not Found in Syllabus
I cannot generate exam questions for this concept as it is not in the selected textbook context. 
**Suggestion:** Try asking for syllabus concepts related to your current subject.

- If the CONTEXT contains relevant details, YOU MUST PROCEED. 
CRITICAL RULE: You MUST write the actual question text inside the designated [Write the exact question here] placeholders. Do not leave them blank. Ensure you complete the entire output down to the Conclusion.

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


// --- PROMPT 2: STRICTLY TAMIL ---
const tamilPrompt = PromptTemplate.fromTemplate(`நீங்கள் B.Ed மாணவர்களுக்கான சிறந்த தேர்வு வினாத்தாள் அமைப்பாளர்.
      
**பாடப்புத்தகத்தின் சூழல் (CONTEXT):**
{context}

**பயனர் தலைப்பு (USER TOPIC):** "{topic}"

**படி 1: பாடத்திட்ட சரிபார்ப்பு**
பயனர் கேட்ட தலைப்பு தொடர்பான தகவல்கள் பாடப்புத்தக சூழலில் உள்ளதா என சரிபார்க்கவும்.
- தலைப்பு முற்றிலும் இல்லை எனில், கீழ்க்கண்டவாறு மட்டும் பதிலளிக்கவும்:
### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை
இந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.
**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்.

- தலைப்பு சூழலில் இருந்தால், கீழே உள்ள வடிவமைப்பை முழுமையாகப் பயன்படுத்தி வினாக்களை உருவாக்கவும். 
முக்கிய விதி: [இந்த இடத்தில் கேள்வியை எழுதவும்] என்று குறிப்பிட்டுள்ள இடங்களில், நீங்கள் சுயமாக உருவாக்கிய உண்மையான கேள்வியை (Actual Question) கட்டாயம் தமிழில் எழுத வேண்டும். பதிலை பாதியிலேயே நிறுத்த வேண்டாம்; முடிவுரை வரை முழுமையாக எழுதவும்.

**வடிவமைப்பு (FORMAT):**
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
        
        // Use k: 8 to ensure we grab enough context to build a full 10-mark essay!
        const retriever = vectorStore.asRetriever({ k: 8 }); 
        const contextDocs = await retriever.invoke(topic);

        // --- NEW: THE ZERO-TOKEN EARLY EXIT GUARDRAIL ---
        // If the database has no data for this subject, stop immediately!
        if (!contextDocs || contextDocs.length === 0) {
            console.log("⚠️ No context found in vector DB. Blocking LLM call to save tokens.");
            
            return {
                answer: medium === "Tamil" 
                    ? "### ⚠️ பாடத்திட்டத்தில் தலைப்பு காணப்படவில்லை\nஇந்த கருத்துரு தேர்ந்தெடுக்கப்பட்ட பாடப்புத்தகத்தில் இல்லாததால், இதற்கான தேர்வு வினாக்களை என்னால் உருவாக்க முடியாது.\n\n**பரிந்துரை:** தற்போதைய பாடத்திட்டத்துடன் தொடர்புடைய கருத்துருக்களைக் கேட்கவும்."
                    : "### ⚠️ Topic Not Found in Syllabus\nI cannot generate exam questions for this concept as it is not in the selected textbook context.\n\n**Suggestion:** Try asking for syllabus concepts related to your current subject.",
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

        return {
            answer,
            tokensUsed
        };
    } catch (error) {
        console.error("Error in getExamResponse:", error);
        throw error;
    }
};