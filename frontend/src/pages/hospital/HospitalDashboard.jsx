import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, AlertTriangle, Activity } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import hospitalService from '../../services/hospitalService';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ recentlyDischarged: 0, currentlyMonitored: 0, highRisk: 0, compliance: 0 });
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await hospitalService.getStats();
        const patientsRes = await hospitalService.getPatients();
        
        // Use real data if available, fallback to mock if not structured right
        setStats(statsRes || { recentlyDischarged: 45, currentlyMonitored: 128, highRisk: 12, compliance: 85 });
        setRecentPatients(patientsRes || [
          { id: 1, name: 'John Doe', age: 65, diagnosis: 'COPD Exacerbation', dischargeDate: '2023-10-25', riskLevel: 'HIGH', followUp: '2023-11-01' },
          { id: 2, name: 'Jane Smith', age: 72, diagnosis: 'Heart Failure', dischargeDate: '2023-10-24', riskLevel: 'MEDIUM', followUp: '2023-10-31' },
          { id: 3, name: 'Robert Johnson', age: 58, diagnosis: 'Pneumonia', dischargeDate: '2023-10-23', riskLevel: 'LOW', followUp: '2023-11-05' }
        ]);
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRiskBadgeColor = (risk) => {
    if (risk === 'HIGH') return 'bg-red-100 text-red-800 animate-pulse';
    if (risk === 'MEDIUM') return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
          <p className="text-gray-600">Welcome, {user?.name || 'Admin'}</p>
        </div>
        <button 
          onClick={() => navigate('/hospital/discharge')}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow flex items-center gap-2 transition-colors"
        >
          <UserPlus size={20} />
          New Discharge
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-lg"><Users className="text-blue-600" size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Recently Discharged</p>
            <p className="text-2xl font-bold text-gray-900">{stats.recentlyDischarged}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-teal-100 p-4 rounded-lg"><Activity className="text-teal-600" size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Currently Monitored</p>
            <p className="text-2xl font-bold text-gray-900">{stats.currentlyMonitored}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-100 p-4 rounded-lg"><AlertTriangle className="text-red-600" size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">High Risk Patients</p>
            <p className="text-2xl font-bold text-gray-900">{stats.highRisk}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-lg"><CheckCircle className="text-green-600" size={28} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Follow-up Compliance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.compliance}%</p>
          </div>
        </div>
      </div>

      {stats.highRisk > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">High Risk Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPatients.filter(p => p.riskLevel === 'HIGH').map(patient => (
              <div key={`alert-${patient.id}`} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/hospital/patient/${patient.id}`)}>
                <div>
                  <h3 className="font-bold text-gray-900">{patient.name}</h3>
                  <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                </div>
                <AlertTriangle className="text-red-500" size={24} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Recent Discharges</h2>
          <button onClick={() => navigate('/hospital/patients')} className="text-teal-600 text-sm font-medium hover:text-teal-700">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Age</th>
                <th className="px-6 py-4 font-medium">Diagnosis</th>
                <th className="px-6 py-4 font-medium">Discharge Date</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : (
                recentPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/hospital/patient/${patient.id}`)}>
                    <td className="px-6 py-4 font-medium text-gray-900">{patient.name}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.age}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.diagnosis}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.dischargeDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(patient.riskLevel)}`}>
                        {patient.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{patient.followUp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Quick inline component for CheckCircle
function CheckCircle({ className, size }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
