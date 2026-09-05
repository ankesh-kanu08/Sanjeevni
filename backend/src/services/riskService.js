import axios from 'axios';
import RiskAssessment from '../models/RiskAssessment.js';
import Patient from '../models/Patient.js';
import Baseline from '../models/Baseline.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import PatientCheckIn from '../models/PatientCheckIn.js';
import { createAlert } from './alertService.js';
import { addEvent } from './timelineService.js';
import { RISK_LEVELS, ALERT_TYPES } from '../config/constants.js';

const EMPTY_VITALS = { spo2: null, heartRate: null, temperature: null, bloodPressure: null, respiratoryRate: null };

const normaliseSymptoms = (checkin) => (checkin?.structuredSymptoms || []).flatMap((symptom) => {
  const name = String(symptom.name || '').toLowerCase().replace(/\s+/g, '_');
  const values = [name];
  if (symptom.trend === 'worsening') values.push(`worsening_${name}`, `increased_${name}`);
  if (symptom.severity === 'severe') values.push(`severe_${name}`);
  return values;
});

const fallbackAssessment = ({ baseline, current, symptoms }) => {
  const reasons = [];
  let score = 0;
  const spo2Drop = baseline.spo2 != null && current.spo2 != null ? baseline.spo2 - current.spo2 : 0;
  const hrRise = baseline.heartRate != null && current.heartRate != null ? current.heartRate - baseline.heartRate : 0;
  if (spo2Drop >= 2) { score += Math.min(spo2Drop * 6, 30); reasons.push(`SpO2 decreased ${spo2Drop} points from discharge baseline`); }
  if (hrRise >= 10) { score += Math.min(hrRise, 20); reasons.push(`Heart rate increased ${hrRise} bpm from discharge baseline`); }
  if (symptoms.some((s) => s.includes('worsening') || s.includes('increased'))) { score += 25; reasons.push('Worsening symptoms reported'); }
  if (symptoms.some((s) => s.startsWith('severe_') || s === 'chest_pain')) { score = Math.max(score, 85); reasons.push('Potentially urgent symptom reported'); }
  if (current.spo2 != null && current.spo2 < 92) { score = Math.max(score, 85); reasons.push('SpO2 is below the configured safety threshold'); }
  if (current.heartRate != null && current.heartRate > 120) { score = Math.max(score, 85); reasons.push('Heart rate is above the configured safety threshold'); }
  const riskLevel = score >= 70 ? RISK_LEVELS.HIGH : score >= 35 ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW;
  return { riskScore: Math.min(score, 100), riskLevel, reasons: reasons.length ? reasons : ['No concerning change from the available personal baseline'], baselineDeviation: [], trends: { trend: 'unavailable' } };
};

export const assessRisk = async (patientId, triggeredBy = 'automated') => {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error('Patient not found');

  const [baselineRecord, latestVitals, latestCheckin, previousAssessments] = await Promise.all([
    Baseline.findOne({ patient: patientId }),
    VitalMeasurement.findOne({ patient: patientId }).sort({ createdAt: -1 }),
    PatientCheckIn.findOne({ patient: patientId }).sort({ createdAt: -1 }),
    RiskAssessment.find({ patient: patientId }).sort({ createdAt: 1 }).limit(3)
  ]);
  const baseline = { ...EMPTY_VITALS, ...(baselineRecord?.vitals?.toObject?.() || baselineRecord?.vitals || {}) };
  const current = { ...EMPTY_VITALS, ...(latestVitals?.toObject?.() || latestVitals || {}) };
  const symptoms = normaliseSymptoms(latestCheckin);
  const payload = {
    patientId: String(patientId), baseline, current, symptoms, activityChange: 0,
    daysSinceDischarge: patient.dischargeDate ? Math.max(1, Math.ceil((Date.now() - patient.dischargeDate.getTime()) / 86400000)) : 1,
    previousAssessments: previousAssessments.map((item) => ({ riskScore: item.riskScore, riskLevel: item.riskLevel, date: item.createdAt.toISOString() }))
  };

  let result;
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/api/analyze`, payload, { timeout: 4000 });
    result = response.data;
  } catch (error) {
    console.warn(`AI service unavailable; applying local safety rules: ${error.message}`);
    result = fallbackAssessment(payload);
  }

  const workflowByRisk = { LOW: 'continue_monitoring', MEDIUM: 'field_verification', HIGH: 'clinical_review' };
  const assessment = await RiskAssessment.create({
    patient: patientId, riskScore: result.riskScore, riskLevel: result.riskLevel,
    reasons: result.reasons, dataUsed: { vitals: current, symptoms, baselineComparison: baseline, trends: result.trends },
    baselineDeviation: result.baselineDeviation || [], recommendedWorkflow: workflowByRisk[result.riskLevel], triggeredBy
  });
  patient.currentRiskLevel = result.riskLevel;
  await patient.save();
  await addEvent(patientId, 'risk_assessment', `Risk assessed: ${result.riskLevel}`, (result.reasons || []).join('; ') || 'Assessment completed', assessment, 'ai', result.riskLevel === RISK_LEVELS.HIGH ? 'critical' : result.riskLevel === RISK_LEVELS.MEDIUM ? 'warning' : 'info');

  if (result.riskLevel !== RISK_LEVELS.LOW) {
    const targetRole = result.riskLevel === RISK_LEVELS.HIGH ? 'doctor' : 'worker';
    const targetUser = targetRole === 'doctor' ? patient.assignedDoctor : patient.assignedWorker;
    await createAlert({ patient: patientId, type: ALERT_TYPES.RISK_ESCALATION, riskLevel: result.riskLevel, title: `${result.riskLevel} risk requires attention`, message: (result.reasons || []).join('. '), targetRole, targetUser, relatedAssessment: assessment._id });
  }
  return assessment;
};

export const getRiskHistory = (patientId) => RiskAssessment.find({ patient: patientId }).sort({ createdAt: -1 });
