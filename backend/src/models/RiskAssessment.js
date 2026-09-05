import mongoose from 'mongoose';
import { RISK_LEVELS } from '../config/constants.js';

const riskAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  assessmentId: { type: String },
  timestamp: { type: Date, default: Date.now },
  score: { type: Number, min: 0, max: 100 },
  riskScore: { type: Number, min: 0, max: 100 }, // Backward compatibility
  level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  riskLevel: { type: String, enum: Object.values(RISK_LEVELS) }, // Backward compatibility
  reasons: [String],
  inputs: {
    symptoms: [mongoose.Schema.Types.Mixed],
    vitals: mongoose.Schema.Types.Mixed,
    baseline: mongoose.Schema.Types.Mixed,
    trends: mongoose.Schema.Types.Mixed
  },
  dataUsed: {
    vitals: mongoose.Schema.Types.Mixed,
    symptoms: [mongoose.Schema.Types.Mixed],
    baselineComparison: mongoose.Schema.Types.Mixed,
    trends: mongoose.Schema.Types.Mixed
  },
  baselineDeviation: [{
    parameter: String,
    baseline: mongoose.Schema.Types.Mixed,
    current: mongoose.Schema.Types.Mixed,
    change: mongoose.Schema.Types.Mixed,
    unit: String,
    severity: String
  }],
  recommendedAction: {
    type: String,
    enum: [
      'CONTINUE_MONITORING',
      'PHYSICAL_VERIFICATION',
      'CLINICAL_REVIEW',
      'EMERGENCY_ESCALATION'
    ],
    default: 'CONTINUE_MONITORING'
  },
  recommendedWorkflow: { type: String }, // Backward compatibility
  source: {
    type: String,
    enum: ['PATIENT_CHECKIN', 'HEALTH_WORKER', 'SYSTEM', 'automated', 'manual', 'worker_visit'],
    default: 'SYSTEM'
  },
  triggeredBy: { type: String },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUPERSEDED', 'RESOLVED'],
    default: 'ACTIVE'
  },
  modelVersion: { type: String, default: '1.0' }
}, { timestamps: true });

// Ensure score and level are kept in sync with riskScore/riskLevel
riskAssessmentSchema.pre('save', function (next) {
  if (this.score != null && this.riskScore == null) this.riskScore = this.score;
  if (this.riskScore != null && this.score == null) this.score = this.riskScore;
  if (this.level && !this.riskLevel) this.riskLevel = this.level;
  if (this.riskLevel && !this.level) this.level = this.riskLevel;
  next();
});

export default mongoose.model('RiskAssessment', riskAssessmentSchema);
