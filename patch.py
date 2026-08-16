import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

replacement = """
  if (isCheckingSession) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${activeTheme.primaryBg} hud-bg-grid`}>
        <div className="flex flex-col items-center gap-4 text-[#00F0FF] font-mono">
          <Activity className="w-8 h-8 animate-spin" />
          <div className="text-xs tracking-wider animate-pulse">[ INICIALIZANDO SISTEMA TÁCTICO ]</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen w-full overflow-x-hidden ${activeTheme.primaryBg} hud-bg-grid text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#06B6D4] selection:text-slate-950 transition-colors duration-300 font-sans relative`}>
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          userSession={userSession}
          onUpdateUserSession={handleUpdateUserSession}
          onInitializeOperator={handleInitializeOperator}
          onPlayWelcomeVoice={handlePlayWelcomeVoice}
          onSignOut={handleSignOut}
        />
        <ResetPasswordModal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          onSuccess={() => {
            setToastNotification('¡Contraseña restablecida con éxito!');
            setTimeout(() => setToastNotification(null), 4000);
            handlePlayWelcomeVoice();
          }}
        />
      </div>
    );
  }

  return (
"""

content = content.replace("  return (\n    <div className={`min-h-screen", replacement + "    <div className={`min-h-screen")

with open("src/App.tsx", "w") as f:
    f.write(content)
