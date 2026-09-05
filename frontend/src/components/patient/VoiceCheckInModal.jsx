import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, RefreshCw, Volume2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import patientService from '../../services/patientService';

// Multilingual keyword dictionary for rural & urban Indian post-discharge patients
const KEYWORD_MAP = {
  // Breathlessness
  'saans': 'breathlessness',
  'sans': 'breathlessness',
  'saas': 'breathlessness',
  'breathing': 'breathlessness',
  'breathless': 'breathlessness',
  'shortness of breath': 'breathlessness',
  // Fever
  'bukhar': 'fever',
  'bukhaar': 'fever',
  'fever': 'fever',
  'garam': 'fever',
  'tapman': 'fever',
  // Fatigue
  'thakaan': 'fatigue',
  'thakan': 'fatigue',
  'fatigue': 'fatigue',
  'kamzori': 'fatigue',
  'kamzoree': 'fatigue',
  'weakness': 'fatigue',
  'tired': 'fatigue',
  // Pain
  'dard': 'pain',
  'pain': 'pain',
  'dukh': 'pain',
  'body ache': 'pain',
  // Chest pain
  'chest pain': 'chest_pain',
  'seene mein dard': 'chest_pain',
  'seena': 'chest_pain',
  // Dizziness
  'chakkar': 'dizziness',
  'dizzy': 'dizziness',
  'dizziness': 'dizziness',
  // Cough
  'khansi': 'cough',
  'cough': 'cough',
  // Swelling
  'soojan': 'swelling',
  'swelling': 'swelling',
  'sooj': 'swelling'
};

export const extractSymptomsClientSide = (text) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Map();

  const isSevere = /bahut|bohot|zyada|severe|extreme|intense|unbearable/.test(lower);
  const isMild = /thoda|halka|halke|mild|slight|little bit/.test(lower);
  const severity = isSevere ? 'severe' : isMild ? 'mild' : 'moderate';

  const isWorsening = /kal se|badh|zyada|worse|worsening|increased|pehle se zyada/.test(lower);
  const isImproving = /kam|theek|better|improving|relief|araam/.test(lower);
  const trend = isWorsening ? 'worsening' : isImproving ? 'improving' : 'stable';

  for (const [kw, symptomName] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(kw)) {
      if (!found.has(symptomName)) {
        found.set(symptomName, {
          name: symptomName,
          displayName: symptomName.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          severity,
          trend
        });
      }
    }
  }

  return Array.from(found.values());
};

export default function VoiceCheckInModal({ isOpen, onClose, patientId, onCheckInComplete }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extractedSymptoms, setExtractedSymptoms] = useState([]);
  const [medsTaken, setMedsTaken] = useState('Yes');
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState('hi-IN'); // hi-IN or en-IN
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Update extracted symptoms whenever transcript changes
  useEffect(() => {
    if (transcript.trim()) {
      const detected = extractSymptomsClientSide(transcript);
      setExtractedSymptoms(detected);
    }
  }, [transcript]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Web Speech recognition is not supported in this browser. You can type below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permissions.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClear = () => {
    stopListening();
    setTranscript('');
    setExtractedSymptoms([]);
  };

  const handleSubmit = async () => {
    if (!transcript.trim() && extractedSymptoms.length === 0) {
      toast.error('Please speak or describe how you are feeling before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rawInput: transcript,
        channel: 'voice',
        language: language.startsWith('hi') ? 'hi' : 'en',
        mood: medsTaken === 'Yes' ? 'okay' : 'bad',
        structuredSymptoms: extractedSymptoms.map(s => ({
          name: s.name,
          severity: s.severity,
          trend: s.trend
        })),
        medicationAdherence: {
          taken: medsTaken === 'Yes',
          notes: medsTaken
        }
      };

      // Fallback: if patientId is missing, attempt to get it
      let targetId = patientId;
      if (!targetId) {
        const meRes = await patientService.getMyRecord();
        targetId = meRes.data?._id;
      }

      await patientService.submitCheckIn(targetId, payload);
      toast.success('Voice Check-In successfully submitted!', { icon: '✅' });

      if (onCheckInComplete) {
        onCheckInComplete();
      }
      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to record check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => { stopListening(); onClose(); }}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-semibold mb-2">
            <Volume2 size={16} /> Phase 3 • Voice & NLP Interaction
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Voice Health Check-In</h2>
          <p className="text-slate-600 text-sm mt-1">
            Tap the microphone and speak freely in Hindi or English (बोल कर बताएं)
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setLanguage('hi-IN'); if (isListening) { stopListening(); } }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${language === 'hi-IN' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >
            🇮🇳 Hindi (हिंदी)
          </button>
          <button
            type="button"
            onClick={() => { setLanguage('en-IN'); if (isListening) { stopListening(); } }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${language === 'en-IN' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >
            English
          </button>
        </div>

        {/* Big Microphone Button */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="relative">
            {isListening && (
              <>
                <span className="absolute -inset-3 rounded-full bg-red-400/40 animate-ping" />
                <span className="absolute -inset-6 rounded-full bg-red-400/20 animate-pulse" />
              </>
            )}
            <button
              onClick={handleToggleListening}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-600 text-white ring-4 ring-red-200 shadow-red-300'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'
              }`}
            >
              {isListening ? <MicOff size={44} className="animate-pulse" /> : <Mic size={44} />}
            </button>
          </div>

          <p className="mt-4 font-bold text-lg text-slate-800">
            {isListening ? (
              <span className="text-red-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                Listening... (सुन रहे हैं)
              </span>
            ) : (
              'Tap to Speak (बोलने के लिए दबाएं)'
            )}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Example: "Kal se saans lene mein thodi dikkat hai aur bukhar hai"
          </p>
        </div>

        {/* Live Transcript Box */}
        <div className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Spoken Words (आपकी बात)
            </span>
            {transcript && (
              <button
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 font-medium"
              >
                <RefreshCw size={12} /> Clear
              </button>
            )}
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken words will appear here in real time, or you can type here..."
            className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-800 font-medium text-base resize-none min-h-[70px]"
          />
        </div>

        {/* AI Symptom Extraction Preview */}
        {extractedSymptoms.length > 0 && (
          <div className="mt-4 bg-teal-50/70 rounded-2xl p-4 border border-teal-200">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-teal-600" />
              Sanjeevni AI Detected Symptoms:
            </p>
            <div className="flex flex-wrap gap-2">
              {extractedSymptoms.map((symp, i) => (
                <div
                  key={i}
                  className="bg-white px-3 py-1.5 rounded-xl border border-teal-200 shadow-sm flex items-center gap-2"
                >
                  <span className="font-bold text-slate-800 text-sm">{symp.displayName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    symp.severity === 'severe' ? 'bg-red-100 text-red-700' :
                    symp.severity === 'mild' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {symp.severity}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">({symp.trend})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medication Adherence Confirmation */}
        <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-700">
            Did you take your prescribed medicines today?
          </span>
          <div className="flex gap-2">
            {['Yes', 'Partially', 'No'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMedsTaken(opt)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  medsTaken === opt
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => { stopListening(); onClose(); }}
            className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!transcript.trim() && extractedSymptoms.length === 0)}
            className="flex-2 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle2 size={18} /> Submit Voice Check-In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
