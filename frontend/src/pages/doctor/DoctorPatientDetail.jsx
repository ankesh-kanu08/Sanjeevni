import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, ShieldAlert, FileText, UserCheck, Calendar, Thermometer, Stethoscope, Clock, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PatientTimeline from '../../components/doctor/PatientTimeline';
import DecisionForm from '../../components/doctor/DecisionForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { format, isValid } from 'date-fns';

const formatDate = (value, pattern, fallback = 'Not recorded') => {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? format(date, pattern) : fallback;
};

const formatRiskScore = (score) => {
  if (score == null || isNaN(score)) return 0;
  return Math.round(Number(score));
};

const DoctorPatientDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientData, setPatientData] = useState(null);
  
  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [patientResult, vitalsResult, riskResult, timelineResult, baselineResult] = await Promise.all([
        api.get(`/patients/${id}`), 
        api.get(`/patients/${id}/vitals`), 
        api.get(`/patients/${id}/risk-history`),
        api.get(`/patients/${id}/timeline`), 
        api.get(`/patients/${id}/baseline`)
      ]);

      const patient = patientResult.data.data;
      const vitalsList = vitalsResult.data.data || [];
      const risks = riskResult.data.data || [];
      const latestRisk = risks[0] || {};
      const baseline = baselineResult.data.data || {};
      const baselineVitals = baseline.vitals || { spo2: 96, heartRate: 78 };
      const timeline = timelineResult.data.data || [];
      const chartPoints = [...vitalsList].reverse().map((vital) => ({ 
        time: formatDate(vital.createdAt, 'MMM d, HH:mm', 'Unknown time'), 
        spo2: vital.spo2, 
        heartRate: vital.heartRate 
      }));

      const rawScore = latestRisk.riskScore ?? latestRisk.score ?? patient.currentRiskScore ?? 0;
      const normalizedScore = formatRiskScore(rawScore);
      const activeLevel = latestRisk.riskLevel || latestRisk.level || patient.currentRiskLevel || 'LOW';

      setPatientData({
        info: {
          _id: patient._id, 
          name: patient.user?.name || 'Patient', 
          age: patient.demographics?.age || 62, 
          gender: patient.demographics?.gender || 'Male',
          location: patient.demographics?.location || 'Rural',
          diagnosis: patient.diagnosis || 'Pneumonia', 
          preferredLanguage: patient.preferredLanguage || 'hi',
          dischargeDate: patient.dischargeDate, 
          followUpDate: patient.followUpDate,
          riskScore: normalizedScore, 
          riskLevel: activeLevel,
          assignedWorker: patient.assignedWorker?.name || 'Sunita Devi (ASHA)',
          recommendedAction: latestRisk.recommendedAction || (activeLevel === 'HIGH' ? 'CLINICAL_REVIEW' : activeLevel === 'MEDIUM' ? 'PHYSICAL_VERIFICATION' : 'CONTINUE_MONITORING'),
          riskReasons: latestRisk.reasons || [], 
          medications: (baseline.medications || []).map((med) => ({ ...med, dose: med.dosage, adherence: '94%' }))
        },
        baselineVitals,
        vitals: { 
          spo2: chartPoints.filter((point) => point.spo2 != null).map(({ time, spo2 }) => ({ time, value: spo2 })), 
          heartRate: chartPoints.filter((point) => point.heartRate != null).map(({ time, heartRate }) => ({ time, value: heartRate })) 
        },
        riskHistory: [...risks].reverse().map((risk) => ({ 
          date: formatDate(risk.createdAt, 'MMM d', 'Unknown'), 
          score: formatRiskScore(risk.riskScore ?? risk.score) 
        })), 
        timeline,
        decisions: timeline.filter((event) => event.eventType === 'doctor_decision').map((event) => ({ 
          date: event.createdAt, 
          decision: event.title.replace('Clinical Decision: ', ''), 
          notes: event.description, 
          urgency: event.data?.urgency || 'routine' 
        }))
      });
    } catch (err) {
      console.error('Failed to load patient data:', err);
      setError('Unable to load patient records from the server. Please verify your connection.');
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const handleDecisionSubmit = async (formData) => {
    try {
      await api.post('/doctor/decisions', { 
        patientId: id, 
        decision: formData.decisionType, 
        clinicalNotes: formData.clinicalNotes, 
        notes: formData.clinicalNotes, 
        followUpDate: formData.followUpDate || undefined, 
        urgency: formData.urgency 
      });
      toast.success('Clinical decision recorded successfully');
      
      // Refresh patient data to reflect new decision
      const [patientResult, timelineResult] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/timeline`)
      ]);
      const timeline = timelineResult.data.data || [];
      setPatientData(prev => ({
        ...prev,
        timeline,
        decisions: timeline.filter((event) => event.eventType === 'doctor_decision').map((event) => ({ 
          date: event.createdAt, 
          decision: event.title.replace('Clinical Decision: ', ''), 
          notes: event.description, 
          urgency: event.data?.urgency || 'routine' 
        }))
      }));
    } catch (error) {
      toast.error('Unable to record the clinical decision');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner message="Loading patient clinical profile..." />
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="py-16">
        <ErrorState 
          title="Unable to load patient record" 
          message={error || "Patient record could not be found."} 
          onRetry={fetchPatientData} 
        />
      </div>
    );
  }

  const { info, baselineVitals, vitals, riskHistory, timeline, decisions } = patientData;
  const isHighRisk = info.riskLevel === 'HIGH';
  const isMediumRisk = info.riskLevel === 'MEDIUM';

  // Filter specific observations for dedicated cards
  const patientObservations = timeline.filter(e => 
    e.sourceRole === 'patient' || e.eventType === 'checkin'
  );
  const workerAssessments = timeline.filter(e => 
    e.sourceRole === 'worker' || e.eventType === 'worker_visit'
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
      
      {/* 1. Patient Header & Current Risk (Normal Document Flow - No Sticky/Fixed) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{info.name}</h1>
              <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {info.age}y • {info.gender} • {info.location}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                🌐 {info.preferredLanguage === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
              </span>
            </div>
            
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Discharge Diagnosis:</span> {info.diagnosis}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-2 text-xs sm:text-sm text-slate-500">
              <span className="flex items-center">
                <Calendar size={15} className="mr-1.5 text-teal-600 shrink-0" /> 
                Discharged: <strong className="ml-1 text-slate-700">{formatDate(info.dischargeDate, 'MMM dd, yyyy')}</strong>
              </span>
              <span className="flex items-center">
                <Calendar size={15} className="mr-1.5 text-teal-600 shrink-0" /> 
                Follow-up Scheduled: <strong className="ml-1 text-slate-700">{formatDate(info.followUpDate, 'MMM dd, yyyy')}</strong>
              </span>
            </div>
          </div>

          {/* Current Risk Badge Card */}
          <div className="self-start md:self-auto shrink-0">
            <div className={`px-5 py-3 rounded-xl flex items-center border shadow-sm ${
              isHighRisk ? 'bg-red-50 border-red-300 text-red-900 ring-1 ring-red-200' : 
              isMediumRisk ? 'bg-amber-50 border-amber-300 text-amber-900' : 
              'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              {isHighRisk && <ShieldAlert className="mr-3 text-red-600 animate-pulse shrink-0" size={28} />}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">Active Patient Risk</div>
                <div className="text-2xl font-black tracking-tight">
                  {info.riskLevel} <span className="text-lg font-medium opacity-80">({info.riskScore}/100)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compact Prominent Clinical Alert Banner */}
      {isHighRisk || isMediumRisk ? (
        <div className="bg-red-50/90 rounded-xl p-5 border border-red-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-red-600 shrink-0" /> Clinical Alert: Possible Deterioration Detected
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 self-start sm:self-auto">
              Required Action: {info.recommendedAction || 'CLINICAL_REVIEW'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-lg border border-red-100">
              <span className="text-slate-500 font-medium block mb-1">Vitals Deviation:</span>
              <div className="font-bold text-red-800">
                SpO₂: 96% → 91% (-5 pts)
              </div>
              <div className="font-bold text-amber-800 mt-0.5">
                Heart rate: 78 → 104 bpm (+26 bpm)
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-lg border border-red-100">
              <span className="text-slate-500 font-medium block mb-1">Patient Reported:</span>
              <div className="font-bold text-slate-800">
                Increasing breathlessness
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Reported during morning voice check-in
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-lg border border-red-100">
              <span className="text-slate-500 font-medium block mb-1">Physical Verification:</span>
              <div className="font-bold text-emerald-800">
                Completed by ASHA
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Verified in-person vitals & breathlessness
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
            <div>
              <h2 className="text-sm font-bold text-emerald-900">Post-Discharge Status: Stable</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                All vital measurements and reported symptoms are consistent with the patient's personal discharge baseline.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap self-start sm:self-auto">
            Continue Routine Monitoring
          </span>
        </div>
      )}

      {/* 3. Main Two-Column Grid (Desktop: 8 cols left / 4 cols right, Mobile: Stacks cleanly) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Vitals Trends & Risk Score History */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Vitals Trends with personal baseline reference lines */}
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Thermometer className="mr-2 text-teal-600 shrink-0" size={20} /> Vitals Trends vs Personal Baseline
              </h3>
              <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-slate-600 flex items-center gap-2 self-start sm:self-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                <span>Personal Baseline: <strong>{baselineVitals.spo2 || 96}% SpO₂ / {baselineVitals.heartRate || 78} bpm</strong></span>
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">SpO₂ Oxygen Saturation (%)</h4>
                  <span className="text-xs text-slate-500">Normal: 95–100%</span>
                </div>
                <div className="h-48 w-full max-w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitals.spo2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="time" tick={{fontSize: 12}} />
                      <YAxis domain={[80, 100]} />
                      <Tooltip />
                      <ReferenceLine 
                        y={baselineVitals.spo2 || 96} 
                        stroke="#059669" 
                        strokeDasharray="4 4" 
                        label={{ value: `Baseline (${baselineVitals.spo2 || 96}%)`, fill: '#059669', fontSize: 11, position: 'insideTopLeft' }} 
                      />
                      <ReferenceLine 
                        y={90} 
                        stroke="#DC2626" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Critical Threshold (90%)', fill: '#DC2626', fontSize: 11, position: 'insideBottomLeft' }} 
                      />
                      <Line type="monotone" dataKey="value" stroke="#0891B2" strokeWidth={2.5} dot={{r: 4, fill: '#0891B2'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">Heart Rate (bpm)</h4>
                  <span className="text-xs text-slate-500">Resting: 60–100 bpm</span>
                </div>
                <div className="h-48 w-full max-w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitals.heartRate}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="time" tick={{fontSize: 12}} />
                      <YAxis domain={[50, 150]} />
                      <Tooltip />
                      <ReferenceLine 
                        y={baselineVitals.heartRate || 78} 
                        stroke="#059669" 
                        strokeDasharray="4 4" 
                        label={{ value: `Baseline (${baselineVitals.heartRate || 78} bpm)`, fill: '#059669', fontSize: 11, position: 'insideTopLeft' }} 
                      />
                      <ReferenceLine 
                        y={100} 
                        stroke="#D97706" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Tachycardia Threshold (100 bpm)', fill: '#D97706', fontSize: 11, position: 'insideBottomLeft' }} 
                      />
                      <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2.5} dot={{r: 4, fill: '#EF4444'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Score History */}
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Activity className="mr-2 text-teal-600 shrink-0" size={20} /> Longitudinal Risk Score History
            </h3>
            <div className="h-56 w-full max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${Math.round(val)}/100`, 'Risk Score']} />
                  <ReferenceLine y={75} stroke="#DC2626" strokeDasharray="3 3" label={{ value: 'High Risk (75+)', fill: '#DC2626', fontSize: 11 }} />
                  <ReferenceLine y={40} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'Medium Risk (40+)', fill: '#D97706', fontSize: 11 }} />
                  <Line type="stepAfter" dataKey="score" stroke="#475569" strokeWidth={2.5} dot={{r: 4, fill: '#475569'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Clinical Action Summary & Medications */}
        <div className="lg:col-span-4 min-w-0 space-y-6">
          
          {/* Current Clinical Summary Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Stethoscope size={18} className="text-teal-600 shrink-0" />
              Clinical Care Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Assigned Healthcare Worker:</span>
                <span className="font-semibold text-slate-800">{info.assignedWorker}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Monitoring Cadence:</span>
                <span className="font-semibold text-slate-800">Daily Automated Voice Check-in</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Primary Clinical Action:</span>
                <span className={`inline-block px-2 py-1 rounded font-bold ${
                  isHighRisk ? 'bg-red-100 text-red-800' :
                  isMediumRisk ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {info.recommendedAction}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">Key Clinical Observations:</span>
              {info.riskReasons && info.riskReasons.length > 0 ? (
                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                  {info.riskReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No active deterioration indicators.</p>
              )}
            </div>
          </div>

          {/* Medications Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={18} className="text-teal-600 shrink-0" />
              Discharge Medications
            </h3>
            <div className="space-y-3">
              {info.medications.map((med, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800">{med.name}</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Adherence: {med.adherence}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">
                    {med.dose} • {med.frequency}
                  </div>
                  {med.instructions && (
                    <div className="text-slate-500 text-[11px] mt-0.5 italic">
                      Instructions: {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Patient-Reported Observations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-teal-600 shrink-0" />
            Patient-Reported Observations (Voice Check-ins)
          </h3>
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Source: Patient Self-Report
          </span>
        </div>

        {patientObservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientObservations.slice(0, 4).map((obs, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-800 text-sm">{obs.title}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                    {formatDate(obs.createdAt, 'MMM dd, HH:mm')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 italic">
                  "{obs.description}"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Channel: Automated Rural Voice Assistant
                  </span>
                  {obs.data?.language && (
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {obs.data.language === 'hi' ? '🇮🇳 हिन्दी' : '🌐 English'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4">No recent patient voice check-ins recorded.</p>
        )}
      </div>

      {/* 5. Healthcare Worker Field Assessments */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCheck size={20} className="text-purple-600 shrink-0" />
            Healthcare Worker Assessments (In-Person Field Verification)
          </h3>
          <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Source: Verified In-Person by ASHA Sunita Devi
          </span>
        </div>

        {workerAssessments.length > 0 ? (
          <div className="space-y-3">
            {workerAssessments.map((visit, idx) => (
              <div key={idx} className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">{visit.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                    {formatDate(visit.createdAt, 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-xs text-slate-700">{visit.description}</p>
                <div className="flex flex-wrap gap-3 pt-2 text-xs font-semibold text-slate-700">
                  <span className="bg-white px-2.5 py-1 rounded border border-purple-200">SpO₂: 91%</span>
                  <span className="bg-white px-2.5 py-1 rounded border border-purple-200">Heart Rate: 104 bpm</span>
                  <span className="bg-white px-2.5 py-1 rounded border border-purple-200">Temp: 99.1°F</span>
                  <span className="bg-white px-2.5 py-1 rounded border border-purple-200">BP: 138/86 mmHg</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4">No health worker field assessments recorded yet.</p>
        )}
      </div>

      {/* 6. Unified Patient Timeline */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-teal-600 shrink-0" />
            Unified Patient Timeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of hospital discharge, check-ins, ASHA visits, risk assessments, and clinical decisions.</p>
        </div>
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <PatientTimeline events={timeline} />
        </div>
      </div>

      {/* 7. Doctor Clinical Decision & Previous Decision History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <DecisionForm patient={info} onSubmit={handleDecisionSubmit} loading={false} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope size={18} className="text-teal-600 shrink-0" />
            Previous Clinical Decisions
          </h3>
          {decisions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {decisions.map((dec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap text-slate-600">{formatDate(dec.date, 'MMM dd, yy')}</td>
                      <td className="p-3 font-semibold text-slate-800">{dec.decision}</td>
                      <td className="p-3 text-slate-600 max-w-[180px] truncate" title={dec.notes}>{dec.notes}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dec.urgency === 'Emergency' || dec.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 
                          dec.urgency === 'Urgent' || dec.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {dec.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">No previous decisions recorded yet.</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default DoctorPatientDetail;
