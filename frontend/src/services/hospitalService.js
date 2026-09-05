import api from './api';

const unwrap = (response) => response.data?.data;
const patientView = (patient) => ({
  ...patient,
  id: patient._id || patient.id,
  name: patient.user?.name || patient.name || 'Patient',
  age: patient.demographics?.age ?? patient.age ?? '—',
  gender: patient.demographics?.gender || patient.gender || '—',
  riskLevel: patient.currentRiskLevel || patient.riskLevel || 'LOW',
  followUp: patient.followUpDate || patient.followUp || 'Not scheduled'
});

const hospitalService = {
  discharge: async (data) => {
    const response = await api.post('/hospital/discharge', data);
    return unwrap(response);
  },
  getPatients: async () => {
    const response = await api.get('/hospital/patients');
    return (unwrap(response) || []).map(patientView);
  },
  getStats: async () => {
    const response = await api.get('/hospital/stats');
    const stats = unwrap(response) || {};
    return { ...stats, recentlyDischarged: stats.recentlyDischarged ?? stats.totalPatients ?? 0, currentlyMonitored: stats.currentlyMonitored ?? stats.activeMonitoring ?? 0, highRisk: stats.highRisk ?? 0, compliance: stats.compliance ?? 0 };
  },
  getHospitals: async () => {
    const response = await api.get('/hospital/hospitals');
    return unwrap(response) || [];
  }
};

export default hospitalService;
