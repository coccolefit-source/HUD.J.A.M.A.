import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  CloudUpload, 
  HardDrive, 
  Sparkles, 
  Key, 
  Mail, 
  CheckCircle2, 
  User, 
  Zap, 
  AlertCircle, 
  LogIn, 
  Loader2, 
  LogOut,
  Edit,
  Globe
} from 'lucide-react';
import { UserSession } from '../../types';
import { supabase, isSupabaseConfigured, migrateGuestDataToCloud } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession;
  onUpdateUserSession: (session: UserSession) => void;
  onInitializeOperator: (session: UserSession, alias: string) => void;
  onAuthSuccess?: (userId: string) => Promise<void>;
  onPlayWelcomeVoice?: () => void;
  onSignOut?: () => void;
  isClosable?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userSession,
  onUpdateUserSession,
  onInitializeOperator,
  onAuthSuccess,
  onPlayWelcomeVoice,
  onSignOut,
  isClosable = true
}) => {
  const [activeTab, setActiveTab] = useState<'guest' | 'account'>('account');
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'recovery'>('signup');
  const [hudInput, setHudInput] = useState(userSession?.hudName || 'HUD INVITADO');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states for tactical registration & recovery
  const [alias, setAlias] = useState(userSession?.alias || '');
  const [email, setEmail] = useState(userSession?.email || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);

  // Synchronize inputs when session object changes from the network
  useEffect(() => {
    if (userSession) {
      setAlias(userSession.alias || '');
      setEmail(userSession.email || '');
      setHudInput(userSession.hudName || 'HUD INVITADO');
    }
  }, [userSession]);

  if (!isOpen) return null;

  const handleSaveHudName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hudInput.trim()) return;
    const updated = {
      ...(userSession || {}),
      hudName: hudInput.trim().toUpperCase(),
      updatedAt: new Date().toISOString()
    } as UserSession;
    onUpdateUserSession(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleUpdateProfileAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setProfileSuccessMsg(null);
    const cleanAlias = alias.trim();
    if (!cleanAlias) {
      setAuthError('El alias no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Update auth metadata in Supabase
        const { error } = await supabase.auth.updateUser({
          data: { alias: cleanAlias }
        });

        if (error) {
          throw error;
        }

        const cleanHudName = cleanAlias.toUpperCase().startsWith('HUD')
          ? cleanAlias.toUpperCase()
          : `HUD ${cleanAlias.toUpperCase()}`;

        // Upsert user profile record if table exists
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('user_profiles').upsert({
              id: user.id,
              hud_name: cleanHudName,
              updated_at: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('Upsert on user_profiles skipped:', err);
        }

        // Trigger updates in local app session state
        onUpdateUserSession({
          ...userSession,
          alias: cleanAlias,
          hudName: cleanHudName,
          updatedAt: new Date().toISOString()
        });

        setProfileSuccessMsg('¡Alias de operador actualizado con éxito!');
        if (onPlayWelcomeVoice) {
          onPlayWelcomeVoice();
        }
        setTimeout(() => setProfileSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error al actualizar el alias táctico.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);

    const formattedAlias = alias.trim() || email.split('@')[0].toUpperCase();
    const cleanHudName = formattedAlias.toUpperCase().startsWith('HUD')
      ? formattedAlias.toUpperCase()
      : `HUD ${formattedAlias.toUpperCase()}`;

    try {
      if (isSupabaseConfigured) {
        let authUser = null;
        if (authMode === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                alias: formattedAlias
              }
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.user) {
            authUser = data.user;
            await migrateGuestDataToCloud(data.user.id);
          }
        } else {
          // Sign In
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim()
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.user) {
            authUser = data.user;
            await migrateGuestDataToCloud(data.user.id);
          }
        }
        
        if (authUser && onAuthSuccess) {
          await onAuthSuccess(authUser.id);
        }
      }

      const updatedSession: UserSession = {
        email: email.trim(),
        alias: formattedAlias,
        hudName: cleanHudName,
        updatedAt: new Date().toISOString()
      };

      setIsAuthSuccess(true);
      onInitializeOperator(updatedSession, formattedAlias);

      if (onPlayWelcomeVoice) {
        setTimeout(() => {
          onPlayWelcomeVoice();
        }, 500);
      }

      setTimeout(() => {
        setIsAuthSuccess(false);
        onClose();
      }, 1200);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error de autenticación táctica.';
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRecoverySuccessMsg(null);

    if (!email.trim()) {
      setAuthError('Ingresa tu correo registrado.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured) {
        const redirectUrl = window.location.hostname.includes('netlify.app')
          ? 'https://checkjm77.netlify.app/reset-password'
          : `${window.location.origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      setRecoverySuccessMsg('Enlace de restablecimiento enviado a tu correo. Revisa tu bandeja de entrada.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar enlace de recuperación.';
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isRegisteredUser = !!userSession?.email;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-[#0A0D14] border-2 border-[#00F0FF]/50 rounded-2xl shadow-[0_0_35px_rgba(0,240,255,0.25)] overflow-hidden font-mono relative"
        >
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00F0FF]" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00F0FF]" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00F0FF]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00F0FF]" />

          {/* Modal Header */}
          <div className="p-5 border-b border-[#00F0FF]/20 flex items-center justify-between bg-[#101827]/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#00F0FF] animate-pulse" />
              <h2 className="text-sm font-extrabold text-slate-100 tracking-wider">
                {isRegisteredUser ? '[ PERFIL DE OPERADOR REGISTRADO ]' : '[ ACCESO AL SISTEMA TÁCTICO ]'}
              </h2>
            </div>
            {isClosable && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Auth Content Body */}
          <div className="p-6 space-y-5">
            {isRegisteredUser ? (
              // REGISTERED USER PROFILE & ALIAS EDITOR
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#101827] border border-[#00F0FF]/20 flex items-center gap-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#00F0FF]/5 rounded-full blur-lg pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-[#00FFCC]/10 border border-[#00FFCC]/30 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-[#00FFCC]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">ID Operador Activo</span>
                    <span className="text-xs text-slate-200 font-mono font-bold block truncate max-w-[240px]">
                      {userSession.email}
                    </span>
                    <span className="text-[9px] text-[#00FFCC] uppercase font-bold tracking-widest mt-0.5 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#00FFCC]" /> Conectado a la Red Supabase
                    </span>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {profileSuccessMsg && (
                  <div className="p-3 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfileAlias} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5 text-[#00F0FF]" /> Modificar tu Alias de Operador (HUD)
                    </label>
                    <input
                      type="text"
                      required
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="Ejemplo: J.A.M.A."
                      className="w-full px-3 py-2.5 bg-[#0A0D14] border border-[#00F0FF]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/30 transition-colors uppercase"
                    />
                    <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                      Este alias se mostrará de forma permanente en tu cabecera del HUD y en tus informes de rendimiento.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#00F0FF]/25 to-[#00FFCC]/25 hover:from-[#00F0FF]/40 hover:to-[#00FFCC]/40 border-2 border-[#00F0FF] text-[#00F0FF] rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />
                          ACTUALIZANDO...
                        </>
                      ) : (
                        <>
                          <HardDrive className="w-4 h-4" />
                          💾 GUARDAR ALIAS
                        </>
                      )}
                    </button>

                    {onSignOut && (
                      <button
                        type="button"
                        onClick={() => {
                          onSignOut();
                          onClose();
                        }}
                        className="py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-500/50 hover:border-rose-500 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        DESCONECTAR
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              // GUEST ACCESS & AUTH FORMS
              <div className="space-y-4">
                {/* Selector de modo: Invitado Offline o Cuenta en Supabase */}
                <div className="flex bg-[#0F172A] p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab('account')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'account'
                        ? 'bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ☁️ Sincronizar Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guest')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'guest'
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👤 Alias Local
                  </button>
                </div>

                {activeTab === 'guest' ? (
                  // GUEST LOCAL ALIAS
                  <form onSubmit={handleSaveHudName} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#00F0FF]/20 text-xs text-slate-300 leading-relaxed flex items-center gap-2">
                      <CloudUpload className="w-4 h-4 text-[#00F0FF] shrink-0" />
                      <span>Cambia tu nombre temporal sin registrarte. Los datos seguirán guardados localmente.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" /> Identidad del HUD
                      </label>
                      <input
                        type="text"
                        required
                        value={hudInput}
                        onChange={(e) => setHudInput(e.target.value)}
                        placeholder="Ejemplo: HUD INVITADO"
                        className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00F0FF]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00F0FF] uppercase"
                      />
                    </div>

                    {savedSuccess && (
                      <div className="p-3 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] text-xs font-bold flex items-center gap-2 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ¡Nombre temporal del HUD guardado!
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#00F0FF]/15 via-[#00F0FF]/25 to-[#00F0FF]/15 hover:from-[#00F0FF]/30 hover:to-[#00F0FF]/30 border border-[#00F0FF] text-[#00F0FF] rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <HardDrive className="w-4 h-4" />
                      GUARDAR ALIAS LOCAL
                    </button>
                  </form>
                ) : (
                  // ACCOUNT AUTH MODES (Signup / Signin / Recovery)
                  <div>
                    {authMode === 'recovery' ? (
                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                        <div className="flex items-center justify-between p-1 bg-[#0F172A] rounded-lg border border-slate-800 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signup'); setAuthError(null); setRecoverySuccessMsg(null); }}
                            className="flex-1 py-1.5 rounded-md transition-all font-bold cursor-pointer text-slate-400 hover:text-slate-200"
                          >
                            Crear Cuenta
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signin'); setAuthError(null); setRecoverySuccessMsg(null); }}
                            className="flex-1 py-1.5 rounded-md transition-all font-bold cursor-pointer text-slate-400 hover:text-slate-200"
                          >
                            Iniciar Sesión
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-[#0F172A] border border-[#00F0FF]/30 text-xs text-slate-300 leading-relaxed flex items-center gap-2">
                          <Key className="w-4 h-4 text-[#00F0FF] shrink-0" />
                          <span>Ingresa tu correo registrado para recibir el enlace de recuperación.</span>
                        </div>

                        {authError && (
                          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{authError}</span>
                          </div>
                        )}

                        {recoverySuccessMsg && (
                          <div className="p-3 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)]">
                            <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                            <span>{recoverySuccessMsg}</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#00F0FF]" /> Ingresa tu correo registrado
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operador@jama.app"
                            className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00F0FF]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00F0FF]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#00F0FF]/25 via-[#00FFCC]/30 to-[#00F0FF]/25 hover:from-[#00F0FF]/40 hover:to-[#00FFCC]/40 border-2 border-[#00F0FF] text-[#00F0FF] rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" />
                              ENVIANDO ENLACE...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-[#00F0FF]" />
                              ⚡ ENVIAR ENLACE DE RECUPERACIÓN
                            </>
                          )}
                        </button>

                        <div className="text-right pt-1">
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signin'); setAuthError(null); setRecoverySuccessMsg(null); }}
                            className="text-[11px] text-slate-400 hover:text-[#00F0FF] transition-colors underline font-mono cursor-pointer"
                          >
                            [ Volver a Iniciar Sesión ]
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleAuthSubmit} className="space-y-3">
                        <div className="flex items-center justify-between p-1 bg-[#0F172A] rounded-lg border border-slate-800 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signup'); setAuthError(null); setRecoverySuccessMsg(null); }}
                            className={`flex-1 py-1.5 rounded-md transition-all font-bold cursor-pointer ${
                              authMode === 'signup'
                                ? 'bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Crear Cuenta
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signin'); setAuthError(null); setRecoverySuccessMsg(null); }}
                            className={`flex-1 py-1.5 rounded-md transition-all font-bold cursor-pointer ${
                              authMode === 'signin'
                                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Iniciar Sesión
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                          {authMode === 'signup'
                            ? 'Crea tu cuenta para asegurar tu rango, nivel e integrar tus datos en la nube Supabase.'
                            : 'Ingresa tus credenciales para acceder a tu consola táctica en la nube.'}
                        </div>

                        {authError && (
                          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{authError}</span>
                          </div>
                        )}

                        {isAuthSuccess && (
                          <div className="p-3 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] text-[#00FFCC] text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)]">
                            <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                            ¡Operador autenticado y datos sincronizados!
                          </div>
                        )}

                        {authMode === 'signup' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <User className="w-3 h-3 text-[#00FFCC]" /> Nombre o Alias Táctico
                            </label>
                            <input
                              type="text"
                              required
                              value={alias}
                              onChange={(e) => setAlias(e.target.value)}
                              placeholder="Ejemplo: J.A.M.A."
                              className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00FFCC]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00FFCC]"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#00FFCC]" /> Correo Electrónico
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operador@jama.app"
                            className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00FFCC]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00FFCC]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Key className="w-3 h-3 text-[#00FFCC]" /> Contraseña
                          </label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-[#0A0D14] border border-[#00FFCC]/40 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00FFCC]"
                          />
                          {authMode === 'signin' && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthMode('recovery');
                                  setAuthError(null);
                                  setRecoverySuccessMsg(null);
                                }}
                                className="text-[11px] text-[#00F0FF] hover:text-[#00FFCC] hover:underline font-mono cursor-pointer transition-colors"
                              >
                                ¿Olvidaste tu contraseña?
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#00F0FF]/25 via-[#00FFCC]/30 to-[#00F0FF]/25 hover:from-[#00F0FF]/40 hover:to-[#00FFCC]/40 border-2 border-[#00FFCC] text-[#00FFCC] rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,204,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#00FFCC]" />
                              CONECTANDO CON SUPABASE...
                            </>
                          ) : authMode === 'signup' ? (
                            <>
                              <Zap className="w-4 h-4 fill-[#00FFCC]" />
                              ⚡ CREAR CUENTA & SINCRONIZAR
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 text-[#00FFCC]" />
                              ⚡ INICIAR SESIÓN TÁCTICA
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {isClosable && (
            <div className="p-4 bg-[#101827]/80 border-t border-[#00F0FF]/20 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-[#0A0D14] border border-[#00F0FF]/30 hover:border-[#00F0FF] text-slate-200 hover:text-[#00F0FF] rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
