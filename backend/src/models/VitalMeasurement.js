import mongoose from 'mongoose';

const vitalMeasurementSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, enum: ['patient', 'worker', 'device'], required: true },
  spo2: Number,
  heartRate: Number,
  temperature: Number,
  bloodPressure: { systolic: Number, diastolic: Number },
  respiratoryRate: Number,
  notes: String
}, { timestamps: true });

vitalMeasurementSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model('VitalMeasurement', vitalMeasurementSchema);
