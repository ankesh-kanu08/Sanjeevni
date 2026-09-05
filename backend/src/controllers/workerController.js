import HealthWorkerVisit from '../models/HealthWorkerVisit.js';
import Patient from '../models/Patient.js';
import VitalMeasurement from '../models/VitalMeasurement.js';
import { assessRisk } from '../services/riskService.js';
import { addEvent } from '../services/timelineService.js';

export const getWorkerTasks = async (req, res, next) => {
  try {
    const tasks = await HealthWorkerVisit.find({ worker: req.user._id })
      .populate({ path: 'patient', populate: { path: 'user', select: 'name phone' } })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getWorkerPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ assignedWorker: req.user._id })
      .populate('user', 'name phone email')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

export const submitVisit = async (req, res, next) => {
  try {
    const { patientId, vitals, symptoms, observations, notes, offlineCreated, clientTimestamp } = req.body;
    
    // Parse vitals into structured measurement
    let parsedVitals = {};
    if (vitals) {
      parsedVitals = {
        spo2: vitals.spo2 != null && vitals.spo2 !== '' ? Number(vitals.spo2) : undefined,
        heartRate: vitals.heartRate != null && vitals.heartRate !== '' ? Number(vitals.heartRate) : undefined,
        temperature: (vitals.temp != null && vitals.temp !== '') ? Number(vitals.temp) : (vitals.temperature != null && vitals.temperature !== '') ? Number(vitals.temperature) : undefined,
        respiratoryRate: (vitals.respRate != null && vitals.respRate !== '') ? Number(vitals.respRate) : (vitals.respiratoryRate != null && vitals.respiratoryRate !== '') ? Number(vitals.respiratoryRate) : undefined
      };

      if (vitals.bloodPressure && typeof vitals.bloodPressure === 'object') {
        parsedVitals.bloodPressure = vitals.bloodPressure;
      } else if (vitals.bpSystolic && vitals.bpDiastolic) {
        parsedVitals.bloodPressure = {
          systolic: Number(vitals.bpSystolic),
          diastolic: Number(vitals.bpDiastolic)
        };
      } else if (typeof vitals.bp === 'string' && vitals.bp.includes('/')) {
        const [sys, dia] = vitals.bp.split('/');
        parsedVitals.bloodPressure = {
          systolic: Number(sys.trim()),
          diastolic: Number(dia.trim())
        };
      }
    }

    const visit = await HealthWorkerVisit.create({
      patient: patientId,
      worker: req.user._id,
      status: 'completed',
      completedAt: clientTimestamp ? new Date(clientTimestamp) : Date.now(),
      vitals: parsedVitals,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      observations: observations || '',
      workerNotes: notes || '',
      offlineCreated: Boolean(offlineCreated),
      syncedAt: offlineCreated ? Date.now() : undefined
    });

    if (Object.keys(parsedVitals).length > 0) {
      await VitalMeasurement.create({
        patient: patientId,
        recordedBy: req.user._id,
        source: 'worker',
        ...parsedVitals,
        notes: observations || 'Recorded during field verification'
      });
    }

    const eventTitle = offlineCreated
      ? 'Field Visit Synchronized (Offline Captured)'
      : 'Health Worker Field Verification Completed';

    const eventDesc = observations
      ? observations
      : `Vitals recorded: SpO2 ${parsedVitals.spo2 || '—'}%, HR ${parsedVitals.heartRate || '—'} bpm`;

    await addEvent(
      patientId,
      'worker_visit',
      eventTitle,
      eventDesc,
      visit,
      'worker',
      parsedVitals.spo2 && parsedVitals.spo2 < 92 ? 'critical' : 'info'
    );

    // Trigger immediate AI risk re-analysis with new field measurements
    try {
      await assessRisk(patientId, 'worker_visit');
    } catch (riskErr) {
      console.warn('Risk re-assessment after worker visit encountered error:', riskErr.message);
    }

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
    const highRiskPatients = await Patient.countDocuments({ assignedWorker: req.user._id, currentRiskLevel: 'HIGH' });
    const mediumRiskPatients = await Patient.countDocuments({ assignedWorker: req.user._id, currentRiskLevel: 'MEDIUM' });

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        completedVisits,
        highPriority: highRiskPatients,
        mediumPriority: mediumRiskPatients,
        pendingVisits: Math.max(0, highRiskPatients + mediumRiskPatients - completedVisits)
      }
    });
  } catch (error) {
    next(error);
  }
};
