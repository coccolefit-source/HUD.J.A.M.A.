import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudUpload, X, Shield, ChevronRight } from 'lucide-react';
import { UserSession } from '../../types';

interface AuthBannerProps {
  userSession: UserSession;
  onOpenAuthModal: () => void;
}

export const AuthBanner: React.FC<AuthBannerProps> = ({
  userSession,
  onOpenAuthModal
}) => {
  const [dismissed, setDismissed] = useState(false);

  return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 md:right-6 z-50 max-w-lg font-mono pointer-events-auto"
      >
        <div className="bg-[#0A0D14]/95 border border-[#00F0FF]/50 shadow-[0_0_25px_rgba(0,240,255,0.2)] backdrop-blur-md rounded-2xl flex flex-row items-center justify-between gap-3 px-4 py-2 text-xs relative overflow-hidden">
          {/* Subtle accent light */}
          <div className="absolute top-0 left-0 w-16 h-full bg-[#00F0FF]/10 blur-md pointer-events-none" />

          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="p-2 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] shrink-0 hidden sm:flex">
              <Shield className="w-4 h-4 animate-pulse" />
            </div>
            <div className="truncate hidden sm:block">
              <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] shrink-0" />
                <span className="truncate">Modo Invitado</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Almacenamiento Local
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 bg-gradient-to-r from-[#00F0FF]/20 to-[#00FFCC]/20 hover:from-[#00F0FF]/30 hover:to-[#00FFCC]/30 border border-[#00FFCC]/60 text-[#00FFCC] rounded-xl text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(0,255,204,0.2)] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>☁️ 🔒 CREAR CUENTA // ASEGURA TU PROGRESO &gt;</span>
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
