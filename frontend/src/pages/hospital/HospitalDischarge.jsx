import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldCheck,
  Check,
  Calendar,
  Heart,
  Activity,
  Pill,
  TestTube,
  UserCheck,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import hospitalService from '../../services/hospitalService';
import DocumentUploadZone from '../../components/hospital/DocumentUploadZone';
import DataConflictModal from '../../components/hospital/DataConflictModal';

const STEPS = [
  'Patient Info',
  'Clinical Details',
  'Vitals',
  'Medications',
  'Lab Values',
  'Monitoring Setup',
  'Review'
];

const COMORBIDITIES = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'COPD',
  'Asthma',
  'Kidney Disease',
  'Cancer',
  'None'
];

const MONITORING_PARAMS = [
  'SpO2',
  'Heart Rate',
  'Temperature',
  'Blood Pressure',
  'Breathlessness',
  'Cough',
  'Fatigue',
  'Pain',
  'Activity',
  'Medication Adherence'
];

export default function HospitalDischarge() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState(new Set([0]));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Central Form State (Never resets across navigation)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    district: '',
    state: '',
    pincode: '',
    locationType: 'Urban',
    diagnosis: '',
    diagnosisDetails: '',
    comorbidities: [],
    vitals: {
      spo2: '',
      heartRate: '',
      temp: '',
      bpSystolic: '',
      bpDiastolic: '',
      respRate: ''
    },
    medications: [],
    labs: [],
    followUpDate: '',
    monitoringFreq: 'Daily',
    monitoredParams: ['SpO2', 'Heart Rate', 'Temperature', 'Blood Pressure'],
    assignedDoctor: '',
    assignedWorker: ''
  });

  // Provenance and verification tracking for AI-extracted fields
  // key: { source: 'uploaded_document' | 'manual', confidence: 0.95, needsVerification: boolean, verified: boolean }
  const [fieldProvenance, setFieldProvenance] = useState({});

  // Active conflicts modal state
  const [pendingConflicts, setPendingConflicts] = useState(null);
  const [pendingExtraction, setPendingExtraction] = useState(null);

  // Validation errors strictly for submission
  const [submissionErrors, setSubmissionErrors] = useState({});

  // Temporary item state for meds & labs
  const [tempMed, setTempMed] = useState({
    name: '',
    dosage: '',
    frequency: 'once daily',
    duration: '',
    instructions: ''
  });
  const [tempLab, setTempLab] = useState({
    name: '',
    value: '',
    unit: '',
    normalRange: ''
  });

  // Step jumping (ALWAYS ALLOWED - Navigation Validation is separated from Submission Validation)
  const jumpToStep = (index) => {
    setCurrentStep(index);
    setVisitedSteps(prev => new Set(prev).add(index));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      jumpToStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      jumpToStep(currentStep - 1);
    }
  };

  // Field change helper with auto-clear of submission errors
  const updateField = (path, value) => {
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [path]: value }));
    }

    // Clear submission error for this field
    if (submissionErrors[path]) {
      setSubmissionErrors(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }

    // If staff edits an AI-extracted field, mark it verified
    if (fieldProvenance[path]) {
      setFieldProvenance(prev => ({
        ...prev,
        [path]: {
          ...prev[path],
          needsVerification: false,
          verified: true
        }
      }));
    }
  };

  const markFieldVerified = (fieldKey) => {
    if (fieldProvenance[fieldKey]) {
      setFieldProvenance(prev => ({
        ...prev,
        [fieldKey]: {
          ...prev[fieldKey],
          needsVerification: false,
          verified: true
        }
      }));
    }
  };

  const verifyAllExtractedFields = () => {
    setFieldProvenance(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = {
          ...prev[key],
          needsVerification: false,
          verified: true
        };
      });
      return updated;
    });
    toast.success('All extracted clinical fields marked as verified.');
  };

  // Step status calculation for informative, non-blocking step indicator
  const getStepStatus = (index) => {
    if (index === currentStep) return 'CURRENT';

    const visited = visitedSteps.has(index);

    switch (index) {
      case 0: // Patient Info
        if (formData.name && formData.phone) return 'COMPLETED';
        return (formData.name || formData.phone || visited) ? 'INCOMPLETE' : 'NOT_STARTED';

      case 1: // Clinical Details
        if (formData.diagnosis) return 'COMPLETED';
        return (formData.comorbidities.length > 0 || visited) ? 'INCOMPLETE' : 'NOT_STARTED';

      case 2: // Vitals
        const v = formData.vitals;
        const vitalsFilled = [v.spo2, v.heartRate, v.temp, v.bpSystolic].filter(Boolean).length;
        if (vitalsFilled >= 3) return 'COMPLETED';
        return (vitalsFilled > 0 || visited) ? 'INCOMPLETE' : 'NOT_STARTED';

      case 3: // Medications
        if (formData.medications.length > 0) return 'COMPLETED';
        return visited ? 'INCOMPLETE' : 'NOT_STARTED';

      case 4: // Lab Values (Optional)
        if (formData.labs.length > 0) return 'COMPLETED';
        return visited ? 'NOT_STARTED' : 'NOT_STARTED';

      case 5: // Monitoring Setup
        if (formData.followUpDate && formData.monitoredParams.length > 0) return 'COMPLETED';
        return (formData.followUpDate || visited) ? 'INCOMPLETE' : 'NOT_STARTED';

      case 6: // Review
        const hasCore = formData.name && formData.phone && formData.diagnosis;
        return hasCore ? 'COMPLETED' : 'INCOMPLETE';

      default:
        return 'NOT_STARTED';
    }
  };

  // Handle Document Extraction Result with Merge & Conflict Strategy
  const handleDocumentExtracted = (extractedData, file) => {
    if (!extractedData) return;

    const conflicts = [];
    const p = extractedData.patientInfo || {};
    const c = extractedData.clinicalDetails || {};
    const v = extractedData.vitals || {};
    const m = extractedData.monitoringSetup || {};

    // Detect conflicts between existing manual non-empty data and extracted data
    if (formData.name && p.fullName && formData.name.toLowerCase() !== p.fullName.toLowerCase()) {
      conflicts.push({ key: 'name', label: 'Patient Name', category: 'Patient Info', currentValue: formData.name, documentValue: p.fullName });
    }
    if (formData.age && p.age && Number(formData.age) !== Number(p.age)) {
      conflicts.push({ key: 'age', label: 'Age', category: 'Patient Info', currentValue: formData.age, documentValue: p.age });
    }
    if (formData.phone && p.phone && formData.phone.replace(/[\s\-]/g, '') !== p.phone.replace(/[\s\-]/g, '')) {
      conflicts.push({ key: 'phone', label: 'Phone', category: 'Patient Info', currentValue: formData.phone, documentValue: p.phone });
    }
    if (formData.diagnosis && c.diagnosis && formData.diagnosis.toLowerCase() !== c.diagnosis.toLowerCase()) {
      conflicts.push({ key: 'diagnosis', label: 'Primary Diagnosis', category: 'Clinical Details', currentValue: formData.diagnosis, documentValue: c.diagnosis });
    }
    if (formData.vitals.spo2 && v.spo2 && Number(formData.vitals.spo2) !== Number(v.spo2)) {
      conflicts.push({ key: 'vitals.spo2', label: 'SpO2 (%)', category: 'Vitals', currentValue: formData.vitals.spo2, documentValue: v.spo2 });
    }
    if (formData.vitals.heartRate && v.heartRate && Number(formData.vitals.heartRate) !== Number(v.heartRate)) {
      conflicts.push({ key: 'vitals.heartRate', label: 'Heart Rate (bpm)', category: 'Vitals', currentValue: formData.vitals.heartRate, documentValue: v.heartRate });
    }
    if (formData.vitals.bpSystolic && v.bpSystolic && Number(formData.vitals.bpSystolic) !== Number(v.bpSystolic)) {
      conflicts.push({ key: 'vitals.bpSystolic', label: 'BP Systolic', category: 'Vitals', currentValue: formData.vitals.bpSystolic, documentValue: v.bpSystolic });
    }

    if (conflicts.length > 0) {
      setPendingConflicts(conflicts);
      setPendingExtraction(extractedData);
    } else {
      applyExtractedData(extractedData, {});
    }
  };

  // Merge extracted data using conflict choices
  const applyExtractedData = (extractedData, resolutions = {}) => {
    const p = extractedData.patientInfo || {};
    const c = extractedData.clinicalDetails || {};
    const v = extractedData.vitals || {};
    const m = extractedData.monitoringSetup || {};
    const docMeds = extractedData.medications || [];
    const docLabs = extractedData.labs || [];

    setFormData(prev => {
      const pick = (key, currentVal, docVal) => {
        if (!docVal) return currentVal;
        if (!currentVal) return docVal;
        if (resolutions[key] === 'document') return docVal;
        return currentVal;
      };

      // Merge comorbidities uniquely
      const mergedComorbidities = Array.from(new Set([
        ...prev.comorbidities,
        ...(c.comorbidities || [])
      ]));

      // Merge medications without duplicating identical names
      const existingMedNames = new Set(prev.medications.map(med => med.name.toLowerCase()));
      const newMeds = docMeds.filter(med => !existingMedNames.has(med.name.toLowerCase()));

      // Merge labs without duplicating identical names
      const existingLabNames = new Set(prev.labs.map(l => l.name.toLowerCase()));
      const newLabs = docLabs.filter(l => !existingLabNames.has(l.name.toLowerCase()));

      // Merge monitored params
      const mergedParams = Array.from(new Set([
        ...prev.monitoredParams,
        ...(m.monitoredParams || [])
      ]));

      return {
        ...prev,
        name: pick('name', prev.name, p.fullName),
        age: pick('age', prev.age, p.age ? String(p.age) : ''),
        gender: pick('gender', prev.gender, p.gender),
        phone: pick('phone', prev.phone, p.phone),
        email: pick('email', prev.email, p.email),
        address: pick('address', prev.address, p.address),
        pincode: pick('pincode', prev.pincode, p.pincode),
        locationType: pick('locationType', prev.locationType, p.locationType || 'Urban'),
        diagnosis: pick('diagnosis', prev.diagnosis, c.diagnosis),
        diagnosisDetails: pick('diagnosisDetails', prev.diagnosisDetails, c.diagnosisDetails),
        comorbidities: mergedComorbidities,
        vitals: {
          spo2: pick('vitals.spo2', prev.vitals.spo2, v.spo2 ? String(v.spo2) : ''),
          heartRate: pick('vitals.heartRate', prev.vitals.heartRate, v.heartRate ? String(v.heartRate) : ''),
          temp: pick('vitals.temp', prev.vitals.temp, v.temp ? String(v.temp) : ''),
          bpSystolic: pick('vitals.bpSystolic', prev.vitals.bpSystolic, v.bpSystolic ? String(v.bpSystolic) : ''),
          bpDiastolic: pick('vitals.bpDiastolic', prev.vitals.bpDiastolic, v.bpDiastolic ? String(v.bpDiastolic) : ''),
          respRate: pick('vitals.respRate', prev.vitals.respRate, v.respRate ? String(v.respRate) : '')
        },
        medications: [...prev.medications, ...newMeds],
        labs: [...prev.labs, ...newLabs],
        followUpDate: pick('followUpDate', prev.followUpDate, m.followUpDate),
        monitoringFreq: pick('monitoringFreq', prev.monitoringFreq, m.monitoringFreq || 'Daily'),
        monitoredParams: mergedParams.length > 0 ? mergedParams : prev.monitoredParams
      };
    });

    // Update field provenance
    if (extractedData.fieldProvenance) {
      setFieldProvenance(prev => ({
        ...prev,
        ...extractedData.fieldProvenance
      }));
    }

    setPendingConflicts(null);
    setPendingExtraction(null);
    toast.success('Discharge form pre-filled with document values. Please review before final submission.');
  };

  // Comorbidities toggle
  const toggleComorbidity = (item) => {
    setFormData(prev => ({
      ...prev,
      comorbidities: prev.comorbidities.includes(item)
        ? prev.comorbidities.filter(c => c !== item)
        : [...prev.comorbidities, item]
    }));
  };

  // Monitored params toggle
  const toggleParam = (item) => {
    setFormData(prev => ({
      ...prev,
      monitoredParams: prev.monitoredParams.includes(item)
        ? prev.monitoredParams.filter(p => p !== item)
        : [...prev.monitoredParams, item]
    }));
  };

  // Medications management
  const addMed = () => {
    if (tempMed.name && tempMed.dosage) {
      setFormData(prev => ({ ...prev, medications: [...prev.medications, tempMed] }));
      setTempMed({ name: '', dosage: '', frequency: 'once daily', duration: '', instructions: '' });
    } else {
      toast.error('Please enter both medication name and dosage.');
    }
  };
  const removeMed = (index) => {
    setFormData(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== index) }));
  };

  // Labs management
  const addLab = () => {
    if (tempLab.name && tempLab.value) {
      setFormData(prev => ({ ...prev, labs: [...prev.labs, tempLab] }));
      setTempLab({ name: '', value: '', unit: '', normalRange: '' });
    } else {
      toast.error('Please enter test name and value.');
    }
  };
  const removeLab = (index) => {
    setFormData(prev => ({ ...prev, labs: prev.labs.filter((_, i) => i !== index) }));
  };

  // Submission Validation strictly separated from navigation
  const validateForSubmission = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = { step: 0, message: 'Patient Name is required.' };
    }
    if (!formData.phone?.trim()) {
      errors.phone = { step: 0, message: 'Patient Phone number is required.' };
    }
    if (!formData.diagnosis?.trim()) {
      errors.diagnosis = { step: 1, message: 'Primary Diagnosis is required.' };
    }
    if (!formData.followUpDate) {
      errors.followUpDate = { step: 5, message: 'Follow-up date is required for post-discharge monitoring.' };
    }
    if (formData.monitoredParams.length === 0) {
      errors.monitoredParams = { step: 5, message: 'Select at least one vital parameter to monitor.' };
    }

    setSubmissionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const isValid = validateForSubmission();
    if (!isValid) {
      toast.error('Please fix the required fields before submitting the discharge.');
      return;
    }

    setSubmitting(true);
    try {
      await hospitalService.discharge(formData);
      toast.success('Patient discharged successfully! Post-discharge monitoring initiated.');
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to discharge patient';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // UI helper for AI badge and verification marker
  const renderFieldProvenanceBadge = (fieldKey) => {
    const prov = fieldProvenance[fieldKey];
    if (!prov) return null;

    if (prov.needsVerification && !prov.verified) {
      return (
        <span
          onClick={(e) => { e.stopPropagation(); markFieldVerified(fieldKey); }}
          title="Extracted by AI • Click to mark verified"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded cursor-pointer transition-colors ml-2"
        >
          <AlertTriangle size={11} className="text-amber-600" />
          ⚠ Needs verification
        </span>
      );
    }

    return (
      <span
        title="Extracted from uploaded medical report"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200/70 px-1.5 py-0.5 rounded ml-2"
      >
        <Sparkles size={10} className="text-teal-600" />
        AI extracted
      </span>
    );
  };

  // Success view
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-sm animate-in zoom-in-50 duration-300">
          <CheckCircle2 size={56} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Discharged Successfully</h1>
        <p className="text-base text-gray-600 max-w-md mb-8">
          Post-discharge remote monitoring has been initiated for <strong className="text-gray-900">{formData.name}</strong>. Baseline vitals and care protocol are now active.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/hospital/patients')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
          >
            View Patient Directory
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Discharge Another Patient
          </button>
        </div>
      </div>
    );
  }

  const unverifiedCount = Object.values(fieldProvenance).filter(p => p.needsVerification && !p.verified).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Patient Discharge</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete the 7-step discharge summary or upload a document to pre-fill available medical records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/hospital/patients')}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel & Return
          </button>
        </div>
      </div>

      {/* Document Upload Zone (Assistive AI extraction) */}
      <DocumentUploadZone
        onExtracted={handleDocumentExtracted}
        isExtracting={isExtracting}
        setIsExtracting={setIsExtracting}
      />

      {/* Conflict Resolution Modal */}
      {pendingConflicts && pendingExtraction && (
        <DataConflictModal
          conflicts={pendingConflicts}
          onResolve={(resolutions) => applyExtractedData(pendingExtraction, resolutions)}
          onCancel={() => {
            setPendingConflicts(null);
            setPendingExtraction(null);
            toast('Document values skipped for conflicting fields. Kept existing manual entries.');
          }}
        />
      )}

      {/* Step Indicator Header (ALWAYS 100% CLICKABLE AT ANY TIME) */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-xs border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px] relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -z-0 transform -translate-y-1/2"></div>
          
          {STEPS.map((stepName, idx) => {
            const status = getStepStatus(idx);
            const isCurrent = idx === currentStep;

            let badgeClasses = 'bg-white border-gray-300 text-gray-500 hover:border-teal-400';
            let labelClasses = 'text-gray-400';

            if (status === 'CURRENT') {
              badgeClasses = 'bg-teal-600 border-teal-600 text-white ring-4 ring-teal-100 shadow-sm';
              labelClasses = 'text-teal-700 font-bold';
            } else if (status === 'COMPLETED') {
              badgeClasses = 'bg-emerald-500 border-emerald-500 text-white';
              labelClasses = 'text-emerald-700 font-medium';
            } else if (status === 'INCOMPLETE') {
              badgeClasses = 'bg-amber-50 border-amber-400 text-amber-700 font-semibold';
              labelClasses = 'text-amber-800 font-medium';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToStep(idx)}
                className="flex flex-col items-center relative z-10 focus:outline-hidden cursor-pointer transition-transform active:scale-95"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${badgeClasses}`}
                >
                  {status === 'COMPLETED' ? (
                    <Check size={16} strokeWidth={3} />
                  ) : status === 'INCOMPLETE' ? (
                    <span>!</span>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={`text-[11px] mt-1.5 transition-colors whitespace-nowrap ${labelClasses}`}>
                  {stepName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submission Errors Alert (Shown if validation fails on review or submit) */}
      {Object.keys(submissionErrors).length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Please complete the required fields to discharge the patient:</p>
              <ul className="mt-1.5 text-xs text-red-700 space-y-1 list-disc pl-4">
                {Object.entries(submissionErrors).map(([key, err]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => jumpToStep(err.step)}
                      className="text-red-900 underline hover:text-red-700 font-medium cursor-pointer"
                    >
                      Step {err.step + 1} ({STEPS[err.step]}): {err.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Active Step Form Container */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xs border border-gray-100 min-h-[440px]">
        
        {/* Step 0: Patient Info */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck size={20} className="text-teal-600" />
                  Step 1: Patient Information
                </h2>
                <p className="text-xs text-gray-500">Demographic and contact details for post-discharge tracking.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                  {renderFieldProvenanceBadge('patientInfo.fullName')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  className={`w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden ${
                    submissionErrors.name ? 'border-red-400 bg-red-50/40' : 'border-gray-300'
                  }`}
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                />
                {submissionErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{submissionErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Age <span className="text-gray-400 font-normal">(Years)</span>
                  {renderFieldProvenanceBadge('patientInfo.age')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 62"
                  min="0"
                  max="125"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.age}
                  onChange={e => updateField('age', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gender
                  {renderFieldProvenanceBadge('patientInfo.gender')}
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                  value={formData.gender}
                  onChange={e => updateField('gender', e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                  {renderFieldProvenanceBadge('patientInfo.phone')}
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  className={`w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden ${
                    submissionErrors.phone ? 'border-red-400 bg-red-50/40' : 'border-gray-300'
                  }`}
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                />
                {submissionErrors.phone && (
                  <p className="text-[11px] text-red-600 mt-1">{submissionErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  {renderFieldProvenanceBadge('patientInfo.email')}
                </label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                  value={formData.bloodGroup}
                  onChange={e => updateField('bloodGroup', e.target.value)}
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Address / Residence
                  {renderFieldProvenanceBadge('patientInfo.address')}
                </label>
                <textarea
                  rows="2"
                  placeholder="Street, area, village or locality"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.address}
                  onChange={e => updateField('address', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Location Type
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      checked={formData.locationType === 'Urban'}
                      onChange={() => updateField('locationType', 'Urban')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Urban
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      checked={formData.locationType === 'Rural'}
                      onChange={() => updateField('locationType', 'Rural')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Rural
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Clinical Details */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity size={20} className="text-teal-600" />
                Step 2: Clinical Details
              </h2>
              <p className="text-xs text-gray-500">Diagnosis and baseline comorbidities at discharge.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Primary Diagnosis <span className="text-red-500">*</span>
                {renderFieldProvenanceBadge('clinicalDetails.diagnosis')}
              </label>
              <input
                type="text"
                placeholder="e.g. COPD Exacerbation, Congestive Heart Failure"
                className={`w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden ${
                  submissionErrors.diagnosis ? 'border-red-400 bg-red-50/40' : 'border-gray-300'
                }`}
                value={formData.diagnosis}
                onChange={e => updateField('diagnosis', e.target.value)}
              />
              {submissionErrors.diagnosis && (
                <p className="text-[11px] text-red-600 mt-1">{submissionErrors.diagnosis.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Clinical Details & Summary
                {renderFieldProvenanceBadge('clinicalDetails.diagnosisDetails')}
              </label>
              <textarea
                rows="3"
                placeholder="Hospital course, interventions, procedures, or specific discharge condition notes"
                className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                value={formData.diagnosisDetails}
                onChange={e => updateField('diagnosisDetails', e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Comorbidities
                  {renderFieldProvenanceBadge('clinicalDetails.comorbidities')}
                </label>
                <span className="text-[11px] text-gray-400">Select all applicable conditions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMORBIDITIES.map(c => {
                  const active = formData.comorbidities.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleComorbidity(c)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        active
                          ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {active ? `✓ ${c}` : c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Vitals */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Heart size={20} className="text-rose-500" />
                Step 3: Discharge Vitals
              </h2>
              <p className="text-xs text-gray-500">Record baseline physiological readings recorded upon discharge.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  SpO2 (%)
                  {renderFieldProvenanceBadge('vitals.spo2')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 96"
                  min="50"
                  max="100"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.vitals.spo2}
                  onChange={e => updateField('vitals.spo2', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Heart Rate (bpm)
                  {renderFieldProvenanceBadge('vitals.heartRate')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 78"
                  min="30"
                  max="240"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.vitals.heartRate}
                  onChange={e => updateField('vitals.heartRate', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Temperature (°F)
                  {renderFieldProvenanceBadge('vitals.temp')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 98.4"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.vitals.temp}
                  onChange={e => updateField('vitals.temp', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Respiratory Rate (/min)
                  {renderFieldProvenanceBadge('vitals.respRate')}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 16"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  value={formData.vitals.respRate}
                  onChange={e => updateField('vitals.respRate', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Blood Pressure (mmHg)
                  {renderFieldProvenanceBadge('vitals.bpSystolic')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Systolic (e.g. 120)"
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      value={formData.vitals.bpSystolic}
                      onChange={e => updateField('vitals.bpSystolic', e.target.value)}
                    />
                  </div>
                  <span className="text-gray-400 font-bold text-lg">/</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Diastolic (e.g. 80)"
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      value={formData.vitals.bpDiastolic}
                      onChange={e => updateField('vitals.bpDiastolic', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Medications */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pill size={20} className="text-teal-600" />
                  Step 4: Medications
                </h2>
                <p className="text-xs text-gray-500">Prescription and discharge drug schedule for patient adherence tracking.</p>
              </div>
              {renderFieldProvenanceBadge('medications')}
            </div>

            {/* Quick add box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                Add Medication
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-gray-600">Medicine Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Azithromycin, Metformin"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempMed.name}
                    onChange={e => setTempMed({ ...tempMed, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-gray-600">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 5ml"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempMed.dosage}
                    onChange={e => setTempMed({ ...tempMed, dosage: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-gray-600">Frequency</label>
                  <select
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempMed.frequency}
                    onChange={e => setTempMed({ ...tempMed, frequency: e.target.value })}
                  >
                    <option value="once daily">Once daily (OD)</option>
                    <option value="twice daily">Twice daily (BD)</option>
                    <option value="thrice daily">Thrice daily (TDS)</option>
                    <option value="four times daily">4 times daily (QDS)</option>
                    <option value="as needed">As needed (PRN/SOS)</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={addMed}
                    className="w-full p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-xs"
                    title="Add Medication"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* List of medications */}
            {formData.medications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed rounded-xl">
                <Pill size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No medications added yet.</p>
                <p className="text-xs">Add prescription drugs manually above or upload a discharge summary.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500">
                  Prescribed Drugs ({formData.medications.length})
                </span>
                {formData.medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3.5 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {med.name} <span className="text-xs text-teal-700 font-medium">({med.dosage})</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {med.frequency} {med.duration && `• ${med.duration}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMed(idx)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Lab Values */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TestTube size={20} className="text-teal-600" />
                  Step 5: Lab Values (Optional)
                </h2>
                <p className="text-xs text-gray-500">Key laboratory findings reported on discharge (e.g. Hb, Creatinine, RBS).</p>
              </div>
              {renderFieldProvenanceBadge('labs')}
            </div>

            {/* Quick add lab */}
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                Add Laboratory Finding
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-gray-600">Test Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Hemoglobin, Platelets, Creatinine"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempLab.name}
                    onChange={e => setTempLab({ ...tempLab, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-gray-600">Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 12.4"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempLab.value}
                    onChange={e => setTempLab({ ...tempLab, value: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-gray-600">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. g/dL, mg/dL"
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white"
                    value={tempLab.unit}
                    onChange={e => setTempLab({ ...tempLab, unit: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={addLab}
                    className="w-full p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-xs"
                    title="Add Lab Value"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* List of labs */}
            {formData.labs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 border border-dashed rounded-xl">
                <TestTube size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No lab values recorded.</p>
                <p className="text-xs">Lab values are optional and will be tracked in patient analytics.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500">
                  Recorded Lab Tests ({formData.labs.length})
                </span>
                {formData.labs.map((lab, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3.5 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {lab.name}: <span className="text-teal-700 font-bold">{lab.value}</span> {lab.unit}
                      </p>
                      {lab.normalRange && (
                        <p className="text-xs text-gray-400">Ref Range: {lab.normalRange}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLab(idx)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Monitoring Setup */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-teal-600" />
                Step 6: Post-Discharge Monitoring Setup
              </h2>
              <p className="text-xs text-gray-500">Configure remote check-in schedule, parameters, and care team assignments.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Follow-up Date <span className="text-red-500">*</span>
                  {renderFieldProvenanceBadge('monitoringSetup.followUpDate')}
                </label>
                <input
                  type="date"
                  className={`w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden ${
                    submissionErrors.followUpDate ? 'border-red-400 bg-red-50/40' : 'border-gray-300'
                  }`}
                  value={formData.followUpDate}
                  onChange={e => updateField('followUpDate', e.target.value)}
                />
                {submissionErrors.followUpDate && (
                  <p className="text-[11px] text-red-600 mt-1">{submissionErrors.followUpDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Monitoring Frequency
                  {renderFieldProvenanceBadge('monitoringSetup.monitoringFreq')}
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="freq"
                      checked={formData.monitoringFreq === 'Daily'}
                      onChange={() => updateField('monitoringFreq', 'Daily')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Daily Check-in
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="freq"
                      checked={formData.monitoringFreq === 'Twice Daily'}
                      onChange={() => updateField('monitoringFreq', 'Twice Daily')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Twice Daily (High Risk)
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Vital Parameters to Monitor <span className="text-red-500">*</span>
                    {renderFieldProvenanceBadge('monitoringSetup.monitoredParams')}
                  </label>
                  <span className="text-[11px] text-gray-400">Parameters asked in daily patient voice check-in</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {MONITORING_PARAMS.map(p => {
                    const active = formData.monitoredParams.includes(p);
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          active
                            ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleParam(p)}
                          className="rounded-sm text-teal-600 focus:ring-teal-500"
                        />
                        {p}
                      </label>
                    );
                  })}
                </div>
                {submissionErrors.monitoredParams && (
                  <p className="text-[11px] text-red-600 mt-1">{submissionErrors.monitoredParams.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign Doctor
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                  value={formData.assignedDoctor}
                  onChange={e => updateField('assignedDoctor', e.target.value)}
                >
                  <option value="">Select Doctor...</option>
                  <option value="dr_smith">Dr. Smith (Cardiology)</option>
                  <option value="dr_patel">Dr. Patel (Pulmonology)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign Health Worker
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                  value={formData.assignedWorker}
                  onChange={e => updateField('assignedWorker', e.target.value)}
                >
                  <option value="">Select Worker...</option>
                  <option value="worker_jane">Jane Doe (ASHA Supervisor)</option>
                  <option value="worker_raj">Rajesh Kumar (Field Worker)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Final Submission */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b pb-3 mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-teal-600" />
                  Step 7: Consolidated Review & Discharge Confirmation
                </h2>
                <p className="text-xs text-gray-500">
                  Carefully review all 6 sections before submitting. AI-extracted values are highlighted below.
                </p>
              </div>
              {unverifiedCount > 0 && (
                <button
                  type="button"
                  onClick={verifyAllExtractedFields}
                  className="px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Check size={14} /> Verify All {unverifiedCount} Fields
                </button>
              )}
            </div>

            {/* Section 1: Patient Details */}
            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  1. Patient Information
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(0)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                >
                  Edit Step 1 <ExternalLink size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block">Name:</span>
                  <strong className="text-gray-900">{formData.name || '—'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Age & Gender:</span>
                  <span className="text-gray-800">{formData.age ? `${formData.age} yrs` : '—'} • {formData.gender}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Phone:</span>
                  <span className="text-gray-800">{formData.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Location:</span>
                  <span className="text-gray-800">{formData.locationType}</span>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-gray-400 block">Address:</span>
                  <span className="text-gray-800">{formData.address || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Clinical Details */}
            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  2. Clinical Details
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(1)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                >
                  Edit Step 2 <ExternalLink size={12} />
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-gray-400 block">Primary Diagnosis:</span>
                  <strong className="text-gray-900">{formData.diagnosis || '—'}</strong>
                </div>
                {formData.diagnosisDetails && (
                  <div>
                    <span className="text-gray-400 block">Details:</span>
                    <span className="text-gray-700">{formData.diagnosisDetails}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block">Comorbidities:</span>
                  <span className="text-gray-800">
                    {formData.comorbidities.length > 0 ? formData.comorbidities.join(', ') : 'None documented'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Vitals */}
            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Baseline Vitals
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                >
                  Edit Step 3 <ExternalLink size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block">SpO2:</span>
                  <span className="text-gray-800 font-medium">{formData.vitals.spo2 ? `${formData.vitals.spo2}%` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Heart Rate:</span>
                  <span className="text-gray-800 font-medium">{formData.vitals.heartRate ? `${formData.vitals.heartRate} bpm` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Blood Pressure:</span>
                  <span className="text-gray-800 font-medium">
                    {formData.vitals.bpSystolic && formData.vitals.bpDiastolic
                      ? `${formData.vitals.bpSystolic}/${formData.vitals.bpDiastolic} mmHg`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Temperature:</span>
                  <span className="text-gray-800 font-medium">{formData.vitals.temp ? `${formData.vitals.temp} °F` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Resp Rate:</span>
                  <span className="text-gray-800 font-medium">{formData.vitals.respRate ? `${formData.vitals.respRate}/min` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 4 & 5: Medications and Labs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    4. Medications ({formData.medications.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => jumpToStep(3)}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                  >
                    Edit
                  </button>
                </div>
                {formData.medications.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No medications documented</p>
                ) : (
                  <ul className="text-xs space-y-1 text-gray-800 list-disc pl-4">
                    {formData.medications.map((m, i) => (
                      <li key={i}>
                        <strong className="text-gray-900">{m.name}</strong> — {m.dosage} ({m.frequency})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    5. Lab Findings ({formData.labs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => jumpToStep(4)}
                    className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                  >
                    Edit
                  </button>
                </div>
                {formData.labs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No lab findings documented</p>
                ) : (
                  <ul className="text-xs space-y-1 text-gray-800 list-disc pl-4">
                    {formData.labs.map((l, i) => (
                      <li key={i}>
                        <strong className="text-gray-900">{l.name}</strong>: {l.value} {l.unit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Section 6: Monitoring Plan */}
            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  6. Monitoring Plan
                </span>
                <button
                  type="button"
                  onClick={() => jumpToStep(5)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                >
                  Edit Step 6 <ExternalLink size={12} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block">Follow-up Date:</span>
                  <strong className="text-gray-900">{formData.followUpDate || '—'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Frequency:</span>
                  <span className="text-gray-800 font-medium">{formData.monitoringFreq}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Parameters Tracked:</span>
                  <span className="text-gray-800">{formData.monitoredParams.join(', ') || 'None selected'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation and Submission Buttons (Free Step Navigation) */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors ${
            currentStep === 0
              ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-xs'
          }`}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2">
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              Next Step <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-7 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              {submitting ? 'Initiating Monitoring...' : 'Confirm & Submit Discharge'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
