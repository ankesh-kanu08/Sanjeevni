import mongoose from 'mongoose';
import { ALERT_TYPES, RISK_LEVELS } from '../config/constants.js';

const alertSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  relatedAssessment: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskAssessment' },
  riskAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskAssessment' }, // Alias
  type: { type: String, enum: Object.values(ALERT_TYPES), required: true },
  riskLevel: { type: String, enum: Object.values(RISK_LEVELS) },
  level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] }, // Normalized level
  title: String,
  message: String,
  reasons: [String],
  vitalsComparison: {
    baseline: mongoose.Schema.Types.Mixed,
    current: mongoose.Schema.Types.Mixed,
    changes: mongoose.Schema.Types.Mixed
  },
  symptomsReported: [String],
  verificationStatus: { type: String, default: 'Pending physical verification' },
  recommendedAction: String,
  status: {
    type: String,
    enum: ['UNREAD', 'READ', 'ACTIONED', 'SUPERSEDED', 'RESOLVED'],
    default: 'UNREAD'
  },
  isRead: { type: Boolean, default: false },
  isActioned: { type: Boolean, default: false },
  actionTaken: String,
  targetRole: String,
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date
}, { timestamps: true });

alertSchema.pre('save', function (next) {
  if (this.riskLevel && !this.level) this.level = this.riskLevel;
  if (this.level && !this.riskLevel) this.riskLevel = this.level;
  if (this.relatedAssessment && !this.riskAssessmentId) this.riskAssessmentId = this.relatedAssessment;
  if (this.riskAssessmentId && !this.relatedAssessment) this.relatedAssessment = this.riskAssessmentId;
  if (this.status === 'ACTIONED') {
    this.isActioned = true;
    this.isRead = true;
  } else if (this.status === 'READ') {
    this.isRead = true;
  }
  next();
});

export default mongoose.model('Alert', alertSchema);
