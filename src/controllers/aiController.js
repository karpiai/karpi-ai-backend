import { getLearnResponse } from "../services/learnService.js";
import { getExamResponse } from "../services/examService.js";
import { getGrammarResponse } from "../services/grammarService.js";
import { getActivityResponse } from "../services/activityService.js";
import { supabase } from "../config/supabase.js"; // Make sure to import your DB client
import { getGroqClient } from "../config/aiConfig.js"; // Import the Groq client

export const handleAIRequest = async (req, res) => {
  // 1. Extract studentId for the billing meter
  const { topic, subjectId, studentId, medium } = req.body;
  const mode = req.path.split('/').pop();

  if (!studentId) {
    return res.status(400).json({ error: "Missing Student ID for quota tracking." });
  }

  try {
    let aiResult;

    // 2. Route the request. 
    // IMPORTANT: Your services must now return an object { answer, tokensUsed }
    switch (mode) {
      case 'learn':
        aiResult = await getLearnResponse(topic, subjectId, medium); // Pass medium for language-specific responses
        break;
      case 'exam':
        aiResult = await getExamResponse(topic, subjectId, medium); // Pass medium for language-specific responses
        break;
      case 'grammar':
        aiResult = await getGrammarResponse(topic);
        break;
      case 'activity':
        aiResult = await getActivityResponse(topic, subjectId, medium); // Pass medium for language-specific responses
        break;
      default:
        return res.status(400).json({ error: "Invalid Mode" });
    }

    const { answer, tokensUsed } = aiResult;

    console.log(`Student ID: ${studentId} | Mode: ${mode} | Tokens Used: ${tokensUsed}`);

    // 3. Fire-and-Forget Billing Update (Performance Optimization)
    // We don't 'await' this so the student gets the response instantly.
    if (tokensUsed) {
      supabase.rpc('increment_token_usage', {
        s_id: studentId,
        tokens: tokensUsed
      }).then(({ error }) => {
        if (error) console.error("Database Metering Error:", error);
      });
    }

    // 4. Send the answer back to the React frontend
    res.json({ answer });

  } catch (error) {
    console.error(`Error in ${mode}:`, error);
    res.status(500).json({ error: `Failed to generate ${mode} response` });
  }
};

export const evaluateAIRequest = async (req, res) => {
  const { studentAnswer, expectedConcept } = req.body;

  if (!studentAnswer || !expectedConcept) {
    console.error("Missing student answer or expected concept in request body.");
    return res.status(400).json({ error: "Missing answer or concept" });
  }

  try {
    const prompt = `
    You are a supportive college professor evaluating a student's verbal answer in real-time.
    
    The correct concept you are listening for is: "${expectedConcept}"
    The student's actual spoken answer is: "${studentAnswer}"

    Evaluate their answer:
    - If it is correct or close enough, validate it enthusiastically.
    - If it is incorrect or completely off-topic, gently correct them and state the right answer.
    
    RULES:
    - Keep your response to exactly 1 or 2 short sentences.
    - Speak conversationally, as if talking out loud to a human.
    - DO NOT use asterisks, bolding, bullet points, or markdown of any kind.
    `;

    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b', // Using your updated high-accuracy model
      temperature: 0.5, // Lower temperature so it stays strictly on the evaluation task
      max_tokens: 100,
    });

    const feedback = chatCompletion.choices[0]?.message?.content || "Good try! Let's move on.";

    res.json({ feedback });
  } catch (error) {
    console.error("Evaluation API Error:", error);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
};;

export const getLectureScript = async (req, res) => {
  const { subjectId, topicName } = req.body;

  if (!subjectId || !topicName) {
    return res.status(400).json({ error: "Missing subjectId or topicName" });
  }

  try {
    const { data, error } = await supabase
      .from('lecture_scripts')
      .select('script_content')
      .eq('subject_id', subjectId)
      .eq('topic_name', topicName)
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(404).json({ error: "Script not found" });
    }

    res.json({ script: data.script_content });
  } catch (error) {
    console.error("Server Error fetching script:", error);
    res.status(500).json({ error: "Failed to fetch lecture script" });
  }
};