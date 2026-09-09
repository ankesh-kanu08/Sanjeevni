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
  channel: { type: String, enum: Object.values(CHANNELS) },
  rawInput: String,
  language: { type: String, enum: ['hi', 'en', 'ml', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'pa', 'or'], default: 'hi' },
  startedAt: Date,
  completedAt: Date,
  responses: [checkInResponseSchema],
  structuredSymptoms: [{
    name: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' },
    trend: { type: String, enum: ['stable', 'improving', 'worsening'], default: 'stable' },
    onset: String
  }],
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
