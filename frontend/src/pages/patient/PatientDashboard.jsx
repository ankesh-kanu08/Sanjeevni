import React, { useState, useEffect } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';
import RuralVoiceAssistantModal from '../../components/patient/RuralVoiceAssistantModal';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const fetchPatientData = async () => {
    try {
      const res = await patientService.getMyRecord();
      setPatientData(res.data);
    } catch (err) {
      console.error('Error fetching patient dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPatientData();
  }, [user]);

  const handleOpenVoiceModal = () => {
    setVoiceModalOpen(true);
  };

  const handleCloseVoiceModal = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceModalOpen(false);
  };

  // Dynamic user name from auth state or patient record
  const displayName = user?.name || patientData?.user?.name || (language === 'hi' ? 'मरीज' : 'Patient');

  // Formatted date localized to active language
  const formattedDate = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const currentRisk = patientData?.currentRiskLevel || 'LOW';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('patientDashboard.greeting', { name: displayName })}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-1 capitalize">
            {formattedDate}
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('patientDashboard.statusLabel')}
            </span>
            <RiskBadge level={currentRisk} />
          </div>
        </div>
      </div>

      {/* Hero Voice Check-in Card (Matches Mockup) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] text-white p-8 sm:p-12 shadow-2xl border border-indigo-900/40">
        {/* Subtle Decorative Vector Graphics */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Medical Cross Graphic */}
          <svg
            className="absolute -top-12 -right-12 w-80 h-80 text-white/5"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path d="M85 20 H115 V85 H180 V115 H115 V180 H85 V115 H20 V85 H85 Z" />
          </svg>
          {/* Wave ECG Graphic */}
          <svg
            className="absolute bottom-3 left-6 w-[480px] h-32 text-indigo-400/10 stroke-current fill-none stroke-[2.5]"
            viewBox="0 0 400 100"
          >
            <path d="M0,50 L90,50 L110,15 L125,85 L140,30 L155,70 L170,50 L400,50" />
          </svg>
          {/* Concentric Ambient Glow */}
          <div className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl transform -translate-y-1/2" />
        </div>

        <div className="relative z-10 max-w-2xl">
          {/* Overline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-5 backdrop-blur-sm">
            <Sparkles size={13} className="text-indigo-300 animate-pulse" />
            <span>{t('patientDashboard.heroTag')}</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            {t('patientDashboard.heroTitle')}
          </h2>

          {/* Description */}
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-normal">
            {t('patientDashboard.heroDescription')}
          </p>

          {/* Action Button with Soundwave */}
          <button
            type="button"
            onClick={handleOpenVoiceModal}
            className="group inline-flex items-center gap-3.5 px-8 py-4.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Mic size={22} className="text-white" />
            </span>
            <span>{t('patientDashboard.startVoiceCheckin')}</span>
            {/* Animated Sound Wave Bars */}
            <div className="flex items-center gap-1 pl-2">
              <span className="w-1 h-3.5 bg-white/70 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
              <span className="w-1 h-5.5 bg-white rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
              <span className="w-1 h-3.5 bg-white/70 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
            </div>
          </button>
        </div>
      </div>

      {/* Hands-Free Automated Voice Assistant Modal */}
      <RuralVoiceAssistantModal
        isOpen={voiceModalOpen}
        onClose={handleCloseVoiceModal}
        patient={patientData}
        onCompleted={fetchPatientData}
      />
    </div>
  );
}
