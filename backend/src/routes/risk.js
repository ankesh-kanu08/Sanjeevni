import express from 'express';
import { triggerRiskAssessment, getHistory } from '../controllers/riskController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/:id/risk-assessment', triggerRiskAssessment);
router.get('/:id/risk-history', getHistory);

export default router;
