import { useState, useEffect, useRef, useCallback } from 'react';
import { playJarvisWakeChirp } from './jarvisAgent';

interface UseWakeWordOptions {
  onWake: (immediateCommand?: string, triggerType?: 'voice' | 'clap') => void;
  isModalOpen: boolean;
}

const WAKE_WORD_STORAGE_KEY = 'jarvis_wake_word_enabled';
const CLAP_STORAGE_KEY = 'jarvis_clap_detection_enabled';
const CLAP_SENSITIVITY_KEY = 'jarvis_clap_sensitivity';

export function useWakeWord({ onWake, isModalOpen }: UseWakeWordOptions) {
  const [isWakeWordActive, setIsWakeWordActiveState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(WAKE_WORD_STORAGE_KEY);
        return saved !== null ? saved === 'true' : false;
      }
    } catch (e) {
      // fallback
    }
    return false;
  });

  const [isClapDetectionActive, setIsClapDetectionActiveState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(CLAP_STORAGE_KEY);
        return saved !== null ? saved === 'true' : true;
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  // Sensitivity 1 to 10 (default 6)
  const [clapSensitivity, setClapSensitivityState] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(CLAP_SENSITIVITY_KEY);
        return saved !== null ? parseFloat(saved) : 6;
      }
    } catch (e) {
      // fallback
    }
    return 6;
  });

  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isListeningForClap, setIsListeningForClap] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  // AudioContext & Stream refs for Clap Detection
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastClapTimeRef = useRef<number>(0);

  const setIsWakeWordActive = useCallback((active: boolean) => {
    setIsWakeWordActiveState(active);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(active));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const setIsClapDetectionActive = useCallback((active: boolean) => {
    setIsClapDetectionActiveState(active);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CLAP_STORAGE_KEY, String(active));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const setClapSensitivity = useCallback((val: number) => {
    setClapSensitivityState(val);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CLAP_SENSITIVITY_KEY, String(val));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const stopRecognition = useCallback(() => {
    isStoppingRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setIsListeningForWakeWord(false);
  }, []);

  const stopClapDetector = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {
        // ignore
      }
      audioCtxRef.current = null;
    }
    setIsListeningForClap(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    if (isModalOpen || !isWakeWordActive) {
      stopRecognition();
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListeningForWakeWord(true);
        isStoppingRef.current = false;
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript || '';
          const lower = transcript.toLowerCase().trim();

          // Regex matching: "Prime", "Praim", "Oye Prime", "Hey Prime", "Oye Praim"
          const wakeMatch = lower.match(/(?:^|\b)(?:oye\s+|hey\s+|hola\s+)?(?:prime|praim|praym|prain|prai|brain)\b\s*(.*)/i);
          if (wakeMatch) {
            const trailingCommand = wakeMatch[1]?.trim();

            playJarvisWakeChirp();
            stopRecognition();
            stopClapDetector();
            onWake(trailingCommand || undefined, 'voice');
            return;
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setIsSupported(false);
          setIsListeningForWakeWord(false);
          return;
        }
      };

      recognition.onend = () => {
        setIsListeningForWakeWord(false);
        if (!isStoppingRef.current && isWakeWordActive && !isModalOpen) {
          restartTimerRef.current = setTimeout(() => {
            startRecognition();
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListeningForWakeWord(false);
    }
  }, [isModalOpen, isWakeWordActive, onWake, stopRecognition, stopClapDetector]);

  // Acoustic Clap Detection via Web Audio API
  const startClapDetector = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    if (isModalOpen || !isClapDetectionActive) {
      stopClapDetector();
      return;
    }

    stopClapDetector();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Check again if modal opened while awaiting permission
      if (isModalOpen || !isClapDetectionActive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Highpass filter to isolate crisp percussive transient of a clap (> 900 Hz)
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15;

      source.connect(filter);
      filter.connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      let rollingAvgPeak = 0.02;
      let peakHistory: number[] = [];

      setIsListeningForClap(true);

      const checkAudioFrame = () => {
        if (!audioCtxRef.current || isModalOpen || !isClapDetectionActive) return;

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // Compute normalized max amplitude peak (0.0 to 1.0)
        let maxPeak = 0;
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128;
          const abs = Math.abs(sample);
          if (abs > maxPeak) maxPeak = abs;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);

        // High frequency broadband energy check (bins 15 to 120)
        let highFreqEnergy = 0;
        for (let i = 15; i < 120; i++) {
          highFreqEnergy += freqData[i];
        }
        const avgHighFreq = highFreqEnergy / 105; // 0 to 255

        // Sensitivity mapping (1 = least sensitive / high threshold, 10 = very sensitive / low threshold)
        // At sensitivity 6: minPeak ~ 0.30, ratio ~ 3.6, minHighFreq ~ 36
        const minPeakThreshold = Math.max(0.14, 0.58 - clapSensitivity * 0.045);
        const minHighFreqThreshold = Math.max(18, 65 - clapSensitivity * 4.5);

        const now = performance.now();
        const isSharpSpike = maxPeak > minPeakThreshold && maxPeak > rollingAvgPeak * 3.2;
        const isBroadbandTransient = avgHighFreq > minHighFreqThreshold && maxPeak / (rms + 0.001) > 2.1;

        if (isSharpSpike && isBroadbandTransient && now - lastClapTimeRef.current > 1200) {
          // Verify rapid decay within 85ms so sustained loud speech doesn't false trigger
          const spikeTime = now;
          lastClapTimeRef.current = spikeTime;

          setTimeout(() => {
            if (!audioCtxRef.current || isModalOpen) return;
            analyser.getByteTimeDomainData(timeData);
            let afterPeak = 0;
            for (let i = 0; i < timeData.length; i++) {
              const abs = Math.abs((timeData[i] - 128) / 128);
              if (abs > afterPeak) afterPeak = abs;
            }

            // A real hand clap decays rapidly (< 65% of spike peak after 75ms)
            if (afterPeak < maxPeak * 0.68) {
              playJarvisWakeChirp();
              stopRecognition();
              stopClapDetector();
              onWake(undefined, 'clap');
            }
          }, 70);
        }

        // Update rolling ambient baseline
        peakHistory.push(maxPeak);
        if (peakHistory.length > 20) peakHistory.shift();
        rollingAvgPeak = peakHistory.reduce((a, b) => a + b, 0) / peakHistory.length;

        rafRef.current = requestAnimationFrame(checkAudioFrame);
      };

      rafRef.current = requestAnimationFrame(checkAudioFrame);
    } catch (err) {
      setIsListeningForClap(false);
    }
  }, [isModalOpen, isClapDetectionActive, clapSensitivity, onWake, stopClapDetector, stopRecognition]);

  // Manage Speech Wake Word lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    if (isWakeWordActive && !isModalOpen) {
      startRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [isWakeWordActive, isModalOpen, startRecognition, stopRecognition]);

  // Manage Acoustic Clap Detector lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isClapDetectionActive && !isModalOpen) {
      startClapDetector();
    } else {
      stopClapDetector();
    }

    return () => {
      stopClapDetector();
    };
  }, [isClapDetectionActive, isModalOpen, startClapDetector, stopClapDetector]);

  return {
    isWakeWordActive,
    setIsWakeWordActive,
    isClapDetectionActive,
    setIsClapDetectionActive,
    clapSensitivity,
    setClapSensitivity,
    isListeningForWakeWord,
    isListeningForClap,
    isSupported,
  };
}
