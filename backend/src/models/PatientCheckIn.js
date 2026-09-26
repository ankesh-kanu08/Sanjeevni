import mongoose from 'mongoose';
import { CHANNELS } from '../config/constants.js';

const checkInResponseSchema = new mongoose.Schema({
  questionId: { type: String },
  questionText: { type: String },
  language: { type: String, enum: ['hi', 'en', 'ml', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'pa', 'or'], default: 'hi' },
  response: { type: String },
  structuredSymptoms: [{
    name: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' },
    trend: { type: String, enum: ['stable', 'improving', 'worsening'], default: 'stable' }
  }]
}, { _id: false });

const patientCheckInSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  sessionId: { type: String, index: true },
  channel: { type: String, enum: Object.values(CHANNELS), default: 'voice' },
  source: { type: String, default: 'PATIENT_VOICE' },
  rawInput: String,
  language: { type: String, default: 'en' },
  startedAt: Date,
  completedAt: Date,
  turns: [{
    turnId: Number,
    speaker: String,
    question: String,
    patientResponse: String,
    topic: String,
    timestamp: { type: Date, default: Date.now }
  }],
  responses: [checkInResponseSchema],
  structuredSymptoms: [{
    name: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' },
    trend: { type: String, enum: ['stable', 'improving', 'worsening'], default: 'stable' },
    onset: String,
    context: String,
    notes: String,
    source: { type: String, default: 'PATIENT_VOICE' },
    verified: { type: Boolean, default: false }
  }],
  vitals: {
    spo2: Number,
    heartRate: Number,
    temperature: Number,
    bloodPressure: { systolic: Number, diastolic: Number },
    respiratoryRate: Number
  },
  extractedObservations: mongoose.Schema.Types.Mixed,
  mood: { type: String, enum: ['good', 'okay', 'bad', 'better', 'same', 'worse'], default: 'okay' },
  medicationAdherence: {
    taken: Boolean,
    missed: [String],
    notes: String
  },
  additionalNotes: String,
  processedByAI: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('PatientCheckIn', patientCheckInSchema);
