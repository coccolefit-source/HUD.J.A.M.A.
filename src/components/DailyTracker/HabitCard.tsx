import React from 'react';
import { motion } from 'motion/react';
import { Check, Flame, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Habit } from '../../types';
import { IconRenderer } from '../IconRenderer';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  streakCount: number;
  onToggle: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

// Dopamine audio feedback via Web Audio API
function playDopamineChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12); // D6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Audio context fallback ignored if user hasn't interacted or audio muted
  }
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isCompleted,
  streakCount,
  onToggle,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      playDopamineChime();
      // Confetti burst with Electric Cyan (#00F0FF), Cobalt Blue (#2563EB) and Insight Violet (#7C3AED)
      confetti({
        particleCount: 30,
        spread: 65,
        origin: { y: 0.8 },
        colors: ['#00F0FF', '#06B6D4', '#7C3AED', '#2563EB', '#F97316']
      });
    }
    onToggle(habit.id);
  };

  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case 'indigo':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
        };
      case 'violet':
        return {
          bg: 'bg-violet-500/10',
          border: 'border-violet-500/30',
          text: 'text-violet-400',
        };
      case 'amber':
        return {
          bg: 'bg-[#F97316]/10',
          border: 'border-[#F97316]/30',
          text: 'text-amber-400',
        };
      case 'cyan':
        return {
          bg: 'bg-[#06B6D4]/10',
          border: 'border-[#06B6D4]/30',
          text: 'text-[#06B6D4]',
        };
      case 'rose':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
        };
      case 'emerald':
      default:
        return {
          bg: 'bg-[#00F0FF]/10',
          border: 'border-[#00F0FF]/30',
          text: 'text-[#00F0FF]',
        };
    }
  };

  const colorStyles = getColorClasses(habit.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleToggleClick}
      className={`group relative p-4 md:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
        isCompleted
          ? 'bg-[#101827] border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.22)]'
          : 'bg-[#101827]/80 border-[#06B6D4]/25 hover:border-[#00F0FF]/60 hover:bg-[#101827] shadow-[0_0_15px_rgba(6,182,212,0.05)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left icon + text info */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div
            className={`p-3 rounded-xl border transition-colors shrink-0 ${
              isCompleted
                ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : `${colorStyles.bg} ${colorStyles.border} ${colorStyles.text}`
            }`}
          >
            <IconRenderer name={habit.icon} className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-sm md:text-base font-bold transition-all truncate ${
                  isCompleted ? 'line-through text-[#00F0FF]' : 'text-slate-100'
                }`}
              >
                {habit.title}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30">
                {habit.category}
              </span>
            </div>

            {habit.description && (
              <p
                className={`text-xs mt-1 truncate ${
                  isCompleted ? 'text-slate-400 line-through' : 'text-slate-400'
                }`}
              >
                {habit.description}
              </p>
            )}

            {/* Streak & Target info */}
            <div className="flex items-center gap-3 mt-2 text-xs font-mono">
              <span
                className={`flex items-center gap-1 font-semibold ${
                  streakCount > 0 ? 'text-[#F97316]' : 'text-slate-500'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${streakCount > 0 ? 'fill-[#F97316]/30 text-[#F97316]' : ''}`} />
                {streakCount} {streakCount === 1 ? 'día' : 'días'} racha
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[#06B6D4]/80">{habit.targetDaysPerWeek}x/sem</span>
            </div>
          </div>
        </div>

        {/* Right side: Interactive CHECK button & menu */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.82 }}
            onClick={handleToggleClick}
            className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all border ${
              isCompleted
                ? 'bg-[#00F0FF] text-[#0A0D14] border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.7)] stroke-[3]'
                : 'border-[#06B6D4]/40 bg-[#0A0D14] text-transparent hover:border-[#00F0FF] hover:bg-[#101827]'
            }`}
            aria-label={isCompleted ? 'Marcar como no completado' : 'CHECK'}
          >
            <Check className={`w-6 h-6 transition-transform ${isCompleted ? 'scale-110 text-[#0A0D14]' : 'scale-75'}`} />
          </motion.button>

          {/* Action dropdown menu button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-[#06B6D4] hover:bg-[#0A0D14] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-10 z-20 w-36 bg-[#101827] border border-[#06B6D4]/40 rounded-xl shadow-2xl p-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(habit);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-[#06B6D4]/15 hover:text-[#06B6D4] rounded-lg text-left transition-colors font-mono"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#06B6D4]" /> Editar
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(habit.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[#EF4444] hover:bg-[#EF4444]/15 rounded-lg text-left transition-colors font-mono"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

