import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import workerService from '../../services/workerService';
import RiskBadge from '../../components/common/RiskBadge';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await workerService.getStats();
        setStats(statsRes);
        const tasksRes = await workerService.getTasks();
        // Sort: HIGH first, MEDIUM, LOW
        const sortedTasks = (tasksRes || []).sort((a, b) => {
          const riskWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          return (riskWeight[b.riskLevel] || 0) - (riskWeight[a.riskLevel] || 0);
        });
        setTasks(sortedTasks);
      } catch (err) {
        console.error('Error fetching worker data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    if (riskLevel === 'HIGH') return 'bg-red-50';
    if (riskLevel === 'MEDIUM') return 'bg-amber-50';
    return 'bg-slate-50';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.name || 'Worker'}</h1>
        <p className="text-gray-600 mt-1">Here is your schedule for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-lg"><Users className="text-teal-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Assigned</p>
            <p className="text-xl font-bold text-gray-900">{stats?.assigned || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><Calendar className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Today's Visits</p>
            <p className="text-xl font-bold text-gray-900">{stats?.todayVisits || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-lg"><AlertCircle className="text-red-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">High Priority</p>
            <p className="text-xl font-bold text-gray-900">{stats?.highPriority || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg"><CheckCircle className="text-green-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-xl font-bold text-gray-900">{stats?.completed || 0}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Priority Patients</h2>
      
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center shadow-sm">
          <p className="text-gray-600">No tasks assigned for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${getBorderColor(task.riskLevel)} p-5`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{task.patientName}</h3>
                  <p className="text-sm text-gray-600">{task.age} yrs • {task.diagnosis} • <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{task.locationType}</span></p>
                </div>
                <RiskBadge riskLevel={task.riskLevel} />
              </div>
              
              <p className="text-sm text-slate-600 mb-3">{task.riskReason}</p>
              
              <div className={`p-3 rounded-lg mb-4 ${getActionBg(task.riskLevel)} border border-transparent`}>
                <p className="text-sm font-medium text-gray-800">Required: {task.requiredAction}</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate(`/worker/patient/${task.patientId}`)}
                  className="flex-1 py-2 px-4 border border-teal-600 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50"
                >
                  View Patient
                </button>
                <button 
                  onClick={() => navigate(`/worker/visit/${task.patientId}`)}
                  className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  Start Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
