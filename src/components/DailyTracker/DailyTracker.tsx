import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Lock, 
  Unlock, 
  Sparkles,
  RotateCcw,
  Trophy,
  Trash2,
  Bike,
  Footprints,
  Goal,
  CheckCircle2
} from 'lucide-react';

import { Habit, DailyLog, CategoryType, SportType, SportsEntry, Project, ProjectTask } from '../../types';
import { updateCloudTask } from '../../lib/supabaseTasks';
import { supabase } from '../../lib/supabase';
import { getGuestTasks, saveGuestTasks } from '../../utils/storage';
import { HabitCard } from './HabitCard';
import { AddEditHabitModal } from './AddEditHabitModal';
import { DayClosureModal } from './DayClosureModal';
import { MotivationalCard } from '../MotivationalCard';
import { formatDateToISO, formatFriendlyDate, formatFullDate, getTodayISO, parseISODate } from '../../utils/dateUtils';

interface DailyTrackerProps {
  habits: Habit[];
  logs: Record<string, DailyLog>;
  projects?: Project[];
  onSaveProject?: (project: Project) => void;
  onToggleHabit: (dateStr: string, habitId: string) => void;
  onSaveHabit: (habitData: Partial<Habit>) => void;
  onDeleteHabit: (habitId: string) => void;
  onCloseDay: (dateStr: string) => void;
  onSaveDailyWins?: (dateStr: string, wins: string[]) => void;
  onSaveSportsEntry?: (dateStr: string, entry: SportsEntry) => void;
  onDeleteSportsEntry?: (dateStr: string, entryId: string) => void;
  calculateStreak: (habitId: string, uptoDate: string) => number;
}

const CATEGORIES: ('Todos' | CategoryType)[] = ['Todos', 'Salud', 'Productividad', 'Mente', 'Finanzas', 'Relaciones', 'Personal'];

export const DailyTracker: React.FC<DailyTrackerProps> = ({
  habits,
  logs,
  projects = [],
  onSaveProject,
  onToggleHabit,
  onSaveHabit,
  onDeleteHabit,
  onCloseDay,
  onSaveDailyWins,
  onSaveSportsEntry,
  onDeleteSportsEntry,
  calculateStreak
}) => {
  const todayStr = getTodayISO();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | CategoryType>('Todos');

  // Filter tasks from projects that are scheduled for the selected date
  const execTodayTasks = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    const list: { task: ProjectTask; project: Project }[] = [];
    projects.forEach(project => {
      if (project.tasks && project.tasks.length > 0) {
        project.tasks.forEach(task => {
          if (task.dueDate === selectedDate) {
            list.push({ task, project });
          }
        });
      }
    });
    return list;
  }, [projects, selectedDate]);

  // Handle toggling project task from tracker
  const handleToggleExecTask = async (projectId: string, taskId: string) => {
    if (!projects || !onSaveProject) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const targetTask = project.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const newCompleted = !targetTask.completed;
    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, completed: newCompleted } : t
    );

    const completedCount = updatedTasks.filter(t => t.completed).length;
    const newProgress = updatedTasks.length > 0 
      ? Math.min(100, Math.round((completedCount / updatedTasks.length) * 100))
      : project.progress;

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      progress: newProgress,
      updatedAt: new Date().toISOString()
    };

    onSaveProject(updatedProject);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !String(taskId).startsWith('guest_')) {
        await updateCloudTask(taskId, { completed: newCompleted });
      } else {
        const savedGuestTasks = getGuestTasks();
        const updatedGuestTasks = savedGuestTasks.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t);
        saveGuestTasks(updatedGuestTasks);
      }
    } catch (e) {
      const savedGuestTasks = getGuestTasks();
      const updatedGuestTasks = savedGuestTasks.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t);
      saveGuestTasks(updatedGuestTasks);
    }
  };

  // Daily wins input state
  const [newWinText, setNewWinText] = useState('');

  // Sports input state
  const [selectedSport, setSelectedSport] = useState<SportType>('Ciclismo');
  const [sportKm, setSportKm] = useState<string>('');
  const [sportDuration, setSportDuration] = useState<string>('');
  const [sportNotes, setSportNotes] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [lastCelebratedKey, setLastCelebratedKey] = useState<string>('');

  // Active date log
  const activeLog = logs[selectedDate] || {
    date: selectedDate,
    completedHabitIds: [],
    isClosed: false
  };

  const handleAddWin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinText.trim()) return;
    const currentWins = activeLog.dailyWins || [];
    const updatedWins = [...currentWins, newWinText.trim()];
    onSaveDailyWins?.(selectedDate, updatedWins);
    setNewWinText('');
  };

  const handleDeleteWin = (indexToDelete: number) => {
    const currentWins = activeLog.dailyWins || [];
    const updatedWins = currentWins.filter((_, idx) => idx !== indexToDelete);
    onSaveDailyWins?.(selectedDate, updatedWins);
  };

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    const kmVal = parseFloat(sportKm);
    if (isNaN(kmVal) || kmVal <= 0) return;

    const newEntry: SportsEntry = {
      id: 'sp-' + Date.now(),
      sportType: selectedSport,
      km: kmVal,
      durationMinutes: sportDuration ? parseInt(sportDuration, 10) : undefined,
      notes: sportNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onSaveSportsEntry?.(selectedDate, newEntry);
    setSportKm('');
    setSportDuration('');
    setSportNotes('');
  };

  const handleDeleteSportEntry = (entryId: string) => {
    onDeleteSportsEntry?.(selectedDate, entryId);
  };

  const completedIds = activeLog.completedHabitIds || [];
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // Sports totals calculation
  const totalKmToday = (activeLog?.sportsEntries || []).reduce((sum, e) => sum + (e.km || 0), 0) || 0;
  const totalMinToday = (activeLog?.sportsEntries || []).reduce((sum, e) => sum + (e.durationMinutes || 0), 0) || 0;

  // Stats calculation (Habits + Exec Today Tasks)
  const todayDayKey = parseISODate(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const scheduledHabitsToday = activeHabits.filter(h => 
    !h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(todayDayKey)
  );

  const execTodayCompletedCount = execTodayTasks.filter(item => item.task.completed).length;
  const validCompletedHabitsCount = scheduledHabitsToday.filter(h => completedIds.includes(h.id) || Boolean(h.completed)).length;
  const totalCount = scheduledHabitsToday.length + execTodayTasks.length;
  const completedCount = Math.min(totalCount, validCompletedHabitsCount + execTodayCompletedCount);
  const completionRate = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;

  // Trigger Mission Accomplished Celebration when reaching 100%
  useEffect(() => {
    if (completionRate === 100 && totalCount > 0) {
      const celebrationKey = `${selectedDate}-${completedCount}-${totalCount}`;
      if (lastCelebratedKey !== celebrationKey) {
        setLastCelebratedKey(celebrationKey);
        setShowMissionModal(true);

        try {
          confetti({
            particleCount: 100,
            spread: 75,
            origin: { y: 0.55 },
            colors: ['#00F0FF', '#FFB800', '#00FFCC']
          });

          setTimeout(() => {
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#00F0FF', '#FFB800', '#00FFCC']
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#00F0FF', '#FFB800', '#00FFCC']
            });
          }, 300);
        } catch (err) {
          console.error("Error firing confetti:", err);
        }
      }
    }
  }, [completionRate, totalCount, selectedDate, completedCount, lastCelebratedKey]);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    const dayKey = parseISODate(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    
    return activeHabits.filter(h => {
      const matchesCategory = selectedCategory === 'Todos' || h.category === selectedCategory;
      const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const isDayMatch = !h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(dayKey);
      
      return matchesCategory && matchesSearch && isDayMatch;
    });
  }, [activeHabits, selectedCategory, searchQuery, selectedDate]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = parseISODate(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateToISO(d));
  };

  const handleNextDay = () => {
    const d = parseISODate(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateToISO(d));
  };

  const handleGoToToday = () => {
    setSelectedDate(todayStr);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsAddModalOpen(true);
  };

  const openAdd = () => {
    setEditingHabit(null);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Date Navigation & Actions Header - Simple & Clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101827] p-3.5 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#00F0FF]/10 text-[#00F0FF]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 capitalize">
                {formatFriendlyDate(selectedDate)}
              </h1>
              {activeLog.isClosed && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> CERRADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">{formatFullDate(selectedDate)}</p>
          </div>
        </div>

        {/* Simple Date Selector Navigation Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-lg bg-[#0A0D14] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Día Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {selectedDate !== todayStr && (
            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1.5 rounded-lg bg-[#0A0D14] hover:bg-slate-800 text-[#00F0FF] border border-slate-800 text-xs font-mono font-medium transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Hoy
            </button>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-[#0A0D14] text-slate-200 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF] cursor-pointer"
          />

          <button
            onClick={handleNextDay}
            disabled={selectedDate >= todayStr}
            className="p-2 rounded-lg bg-[#0A0D14] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0A0D14] text-slate-300 border border-slate-800 transition-colors"
            title="Siguiente Día"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra Simple de Progreso y Acciones */}
      <div className="bg-[#101827] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Progreso Diario</span>
              <span className="text-xs font-mono text-[#00F0FF] font-bold">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-[#00F0FF]">{completionRate}%</span>
              <span className="text-xs text-slate-500 font-mono">
                {completionRate === 100 ? '¡Todas las metas cumplidas!' : 'Avanzando en el día'}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-xs h-3 bg-[#0A0D14] rounded-full overflow-hidden p-0.5 border border-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#06B6D4]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={openAdd}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Hábito
          </button>
          <button
            onClick={() => setIsClosureModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {activeLog.isClosed ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-[#00F0FF]" />}
            {activeLog.isClosed ? 'Día Cerrado' : 'Cerrar Día'}
          </button>
        </div>
      </div>

      {/* Embedded Motivational Card Trigger if completion is < 40% */}
      {completionRate < 40 && totalCount > 0 && (
        <MotivationalCard
          currentRate={completionRate}
          title="ADVERTENCIA TÁCTICA (<40%): REPROGRAMACIÓN MENTAL"
        />
      )}

      {/* Filtros y Búsqueda Simple */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#101827] p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#00F0FF] text-[#0A0D14] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar hábito..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0A0D14] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Habit List Grid */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {(filteredHabits || []).length > 0 ? (
            (filteredHabits || []).map((habit) => {
              const isCompleted = completedIds.includes(habit.id) || Boolean(habit.completed);
              const streak = typeof habit.streak === 'number' ? habit.streak : calculateStreak(habit.id, selectedDate);

              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isCompleted={isCompleted}
                  streakCount={streak}
                  onToggle={(hId) => onToggleHabit(selectedDate, hId)}
                  onEdit={openEdit}
                  onDelete={onDeleteHabit}
                />
              );
            })
          ) : (
            <div className="p-8 text-center bg-[#101827] border border-slate-800 rounded-xl">
              <p className="text-slate-400 text-xs">No hay hábitos en esta categoría.</p>
              <button
                onClick={openAdd}
                className="mt-3 px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0A0D14] text-xs font-bold hover:bg-[#00F0FF]/90 transition-all cursor-pointer"
              >
                + Crear hábito
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Tareas del día */}
      <div className="bg-[#101827] p-4 rounded-xl border border-slate-800 space-y-3 mt-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-200">Tareas para hoy</span>
          <span className="text-xs text-slate-500">
            {(execTodayTasks || []).filter(t => t.task.completed).length} de {(execTodayTasks || []).length} completadas
          </span>
        </div>

        {(execTodayTasks || []).length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-xs bg-[#0A0D14]/50 rounded-lg border border-dashed border-slate-800">
            No tienes tareas programadas para este día.
          </div>
        ) : (
          <div className="space-y-2">
            {(execTodayTasks || []).map(({ task, project }) => (
              <div
                key={`${project.id}-${task.id}`}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all gap-2 ${
                  task.completed
                    ? 'bg-[#0A0D14]/40 border-slate-800/50 text-slate-500'
                    : 'bg-[#0A0D14] border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleExecTask(project.id, task.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-[#00F0FF] border-[#00F0FF] text-[#0A0D14]'
                        : 'border-slate-700 hover:border-[#00F0FF] bg-slate-900 text-[#00F0FF]'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <div className="flex flex-col truncate flex-1">
                    <span
                      onClick={() => handleToggleExecTask(project.id, task.id)}
                      className={`text-xs font-medium truncate cursor-pointer ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-200 hover:text-[#00F0FF]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      Proyecto: {project.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Victorias del Día */}
      <div className="bg-[#101827] p-4 rounded-xl border border-slate-800 space-y-3 mt-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-bold text-slate-200">Victorias del Día</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-bold">
            {(activeLog?.dailyWins || []).length} registradas
          </span>
        </div>

        <form onSubmit={handleAddWin} className="flex gap-2">
          <input
            type="text"
            value={newWinText}
            onChange={(e) => setNewWinText(e.target.value)}
            placeholder="Escribe aquí un logro importante de hoy..."
            className="flex-1 px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#F59E0B] placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!newWinText.trim()}
            className="px-3.5 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#F59E0B]/90 disabled:opacity-40 text-[#0A0D14] font-bold text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar</span>
          </button>
        </form>

        {(activeLog?.dailyWins || []).length > 0 ? (
          <ul className="space-y-1.5 pt-1">
            {(activeLog?.dailyWins || []).map((win, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0D14] border border-slate-800/80 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span className="truncate">{win}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteWin(idx)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Eliminar victoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-3 text-center bg-[#0A0D14]/50 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
            No has registrado victorias para este día.
          </div>
        )}
      </div>

      {/* Registro de Deporte y Kilometraje */}
      <div className="bg-[#101827] p-4 rounded-xl border border-slate-800 space-y-3 mt-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-[#00F0FF]" />
            <span className="text-xs font-bold text-slate-200">Deporte y Kilometraje</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] font-bold">
            {totalMinToday > 0 
              ? `${totalKmToday.toFixed(1)} km • ${totalMinToday} min hoy`
              : `${totalKmToday.toFixed(1)} km hoy`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['Ciclismo', 'Running', 'Fútbol'] as SportType[]).map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => setSelectedSport(sport)}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSport === sport
                  ? 'bg-[#00F0FF] text-[#0A0D14] font-bold'
                  : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sport === 'Ciclismo' && <Bike className="w-3.5 h-3.5" />}
              {sport === 'Running' && <Footprints className="w-3.5 h-3.5" />}
              {sport === 'Fútbol' && <Goal className="w-3.5 h-3.5" />}
              <span>{sport}</span>
            </button>
          ))}

          <select
            value={['Ciclismo', 'Running', 'Fútbol'].includes(selectedSport) ? '' : selectedSport}
            onChange={(e) => e.target.value && setSelectedSport(e.target.value as SportType)}
            className="bg-[#0A0D14] text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="" disabled>Otro deporte...</option>
            <option value="Natación">Natación</option>
            <option value="Gimnasio">Gimnasio</option>
            <option value="Caminata">Caminata / Senderismo</option>
            <option value="Padel / Tenis">Padel / Tenis</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <form onSubmit={handleAddSport} className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 shrink-0">
            {/* Input de Kilometraje */}
            <div className="relative w-28 sm:w-32 shrink-0">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={sportKm}
                onChange={(e) => setSportKm(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-1.5 bg-[#0A0D14] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] pr-8"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">KM</span>
            </div>

            {/* Input de Duración en Minutos */}
            <div className="relative w-28 sm:w-28 shrink-0">
              <input
                type="number"
                step="1"
                min="1"
                value={sportDuration}
                onChange={(e) => setSportDuration(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 bg-[#0A0D14] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] pr-9"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-bold">MIN</span>
            </div>
          </div>

          <input
            type="text"
            value={sportNotes}
            onChange={(e) => setSportNotes(e.target.value)}
            placeholder="Notas o detalles del entrenamiento..."
            className="flex-1 min-w-0 px-3 py-1.5 bg-[#0A0D14] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] placeholder:text-slate-600"
          />

          <button
            type="submit"
            disabled={!sportKm || parseFloat(sportKm) <= 0}
            className="px-3.5 py-1.5 rounded-lg bg-[#00F0FF] hover:bg-[#00F0FF]/90 disabled:opacity-40 text-[#0A0D14] font-bold text-xs transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar</span>
          </button>
        </form>

        {(activeLog?.sportsEntries || []).length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {(activeLog?.sportsEntries || []).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0D14] border border-slate-800/80 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-bold text-[#00F0FF] shrink-0">
                    {entry.sportType} ({entry.km} km{entry.durationMinutes ? ` • ${entry.durationMinutes} min` : ''})
                  </span>
                  {entry.notes && <span className="text-slate-400 truncate">— {entry.notes}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSportEntry(entry.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                  title="Eliminar sesión"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center bg-[#0A0D14]/50 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
            Sin sesiones deportivas registradas hoy.
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEditHabitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onSaveHabit}
        editingHabit={editingHabit}
        onDelete={onDeleteHabit}
      />

      <DayClosureModal
        isOpen={isClosureModalOpen}
        onClose={() => setIsClosureModalOpen(false)}
        completedCount={completedCount}
        totalCount={totalCount}
        completionRate={completionRate}
        dateStr={selectedDate}
        formattedDate={formatFriendlyDate(selectedDate)}
        onConfirmCloseDay={() => onCloseDay(selectedDate)}
        isAlreadyClosed={activeLog.isClosed}
      />

      {/* Modal Misión Cumplida (100% Progreso) */}
      <AnimatePresence>
        {showMissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-[#101827] border-2 border-[#00FFCC]/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,255,204,0.3)] text-center overflow-hidden font-mono"
            >
              {/* Resplandor suave de fondo */}
              <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#00FFCC]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#00F0FF]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Ícono de Trofeo Flotante Libre (Sin recuadro) */}
              <div className="flex justify-center my-4">
                <motion.div
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                  className="relative"
                >
                  <Trophy className="w-20 h-20 text-[#00FFCC] stroke-[1.5] drop-shadow-[0_0_30px_rgba(0,255,204,0.85)] animate-pulse" />
                </motion.div>
              </div>

              {/* Título de Misión */}
              <h2 className="text-xl sm:text-2xl font-black text-[#00FFCC] tracking-widest drop-shadow-[0_0_15px_rgba(0,255,204,0.7)] uppercase mb-2">
                [ MISIÓN CUMPLIDA ]
              </h2>

              <p className="text-xs text-slate-300 font-sans mb-5 leading-relaxed">
                Has alcanzado el <span className="text-[#00FFCC] font-bold font-mono">100%</span> de tus objetivos diarios programados.
              </p>

              {/* Tarjeta con animación de Barra de XP y Nivel */}
              <div className="bg-[#0A0D14] border border-slate-800 rounded-xl p-4 text-left space-y-2 mb-6 shadow-inner">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#00FFCC] font-bold tracking-wider">NIVEL TÁCTICO 05</span>
                  <span className="text-[#FFB800] font-bold">+500 XP</span>
                </div>

                <div className="w-full h-3 bg-slate-900 rounded-full p-0.5 border border-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#00FFCC] via-[#00F0FF] to-[#FFB800] shadow-[0_0_12px_#00FFCC]"
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                  <span>EFECTIVIDAD: 100%</span>
                  <span>ESTADO: ÓPTIMO</span>
                </div>
              </div>

              {/* Botón Continuar Operación */}
              <button
                type="button"
                onClick={() => setShowMissionModal(false)}
                className="w-full py-3 rounded-xl bg-[#00FFCC] hover:bg-[#00FFCC]/90 text-[#0A0D14] font-black text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,255,204,0.4)] hover:shadow-[0_0_30px_rgba(0,255,204,0.6)] cursor-pointer"
              >
                [ CONTINUAR OPERACIÓN ]
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
