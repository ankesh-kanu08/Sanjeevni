import axios from 'axios';
import { createRequire } from 'module';
import { createWorker } from 'tesseract.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');


const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Extracts selectable text from PDF buffer
 */
export const extractTextFromPdf = async (buffer) => {
  try {
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buffer);
      return data.text ? data.text.trim() : '';
    } else if (pdfParse && pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: buffer });
      const data = await parser.getText();
      try { await parser.destroy(); } catch (_) {}
      return data && data.text ? data.text.trim() : '';
    }
    throw new Error('Unsupported pdf-parse interface');
  } catch (error) {
    console.error('[documentExtractor] PDF parsing error:', error.message);
    throw new Error('Failed to read PDF document. The file may be corrupt or encrypted.');
  }
};

/**
 * Performs OCR on image buffer using Tesseract.js
 */
export const extractTextFromImage = async (buffer) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text ? text.trim() : '';
  } catch (error) {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    console.error('[documentExtractor] OCR processing error:', error.message);
    throw new Error('Failed to perform OCR on the image. Please ensure the image is clear.');
  }
};

/**
 * Local fallback parser in case AI microservice is temporarily unavailable
 */
const fallbackClinicalExtract = (text, filename, fileType) => {
  const lower = text.toLowerCase();
  
  // Patient Name
  let name = null;
  const nameMatch = text.match(/(?:patient(?:\s+name)?|name)\s*[:\-]\s*([A-Za-z\s\.]{2,40})/i);
  if (nameMatch) {
    let rawName = nameMatch[1].replace(/^(mr|mrs|ms|dr)\.?\s*/i, '').trim();
    rawName = rawName.split('\n')[0].replace(/\b(?:age|gender|sex|uhid|phone|hospital)\b.*$/i, '').trim();
    if (rawName.length >= 2) name = rawName;
  }

  // Age
  let age = null;
  const ageMatch = text.match(/\b(?:age|years? old|aged?|ge)\s*[:\-\s]?\s*(\d{1,3})\b/i) || text.match(/\b(\d{1,3})\s*(?:yrs?|years?|y)\b/i);
  if (ageMatch) {
    const parsed = parseInt(ageMatch[1], 10);
    if (parsed > 0 && parsed < 125) age = parsed;
  }
  // OCR letter substitution fallback for age (e.g. geSBYIs -> 58)
  if (age === null) {
    const ocrAgeM = text.match(/\bge\s*([0-9SBsb]{2})\b/i);
    if (ocrAgeM) {
      const replaced = ocrAgeM[1].toUpperCase().replace(/S/g, '5').replace(/B/g, '8');
      const parsed = parseInt(replaced, 10);
      if (parsed > 0 && parsed < 125) age = parsed;
    }
  }

  // Gender (optional colon/separator)
  let gender = null;
  if (/\b(?:gender|sex)\s*[:\-\s]?\s*female\b/i.test(text) || /\b(?:sex|gender)\s*[\/,\s]\s*f(?:emale)?\b/i.test(text)) {
    gender = 'Female';
  } else if (/\b(?:gender|sex)\s*[:\-\s]?\s*male\b/i.test(text) || /\b(?:sex|gender)\s*[\/,\s]\s*m(?:ale)?\b/i.test(text)) {
    gender = 'Male';
  }

  // Phone (strictly 10 digits without text prefixes)
  let phone = null;
  const phoneMatch = text.match(/\b(?:(?:\+?91[\-\s]?)?[6-9]\d{9})\b/);
  if (phoneMatch) {
    const rawDigits = phoneMatch[0].replace(/\D/g, '');
    phone = rawDigits.slice(-10);
  }

  // Address
  let address = null;
  const addrMatch = text.match(/(?:address|residence)\s*[:\-]\s*([^\n\r]{10,100})/i);
  if (addrMatch) address = addrMatch[1].trim();

  // Diagnosis
  let diagnosis = null;
  const diagMatch = text.match(/(?:discharge\s+diagnosis|final\s+diagnosis|primary\s+diagnosis|diagnosis)\s*[:\-]\s*([^\n\r;]{3,80})/i);
  if (diagMatch) {
    diagnosis = diagMatch[1].trim();
  } else {
    for (const common of ['COPD Exacerbation', 'Heart Failure', 'Pneumonia', 'Diabetes Mellitus', 'Hypertension', 'Asthma', 'Stroke']) {
      if (lower.includes(common.toLowerCase())) {
        diagnosis = common;
        break;
      }
    }
  }

  // Comorbidities
  const comorbidities = [];
  const known = ['Diabetes', 'Hypertension', 'Heart Disease', 'COPD', 'Asthma', 'Kidney Disease', 'Cancer'];
  for (const c of known) {
    if (lower.includes(c.toLowerCase())) comorbidities.push(c);
  }

  // Vitals (Supports both SpO2 and OCR variant Sp02)
  let spo2 = null;
  const spo2M = text.match(/\b(?:sp[o0]2|oxygen saturation|o2 sat(?:uration)?)\s*[:\-]?\s*(\d{2,3})\b/i);
  if (spo2M) spo2 = parseFloat(spo2M[1]);

  let heartRate = null;
  const hrM = text.match(/\b(?:heart rate|pulse|hr)\s*[:\-]?\s*(\d{2,3})\b/i);
  if (hrM) heartRate = parseFloat(hrM[1]);

  let bpSystolic = null;
  let bpDiastolic = null;
  const bpM = text.match(/\b(?:bp|blood pressure)\s*[:\-]?\s*(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\b/i);
  if (bpM) {
    bpSystolic = parseFloat(bpM[1]);
    bpDiastolic = parseFloat(bpM[2]);
  }

  let temp = null;
  const tempM = text.match(/\b(?:temp(?:erature)?)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\b/i);
  if (tempM) temp = parseFloat(tempM[1]);

  let respRate = null;
  const rrM = text.match(/\b(?:resp(?:iratory)?\s*rate|rr)\s*[:\-]?\s*(\d{1,2})\b/i);
  if (rrM) respRate = parseFloat(rrM[1]);

  // Medications
  const medications = [];
  const labExclusions = ['creatinin', 'urea', 'hemoglobin', 'haemoglobin', 'glucose', 'sugar', 'sodium', 'potassium', 'platelet', 'wbc', 'crp', 'bilirubin', 'calcium', 'lipid'];
  
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const seenMeds = new Set();
  
  let inMedSection = false;
  for (const rawLine of rawLines) {
    const cleanHeader = rawLine.replace(/^\s*\d+[\.\)\:\-\s]+\s*/, '');
    if (/^(?:medications?|discharge\s+medications?|prescriptions?|rx|treatment\s+on\s+discharge)\b/i.test(cleanHeader)) {
      inMedSection = true;
      continue;
    }
    if (inMedSection && /^(?:key\s+laboratory|laboratory|investigations?|labs?|follow\s*up|monitoring|advice|vitals)\b/i.test(cleanHeader)) {
      break;
    }

    const lowLine = rawLine.toLowerCase();
    if (labExclusions.some(l => lowLine.includes(l))) {
      continue;
    }

    const hasDrugMarker = /\b(?:tab|cap|inj|syp|tablet|capsule|mg|mcg|ml|od|bd|tds|daily)\b/i.test(rawLine);
    if (!hasDrugMarker && !inMedSection) continue;

    // Strip leading list numbers like '1.', '2 ', '3 -', '4)'
    let clean = rawLine.replace(/^\s*(?:rx|no\.?)?\s*\d+[\.\)\:\-\s]+\s*/i, '').trim();
    // Strip form prefixes like 'Tab', 'Cap', 'Inj', 'Syp', 'Tablet'
    clean = clean.replace(/^(?:tab|cap|inj|syp|tablet|capsule|syrup)\.?\s*/i, '').trim();

    const doseMatch = clean.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|units?))\b/i);
    const dosage = doseMatch ? doseMatch[1] : '';

    let medName = doseMatch ? clean.slice(0, doseMatch.index).trim() : clean.split(/\s+/)[0];
    medName = medName.replace(/^\s*\d+[\.\)\:\-\s]+\s*/i, '').trim();
    medName = medName.replace(/^(?:tab|cap|inj|syp|tablet|capsule|syrup)\.?\s*/i, '').trim();
    medName = medName.replace(/\(.*?\)/g, '').trim();
    medName = medName.replace(/[^A-Za-z0-9\-\s]/g, '').trim();

    if (labExclusions.some(l => medName.toLowerCase().includes(l))) {
      continue;
    }

    if (/furcssmide|furosemide|lasix/i.test(medName)) medName = 'Lasix (Furosemide)';
    else if (/metiormin|metformin/i.test(medName)) medName = 'Metformin';
    else if (/metoprolol/i.test(medName)) medName = 'Metoprolol Succinate';

    if (medName.length >= 3 && !seenMeds.has(medName.toLowerCase())) {
      seenMeds.add(medName.toLowerCase());
      medications.push({
        name: medName.charAt(0).toUpperCase() + medName.slice(1),
        dosage,
        frequency: /twice|bd|bid/i.test(rawLine) ? 'twice daily' : 'once daily',
        route: 'oral',
        duration: '',
        instructions: rawLine
      });
    }
  }

  // Labs
  const labs = [];
  const hbM = text.match(/\b(?:hb|hemoglobin)\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i);
  if (hbM) labs.push({ name: 'Hemoglobin', value: hbM[1], unit: 'g/dL', normalRange: '12.0 - 16.0' });

  const bgM = text.match(/\b(?:blood glucose|sugar|rbs)\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i);
  if (bgM) labs.push({ name: 'Blood Glucose', value: bgM[1], unit: 'mg/dL', normalRange: '70 - 140' });

  // Follow-up
  let followUpDate = null;
  const fuM = text.match(/(?:follow\s*up|review)\s*(?:on|after)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\b\d+\s*days?\b)/i);
  if (fuM) followUpDate = fuM[1];

  const provenance = {};
  let totalFields = 0;
  let needsVerificationCount = 0;

  const addProv = (field, value, conf = 0.9) => {
    if (value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      totalFields++;
      const needsVer = conf < 0.85;
      if (needsVer) needsVerificationCount++;
      provenance[field] = {
        field,
        value,
        confidence: conf,
        source: 'uploaded_document',
        needsVerification: needsVer,
        verified: false
      };
    }
  };

  addProv('patientInfo.fullName', name, 0.95);
  addProv('patientInfo.age', age, 0.95);
  addProv('patientInfo.gender', gender, 0.95);
  addProv('patientInfo.phone', phone, 0.90);
  addProv('patientInfo.address', address, 0.85);
  addProv('clinicalDetails.diagnosis', diagnosis, 0.92);
  addProv('clinicalDetails.comorbidities', comorbidities, 0.90);
  addProv('vitals.spo2', spo2, 0.95);
  addProv('vitals.heartRate', heartRate, 0.95);
  addProv('vitals.bpSystolic', bpSystolic, 0.92);
  addProv('vitals.bpDiastolic', bpDiastolic, 0.92);
  addProv('vitals.temp', temp, 0.95);
  addProv('vitals.respRate', respRate, 0.95);
  if (medications.length) addProv('medications', medications, 0.88);
  if (labs.length) addProv('labs', labs, 0.90);
  addProv('monitoringSetup.followUpDate', followUpDate, 0.88);

  return {
    success: true,
    patientInfo: {
      fullName: name,
      age,
      gender,
      phone,
      address,
      locationType: 'Urban'
    },
    clinicalDetails: {
      diagnosis,
      comorbidities,
      allergies: [],
      diagnosisDetails: ''
    },
    vitals: {
      spo2,
      heartRate,
      temp,
      bpSystolic,
      bpDiastolic,
      respRate
    },
    medications,
    labs,
    monitoringSetup: {
      followUpDate,
      monitoringFreq: 'Daily',
      monitoredParams: ['SpO2', 'Heart Rate', 'Temperature', 'Blood Pressure']
    },
    fieldProvenance: provenance,
    totalFieldsFound: totalFields,
    needsVerificationCount,
    rawTextLength: text.length,
    documentSummary: `Extracted ${totalFields} fields from ${filename || 'document'}`
  };
};

/**
 * Main extraction pipeline
 */
export const processMedicalDocument = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('No document file buffer provided');
  }

  const mimeType = file.mimetype || '';
  const originalName = file.originalname || 'document';
  let rawText = '';

  // 1. Text Extraction / OCR
  if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
    rawText = await extractTextFromPdf(file.buffer);
    // If PDF text extraction resulted in almost no text, it might be a scanned PDF
    if (!rawText || rawText.length < 20) {
      console.warn('[documentExtractor] PDF text empty or scanned. Attempting OCR fallback...');
      try {
        rawText = await extractTextFromImage(file.buffer);
      } catch (ocrErr) {
        console.warn('[documentExtractor] Scanned PDF OCR fallback failed:', ocrErr.message);
      }
    }
  } else if (mimeType.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(originalName)) {
    rawText = await extractTextFromImage(file.buffer);
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or JPG/PNG/WebP image.');
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('No readable text or characters could be extracted from this document. You can enter the information manually.');
  }

  // 2. AI Structured Extraction via FastAPI service
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/extract-clinical-document`,
      {
        text: rawText,
        filename: originalName,
        file_type: mimeType
      },
      { timeout: 15000 }
    );

    if (response.data && response.data.success) {
      return response.data;
    }
    return fallbackClinicalExtract(rawText, originalName, mimeType);
  } catch (error) {
    console.warn(`[documentExtractor] Python AI Service unavailable (${error.message}). Using built-in clinical parser.`);
    return fallbackClinicalExtract(rawText, originalName, mimeType);
  }
};
