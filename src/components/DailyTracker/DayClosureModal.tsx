import React from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2, Lock, Flame, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MotivationalCard } from '../MotivationalCard';

interface DayClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  dateStr: string;
  formattedDate: string;
  onConfirmCloseDay: () => void;
  isAlreadyClosed?: boolean;
}

export const DayClosureModal: React.FC<DayClosureModalProps> = ({
  isOpen,
  onClose,
  completedCount,
  totalCount,
  completionRate,
  formattedDate,
  onConfirmCloseDay,
  isAlreadyClosed = false
}) => {
  if (!isOpen) return null;

  const isLowScore = completionRate < 40;

  const handleConfirm = () => {
    if (completionRate >= 50) {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
    onConfirmCloseDay();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#101827] border border-[#06B6D4]/40 rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] my-8 relative overflow-hidden font-mono"
      >
        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0A0D14] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* If low score, show Motivational Quote View */}
        {isLowScore ? (
          <div className="space-y-4">
            <MotivationalCard
              currentRate={completionRate}
              title="Cierre de Día: Balance & Enfoque"
              subtitle={`Resumen de actividad para ${formattedDate}`}
              onClose={onClose}
            />
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-[#F97316]/90 text-[#0A0D14] font-bold text-sm transition-colors shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#0A0D14]" />
                {isAlreadyClosed ? 'Actualizar Cierre de Día' : 'Confirmar Cierre de Día (<40%)'}
              </button>
            </div>
          </div>
        ) : (
          /* High / Moderate Score View */
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              {completionRate === 100 ? (
                <Award className="w-8 h-8 text-[#00F0FF] animate-bounce" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-[#00F0FF]" />
              )}
            </div>

            <div>
              <span className="px-3 py-1 text-xs font-bold rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-mono">
                {isAlreadyClosed ? 'Día Previamente Cerrado' : 'Resumen de Cierre HUD'}
              </span>
              <h2 className="text-2xl font-bold text-slate-100 mt-2 tracking-wide font-sans">
                {completionRate === 100 ? '¡Día Perfecto del 100%!' : '¡Excelente Consistencia!'}
              </h2>
              <p className="text-xs text-[#06B6D4] mt-1 font-mono">{formattedDate}</p>
            </div>

            {/* Gauge stats */}
            <div className="p-5 rounded-2xl bg-[#0A0D14] border border-[#06B6D4]/30 flex items-center justify-around">
              <div>
                <span className="text-3xl font-extrabold text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]">{completionRate}%</span>
                <span className="block text-[11px] text-[#06B6D4] font-bold uppercase mt-0.5">Cumplimiento</span>
              </div>
              <div className="h-10 w-px bg-[#06B6D4]/20" />
              <div>
                <span className="text-2xl font-bold text-slate-200">{completedCount} / {totalCount}</span>
                <span className="block text-[11px] text-slate-400 font-bold uppercase mt-0.5">Hábitos Completados</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0A0D14]/80 p-3.5 rounded-xl border border-[#06B6D4]/20">
              {completionRate >= 80
                ? 'Has mantenido un estándar de ejecución sobresaliente hoy. El impulso acumulado consolida tu disciplina para los próximos días.'
                : 'Progreso sólido. Cada hábito registrado sostiene tu cadena de hábitos y fortalece tu constancia.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-[#0A0D14] hover:bg-[#101827] text-slate-300 border border-slate-800 text-xs font-bold transition-colors"
              >
                Seguir Editando
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs transition-colors shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#0A0D14]" />
                {isAlreadyClosed ? 'Actualizar Cierre' : 'Cerrar el Día Oficialmente'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
