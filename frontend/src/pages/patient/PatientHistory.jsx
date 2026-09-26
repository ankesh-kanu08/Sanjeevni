import React, { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { ClipboardList, ArrowLeft, RefreshCw, Heart, Activity, Thermometer, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import patientService from '../../services/patientService';
import RiskBadge from '../../components/common/RiskBadge';

export default function PatientHistory() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const patientRes = await patientService.getMyRecord();
      const patientId = patientRes.data?._id || patientRes.data?.id;
      if (patientId) {
        const res = await patientService.getCheckIns(patientId);
        const checkinList = res.data?.data || res.data || [];
        setHistory(Array.isArray(checkinList) ? checkinList : []);
      }
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getMoodEmoji = (mood) => {
    if (mood === 'good' || mood === 'better') return '😊';
    if (mood === 'okay' || mood === 'same') return '😐';
    if (mood === 'bad' || mood === 'worse') return '😟';
    return '📝';
  };

  const getMoodText = (mood) => {
    if (mood === 'good' || mood === 'better') return t('patientCheckIn.moodBetter');
    if (mood === 'okay' || mood === 'same') return t('patientCheckIn.moodSame');
    if (mood === 'bad' || mood === 'worse') return t('patientCheckIn.moodWorse');
    return t('patientHistory.routineCheckIn');
  };

  const parseRecordDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isValid(d) ? d : null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patient/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('patientHistory.title')}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1">
          {t('patientHistory.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-medium flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>{t('patientHistory.loading')}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-slate-200/80">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-xl font-bold text-slate-800">{t('patientHistory.emptyTitle')}</h3>
          <p className="text-slate-500 mt-1 mb-6">{t('patientHistory.emptySubtitle')}</p>
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-md hover:bg-indigo-700 transition-colors"
          >
            {t('patientHistory.startCheckInBtn')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const dateObj = parseRecordDate(record.createdAt || record.date || record.timestamp);
            const formattedDate = dateObj
              ? new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(dateObj)
              : 'Recent';

            const symptoms = record.structuredSymptoms || record.symptoms || [];
            const vitals = record.vitals || record.extractedVitals || {};

            return (
              <div
                key={record._id || index}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getMoodEmoji(record.mood)}</span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        {getMoodText(record.mood)}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
                    </div>
                  </div>
                  {record.riskAssessment?.level && (
                    <RiskBadge level={record.riskAssessment.level} />
                  )}
                </div>

                {record.rawInput && (
                  <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                    "{record.rawInput}"
                  </p>
                )}

                {/* Vitals Summary */}
                {(vitals.spo2 || vitals.heartRate || vitals.temperature) && (
                  <div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-600">
                    {vitals.spo2 && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">
                        <Wind size={13} /> SpO2: {vitals.spo2}%
                      </span>
                    )}
                    {vitals.heartRate && (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-lg font-semibold">
                        <Heart size={13} /> HR: {vitals.heartRate} bpm
                      </span>
                    )}
                    {vitals.temperature && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-semibold">
                        <Thermometer size={13} /> Temp: {vitals.temperature}°F
                      </span>
                    )}
                  </div>
                )}

                {/* Symptoms List */}
                {symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {symptoms.map((s, sIdx) => {
                      const sName = typeof s === 'string' ? s : s.name;
                      const sSev = typeof s === 'object' ? s.severity : null;
                      return (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                        >
                          <Activity size={12} className="text-indigo-500" />
                          <span className="capitalize">{sName?.replace(/_/g, ' ')}</span>
                          {sSev && <span className="text-slate-400 font-normal">({sSev})</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
