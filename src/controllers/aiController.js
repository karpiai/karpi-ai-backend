import { getLearnResponse } from "../services/learnService.js";
import { getExamResponse } from "../services/examService.js";
import { getGrammarResponse } from "../services/grammarService.js";
import { getActivityResponse } from "../services/activityService.js";

export const handleAIRequest = async (req, res) => {
  const { topic, subjectId } = req.body;
  const mode = req.path.split('/').pop(); 

  try {
    let answer;
    switch (mode) {
      case 'learn':
        answer = await getLearnResponse(topic, subjectId);
        break;
      case 'exam':
        answer = await getExamResponse(topic, subjectId);
        break;
      case 'grammar':
        answer = await getGrammarResponse(topic);
        break;
      case 'activity':
        answer = await getActivityResponse(topic, subjectId);
        break;
      default:
        return res.status(400).json({ error: "Invalid Mode" });
    }
    res.json({ answer });
  } catch (error) {
    console.error(`Error in ${mode}:`, error);
    res.status(500).json({ error: `Failed to generate ${mode} response` });
  }
};