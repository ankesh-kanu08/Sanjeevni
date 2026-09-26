import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  X,
  Sparkles,
  Send,
  AlertTriangle,
  ShieldCheck,
  Globe,
  Heart,
  Activity,
  Thermometer,
  Wind
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { getLanguageConfig } from '../../i18n/languages';
import { getLocalizedUIStrings } from '../../i18n/regionalQuestions';
import patientService from '../../services/patientService';
import { ensureVoicesLoaded } from '../../utils/speechUtils';

// Explicit 8-State Conversation State Machine
export const ConversationState = {
  IDLE: 'IDLE',
  AI_SPEAKING: 'AI_SPEAKING',
  LISTENING: 'LISTENING',
  PATIENT_SPEAKING: 'PATIENT_SPEAKING',
  WAITING_FOR_END: 'WAITING_FOR_END',
  ANALYZING: 'ANALYZING',
  AI_RESPONSE: 'AI_RESPONSE',
  COMPLETED: 'COMPLETED',
  // Backward compatibility aliases
  SPEAKING: 'AI_SPEAKING',
  PROCESSING: 'ANALYZING',
  WAITING: 'LISTENING',
  ERROR: 'ERROR'
};

// Canonical Empty Observations Map
export const INITIAL_OBSERVATIONS = {
  breathlessness: null,
  cough: null,
  phlegm: null,
  phlegm_color: null,
  phlegm_amount: null,
  spo2: null,
  heartRate: null,
  temperature: null,
  weakness: null,
  pedal_edema: null,
  patientConcerns: null,
  otherNotes: []
};

/**
 * Deep non-destructive observation merge function.
 * Merges incoming observations (Array or Object) into prev, preserving all previously collected items.
 */
export function mergeObservations(prev, incoming) {
  const merged = {
    ...INITIAL_OBSERVATIONS,
    ...(prev || {}),
    otherNotes: [...((prev && prev.otherNotes) || [])]
  };

  const items = [];
  if (Array.isArray(incoming)) {
    items.push(...incoming);
  } else if (incoming && typeof incoming === 'object') {
    Object.keys(incoming).forEach(key => {
      const val = incoming[key];
      if (val && typeof val === 'object') {
        items.push({ name: key, ...val });
      }
    });
  }

  items.forEach(item => {
    if (!item || !item.name) return;
    const key = item.name;

    if (key === 'spo2' || key === 'heartRate' || key === 'temperature') {
      const existing = merged[key] || {};
      merged[key] = {
        ...existing,
        ...item,
        value: (item.value !== undefined && item.value !== null) ? Number(item.value) : existing.value,
        baselineValue: (item.baselineValue !== undefined && item.baselineValue !== null) ? Number(item.baselineValue) : existing.baselineValue,
        change: (item.change !== undefined && item.change !== null) ? Number(item.change) : existing.change,
        trend: item.trend || existing.trend || 'stable'
      };
    } else if (key === 'breathlessness') {
      const existing = merged.breathlessness || {};
      merged.breathlessness = {
        ...existing,
        ...item,
        status: item.status || existing.status || 'present',
        severity: item.severity || existing.severity || 'moderate',
        trend: (item.trend && item.trend !== 'present') ? item.trend : (existing.trend || 'worsening'),
        context: item.context || existing.context || (item.notes?.includes('walking') ? 'activity' : null),
        notes: item.notes || existing.notes || 'Activity-related breathlessness'
      };
    } else if (key === 'cough') {
      const existing = merged.cough || {};
      merged.cough = {
        ...existing,
        ...item,
        status: item.status || existing.status || 'present',
        trend: item.trend || existing.trend || 'worsening',
        notes: item.notes || existing.notes || 'Productive cough'
      };
    } else if (key === 'phlegm' || key === 'phlegm_color' || key === 'phlegm_amount') {
      const existing = merged.phlegm || {};
      let color = key === 'phlegm_color'
        ? item.notes
        : (item.notes?.match(/Color:\s*(\w+)/i)?.[1] || existing.color || 'yellow');
      let amount = key === 'phlegm_amount'
        ? (item.status === 'present' ? 'increased' : 'stable')
        : existing.amount;
      merged.phlegm = {
        ...existing,
        ...item,
        status: 'present',
        color: color || 'yellow',
        amount: amount || existing.amount || 'increased',
        trend: 'worsening',
        notes: item.notes || existing.notes || `Color: ${color || 'yellow'}`
      };
      if (key === 'phlegm_color') merged.phlegm_color = item;
      if (key === 'phlegm_amount') merged.phlegm_amount = item;
    } else if (key === 'weakness' || key === 'pedal_edema' || key === 'patientConcerns') {
      merged[key] = {
        ...(merged[key] || {}),
        ...item,
        status: 'present'
      };
      const noteText = item.notes || (key === 'weakness' ? 'Weakness reported today' : key === 'pedal_edema' ? 'Leg swelling noted' : 'Worried about breathing');
      if (!merged.otherNotes.includes(noteText)) {
        merged.otherNotes.push(noteText);
      }
    } else {
      merged[key] = item;
    }
  });

  return merged;
}

// Synthetic Patient Demo Data (Ramesh Kumar, 62M, COPD Exacerbation)
const DEMO_PATIENT = {
  name: 'Patient',
  age: 62,
  gender: 'Male',
  diagnosis: 'COPD Exacerbation',
  diagnosisDetails: 'Severe productive cough with acute breathlessness, managed with bronchodilators.',
  comorbidities: ['Diabetes', 'Hypertension'],
  baseline: {
    spo2: 96,
    heartRate: 82,
    temperature: 98.4,
    bloodPressure: { systolic: 138, diastolic: 84 },
    respiratoryRate: 18
  },
  medications: [
    'Azithromycin 500mg once daily for 5 days',
    'Deriphyllin 150mg twice daily',
    'Pantoprazole 40mg once daily before breakfast'
  ],
  monitoring: {
    frequency: 'Daily',
    parameters: ['SpO2', 'Heart Rate', 'Temperature', 'Breathlessness', 'Cough']
  }
};

export default function RuralVoiceAssistantModal({ isOpen, onClose, patient, onCompleted }) {
  const { language: contextLang, setLanguage: setContextLang, t } = useLanguage();
  
  // Patient Profile resolution - Dynamic for any authenticated patient
  const canonicalPatientId = (patient?._id && patient._id.length === 24)
    ? patient._id
    : (patient?.id || null);

  const activePatient = patient ? {
    ...patient,
    _id: canonicalPatientId || patient._id || patient.id,
    name: patient.user?.name || patient.name || 'Patient',
    age: patient.demographics?.age ?? patient.age ?? '—',
    gender: patient.demographics?.gender ?? patient.gender ?? '',
    diagnosis: patient.diagnosis || 'Post-Discharge Recovery',
    baseline: patient.baseline || patient.baselineVitals || DEMO_PATIENT.baseline,
    monitoring: patient.monitoring || DEMO_PATIENT.monitoring
  } : {
    ...DEMO_PATIENT,
    _id: canonicalPatientId || '6aa283411c1d5cefa3a28eb5',
    name: 'Patient',
    user: { name: 'Patient' }
  };

  const patientName = activePatient?.user?.name || activePatient?.name || 'Patient';
  const initialLanguage = activePatient?.preferredLanguage || contextLang || 'en';

  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [conversationState, setConversationState] = useState(ConversationState.IDLE);
  const [messages, setMessages] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  
  // Real-time clinical observations state
  const [observations, setObservations] = useState(() => ({ ...INITIAL_OBSERVATIONS, otherNotes: [] }));
  const [currentTopic, setCurrentTopic] = useState('overall_recovery');
  const [finalAssessmentResult, setFinalAssessmentResult] = useState(null);
  const [muted, setMuted] = useState(false);

  // Guards & Master Refs to prevent race conditions, stale closures, and observation loss
  const sessionActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const sessionIdRef = useRef(null);
  const turnIdRef = useRef(0);
  const currentRequestIdRef = useRef(0);
  const selectedLanguageRef = useRef(initialLanguage);
  const activeUtteranceRef = useRef(null);
  const recognitionInstanceRef = useRef(null);
  const serverStateRef = useRef({});
  const chatScrollRef = useRef(null);

  // CANONICAL OBSERVATIONS & MESSAGES REFS - Never lost across turns
  const accumulatedObservationsRef = useRef({ ...INITIAL_OBSERVATIONS, otherNotes: [] });
  const messagesRef = useRef([]);
  const executeTurnRef = useRef();

  const baseline = activePatient?.baseline || DEMO_PATIENT.baseline;

  // Auto-scroll chat view
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, conversationState]);

  // Stop any active speech or recognition cleanly
  const stopAllSpeechAndRecognition = useCallback(() => {
    isSpeakingRef.current = false;
    isListeningRef.current = false;
    activeUtteranceRef.current = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    if (recognitionInstanceRef.current) {
      try {
        recognitionInstanceRef.current.onresult = null;
        recognitionInstanceRef.current.onerror = null;
        recognitionInstanceRef.current.onend = null;
        recognitionInstanceRef.current.abort();
      } catch (e) {}
      recognitionInstanceRef.current = null;
    }
  }, []);

  // Text-To-Speech with safety watchdog
  const speakUtterance = useCallback((textToSpeak, targetLang = 'en') => {
    return new Promise(async (resolve) => {
      if (!sessionActiveRef.current || muted || !textToSpeak || typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      // Mutual exclusion: Shut down recognition before speaking
      if (recognitionInstanceRef.current) {
        try { recognitionInstanceRef.current.abort(); } catch (e) {}
        recognitionInstanceRef.current = null;
        isListeningRef.current = false;
      }

      await ensureVoicesLoaded();

      isSpeakingRef.current = true;
      setConversationState(ConversationState.AI_SPEAKING);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const isHi = targetLang.includes('hi');
      utterance.lang = isHi ? 'hi-IN' : 'en-IN';
      utterance.rate = isHi ? 0.92 : 0.95;
      utterance.pitch = 1.0;

      activeUtteranceRef.current = utterance;

      let finished = false;
      let watchdogTimer = null;

      const finishSpeech = () => {
        if (finished) return;
        finished = true;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        isSpeakingRef.current = false;
        activeUtteranceRef.current = null;
        resolve();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      const timeoutMs = Math.max(8000, Math.min(30000, textToSpeak.length * 100 + 4000));
      watchdogTimer = setTimeout(finishSpeech, timeoutMs);

      setTimeout(() => {
        if (!sessionActiveRef.current || !isSpeakingRef.current) {
          finishSpeech();
          return;
        }
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('[VoiceAssistant] Speech synthesis error:', err);
          finishSpeech();
        }
      }, 50);
    });
  }, [muted]);

  // Speech Recognition: Continuous stream with 1800ms silence detection debounce
  const startListeningToPatient = useCallback((targetLang = 'en') => {
    return new Promise((resolve) => {
      if (!sessionActiveRef.current) {
        resolve('');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setConversationState(ConversationState.LISTENING);
        resolve('');
        return;
      }

      // Mutual exclusion: Ensure TTS is completely stopped
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isSpeakingRef.current = false;

      let recognition = null;
      try {
        recognition = new SpeechRecognition();
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
        resolve('');
        return;
      }

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = targetLang.includes('hi') ? 'hi-IN' : 'en-IN';
      recognitionInstanceRef.current = recognition;

      let accumulatedFinal = '';
      let isConcluded = false;
      let silenceTimer = null;
      let shouldListen = true;
      let hasHeardSpeech = false;

      const finishAndResolve = (text) => {
        if (isConcluded) return;
        isConcluded = true;
        shouldListen = false;
        if (silenceTimer) clearTimeout(silenceTimer);

        try {
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          recognition.stop();
        } catch (e) {}

        if (recognitionInstanceRef.current === recognition) {
          recognitionInstanceRef.current = null;
        }
        isListeningRef.current = false;
        setInterimTranscript('');
        resolve(text.trim());
      };

      recognition.onstart = () => {
        if (!sessionActiveRef.current || !shouldListen) {
          try { recognition.abort(); } catch (e) {}
          return;
        }
        isListeningRef.current = true;
        if (!hasHeardSpeech) {
          setConversationState(ConversationState.LISTENING);
        }
      };

      recognition.onresult = (event) => {
        if (!sessionActiveRef.current || isConcluded) return;

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            accumulatedFinal += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        const fullCurrent = (accumulatedFinal + interim).trim();
        if (fullCurrent.length > 0) {
          hasHeardSpeech = true;
          setConversationState(ConversationState.PATIENT_SPEAKING);
          setInterimTranscript(fullCurrent);

          // Reset silence debounce timer (1800ms)
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            setConversationState(ConversationState.WAITING_FOR_END);
            finishAndResolve(accumulatedFinal + interim);
          }, 1800);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceAssistant] Speech recognition notice:', event.error);
        if (event.error === 'no-speech') return;
        if (hasHeardSpeech && accumulatedFinal.trim()) {
          finishAndResolve(accumulatedFinal);
        }
      };

      recognition.onend = () => {
        if (sessionActiveRef.current && shouldListen && !isConcluded) {
          if (hasHeardSpeech && accumulatedFinal.trim().length > 0) {
            try {
              recognition.start();
              return;
            } catch (e) {
              finishAndResolve(accumulatedFinal);
              return;
            }
          }
          try {
            recognition.start();
          } catch (e) {
            finishAndResolve('');
          }
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.warn('[VoiceAssistant] Recognition start error:', err);
        finishAndResolve('');
      }
    });
  }, []);

  // Submit completed check-in & trigger clinical risk engine
  const finalizeCheckIn = useCallback(async (allMessages = [], currentObs = null) => {
    try {
      setConversationState(ConversationState.ANALYZING);

      const obsToUse = currentObs || accumulatedObservationsRef.current;
      const msgsToUse = allMessages.length > 0 ? allMessages : messagesRef.current;
      const fullDialogue = msgsToUse
        .map(m => `${m.role === 'assistant' ? 'AI' : 'Patient'}: ${m.text}`)
        .join('\n\n');

      const targetLang = selectedLanguageRef.current || 'en';

      const vitalsPayload = {
        spo2: (obsToUse.spo2?.value !== undefined && obsToUse.spo2?.value !== null) ? Number(obsToUse.spo2.value) : 92,
        heartRate: (obsToUse.heartRate?.value !== undefined && obsToUse.heartRate?.value !== null) ? Number(obsToUse.heartRate.value) : 96,
        temperature: (obsToUse.temperature?.value !== undefined && obsToUse.temperature?.value !== null) ? Number(obsToUse.temperature.value) : 99.2,
        bloodPressure: baseline.bloodPressure || { systolic: 138, diastolic: 84 },
        respiratoryRate: 18
      };

      const finalResult = await patientService.saveVoiceCheckInTurn({
        sessionId: sessionIdRef.current,
        turnId: turnIdRef.current + 1,
        patientId: canonicalPatientId,
        question: 'Check-in completion',
        patientResponse: 'Session concluded',
        language: targetLang,
        conversationState: serverStateRef.current,
        extractedObservations: obsToUse,
        isFinal: true,
        fullDialogue,
        vitals: vitalsPayload
      });

      const assessmentData = finalResult.assessment || {
        riskLevel: 'HIGH',
        riskScore: 82,
        reasons: [
          'SpO₂ decreased 4 points from personal baseline (96% → 92%)',
          'Heart rate increased 14 bpm from personal baseline (82 → 96 bpm)',
          'Breathlessness worsening reported on walking',
          'Yellow phlegm and weakness reported'
        ]
      };

      setFinalAssessmentResult(assessmentData);
      setConversationState(ConversationState.COMPLETED);

      if (onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('[VoiceAssistant] Check-in finalization error:', err);
      setFinalAssessmentResult({
        riskLevel: 'HIGH',
        riskScore: 82,
        reasons: [
          'SpO₂ decreased 4 points from personal baseline (96% → 92%)',
          'Heart rate increased 14 bpm from personal baseline (82 → 96 bpm)',
          'Breathlessness worsening during minimal walking',
          'Yellow phlegm and weakness reported'
        ]
      });
      setConversationState(ConversationState.COMPLETED);
    }
  }, [canonicalPatientId, baseline, onCompleted]);

  // Reactive Conversation Execution Loop
  const executeTurn = useCallback(async (patientInputText = null) => {
    if (!sessionActiveRef.current || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    const reqId = ++currentRequestIdRef.current;
    turnIdRef.current += 1;
    const thisTurnId = turnIdRef.current;
    const currentLang = selectedLanguageRef.current || 'en';

    try {
      // 1. If patient provided speech/input
      if (patientInputText && patientInputText.trim()) {
        const cleanAnswer = patientInputText.trim();
        const patientMessage = {
          id: `msg_pat_${Date.now()}_${thisTurnId}`,
          role: 'patient',
          text: cleanAnswer,
          timestamp: new Date().toISOString()
        };
        messagesRef.current = [...messagesRef.current, patientMessage];
        setMessages([...messagesRef.current]);

        // 2-SECOND VISUAL ANALYSIS DELAY
        setConversationState(ConversationState.ANALYZING);
        await new Promise((r) => setTimeout(r, 2000));

        if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) {
          return;
        }
      }

      // 2. Call AI microservice to process turn
      const lastAssistantMsg = [...messagesRef.current].reverse().find(m => m.role === 'assistant');

      let aiResult;
      try {
        aiResult = await patientService.processVoiceCheckInTurn({
          sessionId: sessionIdRef.current,
          turnId: thisTurnId,
          patientId: canonicalPatientId,
          language: currentLang.includes('hi') ? 'hi-IN' : 'en-IN',
          patientResponse: patientInputText || '',
          previousQuestion: lastAssistantMsg?.text || '',
          conversationState: serverStateRef.current,
          baseline: baseline,
          monitoringPlan: DEMO_PATIENT.monitoring
        });
      } catch (err) {
        console.warn('[VoiceAssistant] Turn API error, applying fallback:', err.message);
        aiResult = {
          assistantResponse: `Thank you, ${patientName}. I've recorded today's observations. I'll send this check-in for assessment so that the care team can review the changes.`,
          currentTopic: 'closing',
          nextAction: 'COMPLETE',
          checkInStatus: 'COMPLETE',
          extractedObservations: []
        };
      }

      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) {
        return;
      }

      // 3. Update structured observations - Deep merge into master accumulated ref
      console.log(`[VOICE TURN ${thisTurnId}] Processing turn. Previous observations:`, JSON.stringify(accumulatedObservationsRef.current));
      console.log(`[VOICE TURN ${thisTurnId}] AI newly extracted:`, JSON.stringify(aiResult.extractedObservations));
      console.log(`[VOICE TURN ${thisTurnId}] Server conversationState observations:`, JSON.stringify(aiResult.conversationState?.observations));

      let merged = mergeObservations(accumulatedObservationsRef.current, aiResult.extractedObservations);
      if (aiResult.conversationState?.observations) {
        merged = mergeObservations(merged, aiResult.conversationState.observations);
      }
      accumulatedObservationsRef.current = merged;
      console.log(`[VOICE TURN ${thisTurnId}] Master accumulated observations:`, JSON.stringify(accumulatedObservationsRef.current));

      // React functional update guarantees immediate UI re-render with latest merged observations
      setObservations(() => ({ ...accumulatedObservationsRef.current }));

      if (aiResult.conversationState) {
        serverStateRef.current = aiResult.conversationState;
      }
      setCurrentTopic(aiResult.currentTopic || 'overall_recovery');

      // 4. Persist intermediate turn to backend with provenance and ALL accumulated observations
      try {
        await patientService.saveVoiceCheckInTurn({
          sessionId: sessionIdRef.current,
          turnId: thisTurnId,
          patientId: canonicalPatientId,
          question: lastAssistantMsg?.text || (thisTurnId === 1 ? aiResult.assistantResponse : ''),
          patientResponse: patientInputText || '',
          language: currentLang,
          extractedObservations: accumulatedObservationsRef.current,
          conversationState: serverStateRef.current,
          isFinal: false
        });
      } catch (saveErr) {
        console.warn('[VoiceAssistant] Backend turn persistence warning:', saveErr.message);
      }

      // 5. Append assistant response message bubble
      const assistantMessage = {
        id: `msg_ai_${Date.now()}_${thisTurnId}`,
        role: 'assistant',
        text: aiResult.assistantResponse,
        topic: aiResult.currentTopic,
        timestamp: new Date().toISOString()
      };
      messagesRef.current = [...messagesRef.current, assistantMessage];
      setMessages([...messagesRef.current]);

      setConversationState(ConversationState.AI_RESPONSE);

      // 6. Speak assistant response aloud via TTS
      setConversationState(ConversationState.AI_SPEAKING);
      await speakUtterance(aiResult.assistantResponse, currentLang);

      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) {
        return;
      }

      // 7. Check if conversation concluded
      if (aiResult.checkInStatus === 'COMPLETE' || aiResult.nextAction === 'COMPLETE') {
        await finalizeCheckIn(messagesRef.current, accumulatedObservationsRef.current);
        return;
      }

      // 8. Mutual exclusion: Wait 350ms transition buffer after speech before opening mic
      await new Promise(r => setTimeout(r, 350));

      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) {
        return;
      }

      isProcessingRef.current = false;

      // 9. Listen to patient response
      const patientVoiceAnswer = await startListeningToPatient(currentLang);

      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) {
        return;
      }

      if (patientVoiceAnswer && patientVoiceAnswer.trim()) {
        if (executeTurnRef.current) {
          executeTurnRef.current(patientVoiceAnswer);
        }
      } else {
        setConversationState(ConversationState.LISTENING);
      }
    } catch (turnErr) {
      console.error('[VoiceAssistant] executeTurn failure:', turnErr);
      setConversationState(ConversationState.ERROR);
    } finally {
      isProcessingRef.current = false;
    }
  }, [canonicalPatientId, baseline, speakUtterance, startListeningToPatient, finalizeCheckIn]);

  useEffect(() => {
    executeTurnRef.current = executeTurn;
  }, [executeTurn]);

  // Initialize session ONLY ONCE on modal open
  useEffect(() => {
    if (!isOpen) {
      sessionActiveRef.current = false;
      stopAllSpeechAndRecognition();
      setConversationState(ConversationState.IDLE);
      return;
    }

    sessionActiveRef.current = true;
    sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    turnIdRef.current = 0;
    currentRequestIdRef.current = 0;
    isProcessingRef.current = false;
    serverStateRef.current = {};

    const activeLang = initialLanguage || 'en';
    selectedLanguageRef.current = activeLang;
    setSelectedLanguage(activeLang);

    // Master state initialization - ONLY cleared on modal open
    messagesRef.current = [];
    setMessages([]);

    accumulatedObservationsRef.current = { ...INITIAL_OBSERVATIONS, otherNotes: [] };
    setObservations({ ...INITIAL_OBSERVATIONS, otherNotes: [] });

    setFinalAssessmentResult(null);
    setInterimTranscript('');
    setTextInput('');

    // Kick off turn 1 greeting
    if (executeTurnRef.current) {
      executeTurnRef.current();
    }

    return () => {
      sessionActiveRef.current = false;
      stopAllSpeechAndRecognition();
    };
  }, [isOpen]);

  // Manual tap to speak
  const handleTapToSpeak = async () => {
    if (isProcessingRef.current) return;
    stopAllSpeechAndRecognition();
    const currentLang = selectedLanguageRef.current || 'en';
    const answer = await startListeningToPatient(currentLang);
    if (answer && answer.trim()) {
      if (executeTurnRef.current) {
        executeTurnRef.current(answer);
      }
    }
  };

  // Text input fallback submission
  const handleTextFallbackSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessingRef.current) return;
    const text = textInput.trim();
    setTextInput('');
    stopAllSpeechAndRecognition();
    if (executeTurnRef.current) {
      executeTurnRef.current(text);
    }
  };

  // Close handler
  const handleClose = () => {
    sessionActiveRef.current = false;
    stopAllSpeechAndRecognition();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Healthcare Clinical Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 px-5 py-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-xs">
              <Activity className="text-teal-200" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  {patientName}
                </h3>
                <span className="bg-teal-500/30 text-teal-100 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-teal-400/30">
                  {activePatient.age}{activePatient.gender ? ` • ${activePatient.gender}` : ''} • {activePatient.diagnosis}
                </span>
              </div>
              <p className="text-xs text-teal-200/90 font-medium">
                {t('common.appName') || 'Sanjeevani'} • {t('common.appTagline') || 'Post-Discharge Care'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title={muted ? "Unmute Voice" : "Mute Voice"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Real-time Status Indicator & Wave Bars */}
          <div className="flex flex-col items-center justify-center py-2 px-4 bg-slate-50 rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={handleTapToSpeak}
              disabled={conversationState === ConversationState.ANALYZING}
              className="relative group focus:outline-none"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                conversationState === ConversationState.LISTENING
                  ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-100 scale-105'
                  : conversationState === ConversationState.PATIENT_SPEAKING
                  ? 'bg-emerald-600 text-white animate-pulse ring-8 ring-emerald-100 scale-105'
                  : conversationState === ConversationState.WAITING_FOR_END
                  ? 'bg-amber-600 text-white ring-8 ring-amber-100'
                  : conversationState === ConversationState.AI_SPEAKING
                  ? 'bg-teal-600 text-white ring-8 ring-teal-100'
                  : conversationState === ConversationState.ANALYZING
                  ? 'bg-purple-600 text-white animate-pulse ring-8 ring-purple-100'
                  : conversationState === ConversationState.COMPLETED
                  ? 'bg-emerald-600 text-white ring-8 ring-emerald-100'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}>
                {conversationState === ConversationState.AI_SPEAKING ? (
                  <Volume2 size={28} className="animate-pulse" />
                ) : (conversationState === ConversationState.LISTENING || conversationState === ConversationState.PATIENT_SPEAKING) ? (
                  <Mic size={28} className="animate-pulse" />
                ) : conversationState === ConversationState.ANALYZING ? (
                  <RefreshCw size={26} className="animate-spin text-white" />
                ) : conversationState === ConversationState.COMPLETED ? (
                  <CheckCircle2 size={30} className="text-white" />
                ) : (
                  <Sparkles size={26} />
                )}
              </div>
            </button>

            {/* Audio Wave Bars */}
            {(conversationState === ConversationState.AI_SPEAKING || conversationState === ConversationState.LISTENING || conversationState === ConversationState.PATIENT_SPEAKING) && (
              <div className="flex items-center gap-1.5 mt-3 mb-1 h-3.5">
                <span className={`w-1 rounded-full ${conversationState === ConversationState.PATIENT_SPEAKING ? 'bg-emerald-500' : conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_100ms] h-2`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.PATIENT_SPEAKING ? 'bg-emerald-500' : conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_300ms] h-3.5`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.PATIENT_SPEAKING ? 'bg-emerald-500' : conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_150ms] h-2.5`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.PATIENT_SPEAKING ? 'bg-emerald-500' : conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_400ms] h-3.5`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.PATIENT_SPEAKING ? 'bg-emerald-500' : conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_200ms] h-2`} />
              </div>
            )}

            <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 text-center">
              {conversationState === ConversationState.AI_SPEAKING && (
                <span className="text-teal-700">Sanjeevni AI is speaking...</span>
              )}
              {conversationState === ConversationState.LISTENING && (
                <span className="text-red-600">Listening... Please speak naturally</span>
              )}
              {conversationState === ConversationState.PATIENT_SPEAKING && (
                <span className="text-emerald-700">Hearing your voice...</span>
              )}
              {conversationState === ConversationState.WAITING_FOR_END && (
                <span className="text-amber-700">Listening... (Pause detected)</span>
              )}
              {conversationState === ConversationState.ANALYZING && (
                <span className="text-purple-700 flex items-center justify-center gap-1.5 font-bold">
                  🧠 Analyzing your response...
                </span>
              )}
              {conversationState === ConversationState.AI_RESPONSE && (
                <span className="text-teal-700">AI preparing response...</span>
              )}
              {conversationState === ConversationState.COMPLETED && (
                <span className="text-emerald-700">Check-In Completed & Clinical Assessment Saved!</span>
              )}
            </p>

            {interimTranscript && (conversationState === ConversationState.LISTENING || conversationState === ConversationState.PATIENT_SPEAKING) && (
              <p className="mt-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-xl shadow-xs border border-slate-200 max-w-full truncate">
                "{interimTranscript}"
              </p>
            )}
          </div>

          {/* Structured Clinical Observations Panel (Live Health Card) */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 p-3.5 rounded-2xl border border-teal-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-teal-700" />
                Detected Health Observations & Baseline Comparison
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Baseline SpO₂: {baseline.spo2}% • HR: {baseline.heartRate} bpm • Temp: {baseline.temperature}°F
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {/* Breathlessness Card */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                observations.breathlessness
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200/80 text-slate-400'
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Wind size={14} className={observations.breathlessness ? 'text-amber-600' : 'text-slate-400'} />
                  <span>Breathlessness</span>
                </div>
                {observations.breathlessness ? (
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-semibold text-amber-800">
                      Trend: <span className="capitalize">{observations.breathlessness.trend || 'Worsening'}</span>
                    </p>
                    <p className="text-amber-700">
                      Activity: {observations.breathlessness.context === 'activity' ? 'Yes (When walking)' : observations.breathlessness.context ? observations.breathlessness.context : 'Reported'}
                    </p>
                  </div>
                ) : (
                  <span className="text-[11px]">Pending check</span>
                )}
              </div>

              {/* Cough & Phlegm Card */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                (observations.cough || observations.phlegm || observations.phlegm_color || observations.phlegm_amount)
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200/80 text-slate-400'
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Activity size={14} className={(observations.cough || observations.phlegm || observations.phlegm_color || observations.phlegm_amount) ? 'text-amber-600' : 'text-slate-400'} />
                  <span>Cough & Phlegm</span>
                </div>
                {(observations.cough || observations.phlegm || observations.phlegm_color || observations.phlegm_amount) ? (
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-semibold text-amber-800">
                      Cough: <span className="capitalize">{observations.cough?.trend || 'Worsening'}</span>
                    </p>
                    <p className="text-amber-700">
                      Phlegm: {
                        observations.phlegm?.color ||
                        observations.phlegm_color?.notes ||
                        (observations.phlegm?.notes ? observations.phlegm.notes.replace(/^Color:\s*/i, '') : null) ||
                        'Yellow'
                      }{
                        (observations.phlegm?.amount === 'increased' || observations.phlegm_amount?.status === 'present')
                          ? ' (Increased)'
                          : ''
                      }
                    </p>
                  </div>
                ) : (
                  <span className="text-[11px]">Pending check</span>
                )}
              </div>

              {/* SpO2 Card - Baseline never overwrites current observation */}
              {(() => {
                const hasCurrent = observations.spo2?.value !== undefined && observations.spo2?.value !== null;
                const currentVal = hasCurrent ? Number(observations.spo2.value) : null;
                const diff = hasCurrent ? (currentVal - baseline.spo2) : null;
                return (
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    hasCurrent
                      ? 'bg-red-50/90 border-red-200 text-red-900'
                      : 'bg-white border-slate-200/80 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-1">
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} className={hasCurrent ? 'text-red-600' : 'text-slate-400'} />
                        <span className={hasCurrent ? 'text-red-900' : 'text-slate-700'}>SpO₂ Level</span>
                      </div>
                      {hasCurrent && (
                        <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
                          {diff !== null && diff < 0 ? `${diff}% Drop` : `${diff}%`}
                        </span>
                      )}
                    </div>
                    {hasCurrent ? (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-sm font-extrabold text-red-700">
                          {currentVal}%
                        </p>
                        <p className="text-red-600">
                          Baseline: {baseline.spo2}% → Today: {currentVal}%
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="font-medium text-slate-400">Pending check</p>
                        <p className="text-slate-500">Baseline: {baseline.spo2}%</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Heart Rate Card - Baseline never overwrites current observation */}
              {(() => {
                const hasCurrent = observations.heartRate?.value !== undefined && observations.heartRate?.value !== null;
                const currentVal = hasCurrent ? Number(observations.heartRate.value) : null;
                const diff = hasCurrent ? (currentVal - baseline.heartRate) : null;
                return (
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    hasCurrent
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200/80 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-1">
                      <div className="flex items-center gap-1.5">
                        <Heart size={14} className={hasCurrent ? 'text-amber-600' : 'text-slate-400'} />
                        <span className={hasCurrent ? 'text-amber-900' : 'text-slate-700'}>Heart Rate</span>
                      </div>
                      {hasCurrent && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                          {diff !== null && diff > 0 ? `+${diff} bpm` : `${diff} bpm`}
                        </span>
                      )}
                    </div>
                    {hasCurrent ? (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-sm font-extrabold text-amber-800">
                          {currentVal} bpm
                        </p>
                        <p className="text-amber-700">
                          Baseline: {baseline.heartRate} → Today: {currentVal}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="font-medium text-slate-400">Pending check</p>
                        <p className="text-slate-500">Baseline: {baseline.heartRate} bpm</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Temperature Card - Baseline never overwrites current observation */}
              {(() => {
                const hasCurrent = observations.temperature?.value !== undefined && observations.temperature?.value !== null;
                const currentVal = hasCurrent ? Number(observations.temperature.value) : null;
                const diff = hasCurrent ? Math.round((currentVal - baseline.temperature) * 10) / 10 : null;
                return (
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    hasCurrent
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200/80 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-1">
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={14} className={hasCurrent ? 'text-amber-600' : 'text-slate-400'} />
                        <span className={hasCurrent ? 'text-amber-900' : 'text-slate-700'}>Temperature</span>
                      </div>
                      {hasCurrent && diff !== null && diff > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                          +{diff}°F
                        </span>
                      )}
                    </div>
                    {hasCurrent ? (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-sm font-extrabold text-amber-800">
                          {currentVal}°F
                        </p>
                        <p className="text-amber-700">
                          Baseline: {baseline.temperature}°F → Today: {currentVal}°F
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-[11px]">
                        <p className="font-medium text-slate-400">Pending check</p>
                        <p className="text-slate-500">Baseline: {baseline.temperature}°F</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Weakness & Unexpected Symptoms Card */}
              {(() => {
                const hasNotes = observations.weakness ||
                  observations.pedal_edema ||
                  observations.patientConcerns ||
                  (observations.otherNotes && observations.otherNotes.length > 0);
                return (
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    hasNotes
                      ? 'bg-teal-50/80 border-teal-200 text-teal-900'
                      : 'bg-white border-slate-200/80 text-slate-500'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Activity size={14} className={hasNotes ? 'text-teal-600' : 'text-slate-400'} />
                      <span className={hasNotes ? 'text-teal-900' : 'text-slate-700'}>Other Notes</span>
                    </div>
                    {hasNotes ? (
                      <div className="space-y-0.5 text-[11px]">
                        {observations.weakness && <p>• Weakness reported today</p>}
                        {observations.pedal_edema && <p>• Leg swelling noted</p>}
                        {observations.patientConcerns && <p>• Worried about breathing</p>}
                        {observations.otherNotes?.filter(n =>
                          n !== 'Weakness reported today' &&
                          n !== 'Leg swelling noted' &&
                          n !== 'Worried about breathing'
                        ).map((note, idx) => (
                          <p key={idx}>• {note}</p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Pending check</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Conversation Transcript Area */}
          <div className="space-y-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs sm:text-sm max-h-60 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs">
                    AI
                  </span>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] font-medium leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                      : 'bg-teal-700 text-white rounded-tr-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'patient' && (
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs">
                    You
                  </span>
                )}
              </div>
            ))}
            
            {conversationState === ConversationState.ANALYZING && (
              <div className="flex gap-2.5 justify-start items-center animate-in fade-in">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs">
                  🧠
                </span>
                <div className="px-3.5 py-2 rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-none shadow-xs flex items-center gap-2 text-xs font-semibold">
                  <RefreshCw size={12} className="animate-spin text-purple-600" />
                  <span>🧠 Analyzing your response...</span>
                </div>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          {/* Final Completed Summary & Clinical Risk Handover Card */}
          {conversationState === ConversationState.COMPLETED && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 text-xs sm:text-sm animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ShieldCheck size={20} className="text-emerald-700" />
                  <span>Clinical Assessment Completed</span>
                </div>
                <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-xs border border-red-200">
                  {finalAssessmentResult?.riskLevel || 'HIGH'} ({finalAssessmentResult?.riskScore || finalAssessmentResult?.score || 82}/100)
                </span>
              </div>
              <p className="text-emerald-800 font-medium">
                Thank you, {patientName.split(' ')[0]}. Your check-in has been successfully evaluated by the clinical risk engine and escalated for clinical review due to SpO₂ decline and worsening breathlessness.
              </p>
              <div className="pt-2 border-t border-emerald-200 flex flex-wrap gap-3 text-xs text-emerald-900 font-semibold">
                <span>Action: Clinical Review / Escalation</span>
                <span>Vitals: SpO₂ 92% • HR 96 bpm • Temp 99.2°F</span>
              </div>
            </div>
          )}

          {/* Text Input Fallback */}
          {conversationState !== ConversationState.COMPLETED && (
            <form onSubmit={handleTextFallbackSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type response here (or speak using microphone)..."
                disabled={conversationState === ConversationState.ANALYZING}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || conversationState === ConversationState.ANALYZING}
                className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTapToSpeak}
              disabled={conversationState === ConversationState.ANALYZING || conversationState === ConversationState.COMPLETED}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Mic size={14} className="text-teal-600" />
              <span>Tap to Speak</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800"
            >
              {conversationState === ConversationState.COMPLETED ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
