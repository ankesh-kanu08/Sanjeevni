import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  eventType: { 
    type: String, 
    enum: ['discharge', 'checkin', 'vital_measurement', 'symptom_report', 'risk_assessment', 'worker_visit', 'alert', 'doctor_decision', 'outcome', 'note', 'medication_change'],
    required: true 
  },
  title: String,
  description: String,
  data: mongoose.Schema.Types.Mixed,
  source: { type: String, enum: ['system', 'patient', 'worker', 'doctor', 'hospital', 'ai'] },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' }
}, { timestamps: true });

timelineEventSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model('TimelineEvent', timelineEventSchema);
