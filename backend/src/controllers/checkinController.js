import PatientCheckIn from '../models/PatientCheckIn.js';
import Patient from '../models/Patient.js';
import { assessRisk } from '../services/riskService.js';
import { addEvent } from '../services/timelineService.js';
import { extractSymptoms } from '../services/nlpService.js';

export const submitCheckIn = async (req, res, next) => {
  try {
    const { id } = req.params; // patient id
    const payload = { ...req.body };
    if ((!payload.structuredSymptoms || payload.structuredSymptoms.length === 0) && payload.rawInput?.trim()) {
      try {
        payload.structuredSymptoms = await extractSymptoms(payload.rawInput);
        payload.processedByAI = true;
      } catch (nlpError) {
        console.warn(`Symptom extraction unavailable: ${nlpError.message}`);
      }
    }
    const checkin = await PatientCheckIn.create({ patient: id, ...payload });
    
    await Patient.findByIdAndUpdate(id, { lastCheckIn: Date.now() });
    await addEvent(id, 'checkin', 'Patient Check-in', 'Patient submitted a health check-in', checkin, 'patient');
    
    // Trigger Risk Assessment (non-blocking - don't fail the check-in if assessment fails)
    try {
      await assessRisk(id);
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
    const checkins = await PatientCheckIn.find({ patient: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: checkins });
  } catch (error) {
    next(error);
  }
};
