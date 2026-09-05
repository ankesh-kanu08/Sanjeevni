import api from './api';

const unwrap = (response) => response.data?.data;

const adminService = {
  getUsers: async (params) => {
    const response = await api.get('/admin/users', { params });
    return unwrap(response) || [];
  },
  createUser: async (data) => {
    const response = await api.post('/admin/users', data);
    return unwrap(response);
  },
  updateUser: async (id, data) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return unwrap(response);
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return unwrap(response);
  },
  getStats: async () => {
    const response = await api.get('/admin/stats');
    const stats = unwrap(response) || {};
    return { ...stats, totalUsers: stats.totalUsers ?? stats.users ?? 0, totalHospitals: stats.totalHospitals ?? stats.hospitals ?? 0 };
  },
  getHospitals: async () => {
    const response = await api.get('/admin/hospitals');
    return unwrap(response) || [];
  }
};

export default adminService;
