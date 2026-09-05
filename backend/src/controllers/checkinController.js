import PatientCheckIn from '../models/PatientCheckIn.js';
import Patient from '../models/Patient.js';
import { assessRisk } from '../services/riskService.js';
import { addEvent } from '../services/timelineService.js';
import { extractSymptoms } from '../services/nlpService.js';

export const submitCheckIn = async (req, res, next) => {
  try {
    let patientId = req.params.id;

    // Resilient patient resolution: If param is 'me' or not a direct patient ID, find by req.user._id
    let patientDoc = null;
    if (patientId && patientId !== 'me' && patientId !== 'undefined' && patientId !== 'null') {
      try {
        patientDoc = await Patient.findById(patientId);
      } catch (e) {
        patientDoc = null;
      }
    }

    if (!patientDoc && req.user) {
      patientDoc = await Patient.findOne({ user: req.user._id });
    }

    if (!patientDoc) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }

    patientId = patientDoc._id;
    const payload = { ...req.body };

    // Normalize mood enum
    const moodMap = {
      better: 'good',
      good: 'good',
      same: 'okay',
      okay: 'okay',
      worse: 'bad',
      bad: 'bad'
    };
    if (payload.mood) {
      payload.mood = moodMap[payload.mood] || 'okay';
    } else {
      payload.mood = 'okay';
    }

    // Extract symptoms if raw text provided without structured symptoms
    if ((!payload.structuredSymptoms || payload.structuredSymptoms.length === 0) && payload.rawInput?.trim()) {
      try {
        payload.structuredSymptoms = await extractSymptoms(payload.rawInput);
        payload.processedByAI = true;
      } catch (nlpError) {
        console.warn(`Symptom extraction unavailable: ${nlpError.message}`);
      }
    }

    const checkin = await PatientCheckIn.create({ patient: patientId, ...payload });
    
    await Patient.findByIdAndUpdate(patientId, { lastCheckIn: Date.now() });

    const eventDesc = payload.rawInput
      ? payload.rawInput
      : payload.structuredSymptoms?.length > 0
      ? `Symptoms: ${payload.structuredSymptoms.map(s => s.name).join(', ')}`
      : 'Patient submitted daily condition check-in';

    await addEvent(patientId, 'checkin', 'Patient Check-in', eventDesc, checkin, 'patient');
    
    // Trigger AI Risk Assessment (non-blocking so check-in never fails)
    try {
      await assessRisk(patientId, 'patient_checkin');
    } catch (riskErr) {
      console.error('Risk assessment failed (non-blocking):', riskErr.message);
    }
    
    res.status(201).json({ success: true, data: checkin });
  } catch (error) {
    next(error);
  }
};

export const previewSymptoms = async (req, res, next) => {
  try {
    const symptoms = await extractSymptoms(req.body.text);
    res.status(200).json({ success: true, data: { symptoms } });
  } catch (error) {
    next(error);
  }
};

export const getCheckIns = async (req, res, next) => {
  try {
    let patientId = req.params.id;
    if (patientId === 'me' || patientId === 'undefined' || !patientId) {
      const p = await Patient.findOne({ user: req.user._id });
      if (p) patientId = p._id;
    }
    const checkins = await PatientCheckIn.find({ patient: patientId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: checkins });
  } catch (error) {
    next(error);
  }
};
