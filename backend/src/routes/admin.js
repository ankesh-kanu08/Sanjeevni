import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, getHospitals, getAdminStats } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);
router.use(authorize('system_admin', 'hospital_admin'));

router.route('/users')
  .get(getUsers)
  .post(createUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.get('/hospitals', getHospitals);
router.get('/stats', getAdminStats);

export default router;
