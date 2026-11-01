import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, RefreshCw, X, Flame, ShieldAlert } from 'lucide-react';
import { MOTIVATIONAL_QUOTES } from '../data/initialData';
import { MotivationalQuote } from '../types';

interface MotivationalCardProps {
  currentRate?: number;
  isModal?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export const MotivationalCard: React.FC<MotivationalCardProps> = ({
  currentRate,
  isModal = false,
  onClose,
  title = "Persistencia y Reprogramación Mental",
  subtitle = "El rendimiento de hoy no define tu capacidad, define tu siguiente paso."
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quote: MotivationalQuote = MOTIVATIONAL_QUOTES[quoteIndex % MOTIVATIONAL_QUOTES.length];

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-[#101827]/95 p-6 md:p-8 border-2 border-[#F97316]/60 shadow-[0_0_25px_rgba(249,115,22,0.15)] backdrop-blur-md font-mono"
    >
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F97316]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F97316]/15 border border-[#F97316]/40 text-[#F97316]">
            {currentRate !== undefined && currentRate < 40 ? (
              <ShieldAlert className="w-5 h-5 text-[#F97316]" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#F97316]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              {currentRate !== undefined && (
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40 font-mono">
                  {currentRate}% RENDIMIENTO
                </span>
              )}
            </div>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0A0D14] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quote Display */}
      <div className="relative my-3 p-4 rounded-xl bg-[#0A0D14] border border-[#06B6D4]/25">
        <Quote className="absolute top-3 left-3 w-6 h-6 text-[#F97316]/20 pointer-events-none" />
        <p className="relative z-10 text-slate-100 text-sm font-medium italic leading-relaxed pl-3 border-l-2 border-[#F97316]">
          "{quote.quote}"
        </p>
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#06B6D4]/15">
          <span className="text-xs font-bold text-[#F97316] font-mono">{quote.author}</span>
          <button
            onClick={nextQuote}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101827] hover:bg-[#0A0D14] text-slate-200 text-xs font-mono transition-colors border border-[#06B6D4]/30"
          >
            <RefreshCw className="w-3 h-3 text-[#06B6D4]" />
            Siguiente
          </button>
        </div>
      </div>

      {isModal && onClose && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#F97316]/90 text-[#0A0D14] font-bold text-xs transition-colors shadow-[0_0_12px_rgba(249,115,22,0.4)]"
          >
            Aceptar
          </button>
        </div>
      )}
    </motion.div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-md">
        <div className="w-full max-w-xl">
          <AnimatePresence>{content}</AnimatePresence>
        </div>
      </div>
    );
  }

  return content;
};
