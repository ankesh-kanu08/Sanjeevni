import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import hospitalService from '../../services/hospitalService';
import RiskBadge from '../../components/common/RiskBadge';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ recentlyDischarged: 0, currentlyMonitored: 0, highRisk: 0, compliance: 100 });
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await hospitalService.getStats();
        const patientsRes = await hospitalService.getPatients();

        if (statsRes) {
          setStats(statsRes);
        }
        if (Array.isArray(patientsRes)) {
          setRecentPatients(patientsRes);
        }
      } catch (err) {
        console.error('Error fetching hospital dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('hospitalDashboard.title')}
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base mt-1">
            {t('hospitalDashboard.welcome', { name: user?.name || 'Staff' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/hospital/discharge')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus size={18} />
          <span>{t('hospitalDashboard.newDischarge')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('hospitalDashboard.recentlyDischarged')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.recentlyDischarged}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('hospitalDashboard.currentlyMonitored')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.currentlyMonitored}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('hospitalDashboard.highRiskPatients')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.highRisk}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('hospitalDashboard.compliance')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.compliance}%</p>
          </div>
        </div>
      </div>

      {/* High Risk Alerts Section */}
      {recentPatients.filter(p => p.riskLevel === 'HIGH').length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <span>{t('hospitalDashboard.highRiskAlerts')}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPatients.filter(p => p.riskLevel === 'HIGH').map(patient => (
              <div
                key={`alert-${patient.id}`}
                onClick={() => navigate(`/hospital/patient/${patient.id}`)}
                className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500 border-slate-200/80 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-slate-900">{patient.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{patient.diagnosis}</p>
                </div>
                <RiskBadge level="HIGH" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Discharges Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">{t('hospitalDashboard.recentDischarges')}</h2>
          <button
            onClick={() => navigate('/hospital/patients')}
            className="text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition-colors"
          >
            {t('hospitalDashboard.viewAll')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Age</th>
                <th className="px-6 py-3.5">Diagnosis</th>
                <th className="px-6 py-3.5">Discharge Date</th>
                <th className="px-6 py-3.5">Risk Level</th>
                <th className="px-6 py-3.5">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : recentPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No recent discharge records found.
                  </td>
                </tr>
              ) : (
                recentPatients.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/hospital/patient/${patient.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{patient.name}</td>
                    <td className="px-6 py-4 text-slate-600">{patient.age}</td>
                    <td className="px-6 py-4 text-slate-600">{patient.diagnosis}</td>
                    <td className="px-6 py-4 text-slate-500">{patient.dischargeDate || '—'}</td>
                    <td className="px-6 py-4">
                      <RiskBadge level={patient.riskLevel} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{patient.followUp}</td>
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
