import api from './api';

const patientService = {
  getMyRecord: async () => {
    const response = await api.get('/patients/me');
    return response.data;
  },
  getPatient: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },
  getTimeline: async (id) => {
    const response = await api.get(`/patients/${id}/timeline`);
    return response.data;
  },
  getVitals: async (id, params) => {
    const response = await api.get(`/patients/${id}/vitals`, { params });
    return response.data;
  },
  getBaseline: async (id) => {
    const response = await api.get(`/patients/${id}/baseline`);
    return response.data;
  },
  getRiskHistory: async (id) => {
    const response = await api.get(`/patients/${id}/risk-history`);
    return response.data;
  },
  getCheckIns: async (id) => {
    const response = await api.get(`/patients/${id}/checkins`);
    return response.data;
  },
  submitCheckIn: async (id, data) => {
    const response = await api.post(`/patients/${id}/checkins`, data);
    return response.data;
  },
  extractSymptoms: async (id, text) => {
    const response = await api.post(`/patients/${id}/checkins/extract-symptoms`, { text });
    return response.data.data?.symptoms || [];
  },
  submitVitals: async (id, data) => {
    const response = await api.post(`/patients/${id}/vitals`, data);
    return response.data;
  },
  getCheckInProtocol: async (id) => {
    const response = await api.get(`/patients/${id || 'me'}/checkin-protocol`);
    return response.data;
  }
};

export default patientService;
