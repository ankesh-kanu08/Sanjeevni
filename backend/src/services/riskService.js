import axios from 'axios';
import RiskAssessment from '../models/RiskAssessment.js';
import Patient from '../models/Patient.js';
import Baseline from '../models/Baseline.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import PatientCheckIn from '../models/PatientCheckIn.js';
import HealthWorkerVisit from '../models/HealthWorkerVisit.js';
import Alert from '../models/Alert.js';
import { createAlert } from './alertService.js';
import { addEvent } from './timelineService.js';
import { emitRiskUpdate } from '../sockets/index.js';
import { RISK_LEVELS, ALERT_TYPES } from '../config/constants.js';

const EMPTY_VITALS = { spo2: null, heartRate: null, temperature: null, bloodPressure: null, respiratoryRate: null };

const normaliseSymptoms = (checkin) => {
  if (!checkin) return [];
  const symptoms = checkin.structuredSymptoms || [];
  const results = [];

  for (const symptom of symptoms) {
    const rawName = String(symptom.name || '').toLowerCase().trim();
    const cleanName = rawName.replace(/\s+/g, '_');
    results.push(cleanName);

    // Normalize breathlessness synonyms
    if (/saans|breath|dyspnea|shortness/.test(rawName)) {
      results.push('breathlessness');
      if (symptom.trend === 'worsening' || symptom.severity === 'severe') {
        results.push('worsening_breathlessness', 'increased_breathlessness');
      }
    }

    if (symptom.trend === 'worsening') {
      results.push(`worsening_${cleanName}`, `increased_${cleanName}`);
    }
    if (symptom.severity === 'severe') {
      results.push(`severe_${cleanName}`);
    }
  }

  // Also check raw input if structured symptoms empty
  if (results.length === 0 && checkin.rawInput) {
    const raw = checkin.rawInput.toLowerCase();
    if (/saans|breath|difficulty breathing/.test(raw)) {
      results.push('breathlessness');
      if (/worse|badh|dikkat|takleef|increasing/.test(raw)) {
        results.push('worsening_breathlessness');
      }
    }
    if (/bukhar|fever/.test(raw)) results.push('fever');
    if (/thakaan|fatigue|kamzori|weakness/.test(raw)) results.push('fatigue');
    if (/dard|pain|chest/.test(raw)) results.push('chest_pain');
  }

  return Array.from(new Set(results));
};

const fallbackAssessment = ({ baseline, current, symptoms }) => {
  const reasons = [];
  let score = 0;

  const spo2Drop = baseline.spo2 != null && current.spo2 != null ? baseline.spo2 - current.spo2 : 0;
  const hrRise = baseline.heartRate != null && current.heartRate != null ? current.heartRate - baseline.heartRate : 0;

  if (spo2Drop >= 2) {
    score += Math.min(spo2Drop * 7, 35);
    reasons.push(`SpO₂ decreased ${spo2Drop} points from personal baseline`);
  }
  if (hrRise >= 10) {
    score += Math.min(hrRise, 25);
    reasons.push(`Heart rate increased ${hrRise} bpm from personal baseline`);
  }

  const hasWorseningBreathlessness = symptoms.some((s) => s.includes('breathlessness') && (s.includes('worsening') || s.includes('increased')));
  const hasGeneralWorsening = symptoms.some((s) => s.includes('worsening') || s.includes('increased'));

  if (hasWorseningBreathlessness) {
    score += 35;
    reasons.push('Breathlessness worsening reported');
  } else if (hasGeneralWorsening) {
    score += 20;
    reasons.push('Worsening symptoms reported');
  }

  if (symptoms.some((s) => s.startsWith('severe_') || s === 'chest_pain')) {
    score = Math.max(score, 85);
    reasons.push('Potentially urgent symptom reported');
  }

  if (current.spo2 != null && current.spo2 < 92) {
    score = Math.max(score, 85);
    reasons.push('SpO₂ is below safe clinical threshold (<92%)');
  }
  if (current.heartRate != null && current.heartRate > 120) {
    score = Math.max(score, 85);
    reasons.push('Heart rate is above safe clinical threshold (>120 bpm)');
  }

  // Combined clinical rule: SpO2 drop >= 4 points AND HR rise >= 15 bpm AND worsening breathlessness => HIGH risk (82)
  if (spo2Drop >= 4 && hrRise >= 15 && hasWorseningBreathlessness) {
    score = Math.max(score, 82);
    reasons.push('Recent assessment shows worsening trend');
  } else if (hasWorseningBreathlessness && score < 50) {
    // Worsening breathlessness alone warrants at least MEDIUM risk (62) for physical verification
    score = 62;
  }

  let riskLevel = RISK_LEVELS.LOW;
  if (score >= 70) {
    riskLevel = RISK_LEVELS.HIGH;
    score = Math.max(score, 82);
  } else if (score >= 38) {
    riskLevel = RISK_LEVELS.MEDIUM;
    score = Math.max(score, 55);
  } else {
    riskLevel = RISK_LEVELS.LOW;
    score = Math.min(score, 35);
  }

  return {
    riskScore: Math.round(Math.min(score, 100)),
    riskLevel,
    reasons: reasons.length ? reasons : ['No concerning change from personal baseline'],
    baselineDeviation: [],
    trends: { trend: score >= 70 ? 'worsening' : 'stable' }
  };
};

export const assessRisk = async (patientId, triggeredBy = 'automated') => {
  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error('Patient not found');

  const [baselineRecord, latestVitals, latestCheckin, previousAssessments] = await Promise.all([
    Baseline.findOne({ patient: patientId }),
    VitalMeasurement.findOne({ patient: patientId }).sort({ createdAt: -1 }),
    PatientCheckIn.findOne({ patient: patientId }).sort({ createdAt: -1 }),
    RiskAssessment.find({ patient: patientId }).sort({ createdAt: -1 }).limit(3)
  ]);

  const baseline = { ...EMPTY_VITALS, ...(baselineRecord?.vitals?.toObject?.() || baselineRecord?.vitals || {}) };
  const current = { ...EMPTY_VITALS, ...(latestVitals?.toObject?.() || latestVitals || {}) };
  const symptoms = normaliseSymptoms(latestCheckin);

  const daysSinceDischarge = patient.dischargeDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(patient.dischargeDate).getTime()) / 86400000))
    : 1;

  const payload = {
    patientId: String(patientId),
    baseline,
    current,
    symptoms,
    activityChange: 0,
    daysSinceDischarge,
    previousAssessments: [...previousAssessments].reverse().map((item) => ({
      riskScore: item.riskScore || item.score || 0,
      riskLevel: item.riskLevel || item.level || 'LOW',
      date: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString()
    }))
  };

  let result;
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/api/analyze`, payload, { timeout: 3500 });
    result = response.data;
  } catch (error) {
    console.warn(`AI service unavailable (${error.message}); using canonical clinical safety rules.`);
    result = fallbackAssessment(payload);
  }

  const roundedScore = Math.round(result.riskScore ?? result.score ?? 0);
  const finalLevel = result.riskLevel || result.level || 'LOW';

  const actionMap = {
    LOW: 'CONTINUE_MONITORING',
    MEDIUM: 'PHYSICAL_VERIFICATION',
    HIGH: 'CLINICAL_REVIEW'
  };
  const workflowMap = {
    LOW: 'continue_monitoring',
    MEDIUM: 'field_verification',
    HIGH: 'clinical_review'
  };

  const recommendedAction = actionMap[finalLevel] || 'CONTINUE_MONITORING';
  const recommendedWorkflow = workflowMap[finalLevel] || 'continue_monitoring';

  // 1. CANONICAL LIFECYCLE: Supersede all previous ACTIVE assessments for this patient
  await RiskAssessment.updateMany(
    { patient: patientId, status: 'ACTIVE' },
    { status: 'SUPERSEDED' }
  );

  // 2. Create the single new ACTIVE RiskAssessment
  const assessmentSource = triggeredBy === 'worker_visit' || triggeredBy === 'HEALTH_WORKER'
    ? 'HEALTH_WORKER'
    : triggeredBy === 'patient_checkin' || triggeredBy === 'PATIENT_CHECKIN'
    ? 'PATIENT_CHECKIN'
    : 'SYSTEM';

  const assessment = await RiskAssessment.create({
    patient: patientId,
    assessmentId: `RA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    score: roundedScore,
    riskScore: roundedScore,
    level: finalLevel,
    riskLevel: finalLevel,
    reasons: result.reasons || [],
    inputs: {
      symptoms,
      vitals: current,
      baseline,
      trends: result.trends
    },
    dataUsed: {
      vitals: current,
      symptoms,
      baselineComparison: baseline,
      trends: result.trends
    },
    baselineDeviation: result.baselineDeviation || [],
    recommendedAction,
    recommendedWorkflow,
    source: assessmentSource,
    triggeredBy,
    status: 'ACTIVE'
  });

  // 3. Update Patient record with canonical risk state and latest assessment
  patient.currentRiskLevel = finalLevel;
  patient.currentRiskScore = roundedScore;
  patient.latestAssessment = assessment._id;
  await patient.save();

  // 4. Add structured event to patient's longitudinal timeline
  const timelineSeverity = finalLevel === RISK_LEVELS.HIGH ? 'critical' : finalLevel === RISK_LEVELS.MEDIUM ? 'warning' : 'info';
  await addEvent(
    patientId,
    'risk_assessment',
    `Risk Assessed: ${finalLevel} (${roundedScore}/100)`,
    (result.reasons || []).join(' • ') || 'Clinical evaluation completed',
    assessment,
    'ai',
    timelineSeverity
  );

  // 5. ALERT & TASK WORKFLOW
  if (finalLevel === RISK_LEVELS.HIGH) {
    // Supersede any older active alerts for this patient to prevent duplicate or conflicting alerts
    await Alert.updateMany(
      { patient: patientId, status: 'UNREAD' },
      { status: 'SUPERSEDED' }
    );

    // Create ONE canonical HIGH risk clinical alert for Doctor
    const vitalsDelta = {
      baseline: { spo2: baseline.spo2, heartRate: baseline.heartRate },
      current: { spo2: current.spo2, heartRate: current.heartRate },
      changes: {
        spo2Change: baseline.spo2 != null && current.spo2 != null ? current.spo2 - baseline.spo2 : null,
        hrChange: baseline.heartRate != null && current.heartRate != null ? current.heartRate - baseline.heartRate : null
      }
    };

    const symptomsList = (latestCheckin?.structuredSymptoms || []).map(s => 
      `${s.name}${s.trend ? ` (${s.trend})` : ''}`
    );

    await createAlert({
      patient: patientId,
      relatedAssessment: assessment._id,
      riskAssessmentId: assessment._id,
      type: ALERT_TYPES.RISK_ESCALATION,
      riskLevel: 'HIGH',
      level: 'HIGH',
      title: 'Possible Deterioration Detected',
      message: (result.reasons || []).join('. '),
      reasons: result.reasons || [],
      vitalsComparison: vitalsDelta,
      symptomsReported: symptomsList,
      verificationStatus: triggeredBy === 'worker_visit' ? 'Completed by ASHA' : 'Pending physical verification',
      recommendedAction: 'Clinical review',
      targetRole: 'doctor',
      targetUser: patient.assignedDoctor,
      status: 'UNREAD'
    });
  } else if (finalLevel === RISK_LEVELS.MEDIUM) {
    // If prior unread alerts existed from an older HIGH assessment, mark as SUPERSEDED
    await Alert.updateMany(
      { patient: patientId, status: 'UNREAD', level: 'HIGH' },
      { status: 'SUPERSEDED' }
    );

    // Create pending physical verification task for health worker
    if (patient.assignedWorker) {
      await HealthWorkerVisit.findOneAndUpdate(
        { patient: patientId, status: 'assigned' },
        {
          patient: patientId,
          worker: patient.assignedWorker,
          status: 'assigned',
          priority: 'high',
          assignedReason: (result.reasons || []).join(', ') || 'Physical verification recommended due to reported symptoms',
          requiredMeasurements: ['spo2', 'heartRate', 'temperature', 'bloodPressure']
        },
        { upsert: true, new: true }
      );
    }

    // Create MEDIUM alert for health worker
    await createAlert({
      patient: patientId,
      relatedAssessment: assessment._id,
      riskAssessmentId: assessment._id,
      type: ALERT_TYPES.RISK_ESCALATION,
      riskLevel: 'MEDIUM',
      level: 'MEDIUM',
      title: 'Physical Verification Needed',
      message: (result.reasons || []).join('. '),
      reasons: result.reasons || [],
      vitalsComparison: {
        baseline: { spo2: baseline.spo2, heartRate: baseline.heartRate },
        current: { spo2: current.spo2, heartRate: current.heartRate }
      },
      symptomsReported: (latestCheckin?.structuredSymptoms || []).map(s => s.name),
      verificationStatus: 'Pending ASHA verification',
      recommendedAction: 'Physical verification',
      targetRole: 'worker',
      targetUser: patient.assignedWorker,
      status: 'UNREAD'
    });
  } else {
    // Risk is LOW: Resolve previous unread alerts
    await Alert.updateMany(
      { patient: patientId, status: 'UNREAD' },
      { status: 'RESOLVED', message: 'Risk evaluated as LOW; continuing routine monitoring' }
    );
  }

  emitRiskUpdate(patientId, {
    patientId: String(patientId),
    assessmentId: assessment._id,
    score: assessment.score,
    level: assessment.level,
    reasons: assessment.reasons
  });

  return assessment;
};

export const getRiskHistory = (patientId) =>
  RiskAssessment.find({ patient: patientId }).sort({ createdAt: -1 });

export const getLatestActiveRiskAssessment = (patientId) =>
  RiskAssessment.findOne({ patient: patientId, status: 'ACTIVE' }).sort({ createdAt: -1 });
