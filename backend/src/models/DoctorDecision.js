import mongoose from 'mongoose';
import { DECISION_TYPES } from '../config/constants.js';

const doctorDecisionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alert: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' },
  decision: { type: String, enum: Object.values(DECISION_TYPES), required: true },
  notes: String,
  clinicalNotes: String,
  followUpDate: Date,
  modifiedMonitoring: { frequency: String, parameters: [String] },
  urgency: { type: String, enum: ['routine', 'urgent', 'emergency'] }
}, { timestamps: true });

export default mongoose.model('DoctorDecision', doctorDecisionSchema);
