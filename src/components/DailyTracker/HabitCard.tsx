import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Check, Flame, MoreVertical, Edit3, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
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

export const HabitCard = React.memo(({
  habit,
  isCompleted,
  streakCount,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false
}: HabitCardProps) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willComplete = !isCompleted;
    // 1. Trigger state update immediately (0ms UI response)
    onToggle(habit.id);

    // 2. Run audio + confetti asynchronously so they never block UI painting
    if (willComplete) {
      requestAnimationFrame(() => {
        playDopamineChime();
        confetti({
          particleCount: 24,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#00F0FF', '#06B6D4', '#7C3AED', '#2563EB', '#F97316']
        });
      });
    }
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
    <div
      onClick={handleToggleClick}
      className={`group relative px-3 py-2.5 md:p-4 rounded-xl border transition-colors duration-150 cursor-pointer select-none ${
        isCompleted
          ? 'bg-[#101827] border-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.18)]'
          : 'bg-[#101827]/80 border-[#06B6D4]/25 hover:border-[#00F0FF]/60 hover:bg-[#101827]'
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left icon + text info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Touch-friendly Drag Handle */}
          <div className="drag-handle p-1 -ml-1 text-slate-500 hover:text-[#00F0FF] active:text-[#00F0FF] cursor-grab active:cursor-grabbing transition-colors shrink-0" title="Arrastrar para reordenar">
            <GripVertical className="w-4 h-4" />
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
              isCompleted
                ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : `${colorStyles.bg} ${colorStyles.border} ${colorStyles.text}`
            }`}
          >
            <IconRenderer name={habit.icon} className="w-4 h-4 md:w-5 md:h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-bold transition-colors truncate ${
                  isCompleted ? 'line-through text-[#00F0FF]' : 'text-slate-100'
                }`}
              >
                {habit.title}
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded-full bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30 shrink-0">
                {habit.category}
              </span>
            </div>

            {/* Compact single line for description + streak */}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono truncate">
              <span
                className={`flex items-center gap-1 font-semibold shrink-0 ${
                  streakCount > 0 ? 'text-[#F97316]' : 'text-slate-500'
                }`}
              >
                <Flame className={`w-3 h-3 ${streakCount > 0 ? 'fill-[#F97316]/30 text-[#F97316]' : ''}`} />
                {streakCount}d
              </span>
              <span className="text-slate-600 shrink-0">•</span>
              <span className="text-[#06B6D4]/80 shrink-0">{habit.targetDaysPerWeek}x/sem</span>
              {habit.description && (
                <>
                  <span className="text-slate-600 shrink-0">•</span>
                  <span className="text-slate-400 truncate font-sans">{habit.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Interactive CHECK button & menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleClick}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border cursor-pointer ${
              isCompleted
                ? 'bg-[#00F0FF] text-[#0A0D14] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.6)] stroke-[3]'
                : 'border-[#06B6D4]/40 bg-[#0A0D14] text-transparent hover:border-[#00F0FF] hover:bg-[#101827]'
            }`}
            aria-label={isCompleted ? 'Marcar como no completado' : 'CHECK'}
          >
            <Check className={`w-5 h-5 transition-transform duration-100 ${isCompleted ? 'scale-110 text-[#0A0D14]' : 'scale-75'}`} />
          </button>

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
                className="absolute right-0 top-10 z-20 w-40 bg-[#101827] border border-[#06B6D4]/40 rounded-xl shadow-2xl p-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {canMoveUp && onMoveUp && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onMoveUp();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-[#06B6D4]/15 hover:text-[#06B6D4] rounded-lg text-left transition-colors font-mono"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-[#06B6D4]" /> Subir orden
                  </button>
                )}
                {canMoveDown && onMoveDown && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onMoveDown();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-[#06B6D4]/15 hover:text-[#06B6D4] rounded-lg text-left transition-colors font-mono"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-[#06B6D4]" /> Bajar orden
                  </button>
                )}
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
    </div>
  );
});

