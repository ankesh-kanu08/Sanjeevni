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
    const patients = await Patient.find({ assignedDoctor: req.user._id }).populate('user', 'name');
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

export const submitDecision = async (req, res, next) => {
  try {
    const { patientId, alertId, decision, notes, clinicalNotes, urgency } = req.body;
    
    const docDecision = await DoctorDecision.create({
      patient: patientId, doctor: req.user._id, alert: alertId, decision, notes, clinicalNotes, urgency
    });

    if (alertId) {
      await markAsActioned(alertId, decision);
    }

    if (['refer_hospital', 'emergency', 'refer_phc'].includes(decision)) {
      await Outcome.create({ patient: patientId, type: 'referral', details: notes, decidedBy: req.user._id, relatedDecision: docDecision._id });
    }

    await addEvent(patientId, 'doctor_decision', `Clinical Decision: ${decision}`, notes, docDecision, 'doctor');

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

export const getDoctorStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments({ assignedDoctor: req.user._id });
    const highRisk = await Patient.countDocuments({ assignedDoctor: req.user._id, currentRiskLevel: 'HIGH' });
    res.status(200).json({ success: true, data: { totalPatients, highRisk } });
  } catch (error) {
    next(error);
  }
};
