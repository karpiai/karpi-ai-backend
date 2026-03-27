import express from 'express';
import { getInstitutionLogs, getInstitutionMetrics } from '../controllers/adminController.js';

const router = express.Router();

// POST route because we are sending a secure access code in the body
router.post('/metrics', getInstitutionMetrics);
router.post('/logs', getInstitutionLogs);

export default router;