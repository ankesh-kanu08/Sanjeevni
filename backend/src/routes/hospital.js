import express from 'express';
import multer from 'multer';
import {
  createHospital,
  getHospitals,
  dischargePatient,
  getHospitalPatients,
  getHospitalStats,
  extractDocument
} from '../controllers/hospitalController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// Configure secure memory-storage multer for medical documents
const maxMb = parseInt(process.env.MAX_DOCUMENT_SIZE_MB, 10) || 10;
const allowedMimes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxMb * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    const isAllowedExt = /\.(pdf|jpe?g|png|webp)$/i.test(ext);
    if (allowedMimes.includes(file.mimetype) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only PDF, JPG, JPEG, PNG, and WebP are supported.'));
    }
  }
});

router.use(protect);

router.post('/hospitals', authorize('system_admin'), createHospital);
router.get('/hospitals', authorize('system_admin', 'hospital_admin'), getHospitals);

// Document AI Extraction pipeline
router.post(
  '/extract-document',
  authorize('doctor', 'hospital_admin'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File is too large. Please upload a document smaller than ${maxMb} MB.`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload validation failed'
        });
      }
      next();
    });
  },
  extractDocument
);

router.post('/discharge', authorize('doctor', 'hospital_admin'), dischargePatient);
router.get('/patients', authorize('hospital_admin', 'doctor', 'worker'), getHospitalPatients);
router.get('/stats', authorize('hospital_admin'), getHospitalStats);

export default router;
