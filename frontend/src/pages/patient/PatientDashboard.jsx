import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Mic, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const res = await patientService.getMyRecord();
        setPatientData(res.data);
      } catch (err) {
        console.error("Error fetching patient dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchPatientData();
  }, [user]);

  const handleMoodSelect = (mood) => {
    navigate('/patient/check-in', { state: { mood } });
  };

  const handleVoiceInput = () => {
    navigate('/patient/check-in', { state: { startVoice: true } });
    return;
    toast('Voice input coming soon!', { icon: '🎙️' });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Hello, {user?.name || 'Patient'}!</h1>
        <p className="text-xl text-gray-600 mt-2">{format(new Date(), 'EEEE, MMMM do')}</p>
      </div>

      {!loading && patientData?.riskLevel && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100 flex justify-between items-center">
          <span className="text-xl text-gray-700 font-medium">Current Status:</span>
          <RiskBadge riskLevel={patientData.riskLevel} className="text-lg px-4 py-2" />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How are you feeling today?</h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleMoodSelect('better')}
            className="w-full min-h-16 text-2xl font-medium rounded-xl p-4 border-2 border-emerald-300 hover:bg-emerald-50 text-emerald-800 transition-colors flex items-center justify-center gap-4"
          >
            <span className="text-4xl">😊</span> I'm feeling better
          </button>
          
          <button 
            onClick={() => handleMoodSelect('same')}
            className="w-full min-h-16 text-2xl font-medium rounded-xl p-4 border-2 border-amber-300 hover:bg-amber-50 text-amber-800 transition-colors flex items-center justify-center gap-4"
          >
            <span className="text-4xl">😐</span> About the same
          </button>
          
          <button 
            onClick={() => handleMoodSelect('worse')}
            className="w-full min-h-16 text-2xl font-medium rounded-xl p-4 border-2 border-red-300 hover:bg-red-50 text-red-800 transition-colors flex items-center justify-center gap-4"
          >
            <span className="text-4xl">😟</span> I'm feeling worse
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xl text-gray-600 mb-4">Or describe how you feel:</p>
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={handleVoiceInput}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              <Mic size={40} />
            </button>
            <span className="text-lg text-gray-500 font-medium">Tap to speak</span>
          </div>
        </div>
      </div>

      <div className="bg-teal-50 rounded-2xl shadow-sm p-6 mb-6 border border-teal-100">
        <h3 className="text-2xl font-bold text-teal-900 mb-4">Next Check-in</h3>
        <p className="text-xl text-teal-800">Please complete your next check-in tomorrow morning.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Did you take your medicines today?</h3>
        <div className="flex gap-4">
          <button className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 text-xl font-medium py-4 rounded-xl border border-teal-200">
            Yes
          </button>
          <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-medium py-4 rounded-xl border border-gray-200">
            No
          </button>
        </div>
      </div>

      <button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xl font-bold py-5 rounded-2xl shadow-md flex items-center justify-center gap-3">
        <Phone size={28} />
        Contact Healthcare Team
      </button>
    </div>
  );
}
