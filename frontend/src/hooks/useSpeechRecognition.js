import { useCallback, useEffect, useRef, useState } from 'react';

export default function useSpeechRecognition({ language = 'en-IN', onResult } = {}) {
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    setIsSupported(true);
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.onstart = () => { setError(''); setIsListening(true); };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => { setIsListening(false); setError(event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Voice input could not be completed.'); };
    recognition.onresult = (event) => onResult?.(event.results[0][0].transcript);
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [language, onResult]);
  const startListening = useCallback(() => { if (!recognitionRef.current) { setError('Voice input is not supported in this browser.'); return; } recognitionRef.current.start(); }, []);
  const stopListening = useCallback(() => recognitionRef.current?.stop(), []);
  return { isSupported, isListening, error, startListening, stopListening };
}
