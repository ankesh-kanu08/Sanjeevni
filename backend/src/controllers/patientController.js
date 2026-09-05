import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { getTimeline } from '../services/timelineService.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import { getRiskHistory } from '../services/riskService.js';
import { getBaseline } from '../services/baselineService.js';

/**
 * Get the patient record for the currently logged-in patient user
 */
export const getMyPatientRecord = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id })
      .populate('user', 'name email phone')
      .populate('hospital', 'name')
      .populate('assignedDoctor', 'name')
      .populate('assignedWorker', 'name');
    if (!patient) return res.status(404).json({ success: false, message: 'No patient record found for this user' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};
/**
 * Create a new patient
 */
export const createPatient = async (req, res, next) => {
  try {
    const user = await User.create({
      name: req.body.name, email: req.body.email, password: 'password123', role: 'patient', hospital: req.body.hospital
    });
    const patient = await Patient.create({ ...req.body, user: user._id });
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all patients based on role
 */
export const getPatients = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'doctor') query.assignedDoctor = req.user._id;
    if (req.user.role === 'worker') query.assignedWorker = req.user._id;
    const patients = await Patient.find(query).populate('user', 'name email phone').populate('assignedDoctor', 'name').populate('assignedWorker', 'name');
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient details
 */
export const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('user', 'name email phone').populate('hospital').populate('assignedDoctor').populate('assignedWorker');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

/**
 * Update patient
 */
export const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const getPatientTimeline = async (req, res, next) => {
  try {
    const timeline = await getTimeline(req.params.id);
    res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
};

export const getPatientVitals = async (req, res, next) => {
  try {
    const vitals = await VitalMeasurement.find({ patient: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
};

export const getPatientRiskHistory = async (req, res, next) => {
  try {
    const history = await getRiskHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const getPatientBaseline = async (req, res, next) => {
  try {
    const baseline = await getBaseline(req.params.id);
    res.status(200).json({ success: true, data: baseline });
  } catch (error) {
    next(error);
  }
};
