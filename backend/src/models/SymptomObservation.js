import mongoose from 'mongoose';

const symptomObservationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  source: { type: String, enum: ['patient_reported', 'worker_observed', 'ai_extracted'], required: true },
  symptoms: [{
    name: String,
    severity: String,
    trend: String,
    onset: String,
    duration: String
  }],
  rawText: String,
  channel: String
}, { timestamps: true });

export default mongoose.model('SymptomObservation', symptomObservationSchema);
