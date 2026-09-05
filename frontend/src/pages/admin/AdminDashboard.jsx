import React, { useState, useEffect } from 'react';
import { Users, Building2, Activity, AlertCircle, Shield } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import adminService from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminService.getStats();
        setStats(res || {});
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStats({ totalUsers: 0, totalHospitals: 0, activePatients: 0, highRiskPatients: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
        <p className="text-slate-500">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Hospitals"
          value={stats?.totalHospitals || 0}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Patients"
          value={stats?.activePatients || 0}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="High Risk"
          value={stats?.highRiskPatients || 0}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">User Distribution</h3>
          <div className="space-y-3">
            {[
              { role: 'Doctors', count: stats?.doctorCount || 0, color: 'bg-teal-500' },
              { role: 'Health Workers', count: stats?.workerCount || 0, color: 'bg-blue-500' },
              { role: 'Patients', count: stats?.patientCount || 0, color: 'bg-emerald-500' },
              { role: 'Hospital Admins', count: stats?.hospitalAdminCount || 0, color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-700">{item.role}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a href="/admin/users" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Manage Users</p>
                <p className="text-sm text-slate-500">Create, edit, and manage user accounts</p>
              </div>
            </a>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Manage Hospitals</p>
                <p className="text-sm text-slate-500">View and configure hospital settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Audit Logs</p>
                <p className="text-sm text-slate-500">Review system access and activity logs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
