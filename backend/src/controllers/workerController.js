import HealthWorkerVisit from '../models/HealthWorkerVisit.js';
import Patient from '../models/Patient.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import { assessRisk } from '../services/riskService.js';
import { addEvent } from '../services/timelineService.js';

export const getWorkerTasks = async (req, res, next) => {
  try {
    const tasks = await HealthWorkerVisit.find({ worker: req.user._id }).populate('patient');
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getWorkerPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ assignedWorker: req.user._id }).populate('user', 'name');
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

export const submitVisit = async (req, res, next) => {
  try {
    const { patientId, vitals, symptoms, observations } = req.body;
    
    const visit = await HealthWorkerVisit.create({
      patient: patientId, worker: req.user._id, status: 'completed', completedAt: Date.now(), vitals, symptoms, observations
    });

    if (vitals) {
      await VitalMeasurement.create({ patient: patientId, recordedBy: req.user._id, source: 'worker', ...vitals });
    }

    await addEvent(patientId, 'worker_visit', 'Health Worker Visit Completed', observations, visit, 'worker');
    await assessRisk(patientId);

    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

export const updateVisitStatus = async (req, res, next) => {
  try {
    const visit = await HealthWorkerVisit.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

export const getWorkerStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments({ assignedWorker: req.user._id });
    const completedVisits = await HealthWorkerVisit.countDocuments({ worker: req.user._id, status: 'completed' });
    res.status(200).json({ success: true, data: { totalPatients, completedVisits } });
  } catch (error) {
    next(error);
  }
};
