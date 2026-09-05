import VitalMeasurement from '../models/VitalMeasurement.js';
import { assessRisk } from '../services/riskService.js';
import { addEvent } from '../services/timelineService.js';

export const recordVitals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const measurement = await VitalMeasurement.create({ patient: id, recordedBy: req.user._id, ...req.body });
    
    await addEvent(id, 'vital_measurement', 'Vitals Recorded', `Source: ${req.body.source}`, measurement, req.body.source);
    await assessRisk(id, req.body.source === 'worker' ? 'worker_visit' : 'automated');
    
    res.status(201).json({ success: true, data: measurement });
  } catch (error) {
    next(error);
  }
};

export const getVitals = async (req, res, next) => {
  try {
    const vitals = await VitalMeasurement.find({ patient: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
};
