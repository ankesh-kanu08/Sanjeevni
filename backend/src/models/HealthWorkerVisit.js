import mongoose from 'mongoose';

const healthWorkerVisitSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: String,
  status: { type: String, enum: ['assigned', 'in_progress', 'completed', 'cancelled'], default: 'assigned' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedReason: String,
  requiredMeasurements: [String],
  vitals: {
    spo2: Number,
    heartRate: Number,
    temperature: Number,
    bloodPressure: { systolic: Number, diastolic: Number },
    respiratoryRate: Number
  },
  symptoms: [String],
  observations: String,
  workerNotes: String,
  location: { latitude: Number, longitude: Number },
  offlineCreated: { type: Boolean, default: false },
  syncedAt: Date,
  completedAt: Date
}, { timestamps: true });

export default mongoose.model('HealthWorkerVisit', healthWorkerVisitSchema);
