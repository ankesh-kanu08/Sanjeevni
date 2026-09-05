import express from 'express';
import { getWorkerTasks, getWorkerPatients, submitVisit, updateVisitStatus, getWorkerStats } from '../controllers/workerController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);
router.use(authorize('worker'));

router.get('/tasks', getWorkerTasks);
router.get('/patients', getWorkerPatients);
router.post('/visits', submitVisit);
router.put('/visits/:id', updateVisitStatus);
router.get('/stats', getWorkerStats);

export default router;
