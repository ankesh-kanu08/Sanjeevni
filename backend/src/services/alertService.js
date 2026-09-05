import Alert from '../models/Alert.js';
import { emitAlert } from '../sockets/index.js';

export const createAlert = async (data) => {
  const alert = await Alert.create(data);
  emitAlert(data.targetUser, data.targetRole, alert);
  return alert;
};

export const getAlerts = async (userId, role, filters = {}) => {
  const query = {
    $or: [{ targetUser: userId }, { targetRole: role }],
    ...filters
  };
  return await Alert.find(query)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
    .sort({ createdAt: -1 });
};

export const markAsRead = async (alertId) => {
  return await Alert.findByIdAndUpdate(alertId, { isRead: true }, { new: true });
};

export const markAsActioned = async (alertId, action) => {
  return await Alert.findByIdAndUpdate(alertId, { isActioned: true, actionTaken: action }, { new: true });
};
