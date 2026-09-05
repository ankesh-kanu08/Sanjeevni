import mongoose from 'mongoose';
import { ALERT_TYPES, RISK_LEVELS } from '../config/constants.js';

const alertSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  type: { type: String, enum: Object.values(ALERT_TYPES), required: true },
  riskLevel: { type: String, enum: Object.values(RISK_LEVELS) },
  title: String,
  message: String,
  reasons: [String],
  isRead: { type: Boolean, default: false },
  isActioned: { type: Boolean, default: false },
  actionTaken: String,
  targetRole: String,
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedAssessment: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskAssessment' },
  expiresAt: Date
}, { timestamps: true });

export default mongoose.model('Alert', alertSchema);
