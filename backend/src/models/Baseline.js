import mongoose from 'mongoose';

const baselineSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true },
  dischargeRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'DischargeRecord' },
  vitals: {
    spo2: Number,
    heartRate: Number,
    temperature: Number,
    bloodPressure: { systolic: Number, diastolic: Number },
    respiratoryRate: Number
  },
  symptoms: [{ name: String, severity: String, presentAtDischarge: Boolean }],
  clinicalParams: { diagnosis: String, comorbidities: [String], riskFactors: [String] },
  medications: [{ name: String, dosage: String, frequency: String, duration: String, instructions: String }],
  activityBaseline: { level: { type: String, enum: ['normal', 'limited', 'restricted'] }, notes: String },
  monitoringSchedule: { frequency: String, parameters: [String], startDate: Date, endDate: Date }
}, { timestamps: true });

export default mongoose.model('Baseline', baselineSchema);
