import MonitoringPlan from '../models/MonitoringPlan.js';

export const createMonitoringPlan = async (patientId, params) => {
  return await MonitoringPlan.create({
    patient: patientId,
    ...params,
    isActive: true
  });
};

export const updateMonitoringForRisk = async (patientId, riskLevel) => {
  // Logic to adjust frequency based on riskLevel
  const plan = await MonitoringPlan.findOne({ patient: patientId, isActive: true });
  if (plan) {
    if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
      plan.frequency = 'twice_daily';
      await plan.save();
    }
  }
  return plan;
};
