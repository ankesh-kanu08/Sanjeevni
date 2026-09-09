import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Mic, Phone, Volume2, Sparkles, Heart, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';
import RuralVoiceAssistantModal from '../../components/patient/RuralVoiceAssistantModal';
import LanguageSelector from '../../components/common/LanguageSelector';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { language, setLanguage, t, availableLanguages } = useLanguage();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const fetchPatientData = async () => {
    try {
      const res = await patientService.getMyRecord();
      setPatientData(res.data);
      // Synchronize language with patient's server preference if available and different
      if (res.data?.preferredLanguage && res.data.preferredLanguage !== language) {
        setLanguage(res.data.preferredLanguage, false);
      }
    } catch (err) {
      console.error("Error fetching patient dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPatientData();
  }, [user]);

  const handleMoodSelect = (mood) => {
    navigate('/patient/check-in', { state: { mood } });
  };

  const handleVoiceInput = () => {
    setVoiceModalOpen(true);
  };

  const handleCloseVoiceModal = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceModalOpen(false);
  };

  const handleLanguageSwitch = async (langCode) => {
    await setLanguage(langCode, true);
    const langObj = availableLanguages?.find(l => l.code === langCode);
    const langName = langObj ? `${langObj.nativeName} (${langObj.name})` : langCode;
    toast.success(langName);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-3xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {t('patientDashboard.greeting', { name: user?.name || (language === 'hi' ? 'मरीज' : 'Patient') })}
          </h1>
          <p className="text-lg text-gray-600 mt-1 capitalize">
            {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : `${language}-IN`, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }).format(new Date())}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Accessible Multilingual Selector */}
          <LanguageSelector onChange={handleLanguageSwitch} />

          {!loading && patientData?.currentRiskLevel && (
            <div className="bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{t('patientDashboard.statusLabel')}:</span>
              <RiskBadge level={patientData.currentRiskLevel} />
            </div>
          )}
        </div>
      </div>

      {/* RURAL ACCESSIBLE HERO BANNER: 1-TOUCH VOICE CONSULTATION */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-emerald-200" />
            {t('patientDashboard.heroTag')}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            {t('patientDashboard.heroTitle')}
          </h2>

          <p className="text-teal-100 text-base max-w-lg mb-6">
            {t('patientDashboard.heroDescription')}
          </p>

          <button
            type="button"
            onClick={handleVoiceInput}
            className="group relative px-8 py-5 bg-white text-teal-800 hover:bg-emerald-50 text-xl sm:text-2xl font-black rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-4"
          >
            <span className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Mic size={26} className="animate-pulse" />
            </span>
            <span>{t('patientDashboard.tapToSpeakBtn')}</span>
            <Volume2 size={24} className="text-teal-600 hidden sm:inline-block" />
          </button>
        </div>

        {/* Decorative background circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-emerald-400/20 pointer-events-none" />
      </div>

      {/* Quick Mood Selection */}
      <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {t('patientDashboard.moodQuestion')}
        </h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleMoodSelect('better')}
            className="w-full min-h-16 text-xl sm:text-2xl font-bold rounded-2xl p-4 border-2 border-emerald-300 hover:bg-emerald-50 text-emerald-800 transition-colors flex items-center justify-center gap-4 shadow-sm"
          >
            <span className="text-4xl">😊</span> {t('patientDashboard.moodBetter')}
          </button>
          
          <button 
            onClick={() => handleMoodSelect('same')}
            className="w-full min-h-16 text-xl sm:text-2xl font-bold rounded-2xl p-4 border-2 border-amber-300 hover:bg-amber-50 text-amber-800 transition-colors flex items-center justify-center gap-4 shadow-sm"
          >
            <span className="text-4xl">😐</span> {t('patientDashboard.moodSame')}
          </button>
          
          <button 
            onClick={() => handleMoodSelect('worse')}
            className="w-full min-h-16 text-xl sm:text-2xl font-bold rounded-2xl p-4 border-2 border-red-300 hover:bg-red-50 text-red-800 transition-colors flex items-center justify-center gap-4 shadow-sm"
          >
            <span className="text-4xl">😟</span> {t('patientDashboard.moodWorse')}
          </button>
        </div>
      </div>

      {/* Next Check-in & Care Team Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-teal-50/80 rounded-3xl p-6 border border-teal-100">
          <h3 className="text-xl font-bold text-teal-900 mb-2">{t('patientDashboard.nextCheckinTitle')}</h3>
          <p className="text-base text-teal-800">
            {t('patientDashboard.nextCheckinText')}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{t('patientDashboard.medsTitle')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('patientDashboard.medsQuestion')}</p>
          <div className="flex gap-3">
            <button
              onClick={() => toast.success(t('patientDashboard.medsTakenToast'))}
              className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 text-lg font-bold py-3 rounded-xl border border-teal-200"
            >
              {t('common.yes')}
            </button>
            <button
              onClick={() => toast(t('patientDashboard.medsMissedToast'), { icon: '💊' })}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg font-bold py-3 rounded-xl border border-gray-200"
            >
              {t('common.no')}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => toast(t('patientDashboard.contactTeamToast'), { icon: '📞' })}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xl font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
      >
        <Phone size={24} />
        {t('patientDashboard.contactTeamBtn')}
      </button>

      {/* HANDS-FREE AUTOMATED RURAL VOICE ASSISTANT MODAL */}
      <RuralVoiceAssistantModal
        isOpen={voiceModalOpen}
        onClose={handleCloseVoiceModal}
        patient={patientData}
        onCompleted={fetchPatientData}
      />
    </div>
  );
}
