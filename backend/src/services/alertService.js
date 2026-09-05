import Alert from '../models/Alert.js';
import RiskAssessment from '../models/RiskAssessment.js';
import { emitAlert, emitAlertUpdate } from '../sockets/index.js';

export const createAlert = async (data) => {
  const alert = await Alert.create(data);
  const populated = await Alert.findById(alert._id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
    .populate('relatedAssessment');

  const alertPayload = populated ? populated.toObject() : alert.toObject();
  emitAlert(data.targetUser, data.targetRole, alertPayload);
  return populated || alert;
};

export const getAlerts = async (userId, role, filters = {}) => {
  const query = {
    $or: [{ targetUser: userId }, { targetRole: role }],
    ...filters
  };
  return await Alert.find(query)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
    .populate('relatedAssessment')
    .sort({ createdAt: -1 });
};

export const markAsRead = async (alertId) => {
  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { isRead: true, status: 'READ' },
    { new: true }
  ).populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
   .populate('relatedAssessment');

  if (alert) {
    emitAlertUpdate(alert.targetUser, alert.targetRole, alert);
  }
  return alert;
};

export const markAsActioned = async (alertId, action) => {
  const alert = await Alert.findByIdAndUpdate(
    alertId,
    { isActioned: true, isRead: true, status: 'ACTIONED', actionTaken: action },
    { new: true }
  ).populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
   .populate('relatedAssessment');

  if (alert) {
    emitAlertUpdate(alert.targetUser, alert.targetRole, alert);
  }
  return alert;
};
