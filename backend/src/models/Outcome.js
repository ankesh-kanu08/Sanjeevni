import mongoose from 'mongoose';

const outcomeSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  type: { type: String, enum: ['recovery', 'readmission', 'referral', 'hospitalization', 'continued_monitoring', 'deceased', 'lost_to_followup'], required: true },
  details: String,
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedDecision: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorDecision' },
  facility: String
}, { timestamps: true });

export default mongoose.model('Outcome', outcomeSchema);
