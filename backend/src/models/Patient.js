import mongoose from 'mongoose';
import { PATIENT_STATUS, RISK_LEVELS } from '../config/constants.js';

const patientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  demographics: {
    age: Number,
    gender: String,
    bloodGroup: String,
    address: String,
    district: String,
    state: String,
    pincode: String,
    location: { type: String, enum: ['rural', 'urban', 'semi-urban'] }
  },
  diagnosis: String,
  comorbidities: [String],
  dischargeDate: Date,
  followUpDate: Date,
  status: { type: String, enum: Object.values(PATIENT_STATUS), default: PATIENT_STATUS.ACTIVE },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  monitoringActive: { type: Boolean, default: true },
  currentRiskLevel: { type: String, enum: Object.values(RISK_LEVELS), default: RISK_LEVELS.LOW },
  currentRiskScore: { type: Number, default: 0 },
  latestAssessment: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskAssessment' },
  dischargeRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'DischargeRecord' },
  preferredLanguage: {
    type: String,
    enum: ['hi', 'en', 'ml', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'pa', 'or'],
    default: 'hi'
  },
  lastCheckIn: Date
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);
