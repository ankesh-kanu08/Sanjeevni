import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';

export default function WorkerPatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await patientService.getPatient(id);
        setPatient(res.data);
      } catch (err) {
        console.error('Error fetching patient', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading patient details...</div>;
  if (!patient) return <div className="p-8 text-center text-red-500">Patient not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-3xl mx-auto pb-24">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-600">{patient.age} yrs • {patient.gender}</p>
          </div>
          <RiskBadge riskLevel={patient.riskLevel} />
        </div>
        <div className="text-sm text-gray-700 space-y-1">
          <p><span className="font-medium">Diagnosis:</span> {patient.diagnosis}</p>
          <p><span className="font-medium">Assigned Doctor:</span> Dr. {patient.assignedDoctor}</p>
        </div>
      </div>

      {(patient.riskReasons && patient.riskReasons.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Risk Factors</h3>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {patient.riskReasons.map((reason, i) => <li key={i}>{reason}</li>)}
          </ul>
        </div>
      )}

      {patient.requiredAction && (
        <div className={`rounded-xl p-5 mb-4 ${patient.riskLevel === 'HIGH' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'} border`}>
          <h3 className="font-semibold text-gray-900 mb-1">Required Action</h3>
          <p className="text-sm text-gray-800">{patient.requiredAction}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 overflow-x-auto border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Vitals</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">HR</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">BP</th>
            </tr>
          </thead>
          <tbody>
            {(patient.recentVitals || []).map((vital, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-3 py-2 text-gray-900">{vital.date}</td>
                <td className="px-3 py-2">{vital.spo2}%</td>
                <td className="px-3 py-2">{vital.hr}</td>
                <td className="px-3 py-2">{vital.temp}°F</td>
                <td className="px-3 py-2">{vital.bp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        onClick={() => navigate(`/worker/visit/${patient.id}`)}
        className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-teal-700 transition-colors"
      >
        Record Visit
      </button>
    </div>
  );
}
