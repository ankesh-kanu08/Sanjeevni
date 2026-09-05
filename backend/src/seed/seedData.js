import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import DischargeRecord from '../models/DischargeRecord.js';
import Baseline from '../models/Baseline.js';
import MonitoringPlan from '../models/MonitoringPlan.js';
import PatientCheckIn from '../models/PatientCheckIn.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import RiskAssessment from '../models/RiskAssessment.js';
import Alert from '../models/Alert.js';
import HealthWorkerVisit from '../models/HealthWorkerVisit.js';
import DoctorDecision from '../models/DoctorDecision.js';
import Outcome from '../models/Outcome.js';
import TimelineEvent from '../models/TimelineEvent.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding');

    // Clear all collections
    await mongoose.connection.dropDatabase();
    console.log('Database cleared.');

    // 1. Hospital
    const hospital = await Hospital.create({
      name: "District Hospital Sitapur",
      type: "district",
      location: { type: 'Point', coordinates: [80.66, 27.56] }, // approx Sitapur long/lat
      district: "Sitapur",
      state: "Uttar Pradesh"
    });

    // 2-6. Users
    const systemAdmin = await User.create({ name: 'System Admin', email: 'admin@carewatch.com', password: 'admin123', role: 'system_admin' });
    const hospitalAdmin = await User.create({ name: 'Dr. Rajesh Singh', email: 'hospital@carewatch.com', password: 'hospital123', role: 'hospital_admin', hospital: hospital._id });
    const doctor = await User.create({ name: 'Dr. Priya Sharma', email: 'doctor@carewatch.com', password: 'doctor123', role: 'doctor', hospital: hospital._id });
    const worker = await User.create({ name: 'Sunita Devi', email: 'worker@carewatch.com', password: 'worker123', role: 'worker', hospital: hospital._id });
    const patientUser = await User.create({ name: 'Ramesh Kumar', email: 'patient@carewatch.com', password: 'patient123', role: 'patient' });

    // 7. Patient
    const patient = await Patient.create({
      user: patientUser._id,
      hospital: hospital._id,
      demographics: { age: 62, gender: 'Male', location: 'rural' },
      diagnosis: 'Pneumonia',
      assignedWorker: worker._id,
      assignedDoctor: doctor._id
    });

    const dayMinus4 = new Date(); dayMinus4.setDate(dayMinus4.getDate() - 4);
    const dayMinus3 = new Date(); dayMinus3.setDate(dayMinus3.getDate() - 3);
    const dayMinus2 = new Date(); dayMinus2.setDate(dayMinus2.getDate() - 2);
    const dayMinus1 = new Date(); dayMinus1.setDate(dayMinus1.getDate() - 1);
    
    // 8. DischargeRecord
    const record = await DischargeRecord.create({
      patient: patient._id, hospital: hospital._id, dischargedBy: doctor._id,
      diagnosis: 'Pneumonia',
      vitals: { spo2: 96, heartRate: 78, temperature: 98.4, bloodPressure: { systolic: 120, diastolic: 80 } },
      medications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'bd' }],
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      monitoringParams: ['spo2', 'heartRate', 'temperature', 'breathlessness', 'activity'],
      monitoringFrequency: 'daily',
      createdAt: dayMinus4
    });

    // 9. Baseline
    await Baseline.create({
      patient: patient._id, dischargeRecord: record._id,
      vitals: record.vitals,
      clinicalParams: { diagnosis: record.diagnosis },
      medications: record.medications,
      monitoringSchedule: { frequency: record.monitoringFrequency, parameters: record.monitoringParams },
      createdAt: dayMinus4
    });

    // 10. MonitoringPlan
    await MonitoringPlan.create({
      patient: patient._id, frequency: 'daily', parameters: ['spo2', 'heartRate', 'temperature', 'breathlessness', 'activity'], createdBy: doctor._id, createdAt: dayMinus4
    });

    // Day 1
    await PatientCheckIn.create({ patient: patient._id, structuredSymptoms: [{ name: 'fatigue', severity: 'mild', trend: 'stable' }], createdAt: dayMinus3 });
    await VitalMeasurement.create({ patient: patient._id, recordedBy: patientUser._id, source: 'patient', spo2: 95, heartRate: 80, createdAt: dayMinus3 });
    await RiskAssessment.create({ patient: patient._id, riskLevel: 'LOW', riskScore: 15, createdAt: dayMinus3 });
    await TimelineEvent.create({ patient: patient._id, eventType: 'vital_measurement', title: 'Vitals Recorded', description: 'Day 1 Vitals', createdAt: dayMinus3 });

    // Day 2
    await PatientCheckIn.create({ patient: patient._id, structuredSymptoms: [{ name: 'breathlessness', severity: 'mild', trend: 'worsening' }], createdAt: dayMinus2 });
    await VitalMeasurement.create({ patient: patient._id, recordedBy: patientUser._id, source: 'patient', spo2: 94, heartRate: 85, createdAt: dayMinus2 });
    await RiskAssessment.create({ patient: patient._id, riskLevel: 'LOW', riskScore: 30, createdAt: dayMinus2 });
    await TimelineEvent.create({ patient: patient._id, eventType: 'vital_measurement', title: 'Vitals Recorded', description: 'Day 2 Vitals', createdAt: dayMinus2 });

    // Day 3
    await PatientCheckIn.create({ patient: patient._id, structuredSymptoms: [{ name: 'breathlessness', severity: 'moderate', trend: 'worsening' }], createdAt: dayMinus1 });
    await VitalMeasurement.create({ patient: patient._id, recordedBy: patientUser._id, source: 'patient', spo2: 92, heartRate: 98, createdAt: dayMinus1 });
    const riskMedium = await RiskAssessment.create({ patient: patient._id, riskLevel: 'MEDIUM', riskScore: 62, recommendedWorkflow: 'field_verification', createdAt: dayMinus1 });
    await TimelineEvent.create({ patient: patient._id, eventType: 'risk_assessment', title: 'Risk Assessed: MEDIUM', description: 'Score: 62', createdAt: dayMinus1 });
    
    const alertWorker = await Alert.create({ patient: patient._id, type: 'risk_escalation', riskLevel: 'MEDIUM', title: 'MEDIUM Risk Detected', message: 'Physical verification needed.', targetRole: 'worker', targetUser: worker._id, relatedAssessment: riskMedium._id, createdAt: dayMinus1 });
    
    const visit = await HealthWorkerVisit.create({ patient: patient._id, worker: worker._id, status: 'completed', vitals: { spo2: 91, heartRate: 104, temperature: 99.1, bloodPressure: { systolic: 138, diastolic: 86 } }, completedAt: dayMinus1 });
    await TimelineEvent.create({ patient: patient._id, eventType: 'worker_visit', title: 'Worker Visit Completed', createdAt: dayMinus1 });

    // Day 4 (Today)
    const riskHigh = await RiskAssessment.create({ patient: patient._id, riskLevel: 'HIGH', riskScore: 82, recommendedWorkflow: 'clinical_review' });
    await TimelineEvent.create({ patient: patient._id, eventType: 'risk_assessment', title: 'Risk Assessed: HIGH', description: 'Score: 82' });

    const alertDoctor = await Alert.create({ patient: patient._id, type: 'risk_escalation', riskLevel: 'HIGH', title: 'HIGH Risk Detected', message: 'Possible deterioration detected. Clinical review recommended.', targetRole: 'doctor', targetUser: doctor._id, relatedAssessment: riskHigh._id });

    const decision = await DoctorDecision.create({ patient: patient._id, doctor: doctor._id, alert: alertDoctor._id, decision: 'refer_hospital', notes: 'Worsening respiratory status' });
    await TimelineEvent.create({ patient: patient._id, eventType: 'doctor_decision', title: 'Clinical Decision: refer_hospital' });

    await Outcome.create({ patient: patient._id, type: 'referral', details: 'Worsening respiratory status', decidedBy: doctor._id, relatedDecision: decision._id });
    await TimelineEvent.create({ patient: patient._id, eventType: 'outcome', title: 'Outcome: Referral' });

    // Update patient current risk
    patient.currentRiskLevel = 'HIGH';
    await patient.save();

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
