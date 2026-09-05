import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, AlertCircle, CheckCircle, WifiOff, RefreshCw, Radio } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import workerService from '../../services/workerService';
import RiskBadge from '../../components/common/RiskBadge';
import { useOfflineSync } from '../../utils/offlineSync';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { isOnline, pendingCount, syncing, syncNow } = useOfflineSync();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, tasksRes, patientsRes] = await Promise.allSettled([
        workerService.getStats(),
        workerService.getTasks(),
        workerService.getPatients()
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data || statsRes.value);
      }

      let taskList = [];
      if (tasksRes.status === 'fulfilled') {
        const rawTasks = tasksRes.value.data?.data || tasksRes.value.data || tasksRes.value || [];
        taskList = Array.isArray(rawTasks) ? rawTasks : [];
      }

      // If no explicit tasks yet, map from assigned patients needing verification
      if (taskList.length === 0 && patientsRes.status === 'fulfilled') {
        const rawPatients = patientsRes.value.data?.data || patientsRes.value.data || patientsRes.value || [];
        taskList = rawPatients.map(p => ({
          _id: p._id,
          patientId: p._id,
          patientName: p.user?.name || p.name || 'Patient',
          age: p.demographics?.age || '—',
          diagnosis: p.diagnosis || 'Post-discharge monitoring',
          locationType: p.demographics?.location || 'rural',
          riskLevel: p.currentRiskLevel || 'LOW',
          riskReason: p.currentRiskLevel === 'HIGH' ? 'High risk escalation requires urgent physical vitals verification' : p.currentRiskLevel === 'MEDIUM' ? 'Potential deterioration reported, physical vitals check recommended' : 'Routine follow-up check',
          requiredAction: 'Measure SpO2, Heart Rate, and Temperature in person'
        }));
      }

      // Sort: HIGH first, then MEDIUM, then LOW
      const sortedTasks = taskList.sort((a, b) => {
        const riskWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const rA = a.riskLevel || a.patient?.currentRiskLevel || 'LOW';
        const rB = b.riskLevel || b.patient?.currentRiskLevel || 'LOW';
        return (riskWeight[rB] || 0) - (riskWeight[rA] || 0);
      });

      setTasks(sortedTasks);
    } catch (err) {
      console.error('Error fetching worker data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for real-time risk updates and alerts
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchData();
    };
    socket.on('alert', handleUpdate);
    socket.on('new_alert', handleUpdate);
    socket.on('risk_update', handleUpdate);
    return () => {
      socket.off('alert', handleUpdate);
      socket.off('new_alert', handleUpdate);
      socket.off('risk_update', handleUpdate);
    };
  }, [socket]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getBorderColor = (riskLevel) => {
    if (riskLevel === 'HIGH') return 'border-red-500';
    if (riskLevel === 'MEDIUM') return 'border-amber-500';
    return 'border-green-500';
  };

  const getActionBg = (riskLevel) => {
    if (riskLevel === 'HIGH') return 'bg-red-50 text-red-900 border-red-100';
    if (riskLevel === 'MEDIUM') return 'bg-amber-50 text-amber-900 border-amber-100';
    return 'bg-slate-50 text-slate-800 border-slate-100';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {/* Offline Pending Sync Banner */}
      {pendingCount > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <WifiOff size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Offline Queue: {pendingCount} Assessment{pendingCount > 1 ? 's' : ''} Pending Sync</h3>
              <p className="text-amber-100 text-sm">Assessments recorded without internet are safely queued on this device.</p>
            </div>
          </div>
          <button
            onClick={syncNow}
            disabled={syncing || !isOnline}
            className="px-5 py-2.5 bg-white text-amber-900 font-bold rounded-xl shadow hover:bg-amber-50 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : isOnline ? 'Sync Now' : 'Connect Internet to Sync'}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.name || 'Field Worker'}</h1>
          <p className="text-gray-600 mt-1">Community Health & Field Verification Schedule</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
              <Radio size={14} className="text-emerald-500 animate-pulse" /> Live Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
              <WifiOff size={14} /> Offline Mode
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-lg"><Users className="text-teal-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Assigned</p>
            <p className="text-xl font-bold text-gray-900">{stats?.totalPatients || stats?.assigned || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><Calendar className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Pending Visits</p>
            <p className="text-xl font-bold text-gray-900">{stats?.pendingVisits || stats?.todayVisits || tasks.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-lg"><AlertCircle className="text-red-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">High Priority</p>
            <p className="text-xl font-bold text-gray-900">{stats?.highPriority || tasks.filter(t => (t.riskLevel || t.patient?.currentRiskLevel) === 'HIGH').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg"><CheckCircle className="text-green-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-xl font-bold text-gray-900">{stats?.completedVisits || stats?.completed || 0}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Today's Priority Patients</h2>
        <button onClick={fetchData} className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center shadow-sm border border-gray-100">
          <p className="text-gray-600 font-medium">All patients are stable. No priority verification tasks assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => {
            const patientId = task.patientId || task.patient?._id || task._id;
            const patientName = task.patientName || task.patient?.user?.name || task.patient?.name || 'Patient';
            const riskLevel = task.riskLevel || task.patient?.currentRiskLevel || 'LOW';
            const age = task.age || task.patient?.demographics?.age || '—';
            const diagnosis = task.diagnosis || task.patient?.diagnosis || 'Post-discharge monitoring';
            const locationType = task.locationType || task.patient?.demographics?.location || 'rural';
            const riskReason = task.riskReason || task.assignedReason || (riskLevel === 'HIGH' ? 'High risk escalation: SpO2/HR deviation detected' : riskLevel === 'MEDIUM' ? 'Medium risk: Patient reported worsening symptoms' : 'Routine monitoring follow-up');
            const requiredAction = task.requiredAction || 'In-person physical verification of SpO2, Heart Rate, and breathing effort';

            return (
              <div key={task._id || patientId} className={`bg-white rounded-xl shadow-sm border-l-4 ${getBorderColor(riskLevel)} p-5 border border-gray-100`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{patientName}</h3>
                    <p className="text-sm text-gray-600">
                      {age} yrs • {diagnosis} • <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-700">{locationType}</span>
                    </p>
                  </div>
                  <RiskBadge level={riskLevel} />
                </div>
                
                <p className="text-sm text-slate-600 mb-3 font-medium">
                  {riskReason}
                </p>
                
                <div className={`p-3 rounded-lg mb-4 ${getActionBg(riskLevel)} border`}>
                  <p className="text-sm font-semibold">Action: {requiredAction}</p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => navigate(`/worker/patient/${patientId}`)}
                    className="flex-1 py-2.5 px-4 border border-teal-600 text-teal-700 font-semibold rounded-lg text-sm hover:bg-teal-50 transition-colors"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => navigate(`/worker/visit/${patientId}`)}
                    className="flex-1 py-2.5 px-4 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    Record Visit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
