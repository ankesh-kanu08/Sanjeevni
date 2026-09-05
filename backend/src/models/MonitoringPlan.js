import mongoose from 'mongoose';
import { MONITORING_FREQUENCIES } from '../config/constants.js';

const monitoringPlanSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  frequency: { type: String, enum: Object.values(MONITORING_FREQUENCIES) },
  parameters: [String],
  riskAdaptiveRules: [{ riskLevel: String, additionalParams: [String], frequency: String }],
  checkInSchedule: [{ dayOfWeek: Number, time: String }],
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('MonitoringPlan', monitoringPlanSchema);
