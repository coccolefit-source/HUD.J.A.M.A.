import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Flame, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Target, 
  Clock, 
  Sparkles,
  Award,
  History,
  Info
} from 'lucide-react';
import { FocusSessionEntry } from '../../types';

interface FocusTimerProps {
  onFocusSessionComplete: (minutes: number, xpEarned: number, taskName: string) => void;
  todaySessions?: FocusSessionEntry[];
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  onFocusSessionComplete,
  todaySessions = []
}) => {
  // Free minute input state (default 25)
  const [minutesInput, setMinutesInput] = useState<number>(25);
  const [taskName, setTaskName] = useState<string>('');
  
  // Timer state in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Completion Modal State
  const [completedSessionData, setCompletedSessionData] = useState<{
    minutes: number;
    xpEarned: number;
    taskName: string;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate XP dynamically: 4 XP per minute
  const projectedXP = Math.max(1, Math.round((minutesInput || 1) * 4));

  // Audio synthesizer via Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'start' | 'tick' | 'countdown' | 'finish') => {
    if (!soundEnabled || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;

      if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'countdown') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'finish') {
        const now = ctx.currentTime;
        const notes = [440, 880]; // Grave then acute
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.25, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.3);
        });
      }
    } catch {
      // Audio fallback silent
    }
  };

  // Update timer whenever user types minutes directly (only when not running)
  const handleMinutesChange = (newVal: number) => {
    if (isRunning) return;
    const clamped = Math.max(1, Math.min(720, isNaN(newVal) ? 1 : newVal));
    setMinutesInput(clamped);
    const secs = clamped * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            handleFinish();
            return 0;
          }
          if (prev <= 6 && prev > 1) {
            playSound('countdown');
          } else if (prev % 60 === 0) {
            playSound('tick');
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Handle Session Completion
  const handleFinish = () => {
    playSound('finish');
    const xp = Math.max(1, Math.round(minutesInput * 4));
    const finalTask = taskName.trim() || 'Enfoque General Táctico';
    
    // Trigger callback to App state
    onFocusSessionComplete(minutesInput, xp, finalTask);

    // Show completion overlay modal
    setCompletedSessionData({
      minutes: minutesInput,
      xpEarned: xp,
      taskName: finalTask
    });
  };

  const handleStart = () => {
    initAudio();
    if (remainingSeconds <= 0) {
      const secs = minutesInput * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
    }
    playSound('start');
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    const secs = minutesInput * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  // Format display time HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // SVG Progress Ring Calculation
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Preset quick shortcuts
  const PRESETS = [
    { label: '5 min', mins: 5 },
    { label: '15 min', mins: 15 },
    { label: '25 min (Pomodoro)', mins: 25 },
    { label: '45 min', mins: 45 },
    { label: '60 min (Foco Profundo)', mins: 60 },
    { label: '90 min (Misión)', mins: 90 }
  ];

  // Stats today
  const totalMinutesToday = todaySessions.reduce((acc, s) => acc + s.minutes, 0);
  const totalXPToday = todaySessions.reduce((acc, s) => acc + s.xpEarned, 0);

  return (
    <div className="space-y-6 font-mono text-slate-100 max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-[#101827]/90 p-6 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_25px_rgba(6,182,212,0.1)] backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-[#00FFCC] shadow-[0_0_15px_rgba(0,255,204,0.25)] shrink-0">
            <Clock className="w-7 h-7 text-[#00FFCC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-100 tracking-wider">
                TEMPORIZADOR TÁCTICO DE ENFOQUE
              </h2>
              <span className="text-[10px] bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40 px-2 py-0.5 rounded font-bold">
                ENFOQUE DIRECTO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Establece la cantidad libre de minutos, activa el hiperfoco y gana +4 XP por cada minuto completado.
            </p>
          </div>
        </div>

        {/* Today Summary Pills */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#0A0D14] p-3 rounded-xl border border-[#06B6D4]/30 flex items-center gap-3 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            <Flame className="w-5 h-5 text-[#F97316]" />
            <div>
              <span className="text-[10px] text-slate-400 block">ENFOQUE HOY</span>
              <span className="text-sm font-extrabold text-[#00F0FF]">{totalMinutesToday} min</span>
            </div>
          </div>
          <div className="bg-[#0A0D14] p-3 rounded-xl border border-[#00FFCC]/30 flex items-center gap-3 shadow-[0_0_10px_rgba(0,255,204,0.1)]">
            <Zap className="w-5 h-5 text-[#00FFCC]" />
            <div>
              <span className="text-[10px] text-slate-400 block">XP GANADO HOY</span>
              <span className="text-sm font-extrabold text-[#00FFCC]">+{totalXPToday} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Focus Control Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Direct Minutes Input & Controls */}
        <div className="lg:col-span-5 bg-[#101827]/90 p-6 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-md space-y-6 flex flex-col justify-between">
          
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#06B6D4]/20 pb-3">
              <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00F0FF]" /> 1. CONFIGURACIÓN DE TIEMPO
              </span>
            </div>

            {/* Direct Input Field - Prominent & Interactive */}
            <div className="space-y-2 bg-[#0A0D14] p-4 rounded-xl border border-[#06B6D4]/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <label htmlFor="directMinutesInput" className="text-xs font-bold text-slate-300 block flex items-center justify-between">
                <span>INGRESO LIBRE DE MINUTOS:</span>
                <span className="text-[#00FFCC] text-[11px] font-extrabold">
                  {minutesInput} min = +{projectedXP} XP
                </span>
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="directMinutesInput"
                  type="number"
                  min="1"
                  max="720"
                  disabled={isRunning}
                  value={minutesInput}
                  onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#101827] border-2 border-[#00F0FF]/60 rounded-xl px-4 py-3 text-2xl font-black text-[#00F0FF] focus:outline-none focus:border-[#00FFCC] focus:ring-2 focus:ring-[#00FFCC]/30 transition-all font-mono shadow-[0_0_15px_rgba(0,240,255,0.2)] disabled:opacity-50"
                  placeholder="Ej: 47"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">minutos</span>
              </div>

              {/* Range Slider for Quick Support */}
              <div className="pt-2">
                <input
                  type="range"
                  min="1"
                  max="180"
                  step="1"
                  disabled={isRunning}
                  value={minutesInput}
                  onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 1)}
                  className="w-full accent-[#00F0FF] bg-[#101827] h-2 rounded-lg cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1 min</span>
                  <span>45 min</span>
                  <span>90 min</span>
                  <span>180 min</span>
                </div>
              </div>
            </div>

            {/* Quick Presets Shortcuts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">AJUSTES RÁPIDOS:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.mins}
                    type="button"
                    disabled={isRunning}
                    onClick={() => handleMinutesChange(preset.mins)}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      minutesInput === preset.mins
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:border-[#06B6D4]/50 hover:text-slate-200'
                    } disabled:opacity-50`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task / Objective Input Field */}
            <div className="space-y-1.5 pt-2">
              <label htmlFor="taskNameInput" className="text-xs font-bold text-slate-300 block">OBJETIVO / MISIÓN DE ENFOQUE (OPCIONAL):</label>
              <input
                id="taskNameInput"
                type="text"
                disabled={isRunning}
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Ej: Análisis de Arquitectura, Lectura de Código, Ejercicio..."
                className="w-full bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Tactical Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-[#06B6D4]/20">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-3.5 px-6 rounded-xl bg-[#00FFCC] hover:bg-[#00FFCC]/90 text-[#0A0D14] font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,255,204,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                ▶ INICIAR ENFOQUE
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="w-full py-3.5 px-6 rounded-xl bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0A0D14] font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer animate-pulse"
              >
                <Pause className="w-5 h-5 fill-current" />
                ⏸ PAUSAR
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0A0D14] hover:bg-[#101827] text-slate-300 border border-[#06B6D4]/30 hover:border-[#00F0FF] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#00F0FF]" />
              ↺ REINICIAR
            </button>
          </div>
        </div>

        {/* Right Column: Mass Digital HUD Clock & Progress Ring Display */}
        <div className="lg:col-span-7 bg-[#101827]/90 p-6 md:p-8 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden min-h-[420px]">
          
          {/* Subtle Scanlines & Glowing Radial Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)] pointer-events-none" />
          
          {/* Active Status Badge */}
          <div className="mb-4 z-10 flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border transition-all flex items-center gap-2 ${
              isRunning 
                ? 'bg-[#00FFCC]/20 border-[#00FFCC] text-[#00FFCC] shadow-[0_0_12px_rgba(0,255,204,0.3)] animate-pulse'
                : 'bg-[#0A0D14] border-[#06B6D4]/30 text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00FFCC] shadow-[0_0_8px_#00FFCC]' : 'bg-slate-500'}`} />
              {isRunning ? 'MODO HIPERFOCO ACTIVO' : 'TEMPORIZADOR EN ESPERA'}
            </span>
            
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                soundEnabled 
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]' 
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* SVG Progress Circle surrounded Digital Display */}
          <div className="relative flex items-center justify-center my-2 z-10">
            <svg className="w-72 h-72 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="144"
                cy="144"
                r={radius}
                className="stroke-[#0A0D14]"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Outer Glow Ring */}
              <circle
                cx="144"
                cy="144"
                r={radius}
                className="stroke-[#06B6D4]/20"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Progress Animated Circle */}
              <circle
                cx="144"
                cy="144"
                r={radius}
                className="stroke-[#00F0FF] transition-all duration-1000 ease-linear"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: 'drop-shadow(0px 0px 8px rgba(0, 240, 255, 0.6))'
                }}
              />
            </svg>

            {/* Inner HUD Digital Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <div className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight font-mono drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                {formatTime(remainingSeconds)}
              </div>
              <p className="text-xs font-bold text-[#00FFCC] mt-2 tracking-wider uppercase">
                {taskName.trim() ? taskName.toUpperCase() : 'MISION DE FOCO'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                Recompensa estimada: +{projectedXP} XP
              </span>
            </div>
          </div>

          {/* Footer Info & Instructions */}
          <div className="mt-4 text-center z-10">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-mono">
              <Info className="w-3.5 h-3.5 text-[#00F0FF]" />
              Escribe directamente los minutos arriba y presiona Iniciar.
            </p>
          </div>
        </div>
      </div>

      {/* Focus History & Log for Today */}
      <div className="bg-[#101827]/90 p-6 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#06B6D4]/20 pb-3">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-[#00F0FF]" /> HISTORIAL DE SESIONES DE ENFOQUE (HOY)
          </h3>
          <span className="text-xs font-bold text-[#00FFCC]">
            {todaySessions.length} {todaySessions.length === 1 ? 'sesión' : 'sesiones'} completadas
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
            No hay sesiones de enfoque registradas hoy. Configura tus minutos e inicia tu primera sesión táctica.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySessions.map((session) => (
              <div 
                key={session.id} 
                className="p-3.5 rounded-xl bg-[#0A0D14] border border-[#06B6D4]/30 flex items-center justify-between font-mono shadow-[0_0_10px_rgba(6,182,212,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00FFCC]/15 border border-[#00FFCC]/30 text-[#00FFCC]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[160px]">
                      {session.taskName}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {session.minutes} min • {session.completedAt}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-[#00FFCC] bg-[#00FFCC]/10 px-2 py-0.5 rounded border border-[#00FFCC]/20">
                    +{session.xpEarned} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Modal / Victory Overlay */}
      <AnimatePresence>
        {completedSessionData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#101827] border-2 border-[#00FFCC] rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(0,255,204,0.3)] text-center space-y-6 relative font-mono overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,204,0.15)_0%,transparent_70%)] pointer-events-none" />

              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,204,0.5)] animate-bounce">
                <Award className="w-9 h-9 text-[#00FFCC]" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-[#00FFCC] tracking-widest uppercase block mb-1">
                  SESIÓN DE ENFOQUE FINALIZADA
                </span>
                <h3 className="text-2xl font-black text-slate-100 tracking-wider">
                  ¡MISIÓN CUMPLIDA, OPERADOR!
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Has completado tu bloque de tiempo táctico con total efectividad.
                </p>
              </div>

              {/* Stats Card */}
              <div className="bg-[#0A0D14] p-4 rounded-xl border border-[#06B6D4]/40 space-y-3 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">OBJETIVO:</span>
                  <span className="text-slate-200 font-bold">{completedSessionData.taskName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">TIEMPO ENFOCADO:</span>
                  <span className="text-[#00F0FF] font-bold">{completedSessionData.minutes} minutos</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-[#06B6D4]/20 pt-2">
                  <span className="text-slate-400">RECOMPENSA DE XP:</span>
                  <span className="text-[#00FFCC] font-black text-sm">+{completedSessionData.xpEarned} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompletedSessionData(null)}
                className="w-full py-3 px-6 rounded-xl bg-[#00FFCC] hover:bg-[#00FFCC]/90 text-[#0A0D14] font-black text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,255,204,0.4)] cursor-pointer"
              >
                CONTINUAR EN EL COMANDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
