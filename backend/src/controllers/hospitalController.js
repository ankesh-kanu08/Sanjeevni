import Hospital from '../models/Hospital.js';
import DischargeRecord from '../models/DischargeRecord.js';
import Patient from '../models/Patient.js';
import { createBaseline } from '../services/baselineService.js';
import { createMonitoringPlan } from '../services/monitoringService.js';
import { addEvent } from '../services/timelineService.js';

/**
 * Create Hospital
 */
export const createHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

export const getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find();
    res.status(200).json({ success: true, data: hospitals });
  } catch (error) {
    next(error);
  }
};

/**
 * Discharge Patient Flow
 */
export const dischargePatient = async (req, res, next) => {
  try {
    const { patientId, hospitalId, diagnosis, vitals, medications, monitoringParams, monitoringFrequency } = req.body;
    
    // 1. Create Discharge Record
    const record = await DischargeRecord.create({
      patient: patientId, hospital: hospitalId, dischargedBy: req.user._id, diagnosis, vitals, medications, monitoringParams, monitoringFrequency
    });

    // 2. Update Patient
    const patient = await Patient.findByIdAndUpdate(patientId, { status: 'monitoring', diagnosis, dischargeDate: Date.now() }, { new: true });

    // 3. Create Baseline
    const baseline = await createBaseline(patientId, record._id);

    // 4. Create Monitoring Plan
    const plan = await createMonitoringPlan(patientId, { frequency: monitoringFrequency, parameters: monitoringParams, createdBy: req.user._id });

    // 5. Add Timeline Event
    await addEvent(patientId, 'discharge', 'Patient Discharged', `Diagnosis: ${diagnosis}`, { recordId: record._id }, 'hospital');

    res.status(200).json({ success: true, data: { record, baseline, plan, patient } });
  } catch (error) {
    next(error);
  }
};

export const getHospitalPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ hospital: req.user.hospital }).populate('user', 'name email');
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

export const getHospitalStats = async (req, res, next) => {
  try {
    const total = await Patient.countDocuments({ hospital: req.user.hospital });
    const active = await Patient.countDocuments({ hospital: req.user.hospital, monitoringActive: true });
    res.status(200).json({ success: true, data: { totalPatients: total, activeMonitoring: active } });
  } catch (error) {
    next(error);
  }
};
