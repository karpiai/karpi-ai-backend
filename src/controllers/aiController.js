import { getLearnResponse } from "../services/learnService.js";
import { getExamResponse } from "../services/examService.js";
import { getGrammarResponse } from "../services/grammarService.js";
import { getActivityResponse } from "../services/activityService.js";
import { supabase } from "../config/supabase.js"; // Make sure to import your DB client

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