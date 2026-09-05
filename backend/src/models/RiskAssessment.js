import mongoose from 'mongoose';
import { RISK_LEVELS } from '../config/constants.js';

const riskAssessmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  riskScore: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: Object.values(RISK_LEVELS) },
  reasons: [String],
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
    unit: String
  }],
  recommendedWorkflow: { type: String, enum: ['continue_monitoring', 'field_verification', 'clinical_review', 'emergency'] },
  modelVersion: { type: String, default: '1.0' },
  triggeredBy: { type: String, enum: ['automated', 'manual', 'worker_visit'] }
}, { timestamps: true });

export default mongoose.model('RiskAssessment', riskAssessmentSchema);
