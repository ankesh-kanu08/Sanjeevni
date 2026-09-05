import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { ClipboardList, Mic, Globe, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import patientService from '../../services/patientService';

export default function PatientHistory() {
  const { user } = useAuth();
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

  const getMoodLabel = (mood) => {
    if (mood === 'good' || mood === 'better') return 'पहले से बेहतर (Feeling Better)';
    if (mood === 'okay' || mood === 'same') return 'वैसा ही है (About Same)';
    if (mood === 'bad' || mood === 'worse') return 'तकलीफ बढ़ी है (Feeling Worse)';
    return 'दैनिक जांच (Routine Check-in)';
  };

  const parseRecordDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isValid(d) ? d : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-3xl mx-auto pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patient/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={16} /> वापस जाएं (Back)
        </button>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
        >
          <RefreshCw size={14} /> ताज़ा करें (Refresh)
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">मेरी पिछली जांचें (My Health History)</h1>
        <p className="text-slate-600 text-sm mt-1">
          आपके द्वारा की गई सभी दैनिक आवाज़ और टेक्स्ट जांचों का रिकॉर्ड
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 font-medium flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>पिछली जांचें लोड हो रही हैं...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-slate-200">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-xl font-bold text-slate-800">अभी तक कोई जांच दर्ज नहीं है</h3>
          <p className="text-slate-500 mt-1 mb-6">अपनी पहली स्वास्थ्य जांच पूरी करें।</p>
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="px-6 py-3 bg-teal-600 text-white font-bold rounded-2xl shadow-md hover:bg-teal-700 transition-colors"
          >
            जांच शुरू करें (Start Check-in)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const dateObj = parseRecordDate(record.createdAt || record.date || record.timestamp);
            const formattedDate = dateObj ? format(dateObj, 'MMMM do, yyyy') : 'Recently';
            const formattedTime = dateObj ? format(dateObj, 'h:mm a') : '';
            const relativeTime = dateObj ? formatDistanceToNow(dateObj, { addSuffix: true }) : '';

            const symptomsList = record.structuredSymptoms && record.structuredSymptoms.length > 0
              ? record.structuredSymptoms
              : (record.symptoms || []).map(s => typeof s === 'string' ? { name: s } : s);

            const inputContent = record.rawInput || record.feelingDesc;
            const isVoice = record.channel === 'voice' || record.language === 'hi' || record.language === 'hi-IN';

            return (
              <div
                key={record._id || index}
                className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200 transition-all hover:shadow-md"
              >
                {/* Header with Date, Channel, and Mood Emoji */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-900">
                        {formattedDate}
                      </span>
                      {formattedTime && (
                        <span className="text-xs text-slate-500 font-medium">
                          at {formattedTime}
                        </span>
                      )}
                      {relativeTime && (
                        <span className="text-[11px] text-slate-400">
                          ({relativeTime})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      {isVoice ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          <Mic size={12} /> आवाज़ से जांच (Voice Check-in)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          <Globe size={12} /> वेब फॉर्म (Web Check-in)
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        {getMoodLabel(record.mood)}
                      </span>
                    </div>
                  </div>

                  <span className="text-3xl select-none" title={record.mood || 'Check-in'}>
                    {getMoodEmoji(record.mood)}
                  </span>
                </div>

                {/* Content Section */}
                <div className="mt-4 space-y-3">
                  {/* Spoken / Written words */}
                  {inputContent && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        आपकी बात (Reported Message):
                      </p>
                      <p className="text-sm font-medium text-slate-800 italic">
                        "{inputContent}"
                      </p>
                    </div>
                  )}

                  {/* Detected / Reported Symptoms */}
                  {symptomsList.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                        <Sparkles size={13} className="text-teal-600" />
                        लक्षण (Reported Symptoms):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {symptomsList.map((symp, i) => {
                          const sympName = (symp.name || symp).replace(/_/g, ' ');
                          const severity = symp.severity;
                          const trend = symp.trend;

                          return (
                            <span
                              key={i}
                              className="bg-white px-3 py-1 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 shadow-2xs flex items-center gap-1.5 capitalize"
                            >
                              <span>{sympName}</span>
                              {severity && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  severity === 'severe' ? 'bg-red-100 text-red-700' :
                                  severity === 'mild' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {severity}
                                </span>
                              )}
                              {trend && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({trend})
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Medication Adherence */}
                  {record.medicationAdherence && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                      <span className="font-semibold">दवाई ली:</span>
                      {record.medicationAdherence.taken ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 size={14} className="text-emerald-600" /> समय पर ली गई (Taken)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                          <XCircle size={14} className="text-amber-600" /> नहीं ली (Missed)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
