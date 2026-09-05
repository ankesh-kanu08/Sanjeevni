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
      location: { type: 'Point', coordinates: [80.66, 27.56] },
      district: "Sitapur",
      state: "Uttar Pradesh"
    });

    // 2. Staff Users
    const systemAdmin = await User.create({ name: 'System Admin', email: 'admin@carewatch.com', password: 'admin123', role: 'system_admin' });
    const hospitalAdmin = await User.create({ name: 'Dr. Rajesh Singh', email: 'hospital@carewatch.com', password: 'hospital123', role: 'hospital_admin', hospital: hospital._id });
    const doctor = await User.create({ name: 'Dr. Priya Sharma', email: 'doctor@carewatch.com', password: 'doctor123', role: 'doctor', hospital: hospital._id });
    const worker = await User.create({ name: 'Sunita Devi', email: 'worker@carewatch.com', password: 'worker123', role: 'worker', hospital: hospital._id });

    // 3. Patient Users (Varied across demographics & conditions)
    const patientUser1 = await User.create({ name: 'Ramesh Kumar', email: 'patient@carewatch.com', password: 'patient123', role: 'patient', phone: '+91 98765 43210' });
    const patientUser2 = await User.create({ name: 'Sunita Sharma', email: 'sunita@carewatch.com', password: 'patient123', role: 'patient', phone: '+91 98123 45678' });
    const patientUser3 = await User.create({ name: 'Amit Patel', email: 'amit@carewatch.com', password: 'patient123', role: 'patient', phone: '+91 98234 56789' });

    // Dates
    const dayMinus5 = new Date(Date.now() - 5 * 86400000);
    const dayMinus4 = new Date(Date.now() - 4 * 86400000);
    const dayMinus3 = new Date(Date.now() - 3 * 86400000);
    const dayMinus2 = new Date(Date.now() - 2 * 86400000);
    const dayMinus1 = new Date(Date.now() - 1 * 86400000);
    const followUp1 = new Date(Date.now() + 7 * 86400000);
    const followUp2 = new Date(Date.now() + 5 * 86400000);
    const followUp3 = new Date(Date.now() + 9 * 86400000);

    // =========================================================================
    // PATIENT 1: Ramesh Kumar — 62M, Rural, Pneumonia → HIGH RISK (82/100)
    // Variation: Respiratory Deterioration, In-Person ASHA Verification Done
    // =========================================================================
    const patient1 = await Patient.create({
      user: patientUser1._id,
      hospital: hospital._id,
      demographics: { age: 62, gender: 'Male', location: 'rural', bloodGroup: 'O+', district: 'Sitapur', state: 'Uttar Pradesh' },
      diagnosis: 'Pneumonia',
      comorbidities: ['COPD', 'Hypertension'],
      dischargeDate: dayMinus4,
      followUpDate: followUp1,
      assignedWorker: worker._id,
      assignedDoctor: doctor._id,
      currentRiskLevel: 'HIGH',
      currentRiskScore: 82
    });

    const record1 = await DischargeRecord.create({
      patient: patient1._id,
      hospital: hospital._id,
      dischargedBy: doctor._id,
      diagnosis: 'Pneumonia',
      dischargeDate: dayMinus4,
      vitals: { spo2: 96, heartRate: 78, temperature: 98.4, bloodPressure: { systolic: 120, diastolic: 80 } },
      medications: [
        { name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', instructions: 'After meals' },
        { name: 'Paracetamol', dosage: '650mg', frequency: 'As needed', duration: '5 days', instructions: 'For fever above 100°F' }
      ],
      followUpDate: followUp1,
      monitoringParams: ['spo2', 'heartRate', 'temperature', 'breathlessness'],
      monitoringFrequency: 'daily',
      createdAt: dayMinus4
    });
    patient1.dischargeRecord = record1._id;
    await patient1.save();

    await Baseline.create({
      patient: patient1._id,
      dischargeRecord: record1._id,
      vitals: record1.vitals,
      clinicalParams: { diagnosis: record1.diagnosis },
      medications: record1.medications,
      monitoringSchedule: { frequency: record1.monitoringFrequency, parameters: record1.monitoringParams },
      createdAt: dayMinus4
    });

    await TimelineEvent.create({
      patient: patient1._id,
      eventType: 'discharge',
      title: 'Hospital Discharge & Baseline Established',
      description: 'Discharge diagnosis: Pneumonia. Baseline SpO₂: 96%, HR: 78 bpm',
      sourceRole: 'hospital',
      createdAt: dayMinus4
    });

    // P1 Check-ins & Progression
    await PatientCheckIn.create({ patient: patient1._id, channel: 'voice', rawInput: 'आज हल्की कमजोरी लग रही है पर सांस ठीक है।', structuredSymptoms: [{ name: 'fatigue', severity: 'mild', trend: 'stable' }], createdAt: dayMinus3 });
    await VitalMeasurement.create({ patient: patient1._id, recordedBy: patientUser1._id, source: 'patient', spo2: 95, heartRate: 80, createdAt: dayMinus3 });
    await RiskAssessment.create({ patient: patient1._id, assessmentId: `RA-P1-D1-${Date.now()}`, score: 15, riskScore: 15, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['No concerning change from personal baseline'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus3 });
    await TimelineEvent.create({ patient: patient1._id, eventType: 'vital_measurement', title: 'Day 1 Vitals: SpO₂ 95%, HR 80', description: 'Patient reports mild fatigue, stable', sourceRole: 'patient', createdAt: dayMinus3 });

    await PatientCheckIn.create({ patient: patient1._id, channel: 'voice', rawInput: 'थोड़ा चलने पर सांस भारी लग रही है।', structuredSymptoms: [{ name: 'breathlessness', severity: 'mild', trend: 'worsening' }], createdAt: dayMinus2 });
    await VitalMeasurement.create({ patient: patient1._id, recordedBy: patientUser1._id, source: 'patient', spo2: 94, heartRate: 85, createdAt: dayMinus2 });
    await RiskAssessment.create({ patient: patient1._id, assessmentId: `RA-P1-D2-${Date.now()}`, score: 30, riskScore: 30, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['Mild change in breathing reported; vitals within acceptable limits'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus2 });
    await TimelineEvent.create({ patient: patient1._id, eventType: 'vital_measurement', title: 'Day 2 Vitals: SpO₂ 94%, HR 85', description: 'Patient reports mild breathing discomfort', sourceRole: 'patient', createdAt: dayMinus2 });

    await PatientCheckIn.create({ patient: patient1._id, channel: 'voice', rawInput: 'कल से सांस लेने में तकलीफ ज्यादा बढ़ गई है।', structuredSymptoms: [{ name: 'breathlessness', severity: 'moderate', trend: 'worsening' }], createdAt: dayMinus1 });
    await VitalMeasurement.create({ patient: patient1._id, recordedBy: patientUser1._id, source: 'patient', spo2: 92, heartRate: 98, createdAt: dayMinus1 });
    await RiskAssessment.create({ patient: patient1._id, assessmentId: `RA-P1-D3-${Date.now()}`, score: 62, riskScore: 62, level: 'MEDIUM', riskLevel: 'MEDIUM', status: 'SUPERSEDED', reasons: ['SpO₂ decreased 4 points from personal baseline', 'Heart rate increased 20 bpm from personal baseline', 'Breathlessness worsening reported'], recommendedAction: 'PHYSICAL_VERIFICATION', source: 'PATIENT_CHECKIN', createdAt: dayMinus1 });
    await TimelineEvent.create({ patient: patient1._id, eventType: 'risk_assessment', title: 'Risk Assessed: MEDIUM (62/100)', description: 'Breathlessness worsening; physical verification recommended', sourceRole: 'ai', severity: 'warning', createdAt: dayMinus1 });

    // ASHA Visit for P1
    await HealthWorkerVisit.create({
      patient: patient1._id,
      worker: worker._id,
      status: 'completed',
      priority: 'high',
      vitals: { spo2: 91, heartRate: 104, temperature: 99.1, bloodPressure: { systolic: 138, diastolic: 86 } },
      observations: 'Patient reports worsening breathlessness on minimal exertion. Vitals verified in-person.',
      completedAt: dayMinus1,
      createdAt: dayMinus1
    });
    await VitalMeasurement.create({
      patient: patient1._id,
      recordedBy: worker._id,
      source: 'worker',
      spo2: 91,
      heartRate: 104,
      temperature: 99.1,
      bloodPressure: { systolic: 138, diastolic: 86 },
      notes: 'Recorded during field verification by ASHA Sunita Devi',
      createdAt: dayMinus1
    });
    await TimelineEvent.create({ patient: patient1._id, eventType: 'worker_visit', title: 'ASHA Field Verification Completed', description: 'In-person vitals: SpO₂ 91%, HR 104 bpm. Breathlessness worsening verified.', sourceRole: 'worker', severity: 'critical', createdAt: dayMinus1 });

    // P1 Active HIGH Assessment (Day 4)
    const riskHigh1 = await RiskAssessment.create({
      patient: patient1._id,
      assessmentId: `RA-P1-D4-${Date.now()}`,
      score: 82,
      riskScore: 82,
      level: 'HIGH',
      riskLevel: 'HIGH',
      status: 'ACTIVE',
      reasons: [
        'SpO₂ decreased 5 points from personal baseline',
        'Heart rate increased 26 bpm from personal baseline',
        'Breathlessness worsening reported',
        'Recent assessment shows worsening trend'
      ],
      inputs: {
        baseline: { spo2: 96, heartRate: 78 },
        vitals: { spo2: 91, heartRate: 104, temperature: 99.1, bloodPressure: { systolic: 138, diastolic: 86 } },
        symptoms: ['breathlessness (worsening)']
      },
      baselineDeviation: [
        { parameter: 'spo2', baseline: 96, current: 91, change: -5, unit: '%', severity: 'severe' },
        { parameter: 'heartRate', baseline: 78, current: 104, change: 26, unit: 'bpm', severity: 'moderate' }
      ],
      recommendedAction: 'CLINICAL_REVIEW',
      source: 'HEALTH_WORKER',
      triggeredBy: 'worker_visit'
    });
    patient1.latestAssessment = riskHigh1._id;
    await patient1.save();

    await TimelineEvent.create({
      patient: patient1._id,
      eventType: 'risk_assessment',
      title: 'Risk Assessed: HIGH (82/100)',
      description: 'Possible deterioration detected. SpO₂ decreased 5 pts, HR increased 26 bpm.',
      sourceRole: 'ai',
      severity: 'critical'
    });

    await Alert.create({
      patient: patient1._id,
      relatedAssessment: riskHigh1._id,
      riskAssessmentId: riskHigh1._id,
      type: 'risk_escalation',
      riskLevel: 'HIGH',
      level: 'HIGH',
      title: 'Possible Deterioration Detected',
      message: 'SpO₂ decreased 5 points and HR increased 26 bpm from personal baseline.',
      reasons: [
        'SpO₂ decreased 5 points from personal baseline',
        'Heart rate increased 26 bpm from personal baseline',
        'Breathlessness worsening reported',
        'Recent assessment shows worsening trend'
      ],
      vitalsComparison: {
        baseline: { spo2: 96, heartRate: 78 },
        current: { spo2: 91, heartRate: 104 },
        changes: { spo2Change: -5, hrChange: 26 }
      },
      symptomsReported: ['Increasing breathlessness'],
      verificationStatus: 'Completed by ASHA',
      recommendedAction: 'Clinical review',
      targetRole: 'doctor',
      targetUser: doctor._id,
      status: 'UNREAD',
      isRead: false,
      isActioned: false
    });


    // =========================================================================
    // PATIENT 2: Sunita Sharma — 54F, Semi-Urban, CHF → MEDIUM RISK (58/100)
    // Variation: Cardiovascular Fluid Retention, ASHA Dispatch Pending
    // =========================================================================
    const patient2 = await Patient.create({
      user: patientUser2._id,
      hospital: hospital._id,
      demographics: { age: 54, gender: 'Female', location: 'semi-urban', bloodGroup: 'B+', district: 'Sitapur', state: 'Uttar Pradesh' },
      diagnosis: 'Congestive Heart Failure (NYHA II)',
      comorbidities: ['Hypertension', 'Type 2 Diabetes'],
      dischargeDate: dayMinus3,
      followUpDate: followUp2,
      assignedWorker: worker._id,
      assignedDoctor: doctor._id,
      currentRiskLevel: 'MEDIUM',
      currentRiskScore: 58
    });

    const record2 = await DischargeRecord.create({
      patient: patient2._id,
      hospital: hospital._id,
      dischargedBy: doctor._id,
      diagnosis: 'Congestive Heart Failure (NYHA II)',
      dischargeDate: dayMinus3,
      vitals: { spo2: 97, heartRate: 74, temperature: 98.2, bloodPressure: { systolic: 126, diastolic: 78 } },
      medications: [
        { name: 'Furosemide', dosage: '40mg', frequency: 'Once daily morning', duration: '30 days', instructions: 'Take on empty stomach' },
        { name: 'Enalapril', dosage: '5mg', frequency: 'Twice daily', duration: '30 days', instructions: 'Monitor BP regularly' },
        { name: 'Carvedilol', dosage: '6.25mg', frequency: 'Twice daily', duration: '30 days', instructions: 'Take with food' }
      ],
      followUpDate: followUp2,
      monitoringParams: ['bloodPressure', 'heartRate', 'spo2', 'edema', 'weight'],
      monitoringFrequency: 'daily',
      createdAt: dayMinus3
    });
    patient2.dischargeRecord = record2._id;
    await patient2.save();

    await Baseline.create({
      patient: patient2._id,
      dischargeRecord: record2._id,
      vitals: record2.vitals,
      clinicalParams: { diagnosis: record2.diagnosis },
      medications: record2.medications,
      monitoringSchedule: { frequency: record2.monitoringFrequency, parameters: record2.monitoringParams },
      createdAt: dayMinus3
    });

    await TimelineEvent.create({
      patient: patient2._id,
      eventType: 'discharge',
      title: 'Hospital Discharge & Baseline Established',
      description: 'Discharge diagnosis: Congestive Heart Failure. Baseline BP: 126/78, HR: 74 bpm',
      sourceRole: 'hospital',
      createdAt: dayMinus3
    });

    // P2 Day 1: Stable
    await PatientCheckIn.create({ patient: patient2._id, channel: 'voice', rawInput: 'दवाइयां समय पर ले रही हूँ, तबीयत ठीक है।', structuredSymptoms: [], createdAt: dayMinus2 });
    await VitalMeasurement.create({ patient: patient2._id, recordedBy: patientUser2._id, source: 'patient', spo2: 97, heartRate: 76, bloodPressure: { systolic: 128, diastolic: 80 }, createdAt: dayMinus2 });
    await RiskAssessment.create({ patient: patient2._id, assessmentId: `RA-P2-D1-${Date.now()}`, score: 18, riskScore: 18, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['Vitals consistent with discharge baseline'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus2 });
    await TimelineEvent.create({ patient: patient2._id, eventType: 'vital_measurement', title: 'Day 1 Vitals: BP 128/80, HR 76', description: 'Patient reports feeling well and taking all cardiac medications', sourceRole: 'patient', createdAt: dayMinus2 });

    // P2 Day 2: Mild edema & orthopnea reported
    await PatientCheckIn.create({ patient: patient2._id, channel: 'voice', rawInput: 'शाम से दोनों पैरों में हल्की सूजन लग रही है और सीधे लेटते समय सांस भारी लगती है।', structuredSymptoms: [{ name: 'pedal_edema', severity: 'mild', trend: 'worsening' }, { name: 'orthopnea', severity: 'mild', trend: 'worsening' }], createdAt: dayMinus1 });
    await VitalMeasurement.create({ patient: patient2._id, recordedBy: patientUser2._id, source: 'patient', spo2: 96, heartRate: 82, bloodPressure: { systolic: 136, diastolic: 84 }, createdAt: dayMinus1 });
    await RiskAssessment.create({ patient: patient2._id, assessmentId: `RA-P2-D2-${Date.now()}`, score: 38, riskScore: 38, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['Mild ankle swelling and BP elevation observed'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus1 });
    await TimelineEvent.create({ patient: patient2._id, eventType: 'vital_measurement', title: 'Day 2 Vitals: BP 136/84, HR 82', description: 'Patient reports mild ankle swelling and difficulty breathing when flat', sourceRole: 'patient', createdAt: dayMinus1 });

    // P2 Day 3 (Today): Active MEDIUM Assessment (58/100)
    await PatientCheckIn.create({ patient: patient2._id, channel: 'voice', rawInput: 'पैरों की सूजन थोड़ी और बढ़ गई है और सीढ़ियां चढ़ते ही सांस फूल रही है।', structuredSymptoms: [{ name: 'pedal_edema', severity: 'moderate', trend: 'worsening' }, { name: 'breathlessness', severity: 'moderate', trend: 'worsening' }] });
    await VitalMeasurement.create({ patient: patient2._id, recordedBy: patientUser2._id, source: 'patient', spo2: 95, heartRate: 88, bloodPressure: { systolic: 142, diastolic: 90 } });

    const riskMedium2 = await RiskAssessment.create({
      patient: patient2._id,
      assessmentId: `RA-P2-D3-${Date.now()}`,
      score: 58,
      riskScore: 58,
      level: 'MEDIUM',
      riskLevel: 'MEDIUM',
      status: 'ACTIVE',
      reasons: [
        'Blood pressure increased +16/+12 mmHg from personal baseline (142/90 vs 126/78)',
        'Heart rate increased 14 bpm from personal baseline',
        'Bilateral pedal edema and orthopnea reported',
        'Early fluid retention suspected'
      ],
      inputs: {
        baseline: { spo2: 97, heartRate: 74, bloodPressure: { systolic: 126, diastolic: 78 } },
        vitals: { spo2: 95, heartRate: 88, bloodPressure: { systolic: 142, diastolic: 90 } },
        symptoms: ['pedal_edema (moderate)', 'orthopnea (moderate)']
      },
      baselineDeviation: [
        { parameter: 'bloodPressureSys', baseline: 126, current: 142, change: 16, unit: 'mmHg', severity: 'moderate' },
        { parameter: 'bloodPressureDia', baseline: 78, current: 90, change: 12, unit: 'mmHg', severity: 'moderate' },
        { parameter: 'heartRate', baseline: 74, current: 88, change: 14, unit: 'bpm', severity: 'mild' }
      ],
      recommendedAction: 'PHYSICAL_VERIFICATION',
      source: 'PATIENT_CHECKIN',
      triggeredBy: 'patient_checkin'
    });
    patient2.latestAssessment = riskMedium2._id;
    await patient2.save();

    await TimelineEvent.create({
      patient: patient2._id,
      eventType: 'risk_assessment',
      title: 'Risk Assessed: MEDIUM (58/100)',
      description: 'Cardiovascular fluid overload warning. ASHA field verification recommended.',
      sourceRole: 'ai',
      severity: 'warning'
    });

    // Alert for P2
    await Alert.create({
      patient: patient2._id,
      relatedAssessment: riskMedium2._id,
      riskAssessmentId: riskMedium2._id,
      type: 'risk_escalation',
      riskLevel: 'MEDIUM',
      level: 'MEDIUM',
      title: 'Cardiovascular Stress & Fluid Overload Warning',
      message: 'BP increased +16/+12 mmHg from baseline with reported ankle edema and nocturnal dyspnea.',
      reasons: [
        'Blood pressure increased +16/+12 mmHg from personal baseline (142/90 vs 126/78)',
        'Heart rate increased 14 bpm from personal baseline',
        'Bilateral pedal edema and orthopnea reported',
        'Early fluid retention suspected'
      ],
      vitalsComparison: {
        baseline: { spo2: 97, heartRate: 74, bloodPressure: { systolic: 126, diastolic: 78 } },
        current: { spo2: 95, heartRate: 88, bloodPressure: { systolic: 142, diastolic: 90 } },
        changes: { bpSysChange: 16, bpDiaChange: 12, hrChange: 14, spo2Change: -2 }
      },
      symptomsReported: ['Bilateral ankle edema', 'Orthopnea (breathlessness lying flat)'],
      verificationStatus: 'Pending physical verification by ASHA',
      recommendedAction: 'Physical verification by ASHA worker',
      targetRole: 'doctor',
      targetUser: doctor._id,
      status: 'UNREAD',
      isRead: false,
      isActioned: false
    });


    // =========================================================================
    // PATIENT 3: Amit Patel — 38M, Urban, Post-Cholecystectomy → LOW RISK (14/100)
    // Variation: Uneventful Surgical Recovery, Stable Vitals, Routine Monitoring
    // =========================================================================
    const patient3 = await Patient.create({
      user: patientUser3._id,
      hospital: hospital._id,
      demographics: { age: 38, gender: 'Male', location: 'urban', bloodGroup: 'A+', district: 'Sitapur', state: 'Uttar Pradesh' },
      diagnosis: 'Post-Laparoscopic Cholecystectomy',
      comorbidities: [],
      dischargeDate: dayMinus5,
      followUpDate: followUp3,
      assignedWorker: worker._id,
      assignedDoctor: doctor._id,
      currentRiskLevel: 'LOW',
      currentRiskScore: 14
    });

    const record3 = await DischargeRecord.create({
      patient: patient3._id,
      hospital: hospital._id,
      dischargedBy: doctor._id,
      diagnosis: 'Post-Laparoscopic Cholecystectomy',
      dischargeDate: dayMinus5,
      vitals: { spo2: 98, heartRate: 72, temperature: 98.6, bloodPressure: { systolic: 118, diastolic: 76 } },
      medications: [
        { name: 'Cefixime', dosage: '200mg', frequency: 'Twice daily', duration: '5 days', instructions: 'Complete antibiotics course' },
        { name: 'Paracetamol', dosage: '650mg', frequency: 'As needed', duration: '3 days', instructions: 'For surgical site pain' },
        { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily morning', duration: '7 days', instructions: 'Before breakfast' }
      ],
      followUpDate: followUp3,
      monitoringParams: ['temperature', 'woundPain', 'spo2', 'heartRate'],
      monitoringFrequency: 'daily',
      createdAt: dayMinus5
    });
    patient3.dischargeRecord = record3._id;
    await patient3.save();

    await Baseline.create({
      patient: patient3._id,
      dischargeRecord: record3._id,
      vitals: record3.vitals,
      clinicalParams: { diagnosis: record3.diagnosis },
      medications: record3.medications,
      monitoringSchedule: { frequency: record3.monitoringFrequency, parameters: record3.monitoringParams },
      createdAt: dayMinus5
    });

    await TimelineEvent.create({
      patient: patient3._id,
      eventType: 'discharge',
      title: 'Hospital Discharge & Baseline Established',
      description: 'Discharge diagnosis: Post-Laparoscopic Cholecystectomy. Baseline SpO₂: 98%, HR: 72 bpm',
      sourceRole: 'hospital',
      createdAt: dayMinus5
    });

    // P3 Day 2 Check-in
    await PatientCheckIn.create({ patient: patient3._id, channel: 'voice', rawInput: 'चीरे की जगह हल्का खिंचाव और दर्द है, पर बुखार नहीं है। दवा ले रहा हूँ।', structuredSymptoms: [{ name: 'surgical_site_pain', severity: 'mild', trend: 'stable' }], createdAt: dayMinus3 });
    await VitalMeasurement.create({ patient: patient3._id, recordedBy: patientUser3._id, source: 'patient', spo2: 98, heartRate: 74, temperature: 98.6, bloodPressure: { systolic: 120, diastolic: 78 }, createdAt: dayMinus3 });
    await RiskAssessment.create({ patient: patient3._id, assessmentId: `RA-P3-D1-${Date.now()}`, score: 20, riskScore: 20, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['Mild surgical site soreness expected post-op; vitals stable'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus3 });
    await TimelineEvent.create({ patient: patient3._id, eventType: 'vital_measurement', title: 'Day 2 Vitals: SpO₂ 98%, HR 74', description: 'Patient reports mild incision pain controlled with paracetamol', sourceRole: 'patient', createdAt: dayMinus3 });

    // P3 Day 4 Check-in
    await PatientCheckIn.create({ patient: patient3._id, channel: 'voice', rawInput: 'दर्द काफी कम हो गया है, हल्का खाना खा पा रहा हूँ और टहल रहा हूँ।', structuredSymptoms: [{ name: 'surgical_site_pain', severity: 'mild', trend: 'improving' }], createdAt: dayMinus1 });
    await VitalMeasurement.create({ patient: patient3._id, recordedBy: patientUser3._id, source: 'patient', spo2: 98, heartRate: 70, temperature: 98.4, bloodPressure: { systolic: 118, diastolic: 76 }, createdAt: dayMinus1 });
    await RiskAssessment.create({ patient: patient3._id, assessmentId: `RA-P3-D2-${Date.now()}`, score: 16, riskScore: 16, level: 'LOW', riskLevel: 'LOW', status: 'SUPERSEDED', reasons: ['Wound healing normally, patient mobilizing well'], recommendedAction: 'CONTINUE_MONITORING', source: 'PATIENT_CHECKIN', createdAt: dayMinus1 });
    await TimelineEvent.create({ patient: patient3._id, eventType: 'vital_measurement', title: 'Day 4 Vitals: SpO₂ 98%, HR 70', description: 'Incision pain resolving, normal ambulation', sourceRole: 'patient', createdAt: dayMinus1 });

    // P3 Day 5 (Today): Active LOW Assessment (14/100)
    await PatientCheckIn.create({ patient: patient3._id, channel: 'voice', rawInput: 'आज कोई दर्द नहीं है, टांके सूखे हैं और सामान्य महसूस कर रहा हूँ। भूख भी अच्छी है।', structuredSymptoms: [] });
    await VitalMeasurement.create({ patient: patient3._id, recordedBy: patientUser3._id, source: 'patient', spo2: 99, heartRate: 68, temperature: 98.2, bloodPressure: { systolic: 116, diastolic: 74 } });

    const riskLow3 = await RiskAssessment.create({
      patient: patient3._id,
      assessmentId: `RA-P3-D3-${Date.now()}`,
      score: 14,
      riskScore: 14,
      level: 'LOW',
      riskLevel: 'LOW',
      status: 'ACTIVE',
      reasons: [
        'Vitals strictly consistent with surgical discharge baseline',
        'Surgical wound healing normally without erythema or discharge',
        'Full mobility and normal diet tolerated'
      ],
      inputs: {
        baseline: { spo2: 98, heartRate: 72, bloodPressure: { systolic: 118, diastolic: 76 } },
        vitals: { spo2: 99, heartRate: 68, temperature: 98.2, bloodPressure: { systolic: 116, diastolic: 74 } },
        symptoms: ['surgical_site_pain (resolved)']
      },
      recommendedAction: 'CONTINUE_MONITORING',
      source: 'PATIENT_CHECKIN',
      triggeredBy: 'patient_checkin'
    });
    patient3.latestAssessment = riskLow3._id;
    await patient3.save();

    await TimelineEvent.create({
      patient: patient3._id,
      eventType: 'risk_assessment',
      title: 'Risk Assessed: LOW (14/100)',
      description: 'Post-surgical recovery uneventful. Continue routine monitoring.',
      sourceRole: 'ai',
      severity: 'info'
    });

    console.log('Seed completed successfully with 3 diverse clinical patients!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedData();
