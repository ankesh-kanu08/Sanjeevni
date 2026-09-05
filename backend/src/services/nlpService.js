import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export const extractSymptoms = async (text) => {
  if (!text?.trim()) return [];
  const response = await axios.post(`${AI_SERVICE_URL}/api/extract-symptoms`, { text }, { timeout: 4000 });
  return (response.data.symptoms || []).map((symptom) => ({
    name: symptom.name,
    severity: ['mild', 'moderate', 'severe'].includes(symptom.severity) ? symptom.severity : 'moderate',
    trend: ['stable', 'improving', 'worsening'].includes(symptom.trend) ? symptom.trend : 'stable'
  }));
};
