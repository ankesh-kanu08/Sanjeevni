import mongoose from 'mongoose';

const dischargeRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  diagnosis: String,
  diagnosisDetails: String,
  vitals: {
    spo2: Number,
    heartRate: Number,
    temperature: Number,
    bloodPressure: { systolic: Number, diastolic: Number },
    respiratoryRate: Number
  },
  labs: [{ name: String, value: String, unit: String, normalRange: String }],
  medications: [{ name: String, dosage: String, frequency: String, duration: String, instructions: String }],
  documents: [{ name: String, url: String, type: { type: String } }],
  followUpDate: Date,
  monitoringParams: [String],
  monitoringFrequency: String,
  notes: String
}, { timestamps: true });

export default mongoose.model('DischargeRecord', dischargeRecordSchema);
