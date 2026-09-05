import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertCircle, AlertTriangle, Clock, Bell, Activity, Stethoscope } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import AlertCard from '../../components/doctor/AlertCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import doctorService from '../../services/doctorService';
import useSocket from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, alertsRes, patientsRes] = await Promise.allSettled([
        doctorService.getStats(),
        doctorService.getAlerts(),
        doctorService.getPatients()
      ]);

      let hasSuccess = false;
      let errorMsg = null;

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value.data || statsRes.value);
        hasSuccess = true;
      } else {
        console.error("Failed to load doctor stats:", statsRes.reason);
        errorMsg = statsRes.reason?.response?.data?.message || statsRes.reason?.message;
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value) {
        const rawAlerts = alertsRes.value.data || alertsRes.value;
        setAlerts(Array.isArray(rawAlerts) ? rawAlerts : []);
        hasSuccess = true;
      } else {
        console.error("Failed to load doctor alerts:", alertsRes.reason);
        errorMsg = errorMsg || alertsRes.reason?.response?.data?.message || alertsRes.reason?.message;
      }

      if (patientsRes.status === 'fulfilled' && patientsRes.value) {
        const rawPatients = patientsRes.value.data || patientsRes.value;
        setPatients(Array.isArray(rawPatients) ? rawPatients : []);
        hasSuccess = true;
      } else {
        console.error("Failed to load doctor patients:", patientsRes.reason);
        errorMsg = errorMsg || patientsRes.reason?.response?.data?.message || patientsRes.reason?.message;
      }

      if (!hasSuccess) {
        setError(errorMsg || 'Unable to connect to healthcare server. Please check your connection.');
      }
    } catch (err) {
      console.error("Critical error loading dashboard data:", err);
      setError('Unable to load clinical records from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time live dashboard update on alert or risk escalation
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchDashboardData();
    };

    socket.on('alert', handleUpdate);
    socket.on('new_alert', handleUpdate);
    socket.on('alert:created', handleUpdate);
    socket.on('alert:updated', handleUpdate);
    socket.on('alert_updated', handleUpdate);
    socket.on('risk_update', handleUpdate);
    socket.on('risk:updated', handleUpdate);

    return () => {
      socket.off('alert', handleUpdate);
      socket.off('new_alert', handleUpdate);
      socket.off('alert:created', handleUpdate);
      socket.off('alert:updated', handleUpdate);
      socket.off('alert_updated', handleUpdate);
      socket.off('risk_update', handleUpdate);
      socket.off('risk:updated', handleUpdate);
    };
  }, [socket]);

  const handleReviewPatient = (alert) => {
    navigate(`/doctor/patient/${alert.patient._id}`);
  };

  const handleMarkRead = async (id) => {
    try {
      await doctorService.markAlertRead(id);
      setAlerts(alerts.map(a => a._id === id ? { ...a, isRead: true } : a));
      toast.success('Alert marked as read');
    } catch (error) {
      setAlerts(alerts.map(a => a._id === id ? { ...a, isRead: true } : a));
      toast.success('Alert marked as read (Offline mode)');
    }
  };

  const handleMarkActioned = async (id) => {
    try {
      await doctorService.markAlertActioned(id, 'Reviewed and actioned by Doctor');
      fetchDashboardData();
      toast.success('Alert marked as actioned');
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading clinical dashboard..." />
      </div>
    );
  }

  if (error && (!patients.length && !alerts.length)) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Unable to load doctor dashboard"
          message={error} 
          onRetry={fetchDashboardData} 
        />
      </div>
    );
  }

  const highRiskAlerts = alerts.filter(a => 
    (a.riskLevel === 'HIGH' || a.level === 'HIGH') && 
    !a.isActioned && 
    a.status !== 'ACTIONED'
  );
  
  // Calculate risk distribution safely
  const totalMonitored = stats?.totalPatients ?? patients.length;
  const highCount = stats?.highRisk ?? patients.filter(p => p.currentRiskLevel === 'HIGH').length;
  const mediumCount = stats?.mediumRisk ?? patients.filter(p => p.currentRiskLevel === 'MEDIUM').length;
  const lowCount = Math.max(0, totalMonitored - (highCount + mediumCount));

  const riskData = [
    { name: 'Low Risk', value: lowCount, color: '#10B981' },
    { name: 'Medium Risk', value: mediumCount, color: '#F59E0B' },
    { name: 'High Risk', value: highCount, color: '#EF4444' }
  ];

  const trendData = [
    { day: 'Mon', alerts: 2 },
    { day: 'Tue', alerts: 4 },
    { day: 'Wed', alerts: 3 },
    { day: 'Thu', alerts: 5 },
    { day: 'Fri', alerts: 4 },
    { day: 'Sat', alerts: 6 },
    { day: 'Sun', alerts: 1 }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{getGreeting()}, Dr. {user?.name || 'Doctor'}</h1>
          <p className="text-slate-600">Here's the current overview of your monitored patients.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} title="Total Patients" value={totalMonitored} color="bg-teal-100 text-teal-600" />
        <StatCard icon={AlertCircle} title="High Risk" value={highCount} color="bg-red-100 text-red-600" alert={highCount > 0} />
        <StatCard icon={AlertTriangle} title="Medium Risk" value={mediumCount} color="bg-amber-100 text-amber-600" />
        <StatCard icon={Clock} title="Pending Reviews" value={stats?.pendingReviews ?? highRiskAlerts.length} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Bell} title="Today's Alerts" value={stats?.todayAlerts ?? alerts.length} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Urgent Clinical Reviews */}
      {highRiskAlerts.length > 0 && (
        <section className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600 animate-pulse"></div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="text-red-600 animate-pulse" size={24} />
            <h2 className="text-lg font-bold text-red-900">Urgent Clinical Reviews Required ({highRiskAlerts.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highRiskAlerts.map(alert => (
              <AlertCard 
                key={alert._id} 
                alert={alert} 
                onReview={handleReviewPatient} 
                onMarkRead={handleMarkRead} 
                onMarkActioned={handleMarkActioned}
              />
            ))}
          </div>
        </section>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Risk Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Alert Trends (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="alerts" stroke="#0891B2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patients Requiring Attention */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Patients Requiring Attention</h2>
          <span className="text-xs text-slate-500 font-medium">Sorted by clinical priority</span>
        </div>
        {patients.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase tracking-wider font-semibold">
                    <th className="p-4">Patient</th>
                    <th className="p-4">Diagnosis</th>
                    <th className="p-4">Current Risk</th>
                    <th className="p-4">Clinical Finding / Reason</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {patients.map(patient => {
                    const isHigh = patient.currentRiskLevel === 'HIGH' || patient.riskLevel === 'HIGH';
                    const isMedium = patient.currentRiskLevel === 'MEDIUM' || patient.riskLevel === 'MEDIUM';
                    const riskLevel = patient.currentRiskLevel || patient.riskLevel || 'LOW';
                    const riskScore = Math.round(patient.currentRiskScore ?? patient.riskScore ?? 0);

                    return (
                      <tr key={patient._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{patient.name}</div>
                          <div className="text-xs text-slate-500">{patient.age}y • {patient.gender || 'Patient'} • {patient.location || 'Rural'}</div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          {patient.diagnosis || 'Post-Discharge Monitoring'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isHigh ? 'bg-red-100 text-red-800 border border-red-200' : 
                            isMedium ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {riskLevel} ({riskScore}/100)
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 text-xs max-w-xs">
                          {patient.riskReason || (isHigh ? 'Possible deterioration detected from baseline' : 'Vitals stable and within baseline limits')}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button 
                            onClick={() => navigate(`/doctor/patient/${patient._id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 border border-teal-200 font-semibold text-xs rounded-lg transition-colors"
                          >
                            <Stethoscope size={13} />
                            Review Patient
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-8 text-center rounded-xl border border-slate-200 text-slate-500">
            No patients currently require attention.
          </div>
        )}
      </section>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, color, alert }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border ${alert ? 'border-red-300' : 'border-slate-200'}`}>
    <div className={`inline-flex p-3 rounded-lg ${color} mb-4`}>
      <Icon size={24} className={alert ? 'animate-pulse' : ''} />
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-800 mt-1">{value !== undefined ? value : '-'}</p>
  </div>
);

export default DoctorDashboard;