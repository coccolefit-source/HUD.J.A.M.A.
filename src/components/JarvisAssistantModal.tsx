import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Radio, 
  CheckCircle2, 
  Calendar,
  Layers,
  Navigation,
  RefreshCw,
  Sliders,
  RotateCcw,
  Check,
  Settings
} from 'lucide-react';
import { executeJarvisOrchestration, speakWithElevenLabs, stopCurrentSpeech, getTodayPendingTasksSummary, AgentResult } from '../lib/jarvisAgent';
import { Project } from '../types';
import { TabType } from './Sidebar';

interface JarvisAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
  projects: Project[];
  onRefreshData: () => Promise<void> | void;
  initialCommand?: string;
  isWakeWordActive?: boolean;
  onToggleWakeWord?: (active: boolean) => void;
  isClapDetectionActive?: boolean;
  onToggleClapDetection?: (active: boolean) => void;
  clapSensitivity?: number;
  onChangeClapSensitivity?: (val: number) => void;
}

export const JarvisAssistantModal: React.FC<JarvisAssistantModalProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigate,
  projects,
  onRefreshData,
  initialCommand,
  isWakeWordActive = true,
  onToggleWakeWord,
  isClapDetectionActive = true,
  onToggleClapDetection,
  clapSensitivity = 6,
  onChangeClapSensitivity
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);
  const [logs, setLogs] = useState<Array<{ sender: 'user' | 'jarvis'; text: string; time: string; type?: string }>>([]);

  // Voice Customization State
  const [isVoiceConfigOpen, setIsVoiceConfigOpen] = useState(false);
  const [customVoiceId, setCustomVoiceId] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('prime_elevenlabs_voice_id') : null;
    if (saved && saved !== 'pNInz6obpgDQGcFmaJgB' && saved !== 'IKne3meq5aSn9XLyUdCD') {
      return saved;
    }
    return '0SKRlkm2sk4SFqESZzly'; // Carlos Pro
  });
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('jarvis_browser_voice_uri')) || '';
  });
  const [voiceRate, setVoiceRate] = useState<number>(() => {
    const val = typeof window !== 'undefined' ? localStorage.getItem('jarvis_voice_rate') : null;
    return val ? parseFloat(val) : 1.02;
  });
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    const val = typeof window !== 'undefined' ? localStorage.getItem('jarvis_voice_pitch') : null;
    return val ? parseFloat(val) : 1.0;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setBrowserVoices(v);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  const handleUpdateElevenVoice = (voiceId: string) => {
    setCustomVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prime_elevenlabs_voice_id', voiceId);
    }
  };

  const handleUpdateBrowserVoice = (uri: string) => {
    setSelectedBrowserVoiceURI(uri);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_browser_voice_uri', uri);
    }
  };

  const handleUpdateRate = (rate: number) => {
    setVoiceRate(rate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_voice_rate', String(rate));
    }
  };

  const handleUpdatePitch = (pitch: number) => {
    setVoicePitch(pitch);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_voice_pitch', String(pitch));
    }
  };

  const handleTestVoice = () => {
    setIsSpeaking(true);
    speakWithElevenLabs('Bienvenido de nuevo, señor. Todos los sistemas de Prime están en línea y calibrados con su voz de ElevenLabs.').finally(() => {
      setIsSpeaking(false);
    });
  };

  const handleResetVoiceDefaults = () => {
    handleUpdateElevenVoice('0SKRlkm2sk4SFqESZzly');
    handleUpdateBrowserVoice('');
    handleUpdateRate(1.02);
    handleUpdatePitch(1.0);
  };

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<string>('');

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
        setInputText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcriptRef.current && transcriptRef.current.trim()) {
          const captured = transcriptRef.current.trim();
          transcriptRef.current = '';
          handleSendCommand(captured);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopCurrentSpeech();
    };
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isProcessing]);

  // Start voice on open or process initial command
  useEffect(() => {
    let isCancelled = false;

    if (isOpen) {
      if (initialCommand && initialCommand.trim()) {
        handleSendCommand(initialCommand.trim());
      } else {
        // Greet with friendly greeting + today's pending tasks
        if (logs.length === 0) {
          (async () => {
            const { summaryText } = await getTodayPendingTasksSummary(projects);
            if (isCancelled) return;
            const welcome = `¡Hola! Qué gusto verte de nuevo. Estoy listo para ayudarte. ${summaryText}`;
            setLogs([
              {
                sender: 'jarvis',
                text: welcome,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'consultar_pendientes',
              },
            ]);
            setIsSpeaking(true);
            await speakWithElevenLabs(welcome);
            if (!isCancelled) {
              setIsSpeaking(false);
              startListening();
            }
          })();
        } else {
          startListening();
        }
      }
    } else {
      stopListening();
      stopCurrentSpeech();
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, initialCommand]);

  const startListening = () => {
    stopCurrentSpeech();
    transcriptRef.current = '';
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Error starting speech recognition:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendCommand = async (commandToSend?: string) => {
    const textToProcess = (commandToSend || inputText || transcript || transcriptRef.current).trim();
    if (!textToProcess || isProcessing) return;

    transcriptRef.current = '';
    stopListening();
    stopCurrentSpeech();
    setIsProcessing(true);
    setInputText('');
    setTranscript('');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [...prev, { sender: 'user', text: textToProcess, time: timeStr }]);

    try {
      setIsSpeaking(true);
      const result = await executeJarvisOrchestration({
        userPrompt: textToProcess,
        currentDate: new Date().toISOString(),
        currentView: currentTab,
        projects,
        onNavigate,
        onRefreshData
      });

      setLastResult(result);
      setLogs(prev => [
        ...prev, 
        { 
          sender: 'jarvis', 
          text: result.message, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: result.type
        }
      ]);
    } catch (error: any) {
      console.error('Error procesando comando:', error);
      const errMsg = 'No alcancé a entenderte bien, ¿me lo podrías repetir?';
      setLogs(prev => [...prev, { sender: 'jarvis', text: errMsg, time: timeStr }]);
      speakWithElevenLabs(errMsg);
    } finally {
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  };

  const handleReplayVoice = (text: string) => {
    setIsSpeaking(true);
    speakWithElevenLabs(text).finally(() => setIsSpeaking(false));
  };

  const handleStopVoice = () => {
    stopCurrentSpeech();
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[#080B11]/95 border border-[var(--hud-accent,#00F0FF)]/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(var(--hud-accent-rgb,0,240,255),0.25)] relative flex flex-col max-h-[90vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--hud-accent,#00F0FF)]/15 border border-[var(--hud-accent,#00F0FF)]/40 text-[var(--hud-accent,#00F0FF)] shadow-[0_0_15px_rgba(var(--hud-accent-rgb,0,240,255),0.3)]">
              <Radio className={`w-5 h-5 ${isListening || isSpeaking ? 'animate-pulse' : ''}`} />
              {(isListening || isSpeaking) && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--hud-accent,#00F0FF)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--hud-accent,#00F0FF)]"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-wider flex items-center gap-1.5">
                  PRIME <span className="text-[10px] text-[var(--hud-accent,#00F0FF)] font-semibold px-2 py-0.5 rounded border border-[var(--hud-accent,#00F0FF)]/40 bg-[var(--hud-accent,#00F0FF)]/10">ASISTENTE IA</span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[var(--hud-accent,#00F0FF)]" />
                Gemini Function Calling &middot; ElevenLabs TTS &middot; Supabase Core
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsVoiceConfigOpen(!isVoiceConfigOpen)}
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                isVoiceConfigOpen
                  ? 'bg-[var(--hud-accent,#00F0FF)]/20 border-[var(--hud-accent,#00F0FF)]/50 text-[var(--hud-accent,#00F0FF)] shadow-[0_0_12px_rgba(var(--hud-accent-rgb,0,240,255),0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800'
              }`}
              title="Ajustar y Cambiar Voz de PRIME"
            >
              <Sliders className="w-4 h-4" />
            </button>
            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopVoice}
                className="p-2 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Silenciar voz"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar Asistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice Customization Panel */}
        <AnimatePresence>
          {isVoiceConfigOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3 pt-2"
            >
              <div className="p-4 rounded-xl bg-slate-900/90 border border-[var(--hud-accent,#00F0FF)]/30 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-[var(--hud-accent,#00F0FF)] font-bold">
                    <Sliders className="w-4 h-4" />
                    <span>CALIBRACIÓN DE VOZ DE PRIME</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetVoiceDefaults}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Restablecer valores por defecto"
                  >
                    <RotateCcw className="w-3 h-3" /> Restablecer
                  </button>
                </div>

                {/* ElevenLabs Voice Section */}
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Tus Voces Conectadas en ElevenLabs:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                    {[
                      { id: '0SKRlkm2sk4SFqESZzly', label: 'Carlos Pro (Latino)' },
                      { id: 'LHNW6W9WobxVOw2nqJuR', label: 'Diego R (Profundo)' },
                      { id: 'XyPIlDiohfZSbL4jAB2e', label: 'Marco (Español)' },
                      { id: 'lo1O1Dz1Tu4FWVEPaxuT', label: 'Oliver (Narrador)' },
                      { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Estilo Prime)' },
                      { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Cálido IA)' },
                      { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Resonante)' },
                      { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric (Natural)' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleUpdateElevenVoice(v.id)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] text-left transition-all cursor-pointer flex items-center justify-between ${
                          customVoiceId === v.id
                            ? 'bg-[var(--hud-accent,#00F0FF)]/20 border-[var(--hud-accent,#00F0FF)] text-slate-100 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{v.label}</span>
                        {customVoiceId === v.id && <Check className="w-3 h-3 text-[var(--hud-accent,#00F0FF)] shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customVoiceId}
                      onChange={(e) => handleUpdateElevenVoice(e.target.value.trim())}
                      placeholder="Pega aquí el Voice ID de ElevenLabs..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-[var(--hud-accent,#00F0FF)] text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Local Browser Voices Dropdown */}
                {browserVoices.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                      Voz del Sistema / Navegador (Respaldo en Español):
                    </label>
                    <select
                      value={selectedBrowserVoiceURI}
                      onChange={(e) => handleUpdateBrowserVoice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-[var(--hud-accent,#00F0FF)] text-slate-200 text-xs font-mono"
                    >
                      <option value="">Automática (Voz humana / neural más natural)</option>
                      {[...browserVoices]
                        .sort((a, b) => {
                          const aEs = a.lang.toLowerCase().startsWith('es') ? 10 : 0;
                          const bEs = b.lang.toLowerCase().startsWith('es') ? 10 : 0;
                          const aNeural = (a.name.toLowerCase().includes('natural') || a.name.toLowerCase().includes('neural') || a.name.toLowerCase().includes('online') || a.name.toLowerCase().includes('google')) ? 5 : 0;
                          const bNeural = (b.name.toLowerCase().includes('natural') || b.name.toLowerCase().includes('neural') || b.name.toLowerCase().includes('online') || b.name.toLowerCase().includes('google')) ? 5 : 0;
                          return (bEs + bNeural) - (aEs + aNeural);
                        })
                        .map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang}) {v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('google') ? '[Natural]' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Acoustic Pitch & Rate Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Velocidad:</span>
                      <span className="text-slate-200 font-bold">{voiceRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.25"
                      step="0.05"
                      value={voiceRate}
                      onChange={(e) => handleUpdateRate(parseFloat(e.target.value))}
                      className="w-full accent-[var(--hud-accent,#00F0FF)] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tono (Pitch):</span>
                      <span className="text-slate-200 font-bold">{voicePitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.25"
                      step="0.05"
                      value={voicePitch}
                      onChange={(e) => handleUpdatePitch(parseFloat(e.target.value))}
                      className="w-full accent-[var(--hud-accent,#00F0FF)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Clap Detection Sensitivity */}
                {onChangeClapSensitivity && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span className="font-semibold">Sensibilidad de Activación por Sonido:</span>
                      <span className="text-[var(--hud-accent,#00F0FF)] font-bold">Nivel {clapSensitivity} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={clapSensitivity}
                      onChange={(e) => onChangeClapSensitivity(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                )}

                {/* Test Voice Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="px-3 py-1.5 rounded-lg bg-[var(--hud-accent,#00F0FF)]/20 hover:bg-[var(--hud-accent,#00F0FF)]/30 border border-[var(--hud-accent,#00F0FF)]/40 text-[var(--hud-accent,#00F0FF)] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Probar Voz Calibrada</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tactical Status Bar */}
        <div className="my-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              isProcessing 
                ? 'bg-amber-400 animate-ping' 
                : isListening 
                ? 'bg-rose-400 animate-pulse' 
                : isSpeaking 
                ? 'bg-[var(--hud-accent,#00F0FF)] animate-pulse' 
                : 'bg-emerald-400'
            }`} />
            <span className="text-slate-300">
              {
                isProcessing 
                  ? 'PROCESANDO...' 
                  : isListening 
                  ? 'ESCUCHANDO...' 
                  : isSpeaking 
                  ? 'HABLANDO...' 
                  : 'LISTO'
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {onToggleWakeWord && (
              <button
                type="button"
                onClick={() => onToggleWakeWord(!isWakeWordActive)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                  isWakeWordActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Activar o desactivar activación al decir 'Prime' (Praim)"
              >
                <Radio className={`w-2.5 h-2.5 ${isWakeWordActive ? 'animate-pulse text-emerald-400' : ''}`} />
                <span>"Prime": {isWakeWordActive ? 'ON' : 'OFF'}</span>
              </button>
            )}
            {onToggleClapDetection && (
              <button
                type="button"
                onClick={() => onToggleClapDetection(!isClapDetectionActive)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                  isClapDetectionActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Activar o desactivar activación automática"
              >
                <span className={`w-2 h-2 rounded-full ${isClapDetectionActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{isClapDetectionActive ? 'ON' : 'OFF'}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-500 uppercase hidden sm:inline">
              VISTA: {currentTab}
            </span>
          </div>
        </div>

        {/* Conversation Box */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 p-3 my-2 bg-slate-950/70 border border-slate-800/80 rounded-xl min-h-[180px] max-h-[300px]"
        >
          {logs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
                <span>{log.sender === 'user' ? 'TÚ' : 'PRIME'}</span>
                <span>&bull;</span>
                <span>{log.time}</span>
              </div>
              <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed relative ${
                log.sender === 'user'
                  ? 'bg-[var(--hud-accent,#00F0FF)]/20 border border-[var(--hud-accent,#00F0FF)]/40 text-slate-100 font-sans'
                  : 'bg-slate-900 border border-slate-700/80 text-slate-200 font-mono shadow-md'
              }`}>
                {log.type && (
                  <div className="mb-1.5 flex items-center gap-1">
                    {log.type === 'crear_tarea' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Tarea Creada
                      </span>
                    )}
                    {log.type === 'consultar_pendientes' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Tareas Pendientes
                      </span>
                    )}
                    {log.type === 'navegar' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> Navegación
                      </span>
                    )}
                  </div>
                )}
                <p>{log.text}</p>
                {log.sender === 'jarvis' && (
                  <button
                    type="button"
                    onClick={() => handleReplayVoice(log.text)}
                    className="mt-2 text-[10px] text-slate-400 hover:text-[var(--hud-accent,#00F0FF)] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Repetir voz
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--hud-accent,#00F0FF)]" />
              <span>PRIME está procesando tu solicitud...</span>
            </div>
          )}

          {isListening && transcript && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono animate-pulse">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>{transcript}</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="my-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleSendCommand('¿Qué tengo para hoy?')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 hover:border-[var(--hud-accent,#00F0FF)]/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-3 h-3 text-sky-400" /> &iquest;Qu&eacute; tengo para hoy?
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('¿Qué es la dopamina y cómo afecta mi productividad?')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 hover:border-[var(--hud-accent,#00F0FF)]/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" /> &iquest;Qu&eacute; es la dopamina?
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Dame un consejo táctico para vencer la procrastinación')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 hover:border-[var(--hud-accent,#00F0FF)]/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-amber-400" /> Vencer procrastinaci&oacute;n
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Crea la tarea Revisar avances para mañana')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 hover:border-[var(--hud-accent,#00F0FF)]/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Crear tarea ma&ntilde;ana
          </button>
          <button
            type="button"
            onClick={() => handleSendCommand('Ir a proyectos')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 hover:border-[var(--hud-accent,#00F0FF)]/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Navigation className="w-3 h-3 text-purple-400" /> Ir a Proyectos
          </button>
        </div>

        {/* Input Bar & Mic Trigger */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-xl border font-bold transition-all flex items-center justify-center cursor-pointer relative shadow-lg ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : 'bg-[var(--hud-accent,#00F0FF)]/15 text-[var(--hud-accent,#00F0FF)] border-[var(--hud-accent,#00F0FF)]/40 hover:bg-[var(--hud-accent,#00F0FF)]/25'
            }`}
            title={isListening ? 'Detener micrófono' : 'Hablar con PRIME'}
          >
            {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendCommand();
              }
            }}
            placeholder={isListening ? 'Escuchando tu voz...' : 'Escribe o di una orden: "Crea una tarea para el próximo miércoles..."'}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-[var(--hud-accent,#00F0FF)] focus:outline-none text-slate-200 text-xs font-mono placeholder:text-slate-500 transition-all"
          />

          <button
            type="button"
            onClick={() => handleSendCommand()}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 rounded-xl bg-[var(--hud-accent,#00F0FF)] text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_15px_rgba(var(--hud-accent-rgb,0,240,255),0.3)]"
            title="Enviar comando"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
