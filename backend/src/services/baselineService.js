import Baseline from '../models/Baseline.js';
import DischargeRecord from '../models/DischargeRecord.js';

export const createBaseline = async (patientId, dischargeRecordId) => {
  const record = await DischargeRecord.findById(dischargeRecordId);
  if (!record) throw new Error('Discharge record not found');
  
  const baseline = await Baseline.create({
    patient: patientId,
    dischargeRecord: dischargeRecordId,
    vitals: record.vitals,
    clinicalParams: { diagnosis: record.diagnosis },
    medications: record.medications,
    monitoringSchedule: { frequency: record.monitoringFrequency, parameters: record.monitoringParams }
  });
  
  return baseline;
};

export const getBaseline = async (patientId) => {
  return await Baseline.findOne({ patient: patientId }).populate('dischargeRecord');
};
