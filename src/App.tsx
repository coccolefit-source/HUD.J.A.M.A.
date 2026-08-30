import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Activity, User, Zap, X, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Habit, DailyLog, OneOnOneReview, SportsEntry, Project, ProjectTask, UserSession, UserProfileState, FocusSessionEntry, Idea } from './types';
import { 
  getStoredHabits, 
  saveStoredHabits, 
  getStoredLogs, 
  saveStoredLogs, 
  getStoredReviews, 
  saveStoredReviews, 
  getStoredProjects,
  saveStoredProjects,
  getStoredIdeas,
  saveStoredIdeas,
  getGuestHabits,
  defaultGuestHabits,
  saveGuestHabits,
  getGuestTasks,
  saveGuestTasks,
  getGuestProjects,
  saveGuestProjects,
  getGuestIdeas,
  saveGuestIdeas,
  getGuestDailyLogs,
  saveGuestDailyLogs,
  resetToSampleData 
} from './utils/storage';
import { INITIAL_PROJECTS } from './data/initialData';
import { getStoredUserSession, saveStoredUserSession, getStoredUserProfile, saveStoredUserProfile } from './utils/userStorage';
import { getRankInfo } from './utils/gamification';
import { getTodayISO, parseISODate, formatDateToISO } from './utils/dateUtils';
import { Sidebar, TabType } from './components/Sidebar';
import { DailyTracker } from './components/DailyTracker/DailyTracker';
import { AnalyticsTrends } from './components/Analytics/AnalyticsTrends';
import { ReviewInsights } from './components/Review/ReviewInsights';
import { ProjectsManager } from './components/Projects/ProjectsManager';
import { ExecCenter } from './components/Exec/ExecCenter';
import { FocusTimer } from './components/FocusTimer/FocusTimer';
import { IdeasRadar } from './components/Ideas/IdeasRadar';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthBanner } from './components/Auth/AuthBanner';
import { ResetPasswordModal } from './components/Auth/ResetPasswordModal';
import { getStoredTheme, saveStoredTheme, ThemeId, THEMES } from './theme';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { fetchCloudTasks, createCloudTask, updateCloudTask, deleteCloudTask, syncProjectTasksToCloud } from './lib/supabaseTasks';
import { fetchCloudHabits, createCloudHabit, updateCloudHabit, deleteCloudHabit } from './lib/supabaseHabits';
import { fetchCloudIdeas, createCloudIdea, deleteCloudIdea, updateCloudIdea } from './lib/supabaseIdeas';
import { fetchCloudProjects, createCloudProject, updateCloudProject, deleteCloudProject } from './lib/supabaseProjects';
import { fetchCloudDailyLogs, upsertCloudDailyLog } from './lib/supabaseDailyLogs';

function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [reviews, setReviews] = useState<OneOnOneReview[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userSession, setUserSession] = useState<UserSession>(getStoredUserSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseConfigured);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tracker');
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(getStoredTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastNotification(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 2500);
  }, []);

  // Profile & gamification state
  const [profile, setProfile] = useState<UserProfileState>(getStoredUserProfile());

  const addXP = useCallback((amount: number) => {
    setProfile(prev => {
      const newXP = prev.xp + amount;
      const rankInfo = getRankInfo(newXP);
      const updated = {
        ...prev,
        xp: newXP,
        level: rankInfo.level,
        rankTitle: rankInfo.rankName,
        progressPercentage: rankInfo.progressPercent,
        isMaxLevel: rankInfo.level >= 4
      };
      saveStoredUserProfile(updated);
      return updated;
    });
  }, []);

  const calculateStreak = useCallback((habitId: string, uptoDate: string): number => {
    const todayStr = getTodayISO();
    
    if (uptoDate === todayStr) {
      const currentHabits = habitsRef.current;
      if (currentHabits) {
        const habit = currentHabits.find(h => String(h.id) === String(habitId));
        if (habit && habit.streak !== undefined) {
          return habit.streak;
        }
      }
    }

    let streak = 0;
    let currentDate = parseISODate(uptoDate);
    
    // Si la fecha seleccionada es hoy y el hábito no está completado hoy,
    // calculamos la racha empezando desde ayer para que la racha no se muestre como 0
    // antes de que el usuario marque el hábito hoy.
    if (uptoDate === todayStr) {
      const logToday = logsRef.current[todayStr];
      const completedToday = logToday?.completedHabitIds?.includes(habitId);
      if (!completedToday) {
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    while (true) {
      const dateStr = formatDateToISO(currentDate);
      const log = logsRef.current[dateStr];
      const isCompleted = log?.completedHabitIds?.includes(habitId);
      if (isCompleted) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, []);

  const activeStreak = useMemo(() => {
    let streak = 0;
    let currentDate = new Date();
    while (true) {
      const dateStr = formatDateToISO(currentDate);
      const log = logs[dateStr];
      if (log && log.completedHabitIds && log.completedHabitIds.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        if (streak === 0 && dateStr === getTodayISO()) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  }, [logs]);

  const totalXP = profile.xp;

  const todayStr = getTodayISO();
  const completedTodayCount = useMemo(() => {
    const activeHabits = habits.filter(h => !h.archived);
    const completedIds = logs[todayStr]?.completedHabitIds || [];
    return activeHabits.filter(h => completedIds.includes(h.id) || Boolean(h.completed)).length;
  }, [habits, logs, todayStr]);

  const totalHabitsCount = useMemo(() => {
    return habits.filter(h => !h.archived).length;
  }, [habits]);

  const handleResetData = () => {
    if (confirm("¿Estás seguro de que deseas restablecer todos los datos del sistema? Esta acción es irreversible.")) {
      resetToSampleData();
    }
  };

  const habitsRef = useRef(habits);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const logsRef = useRef(logs);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const userSessionRef = useRef(userSession);
  useEffect(() => {
    userSessionRef.current = userSession;
  }, [userSession]);

  const handleUpdateUserSession = (session: UserSession) => {
    setUserSession(session);
    saveStoredUserSession(session);
  };

  const handleInitializeOperator = (session: UserSession, operatorAlias: string) => {
    // 1. OBJETO DE USUARIO NUEVO OBLIGATORIO
    const newCleanProfile: UserProfileState = {
      streak: 0,
      xp: 0,
      level: 1,
      rankTitle: "OPERADOR NOVATO",
      progressPercentage: 0,
      isMaxLevel: false
    };

    // 2. ELIMINAR MERGE CON MOCK DATA Y SOBREESCRIBIR EN LOCALSTORAGE / ESTADO
    handleUpdateUserSession(session);
    saveStoredUserProfile(newCleanProfile);

    // Explicitly overwrite logs, reviews, and projects so 0 XP and 0 streak are strictly enforced
    const cleanLogs = {};
    const cleanReviews: OneOnOneReview[] = [];
    const cleanProjects: Project[] = (projects.length > 0 ? projects : INITIAL_PROJECTS).map(p => ({
      ...p,
      progress: 0,
      tasks: (p.tasks || []).map(t => ({ ...t, completed: false }))
    }));

    setLogs(cleanLogs);
    saveStoredLogs(cleanLogs);

    setReviews(cleanReviews);
    saveStoredReviews(cleanReviews);

    setProjects(cleanProjects);
    saveStoredProjects(cleanProjects);

    setProfile(newCleanProfile);

    // Toast Notification
    const toastMsg = `¡Bienvenido a la red, Operador ${operatorAlias}! Perfil activado en Nivel 1 (0 XP, 0d racha).`;
    setToastNotification(toastMsg);
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);

    // Mission habit setup
    const missionTitle = '[ ▶ INICIAR MISIÓN: Configurar Perfil Táctico ]';
    const missionExists = habits.some(h => h.title === missionTitle);

    if (!missionExists) {
      const newMissionHabit: Habit = {
        id: `mission-profile-${Date.now()}`,
        title: missionTitle,
        description: 'Misión Inicial: Configura tu perfil táctico y verifica el sistema de hábitos de la red.',
        category: 'Personal',
        color: '#00F0FF',
        icon: 'Target',
        targetDaysPerWeek: 7,
        createdAt: new Date().toISOString(),
        archived: false
      };
      const updated = [newMissionHabit, ...habits];
      setHabits(updated);
      saveStoredHabits(updated);
    }
  };

  const activeTheme = useMemo(() => {
    return THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  }, [currentThemeId]);

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentThemeId(themeId);
    saveStoredTheme(themeId);
  };

  const updateHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
  };

  const updateLogs = async (newLogs: Record<string, DailyLog>, targetDate?: string) => {
    setLogs(newLogs);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (targetDate && newLogs[targetDate]) {
          await upsertCloudDailyLog(newLogs[targetDate]);
        }
      } else {
        saveGuestDailyLogs(newLogs);
      }
    } catch (e: any) {
      console.error("Error actualizando logs:", e);
    }
  };

  const updateReviews = (newReviews: OneOnOneReview[]) => {
    setReviews(newReviews);
  };

  const updateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
  };

  const updateIdeas = (newIdeas: Idea[]) => {
    setIdeas(newIdeas);
  };

  const handleSaveIdea = async (idea: Idea) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para crear ideas.");
        return;
      }

      const res = await createCloudIdea(idea);
      if (!res.success || res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al guardar idea en Supabase');
        console.error("Error al insertar idea en Supabase:", res.error);
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      const createdIdea: Idea = res.data ? res.data : {
        ...idea,
        id: String(Date.now()),
        createdAt: new Date().toISOString()
      };

      setIdeas(prev => [createdIdea, ...prev]);
      showToast("Idea guardada con éxito en Supabase.");
    } catch (err: any) {
      console.error("Error al guardar idea:", err);
      alert(`Error al guardar idea: ${err.message || err}`);
    }
  };

  const handleUpdateIdea = async (ideaId: string, updates: Partial<Idea>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para actualizar ideas.");
        return;
      }

      const res = await updateCloudIdea(ideaId, updates);
      if (!res.success || res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al actualizar idea en Supabase');
        console.error("Error al actualizar idea en Supabase:", res.error);
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, ...updates } : i));
      showToast("Idea actualizada con éxito en Supabase.");
    } catch (err: any) {
      console.error("Error al actualizar idea:", err);
      alert(`Error al actualizar idea: ${err.message || err}`);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para eliminar ideas.");
        return;
      }

      const res = await deleteCloudIdea(ideaId);
      if (!res.success || res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : (res.error || 'Error al eliminar idea de Supabase');
        console.error("Error al eliminar idea en Supabase:", res.error);
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      showToast("Idea eliminada de Supabase.");
    } catch (e: any) {
      console.error("Error al eliminar idea:", e);
      alert(`Error al eliminar idea: ${e.message || e}`);
    }
  };

  const handleConvertIdeaToProject = async (idea: Idea) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase.");
        return;
      }

      const projectPayload = {
        title: idea.title,
        description: idea.notes || (idea as any).description || '',
        user_id: user.id,
        status: 'pending',
        priority: 'Media',
        progress: 0
      };

      const [projectRes, ideaRes] = await Promise.all([
        createCloudProject(projectPayload),
        deleteCloudIdea(idea.id)
      ]);

      if (!projectRes.success || !projectRes.data) {
        const errorMsg = typeof projectRes.error === 'string' ? projectRes.error : (projectRes.error?.message || 'Error al crear proyecto en Supabase');
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      const newProject: Project = { 
        ...projectRes.data, 
        id: String(projectRes.data.id), 
        tasks: [] 
      };

      setProjects(prev => [newProject, ...prev]);
      setIdeas(prev => prev.filter(i => i.id !== idea.id));
      setActiveTab('projects');
      showToast("Idea convertida a proyecto en Supabase.");
    } catch (err: any) {
      console.error("Error al convertir la idea:", err);
      alert(`Error al convertir idea: ${err.message || err}`);
    }
  };

  const handleSaveProject = async (project: Project) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para guardar proyectos.");
        return;
      }

      // Check if virtual project container 'proj-other'
      if (project.id === 'proj-other') {
        const syncedProject = await syncProjectTasksToCloud(project);
        setProjects(prev => {
          const exists = prev.some(p => p.id === 'proj-other');
          if (exists) {
            return prev.map(p => p.id === 'proj-other' ? syncedProject : p);
          } else {
            return [...prev, syncedProject];
          }
        });
        showToast("Tareas guardadas en Supabase.");
        return;
      }

      // Check if project has an existing DB id (not a temp client prefix)
      const isExistingInDb = project.id && 
        !String(project.id).startsWith('proj-temp-') && 
        !String(project.id).startsWith('proj-') &&
        !String(project.id).startsWith('guest_');

      if (isExistingInDb) {
        const res = await updateCloudProject(project.id, {
          title: project.title,
          description: project.description,
          status: project.status,
          priority: project.priority,
          progress: project.progress
        });

        if (!res.success || res.error) {
          const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al actualizar proyecto en Supabase');
          alert(`Error en Supabase: ${errorMsg}`);
          return;
        }

        const syncedProject = await syncProjectTasksToCloud(project);
        setProjects(prev => prev.map(p => p.id === project.id ? syncedProject : p));
        showToast("Proyecto actualizado en Supabase.");
      } else {
        const res = await createCloudProject({
          title: project.title,
          description: project.description,
          status: project.status,
          priority: project.priority,
          progress: project.progress
        });

        if (!res.success || !res.data) {
          const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al crear proyecto en Supabase');
          alert(`Error en Supabase: ${errorMsg}`);
          return;
        }

        const realId = String(res.data.id);
        const createdProj = {
          ...project,
          id: realId,
          createdAt: res.data.created_at || new Date().toISOString()
        };

        const syncedProject = await syncProjectTasksToCloud(createdProj);
        setProjects(prev => [syncedProject, ...prev.filter(p => p.id !== project.id)]);
        showToast("Proyecto creado en Supabase.");
      }
    } catch (err: any) {
      console.error('Error inesperado en handleSaveProject:', err);
      alert(`Error en proyecto: ${err.message || err}`);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para eliminar proyectos.");
        return;
      }

      if (projectId === 'proj-other') {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        return;
      }

      const res = await deleteCloudProject(projectId);
      if (!res.success || res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al eliminar proyecto de Supabase');
        console.error('Error al eliminar proyecto:', res.error);
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      showToast("Proyecto eliminado de Supabase.");
    } catch (e: any) {
      console.error('Error al eliminar proyecto:', e);
      alert(`Error al eliminar proyecto: ${e.message || e}`);
    }
  };

  const handleToggleHabit = useCallback((arg1: string, arg2?: string) => {
    const habitId = arg2 ? arg2 : arg1;
    const dateStr = arg2 ? arg1 : getTodayISO();
    const isToday = dateStr === getTodayISO();

    try {
      const currentHabits = habitsRef.current;
      const currentLogs = logsRef.current;
      
      const targetHabit = currentHabits.find(h => String(h.id) === String(habitId));
      const activeLog = currentLogs[dateStr] || {
        date: dateStr,
        completedHabitIds: [],
        isClosed: false
      };

      const currentCompletedIds = activeLog.completedHabitIds || [];
      const isCurrentlyCompleted = currentCompletedIds.includes(habitId);
      const newCompletedState = !isCurrentlyCompleted;

      const updatedCompletedIds = newCompletedState
        ? Array.from(new Set([...currentCompletedIds, habitId]))
        : currentCompletedIds.filter(id => id !== habitId);

      const activeHabits = currentHabits.filter(h => !h.archived);
      const totalHabits = activeHabits.length;
      const validCompleted = activeHabits.filter(h => updatedCompletedIds.includes(h.id)).length;
      const rate = totalHabits > 0 ? Math.min(100, Math.round((validCompleted / totalHabits) * 100)) : 0;

      // Actualizar información y racha de hábito si la fecha es hoy
      let newStreak = targetHabit?.streak || 0;
      let newLastCompletedAt = targetHabit?.lastCompletedAt || null;
      
      if (isToday) {
        newStreak = 0;
        let checkDate = parseISODate(dateStr);
        if (!newCompletedState) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (true) {
          const checkDateStr = formatDateToISO(checkDate);
          if (checkDateStr === dateStr) {
            if (newCompletedState) {
              newStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          } else {
            const checkLog = currentLogs[checkDateStr];
            const isCompletedInCheckLog = checkLog?.completedHabitIds?.includes(habitId);
            if (isCompletedInCheckLog) {
              newStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        newLastCompletedAt = newCompletedState ? new Date().toISOString() : null;

        // Actualización optimista del estado local
        setHabits(prev => {
          const updated = prev.map(h => String(h.id) === String(habitId) ? {
            ...h,
            completed: newCompletedState,
            streak: newStreak,
            lastCompletedAt: newLastCompletedAt
          } : h);
          saveGuestHabits(updated);
          return updated;
        });
      }

      if (newCompletedState) {
        addXP(10);
      }
      
      const newLog = {
        ...activeLog,
        completedHabitIds: updatedCompletedIds,
        closureRate: rate
      };
      
      const updatedLogs = {
        ...currentLogs,
        [dateStr]: newLog
      };

      // Actualización optimista de logs
      setLogs(updatedLogs);
      saveGuestDailyLogs(updatedLogs);

      // Petición asíncrona a Supabase en segundo plano
      const syncWithCloud = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Si no hay usuario, queda guardado en local
        
        // Sincronizar log diario
        await upsertCloudDailyLog(newLog);

        // Sincronizar hábito
        if (isToday) {
          const { error: habitError } = await supabase
            .from('habits')
            .update({ 
              completed: newCompletedState,
              streak: newStreak,
              last_completed_at: newLastCompletedAt
            })
            .eq('id', habitId)
            .eq('user_id', user.id);
            
          if (habitError) {
            console.error('Error al actualizar hábito (background):', habitError);
          }
        }
      };
      
      syncWithCloud();

    } catch (err: any) {
      console.error("Error al conmutar estado del hábito:", err);
      showToast("Error local al actualizar el hábito.");
    }
  }, []);

  const handleMoveHabit = useCallback((habitId: string, direction: 'up' | 'down') => {
    setHabits(prev => {
      const idx = prev.findIndex(h => h.id === habitId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newHabits = [...prev];
      const [moved] = newHabits.splice(idx, 1);
      newHabits.splice(targetIdx, 0, moved);

      return newHabits;
    });
  }, []);

  const handleSaveHabit = useCallback(async (habitData: Partial<Habit>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para guardar hábitos.");
        return;
      }

      const isExistingInDb = habitData.id &&
        !String(habitData.id).startsWith('habit-temp-') &&
        !String(habitData.id).startsWith('h') &&
        !String(habitData.id).startsWith('guest_');

      if (isExistingInDb) {
        const res = await updateCloudHabit(habitData.id!, {
          title: habitData.title,
          description: habitData.description,
          category: habitData.category,
          color: habitData.color,
          icon: habitData.icon,
          frequency: habitData.targetDaysPerWeek,
          daysOfWeek: habitData.daysOfWeek
        } as any);

        if (!res.success || res.error) {
          const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al actualizar hábito en Supabase');
          alert(`Error en Supabase: ${errorMsg}`);
          return;
        }

        setHabits(prev => prev.map(h => h.id === habitData.id ? { ...h, ...habitData } as Habit : h));
        showToast("Hábito actualizado en Supabase.");
      } else {
        const res = await createCloudHabit({
          title: habitData.title || 'Hábito sin título',
          description: habitData.description,
          category: habitData.category || 'Productividad',
          color: habitData.color || '#00F0FF',
          icon: habitData.icon || 'Zap',
          frequency: habitData.targetDaysPerWeek || 7,
          daysOfWeek: habitData.daysOfWeek || []
        } as any);

        if (!res.success || !res.data) {
          const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al crear hábito en Supabase');
          alert(`Error en Supabase: ${errorMsg}`);
          return;
        }

        const createdHabit: Habit = {
          id: String(res.data.id),
          title: res.data.title || habitData.title || 'Hábito sin título',
          description: res.data.description || habitData.description,
          category: res.data.category || habitData.category || 'Productividad',
          color: res.data.color || habitData.color || '#00F0FF',
          icon: res.data.icon || habitData.icon || 'Zap',
          targetDaysPerWeek: res.data.target_days || res.data.frequency || habitData.targetDaysPerWeek || 7,
          createdAt: res.data.created_at || new Date().toISOString(),
          archived: Boolean(res.data.archived),
          completed: Boolean(res.data.completed),
          streak: Number(res.data.streak || 0),
          lastCompletedAt: res.data.last_completed_at || null,
          daysOfWeek: res.data.days_of_week || habitData.daysOfWeek || []
        };

        setHabits(prev => [createdHabit, ...prev.filter(h => h.id !== habitData.id)]);
        showToast("Hábito creado en Supabase.");
      }
    } catch (err: any) {
      console.error('Error al guardar hábito:', err);
      alert(`Error al guardar hábito: ${err.message || err}`);
    }
  }, []);

  const handleDeleteHabit = useCallback(async (habitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes estar autenticado en Supabase para eliminar hábitos.");
        return;
      }

      const res = await deleteCloudHabit(habitId);
      if (!res.success || res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al eliminar hábito de Supabase');
        console.error("Error al eliminar hábito:", res.error);
        alert(`Error en Supabase: ${errorMsg}`);
        return;
      }

      setHabits(prev => prev.filter(h => h.id !== habitId));
      showToast("Hábito eliminado de Supabase.");
    } catch (e: any) {
      console.error("Error al eliminar hábito:", e);
      alert(`Error al eliminar hábito: ${e.message || e}`);
    }
  }, []);

  const handleCloseDay = (dateStr: string) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const activeHabits = habits.filter(h => !h.archived);
    const totalHabits = activeHabits.length;
    const validCompleted = activeHabits.filter(h => (activeLog.completedHabitIds || []).includes(h.id)).length;
    const rate = totalHabits > 0 ? Math.min(100, Math.round((validCompleted / totalHabits) * 100)) : 0;
    
    const newLog = { ...activeLog, isClosed: true, closureRate: rate };
    updateLogs({ ...logs, [dateStr]: newLog }, dateStr);
  };

  const handleSaveDailyWins = (dateStr: string, wins: string[]) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const newLog = { ...activeLog, dailyWins: wins };
    updateLogs({ ...logs, [dateStr]: newLog }, dateStr);
  };

  const handleSaveSportsEntry = (dateStr: string, entry: SportsEntry) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const existingEntries = activeLog.sportsEntries || [];
    const updatedEntries = existingEntries.some(e => e.id === entry.id)
      ? existingEntries.map(e => e.id === entry.id ? entry : e)
      : [...existingEntries, entry];
    const newLog = { ...activeLog, sportsEntries: updatedEntries };
    updateLogs({ ...logs, [dateStr]: newLog }, dateStr);
    
    addXP(15);

  };

  const handleDeleteSportsEntry = (dateStr: string, entryId: string) => {
    const activeLog = logs[dateStr] || { date: dateStr, completedHabitIds: [], isClosed: false };
    const existingEntries = activeLog.sportsEntries || [];
    const updatedEntries = existingEntries.filter(e => e.id !== entryId);
    const newLog = { ...activeLog, sportsEntries: updatedEntries };
    updateLogs({ ...logs, [dateStr]: newLog }, dateStr);

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
      minutes: minutes,
      taskName: taskName,
      completedAt: new Date().toISOString(),
      xpEarned: xpEarned
    };
    
    const sessions = activeLog.focusSessions ? [...activeLog.focusSessions, newSession] : [newSession];
    const newLog = { ...activeLog, focusSessions: sessions };
    updateLogs({ ...logs, [dateStr]: newLog }, dateStr);
    
    addXP(xpEarned);
    
  }, [logs, addXP]);
  
  const handlePlayWelcomeVoice = useCallback(() => {}, []);

  const handleSignOut = useCallback(async () => {
    try {
      // Limpiar los estados locales primero para un logout seguro
      setHabits([]);
      setProjects([]);
      setIdeas([]);
      setReviews([]);
      setLogs({});
      setUserSession(null as any);
      setIsAuthenticated(false);

      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, []);

  const loadAllUserData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const [habitsRes, tasksRes, projectsRes, ideasRes, dailyLogsData] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('ideas').select('*').eq('user_id', userId),
        fetchCloudDailyLogs(userId)
      ]);

      if (habitsRes.data) {
        let loadedHabits = habitsRes.data.map((r: any) => ({
          id: String(r.id), title: r.title, description: r.description,
          category: r.category, color: r.color, icon: r.icon,
          targetDaysPerWeek: r.target_days || r.frequency || 7,
          createdAt: r.created_at, completed: Boolean(r.completed),
          streak: Number(r.streak), lastCompletedAt: r.last_completed_at, archived: Boolean(r.archived),
          daysOfWeek: r.days_of_week || []
        }));

        setHabits(loadedHabits);
      }
      
      // Process tasks loaded from Supabase
      const seenTaskKeys = new Set<string>();
      const todayISO = new Date().toISOString().split('T')[0];
      const allTasks: Array<{ 
        id: string; 
        projectId: string; 
        title: string; 
        completed: boolean; 
        dueDate?: string;
        isExec?: boolean;
        isMyDay?: boolean;
        description?: string;
        priority?: string;
        status?: string;
      }> = [];
      
      for (const t of (tasksRes.data || [])) {
        const tId = String(t.id);
        const pId = (t.project_id && t.project_id !== 'null') ? String(t.project_id) : 'proj-other';
        const taskKey = `${tId}_${pId}_${t.title}`;
        
        if (!seenTaskKeys.has(taskKey)) {
          seenTaskKeys.add(taskKey);
          const isMyDayCalculated = t.is_my_day !== undefined && t.is_my_day !== null
            ? Boolean(t.is_my_day)
            : (t.due_date === todayISO || t.date === todayISO);
          const isExecCalculated = t.is_exec !== undefined && t.is_exec !== null
            ? Boolean(t.is_exec)
            : true;

          allTasks.push({
            id: tId,
            projectId: pId,
            title: t.title || 'Tarea sin título',
            description: t.description || '',
            completed: Boolean(t.completed || t.status === 'completed'),
            dueDate: t.due_date || t.date || undefined,
            isExec: isExecCalculated,
            isMyDay: isMyDayCalculated,
            priority: t.priority || 'medium',
            status: t.status || (t.completed ? 'completed' : 'pending')
          });
        }
      }

      // Track tasks assigned to loaded projects
      const assignedTaskIds = new Set<string>();
      const loadedProjects: Project[] = [];

      for (const r of (projectsRes.data || [])) {
        // Skip duplicate 'Sin Proyecto / Otros' rows created in DB by old bugs
        if (r.title === 'Sin Proyecto / Otros' || r.title === 'Otros') {
          continue;
        }

        const pIdStr = String(r.id);
        const projectTasks = allTasks.filter((t) => t.projectId === pIdStr);
        projectTasks.forEach(t => assignedTaskIds.add(t.id));

        loadedProjects.push({
          id: pIdStr,
          title: r.title || 'Proyecto sin título',
          description: r.description || '',
          status: r.status || 'Planificación',
          priority: r.priority || 'Media',
          progress: typeof r.progress === 'number' ? r.progress : 0,
          startDate: r.start_date || todayISO,
          targetDate: r.end_date || r.target_date || undefined,
          tasks: projectTasks.map(t => ({ 
            id: t.id, 
            title: t.title, 
            completed: t.completed, 
            dueDate: t.dueDate,
            isExec: t.isExec,
            isMyDay: t.isMyDay,
            description: t.description,
            priority: t.priority,
            status: t.status
          })),
          createdAt: r.created_at || new Date().toISOString()
        });
      }

      // Gather any unassigned tasks (e.g., project_id null or proj-other)
      const unassignedTasks = allTasks.filter(t => !assignedTaskIds.has(t.id));

      if (unassignedTasks.length > 0) {
        const otherProject: Project = {
          id: 'proj-other',
          title: 'Sin Proyecto / Otros',
          description: 'Contenedor de tareas independientes y sueltas',
          status: 'En Progreso',
          priority: 'Media',
          startDate: todayISO,
          progress: 0,
          tasks: unassignedTasks.map(t => ({ 
            id: t.id, 
            title: t.title, 
            completed: t.completed, 
            dueDate: t.dueDate,
            isExec: t.isExec,
            isMyDay: t.isMyDay,
            description: t.description,
            priority: t.priority,
            status: t.status
          })),
          createdAt: new Date().toISOString()
        };
        loadedProjects.push(otherProject);
      }

      setProjects(loadedProjects);
      
      if (ideasRes.data) {
         setIdeas(ideasRes.data.map((r: any) => ({
            id: String(r.id), 
            title: r.title, 
            notes: r.notes || undefined,
            category: r.category, 
            createdAt: r.created_at || new Date().toISOString()
         })));
      }
      
      if (dailyLogsData) {
         setLogs(dailyLogsData);
      }
      
      setLoading(false);
    } catch(err) { console.error(err); setLoading(false); }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadAllUserData(session.user.id);
          setToastNotification("Sincronización de datos completada con Supabase.");
        } else {
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error during manual refresh:", err);
      setToastNotification("Error al sincronizar datos.");
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 600);
    }
  }, [isSyncing, loadAllUserData]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadAllUserData(session.user.id);
          }
        } catch (err) {
          console.error("Error on visibility revalidation:", err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllUserData]);

  // Supabase Realtime Subscription for tasks & projects
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel(`tasks-projects-realtime-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('Cambio en tiempo real en tabla tasks:', payload);
            loadAllUserData(user.id);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('Cambio en tiempo real en tabla projects:', payload);
            loadAllUserData(user.id);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadAllUserData, isAuthenticated]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
        setLoading(false);
        return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setIsAuthenticated(true);
            const userAlias = session.user.user_metadata?.alias || session.user.email?.split('@')[0].toUpperCase() || 'OPERADOR';
            const cleanHudName = userAlias.toUpperCase().startsWith('HUD')
              ? userAlias.toUpperCase()
              : `HUD ${userAlias.toUpperCase()}`;
            setUserSession({
              email: session.user.email || '',
              alias: userAlias,
              hudName: cleanHudName,
              updatedAt: new Date().toISOString()
            });
            loadAllUserData(session.user.id);
        } else {
            setLoading(false);
        }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (session?.user) {
          setIsAuthenticated(true);
          
          const userAlias = session.user.user_metadata?.alias || session.user.email?.split('@')[0].toUpperCase() || 'OPERADOR';
          const cleanHudName = userAlias.toUpperCase().startsWith('HUD')
            ? userAlias.toUpperCase()
            : `HUD ${userAlias.toUpperCase()}`;
            
          setUserSession({
            email: session.user.email || '',
            alias: userAlias,
            hudName: cleanHudName,
            updatedAt: new Date().toISOString()
          });

          await loadAllUserData(session.user.id);
       } else if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          setHabits([]);
          setProjects([]);
          setIdeas([]);
          setReviews([]);
          setLogs({});
          setUserSession(null as any);
          setLoading(false);
       }
    });
    return () => { subscription.unsubscribe(); };
  }, [loadAllUserData]);


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
         <header className="bg-[#101827]/90 p-4 md:p-5 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md relative z-30 font-mono flex flex-row items-center justify-between gap-4">
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
           <div className="flex items-center gap-2.5 relative z-50 pointer-events-auto">
             <button
               type="button"
               onClick={handleManualRefresh}
               disabled={isSyncing}
               className="flex items-center justify-center p-2.5 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.1)]"
               title="Sincronizar Datos con la Nube"
             >
               <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
             </button>
           </div>
         </header>

         {activeTab === 'tracker' && <DailyTracker habits={habits} logs={logs} projects={projects} onSaveProject={handleSaveProject} onToggleHabit={handleToggleHabit} onSaveHabit={handleSaveHabit} onDeleteHabit={handleDeleteHabit} onCloseDay={handleCloseDay} onSaveDailyWins={handleSaveDailyWins} onSaveSportsEntry={handleSaveSportsEntry} onDeleteSportsEntry={handleDeleteSportsEntry} onMoveHabit={handleMoveHabit} calculateStreak={calculateStreak} />}
         {activeTab === 'exec' && <ExecCenter projects={projects} onSaveProject={handleSaveProject} onUpdateProjects={setProjects} />}
         {activeTab === 'projects' && <ProjectsManager projects={projects} onSaveProject={handleSaveProject} onDeleteProject={handleDeleteProject} />}
         {activeTab === 'analytics' && <AnalyticsTrends habits={habits} logs={logs} calculateStreak={calculateStreak} />}
         {activeTab === 'review' && <ReviewInsights habits={habits} logs={logs} reviews={reviews} onSaveReview={handleSaveReview} />}
         {activeTab === 'focus' && <FocusTimer onFocusSessionComplete={handleFocusSessionComplete} todaySessions={logs[getTodayISO()]?.focusSessions || []} />}
         {activeTab === 'ideas' && <IdeasRadar ideas={ideas} onSaveIdea={handleSaveIdea} onUpdateIdea={handleUpdateIdea} onDeleteIdea={handleDeleteIdea} onConvertToProject={handleConvertIdeaToProject} />}
      </main>

      <ThemeSelectorModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} currentThemeId={currentThemeId} onSelectTheme={handleSelectTheme} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} userSession={userSession} onUpdateUserSession={handleUpdateUserSession} onInitializeOperator={handleInitializeOperator} onAuthSuccess={loadAllUserData} onPlayWelcomeVoice={handlePlayWelcomeVoice} onSignOut={handleSignOut} isClosable={true} />
      <ResetPasswordModal isOpen={isResetPasswordModalOpen} onClose={() => setIsResetPasswordModalOpen(false)} onSuccess={() => {}} />

      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#101827] border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] font-mono text-xs tracking-wide pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse"></span>
            {toastNotification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
