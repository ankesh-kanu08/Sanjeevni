import api from './api';

const unwrap = (response) => response.data?.data;
const taskView = (task) => ({
  ...task, id: task._id || task.id, patientId: task.patient?._id || task.patientId || task.patient,
  patientName: task.patient?.user?.name || task.patientName || 'Patient',
  age: task.patient?.demographics?.age ?? task.age ?? '—', diagnosis: task.patient?.diagnosis || task.diagnosis || 'Not recorded',
  locationType: task.patient?.demographics?.location || task.locationType || '—', riskLevel: task.patient?.currentRiskLevel || task.riskLevel || 'LOW',
  riskReason: task.assignedReason || task.riskReason || 'Assessment requested', requiredAction: (task.requiredMeasurements || []).join(', ') || 'Complete assessment'
});

const workerService = {
  getTasks: async () => {
    const response = await api.get('/worker/tasks');
    return (unwrap(response) || []).map(taskView);
  },
  getPatients: async () => {
    const response = await api.get('/worker/patients');
    return unwrap(response) || [];
  },
  submitVisit: async (data) => {
    const response = await api.post('/worker/visits', data);
    return unwrap(response);
  },
  updateVisitStatus: async (id, data) => {
    const response = await api.put(`/worker/visits/${id}`, data);
    return unwrap(response);
  },
  getStats: async () => {
    const response = await api.get('/worker/stats');
    const stats = unwrap(response) || {};
    return { ...stats, assigned: stats.assigned ?? stats.totalPatients ?? 0, todayVisits: stats.todayVisits ?? 0, highPriority: stats.highPriority ?? 0, completed: stats.completed ?? stats.completedVisits ?? 0 };
  }
};

export default workerService;
