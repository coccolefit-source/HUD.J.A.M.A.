import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Filter, 
  Search, 
  Layers, 
  CheckSquare, 
  ShieldAlert, 
  FolderKanban,
  Trash2,
  Edit2,
  Sparkles,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { Project, ProjectTask, ProjectPriority } from '../../types';
import { getTodayISO, formatDateToISO } from '../../utils/dateUtils';
import { createCloudTask, updateCloudTask, deleteCloudTask } from '../../lib/supabaseTasks';
import { supabase } from '../../lib/supabase';

interface ExecCenterProps {
  projects: Project[];
  onSaveProject: (project: Project) => void;
  onUpdateProjects: (projects: Project[]) => void;
}

type FilterStatus = 'pending' | 'upcoming' | 'overdue' | 'completed' | 'all';

export const ExecCenter: React.FC<ExecCenterProps> = ({
  projects,
  onSaveProject,
  onUpdateProjects
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Add Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [targetProjectId, setTargetProjectId] = useState<string>('none');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);
  const [taskFeedback, setTaskFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Today ISO string
  const todayISO = useMemo(() => getTodayISO(), []);

  // Format date helper for badges (e.g. 2026-08-10 -> "10-Ago" or "HOY")
  const formatDueDateLabel = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    if (dateStr === todayISO) return 'HOY';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${months[monthIdx]}`;
      }
    }
    return dateStr;
  };

  // Flatten all tasks with reference to their parent project
  const allFlattenedTasks = useMemo(() => {
    const list: { task: ProjectTask; project: Project }[] = [];
    (projects || []).forEach(project => {
      if (project.tasks && project.tasks.length > 0) {
        project.tasks.forEach(task => {
          list.push({ task, project });
        });
      }
    });
    return list;
  }, [projects]);

  // KPIs
  const kpis = useMemo(() => {
    const total = allFlattenedTasks.length;
    const completed = allFlattenedTasks.filter(item => item.task.completed).length;
    const pending = total - completed;

    const overdue = allFlattenedTasks.filter(
      item => !item.task.completed && item.task.dueDate && item.task.dueDate < todayISO
    ).length;

    const dueToday = allFlattenedTasks.filter(
      item => !item.task.completed && item.task.dueDate && item.task.dueDate === todayISO
    ).length;

    const rate = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    return { total, completed, pending, overdue, dueToday, rate };
  }, [allFlattenedTasks, todayISO]);

  // Filter & Sort tasks
  const filteredTasks = useMemo(() => {
    return allFlattenedTasks.filter(({ task, project }) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesProject = project.title.toLowerCase().includes(query);
        if (!matchesTitle && !matchesProject) return false;
      }

      // Project filter
      if (selectedProjectId !== 'all') {
        const isNeutral = project.id === 'proj-other' || project.title === 'Sin Proyecto / Otros' || project.title === 'Otros';
        if (selectedProjectId === 'none') {
          if (!isNeutral) return false;
        } else if (project.id !== selectedProjectId) {
          return false;
        }
      }

      // Priority filter
      if (selectedPriority !== 'all' && project.priority !== selectedPriority) {
        return false;
      }

      // Status filter
      if (filterStatus === 'pending') {
        return !task.completed;
      }
      if (filterStatus === 'completed') {
        return task.completed;
      }
      if (filterStatus === 'overdue') {
        return !task.completed && task.dueDate && task.dueDate < todayISO;
      }
      if (filterStatus === 'upcoming') {
        if (task.completed) return false;
        // Check if due in the future or today
        return task.dueDate && task.dueDate >= todayISO;
      }

      return true; // 'all'
    }).sort((a, b) => {
      // Sort incomplete first, then by due date ascending
      if (a.task.completed !== b.task.completed) {
        return a.task.completed ? 1 : -1;
      }
      if (a.task.dueDate && b.task.dueDate) {
        return a.task.dueDate.localeCompare(b.task.dueDate);
      }
      if (a.task.dueDate) return -1;
      if (b.task.dueDate) return 1;
      return 0;
    });
  }, [allFlattenedTasks, filterStatus, selectedProjectId, selectedPriority, searchQuery, todayISO]);

  // Handle toggle task completed state
  const handleToggleTask = async (projectId: string, taskId: string) => {
    const project = (projects || []).find(p => p.id === projectId);
    if (!project) return;

    const targetTask = project.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const newCompleted = !targetTask.completed;
    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, completed: newCompleted } : t
    );

    // Calculate new progress percentage for project
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
    await updateCloudTask(taskId, { completed: newCompleted });
  };

  // Handle update task due date directly
  const handleUpdateTaskDueDate = async (projectId: string, taskId: string, newDueDate: string) => {
    const project = (projects || []).find(p => p.id === projectId);
    if (!project) return;

    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, dueDate: newDueDate || undefined } : t
    );

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    };

    onSaveProject(updatedProject);
    await updateCloudTask(taskId, { dueDate: newDueDate });
  };

  // Handle delete task
  const handleDeleteTask = async (projectId: string, taskId: string) => {
    const project = (projects || []).find(p => p.id === projectId);
    if (!project) return;

    const updatedTasks = project.tasks.filter(t => t.id !== taskId);
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const newProgress = updatedTasks.length > 0 
      ? Math.min(100, Math.round((completedCount / updatedTasks.length) * 100))
      : 0;

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      progress: newProgress,
      updatedAt: new Date().toISOString()
    };

    onSaveProject(updatedProject);
    await deleteCloudTask(taskId);
  };

  // Handle Quick Add Task
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = newTaskTitle.trim();
    if (!newTitle || isSubmittingTask) return;

    try {
      setIsSubmittingTask(true);
      setTaskFeedback(null);
      console.log("Procesando guardado de tarea...");

      const { data: { user } } = await supabase.auth.getUser();
      let createdRow: any = null;

      let targetProj: Project | undefined;
      if (targetProjectId === 'none' || !targetProjectId) {
        targetProj = (projects || []).find(p => p.id === 'proj-other' || p.title === 'Sin Proyecto / Otros' || p.title === 'Otros');
        if (!targetProj) {
          targetProj = {
            id: 'proj-other',
            title: 'Sin Proyecto / Otros',
            description: 'Contenedor de tareas independientes y sueltas',
            status: 'En Progreso',
            priority: 'Media',
            startDate: todayISO,
            progress: 0,
            tasks: [],
            createdAt: new Date().toISOString()
          };
        }
      } else {
        targetProj = (projects || []).find(p => p.id === targetProjectId);
        if (!targetProj) {
          targetProj = (projects || []).find(p => p.id === 'proj-other' || p.title === 'Sin Proyecto / Otros') || {
            id: 'proj-other',
            title: 'Sin Proyecto / Otros',
            description: 'Contenedor de tareas independientes y sueltas',
            status: 'En Progreso',
            priority: 'Media',
            startDate: todayISO,
            progress: 0,
            tasks: [],
            createdAt: new Date().toISOString()
          };
        }
      }

      if (user) {
        const res = await createCloudTask({
          title: newTitle,
          completed: false,
          dueDate: newTaskDueDate || undefined,
          projectId: targetProj.id
        });

        if (res.error) {
          console.error("Error al guardar en Supabase:", res.error);
          alert("Error de Supabase: " + res.error.message);
        } else {
          console.log("¡Guardado exitoso en la nube! Datos:", res.data);
          // Opcional: mostrar notificación o simplemente dejar que `fetchInitialData` lo refresque
          createdRow = res.data;
        }
      } else {
        console.log("Modo Explorador: Guardando tarea de forma local...");
      }

      const newTask: ProjectTask = {
        id: createdRow ? String(createdRow.id) : ('pt-' + Date.now().toString()),
        title: newTitle,
        completed: false,
        dueDate: newTaskDueDate || undefined
      };

      const updatedTasks = [...(targetProj.tasks || []), newTask];
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const newProgress = Math.min(100, Math.round((completedCount / updatedTasks.length) * 100));

      const updatedProject: Project = {
        ...targetProj,
        tasks: updatedTasks,
        progress: newProgress,
        updatedAt: new Date().toISOString()
      };

      onSaveProject(updatedProject);

      setTaskFeedback({
        type: 'success',
        message: '¡Tarea guardada y sincronizada correctamente!'
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');

      setTimeout(() => {
        setTaskFeedback(null);
      }, 4000);
    } catch (err) {
      console.error("Error inesperado al guardar tarea:", err);
      alert("Ocurrió un error inesperado al guardar la tarea.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section / Header Tag Banner */}
      <div className="bg-[#101827] p-5 rounded-2xl border border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.08)] relative overflow-hidden font-mono">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 text-xs font-bold tracking-wider">
                [ MODULE // EXEC_COMMAND_CENTER ]
              </span>
              <span className="text-[10px] text-slate-400">SYNC_LIVE_PROJECTS</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 font-sans tracking-wide">
              Gestor Central de Tareas Pendientes
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Consola central de control, deadlines tácticos y ejecuciones sincronizadas en tiempo real con Proyectos Importantes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[#0A0D14] border border-[#00F0FF]/30 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Sincronizado: <strong className="text-[#00F0FF]">{(projects || []).length} Proyectos</strong></span>
            </div>
          </div>
        </div>

        {/* KPI Dashboard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-[#0A0D14]/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">PENDIENTES</span>
              <span className="text-xl font-bold text-[#00F0FF] font-mono">{kpis.pending}</span>
            </div>
            <CheckSquare className="w-5 h-5 text-[#00F0FF]/50" />
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D14]/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">VENCEN HOY</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{kpis.dueToday}</span>
            </div>
            <Clock className="w-5 h-5 text-amber-400/50" />
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D14]/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">VENCIDAS</span>
              <span className="text-xl font-bold text-rose-400 font-mono">{kpis.overdue}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-rose-400/50" />
          </div>

          <div className="p-3 rounded-xl bg-[#0A0D14]/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">EJECUCIÓN GLOBAL</span>
              <span className="text-xl font-bold text-[#10B981] font-mono">{kpis.rate}%</span>
            </div>
            <Sparkles className="w-5 h-5 text-[#10B981]/50" />
          </div>
        </div>
      </div>

      {/* Quick Add Task Form */}
      <div className="bg-[#101827] p-4 rounded-2xl border border-slate-800 shadow-md">
        <span className="text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider block mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#00F0FF]" /> Agregar Nueva Tarea a un Proyecto
        </span>

        <form onSubmit={handleQuickAddTask} className="flex flex-col lg:flex-row gap-2.5">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Escribe la descripción de la tarea a ejecutar..."
            className="flex-1 px-3.5 py-2.5 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] transition-colors"
          />

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Project Selector */}
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="px-3 py-2.5 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#00F0FF] font-mono shrink-0 min-w-[170px]"
            >
              <option value="none">📁 Sin Proyecto (Otros)</option>
              {projects
                .filter(p => p.id !== 'proj-other' && p.title !== 'Sin Proyecto / Otros')
                .map(p => (
                  <option key={p.id} value={p.id}>📁 {p.title}</option>
                ))}
            </select>

            {/* Date Picker Input */}
            <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#00F0FF]" />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                title="Fecha Límite (Deadline)"
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTask}
              className="px-4 py-2.5 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold font-mono hover:bg-[#00F0FF]/30 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.15)] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {isSubmittingTask ? 'Guardando en la Nube...' : 'Ejecutar Tarea'}
            </button>
          </div>
        </form>

        {taskFeedback && (
          <div className={`mt-3 p-2.5 rounded-xl text-xs font-mono font-bold border flex items-center gap-2 ${
            taskFeedback.type === 'success' 
              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            <span>{taskFeedback.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{taskFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Control Toolbar: Filters & Search */}
      <div className="bg-[#101827] p-4 rounded-2xl border border-slate-800 flex flex-col xl:flex-row gap-3 justify-between items-stretch xl:items-center">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap w-auto shrink-0 transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Pendientes ({kpis.pending})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap w-auto shrink-0 transition-all cursor-pointer ${
              filterStatus === 'upcoming'
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Próximas a Vencer
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('overdue')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap w-auto shrink-0 transition-all cursor-pointer ${
              filterStatus === 'overdue'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Vencidas ({kpis.overdue})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap w-auto shrink-0 transition-all cursor-pointer ${
              filterStatus === 'completed'
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Completadas ({kpis.completed})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap w-auto shrink-0 transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                : 'bg-[#0A0D14] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Todas ({kpis.total})
          </button>
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Project Origin Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#00F0FF] font-mono shrink-0"
          >
            <option value="all">📁 Todos los Proyectos</option>
            <option value="none">📁 Sin Proyecto / Otros</option>
            {projects
              .filter(p => p.id !== 'proj-other' && p.title !== 'Sin Proyecto / Otros')
              .map(p => (
                <option key={p.id} value={p.id}>📁 {p.title}</option>
              ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#00F0FF] font-mono shrink-0"
          >
            <option value="all">⚡ Todas las Prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tareas..."
              className="w-full pl-8 pr-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF]"
            />
          </div>
        </div>
      </div>

      {/* Main Tasks List */}
      <div className="bg-[#101827] p-4 md:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/80">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <CheckSquare className="w-4 h-4 text-[#00F0FF]" /> 
            LISTADO DE EJECUCIÓN ({filteredTasks.length} Tareas)
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Alineación flexbox space-between con fecha límite individual editable
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
            <FolderKanban className="w-10 h-10 mx-auto text-slate-700" />
            <p>No se encontraron tareas con los filtros seleccionados.</p>
            <p className="text-[11px] text-slate-600">
              Prueba cambiando el filtro a "Todas" o agrega una nueva tarea arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map(({ task, project }) => {
              const isOverdue = !task.completed && task.dueDate && task.dueDate < todayISO;
              const isDueToday = !task.completed && task.dueDate && task.dueDate === todayISO;

              return (
                <div
                  key={`${project.id}-${task.id}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 gap-3 group hover:shadow-[0_0_15px_rgba(0,240,255,0.08)] ${
                    task.completed
                      ? 'bg-[#0A0D14]/70 border-slate-800/60 text-slate-500'
                      : isOverdue
                      ? 'bg-rose-950/20 border-rose-500/40 text-slate-200 hover:border-rose-400'
                      : isDueToday
                      ? 'bg-[#00F0FF]/5 border-[#00F0FF]/40 text-slate-100'
                      : 'bg-[#0A0D14] border-slate-800 hover:border-[#00F0FF]/40 text-slate-200'
                  }`}
                >
                  {/* LEFT: Checkbox + Task Title + Project Badge */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* CHECKBOX WITH HUD VICTORY GLOW */}
                    <button
                      type="button"
                      onClick={() => handleToggleTask(project.id, task.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-[#10B981] border-[#10B981] text-[#0A0D14] shadow-[0_0_10px_#10B981]'
                          : isOverdue
                          ? 'border-rose-500 hover:bg-rose-500/20 text-rose-400'
                          : 'border-slate-600 hover:border-[#00F0FF] hover:bg-[#00F0FF]/10'
                      }`}
                      title={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                    >
                      {task.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* TASK DETAILS */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => handleToggleTask(project.id, task.id)}
                          className={`text-sm font-medium cursor-pointer transition-all ${
                            task.completed
                              ? 'line-through text-slate-500 decoration-slate-600'
                              : 'text-slate-100 hover:text-[#00F0FF]'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Origin Project Badge */}
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px] font-mono border border-slate-700/70 shrink-0 flex items-center gap-1">
                          <FolderKanban className="w-2.5 h-2.5 text-[#00F0FF]" />
                          <span className="truncate max-w-[140px]">
                            {project.id === 'proj-other' || project.title === 'Sin Proyecto / Otros' || project.title === 'Otros' || !project.title
                              ? '[ OTROS ]'
                              : project.title}
                          </span>
                        </span>

                        {/* Priority Badge */}
                        {project.priority && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            project.priority === 'Alta'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : project.priority === 'Media'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {project.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT ALIGNED: INDIVIDUAL DEADLINE & ACTION BUTTONS */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* INDIVIDUAL DEADLINE EDITABLE INPUT BADGE */}
                    <div className="relative group/date flex items-center">
                      <input
                        type="date"
                        value={task.dueDate || ''}
                        onChange={(e) => handleUpdateTaskDueDate(project.id, task.id, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        title="Haz clic para cambiar la fecha límite"
                      />
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 flex items-center gap-1.5 border transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-slate-800/40 text-slate-500 border-slate-800/60 line-through opacity-50'
                          : isOverdue
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                          : isDueToday
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50 animate-pulse'
                          : 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30 hover:bg-[#00F0FF]/20'
                      }`}>
                        <Calendar className="w-3 h-3 shrink-0 text-[#00F0FF]" />
                        <span>📅 {formatDueDateLabel(task.dueDate)}</span>
                      </span>
                    </div>

                    {/* DELETE TASK BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(project.id, task.id)}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar tarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
