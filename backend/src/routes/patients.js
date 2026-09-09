import express from 'express';
import { getMyPatientRecord, updateMyLanguage, createPatient, getPatients, getPatientById, updatePatient, getPatientTimeline, getPatientVitals, getPatientRiskHistory, getPatientBaseline } from '../controllers/patientController.js';
import { protect } from '../middleware/auth.js';
// using protect directly, and a placeholder authorize from our rbac module
import { authorize as rbacAuth, authorizePatientAccess } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Must be before /:id routes
router.get('/me', getMyPatientRecord);
router.put('/me/language', updateMyLanguage);

router.route('/')
  .post(rbacAuth('hospital_admin', 'system_admin'), createPatient)
  .get(getPatients);

router.route('/:id')
  .get(authorizePatientAccess, getPatientById)
  .put(rbacAuth('hospital_admin', 'doctor'), updatePatient);

router.get('/:id/timeline', authorizePatientAccess, getPatientTimeline);
router.get('/:id/vitals', authorizePatientAccess, getPatientVitals);
router.get('/:id/risk-history', authorizePatientAccess, getPatientRiskHistory);
router.get('/:id/baseline', authorizePatientAccess, getPatientBaseline);

export default router;
