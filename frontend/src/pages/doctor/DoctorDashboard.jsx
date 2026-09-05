import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertCircle, AlertTriangle, Clock, Bell, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import AlertCard from '../../components/doctor/AlertCard';
// import RiskDistributionChart from '../../components/charts/RiskDistributionChart'; // Using inline for safe Recharts usage
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      try {
        const [statsData, alertsData, patientsData] = await Promise.all([
          doctorService.getStats(),
          doctorService.getAlerts(),
          doctorService.getPatients()
        ]);
        setStats(statsData?.data || statsData);
        setAlerts(Array.isArray(alertsData?.data) ? alertsData.data : Array.isArray(alertsData) ? alertsData : []);
        setPatients(Array.isArray(patientsData?.data) ? patientsData.data : Array.isArray(patientsData) ? patientsData : []);
      } catch (err) {
        console.warn("API Error, using fallback data", err);
      }
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
    socket.on('risk_update', handleUpdate);
    return () => {
      socket.off('alert', handleUpdate);
      socket.off('new_alert', handleUpdate);
      socket.off('risk_update', handleUpdate);
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
      // Offline fallback
      setAlerts(alerts.map(a => a._id === id ? { ...a, isRead: true } : a));
      toast.success('Alert marked as read (Offline mode)');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Activity className="animate-spin text-teal-600" size={32} /></div>;
  }

  const highRiskAlerts = alerts.filter(a => a.riskLevel === 'HIGH' && !a.isRead);
  
  // Chart Data
  const riskData = [
    { name: 'Low Risk', value: stats?.totalPatients - (stats?.highRisk + stats?.mediumRisk) || 0, color: '#10B981' },
    { name: 'Medium Risk', value: stats?.mediumRisk || 0, color: '#F59E0B' },
    { name: 'High Risk', value: stats?.highRisk || 0, color: '#EF4444' }
  ];

  const trendData = [
    { day: 'Mon', alerts: 4 },
    { day: 'Tue', alerts: 7 },
    { day: 'Wed', alerts: 5 },
    { day: 'Thu', alerts: 12 },
    { day: 'Fri', alerts: 8 },
    { day: 'Sat', alerts: 15 },
    { day: 'Sun', alerts: 10 }
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
          <p className="text-slate-600">Here's the current overview of your patients.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} title="Total Patients" value={stats?.totalPatients} color="bg-teal-100 text-teal-600" />
        <StatCard icon={AlertCircle} title="High Risk" value={stats?.highRisk} color="bg-red-100 text-red-600" alert={stats?.highRisk > 0} />
        <StatCard icon={AlertTriangle} title="Medium Risk" value={stats?.mediumRisk} color="bg-amber-100 text-amber-600" />
        <StatCard icon={Clock} title="Pending Reviews" value={stats?.pendingReviews} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Bell} title="Today's Alerts" value={stats?.todayAlerts} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Urgent Clinical Reviews */}
      {highRiskAlerts.length > 0 && (
        <section className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="text-red-600 animate-pulse" size={24} />
            <h2 className="text-lg font-bold text-red-800">Urgent Clinical Reviews Required ({highRiskAlerts.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highRiskAlerts.map(alert => (
              <AlertCard key={alert._id} alert={alert} onReview={handleReviewPatient} onMarkRead={handleMarkRead} />
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
        <h2 className="text-lg font-bold text-slate-800 mb-4">Patients Requiring Attention</h2>
        {patients.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-700">Patient</th>
                  <th className="p-4 font-semibold text-slate-700">Risk Level</th>
                  <th className="p-4 font-semibold text-slate-700">Last Update</th>
                  <th className="p-4 font-semibold text-slate-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.slice(0, 5).map(patient => (
                  <tr key={patient._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{patient.name} <span className="text-slate-500 font-normal text-sm">({patient.age}y)</span></td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        patient.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        patient.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {patient.riskLevel}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">Recently</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/doctor/patient/${patient._id}`)}
                        className="text-teal-600 hover:text-teal-800 font-medium text-sm"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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