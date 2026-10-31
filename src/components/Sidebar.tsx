import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckSquare, 
  TrendingUp, 
  Sparkles, 
  Flame, 
  RotateCcw, 
  Target, 
  Menu, 
  X,
  ChevronDown,
  Palette,
  FolderKanban,
  Crosshair,
  Award,
  Timer,
  Volume2,
  Radar,
  LogOut,
  User,
  RotateCw
} from 'lucide-react';
import { getRankInfo } from '../utils/gamification';

import { UserSession } from '../types';

export type TabType = 'tracker' | 'exec' | 'projects' | 'analytics' | 'review' | 'focus' | 'ideas';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeStreak: number;
  onResetData: () => void;
  completedTodayCount: number;
  totalHabitsCount: number;
  onOpenThemeSelector: () => void;
  totalXP?: number;
  userSession?: UserSession;
  onOpenAuthModal?: () => void;
  onPlayWelcomeVoice?: () => void;
  onSignOut?: () => void;
  isWakeWordSupported?: boolean;
  isWakeWordActive?: boolean;
  onToggleWakeWord?: (active: boolean) => void;
  isClapDetectionActive?: boolean;
  onToggleClapDetection?: (active: boolean) => void;
  isSyncing?: boolean;
  onManualRefresh?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeStreak,
  onResetData,
  completedTodayCount,
  totalHabitsCount,
  onOpenThemeSelector,
  totalXP = 0,
  userSession = { email: '', hudName: 'HUD INVITADO', updatedAt: '' },
  onOpenAuthModal,
  onPlayWelcomeVoice,
  onSignOut,
  isWakeWordSupported = true,
  isWakeWordActive = true,
  onToggleWakeWord,
  isClapDetectionActive = true,
  onToggleClapDetection,
  isSyncing = false,
  onManualRefresh
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isPulse, setIsPulse] = useState(false);

  const safeSession = userSession || { email: '', hudName: 'HUD INVITADO', updatedAt: '' };

  const handleResetData = () => {
    if (window.confirm("¿Confirmar reinicio táctico del sistema?")) {
      if (onResetData) {
        onResetData();
      }
      window.location.reload();
    }
  };

  const rankInfo = getRankInfo(totalXP);
  const prevLevelRef = useRef(rankInfo.level);

  useEffect(() => {
    if (rankInfo.level > prevLevelRef.current || rankInfo.progressPercent === 100) {
      setIsPulse(true);
      const timer = setTimeout(() => setIsPulse(false), 2500);
      prevLevelRef.current = rankInfo.level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = rankInfo.level;
  }, [rankInfo.level, rankInfo.progressPercent]);

  const NAV_ITEMS = [
    {
      id: 'tracker' as TabType,
      label: 'MI DÍA',
      subtitle: 'Hábitos & Tareas',
      icon: CheckSquare,
      color: 'text-[#06B6D4]'
    },
    {
      id: 'exec' as TabType,
      label: 'EXEC',
      subtitle: 'Comando Central Tareas',
      icon: Crosshair,
      color: 'text-[#00F0FF]'
    },
    {
      id: 'projects' as TabType,
      label: 'PROYECTOS',
      subtitle: 'Hitos & Seguimiento',
      icon: FolderKanban,
      color: 'text-[#00F0FF]'
    },
    {
      id: 'analytics' as TabType,
      label: 'PROGRESO',
      subtitle: 'Gráficos HUD & Histórico',
      icon: TrendingUp,
      color: 'text-cyan-400'
    },
    {
      id: 'review' as TabType,
      label: '1x1 INSIGHTS',
      subtitle: 'Diagnóstico Táctico',
      icon: Sparkles,
      color: 'text-blue-400'
    },
    {
      id: 'focus' as TabType,
      label: 'FOCUS',
      subtitle: 'Enfoque & Foco Táctico',
      icon: Timer,
      color: 'text-[#00FFCC]'
    },
    {
      id: 'ideas' as TabType,
      label: 'IDEAS',
      subtitle: 'Bitácora & Captura Rápida',
      icon: Radar,
      color: 'text-[#F59E0B]' // Yellow/Amber neon
    }
  ];

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const ActiveNavIcon = activeNavItem.icon;

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsNavMenuOpen(false);
    setMobileOpen(false);
  };

  // Cerrar drawer con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Sticky Top Header Bar - Always visible regardless of screen size */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0D14]/90 border-b border-[#06B6D4]/25 backdrop-blur-md px-4 py-3 flex items-center justify-between font-mono relative">
        <div className="flex items-center gap-3 relative z-40">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="w-9 h-9 rounded-xl bg-[#06B6D4]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.25)] hover:bg-[#00F0FF]/20 transition-all cursor-pointer relative z-40 pointer-events-auto"
            title="Abrir Gestión de Cuenta y HUD"
          >
            <Target className="w-5 h-5 text-[#00F0FF]" />
          </button>
          <div>
            <span className="font-black text-slate-100 text-base tracking-wider block font-sans leading-tight">PRIME</span>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 mt-0.5 relative z-40 pointer-events-auto cursor-pointer hover:opacity-80 text-left"
              title="Abrir Gestión de Cuenta y HUD"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse shrink-0" />
              <span className="text-[10px] text-[#00F0FF] font-mono tracking-widest uppercase font-bold truncate max-w-[150px] sm:max-w-none">
                ● {safeSession.hudName || 'HUD INVITADO'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 relative z-40">
          {isWakeWordSupported && onToggleWakeWord && (
            <button
              type="button"
              onClick={() => onToggleWakeWord(!isWakeWordActive)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isWakeWordActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.18)]'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
              title={isWakeWordActive ? "Detección continua activa. Di 'Prime' (Praim) en cualquier momento para hablar." : "Detección por voz pausada. Clic para activar."}
            >
              <span className={`w-2 h-2 rounded-full ${isWakeWordActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="hidden sm:inline font-bold">"Prime":</span>
              <span className="font-bold">{isWakeWordActive ? 'ON' : 'OFF'}</span>
            </button>
          )}
          {onToggleClapDetection && (
            <button
              type="button"
              onClick={() => onToggleClapDetection(!isClapDetectionActive)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isClapDetectionActive
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.18)]'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
              title={isClapDetectionActive ? "Activación por sonido activa." : "Activación por sonido pausada. Clic para activar."}
            >
              <span className={`w-2 h-2 rounded-full ${isClapDetectionActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="font-bold">{isClapDetectionActive ? 'ON' : 'OFF'}</span>
            </button>
          )}
          {onManualRefresh && (
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isSyncing}
              className="p-2 sm:p-2.5 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.1)]"
              title="Sincronizar Datos con la Nube"
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="p-2 sm:p-2.5 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/25 transition-all relative z-40 pointer-events-auto cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
            title="Acceso al Sistema Táctico / Perfil"
          >
            <User className="w-4 h-4 text-[#00F0FF]" />
          </button>
          <button
            type="button"
            onClick={onPlayWelcomeVoice}
            className="p-2 sm:p-2.5 rounded-xl bg-[var(--hud-accent,#00F0FF)]/15 border border-[var(--hud-accent,#00F0FF)]/40 text-[var(--hud-accent,#00F0FF)] hover:bg-[var(--hud-accent,#00F0FF)]/25 transition-all relative z-40 pointer-events-auto cursor-pointer shadow-[0_0_10px_rgba(var(--hud-accent-rgb,0,240,255),0.15)]"
            title="Activar Asistente PRIME (Voz e IA)"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenThemeSelector}
            className="p-2 sm:p-2.5 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#00F0FF] hover:bg-[#06B6D4]/20 transition-colors relative z-40 pointer-events-auto cursor-pointer"
            title="Cambiar Interfaz Visual"
          >
            <Palette className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
            {activeStreak}d
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 sm:p-2.5 rounded-xl bg-[#101827] border border-[#06B6D4]/40 hover:border-[#00F0FF] text-slate-200 relative z-40 pointer-events-auto cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all"
            title="Menú de Navegación y Control"
          >
            {mobileOpen ? <X className="w-5 h-5 text-[#00F0FF]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Slide-out Drawer (Activated by hamburger menu on all screen sizes) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-80 max-w-[85vw] bg-[#0A0D14] border-r border-[#06B6D4]/30 p-5 flex flex-col transition-transform duration-300 ease-out shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-y-auto pb-24 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-6">
          {/* Logo & Branding + Close Drawer Button */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#06B6D4]/20">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-3 px-1 pt-1 text-left cursor-pointer group flex-1 min-w-0 relative z-50 pointer-events-auto"
              title="Abrir Gestión de Cuenta y HUD"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#101827] border border-[#00F0FF]/50 p-0.5 shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center justify-center relative group-hover:border-[#00F0FF] shrink-0">
                <div className="w-full h-full bg-[#0A0D14] rounded-[14px] flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#00F0FF] animate-pulse" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="font-black text-slate-100 text-lg tracking-wider block font-sans">PRIME</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse shrink-0" />
                  <span className="text-[10px] text-[#00F0FF] font-mono tracking-wider font-bold uppercase group-hover:underline truncate">
                    ● {safeSession.hudName || 'HUD INVITADO'}
                  </span>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-xl bg-[#101827] border border-[#06B6D4]/30 hover:border-[#00F0FF] text-slate-400 hover:text-[#00F0FF] transition-all cursor-pointer shrink-0"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de Perfil / Progreso */}
          <div className="p-4 rounded-2xl bg-[#101827]/90 border border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.08)] relative overflow-hidden font-mono space-y-3">
            {/* Resplandor neón de fondo */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00F0FF]/10 rounded-full blur-xl pointer-events-none" />

            {/* Cabecera de Tarjeta de Perfil con Racha */}
            <div className="flex items-center justify-between text-xs text-slate-400 relative z-50 pointer-events-auto">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="font-mono text-[10px] uppercase tracking-wider text-[#06B6D4] font-bold hover:text-[#00F0FF] transition-colors cursor-pointer"
              >
                Tarjeta de Perfil
              </button>
              <div className="flex items-center gap-1 text-amber-400 font-bold text-xs" title="Racha Operativa">
                <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
                <span>{activeStreak}d</span>
              </div>
            </div>

            {/* Etiqueta ● HUD INVITADO (ubicada justo ARRIBA de la caja del Rango) */}
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center justify-between w-full pt-0.5 group cursor-pointer text-left relative z-50 pointer-events-auto"
              title="Gestión de Cuenta y HUD"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse" />
                <span className="text-[11px] text-[#00F0FF] font-mono tracking-wider font-bold uppercase group-hover:underline">
                  ● {safeSession.hudName || 'HUD INVITADO'}
                </span>
              </div>
            </button>

            {/* Session Details */}
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-[9px] text-slate-400 font-mono tracking-tight block hover:text-[#00F0FF] transition-colors text-left cursor-pointer truncate w-full relative z-50 pointer-events-auto"
            >
              [ SESSION: {safeSession.email ? `'${safeSession.email}'` : "'ONLINE (CLOUD)'"} ]
            </button>

            {/* Nivel y Rango actual en texto plano */}
            <motion.div 
              key={`${rankInfo.level}-${rankInfo.currentXP}`}
              animate={isPulse ? { 
                scale: [1, 1.04, 1]
              } : {}}
              transition={{ duration: 0.8 }}
              className="text-left py-1"
            >
              <span className="text-xs font-black text-[#00F0FF] tracking-wider uppercase block">
                LVL {rankInfo.level} • {rankInfo.rankName} ({rankInfo.currentXP} XP)
              </span>
            </motion.div>

            {/* Barra de Progreso de XP */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-[#0A0D14] rounded-full p-0.5 border border-slate-800 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rankInfo.progressPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r from-[#00F0FF] via-[#00FFCC] to-[#FFB800] shadow-[0_0_10px_#00F0FF] ${
                    rankInfo.progressPercent >= 100 || isPulse ? 'animate-pulse' : ''
                  }`}
                />
              </div>

              {/* Texto del porcentaje y cuánto falta */}
              <div className="flex flex-col gap-0.5 text-[10px] font-mono text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-[#00F0FF] font-bold">
                    {rankInfo.level === 4
                      ? '100% Nivel Máximo'
                      : `${rankInfo.progressPercent}% hacia ${rankInfo.nextLevelFullTag}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>
                    {rankInfo.level === 4
                      ? 'RANGO MÁXIMO ALCANZADO'
                      : `Faltan ${rankInfo.xpRemaining} XP para [ ${rankInfo.nextRankName} ]`}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen Diario Footer */}
            <div className="pt-2 border-t border-[#06B6D4]/20 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Completados Hoy:</span>
              <span className="font-bold text-[#00F0FF]">
                {completedTodayCount}/{totalHabitsCount}
              </span>
            </div>
          </div>

          {/* Lista de Pestañas de Navegación del Sistema */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block px-1">
              Módulos del Sistema
            </span>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group relative overflow-hidden cursor-pointer ${
                      isActive
                        ? 'bg-[#101827] text-slate-100 border border-[#06B6D4]/60 font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#101827]/60 border border-transparent hover:border-[#06B6D4]/20'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#06B6D4] shadow-[0_0_10px_#06B6D4]" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isActive ? 'bg-[#06B6D4]/20 border border-[#06B6D4]/40 text-[#06B6D4]' : 'bg-[#0A0D14] group-hover:bg-[#101827] text-slate-400'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#06B6D4]' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{item.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">{item.subtitle}</span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="text-[9px] font-mono text-[#00F0FF] bg-[#00F0FF]/15 px-1.5 py-0.5 rounded border border-[#00F0FF]/30 shrink-0 ml-2">
                        ACTIVO
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer info & Reset button */}
        <div className="mt-auto pt-4 border-t border-[#06B6D4]/25 space-y-2">
          <button
            type="button"
            onClick={safeSession.email ? onSignOut : onOpenAuthModal}
            className={`w-full py-2.5 px-3 rounded-xl ${
              safeSession.email
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                : 'bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border-[#00F0FF]/40'
            } border text-xs font-mono font-bold transition-all flex items-center justify-between group shadow-sm cursor-pointer relative z-50 pointer-events-auto`}
            title={safeSession.email ? "Cerrar Sesión Táctica" : "Iniciar Sesión / Registro"}
          >
            <span className="flex items-center gap-2">
              {safeSession.email ? (
                <>
                  <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  CERRAR SESIÓN
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-[#00F0FF] group-hover:scale-110 transition-transform" />
                  INICIAR SESIÓN / REGISTRO
                </>
              )}
            </span>
            <span className={`text-[10px] ${safeSession.email ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30'} px-2 py-0.5 rounded border`}>
              {safeSession.email ? 'CLOUD' : 'ACCESO'}
            </span>
          </button>

          <button
            onClick={onOpenThemeSelector}
            className="w-full py-2.5 px-3 rounded-xl bg-[#101827] hover:bg-[#101827]/90 text-[#06B6D4] border border-[#06B6D4]/40 text-xs font-mono font-bold transition-all flex items-center justify-between group shadow-sm cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#06B6D4] group-hover:rotate-12 transition-transform" />
              Interfaz Táctica
            </span>
            <span className="text-[10px] bg-[#06B6D4]/20 px-2 py-0.5 rounded text-[#06B6D4] border border-[#06B6D4]/30">HUD</span>
          </button>

          <button
            type="button"
            onClick={onPlayWelcomeVoice}
            className="w-full py-2.5 px-3 rounded-xl bg-[#101827] hover:bg-[#101827]/90 text-[var(--hud-accent,#00F0FF)] border border-[var(--hud-accent,#00F0FF)]/40 text-xs font-mono font-bold transition-all flex items-center justify-between group shadow-[0_0_12px_rgba(var(--hud-accent-rgb,0,240,255),0.12)] cursor-pointer"
            title="Activar Asistente JARVIS (Voz e IA)"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[var(--hud-accent,#00F0FF)] group-hover:scale-110 transition-transform" />
              JARVIS IA
            </span>
            <span className="text-[10px] bg-[var(--hud-accent,#00F0FF)]/20 px-2 py-0.5 rounded text-[var(--hud-accent,#00F0FF)] border border-[var(--hud-accent,#00F0FF)]/30 animate-pulse">VOZ</span>
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="w-full py-2 px-3 rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-2 border bg-[#101827]/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> [ ↺ Restablecer Datos ]
          </button>
        </div>
      </aside>

      {/* Backdrop for drawer (Active on all screen sizes) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-[#0A0D14]/80 backdrop-blur-sm cursor-pointer"
          />
        )}
      </AnimatePresence>
    </>
  );
};
