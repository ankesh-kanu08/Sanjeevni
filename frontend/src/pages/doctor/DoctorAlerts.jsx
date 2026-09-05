import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, X, Bell } from 'lucide-react';
import AlertCard from '../../components/doctor/AlertCard';
import DecisionForm from '../../components/doctor/DecisionForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import doctorService from '../../services/doctorService';
import useSocket from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const DoctorAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('unread');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Real-time live alerts update
  useEffect(() => {
    if (!socket) return;
    const handleIncomingAlert = () => {
      fetchAlerts();
    };
    socket.on('alert', handleIncomingAlert);
    socket.on('new_alert', handleIncomingAlert);
    socket.on('alert:created', handleIncomingAlert);
    socket.on('alert:updated', handleIncomingAlert);
    socket.on('alert_updated', handleIncomingAlert);
    return () => {
      socket.off('alert', handleIncomingAlert);
      socket.off('new_alert', handleIncomingAlert);
      socket.off('alert:created', handleIncomingAlert);
      socket.off('alert:updated', handleIncomingAlert);
      socket.off('alert_updated', handleIncomingAlert);
    };
  }, [socket]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getAlerts();
      setAlerts(data || []);
    } catch (error) {
      console.error("API Error fetching alerts:", error);
      setError("Could not load clinical alerts from the server. Please try again.");
      toast.error("Could not fetch alerts.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewPatient = (alert) => {
    const pId = alert.patient?._id || alert.patient;
    if (pId) {
      navigate(`/doctor/patient/${pId}`);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await doctorService.markAlertRead(id);
      setAlerts(alerts.map(a => a._id === id ? { ...a, isRead: true, status: a.status === 'UNREAD' ? 'READ' : a.status } : a));
      toast.success('Alert marked as read');
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const handleMarkActioned = async (id) => {
    try {
      await doctorService.markAlertActioned(id, 'Reviewed and actioned by Doctor');
      setAlerts(alerts.map(a => a._id === id ? { ...a, isActioned: true, status: 'ACTIONED', isRead: true } : a));
      toast.success('Alert marked as actioned');
    } catch (error) {
      toast.error('Failed to mark alert as actioned');
    }
  };

  const handleQuickDecisionSubmit = async (formData) => {
    try {
      if (selectedAlert?.patient?._id) {
        await doctorService.submitDecision({
          patientId: selectedAlert.patient._id,
          alertId: selectedAlert._id,
          ...formData
        });
      }
      toast.success('Decision recorded successfully');
      setShowDecisionModal(false);
      handleMarkActioned(selectedAlert._id);
    } catch (error) {
      toast.error('Failed to record decision');
    }
  };

  const unreadAlerts = alerts.filter(a => !a.isActioned && a.status !== 'ACTIONED');
  const actionedAlerts = alerts.filter(a => a.isActioned || a.status === 'ACTIONED');

  const getFilteredAlerts = () => {
    switch (activeTab) {
      case 'unread': return unreadAlerts;
      case 'actioned': return actionedAlerts;
      case 'all': default: return alerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Loading clinical alerts..." />
      </div>
    );
  }

  if (error && !alerts.length) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Unable to load alerts"
          message={error} 
          onRetry={fetchAlerts} 
        />
      </div>
    );
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
                onMarkActioned={handleMarkActioned}
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
