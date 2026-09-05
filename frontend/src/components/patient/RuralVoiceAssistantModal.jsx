import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Volume2, VolumeX, RefreshCw, CheckCircle2, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import patientService from '../../services/patientService';
import { extractSymptomsClientSide } from './VoiceCheckInModal';

// Natural voice scripts in Hindi and English
const SCRIPT = {
  'hi-IN': {
    welcome: (name) => `नमस्ते ${name || ''} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपकी तबीयत कैसी लग रही है? कृपया बोल कर बताएं।`,
    askBreathlessness: "क्या आपको सांस लेने में तकलीफ हो रही है, या चलने फिरने पर सांस फूल रही है?",
    askMedicines: "क्या आपने आज अपनी डॉक्टर द्वारा दी गई सभी दवाइयाँ समय पर ली हैं?",
    closing: "धन्यवाद। आपकी स्वास्थ्य जानकारी दर्ज कर ली गई है और आपके डॉक्टर तक भेज दी गई है। आप कृपया आराम करें।",
    listeningText: "सुन रहे हैं... कृपया बोलिए",
    speakingText: "संजीवनी साथी बोल रही हैं...",
    completedText: "जांच पूरी हो गई!",
    langLabel: "हिंदी"
  },
  'en-IN': {
    welcome: (name) => `Hello ${name || ''}. I am your Sanjeevni care companion. How are you feeling today? Please speak after the prompt.`,
    askBreathlessness: "Are you having any shortness of breath or difficulty breathing?",
    askMedicines: "Did you take all your prescribed medicines today?",
    closing: "Thank you. Your health update has been recorded and shared with your care team. Please take rest.",
    listeningText: "Listening... Please speak now",
    speakingText: "Sanjeevni AI is speaking...",
    completedText: "Voice Check-in Completed!",
    langLabel: "English"
  }
};

export default function RuralVoiceAssistantModal({ isOpen, onClose, patient, onCompleted }) {
  const [language, setLanguage] = useState('hi-IN');
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState('idle'); // 'speaking' | 'listening' | 'done' | 'idle'
  const [conversation, setConversation] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [collectedSymptoms, setCollectedSymptoms] = useState([]);
  const [medsAnswer, setMedsAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [muted, setMuted] = useState(false);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const isCancelledRef = useRef(false);

  const patientName = patient?.user?.name || patient?.name || 'मरीज';
  const t = SCRIPT[language] || SCRIPT['hi-IN'];

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentTranscript]);

  // Completely abort and cancel all active voice synthesis and recognition
  const stopAllAudio = useCallback(() => {
    isCancelledRef.current = true;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setStatus('idle');
  }, []);

  // Text-To-Speech with strict cancellation checks
  const speakAloud = useCallback((text) => {
    return new Promise((resolve) => {
      if (isCancelledRef.current || muted || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      setStatus('speaking');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => v.lang === language || v.lang.startsWith(language.split('-')[0]));
      if (targetVoice) utterance.voice = targetVoice;

      utterance.onend = () => {
        setStatus('idle');
        resolve();
      };
      utterance.onerror = () => {
        setStatus('idle');
        resolve();
      };

      if (isCancelledRef.current) {
        resolve();
        return;
      }

      window.speechSynthesis.speak(utterance);
    });
  }, [language, muted]);

  // Speech-To-Text with strict cancellation checks
  const listenToPatient = useCallback(() => {
    return new Promise((resolve) => {
      if (isCancelledRef.current) {
        resolve('');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Voice recognition is not supported in this browser.');
        resolve('');
        return;
      }

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      let finalResult = '';

      recognition.onstart = () => {
        if (isCancelledRef.current) {
          try { recognition.abort(); } catch (e) {}
          return;
        }
        setStatus('listening');
        setCurrentTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.results.length - 1; i < event.results.length; i++) {
          const item = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalResult += item + ' ';
          } else {
            interim += item;
          }
        }
        setCurrentTranscript(finalResult.trim() || interim);
      };

      recognition.onerror = () => {
        setStatus('idle');
        resolve(finalResult.trim());
      };

      recognition.onend = () => {
        setStatus('idle');
        resolve(finalResult.trim() || currentTranscript.trim());
      };

      recognitionRef.current = recognition;
      try {
        if (!isCancelledRef.current) {
          recognition.start();
        } else {
          resolve('');
        }
      } catch (err) {
        setStatus('idle');
        resolve('');
      }
    });
  }, [language, currentTranscript]);

  // Controlled, cancellable conversation step runner
  const runStep = useCallback(async (stepNumber) => {
    if (!isOpen || isCancelledRef.current) return;

    if (stepNumber === 1) {
      const greeting = t.welcome(patientName);
      setConversation([{ sender: 'ai', text: greeting }]);
      await speakAloud(greeting);

      if (isCancelledRef.current) return;
      const patientSpoken = await listenToPatient();

      if (isCancelledRef.current) return;
      if (patientSpoken) {
        setConversation(prev => [...prev, { sender: 'patient', text: patientSpoken }]);
        const detected = extractSymptomsClientSide(patientSpoken);
        if (detected.length > 0) setCollectedSymptoms(prev => [...prev, ...detected]);
      }

      if (isCancelledRef.current) return;
      setStep(2);
      runStep(2);
    } else if (stepNumber === 2) {
      if (isCancelledRef.current) return;
      const question = t.askBreathlessness;
      setConversation(prev => [...prev, { sender: 'ai', text: question }]);
      await speakAloud(question);

      if (isCancelledRef.current) return;
      const patientSpoken = await listenToPatient();

      if (isCancelledRef.current) return;
      if (patientSpoken) {
        setConversation(prev => [...prev, { sender: 'patient', text: patientSpoken }]);
        const detected = extractSymptomsClientSide(patientSpoken);
        if (detected.length > 0) setCollectedSymptoms(prev => [...prev, ...detected]);
      }

      if (isCancelledRef.current) return;
      setStep(3);
      runStep(3);
    } else if (stepNumber === 3) {
      if (isCancelledRef.current) return;
      const question = t.askMedicines;
      setConversation(prev => [...prev, { sender: 'ai', text: question }]);
      await speakAloud(question);

      if (isCancelledRef.current) return;
      const patientSpoken = await listenToPatient();

      if (isCancelledRef.current) return;
      if (patientSpoken) {
        setConversation(prev => [...prev, { sender: 'patient', text: patientSpoken }]);
        const lower = patientSpoken.toLowerCase();
        const taken = /haan|ha|yes|li hai|le li|taken/.test(lower) && !/nahi|no|bhookh|bhool/.test(lower);
        setMedsAnswer(taken ? 'Yes' : 'No');
      } else {
        setMedsAnswer('Yes');
      }

      if (isCancelledRef.current) return;
      setStep(4);
      runStep(4);
    } else if (stepNumber === 4) {
      if (isCancelledRef.current) return;
      const closingMsg = t.closing;
      setConversation(prev => [...prev, { sender: 'ai', text: closingMsg }]);
      setStatus('done');
      await speakAloud(closingMsg);
    }
  }, [isOpen, t, patientName, speakAloud, listenToPatient]);

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      isCancelledRef.current = false;
      setStep(1);
      setConversation([]);
      setCollectedSymptoms([]);
      setMedsAnswer(null);
      runStep(1);
    } else {
      stopAllAudio();
    }
    return () => {
      stopAllAudio();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Explicit close handler
  const handleModalClose = () => {
    stopAllAudio();
    onClose();
  };

  const handleToggleMute = () => {
    if (!muted) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setMuted(true);
      toast('आवाज़ बंद कर दी गई (Voice Muted)', { icon: '🔇' });
    } else {
      setMuted(false);
      toast('आवाज़ चालू है (Voice Unmuted)', { icon: '🔊' });
    }
  };

  const handleFinalSubmit = async () => {
    stopAllAudio();
    setSubmitting(true);
    try {
      const fullVoiceDialogue = conversation
        .map(c => `${c.sender === 'ai' ? 'AI: ' : 'Patient: '}${c.text}`)
        .join('\n');

      const payload = {
        rawInput: fullVoiceDialogue,
        channel: 'voice',
        language: language.startsWith('hi') ? 'hi' : 'en',
        mood: medsAnswer === 'Yes' ? 'okay' : 'bad',
        structuredSymptoms: collectedSymptoms.map(s => ({
          name: s.name,
          severity: s.severity || 'moderate',
          trend: s.trend || 'stable'
        })),
        medicationAdherence: {
          taken: medsAnswer === 'Yes',
          notes: medsAnswer || 'Voice reported'
        }
      };

      const targetId = patient?._id || patient?.id;
      await patientService.submitCheckIn(targetId, payload);
      toast.success('जांच सफलतापूर्वक दर्ज हो गई!', { icon: '✅' });

      if (onCompleted) onCompleted();
      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('जांच दर्ज करने में त्रुटि हुई, कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl relative border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Top Header - Fixed */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                आवाज़ से स्वास्थ्य जांच
              </h2>
              <p className="text-xs text-slate-500">Autonomous Rural Voice Consultation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute Voice Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-full border transition-colors ${
                muted ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
              title={muted ? 'Unmute voice' : 'Mute voice'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Language Switch */}
            <div className="flex bg-slate-100 p-0.5 rounded-full text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  setLanguage('hi-IN');
                  isCancelledRef.current = false;
                  setStep(1);
                  runStep(1);
                }}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  language === 'hi-IN' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  setLanguage('en-IN');
                  isCancelledRef.current = false;
                  setStep(1);
                  runStep(1);
                }}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  language === 'en-IN' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Eng
              </button>
            </div>

            {/* Safe Close Button */}
            <button
              onClick={handleModalClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              title="Close and stop audio"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Animated AI Voice Avatar & Wave */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-teal-50/70 to-slate-50 border border-teal-100/60">
            <div className="relative mb-3">
              {status === 'speaking' && (
                <span className="absolute -inset-3 rounded-full bg-teal-400/30 animate-ping" />
              )}
              {status === 'listening' && (
                <span className="absolute -inset-3 rounded-full bg-red-500/35 animate-ping" />
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                status === 'speaking'
                  ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105'
                  : status === 'listening'
                  ? 'bg-red-600 text-white ring-4 ring-red-100 scale-105'
                  : 'bg-slate-800 text-white'
              }`}>
                {status === 'speaking' ? (
                  <Volume2 size={36} className="animate-pulse" />
                ) : status === 'listening' ? (
                  <Mic size={36} className="animate-pulse" />
                ) : (
                  <CheckCircle2 size={36} className="text-emerald-400" />
                )}
              </div>
            </div>

            {/* Voice Wave Animation Bars */}
            {(status === 'speaking' || status === 'listening') && (
              <div className="flex items-center gap-1.5 mb-2 h-5">
                <span className={`w-1 rounded-full ${status === 'listening' ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_100ms] h-3`} />
                <span className={`w-1 rounded-full ${status === 'listening' ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_300ms] h-5`} />
                <span className={`w-1 rounded-full ${status === 'listening' ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_150ms] h-4`} />
                <span className={`w-1 rounded-full ${status === 'listening' ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_400ms] h-5`} />
                <span className={`w-1 rounded-full ${status === 'listening' ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_200ms] h-2`} />
              </div>
            )}

            <p className="font-extrabold text-base text-slate-800">
              {status === 'speaking' && <span className="text-teal-700">{t.speakingText}</span>}
              {status === 'listening' && <span className="text-red-600">{t.listeningText}</span>}
              {status === 'done' && <span className="text-emerald-700">{t.completedText}</span>}
              {status === 'idle' && <span className="text-slate-600">बातचीत जारी है...</span>}
            </p>

            {currentTranscript && status === 'listening' && (
              <p className="mt-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 text-center max-w-sm">
                "{currentTranscript}"
              </p>
            )}
          </div>

          {/* Conversation Transcript */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm">
            {conversation.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.sender === 'ai' && (
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    AI
                  </span>
                )}
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] font-medium leading-relaxed ${
                    msg.sender === 'ai'
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                      : 'bg-teal-600 text-white rounded-tr-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === 'patient' && (
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    आप
                  </span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Identified Symptoms Pill Tags */}
          {collectedSymptoms.length > 0 && (
            <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200 text-xs">
              <p className="font-bold text-teal-900 mb-1.5">पहचाने गए लक्षण (Detected):</p>
              <div className="flex flex-wrap gap-1.5">
                {collectedSymptoms.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-white px-2.5 py-1 rounded-lg border border-teal-200 font-semibold text-slate-800 flex items-center gap-1 shadow-2xs"
                  >
                    <span>{s.displayName}</span>
                    <span className={`px-1 py-0.2 rounded text-[10px] ${
                      s.severity === 'severe' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {s.severity}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Fixed Action Footer - NEVER CLIPPED */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              isCancelledRef.current = false;
              runStep(step || 1);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            title="Repeat current question"
          >
            <RefreshCw size={14} /> दोबारा बोलें (Repeat)
          </button>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={submitting || conversation.length === 0}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCircle2 size={16} />
            {submitting ? 'जमा हो रहा है...' : 'जांच सुरक्षित जमा करें (Submit & Analyze)'}
          </button>
        </div>
      </div>
    </div>
  );
}
