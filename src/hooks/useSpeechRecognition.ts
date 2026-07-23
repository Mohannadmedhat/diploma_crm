import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscript?: (transcript: string) => void;
}

export function useSpeechRecognition({ lang = 'ar-EG', onTranscript }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang;

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (onTranscript && transcript) {
          onTranscript(transcript);
        }
      };
      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, [lang, onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('إملاء الصوت غير مدعوم في متصفحك الحالي. يرجى استخدام متصفح Google Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }, [isListening]);

  return {
    isListening,
    toggleListening,
    hasSupport: !!(typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  };
}
