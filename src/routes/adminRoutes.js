import express from 'express';
import { getInstitutionMetrics } from '../controllers/adminController.js';

const router = express.Router();

// POST route because we are sending a secure access code in the body
router.post('/metrics', getInstitutionMetrics);

export default router;