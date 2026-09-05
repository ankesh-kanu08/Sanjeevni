import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Mic, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import patientService from '../../services/patientService';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

const SYMPTOMS = ['Breathlessness', 'Fever', 'Pain', 'Cough', 'Fatigue', 'Dizziness', 'Loss of Appetite', 'Weakness', 'Chest Pain', 'Swelling'];

export default function PatientCheckIn() {
  const { user } = useAuth();
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
  const [language, setLanguage] = useState('en-IN');
  const [extracting, setExtracting] = useState(false);

  const applyExtractedSymptoms = useCallback(async (text) => {
    if (!patientId || !text.trim()) return;
    setExtracting(true);
    try {
      const extracted = await patientService.extractSymptoms(patientId, text);
      extracted.forEach((symptom) => {
        const label = SYMPTOMS.find((item) => item.toLowerCase().replace(/\s+/g, '_') === symptom.name);
        if (!label) return;
        setFormData((current) => ({ ...current, symptoms: current.symptoms.includes(label) ? current.symptoms : [...current.symptoms, label] }));
        setSymptomDetails((current) => ({ ...current, [label]: { severity: symptom.severity[0].toUpperCase() + symptom.severity.slice(1), trend: symptom.trend === 'worsening' ? 'Getting Worse' : symptom.trend === 'improving' ? 'Getting Better' : 'Same' } }));
      });
      if (extracted.length) toast.success('Symptoms identified from your words. Please review them below.');
    } catch {
      toast('Your words were added. Please select any symptoms below.', { icon: 'ℹ️' });
    } finally { setExtracting(false); }
  }, [patientId]);
  const handleVoiceResult = useCallback((text) => {
    setFormData((current) => ({ ...current, feelingDesc: current.feelingDesc ? `${current.feelingDesc} ${text}` : text }));
    applyExtractedSymptoms(text);
  }, [applyExtractedSymptoms]);
  const { isSupported, isListening, error: voiceError, startListening, stopListening } = useSpeechRecognition({ language, onResult: handleVoiceResult });

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
      const structuredSymptoms = formData.symptoms.map(s => ({
        name: s.toLowerCase().replace(/\s+/g, '_'),
        severity: (symptomDetails[s]?.severity || 'moderate').toLowerCase(),
        trend: symptomDetails[s]?.trend === 'Getting Worse' ? 'worsening' : symptomDetails[s]?.trend === 'Getting Better' ? 'improving' : 'stable'
      }));
      const payload = {
        rawInput: formData.feelingDesc,
        mood: formData.mood || 'okay',
        structuredSymptoms,
        medicationAdherence: {
          taken: formData.medsTaken === 'Yes',
          notes: formData.medsTaken
        },
        channel: 'web'
      };
      await patientService.submitCheckIn(patientId, payload);
      const vitals = Object.fromEntries(Object.entries(formData.vitals).filter(([, value]) => value !== ''));
      if (Object.keys(vitals).length > 0) {
        await patientService.submitVitals(patientId, {
          source: 'patient',
          ...Object.fromEntries(Object.entries(vitals).map(([key, value]) => [key, Number(value)]))
        });
      }
      setSubmitted(true);
      toast.success('Check-in completed!');
      setTimeout(() => navigate('/patient/dashboard'), 3000);
    } catch (err) {
      toast.error('Failed to submit check-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 size={120} className="text-emerald-500 mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Check-in submitted successfully!</h1>
        <p className="text-2xl text-gray-600 mb-8">Thank you for updating us. Your healthcare team has been notified.</p>
        <button 
          onClick={() => navigate('/patient/dashboard')}
          className="bg-teal-600 text-white text-xl font-bold py-4 px-8 rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Daily Check-In</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">How are you feeling?</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="en-IN">English</option><option value="hi-IN">हिंदी / Hindi</option></select>
          <button type="button" onClick={isListening ? stopListening : startListening} disabled={!isSupported} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white disabled:bg-slate-300 ${isListening ? 'bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}>{isListening ? <Square size={18} /> : <Mic size={18} />}{isListening ? 'Stop listening' : 'Speak instead'}</button>
          {extracting && <span className="self-center text-sm text-teal-700">Understanding your response…</span>}
        </div>
        {!isSupported && <p className="text-sm text-amber-700 mb-3">Voice input is not supported in this browser. You can still type your response.</p>}
        {voiceError && <p className="text-sm text-red-600 mb-3">{voiceError}</p>}
        <textarea
          value={formData.feelingDesc}
          onChange={(e) => setFormData({...formData, feelingDesc: e.target.value})}
          className="w-full p-4 border border-gray-300 rounded-xl text-lg min-h-[120px] focus:ring-teal-500 focus:border-teal-500"
          placeholder="Describe how you are feeling today..."
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Select any symptoms you're experiencing:</h2>
        <div className="grid grid-cols-2 gap-4">
          {SYMPTOMS.map(symptom => {
            const isSelected = formData.symptoms.includes(symptom);
            return (
              <button
                key={symptom}
                onClick={() => toggleSymptom(symptom)}
                className={`p-4 rounded-xl border-2 text-lg font-medium transition-colors ${
                  isSelected ? 'bg-teal-50 border-teal-500 text-teal-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {symptom}
              </button>
            );
          })}
        </div>
      </div>

      {formData.symptoms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-6">How bad are these symptoms?</h2>
          {formData.symptoms.map(symptom => (
            <div key={symptom} className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{symptom}</h3>
              
              <p className="text-lg mb-2">Severity:</p>
              <div className="flex gap-2 mb-4">
                {['Mild', 'Moderate', 'Severe'].map(sev => (
                  <button
                    key={sev}
                    onClick={() => updateSymptomDetail(symptom, 'severity', sev)}
                    className={`flex-1 py-3 rounded-lg font-medium text-lg border ${
                      symptomDetails[symptom]?.severity === sev 
                        ? (sev === 'Mild' ? 'bg-green-100 border-green-500' : sev === 'Moderate' ? 'bg-amber-100 border-amber-500' : 'bg-red-100 border-red-500')
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <p className="text-lg mb-2">Trend:</p>
              <div className="flex gap-2">
                {['Getting Better', 'Same', 'Getting Worse'].map(trend => (
                  <button
                    key={trend}
                    onClick={() => updateSymptomDetail(symptom, 'trend', trend)}
                    className={`flex-1 py-3 rounded-lg font-medium text-base border ${
                      symptomDetails[symptom]?.trend === trend
                        ? 'bg-blue-100 border-blue-500 text-blue-800'
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Did you take all your medicines today?</h2>
        <div className="flex flex-col gap-3">
          {['Yes', 'Partially', 'No'].map(opt => (
            <button
              key={opt}
              onClick={() => setFormData({...formData, medsTaken: opt})}
              className={`py-4 rounded-xl text-xl font-medium border-2 ${
                formData.medsTaken === opt
                  ? 'bg-teal-50 border-teal-500 text-teal-800'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden">
        <button 
          onClick={() => setShowVitals(!showVitals)}
          className="w-full p-6 flex justify-between items-center text-left"
        >
          <h2 className="text-2xl font-semibold">Enter your vitals (Optional)</h2>
          {showVitals ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
        </button>
        
        {showVitals && (
          <div className="p-6 pt-0 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-lg text-gray-700 mb-2">Oxygen (SpO2 %)</label>
              <input 
                type="number" 
                value={formData.vitals.spo2}
                onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, spo2: e.target.value}})}
                className="w-full text-2xl p-4 border border-gray-300 rounded-xl focus:ring-teal-500 focus:border-teal-500" 
                placeholder="98" 
              />
            </div>
            <div>
              <label className="block text-lg text-gray-700 mb-2">Heart Rate (bpm)</label>
              <input 
                type="number" 
                value={formData.vitals.heartRate}
                onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, heartRate: e.target.value}})}
                className="w-full text-2xl p-4 border border-gray-300 rounded-xl focus:ring-teal-500 focus:border-teal-500" 
                placeholder="72" 
              />
            </div>
            <div>
              <label className="block text-lg text-gray-700 mb-2">Temp (°F)</label>
              <input 
                type="number" 
                step="0.1"
                value={formData.vitals.temperature}
                onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, temperature: e.target.value}})}
                className="w-full text-2xl p-4 border border-gray-300 rounded-xl focus:ring-teal-500 focus:border-teal-500" 
                placeholder="98.6" 
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold py-5 rounded-2xl shadow-lg disabled:opacity-70 transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit Check-In'}
      </button>
    </div>
  );
}
