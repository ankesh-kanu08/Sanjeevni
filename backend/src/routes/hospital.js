import express from 'express';
import { createHospital, getHospitals, dischargePatient, getHospitalPatients, getHospitalStats } from '../controllers/hospitalController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.post('/hospitals', authorize('system_admin'), createHospital);
router.get('/hospitals', authorize('system_admin', 'hospital_admin'), getHospitals);

router.post('/discharge', authorize('doctor', 'hospital_admin'), dischargePatient);
router.get('/patients', authorize('hospital_admin', 'doctor', 'worker'), getHospitalPatients);
router.get('/stats', authorize('hospital_admin'), getHospitalStats);

export default router;
