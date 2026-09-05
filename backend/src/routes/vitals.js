import express from 'express';
import { recordVitals, getVitals } from '../controllers/vitalsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/:id/vitals', recordVitals);
router.get('/:id/vitals', getVitals);

export default router;
