import axios from 'axios';
import { getAiServiceUrl } from '../config/aiService.js';

export const extractSymptoms = async (text) => {
  if (!text?.trim()) return [];
  try {
    const response = await axios.post(`${getAiServiceUrl()}/api/extract-symptoms`, { text }, { timeout: 1500 });
    return (response.data.symptoms || []).map((symptom) => ({
      name: symptom.name,
      severity: ['mild', 'moderate', 'severe'].includes(symptom.severity) ? symptom.severity : 'moderate',
      trend: ['stable', 'improving', 'worsening'].includes(symptom.trend) ? symptom.trend : 'stable'
    }));
  } catch (err) {
    console.warn(`[nlpService] AI service unavailable for symptom extraction: ${err.message}`);
    return [];
  }
};

export const fetchCheckInProtocol = async (diagnosis, patientName = 'मरीज', comorbidities = []) => {
  try {
    const response = await axios.post(
      `${getAiServiceUrl()}/api/checkin-protocol`,
      { diagnosis: diagnosis || 'General Medical', patient_name: patientName, comorbidities },
      { timeout: 1500 }
    );
    return response.data;
  } catch (err) {
    console.warn(`[nlpService] AI service unavailable for checkin-protocol: ${err.message}`);
    return null;
  }
};
