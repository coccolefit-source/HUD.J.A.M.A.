import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Key, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword.trim()) {
      setErrorMsg('Ingresa una contraseña válida.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg('¡Contraseña actualizada con éxito! Accediendo a la consola táctica...');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-[#0A0D14] border-2 border-[#00F0FF]/60 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.3)] overflow-hidden font-mono relative"
        >
          {/* Corner Decors */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00F0FF]" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00F0FF]" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00F0FF]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00F0FF]" />

          {/* Header */}
          <div className="p-5 border-b border-[#00F0FF]/20 flex items-center justify-between bg-[#101827]/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#00F0FF] animate-pulse" />
              <h2 className="text-sm font-extrabold text-slate-100 tracking-wider uppercase">
                [ RESTABLECER CONTRASEÑA TÁCTICA ]
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#00F0FF]/30 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#00F0FF]">TOKEN DE RECUPERACIÓN DETECTADO</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ingresa tu nueva contraseña para reestablecer el acceso a tu cuenta táctica en Supabase.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)]">
                <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3 text-[#00F0FF]" /> Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00F0FF]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3 text-[#00F0FF]" /> Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00F0FF]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#00F0FF]/30 via-[#00FFCC]/30 to-[#00F0FF]/30 hover:from-[#00F0FF]/40 hover:to-[#00FFCC]/40 border-2 border-[#00F0FF] text-[#00F0FF] rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />
                  ACTUALIZANDO CREDANCIALES...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />
                  ⚡ GUARDAR NUEVA CONTRASEÑA
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="p-4 bg-[#101827]/80 border-t border-[#00F0FF]/20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#0A0D14] border border-slate-700 hover:border-slate-500 text-slate-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
