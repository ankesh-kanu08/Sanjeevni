import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Volume2, VolumeX, RefreshCw, CheckCircle2, X, Sparkles, Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import patientService from '../../services/patientService';
import { extractSymptomsClientSide } from './VoiceCheckInModal';

// Explicit conversation lifecycle states
export const ConversationState = {
  IDLE: 'IDLE',
  ASKING: 'ASKING',
  SPEAKING: 'SPEAKING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  WAITING_FOR_NEXT_QUESTION: 'WAITING_FOR_NEXT_QUESTION',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

// Complete localized dictionary for 100% language consistency
const LOCALIZED_STRINGS = {
  hi: {
    modalTitle: 'आवाज़ से स्वास्थ्य जांच',
    modalSubtitle: 'Sanjeevni AI Voice Companion',
    speakingStatus: 'संजीवनी साथी बोल रही हैं...',
    listeningStatus: 'सुन रहे हैं... कृपया बोलिए',
    processingStatus: 'आपका जवाब समझ रही हूँ...',
    completedStatus: 'आज की स्वास्थ्य जांच पूरी हो गई!',
    errorStatus: 'आवाज़ समझने में रुकावट आई',
    langToggleHi: 'हिंदी',
    langToggleEn: 'English',
    textFallbackPlaceholder: 'यहाँ लिख कर जवाब दें (या ऊपर बोलें)...',
    repeatBtn: 'दोबारा सुनें (Repeat)',
    endCheckinBtn: 'जांच समाप्त करें (End)',
    viewSummaryBtn: 'विवरण देखें (View Summary)',
    closeBtn: 'बंद करें',
    detectedSymptomsTitle: 'पहचाने गए लक्षण (Detected Symptoms):',
    medicationLabel: 'दवाइयाँ (Medications):',
    medsTaken: 'समय पर ली गई (Taken)',
    medsMissed: 'नहीं ली (Missed)',
    noSpeechPrompt: 'आपकी आवाज़ सुनाई नहीं दी। क्या आप दोबारा बोलना चाहेंगे या नीचे लिख कर जवाब देंगे?',
    finalReassurance: 'धन्यवाद। आपकी संपूर्ण स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर व स्वास्थ्य टीम को भेज दी गई है। आप कृपया आराम करें।',
    riskEvaluatedText: 'स्वास्थ्य जोखिम का विश्लेषण पूरा हुआ',
    summaryTitle: 'जांच का निष्कर्ष (Assessment Summary)'
  },
  en: {
    modalTitle: 'Voice Health Check-In',
    modalSubtitle: 'Sanjeevni AI Voice Companion',
    speakingStatus: 'Sanjeevni AI is speaking...',
    listeningStatus: 'Listening... Please speak now',
    processingStatus: 'Analyzing your response...',
    completedStatus: "Today's health check is complete!",
    errorStatus: 'Voice recognition encountered an issue',
    langToggleHi: 'हिंदी',
    langToggleEn: 'English',
    textFallbackPlaceholder: 'Type your response here (or speak above)...',
    repeatBtn: 'Repeat Question',
    endCheckinBtn: 'End Check-in',
    viewSummaryBtn: 'View Summary',
    closeBtn: 'Close',
    detectedSymptomsTitle: 'Detected Health Observations:',
    medicationLabel: 'Medications:',
    medsTaken: 'Taken as prescribed',
    medsMissed: 'Missed / Not taken',
    noSpeechPrompt: "I didn't catch that. Would you like to speak again or type your answer below?",
    finalReassurance: 'Thank you. Your health update has been recorded and forwarded to your doctor and healthcare team. Please rest well.',
    riskEvaluatedText: 'Clinical risk evaluation completed',
    summaryTitle: 'Health Assessment Summary'
  }
};

// Disease Category Classifier
export const classifyDiseaseCategory = (diagnosis, comorbidities = []) => {
  const text = `${diagnosis || ''} ${(comorbidities || []).join(' ')}`.toLowerCase();
  if (/(pneumonia|copd|asthma|bronchitis|pulmonary|lung|respiratory|dyspnea|swas|infiltrate)/.test(text)) {
    return 'RESPIRATORY';
  }
  if (/(heart|cardiac|chf|congestive|failure|hypertension|bp|infarction|mi|angina|cad|coronary|arrhythmia|edema)/.test(text)) {
    return 'CARDIAC';
  }
  if (/(post|surgery|surgical|cholecystectomy|appendectomy|hernia|laparoscopic|operation|incision|wound|stitches|resection)/.test(text)) {
    return 'POST_SURGICAL';
  }
  if (/(diabetes|diabetic|sugar|ckd|renal|kidney|nephro)/.test(text)) {
    return 'METABOLIC_RENAL';
  }
  return 'GENERAL';
};

// Trained Disease-Specific Clinical Question Protocols
export const getDiseaseProtocol = (patientName = 'मरीज', diagnosis = '', comorbidities = []) => {
  const category = classifyDiseaseCategory(diagnosis, comorbidities);
  const name = patientName || 'मरीज';

  if (category === 'RESPIRATORY') {
    const questions = {
      resp_001_greeting: {
        id: 'resp_001_greeting',
        category: 'greeting',
        text: {
          hi: `नमस्ते ${name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपके फेफड़ों और सांस की तबीयत कैसी लग रही है? कृपया बोल कर बताएं।`,
          en: `Hello ${name}. I am your Sanjeevni care companion. How are you feeling today with your breathing and chest?`
        }
      },
      resp_002_breathlessness: {
        id: 'resp_002_breathlessness',
        category: 'breathlessness',
        text: {
          hi: 'क्या आपको सांस लेने में कोई तकलीफ हो रही है, या थोड़ा भी चलने-फिरने पर सांस फूल रही है?',
          en: 'Are you experiencing any shortness of breath, difficulty breathing, or does your breath get heavy when walking?'
        }
      },
      resp_003_cough_phlegm: {
        id: 'resp_003_cough_phlegm',
        category: 'cough_phlegm',
        text: {
          hi: 'क्या आपको खांसी आ रही है, बलगम का रंग पीला या हरा है, या सीने में सांस लेते समय दर्द महसूस हो रहा है?',
          en: 'Do you have a cough, yellowish or greenish phlegm, or any chest pain when breathing in?'
        }
      },
      resp_004_fever_vitals: {
        id: 'resp_004_fever_vitals',
        category: 'fever_vitals',
        text: {
          hi: 'क्या आपको बुखार या कंपकंपी महसूस हो रही है, और क्या आपने आज पल्स ऑक्सीमीटर से ऑक्सीजन (SpO₂) चेक किया है?',
          en: 'Do you feel any fever or chills, and have you measured your oxygen (SpO₂) level with a pulse oximeter today?'
        }
      },
      resp_005_medication: {
        id: 'resp_005_medication',
        category: 'medication',
        text: {
          hi: 'क्या आपने आज डॉक्टर द्वारा दी गई सभी एंटीबायोटिक और सांस की दवाइयाँ समय पर ले ली हैं?',
          en: 'Did you take all your prescribed respiratory medications and antibiotics on time today?'
        }
      },
      resp_006_closing: {
        id: 'resp_006_closing',
        category: 'closing',
        text: {
          hi: 'धन्यवाद। आपकी सांस और फेफड़ों की संपूर्ण स्थिति दर्ज कर ली गई है और डॉक्टर व स्वास्थ्य टीम को भेज दी गई है। आप कृपया आराम करें।',
          en: 'Thank you. Your respiratory health data has been recorded and shared with your clinical team. Please rest well.'
        }
      }
    };
    return {
      category: 'RESPIRATORY',
      diagnosis: diagnosis || 'Pneumonia / Respiratory',
      protocolName: {
        hi: 'निमोनिया एवं श्वसन जांच (Respiratory Protocol)',
        en: 'Pneumonia & Respiratory Protocol'
      },
      questionIds: ['resp_001_greeting', 'resp_002_breathlessness', 'resp_003_cough_phlegm', 'resp_004_fever_vitals', 'resp_005_medication', 'resp_006_closing'],
      questionsBank: questions
    };
  }

  if (category === 'CARDIAC') {
    const questions = {
      card_001_greeting: {
        id: 'card_001_greeting',
        category: 'greeting',
        text: {
          hi: `नमस्ते ${name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपके दिल और शरीर की तबीयत कैसी लग रही है? कृपया बोल कर बताएं।`,
          en: `Hello ${name}. I am your Sanjeevni care companion. How are you feeling today with your heart and energy?`
        }
      },
      card_002_edema: {
        id: 'card_002_edema',
        category: 'pedal_edema',
        text: {
          hi: 'क्या आज आपने अपने दोनों पैरों, पंजों या टखनों में कोई सूजन या भारीपन देखा है?',
          en: 'Have you noticed any swelling, puffiness, or heaviness in your feet, ankles, or legs today?'
        }
      },
      card_003_orthopnea: {
        id: 'card_003_orthopnea',
        category: 'orthopnea',
        text: {
          hi: 'क्या आपको बिस्तर पर सीधे लेटते समय सांस लेने में तकलीफ होती है, या रात में सोने के लिए तकिया ऊंचा करना पड़ता है?',
          en: 'Do you feel breathless when lying flat in bed, or do you need extra pillows to breathe easily at night?'
        }
      },
      card_004_vitals_palpitation: {
        id: 'card_004_vitals_palpitation',
        category: 'vitals_palpitation',
        text: {
          hi: 'क्या आपको सीने में भारीपन, दिल की धड़कन तेज होना या चक्कर जैसा लग रहा है, और क्या ब्लड प्रेशर नापा है?',
          en: 'Are you experiencing any chest heaviness, rapid heartbeat, or dizziness, and did you check your blood pressure?'
        }
      },
      card_005_medication_fluids: {
        id: 'card_005_medication_fluids',
        category: 'medication_fluids',
        text: {
          hi: 'क्या आपने अपनी पेशाब बढ़ाने वाली (डाययूरेटिक) और ब्लड प्रेशर की सभी दवाइयाँ समय पर ली हैं, और पानी सीमित रखा है?',
          en: 'Did you take all your prescribed heart, blood pressure, and diuretic medicines on time, and follow your fluid limits?'
        }
      },
      card_006_closing: {
        id: 'card_006_closing',
        category: 'closing',
        text: {
          hi: 'धन्यवाद। आपके हृदय स्वास्थ्य और सूजन की जानकारी दर्ज कर ली गई है और डॉक्टर व आशा कार्यकर्ता को भेज दी गई है। कृपया आराम करें।',
          en: 'Thank you. Your cardiac health and fluid status have been recorded and sent to your doctor and care team. Please rest comfortably.'
        }
      }
    };
    return {
      category: 'CARDIAC',
      diagnosis: diagnosis || 'Congestive Heart Failure',
      protocolName: {
        hi: 'हृदय विफलता एवं सूजन जांच (Cardiac Protocol)',
        en: 'Heart Failure & Cardiac Protocol'
      },
      questionIds: ['card_001_greeting', 'card_002_edema', 'card_003_orthopnea', 'card_004_vitals_palpitation', 'card_005_medication_fluids', 'card_006_closing'],
      questionsBank: questions
    };
  }

  if (category === 'POST_SURGICAL') {
    const questions = {
      surg_001_greeting: {
        id: 'surg_001_greeting',
        category: 'greeting',
        text: {
          hi: `नमस्ते ${name} जी। मैं आपकी संजीवनी केयर साथी हूँ। ऑपरेशन के बाद आज आपकी तबीयत और ताकत कैसी लग रही है? बोल कर बताएं।`,
          en: `Hello ${name}. I am your Sanjeevni care companion. How is your recovery and strength feeling today after your surgery?`
        }
      },
      surg_002_incision_pain: {
        id: 'surg_002_incision_pain',
        category: 'incision_pain',
        text: {
          hi: 'क्या ऑपरेशन के चीरे या टांकों की जगह तेज दर्द, लालिमा, सूजन, या कोई पानी या मवाद बह रहा है?',
          en: 'Is there any severe pain, redness, swelling, or any watery or pus discharge from your surgical incision stitches?'
        }
      },
      surg_003_fever: {
        id: 'surg_003_fever',
        category: 'fever',
        text: {
          hi: 'क्या आपको कंपकंपी के साथ बुखार लग रहा है, या शरीर गर्म महसूस हो रहा है?',
          en: 'Do you have any fever, chills, or does your body feel unusually hot or clammy?'
        }
      },
      surg_004_diet_bowel: {
        id: 'surg_004_diet_bowel',
        category: 'diet_bowel',
        text: {
          hi: 'क्या आप हल्का खाना खा पा रहे हैं, उल्टी या मतली तो नहीं है, और क्या पेट साफ हो रहा है?',
          en: 'Are you able to eat soft food, is there any nausea or vomiting, and are your bowel movements normal?'
        }
      },
      surg_005_medication: {
        id: 'surg_005_medication',
        category: 'medication',
        text: {
          hi: 'क्या आपने अपने ऑपरेशन के बाद दी गई एंटीबायोटिक और दर्द निवारक दवाइयाँ समय पर ली हैं?',
          en: 'Did you take your prescribed post-surgical antibiotics and pain medications on time today?'
        }
      },
      surg_006_closing: {
        id: 'surg_006_closing',
        category: 'closing',
        text: {
          hi: 'धन्यवाद। आपकी सर्जरी के बाद की स्थिति दर्ज कर ली गई है और सर्जिकल टीम को भेज दी गई है। चीरे को सूखा रखें और आराम करें।',
          en: 'Thank you. Your post-surgical recovery details have been recorded and shared with your surgical team. Please rest well.'
        }
      }
    };
    return {
      category: 'POST_SURGICAL',
      diagnosis: diagnosis || 'Post-Surgical Recovery',
      protocolName: {
        hi: 'सर्जरी पश्चात स्वास्थ्य एवं टांका जांच (Post-Surgical Protocol)',
        en: 'Post-Surgical & Wound Protocol'
      },
      questionIds: ['surg_001_greeting', 'surg_002_incision_pain', 'surg_003_fever', 'surg_004_diet_bowel', 'surg_005_medication', 'surg_006_closing'],
      questionsBank: questions
    };
  }

  if (category === 'METABOLIC_RENAL') {
    const questions = {
      meta_001_greeting: {
        id: 'meta_001_greeting',
        category: 'greeting',
        text: {
          hi: `नमस्ते ${name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपकी सेहत और कमजोरी कैसी लग रही है? कृपया बताएं।`,
          en: `Hello ${name}. I am your Sanjeevni care companion. How are you feeling today regarding your overall energy and health?`
        }
      },
      meta_002_hypoglycemia_dizziness: {
        id: 'meta_002_hypoglycemia_dizziness',
        category: 'hypoglycemia_dizziness',
        text: {
          hi: 'क्या आपको चक्कर आना, आंखों के आगे अंधेरा, कंपकंपी, या बहुत ज्यादा पसीना या प्यास महसूस हो रही है?',
          en: 'Are you experiencing any dizziness, blurred vision, trembling, profuse sweating, or excessive thirst?'
        }
      },
      meta_003_feet_wounds: {
        id: 'meta_003_feet_wounds',
        category: 'feet_wounds',
        text: {
          hi: 'क्या आपके पैरों या तलवों में कोई नया घाव, छाला, सुन्नपन या सूजन देखी है आपने?',
          en: 'Have you noticed any new cuts, blisters, numbness, or swelling in your feet or legs?'
        }
      },
      meta_004_vitals_urination: {
        id: 'meta_004_vitals_urination',
        category: 'urination_vitals',
        text: {
          hi: 'क्या पेशाब की मात्रा या रंग में कोई बदलाव है, और क्या आपने अपना ब्लड शुगर या ब्लड प्रेशर चेक किया?',
          en: 'Is there any change in your urination frequency, and did you check your blood sugar or blood pressure today?'
        }
      },
      meta_005_medication: {
        id: 'meta_005_medication',
        category: 'medication',
        text: {
          hi: 'क्या आपने इंसुलिन या डॉक्टर द्वारा दी गई शुगर और बीपी की दवाइयाँ खाने के साथ समय पर ली हैं?',
          en: 'Did you take all your insulin doses and prescribed diabetic and BP medicines on time with meals?'
        }
      },
      meta_006_closing: {
        id: 'meta_006_closing',
        category: 'closing',
        text: {
          hi: 'धन्यवाद। आपकी शुगर और स्वास्थ्य की जानकारी दर्ज कर ली गई है और डॉक्टर को भेज दी गई है। कृपया समय पर आहार लें।',
          en: 'Thank you. Your metabolic health update has been recorded and forwarded to your doctor. Please maintain your diet.'
        }
      }
    };
    return {
      category: 'METABOLIC_RENAL',
      diagnosis: diagnosis || 'Diabetes & Metabolic Care',
      protocolName: {
        hi: 'मधुमेह एवं मेटाबॉलिक जांच (Metabolic Protocol)',
        en: 'Diabetes & Metabolic Care Protocol'
      },
      questionIds: ['meta_001_greeting', 'meta_002_hypoglycemia_dizziness', 'meta_003_feet_wounds', 'meta_004_vitals_urination', 'meta_005_medication', 'meta_006_closing'],
      questionsBank: questions
    };
  }

  // DEFAULT / GENERAL
  const questions = {
    gen_001_greeting: {
      id: 'gen_001_greeting',
      category: 'greeting',
      text: {
        hi: `नमस्ते ${name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज अस्पताल से छुट्टी के बाद आपकी तबीयत कैसी लग रही है? बोल कर बताएं।`,
        en: `Hello ${name}. I am your Sanjeevni care companion. How are you feeling today following your hospital discharge?`
      }
    },
    gen_002_breathlessness: {
      id: 'gen_002_breathlessness',
      category: 'breathlessness',
      text: {
        hi: 'क्या आपको सांस लेने में कोई तकलीफ हो रही है, या चलने फिरने पर सांस फूल रही है?',
        en: 'Are you experiencing any shortness of breath, breathing difficulty, or chest tightness?'
      }
    },
    gen_003_fever_pain: {
      id: 'gen_003_fever_pain',
      category: 'fever_pain',
      text: {
        hi: 'क्या आपको बुखार, शरीर में तेज दर्द या कोई नई शारीरिक परेशानी महसूस हो रही है?',
        en: 'Do you have any fever, severe body pain, or any new symptoms since discharge?'
      }
    },
    gen_004_worsening: {
      id: 'gen_004_worsening',
      category: 'trend',
      text: {
        hi: 'क्या यह तकलीफ या कमजोरी कल के मुकाबले ज्यादा बढ़ गई है?',
        en: 'Has this discomfort or weakness become worse compared to yesterday?'
      }
    },
    gen_005_medication: {
      id: 'gen_005_medication',
      category: 'medication',
      text: {
        hi: 'क्या आपने आज अपने डॉक्टर द्वारा दी गई सभी दवाइयाँ समय पर ले ली हैं?',
        en: 'Did you take all your prescribed medicines on time today?'
      }
    },
    gen_006_closing: {
      id: 'gen_006_closing',
      category: 'closing',
      text: {
        hi: 'धन्यवाद। आपकी संपूर्ण स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर व स्वास्थ्य टीम को भेज दी गई है। आप कृपया आराम करें।',
        en: 'Thank you. Your health update has been recorded and shared with your clinical team. Please rest well.'
      }
    }
  };
  return {
    category: 'GENERAL',
    diagnosis: diagnosis || 'General Medical Recovery',
    protocolName: {
      hi: 'सामान्य स्वास्थ्य देखभाल जांच (Standard Protocol)',
      en: 'Standard Post-Discharge Recovery Protocol'
    },
    questionIds: ['gen_001_greeting', 'gen_002_breathlessness', 'gen_003_fever_pain', 'gen_004_worsening', 'gen_005_medication', 'gen_006_closing'],
    questionsBank: questions
  };
};

export default function RuralVoiceAssistantModal({ isOpen, onClose, patient, onCompleted }) {
  // Session level language state: 'hi' | 'en'
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [conversationState, setConversationState] = useState(ConversationState.IDLE);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [collectedSymptoms, setCollectedSymptoms] = useState([]);
  const [medicationAnswer, setMedicationAnswer] = useState(null);
  const [overallMood, setOverallMood] = useState('okay');
  const [finalAssessmentResult, setFinalAssessmentResult] = useState(null);
  const [muted, setMuted] = useState(false);

  // Guards & Locks
  const selectedLanguageRef = useRef('hi');
  const sessionActiveRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const currentQuestionIdRef = useRef(null);
  const currentSpeakingQuestionIdRef = useRef(null);
  const processedQuestionIdsRef = useRef(new Set());
  const conversationTurnIdRef = useRef(0);
  const currentRequestIdRef = useRef(0);
  const sessionIdRef = useRef(null);
  const initializedSessionRef = useRef(false);
  const activeUtteranceRef = useRef(null);

  const recognitionInstanceRef = useRef(null);
  const chatScrollRef = useRef(null);

  const patientName = patient?.user?.name || patient?.name || 'मरीज';
  const diagnosis = patient?.diagnosis || patient?.dischargeRecord?.diagnosis || '';
  const comorbidities = patient?.comorbidities || [];
  const localized = LOCALIZED_STRINGS[selectedLanguage] || LOCALIZED_STRINGS.hi;
  const activeProtocol = getDiseaseProtocol(patientName, diagnosis, comorbidities);
  const questionsBank = activeProtocol.questionsBank;

  // Auto-scroll conversation
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, conversationState]);

  // Stop all active audio & recognition operations cleanly
  const stopAllSpeechAndRecognition = useCallback(() => {
    isSpeakingRef.current = false;
    currentSpeakingQuestionIdRef.current = null;
    activeUtteranceRef.current = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
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
    isListeningRef.current = false;
  }, []);

  // Text-To-Speech associated strictly with question ID and explicit language support
  const speakQuestion = useCallback((questionObj, languageOverride = null) => {
    return new Promise((resolve) => {
      if (!sessionActiveRef.current || muted || typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      const qId = questionObj.id;
      const targetLang = languageOverride || selectedLanguageRef.current || 'hi';
      const textToSpeak = questionObj.text[targetLang] || questionObj.text.en || questionObj.text.hi;

      // Stop any running speech/mic
      stopAllSpeechAndRecognition();

      isSpeakingRef.current = true;
      currentSpeakingQuestionIdRef.current = qId;
      setConversationState(ConversationState.SPEAKING);

      // Web Speech API resume check for Chromium bug
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const targetLocale = targetLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.lang = targetLocale;
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      let targetVoice = null;
      if (targetLang === 'hi') {
        targetVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
      } else {
        targetVoice = voices.find(v => v.lang === 'en-IN') ||
                     voices.find(v => v.lang.startsWith('en'));
      }
      if (targetVoice) utterance.voice = targetVoice;

      // Retain reference on window and ref to prevent Chrome garbage collection of utterance
      activeUtteranceRef.current = utterance;
      if (typeof window !== 'undefined') {
        window.__carewatchUtterance = utterance;
      }

      let finished = false;
      const finishSpeech = () => {
        if (finished) return;
        finished = true;
        isSpeakingRef.current = false;
        currentSpeakingQuestionIdRef.current = null;
        activeUtteranceRef.current = null;
        resolve();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      // Dynamic safety timeout based on text length: ~2 words/sec + 2.5s buffer
      const wordCount = (textToSpeak || '').split(/\s+/).length;
      const timeoutMs = Math.max(3500, Math.min(12000, (wordCount / 2.2) * 1000 + 2500));
      const safetyTimer = setTimeout(() => {
        finishSpeech();
      }, timeoutMs);

      // Short 60ms delay after cancel before speak avoids Chrome queue lock
      setTimeout(() => {
        if (!sessionActiveRef.current || !isSpeakingRef.current) {
          clearTimeout(safetyTimer);
          finishSpeech();
          return;
        }
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('[VoiceAssistant] Speech synthesis speak error:', err);
          clearTimeout(safetyTimer);
          finishSpeech();
        }
      }, 60);
    });
  }, [muted, stopAllSpeechAndRecognition]);

  // Speech Recognition with single-instance and transcript deduplication
  const startListeningToPatient = useCallback((languageOverride = null) => {
    return new Promise((resolve) => {
      if (!sessionActiveRef.current) {
        resolve('');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setConversationState(ConversationState.WAITING_FOR_NEXT_QUESTION);
        resolve('');
        return;
      }

      stopAllSpeechAndRecognition();

      const targetLang = languageOverride || selectedLanguageRef.current || 'hi';
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = targetLang === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionInstanceRef.current = recognition;

      let finalTranscript = '';
      let hasResolved = false;

      const completeRecognition = (resultText) => {
        if (hasResolved) return;
        hasResolved = true;
        isListeningRef.current = false;
        if (recognitionInstanceRef.current === recognition) {
          recognitionInstanceRef.current = null;
        }
        setInterimTranscript('');
        resolve(resultText.trim());
      };

      recognition.onstart = () => {
        if (!sessionActiveRef.current) {
          try { recognition.abort(); } catch (e) {}
          completeRecognition('');
          return;
        }
        isListeningRef.current = true;
        setConversationState(ConversationState.LISTENING);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        for (let i = event.results.length - 1; i < event.results.length; i++) {
          const item = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += item + ' ';
          } else {
            currentInterim += item;
          }
        }
        setInterimTranscript(finalTranscript || currentInterim);
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          completeRecognition(finalTranscript);
          return;
        }
        console.warn('[VoiceAssistant] Speech recognition event error:', event.error);
        completeRecognition(finalTranscript);
      };

      recognition.onend = () => {
        completeRecognition(finalTranscript);
      };

      try {
        recognition.start();
      } catch (err) {
        console.warn('[VoiceAssistant] Recognition start error:', err);
        completeRecognition('');
      }
    });
  }, [stopAllSpeechAndRecognition]);

  // Complete and submit health check-in to backend & risk engine
  const finalizeCheckIn = useCallback(async (finalConversationMessages, finalSymptoms, finalMeds, finalMood) => {
    try {
      setConversationState(ConversationState.PROCESSING);

      const fullDialogue = finalConversationMessages
        .map(m => `${m.role === 'assistant' ? 'AI' : 'Patient'}: ${m.text}`)
        .join('\n');

      const currentLang = selectedLanguageRef.current || selectedLanguage;
      const payload = {
        rawInput: fullDialogue,
        channel: 'voice',
        language: currentLang,
        mood: finalMood || 'okay',
        structuredSymptoms: finalSymptoms.map(s => ({
          name: s.name,
          severity: s.severity || 'moderate',
          trend: s.trend || 'stable'
        })),
        medicationAdherence: {
          taken: finalMeds === 'Yes',
          notes: finalMeds ? `Voice response: ${finalMeds}` : 'Voice verified'
        }
      };

      const targetPatientId = patient?._id || patient?.id;
      const response = await patientService.submitCheckIn(targetPatientId || 'me', payload);

      setFinalAssessmentResult(response.data || response);
      setConversationState(ConversationState.COMPLETED);

      if (onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('[VoiceAssistant] Submission error:', err);
      toast.error(selectedLanguageRef.current === 'hi' ? 'जांच दर्ज करने में त्रुटि हुई' : 'Failed to record check-in');
      setConversationState(ConversationState.ERROR);
    }
  }, [patient, onCompleted, selectedLanguage]);

  // SINGLE SOURCE OF TRUTH: advanceConversation()
  const advanceConversation = useCallback(async (patientInputText = null) => {
    // Re-entrancy guard
    if (!sessionActiveRef.current || isAdvancingRef.current) {
      return;
    }

    isAdvancingRef.current = true;
    const currentTurn = conversationTurnIdRef.current;
    const requestId = ++currentRequestIdRef.current;

    try {
      // 1. Process patient's answer if provided
      let currentMessages = [...messages];
      let updatedSymptoms = [...collectedSymptoms];
      let updatedMeds = medicationAnswer;
      let updatedMood = overallMood;

      if (patientInputText && patientInputText.trim()) {
        const cleanAnswer = patientInputText.trim();
        const patientMessage = {
          id: `msg_pat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          role: 'patient',
          text: cleanAnswer,
          timestamp: new Date().toISOString()
        };
        currentMessages.push(patientMessage);
        setMessages([...currentMessages]);

        // Analyze patient response
        setConversationState(ConversationState.PROCESSING);
        const detected = extractSymptomsClientSide(cleanAnswer);
        if (detected.length > 0) {
          detected.forEach(d => {
            if (!updatedSymptoms.some(s => s.name === d.name)) {
              updatedSymptoms.push(d);
            }
          });
          setCollectedSymptoms([...updatedSymptoms]);
        }

        // Check medication adherence keywords
        const lower = cleanAnswer.toLowerCase();
        if (/haan|ha|yes|li hai|le li|taken/.test(lower) && !/nahi|no|bhookh|bhool/.test(lower)) {
          updatedMeds = 'Yes';
          setMedicationAnswer('Yes');
        } else if (/nahi|not|miss|missed|no/.test(lower)) {
          updatedMeds = 'No';
          setMedicationAnswer('No');
        }

        // Check mood
        if (/better|theek|achha|good|badhiya/.test(lower)) {
          updatedMood = 'good';
          setOverallMood('good');
        } else if (/worse|kharab|problem|dikkat|takleef/.test(lower)) {
          updatedMood = 'bad';
          setOverallMood('bad');
        }
      }

      if (!sessionActiveRef.current || requestId !== currentRequestIdRef.current) {
        return;
      }

      // 2. Select next adaptive question from the disease-specific protocol sequence
      const questionSequence = activeProtocol.questionIds;
      const currentIndex = currentQuestionIdRef.current
        ? questionSequence.indexOf(currentQuestionIdRef.current)
        : -1;

      const nextQuestionKey = questionSequence[currentIndex + 1];

      // If all questions are done, finalize
      if (!nextQuestionKey) {
        await finalizeCheckIn(currentMessages, updatedSymptoms, updatedMeds, updatedMood);
        return;
      }

      const nextQuestion = questionsBank[nextQuestionKey];

      // Duplicate question guard
      if (
        processedQuestionIdsRef.current.has(nextQuestion.id) ||
        currentQuestionIdRef.current === nextQuestion.id
      ) {
        console.warn(`[VoiceAssistant] Guard blocked duplicate question: ${nextQuestion.id}`);
        return;
      }

      // Lock current question
      const currentLang = selectedLanguageRef.current || selectedLanguage;
      currentQuestionIdRef.current = nextQuestion.id;
      processedQuestionIdsRef.current.add(nextQuestion.id);
      conversationTurnIdRef.current = currentTurn + 1;
      setCurrentQuestion(nextQuestion);
      setConversationState(ConversationState.ASKING);

      // Append assistant message in active language
      const localizedQuestionText = nextQuestion.text[currentLang] || nextQuestion.text.hi;
      const assistantMessage = {
        id: `msg_ai_${nextQuestion.id}`,
        role: 'assistant',
        text: localizedQuestionText,
        questionId: nextQuestion.id,
        language: currentLang,
        type: 'question',
        timestamp: new Date().toISOString()
      };

      currentMessages.push(assistantMessage);
      setMessages([...currentMessages]);

      // Speak Question aloud with explicit language
      await speakQuestion(nextQuestion, currentLang);

      if (!sessionActiveRef.current || requestId !== currentRequestIdRef.current) {
        return;
      }

      // If closing question was spoken, auto-finalize session
      if (nextQuestion.category === 'closing' || nextQuestion.id.endsWith('_closing') || nextQuestion.id === 'q_005_closing') {
        await finalizeCheckIn(currentMessages, updatedSymptoms, updatedMeds, updatedMood);
        return;
      }

      // Start listening automatically in active language
      isAdvancingRef.current = false;
      const patientVoiceAnswer = await startListeningToPatient(currentLang);

      if (!sessionActiveRef.current || requestId !== currentRequestIdRef.current) {
        return;
      }

      // If transcript was captured, continuously advance to the next question
      if (patientVoiceAnswer && patientVoiceAnswer.trim()) {
        advanceConversation(patientVoiceAnswer);
      } else {
        // No speech detected: leave in waiting state with fallback prompt
        setConversationState(ConversationState.WAITING_FOR_NEXT_QUESTION);
      }
    } catch (err) {
      console.error('[VoiceAssistant] advanceConversation error:', err);
      setConversationState(ConversationState.ERROR);
    } finally {
      isAdvancingRef.current = false;
    }
  }, [
    messages,
    collectedSymptoms,
    medicationAnswer,
    overallMood,
    selectedLanguage,
    questionsBank,
    speakQuestion,
    startListeningToPatient,
    finalizeCheckIn
  ]);

  // Initialize session safely (React StrictMode protected)
  useEffect(() => {
    if (!isOpen) {
      sessionActiveRef.current = false;
      initializedSessionRef.current = false;
      stopAllSpeechAndRecognition();
      setConversationState(ConversationState.IDLE);
      return;
    }

    // Modal Opened
    if (!initializedSessionRef.current) {
      initializedSessionRef.current = true;
      sessionActiveRef.current = true;
      sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      processedQuestionIdsRef.current = new Set();
      currentQuestionIdRef.current = null;
      conversationTurnIdRef.current = 0;
      currentRequestIdRef.current = 0;
      isAdvancingRef.current = false;
      selectedLanguageRef.current = selectedLanguage;

      setMessages([]);
      setCollectedSymptoms([]);
      setMedicationAnswer(null);
      setFinalAssessmentResult(null);
      setInterimTranscript('');
      setTextInput('');

      // Launch first question
      advanceConversation();
    }

    return () => {
      sessionActiveRef.current = false;
      stopAllSpeechAndRecognition();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle explicit language change during active session
  const handleLanguageChange = (newLang) => {
    if (newLang === selectedLanguageRef.current) return;

    // Invalidate pending async loops
    const reqId = ++currentRequestIdRef.current;
    isAdvancingRef.current = false;

    // Stop ongoing speech & listening immediately
    stopAllSpeechAndRecognition();

    // Update state & ref synchronously
    selectedLanguageRef.current = newLang;
    setSelectedLanguage(newLang);

    // If a question is already active, re-render it in the new language and speak
    if (currentQuestionIdRef.current) {
      const activeQ = questionsBank[currentQuestionIdRef.current];
      if (activeQ) {
        const localizedQuestionText = activeQ.text[newLang] || activeQ.text.hi;
        setCurrentQuestion(activeQ);

        // Update message text for the current question without creating a duplicate
        setMessages(prev =>
          prev.map(m =>
            m.questionId === activeQ.id
              ? { ...m, text: localizedQuestionText, language: newLang }
              : m
          )
        );

        // Re-speak question in newly selected language after brief tick, then listen in new language
        setTimeout(async () => {
          if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;

          await speakQuestion(activeQ, newLang);
          if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;

          const answer = await startListeningToPatient(newLang);
          if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;

          if (answer && answer.trim()) {
            advanceConversation(answer);
          } else {
            setConversationState(ConversationState.WAITING_FOR_NEXT_QUESTION);
          }
        }, 80);
      }
    }
  };

  // Safe manual close
  const handleClose = () => {
    sessionActiveRef.current = false;
    stopAllSpeechAndRecognition();
    onClose();
  };

  // Manual repeat question
  const handleRepeatQuestion = () => {
    if (!currentQuestionIdRef.current) return;
    const activeQ = questionsBank[currentQuestionIdRef.current];
    if (!activeQ) return;

    const reqId = ++currentRequestIdRef.current;
    isAdvancingRef.current = false;
    stopAllSpeechAndRecognition();

    const currentLang = selectedLanguageRef.current;
    speakQuestion(activeQ, currentLang).then(async () => {
      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;
      const answer = await startListeningToPatient(currentLang);
      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;

      if (answer && answer.trim()) {
        advanceConversation(answer);
      } else {
        setConversationState(ConversationState.WAITING_FOR_NEXT_QUESTION);
      }
    });
  };

  // Handle manual tap on mic or orb to interrupt speaking and speak immediately
  const handleTapToSpeak = () => {
    if (conversationState === ConversationState.COMPLETED) return;

    const reqId = ++currentRequestIdRef.current;
    isAdvancingRef.current = false;
    stopAllSpeechAndRecognition();

    const currentLang = selectedLanguageRef.current;
    setConversationState(ConversationState.LISTENING);
    startListeningToPatient(currentLang).then(answer => {
      if (!sessionActiveRef.current || reqId !== currentRequestIdRef.current) return;
      if (answer && answer.trim()) {
        advanceConversation(answer);
      } else {
        setConversationState(ConversationState.WAITING_FOR_NEXT_QUESTION);
      }
    });
  };

  // Text input submit fallback
  const handleTextFallbackSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isAdvancingRef.current) return;
    const submittedText = textInput;
    setTextInput('');
    advanceConversation(submittedText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl relative border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {localized.modalTitle}
              </h2>
              <p className="text-xs text-slate-500">{localized.modalSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute Voice */}
            <button
              type="button"
              onClick={() => {
                if (!muted) {
                  stopAllSpeechAndRecognition();
                  setMuted(true);
                } else {
                  setMuted(false);
                }
              }}
              className={`p-1.5 rounded-full border transition-colors ${
                muted ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
              title={muted ? 'Unmute voice' : 'Mute voice'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-full text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  selectedLanguage === 'hi' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                {localized.langToggleHi}
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  selectedLanguage === 'en' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                {localized.langToggleEn}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              title={localized.closeBtn}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Disease Protocol Banner */}
        <div className="px-4 sm:px-5 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 font-bold text-teal-900">
            <span className="p-1 bg-white rounded-md shadow-2xs text-teal-700 text-xs">🩺</span>
            <span className="truncate max-w-[280px] sm:max-w-none">
              {activeProtocol.protocolName[selectedLanguage] || activeProtocol.protocolName.hi}
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-100/90 text-teal-800 border border-teal-200/80 shrink-0">
            {activeProtocol.diagnosis}
          </span>
        </div>

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Animated Status Sphere (Clickable to interrupt speech & speak anytime) */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-teal-50/70 to-slate-50 border border-teal-100/60">
            <button
              type="button"
              onClick={handleTapToSpeak}
              disabled={conversationState === ConversationState.COMPLETED}
              title={
                conversationState === ConversationState.SPEAKING
                  ? (selectedLanguage === 'hi' ? 'रोकें और तुरंत बोलें (Click to interrupt & speak)' : 'Click to interrupt & speak')
                  : (selectedLanguage === 'hi' ? 'बोलने के लिए यहाँ दबाएँ (Tap to speak)' : 'Tap to speak')
              }
              className="relative mb-2 group cursor-pointer focus:outline-none transition-transform active:scale-95 disabled:cursor-default"
            >
              {conversationState === ConversationState.SPEAKING && (
                <span className="absolute -inset-3 rounded-full bg-teal-400/30 animate-ping" />
              )}
              {conversationState === ConversationState.LISTENING && (
                <span className="absolute -inset-3 rounded-full bg-red-500/35 animate-ping" />
              )}
              {conversationState === ConversationState.PROCESSING && (
                <span className="absolute -inset-3 rounded-full bg-amber-400/30 animate-pulse" />
              )}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                conversationState === ConversationState.SPEAKING
                  ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-105 group-hover:bg-teal-700'
                  : conversationState === ConversationState.LISTENING
                  ? 'bg-red-600 text-white ring-4 ring-red-100 scale-105 group-hover:bg-red-700'
                  : conversationState === ConversationState.PROCESSING
                  ? 'bg-amber-600 text-white ring-4 ring-amber-100'
                  : conversationState === ConversationState.COMPLETED
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : 'bg-slate-800 text-white'
              }`}>
                {conversationState === ConversationState.SPEAKING ? (
                  <Volume2 size={32} className="animate-pulse" />
                ) : conversationState === ConversationState.LISTENING ? (
                  <Mic size={32} className="animate-pulse" />
                ) : conversationState === ConversationState.PROCESSING ? (
                  <RefreshCw size={28} className="animate-spin" />
                ) : conversationState === ConversationState.COMPLETED ? (
                  <CheckCircle2 size={32} className="text-white" />
                ) : (
                  <Sparkles size={28} />
                )}
              </div>
            </button>

            {/* Audio Wave Bars */}
            {(conversationState === ConversationState.SPEAKING || conversationState === ConversationState.LISTENING) && (
              <div className="flex items-center gap-1.5 mb-2 h-4">
                <span className={`w-1 rounded-full ${conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_100ms] h-2.5`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_300ms] h-4`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_150ms] h-3`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_400ms] h-4`} />
                <span className={`w-1 rounded-full ${conversationState === ConversationState.LISTENING ? 'bg-red-500' : 'bg-teal-600'} animate-[bounce_0.8s_infinite_200ms] h-2`} />
              </div>
            )}

            <p className="font-extrabold text-sm sm:text-base text-slate-800 text-center">
              {conversationState === ConversationState.SPEAKING && <span className="text-teal-700">{localized.speakingStatus}</span>}
              {conversationState === ConversationState.LISTENING && <span className="text-red-600">{localized.listeningStatus}</span>}
              {conversationState === ConversationState.PROCESSING && <span className="text-amber-700">{localized.processingStatus}</span>}
              {conversationState === ConversationState.COMPLETED && <span className="text-emerald-700">{localized.completedStatus}</span>}
              {conversationState === ConversationState.WAITING_FOR_NEXT_QUESTION && (
                <span className="text-slate-600 text-xs sm:text-sm font-medium">{localized.noSpeechPrompt}</span>
              )}
            </p>

            {conversationState === ConversationState.SPEAKING && (
              <button
                type="button"
                onClick={handleTapToSpeak}
                className="mt-1.5 text-xs text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
              >
                {selectedLanguage === 'hi' ? 'रोकें और तुरंत बोलें (Tap to interrupt & speak)' : 'Tap to interrupt & speak'}
              </button>
            )}

            {interimTranscript && conversationState === ConversationState.LISTENING && (
              <p className="mt-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 text-center max-w-sm">
                "{interimTranscript}"
              </p>
            )}
          </div>

          {/* Conversation Transcript */}
          <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    AI
                  </span>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] font-medium leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                      : 'bg-teal-600 text-white rounded-tr-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'patient' && (
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {selectedLanguage === 'hi' ? 'आप' : 'You'}
                  </span>
                )}
              </div>
            ))}
            <div ref={chatScrollRef} />
          </div>

          {/* Identified Symptoms Pill Tags */}
          {collectedSymptoms.length > 0 && (
            <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200 text-xs">
              <p className="font-bold text-teal-900 mb-1.5">{localized.detectedSymptomsTitle}</p>
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

          {/* Final Completed Summary Card */}
          {conversationState === ConversationState.COMPLETED && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs sm:text-sm animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck size={18} />
                <span>{localized.summaryTitle}</span>
              </div>
              <p className="text-emerald-700 font-medium">{localized.finalReassurance}</p>
              <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap gap-3 text-xs text-emerald-900">
                <span>
                  <strong>{localized.medicationLabel}</strong> {medicationAnswer === 'Yes' ? localized.medsTaken : localized.medsMissed}
                </span>
                <span>
                  <strong>Risk Status:</strong> {finalAssessmentResult?.riskLevel || 'Analyzed & Active'}
                </span>
              </div>
            </div>
          )}

          {/* Text input fallback so patient can type if voice is noisy or mic unavailable */}
          {conversationState !== ConversationState.COMPLETED && (
            <form onSubmit={handleTextFallbackSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={localized.textFallbackPlaceholder}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={handleRepeatQuestion}
            disabled={conversationState === ConversationState.COMPLETED || isAdvancingRef.current}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
            title="Repeat current question"
          >
            <RefreshCw size={14} /> {localized.repeatBtn}
          </button>

          {conversationState === ConversationState.COMPLETED ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              {localized.closeBtn}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTapToSpeak}
                className={`px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                  conversationState === ConversationState.LISTENING
                    ? 'bg-red-600 text-white ring-2 ring-red-300 animate-pulse'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
                title={selectedLanguage === 'hi' ? 'माइक चालू करें और बोलें' : 'Turn on mic and speak'}
              >
                <Mic size={14} />
                <span>{selectedLanguage === 'hi' ? 'बोलें (Tap to Speak)' : 'Tap to Speak'}</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                {localized.endCheckinBtn}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
