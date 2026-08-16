import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Make sure we don't double append
if "export default App;" not in content:
    with open('src/App.tsx', 'a') as f:
        f.write("""
  const handleDeleteHabit = async (habitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        return;
      }
      setHabits(prev => prev.filter(h => h.id !== habitId));
      supabase.from('habits').delete().eq('id', habitId).eq('user_id', user.id).then(({ error }) => {
        if (error) console.error("Error al eliminar hábito (background):", error);
      });
    } catch (e: any) {
      console.error("Error al eliminar hábito:", e);
    }
  };

  const handleCloseDay = (dateStr: string) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const activeHabits = habits.filter(h => !h.archived);
    const totalHabits = activeHabits.length;
    const validCompleted = activeHabits.filter(h => (activeLog.completedHabitIds || []).includes(h.id)).length;
    const rate = totalHabits > 0 ? Math.min(100, Math.round((validCompleted / totalHabits) * 100)) : 0;
    
    const newLog = { ...activeLog, isClosed: true, closureRate: rate };
    updateLogs({ ...logs, [dateStr]: newLog });
    
    supabase.auth.getUser().then(({ data: { user }}) => {
       if (user) {
           supabase.from('daily_logs').update({
             is_closed: true, closure_rate: rate, updated_at: new Date().toISOString()
           }).eq('date', dateStr).eq('user_id', user.id).then();
       }
    });
  };

  const handleSaveDailyWins = (dateStr: string, wins: string[]) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const newLog = { ...activeLog, dailyWins: wins };
    updateLogs({ ...logs, [dateStr]: newLog });
    
    supabase.auth.getUser().then(({ data: { user }}) => {
       if (user) {
           supabase.from('daily_logs').update({
             daily_wins: wins, updated_at: new Date().toISOString()
           }).eq('date', dateStr).eq('user_id', user.id).then();
       }
    });
  };

  const handleSaveSportsEntry = (dateStr: string, entry: SportsEntry) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const newLog = { ...activeLog, sportsEntry: entry };
    updateLogs({ ...logs, [dateStr]: newLog });

    supabase.auth.getUser().then(({ data: { user }}) => {
       if (user) {
           supabase.from('daily_logs').update({
             sports_entry: entry as any, updated_at: new Date().toISOString()
           }).eq('date', dateStr).eq('user_id', user.id).then();
       }
    });
  };

  const handleDeleteSportsEntry = (dateStr: string, entryId: string) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const newLog = { ...activeLog };
    delete newLog.sportsEntry;
    updateLogs({ ...logs, [dateStr]: newLog });

    supabase.auth.getUser().then(({ data: { user }}) => {
       if (user) {
           supabase.from('daily_logs').update({
             sports_entry: null, updated_at: new Date().toISOString()
           }).eq('date', dateStr).eq('user_id', user.id).then();
       }
    });
  };

  const handleSaveReview = (review: OneOnOneReview) => {
     setReviews(prev => {
        const idx = prev.findIndex(r => r.id === review.id);
        if (idx >= 0) return [...prev.slice(0, idx), review, ...prev.slice(idx+1)];
        return [review, ...prev];
     });
  };

  const handleFocusSessionComplete = useCallback((minutes: number, xpEarned: number, taskName: string) => {
    const dateStr = getTodayISO();
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    
    const newSession: FocusSessionEntry = {
      id: 'fs-' + Date.now(),
      durationMinutes: minutes,
      taskName: taskName,
      timestamp: new Date().toISOString(),
      xpEarned: xpEarned
    };
    
    const sessions = activeLog.focusSessions ? [...activeLog.focusSessions, newSession] : [newSession];
    const newLog = { ...activeLog, focusSessions: sessions };
    updateLogs({ ...logs, [dateStr]: newLog });
    
    supabase.auth.getUser().then(({ data: { user }}) => {
       if (user) {
           supabase.from('daily_logs').update({
             focus_sessions: sessions as any, updated_at: new Date().toISOString()
           }).eq('date', dateStr).eq('user_id', user.id).then();
       }
    });
  }, [logs]);
  
  const handlePlayWelcomeVoice = useCallback(() => {}, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserSession(null as any);
  }, []);

  const loadAllUserData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const [habitsRes, tasksRes, projectsRes, ideasRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('ideas').select('*').eq('user_id', userId)
      ]);

      if (habitsRes.data) {
        setHabits(habitsRes.data.map((r: any) => ({
          id: String(r.id), title: r.title, description: r.description,
          category: r.category, color: r.color, icon: r.icon,
          targetDaysPerWeek: r.target_days || r.frequency || 7,
          createdAt: r.created_at, completed: Boolean(r.completed),
          streak: Number(r.streak), lastCompletedAt: r.last_completed_at, archived: Boolean(r.archived)
        })));
      }
      
      if (projectsRes.data) {
         setProjects(projectsRes.data.map((r: any) => ({
            id: String(r.id), title: r.title, description: r.description,
            status: r.status, priority: r.priority, progress: r.progress,
            startDate: r.start_date, endDate: r.end_date, tasks: []
         })));
      }
      
      if (ideasRes.data) {
         setIdeas(ideasRes.data.map((r: any) => ({
            id: String(r.id), title: r.title, description: r.description,
            category: r.category, impact: r.impact, effort: r.effort,
            status: r.status, createdAt: r.created_at
         })));
      }
      
      setLoading(false);
    } catch(err) { console.error(err); setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
        setLoading(false);
        return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setIsAuthenticated(true);
            loadAllUserData(session.user.id);
        } else {
            setLoading(false);
        }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          await loadAllUserData(session.user.id);
       } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
       }
    });
    return () => { subscription.unsubscribe(); };
  }, [loadAllUserData]);

  const activeTheme = THEMES[currentThemeId] || THEMES.cyan;

  if (loading) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center bg-[#080b11] ${activeTheme.primaryBg} hud-bg-grid`} style={{ backgroundColor: '#080b11' }}>
        <div className="flex flex-col items-center gap-4 text-[#00F0FF] font-mono">
          <Activity className="w-8 h-8 animate-spin" />
          <div className="text-xs tracking-wider animate-pulse">[ CARGANDO SESIÓN Y DATOS DE LA RED ]</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen w-full overflow-x-hidden bg-[#080b11] ${activeTheme.primaryBg} hud-bg-grid text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#06B6D4] selection:text-slate-950 transition-colors duration-300 font-sans relative`} style={{ backgroundColor: '#080b11' }}>
        <AuthModal
          isOpen={true}
          onClose={() => {
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
          }}
          userSession={userSession}
          onUpdateUserSession={handleUpdateUserSession}
          onInitializeOperator={handleInitializeOperator}
          onAuthSuccess={loadAllUserData}
          onPlayWelcomeVoice={handlePlayWelcomeVoice}
          onSignOut={handleSignOut}
          isClosable={false}
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
    <div className={`min-h-screen w-full overflow-x-hidden ${activeTheme.primaryBg} hud-bg-grid text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-[#06B6D4] selection:text-slate-950 transition-colors duration-300 font-sans relative`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStreak={activeStreak}
        onResetData={handleResetData}
        completedTodayCount={completedTodayCount}
        totalHabitsCount={totalHabitsCount}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        totalXP={totalXP}
        userSession={userSession}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onPlayWelcomeVoice={handlePlayWelcomeVoice}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0 space-y-6">
         <header className="bg-[#101827]/90 p-4 md:p-5 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md relative z-30 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-3.5 relative z-50 pointer-events-auto">
             <div className="p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
               <Activity className="w-6 h-6 text-[#00F0FF]" />
             </div>
             <div>
               <div className="flex items-center gap-2.5 flex-wrap">
                 <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-wider font-sans">CHECK</h1>
                 <button type="button" onClick={() => setIsAuthModalOpen(true)} className="relative z-50 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] font-bold hover:bg-[#00F0FF]/25 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.15)]" title="Configurar Sesión / HUD">
                   <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse"></span>
                   ● {userSession?.hudName || "HUD INVITADO"}
                 </button>
               </div>
               <p className="text-xs text-slate-400 mt-0.5 font-mono">MODULE // ACTIVE</p>
             </div>
           </div>
         </header>

         {activeTab === 'tracker' && <DailyTracker habits={habits} logs={logs} projects={projects} onSaveProject={handleSaveProject} onToggleHabit={handleToggleHabit} onSaveHabit={handleSaveHabit} onDeleteHabit={handleDeleteHabit} onCloseDay={handleCloseDay} onSaveDailyWins={handleSaveDailyWins} onSaveSportsEntry={handleSaveSportsEntry} onDeleteSportsEntry={handleDeleteSportsEntry} calculateStreak={calculateStreak} />}
         {activeTab === 'exec' && <ExecCenter projects={projects} onSaveProject={handleSaveProject} onUpdateProjects={setProjects} />}
         {activeTab === 'projects' && <ProjectsManager projects={projects} onSaveProject={handleSaveProject} onDeleteProject={handleDeleteProject} />}
         {activeTab === 'analytics' && <AnalyticsTrends habits={habits} logs={logs} calculateStreak={calculateStreak} />}
         {activeTab === 'review' && <ReviewInsights habits={habits} logs={logs} reviews={reviews} onSaveReview={handleSaveReview} />}
         {activeTab === 'focus' && <FocusTimer onFocusSessionComplete={handleFocusSessionComplete} todaySessions={logs[getTodayISO()]?.focusSessions || []} />}
         {activeTab === 'ideas' && <IdeasRadar ideas={ideas} onSaveIdea={handleSaveIdea} onDeleteIdea={handleDeleteIdea} onConvertToProject={handleConvertIdeaToProject} />}
      </main>

      <ThemeSelectorModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} currentThemeId={currentThemeId} onSelectTheme={handleSelectTheme} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} userSession={userSession} onUpdateUserSession={handleUpdateUserSession} onInitializeOperator={handleInitializeOperator} onAuthSuccess={loadAllUserData} onPlayWelcomeVoice={handlePlayWelcomeVoice} onSignOut={handleSignOut} isClosable={true} />
      <ResetPasswordModal isOpen={isResetPasswordModalOpen} onClose={() => setIsResetPasswordModalOpen(false)} onSuccess={() => {}} />
    </div>
  );
}

export default App;
""")
