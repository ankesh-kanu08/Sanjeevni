import Hospital from '../models/Hospital.js';
import DischargeRecord from '../models/DischargeRecord.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { createBaseline } from '../services/baselineService.js';
import { createMonitoringPlan } from '../services/monitoringService.js';
import { addEvent } from '../services/timelineService.js';
import { processMedicalDocument } from '../services/documentExtractorService.js';

/**
 * Extract Clinical Document (PDF / Images with OCR & AI parsing)
 */
export const extractDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document file provided for extraction' });
    }

    const maxMb = parseInt(process.env.MAX_DOCUMENT_SIZE_MB, 10) || 10;
    if (req.file.size > maxMb * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `File is too large. Please upload a document smaller than ${maxMb} MB.`
      });
    }

    const extractionResult = await processMedicalDocument(req.file);

    res.status(200).json({
      success: true,
      message: 'Medical document extracted successfully',
      data: extractionResult,
      fileMetadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        extractedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[hospitalController] Document extraction error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to extract information from this document. You can enter the information manually.'
    });
  }
};

/**
 * Create Hospital
 */
export const createHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

export const getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find();
    res.status(200).json({ success: true, data: hospitals });
  } catch (error) {
    next(error);
  }
};

/**
 * Discharge Patient Flow
 */
export const dischargePatient = async (req, res, next) => {
  try {
    let {
      patientId,
      hospitalId,
      name,
      age,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      district,
      state,
      pincode,
      locationType,
      diagnosis,
      diagnosisDetails,
      comorbidities,
      vitals,
      medications,
      labs,
      followUpDate,
      monitoringParams,
      monitoringFrequency,
      monitoringFreq,
      assignedDoctor,
      assignedWorker,
      documents
    } = req.body;

    const hospitalRef = hospitalId || req.user.hospital;
    const resolvedFreq = monitoringFrequency || monitoringFreq || 'Daily';
    const resolvedParams = monitoringParams || [];

    // Parse structured vitals if numeric
    const cleanVitals = {
      spo2: vitals?.spo2 ? Number(vitals.spo2) : undefined,
      heartRate: vitals?.heartRate ? Number(vitals.heartRate) : undefined,
      temperature: vitals?.temp ? Number(vitals.temp) : undefined,
      bloodPressure: {
        systolic: vitals?.bpSystolic ? Number(vitals.bpSystolic) : undefined,
        diastolic: vitals?.bpDiastolic ? Number(vitals.bpDiastolic) : undefined
      },
      respiratoryRate: vitals?.respRate ? Number(vitals.respRate) : undefined
    };

    let targetPatient = null;

    // 1. Resolve or Create Patient
    if (patientId) {
      targetPatient = await Patient.findById(patientId);
    }

    if (!targetPatient && (name || phone)) {
      // Find or create User
      const safeEmail = email && email.includes('@')
        ? email.toLowerCase()
        : `patient_${(phone || Date.now()).toString().replace(/[^0-9]/g, '').slice(-10)}@carewatch.local`;

      let user = await User.findOne({ email: safeEmail });
      if (!user && phone) {
        user = await User.findOne({ phone });
      }

      if (!user) {
        user = await User.create({
          name: name || 'Patient',
          email: safeEmail,
          phone: phone || '',
          password: 'password123',
          role: 'patient',
          hospital: hospitalRef
        });
      }

      // Check if patient profile already exists
      targetPatient = await Patient.findOne({ user: user._id });
      if (!targetPatient) {
        targetPatient = await Patient.create({
          user: user._id,
          hospital: hospitalRef,
          demographics: {
            age: age ? Number(age) : undefined,
            gender: gender || 'Male',
            bloodGroup: bloodGroup || 'O+',
            address: address || '',
            district: district || '',
            state: state || '',
            pincode: pincode || '',
            location: locationType ? locationType.toLowerCase() : 'urban'
          },
          diagnosis: diagnosis || 'Post-Discharge Recovery',
          comorbidities: Array.isArray(comorbidities) ? comorbidities : [],
          status: 'monitoring',
          monitoringActive: true,
          assignedDoctor: assignedDoctor && assignedDoctor.length === 24 ? assignedDoctor : undefined,
          assignedWorker: assignedWorker && assignedWorker.length === 24 ? assignedWorker : undefined
        });
      }
    }

    if (!targetPatient) {
      return res.status(400).json({
        success: false,
        message: 'Unable to identify or create a patient profile. Please ensure patient name is provided.'
      });
    }

    // 2. Create Discharge Record
    const record = await DischargeRecord.create({
      patient: targetPatient._id,
      hospital: hospitalRef,
      dischargedBy: req.user._id,
      diagnosis: diagnosis || targetPatient.diagnosis,
      diagnosisDetails: diagnosisDetails || '',
      vitals: cleanVitals,
      labs: Array.isArray(labs) ? labs : [],
      medications: Array.isArray(medications) ? medications : [],
      documents: Array.isArray(documents) ? documents : [],
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      monitoringParams: resolvedParams,
      monitoringFrequency: resolvedFreq,
      notes: diagnosisDetails || ''
    });

    // 3. Update Patient record with discharge link
    targetPatient.status = 'monitoring';
    targetPatient.monitoringActive = true;
    if (diagnosis) targetPatient.diagnosis = diagnosis;
    targetPatient.dischargeDate = new Date();
    if (followUpDate) targetPatient.followUpDate = new Date(followUpDate);
    targetPatient.dischargeRecord = record._id;
    if (Array.isArray(comorbidities) && comorbidities.length > 0) {
      targetPatient.comorbidities = comorbidities;
    }
    await targetPatient.save();

    // 4. Create Baseline
    let baseline = null;
    try {
      baseline = await createBaseline(targetPatient._id, record._id);
    } catch (bErr) {
      console.warn('[hospitalController] Baseline creation note:', bErr.message);
    }

    // 5. Create Monitoring Plan
    let plan = null;
    try {
      plan = await createMonitoringPlan(targetPatient._id, {
        frequency: resolvedFreq,
        parameters: resolvedParams,
        createdBy: req.user._id
      });
    } catch (mErr) {
      console.warn('[hospitalController] Monitoring plan creation note:', mErr.message);
    }

    // 6. Add Timeline Event
    try {
      await addEvent(
        targetPatient._id,
        'discharge',
        'Patient Discharged',
        `Discharged with diagnosis: ${diagnosis || 'General Post-Op'}. Monitoring initiated (${resolvedFreq}).`,
        { recordId: record._id },
        'hospital'
      );
    } catch (tErr) {
      console.warn('[hospitalController] Timeline event note:', tErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Patient discharged and monitoring plan initiated successfully',
      data: { record, baseline, plan, patient: targetPatient }
    });
  } catch (error) {
    next(error);
  }
};

export const getHospitalPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({ hospital: req.user.hospital }).populate('user', 'name email phone');
    res.status(200).json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

export const getHospitalStats = async (req, res, next) => {
  try {
    const total = await Patient.countDocuments({ hospital: req.user.hospital });
    const active = await Patient.countDocuments({ hospital: req.user.hospital, monitoringActive: true });
    res.status(200).json({ success: true, data: { totalPatients: total, activeMonitoring: active } });
  } catch (error) {
    next(error);
  }
};
