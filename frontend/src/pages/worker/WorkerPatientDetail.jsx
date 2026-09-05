import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Stethoscope, Activity, AlertTriangle, Calendar } from 'lucide-react';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';
import { formatDate } from '../../utils/formatters';

export default function WorkerPatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [vitalsList, setVitalsList] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        const [patientRes, vitalsRes, riskRes] = await Promise.allSettled([
          patientService.getPatient(id),
          patientService.getVitals(id),
          patientService.getRiskHistory(id)
        ]);

        if (patientRes.status === 'fulfilled') {
          const pData = patientRes.value.data?.data || patientRes.value.data || patientRes.value;
          setPatient(pData);
        }

        if (vitalsRes.status === 'fulfilled') {
          const vData = vitalsRes.value.data?.data || vitalsRes.value.data || [];
          setVitalsList(Array.isArray(vData) ? vData : []);
        }

        if (riskRes.status === 'fulfilled') {
          const rData = riskRes.value.data?.data || riskRes.value.data || [];
          setRiskHistory(Array.isArray(rData) ? rData : []);
        }
      } catch (err) {
        console.error('Error fetching patient details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading patient details...</div>;
  if (!patient) return <div className="p-12 text-center text-red-500 font-medium">Patient record not found</div>;

  const patientName = patient.user?.name || patient.name || 'Patient';
  const age = patient.demographics?.age || patient.age || '—';
  const gender = patient.demographics?.gender || patient.gender || '—';
  const location = patient.demographics?.location || 'rural';
  const riskLevel = patient.currentRiskLevel || patient.riskLevel || 'LOW';
  const latestRisk = riskHistory[0] || {};
  const reasons = latestRisk.reasons || patient.riskReasons || [];

  const doctorName = typeof patient.assignedDoctor === 'object'
    ? patient.assignedDoctor?.name
    : patient.assignedDoctor || 'Dr. Assigned Clinician';

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-3xl mx-auto pb-24 space-y-4">
      <button
        onClick={() => navigate('/worker/dashboard')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
              <User size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patientName}</h1>
              <p className="text-slate-600 text-sm mt-0.5">
                {age} yrs • {gender} • <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">{location}</span>
              </p>
            </div>
          </div>
          <RiskBadge level={riskLevel} size="lg" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-sm">
          <p className="text-slate-700">
            <span className="font-semibold text-slate-900">Diagnosis:</span> {patient.diagnosis || 'Post-discharge monitoring'}
          </p>
          <p className="text-slate-700 flex items-center gap-1.5">
            <Stethoscope size={16} className="text-teal-600" />
            <span className="font-semibold text-slate-900">Assigned Doctor:</span> {doctorName}
          </p>
        </div>
      </div>

      {/* Risk Alert & Reasons */}
      {reasons.length > 0 && (
        <div className={`rounded-2xl p-5 border ${riskLevel === 'HIGH' ? 'bg-red-50/80 border-red-200' : 'bg-amber-50/80 border-amber-200'}`}>
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} className={riskLevel === 'HIGH' ? 'text-red-600' : 'text-amber-600'} />
            Possible Deterioration Indicators:
          </h3>
          <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700">
            {reasons.map((reason, i) => (
              <li key={i} className="font-medium">{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Field Worker Action Guidance */}
      <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-5">
        <h3 className="font-bold text-teal-900 mb-1">Required Field Verification Action</h3>
        <p className="text-sm text-teal-800">
          Conduct an in-person physical assessment. Check and record SpO2, Heart Rate, Respiratory Rate, and temperature. Verify if breathlessness has increased.
        </p>
      </div>

      {/* Recent Longitudinal Vitals Table */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 overflow-hidden">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity size={18} className="text-teal-600" /> Longitudinal Vitals History
        </h3>
        {vitalsList.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No previous vitals measurements recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2.5">Date/Time</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">SpO2</th>
                  <th className="px-3 py-2.5">HR</th>
                  <th className="px-3 py-2.5">Temp</th>
                  <th className="px-3 py-2.5">BP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vitalsList.slice(0, 5).map((vital, idx) => {
                  const bpStr = vital.bloodPressure
                    ? `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}`
                    : vital.bp || '—';

                  return (
                    <tr key={vital._id || idx} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 text-slate-800 font-medium">
                        {formatDate(vital.createdAt, 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-3 py-2.5 text-xs capitalize text-slate-600">
                        <span className={`px-2 py-0.5 rounded-full ${vital.source === 'worker' ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-700'}`}>
                          {vital.source || 'patient'}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 font-bold ${vital.spo2 && vital.spo2 < 92 ? 'text-red-600' : 'text-slate-900'}`}>
                        {vital.spo2 ? `${vital.spo2}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {vital.heartRate ? `${vital.heartRate} bpm` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {vital.temperature ? `${vital.temperature}°F` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {bpStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button 
        onClick={() => navigate(`/worker/visit/${patient._id || id}`)}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-600/20 transition-all text-lg flex items-center justify-center gap-2"
      >
        <Activity size={20} /> Start Field Visit & Record Vitals
      </button>
    </div>
  );
}
