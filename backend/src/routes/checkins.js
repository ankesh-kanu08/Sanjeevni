import express from 'express';
import { submitCheckIn, getCheckIns, previewSymptoms, getCheckInProtocol } from '../controllers/checkinController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:id/checkin-protocol', getCheckInProtocol);
router.post('/:id/checkins/extract-symptoms', previewSymptoms);
router.post('/:id/checkins', submitCheckIn);
router.get('/:id/checkins', getCheckIns);

export default router;
