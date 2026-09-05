import express from 'express';
import { getDoctorAlerts, getDoctorPatients, submitDecision, markAlertRead, markAlertActioned, getDoctorStats } from '../controllers/doctorController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);
router.use(authorize('doctor'));

router.get('/alerts', getDoctorAlerts);
router.get('/patients', getDoctorPatients);
router.post('/decisions', submitDecision);
router.put('/alerts/:id/read', markAlertRead);
router.put('/alerts/:id/action', markAlertActioned);
router.get('/stats', getDoctorStats);

export default router;
