import express from "express";
import { handleAIRequest } from "../controllers/aiController.js";
import { usageLogger } from "../middleware/usageLogger.js";
import { tokenGuard } from "../middleware/tokenGuard.js"; // Import the guard

const router = express.Router();

// Track usage for everyone
router.use(usageLogger);

/**
 * We apply tokenGuard to every AI POST request.
 * This ensures no Groq credits are spent if the student is over their limit.
 */
router.post("/learn", tokenGuard, handleAIRequest);
router.post("/exam", tokenGuard, handleAIRequest);
router.post("/activity", tokenGuard, handleAIRequest);
router.post("/grammar", tokenGuard, handleAIRequest);

export default router;