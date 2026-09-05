import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, ShieldAlert, FileText, UserCheck, Calendar, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PatientTimeline from '../../components/doctor/PatientTimeline';
import DecisionForm from '../../components/doctor/DecisionForm';
import { format, isValid } from 'date-fns';

const formatDate = (value, pattern, fallback = 'Not recorded') => {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? format(date, pattern) : fallback;
};

const DoctorPatientDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);
  
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const [patientResult, vitalsResult, riskResult, timelineResult, baselineResult] = await Promise.all([
          api.get(`/patients/${id}`), api.get(`/patients/${id}/vitals`), api.get(`/patients/${id}/risk-history`),
          api.get(`/patients/${id}/timeline`), api.get(`/patients/${id}/baseline`)
        ]);
        const patient = patientResult.data.data;
        const vitalsList = vitalsResult.data.data || [];
        const risks = riskResult.data.data || [];
        const latestRisk = risks[0] || {};
        const baseline = baselineResult.data.data || {};
        const timeline = timelineResult.data.data || [];
        const chartPoints = [...vitalsList].reverse().map((vital) => ({ time: formatDate(vital.createdAt, 'MMM d, HH:mm', 'Unknown time'), spo2: vital.spo2, heartRate: vital.heartRate }));
        setPatientData({
          info: {
            _id: patient._id, name: patient.user?.name || 'Patient', age: patient.demographics?.age, gender: patient.demographics?.gender,
            diagnosis: patient.diagnosis || 'Not recorded', dischargeDate: patient.dischargeDate, followUpDate: patient.followUpDate,
            riskScore: latestRisk.riskScore ?? 0, riskLevel: latestRisk.riskLevel || patient.currentRiskLevel || 'LOW',
            riskReasons: latestRisk.reasons || [], medications: (baseline.medications || []).map((med) => ({ ...med, dose: med.dosage, adherence: '—' }))
          },
          vitals: { spo2: chartPoints.filter((point) => point.spo2 != null).map(({ time, spo2 }) => ({ time, value: spo2 })), heartRate: chartPoints.filter((point) => point.heartRate != null).map(({ time, heartRate }) => ({ time, value: heartRate })) },
          riskHistory: [...risks].reverse().map((risk) => ({ date: formatDate(risk.createdAt, 'MMM d', 'Unknown'), score: risk.riskScore })), timeline,
          decisions: timeline.filter((event) => event.eventType === 'doctor_decision').map((event) => ({ date: event.createdAt, decision: event.title.replace('Clinical Decision: ', ''), notes: event.description, urgency: event.data?.urgency || 'routine' }))
        });
          setLoading(false);
      } catch (error) {
        toast.error('Failed to load patient data');
        setLoading(false);
      }
    };
    
    fetchPatientData();
  }, [id]);

  const handleDecisionSubmit = async (formData) => {
    try {
      await api.post('/doctor/decisions', { patientId: id, decision: formData.decisionType, clinicalNotes: formData.clinicalNotes, notes: formData.clinicalNotes, followUpDate: formData.followUpDate || undefined, urgency: formData.urgency });
      toast.success('Clinical decision recorded successfully');
    } catch (error) {
      toast.error('Unable to record the clinical decision');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Activity className="animate-spin text-teal-600" size={32} /></div>;
  if (!patientData) return <div className="text-center py-10">Patient not found</div>;

  const { info, vitals, riskHistory, timeline, decisions } = patientData;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Sticky Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{info.name} <span className="text-lg font-normal text-slate-500">({info.age}y, {info.gender})</span></h1>
            <p className="text-slate-600 mt-1"><span className="font-medium">Diagnosis:</span> {info.diagnosis}</p>
            <div className="flex space-x-6 mt-3 text-sm text-slate-500">
              <span className="flex items-center"><Calendar size={16} className="mr-1.5" /> Discharged: {formatDate(info.dischargeDate, 'MMM dd, yyyy')}</span>
              <span className="flex items-center"><Calendar size={16} className="mr-1.5" /> Follow-up: {formatDate(info.followUpDate, 'MMM dd, yyyy')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={`px-4 py-2 rounded-lg flex items-center border ${
              info.riskLevel === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700' : 
              info.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
              'bg-green-50 border-green-200 text-green-700'
            }`}>
              {info.riskLevel === 'HIGH' && <ShieldAlert className="mr-2 animate-pulse" size={24} />}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">Current Risk</div>
                <div className="text-2xl font-bold">{info.riskLevel} <span className="text-lg font-normal opacity-75">({info.riskScore}/100)</span></div>
              </div>
            </div>
          </div>
        </div>
        
        {info.riskReasons && info.riskReasons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-2">Possible Deterioration Detected:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
              {info.riskReasons.map((reason, idx) => (
                <li key={idx} className={info.riskLevel === 'HIGH' ? 'text-red-600 font-medium' : ''}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Charts & Vitals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Thermometer className="mr-2 text-teal-600" size={20} /> Vitals Trends (Last 24h)</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">SpO2 (%)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitals.spo2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{fontSize: 12}} />
                      <YAxis domain={[80, 100]} />
                      <Tooltip />
                      <ReferenceLine y={90} stroke="red" strokeDasharray="3 3" label="Critical Threshold (90%)" />
                      <Line type="monotone" dataKey="value" stroke="#0891B2" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Heart Rate (bpm)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitals.heartRate}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{fontSize: 12}} />
                      <YAxis domain={[50, 150]} />
                      <Tooltip />
                      <ReferenceLine y={100} stroke="orange" strokeDasharray="3 3" label="Tachycardia Threshold" />
                      <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Risk Score History</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <ReferenceLine y={75} stroke="red" strokeDasharray="3 3" label="High Risk" />
                  <ReferenceLine y={40} stroke="orange" strokeDasharray="3 3" label="Medium Risk" />
                  <Line type="stepAfter" dataKey="score" stroke="#475569" strokeWidth={2} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - Timeline & Context */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Medications</h3>
            <div className="space-y-3">
              {info.medications.map((med, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-800">{med.name}</div>
                    <div className="text-xs text-slate-500">{med.dose} • {med.frequency}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">Adherence</div>
                    <div className={`text-sm font-bold ${parseInt(med.adherence) < 80 ? 'text-amber-600' : 'text-green-600'}`}>
                      {med.adherence}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Patient Timeline</h3>
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <PatientTimeline events={timeline} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <DecisionForm patient={info} onSubmit={handleDecisionSubmit} loading={false} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Previous Clinical Decisions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 font-semibold text-slate-700">Date</th>
                  <th className="p-3 font-semibold text-slate-700">Decision</th>
                  <th className="p-3 font-semibold text-slate-700">Notes</th>
                  <th className="p-3 font-semibold text-slate-700">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((dec, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-3 whitespace-nowrap text-slate-600">{formatDate(dec.date, 'MMM dd, yy')}</td>
                    <td className="p-3 font-medium text-slate-800">{dec.decision}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate" title={dec.notes}>{dec.notes}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${dec.urgency === 'Emergency' ? 'bg-red-100 text-red-700' : dec.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {dec.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPatientDetail;
