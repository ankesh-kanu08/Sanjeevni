import TimelineEvent from '../models/TimelineEvent.js';

export const addEvent = async (patientId, eventType, title, description, data, source, severity = 'info') => {
  return await TimelineEvent.create({
    patient: patientId,
    eventType,
    title,
    description,
    data,
    source,
    severity
  });
};

export const getTimeline = async (patientId, options = {}) => {
  const query = { patient: patientId };
  return await TimelineEvent.find(query).sort({ createdAt: -1 });
};
