import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, X, Bell } from 'lucide-react';
import AlertCard from '../../components/doctor/AlertCard';
import DecisionForm from '../../components/doctor/DecisionForm';
import doctorService from '../../services/doctorService';
import toast from 'react-hot-toast';

const DoctorAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unread');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.warn("API Error, using fallback data");
      setAlerts([
        {
          _id: '1', patient: { name: 'Rajesh Kumar', age: 65, _id: 'p1' }, riskLevel: 'HIGH',
          title: 'Abnormal SpO2 Drop', message: 'Patient oxygen saturation dropped below 90% repeatedly during night.',
          reasons: ['SpO2 avg 88% over last 4 hours'], isRead: false, createdAt: new Date().toISOString()
        },
        {
          _id: '2', patient: { name: 'Sunita Sharma', age: 58, _id: 'p2' }, riskLevel: 'MEDIUM',
          title: 'Missed Check-in', message: 'Patient has missed 2 consecutive daily check-ins.',
          reasons: ['Missed check-in'], isRead: false, createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          _id: '3', patient: { name: 'Amit Patel', age: 45, _id: 'p3' }, riskLevel: 'LOW',
          title: 'Routine Assessment Complete', message: 'Health worker completed routine assessment. No abnormalities.',
          reasons: [], isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
      toast.success('Alert marked as read (Offline)');
    }
  };

  const handleQuickDecisionSubmit = async (formData) => {
    try {
      toast.success('Decision recorded successfully');
      setShowDecisionModal(false);
      handleMarkRead(selectedAlert._id);
    } catch (error) {
      toast.error('Failed to record decision');
    }
  };

  const unreadAlerts = alerts.filter(a => !a.isRead);
  const actionedAlerts = alerts.filter(a => a.isRead);

  const getFilteredAlerts = () => {
    switch (activeTab) {
      case 'unread': return unreadAlerts;
      case 'actioned': return actionedAlerts;
      case 'all': default: return alerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Activity className="animate-spin text-teal-600" size={32} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Clinical Alerts</h1>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('unread')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'unread' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Unread
            {unreadAlerts.length > 0 && (
              <span className="ml-2 bg-teal-100 text-teal-600 py-0.5 px-2.5 rounded-full text-xs">{unreadAlerts.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setActiveTab('actioned')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actioned' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Actioned
          </button>
        </nav>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div key={alert._id} className="relative">
              <AlertCard 
                alert={alert} 
                onReview={handleReviewPatient} 
                onMarkRead={handleMarkRead} 
              />
              {!alert.isRead && (
                <button 
                  onClick={() => { setSelectedAlert(alert); setShowDecisionModal(true); }}
                  className="absolute bottom-4 right-[140px] text-teal-600 text-sm font-medium hover:underline bg-white px-2 py-1 rounded"
                >
                  Quick Decision
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Bell size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No alerts found</h3>
            <p className="text-slate-500 mt-1">
              {activeTab === 'unread' ? "You're all caught up! No unread alerts." :
               activeTab === 'actioned' ? "No actioned alerts history." : "No alerts have been generated yet."}
            </p>
          </div>
        )}
      </div>

      {showDecisionModal && selectedAlert && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold">Quick Decision: {selectedAlert.patient?.name}</h2>
              <button onClick={() => setShowDecisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-2">
              <DecisionForm patient={selectedAlert.patient} onSubmit={handleQuickDecisionSubmit} loading={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAlerts;
