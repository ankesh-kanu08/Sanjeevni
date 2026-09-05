import express from 'express';
import { submitCheckIn, getCheckIns, previewSymptoms } from '../controllers/checkinController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/:id/checkins/extract-symptoms', previewSymptoms);
router.post('/:id/checkins', submitCheckIn);
router.get('/:id/checkins', getCheckIns);

export default router;
