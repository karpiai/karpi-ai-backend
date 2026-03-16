import express from "express";
import { registerStudent } from "../controllers/authController.js";

const router = express.Router();

/**
 * @route   POST /api/register
 * @desc    Registers a student and validates institutional access
 * @access  Public
 */
router.post("/register", registerStudent);

export default router;