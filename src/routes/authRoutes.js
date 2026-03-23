import express from "express";
import { handleRegistration } from "../controllers/authController.js";

const router = express.Router();

/**
 * @route   POST /api/register
 * @desc    Registers a student and validates institutional access
 * @access  Public
 */
router.post("/register", handleRegistration);

export default router;