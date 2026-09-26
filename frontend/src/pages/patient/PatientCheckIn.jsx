import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Mic, Square, Sparkles, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import patientService from '../../services/patientService';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

const SYMPTOMS = [
  'Breathlessness',
  'Fever',
  'Pain',
  'Cough',
  'Fatigue',
  'Dizziness',
  'Loss of Appetite',
  'Weakness',
  'Chest Pain',
  'Swelling'
];

export default function PatientCheckIn() {
  const { user } = useAuth();
  const { language: currentLang, speechLocale, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    feelingDesc: '',
    mood: location.state?.mood || '',
    symptoms: [],
    medsTaken: '',
    vitals: {
      spo2: '',
      heartRate: '',
      temperature: ''
    }
  });

  const [symptomDetails, setSymptomDetails] = useState({});
  const [showVitals, setShowVitals] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [language, setLanguage] = useState(speechLocale || (currentLang === 'hi' ? 'hi-IN' : 'en-IN'));
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    setLanguage(speechLocale || (currentLang === 'hi' ? 'hi-IN' : 'en-IN'));
  }, [currentLang, speechLocale]);

  const applyExtractedSymptoms = useCallback(async (text) => {
    if (!patientId || !text.trim()) return;
    setExtracting(true);
    try {
      const extracted = await patientService.extractSymptoms(patientId, text);
      extracted.forEach((symptom) => {
        const label = SYMPTOMS.find((item) => item.toLowerCase().replace(/\s+/g, '_') === symptom.name);
        if (!label) return;
        setFormData((current) => ({
          ...current,
          symptoms: current.symptoms.includes(label) ? current.symptoms : [...current.symptoms, label]
        }));
        setSymptomDetails((current) => ({
          ...current,
          [label]: {
            severity: symptom.severity[0].toUpperCase() + symptom.severity.slice(1),
            trend: symptom.trend === 'worsening' ? 'Getting Worse' : symptom.trend === 'improving' ? 'Getting Better' : 'Same'
          }
        }));
      });
      if (extracted.length) toast.success('Symptoms identified from your speech.');
    } catch {
      // Non-critical fallback
    } finally {
      setExtracting(false);
    }
  }, [patientId]);

  const handleVoiceResult = useCallback((text) => {
    setFormData((current) => ({
      ...current,
      feelingDesc: current.feelingDesc ? `${current.feelingDesc} ${text}` : text
    }));
    applyExtractedSymptoms(text);
  }, [applyExtractedSymptoms]);

  const { isSupported, isListening, error: voiceError, startListening, stopListening } = useSpeechRecognition({
    language,
    onResult: handleVoiceResult
  });

  useEffect(() => {
    if (location.state?.startVoice && isSupported) startListening();
  }, [location.state?.startVoice, isSupported, startListening]);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await patientService.getMyRecord();
        setPatientId(res.data?._id || res.data?.id);
      } catch (err) {
        console.error('Failed to fetch patient record', err);
      }
    };
    fetchPatient();
  }, []);

  const toggleSymptom = (symptom) => {
    setFormData(prev => {
      const isSelected = prev.symptoms.includes(symptom);
      if (isSelected) {
        const newSymptoms = prev.symptoms.filter(s => s !== symptom);
        const newDetails = { ...symptomDetails };
        delete newDetails[symptom];
        setSymptomDetails(newDetails);
        return { ...prev, symptoms: newSymptoms };
      } else {
        setSymptomDetails({ ...symptomDetails, [symptom]: { severity: 'Moderate', trend: 'Same' } });
        return { ...prev, symptoms: [...prev.symptoms, symptom] };
      }
    });
  };

  const updateSymptomDetail = (symptom, field, value) => {
    setSymptomDetails(prev => ({
      ...prev,
      [symptom]: { ...prev[symptom], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let targetId = patientId;
      if (!targetId) {
        try {
          const pRes = await patientService.getMyRecord();
          targetId = pRes.data?._id || pRes.data?.id;
        } catch (e) {
          console.warn('Could not fetch patient record prior to submission:', e);
        }
      }

      const structuredSymptoms = formData.symptoms.map(s => {
        const details = symptomDetails[s] || {};
        const trendVal = details.trend === 'Getting Worse' ? 'worsening' : details.trend === 'Getting Better' ? 'improving' : 'stable';
        const sevVal = (details.severity || 'moderate').toLowerCase();
        return {
          name: s.toLowerCase().replace(/\s+/g, '_'),
          severity: ['mild', 'moderate', 'severe'].includes(sevVal) ? sevVal : 'moderate',
          trend: ['stable', 'improving', 'worsening'].includes(trendVal) ? trendVal : 'stable'
        };
      });

      const moodMap = {
        better: 'good',
        same: 'okay',
        worse: 'bad',
        good: 'good',
        okay: 'okay',
        bad: 'bad'
      };

      const payload = {
        rawInput: formData.feelingDesc || '',
        mood: moodMap[formData.mood] || 'okay',
        structuredSymptoms,
        medicationAdherence: {
          taken: formData.medsTaken === 'Yes',
          notes: formData.medsTaken || 'Reported via web form'
        },
        channel: 'web'
      };

      await patientService.submitCheckIn(targetId || 'me', payload);

      const vitals = Object.fromEntries(Object.entries(formData.vitals).filter(([, value]) => value !== ''));
      if (Object.keys(vitals).length > 0 && targetId) {
        try {
          await patientService.submitVitals(targetId, {
            source: 'patient',
            ...Object.fromEntries(Object.entries(vitals).map(([key, value]) => [key, Number(value)]))
          });
        } catch (vErr) {
          console.warn('Vitals submission error:', vErr);
        }
      }

      setSubmitted(true);
      toast.success(t('patientCheckIn.successToast'));
    } catch (err) {
      console.error('Checkin submit error:', err);
      toast.error('Failed to submit check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
          {t('patientCheckIn.successToast')}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mb-8 max-w-md">
          {currentLang === 'hi'
            ? 'आपकी दैनिक स्थिति संजीवनी AI द्वारा दर्ज कर ली गई है।'
            : 'Thank you. Your symptoms and vitals have been recorded for your care team.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => navigate('/patient/history')}
            className="flex-1 bg-indigo-600 text-white text-sm sm:text-base font-semibold py-3.5 px-6 rounded-2xl shadow-md hover:bg-indigo-700 transition-colors"
          >
            {t('patientHistory.title')}
          </button>
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="flex-1 bg-slate-100 text-slate-700 text-sm sm:text-base font-semibold py-3.5 px-6 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            {t('nav.dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('patientCheckIn.title')}
        </h1>
        <p className="text-slate-500 font-medium text-sm sm:text-base mt-1">
          {t('patientCheckIn.subtitle')}
        </p>
      </div>

      {/* Voice or Text Input */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">
            {t('patientCheckIn.moodQuestion')}
          </h2>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 ${
              isListening ? 'bg-red-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {isListening ? <Square size={14} /> : <Mic size={14} />}
            {isListening ? t('patientCheckIn.stopListening') : t('patientCheckIn.tapToSpeak')}
          </button>
        </div>

        {extracting && (
          <p className="text-xs font-semibold text-indigo-600 animate-pulse">
            Analyzing speech...
          </p>
        )}

        <textarea
          value={formData.feelingDesc}
          onChange={(e) => setFormData({ ...formData, feelingDesc: e.target.value })}
          className="w-full p-4 border border-slate-200 rounded-xl text-base min-h-[110px] focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
          placeholder={t('patientCheckIn.speakNaturally')}
        />
      </div>

      {/* Symptoms Multi-Select */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {t('patientCheckIn.selectSymptoms')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SYMPTOMS.map((symptom) => {
            const isSelected = formData.symptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                onClick={() => toggleSymptom(symptom)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {symptom}
              </button>
            );
          })}
        </div>
      </div>

      {/* Symptom Details (Severity & Trend) */}
      {formData.symptoms.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900">
            {t('patientCheckIn.symptomsTitle')}
          </h2>
          {formData.symptoms.map((symptom) => (
            <div key={symptom} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <h3 className="text-base font-bold text-slate-800">{symptom}</h3>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                  {t('patientCheckIn.severity')}:
                </p>
                <div className="flex gap-2">
                  {['Mild', 'Moderate', 'Severe'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => updateSymptomDetail(symptom, 'severity', sev)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        symptomDetails[symptom]?.severity === sev
                          ? (sev === 'Mild' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : sev === 'Moderate' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-red-100 border-red-500 text-red-800')
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {t(`patientCheckIn.${sev.toLowerCase()}`) || sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                  {t('patientCheckIn.trend')}:
                </p>
                <div className="flex gap-2">
                  {['Getting Better', 'Same', 'Getting Worse'].map((trend) => (
                    <button
                      key={trend}
                      type="button"
                      onClick={() => updateSymptomDetail(symptom, 'trend', trend)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        symptomDetails[symptom]?.trend === trend
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {trend === 'Getting Better' ? t('patientCheckIn.gettingBetter') : trend === 'Getting Worse' ? t('patientCheckIn.gettingWorse') : t('patientCheckIn.same')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medication Adherence */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {t('patientCheckIn.medsTaken')}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {['Yes', 'Partially', 'No'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFormData({ ...formData, medsTaken: opt })}
              className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                formData.medsTaken === opt
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt === 'Yes' ? t('common.yes') : opt === 'No' ? t('common.no') : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Vitals Expandable Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVitals(!showVitals)}
          className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <h2 className="text-lg font-bold text-slate-900">{t('patientCheckIn.vitalsTitle')}</h2>
          {showVitals ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        {showVitals && (
          <div className="p-6 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                {t('patientCheckIn.spo2')}
              </label>
              <input
                type="number"
                value={formData.vitals.spo2}
                onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value } })}
                className="w-full text-lg p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="98"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                {t('patientCheckIn.heartRate')}
              </label>
              <input
                type="number"
                value={formData.vitals.heartRate}
                onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, heartRate: e.target.value } })}
                className="w-full text-lg p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="72"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
                {t('patientCheckIn.temperature')}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.vitals.temperature}
                onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature: e.target.value } })}
                className="w-full text-lg p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="98.6"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 disabled:opacity-60 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
      >
        {loading ? t('patientCheckIn.submitting') : t('patientCheckIn.submitBtn')}
      </button>
    </div>
  );
}
