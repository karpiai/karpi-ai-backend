import express from "express";
import { handleAIRequest } from "../controllers/aiController.js";
import { usageLogger } from "../middleware/usageLogger.js";

const router = express.Router();
/**
 * We apply the usageLogger to all AI routes.
 * This way, Nagai and JP College traffic is tracked automatically.
 */
router.use(usageLogger);
/**
 * All AI routes are mapped to the same controller function.
 * The controller will use the URL path (learn, exam, etc.) 
 * to decide which service to call.
 */

// Handles Syllabus Notes & Explanations
router.post("/learn", handleAIRequest);

// Handles Question Paper & Exam Prep Generation
router.post("/exam", handleAIRequest);

// Handles Classroom Activity & Lesson Planning
router.post("/activity", handleAIRequest);

// Handles English Grammar & Spoken English Coaching
router.post("/grammar", handleAIRequest);

export default router;