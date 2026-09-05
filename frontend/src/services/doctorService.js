import api from './api';

const unwrap = (response) => response.data?.data;

const doctorService = {
  getAlerts: async (params) => {
    const response = await api.get('/doctor/alerts', { params });
    return (unwrap(response) || []).map((alert) => ({
      ...alert,
      patient: alert.patient ? {
        ...alert.patient,
        name: alert.patient.user?.name || alert.patient.name || 'Patient',
        age: alert.patient.demographics?.age ?? alert.patient.age
      } : null
    }));
  },
  getPatients: async () => {
    const response = await api.get('/doctor/patients');
    return (unwrap(response) || []).map((patient) => ({
      ...patient,
      name: patient.user?.name || patient.name || 'Patient',
      age: patient.demographics?.age ?? patient.age,
      riskLevel: patient.currentRiskLevel || patient.riskLevel || 'LOW'
    }));
  },
  submitDecision: async (data) => {
    const response = await api.post('/doctor/decisions', data);
    return unwrap(response);
  },
  markAlertRead: async (id) => {
    const response = await api.put(`/doctor/alerts/${id}/read`);
    return unwrap(response);
  },
  getStats: async () => {
    const response = await api.get('/doctor/stats');
    return unwrap(response) || {};
  }
};

export default doctorService;
