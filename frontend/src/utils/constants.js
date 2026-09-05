export const ROLES = {
  PATIENT: 'patient',
  WORKER: 'worker',
  DOCTOR: 'doctor',
  HOSPITAL_ADMIN: 'hospital_admin',
  SYSTEM_ADMIN: 'system_admin'
};

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const DECISION_TYPES = {
  continue_monitoring: 'Continue Monitoring',
  request_assessment: 'Request Assessment',
  teleconsult: 'Teleconsult',
  refer_phc: 'Refer to PHC',
  refer_hospital: 'Refer to Hospital',
  emergency: 'Emergency',
  modify_monitoring: 'Modify Monitoring'
};

export const SYMPTOM_LIST = {
  breathlessness: 'Breathlessness',
  fever: 'Fever',
  pain: 'Pain',
  cough: 'Cough',
  fatigue: 'Fatigue',
  dizziness: 'Dizziness',
  apposite_loss: 'Appetite Loss',
  weakness: 'Weakness',
  swelling: 'Swelling',
  chest_pain: 'Chest Pain'
};

export const VITAL_PARAMS = [
  'spo2',
  'hr',
  'temp',
  'systolic',
  'diastolic'
];