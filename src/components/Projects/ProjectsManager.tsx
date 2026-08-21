import React, { useState, useMemo } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PauseCircle, 
  TrendingUp, 
  Calendar, 
  Target, 
  ListTodo, 
  Edit3, 
  Trash2, 
  X, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Project, ProjectPriority, ProjectStatus, ProjectTask } from '../../types';
import { updateCloudTask, syncProjectTasksToCloud } from '../../lib/supabaseTasks';
import { supabase } from '../../lib/supabase';

interface ProjectsManagerProps {
  projects: Project[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  projects,
  onSaveProject,
  onDeleteProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ProjectStatus>('Todos');
  const [priorityFilter, setPriorityFilter] = useState<'Todas' | ProjectPriority>('Todas');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Tecnología');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('En Progreso');
  const [formPriority, setFormPriority] = useState<ProjectPriority>('Alta');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [formKpis, setFormKpis] = useState('');
  const [formTasks, setFormTasks] = useState<ProjectTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = (projects || []).length;
    const inProgress = (projects || []).filter(p => p.status === 'En Progreso').length;
    const completed = (projects || []).filter(p => p.status === 'Completado').length;
    const avgProgress = total > 0 
      ? Math.round((projects || []).reduce((acc, p) => acc + p.progress, 0) / total) 
      : 0;

    return { total, inProgress, completed, avgProgress };
  }, [projects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return (projects || []).filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
      const matchesPriority = priorityFilter === 'Todas' || p.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchQuery, statusFilter, priorityFilter]);

  // Open Modal
  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Tecnología');
    setFormStatus('En Progreso');
    setFormPriority('Alta');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormTargetDate('');
    setFormProgress(0);
    setFormKpis('');
    setFormTasks([]);
    setNewTaskInput('');
    setNewTaskDueDate('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDescription(project.description);
    setFormCategory(project.category || 'Tecnología');
    setFormStatus(project.status);
    setFormPriority(project.priority);
    setFormStartDate(project.startDate);
    setFormTargetDate(project.targetDate || '');
    setFormProgress(project.progress);
    setFormKpis(project.kpis || '');
    setFormTasks(project.tasks ? [...project.tasks] : []);
    setNewTaskInput('');
    setNewTaskDueDate('');
    setIsModalOpen(true);
  };

  const handleAddTaskToForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setFormTasks(prev => [
      ...prev, 
      { 
        id: 'pt-' + Date.now(), 
        title: newTaskInput.trim(), 
        completed: false,
        dueDate: newTaskDueDate || undefined
      }
    ]);
    setNewTaskInput('');
    setNewTaskDueDate('');
  };

  const handleRemoveTaskFromForm = (taskId: string) => {
    setFormTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log("Delegando guardado de proyecto a componente principal...");

      const updatedProject: Project = {
        id: editingProject ? editingProject.id : 'proj-' + Date.now(),
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        startDate: formStartDate,
        targetDate: formTargetDate || undefined,
        progress: formProgress,
        kpis: formKpis.trim() || undefined,
        tasks: formTasks,
        createdAt: editingProject ? editingProject.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSaveProject(updatedProject);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error inesperado al guardar proyecto:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Task Toggle on Project Card
  const handleToggleTask = async (project: Project, taskId: string) => {
    const targetTask = project.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const newCompleted = !targetTask.completed;
    const updatedTasks = project.tasks.map(t => 
      t.id === taskId ? { ...t, completed: newCompleted } : t
    );

    // Auto calculate progress percentage based on completed tasks if tasks exist
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const newProgress = updatedTasks.length > 0 
      ? Math.min(100, Math.round((completedCount / updatedTasks.length) * 100)) 
      : project.progress;

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      progress: newProgress,
      status: newProgress === 100 ? 'Completado' : (project.status === 'Completado' ? 'En Progreso' : project.status)
    };

    onSaveProject(updatedProject);
    await updateCloudTask(taskId, { completed: newCompleted });
  };

  // Quick Progress Adjuster
  const handleProgressChange = (project: Project, newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    const updatedProject: Project = {
      ...project,
      progress: clampedProgress,
      status: clampedProgress === 100 ? 'Completado' : (project.status === 'Completado' && clampedProgress < 100 ? 'En Progreso' : project.status)
    };
    onSaveProject(updatedProject);
  };

  // Helper styling badges
  const formatDueDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
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

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'En Progreso':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
            <Clock className="w-3 h-3" />
            <span>En Progreso</span>
          </span>
        );
      case 'Completado':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completado</span>
          </span>
        );
      case 'Planificación':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 text-[10px] font-mono font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            <span>Planificación</span>
          </span>
        );
      case 'En Pausa':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1.5">
            <PauseCircle className="w-3 h-3" />
            <span>En Pausa</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: ProjectPriority) => {
    switch (priority) {
      case 'Alta':
        return <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">Prioridad Alta</span>;
      case 'Media':
        return <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">Prioridad Media</span>;
      case 'Baja':
        return <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">Prioridad Baja</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101827] p-6 rounded-2xl border border-[#00F0FF]/30 shadow-[0_0_25px_rgba(0,240,255,0.08)] relative overflow-hidden">
        {/* Corner Accents */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00F0FF]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00F0FF]" />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider font-mono">
              Gestión de Proyectos
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Control táctico de iniciativas, hitos de ejecución y seguimiento de avances.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#101827]/80 p-4 rounded-xl border border-slate-800 font-mono space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Total Proyectos</span>
          <div className="text-2xl font-black text-slate-100">{stats.total}</div>
        </div>
        <div className="bg-[#101827]/80 p-4 rounded-xl border border-[#00F0FF]/30 font-mono space-y-1">
          <span className="text-[10px] text-[#00F0FF] uppercase tracking-wider font-bold block">En Progreso</span>
          <div className="text-2xl font-black text-[#00F0FF]">{stats.inProgress}</div>
        </div>
        <div className="bg-[#101827]/80 p-4 rounded-xl border border-[#10B981]/30 font-mono space-y-1">
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider font-bold block">Completados</span>
          <div className="text-2xl font-black text-[#10B981]">{stats.completed}</div>
        </div>
        <div className="bg-[#101827]/80 p-4 rounded-xl border border-[#F59E0B]/30 font-mono space-y-1">
          <span className="text-[10px] text-[#F59E0B] uppercase tracking-wider font-bold block">Avance Promedio</span>
          <div className="text-2xl font-black text-[#F59E0B]">{stats.avgProgress}%</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-[#101827]/60 p-4 rounded-2xl border border-slate-800 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4 font-mono">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proyecto por nombre, categoría o descripción..."
            className="w-full pl-9 pr-4 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] placeholder:text-slate-600"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          
          {/* Status Pills */}
          {(['Todos', 'En Progreso', 'Planificación', 'En Pausa', 'Completado'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                  : 'bg-[#0A0D14] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-[#0A0D14] text-slate-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-[#00F0FF] shrink-0"
          >
            <option value="Todas">Todas Prioridades</option>
            <option value="Alta">Alta Prioridad</option>
            <option value="Media">Media Prioridad</option>
            <option value="Baja">Baja Prioridad</option>
          </select>
        </div>
      </div>

      {/* Projects Cards List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-[#101827]/90 rounded-2xl border border-slate-800 hover:border-[#00F0FF]/40 transition-all p-5 font-mono space-y-4 relative group shadow-lg flex flex-col justify-between"
            >
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(project.status)}
                    {getPriorityBadge(project.priority)}
                    {project.category && (
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded">
                        {project.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(project)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors"
                      title="Editar proyecto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.")) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* KPIs section if specified */}
              {project.kpis && (
                <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#F59E0B]/20 text-xs text-slate-300 flex items-start gap-2">
                  <Target className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-[#F59E0B] uppercase block">KPI / Meta Clave:</span>
                    <span className="text-[11px] leading-snug">{project.kpis}</span>
                  </div>
                </div>
              )}

              {/* Progress Bar & Quick Slider */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00F0FF]" /> Avance del Proyecto
                  </span>
                  <span className="text-[#00F0FF] font-black">{project.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0A0D14] border border-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#00F0FF] to-[#10B981] transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <input
                  key={project.progress}
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={project.progress}
                  onMouseUp={(e) => handleProgressChange(project, parseInt((e.target as HTMLInputElement).value, 10))}
                  onTouchEnd={(e) => handleProgressChange(project, parseInt((e.target as HTMLInputElement).value, 10))}
                  className="w-full accent-[#00F0FF] cursor-pointer h-1.5 opacity-40 hover:opacity-100 transition-opacity"
                  title="Ajustar avance rápido"
                />
              </div>

              {/* Checklist Tasks */}
              {project.tasks && project.tasks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3.5 h-3.5 text-slate-400" /> Tareas ({project.tasks.filter(t => t.completed).length}/{project.tasks.length})
                    </span>
                  </div>
                  <ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {project.tasks.map((task) => {
                      const todayISO = new Date().toISOString().split('T')[0];
                      const isOverdue = !task.completed && task.dueDate && task.dueDate < todayISO;
                      const isDueToday = !task.completed && task.dueDate && task.dueDate === todayISO;

                      return (
                        <li
                          key={task.id}
                          onClick={() => handleToggleTask(project, task.id)}
                          className={`flex items-center justify-between gap-3 p-2 rounded-lg text-xs cursor-pointer transition-all ${
                            task.completed 
                              ? 'bg-[#0A0D14]/60 text-slate-500 border border-transparent' 
                              : isOverdue
                              ? 'bg-rose-950/20 text-slate-200 border border-rose-500/40 hover:border-rose-400'
                              : 'bg-[#0A0D14] text-slate-200 border border-slate-800 hover:border-[#00F0FF]/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              task.completed 
                                ? 'bg-[#10B981] border-[#10B981] text-[#0A0D14]' 
                                : isOverdue
                                ? 'border-rose-500 text-rose-400'
                                : 'border-slate-600 hover:border-[#00F0FF]'
                            }`}>
                              {task.completed && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className={`truncate ${task.completed ? 'line-through text-slate-500' : ''}`}>
                              {task.title}
                            </span>
                          </div>

                          {task.dueDate && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 border transition-opacity ${
                              task.completed
                                ? 'bg-slate-800/40 text-slate-500 border-slate-800/60 line-through opacity-50'
                                : isOverdue
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : isDueToday
                                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50 animate-pulse'
                                : 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30'
                            }`}>
                              <Calendar className="w-2.5 h-2.5 shrink-0 text-[#00F0FF]" />
                              <span>📅 {isDueToday ? 'HOY' : formatDueDateLabel(task.dueDate)}</span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Footer Dates */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Inicio: {project.startDate}
                </span>
                {project.targetDate && (
                  <span className="flex items-center gap-1 text-[#00F0FF]/80">
                    Target: {project.targetDate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-[#101827]/60 border border-dashed border-slate-800 rounded-2xl font-mono text-slate-500 space-y-3">
          <FolderKanban className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-xs">No se encontraron proyectos con los filtros aplicados.</p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Proyecto</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono overflow-y-auto">
          <div className="bg-[#101827] border border-[#00F0FF]/40 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-[0_0_30px_rgba(0,240,255,0.15)] my-8 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Título del Proyecto *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Rediseño Plataforma Web, Campaña Q3..."
                  className="w-full px-3.5 py-2.5 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Descripción / Objetivo
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Alcance del proyecto, entregables clave..."
                  className="w-full px-3.5 py-2.5 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Status & Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="En Progreso">En Progreso</option>
                    <option value="Planificación">Planificación</option>
                    <option value="En Pausa">En Pausa</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ProjectPriority)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Tecnología, Deporte..."
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              {/* Dates & Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Fecha Objetivo
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Avance % ({formProgress}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00F0FF] mt-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* KPIs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Métrica Clave / KPI
                </label>
                <input
                  type="text"
                  value={formKpis}
                  onChange={(e) => setFormKpis(e.target.value)}
                  placeholder="Ej: Alcanzar 1,000 ventas, Recorrer 300km..."
                  className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Tasks Sublist */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Tareas / Subhitos del Proyecto
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Escribe el nombre de la tarea..."
                    className="flex-1 px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        title="Fecha Límite (Deadline)"
                        className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTaskToForm}
                      className="px-3.5 py-2 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold hover:bg-[#00F0FF]/30 transition-colors shrink-0 cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {formTasks.length > 0 && (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {formTasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="truncate">{task.title}</span>
                          {task.dueDate && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[#00F0FF] text-[10px] font-mono border border-[#00F0FF]/30 shrink-0 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> Límite: {task.dueDate}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskFromForm(task.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
