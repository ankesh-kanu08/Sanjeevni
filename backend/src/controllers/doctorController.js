import Alert from '../models/Alert.js';
import RiskAssessment from '../models/RiskAssessment.js';
import { getAlerts, markAsRead, markAsActioned } from '../services/alertService.js';
import Patient from '../models/Patient.js';
import DoctorDecision from '../models/DoctorDecision.js';
import Outcome from '../models/Outcome.js';
import { addEvent } from '../services/timelineService.js';

export const getDoctorAlerts = async (req, res, next) => {
  try {
    const alerts = await getAlerts(req.user._id, 'doctor');
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

export const getDoctorPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ assignedDoctor: req.user._id })
      .populate('user', 'name email phone')
      .populate('latestAssessment')
      .populate('hospital', 'name');

    const formattedPatients = patients.map((patient) => {
      const p = patient.toObject();
      const level = p.currentRiskLevel || p.latestAssessment?.level || p.latestAssessment?.riskLevel || 'LOW';
      const score = Math.round(p.currentRiskScore || p.latestAssessment?.score || p.latestAssessment?.riskScore || 0);
      const reason = p.latestAssessment?.reasons?.[0] || 
        (level === 'HIGH' ? 'SpO₂ decreased 5 points from personal baseline' : 
         level === 'MEDIUM' ? 'Breathlessness worsening reported' : 
         'Vitals consistent with discharge baseline');

      return {
        ...p,
        name: p.user?.name || 'Patient',
        age: p.demographics?.age,
        gender: p.demographics?.gender,
        location: p.demographics?.location || 'Rural',
        riskLevel: level,
        currentRiskLevel: level,
        riskScore: score,
        currentRiskScore: score,
        riskReason: reason,
        latestAssessment: p.latestAssessment
      };
    });

    // Sort by risk priority: HIGH first, then MEDIUM, then LOW
    const riskPriority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    formattedPatients.sort((a, b) => (riskPriority[b.currentRiskLevel] || 0) - (riskPriority[a.currentRiskLevel] || 0));

    res.status(200).json({ success: true, data: formattedPatients });
  } catch (error) {
    next(error);
  }
};

export const submitDecision = async (req, res, next) => {
  try {
    const { patientId, alertId, decision, notes, clinicalNotes, urgency } = req.body;
    
    const decisionNotes = clinicalNotes || notes || `Decision: ${decision}`;
    const docDecision = await DoctorDecision.create({
      patient: patientId,
      doctor: req.user._id,
      alert: alertId,
      decision,
      notes: decisionNotes,
      clinicalNotes: decisionNotes,
      urgency: urgency || 'routine'
    });

    // Mark specific alert or active alerts for this patient as ACTIONED
    if (alertId) {
      await markAsActioned(alertId, decision);
    } else if (patientId) {
      await Alert.updateMany(
        { patient: patientId, targetRole: 'doctor', isActioned: false },
        { isActioned: true, isRead: true, status: 'ACTIONED', actionTaken: decision }
      );
    }

    if (['refer_hospital', 'emergency', 'refer_phc'].includes(decision)) {
      await Outcome.create({
        patient: patientId,
        type: 'referral',
        details: decisionNotes,
        decidedBy: req.user._id,
        relatedDecision: docDecision._id
      });
    }

    await addEvent(
      patientId,
      'doctor_decision',
      `Clinical Decision: ${decision}`,
      decisionNotes,
      docDecision,
      'doctor',
      urgency === 'urgent' || urgency === 'emergency' ? 'critical' : 'info'
    );

    res.status(201).json({ success: true, data: docDecision });
  } catch (error) {
    next(error);
  }
};

export const markAlertRead = async (req, res, next) => {
  try {
    const alert = await markAsRead(req.params.id);
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

export const markAlertActioned = async (req, res, next) => {
  try {
    const { action } = req.body || {};
    const alert = await markAsActioned(req.params.id, action || 'Clinical action recorded');
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

export const getDoctorStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments({ assignedDoctor: req.user._id });
    const highRisk = await Patient.countDocuments({ assignedDoctor: req.user._id, currentRiskLevel: 'HIGH' });
    const mediumRisk = await Patient.countDocuments({ assignedDoctor: req.user._id, currentRiskLevel: 'MEDIUM' });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayAlerts = await Alert.countDocuments({
      $or: [{ targetUser: req.user._id }, { targetRole: 'doctor' }],
      createdAt: { $gte: todayStart }
    });

    const pendingReviews = await Alert.countDocuments({
      $or: [{ targetUser: req.user._id }, { targetRole: 'doctor' }],
      isActioned: false
    });

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        highRisk,
        mediumRisk,
        pendingReviews,
        todayAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};
