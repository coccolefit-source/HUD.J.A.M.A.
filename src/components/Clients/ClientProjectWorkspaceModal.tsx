import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  User,
  Briefcase,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MessageCircle,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Client,
  ClientProjectStep,
  DevelopmentStage,
  ProjectTaskOwner,
} from '../../types';
import {
  ensureClientProjectSteps,
  calculateClientProjectMetrics,
} from '../../utils/clientProjectTemplate';

interface ClientProjectWorkspaceModalProps {
  client: Client;
  onClose: () => void;
  onSaveProjectSteps: (
    client: Client,
    steps: ClientProjectStep[],
    devProgress: number,
    devStage: DevelopmentStage
  ) => Promise<{ success: boolean; error?: string }>;
}

type OwnerFilter = 'all' | 'me' | 'client';

function formatNoteDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

function sanitizePhone(phone: string): string {
  return String(phone || '').replace(/[^\d]/g, '');
}

function buildPendingClientTasksMessage(client: Client, steps: ClientProjectStep[]): string {
  const pendingClientTasks = steps.flatMap((step) =>
    step.tasks
      .filter((t) => t.owner === 'client' && !t.completed)
      .map((t) => `• ${t.title} (${step.title.split('·')[0].trim()})`)
  );
  const businessName = client.company || client.projectName || 'tu negocio';

  if (pendingClientTasks.length === 0) {
    return `¡Hola ${client.name}! Te cuento que ya tenemos todos tus pendientes completados para ${businessName}. Seguimos avanzando con el equipo de e-prime.`;
  }

  return (
    `Hola ${client.name}, ¿cómo vas? Para seguir avanzando rápido con el sistema de ${businessName}, nos queda pendiente de tu parte:\n\n` +
    `${pendingClientTasks.join('\n')}\n\n` +
    `Apenas lo tengas me lo pasas por aquí y seguimos de una.`
  );
}

export const ClientProjectWorkspaceModal: React.FC<ClientProjectWorkspaceModalProps> = ({
  client,
  onClose,
  onSaveProjectSteps,
}) => {
  const [steps, setSteps] = useState<ClientProjectStep[]>(() =>
    ensureClientProjectSteps(client.projectSteps)
  );
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ensureClientProjectSteps(client.projectSteps).forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  // Per-step draft inputs for adding tasks & conversation notes
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [newTaskOwner, setNewTaskOwner] = useState<Record<string, ProjectTaskOwner>>({});
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedPending, setCopiedPending] = useState(false);

  // Sync if parent updates client from Supabase realtime
  useEffect(() => {
    setSteps(ensureClientProjectSteps(client.projectSteps));
  }, [client.id, client.projectSteps]);

  const metrics = useMemo(() => calculateClientProjectMetrics(steps), [steps]);

  const persistSteps = async (nextSteps: ClientProjectStep[]) => {
    const prevSteps = steps;
    setSteps(nextSteps);
    setSaveError(null);
    setIsSaving(true);

    const nextMetrics = calculateClientProjectMetrics(nextSteps);
    const res = await onSaveProjectSteps(
      client,
      nextSteps,
      nextMetrics.progress,
      nextMetrics.currentStage
    );

    setIsSaving(false);
    if (!res.success) {
      setSteps(prevSteps);
      setSaveError(res.error || 'No se pudieron guardar los cambios en Supabase.');
    }
  };

  const handleToggleTask = (stepId: DevelopmentStage, taskId: string) => {
    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        tasks: step.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      };
    });
    persistSteps(nextSteps);
  };

  const handleToggleTaskOwner = (stepId: DevelopmentStage, taskId: string) => {
    const nextSteps: ClientProjectStep[] = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        tasks: step.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const nextOwner: ProjectTaskOwner = task.owner === 'me' ? 'client' : 'me';
          return { ...task, owner: nextOwner };
        }),
      };
    });
    persistSteps(nextSteps);
  };

  const handleAddTask = (stepId: DevelopmentStage, e: React.FormEvent) => {
    e.preventDefault();
    const title = (newTaskText[stepId] || '').trim();
    if (!title) return;
    const owner: ProjectTaskOwner = newTaskOwner[stepId] || 'me';

    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        tasks: [
          ...step.tasks,
          {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title,
            owner,
            completed: false,
          },
        ],
      };
    });

    setNewTaskText((prev) => ({ ...prev, [stepId]: '' }));
    persistSteps(nextSteps);
  };

  const handleDeleteTask = (stepId: DevelopmentStage, taskId: string) => {
    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        tasks: step.tasks.filter((t) => t.id !== taskId),
      };
    });
    persistSteps(nextSteps);
  };

  const handleToggleAllStepTasks = (stepId: DevelopmentStage) => {
    const targetStep = steps.find((s) => s.id === stepId);
    if (!targetStep || targetStep.tasks.length === 0) return;
    const allCompleted = targetStep.tasks.every((t) => t.completed);

    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        tasks: step.tasks.map((t) => ({ ...t, completed: !allCompleted })),
      };
    });
    persistSteps(nextSteps);
  };

  const handleAddNote = (stepId: DevelopmentStage, e: React.FormEvent) => {
    e.preventDefault();
    const text = (newNoteText[stepId] || '').trim();
    if (!text) return;

    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        notes: [
          {
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            createdAt: new Date().toISOString(),
          },
          ...step.notes,
        ],
      };
    });

    setNewNoteText((prev) => ({ ...prev, [stepId]: '' }));
    persistSteps(nextSteps);
  };

  const handleDeleteNote = (stepId: DevelopmentStage, noteId: string) => {
    const nextSteps = steps.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        notes: step.notes.filter((n) => n.id !== noteId),
      };
    });
    persistSteps(nextSteps);
  };

  const pendingClientMessage = useMemo(
    () => buildPendingClientTasksMessage(client, steps),
    [client, steps]
  );

  const pendingWaUrl = useMemo(() => {
    const digits = sanitizePhone(client.phone);
    const encoded = encodeURIComponent(pendingClientMessage);
    return digits
      ? `https://wa.me/${digits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }, [client.phone, pendingClientMessage]);

  const handleCopyPending = async () => {
    try {
      await navigator.clipboard.writeText(pendingClientMessage);
      setCopiedPending(true);
      setTimeout(() => setCopiedPending(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0B111E] border border-[#00F0FF]/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.12)]">
        {/* Top Sticky Header */}
        <div className="p-4 sm:p-5 bg-[#101827] border-b border-slate-800 space-y-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-slate-100 truncate">
                    Proyecto: {client.projectName || client.company || client.name}
                  </h2>
                  {isSaving && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#00F0FF] font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  Cliente: <strong className="text-slate-200">{client.name}</strong>
                  {client.company ? ` · ${client.company}` : ''}
                  {client.phone ? ` · ${client.phone}` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0A0D14] border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer shrink-0"
              title="Cerrar proyecto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Owner Summary */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-300">
                Avance General del Proyecto ({metrics.completed}/{metrics.total} tareas)
              </span>
              <span className="font-black text-[#00F0FF] tabular-nums text-sm">
                {metrics.progress}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#0A0D14] border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00F0FF] to-emerald-400 transition-all duration-300"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
          </div>

          {/* Filter Bar + Send Client Pending Tasks on WhatsApp */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOwnerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  ownerFilter === 'all'
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/50'
                    : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Todas ({metrics.completed}/{metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setOwnerFilter('me')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  ownerFilter === 'me'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                    : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Mis Tareas ({metrics.myCompleted}/{metrics.myTotal})</span>
              </button>
              <button
                type="button"
                onClick={() => setOwnerFilter('client')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  ownerFilter === 'client'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                    : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Del Cliente ({metrics.clientCompleted}/{metrics.clientTotal})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={pendingWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                title="Enviar por WhatsApp solo las tareas pendientes asignadas al cliente"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WA Pendientes Cliente</span>
              </a>
              <button
                type="button"
                onClick={handleCopyPending}
                className="p-1.5 rounded-lg bg-[#0A0D14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Copiar lista de pendientes del cliente"
              >
                {copiedPending ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Scrollable Step-by-Step Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {steps.map((step) => {
            const isExpanded = expandedSteps[step.id] !== false;
            const totalStepTasks = step.tasks.length;
            const completedStepTasks = step.tasks.filter((t) => t.completed).length;
            const isStepDone = totalStepTasks > 0 && completedStepTasks === totalStepTasks;

            const visibleTasks =
              ownerFilter === 'all'
                ? step.tasks
                : step.tasks.filter((t) => t.owner === ownerFilter);

            const draftOwner: ProjectTaskOwner = newTaskOwner[step.id] || 'me';

            return (
              <div
                key={step.id}
                className={`rounded-2xl border transition-colors overflow-hidden ${
                  isStepDone
                    ? 'bg-[#101827]/90 border-emerald-500/40'
                    : 'bg-[#101827]/90 border-slate-800'
                }`}
              >
                {/* Step Header */}
                <div className="px-4 py-3.5 flex items-center justify-between gap-3 bg-[#0E1525]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleAllStepTasks(step.id)}
                      className="shrink-0 cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors"
                      title={
                        isStepDone
                          ? 'Desmarcar todo el paso'
                          : 'Marcar todo el paso como completado'
                      }
                    >
                      {isStepDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSteps((prev) => ({
                          ...prev,
                          [step.id]: !isExpanded,
                        }))
                      }
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm font-bold ${
                            isStepDone ? 'text-emerald-300' : 'text-slate-100'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums ${
                            isStepDone
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                              : 'bg-[#0A0D14] text-[#00F0FF] border-slate-800'
                          }`}
                        >
                          {completedStepTasks}/{totalStepTasks}
                        </span>
                        {step.notes.length > 0 && (
                          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                            <MessageSquareText className="w-3 h-3 text-[#00F0FF]" />
                            {step.notes.length}
                          </span>
                        )}
                      </div>
                      {step.subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5">{step.subtitle}</p>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSteps((prev) => ({
                        ...prev,
                        [step.id]: !isExpanded,
                      }))
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Step Content: Tasks + Add Task + Notes/Conversations */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-800/80">
                    {/* Tasks Checklist */}
                    <div className="space-y-2">
                      {visibleTasks.length > 0 ? (
                        visibleTasks.map((task) => {
                          const isClientTask = task.owner === 'client';
                          return (
                            <div
                              key={task.id}
                              className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl border transition-colors ${
                                task.completed
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-[#0A0D14] border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleTask(step.id, task.id)}
                                className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-500 hover:text-[#00F0FF] shrink-0 mt-0.5" />
                                )}
                                <span
                                  className={`text-xs leading-relaxed ${
                                    task.completed
                                      ? 'line-through text-slate-500'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskOwner(step.id, task.id)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                    isClientTask
                                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35 hover:bg-cyan-500/25'
                                  }`}
                                  title="Clic para cambiar responsable entre Mi tarea y Cliente"
                                >
                                  {isClientTask ? (
                                    <>
                                      <User className="w-2.5 h-2.5" />
                                      <span>Cliente</span>
                                    </>
                                  ) : (
                                    <>
                                      <Briefcase className="w-2.5 h-2.5" />
                                      <span>Mi tarea</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(step.id, task.id)}
                                  className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 italic px-1">
                          No hay tareas en este paso para el filtro seleccionado.
                        </p>
                      )}

                      {/* Inline Add Task Form (with Owner Toggle: Mi tarea vs Cliente) */}
                      <form
                        onSubmit={(e) => handleAddTask(step.id, e)}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={newTaskText[step.id] || ''}
                          onChange={(e) =>
                            setNewTaskText((prev) => ({
                              ...prev,
                              [step.id]: e.target.value,
                            }))
                          }
                          placeholder="Agregar nueva tarea en este paso..."
                          className="flex-1 px-3 py-2 rounded-xl bg-[#0A0D14] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF]"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex rounded-xl bg-[#0A0D14] border border-slate-800 p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setNewTaskOwner((prev) => ({ ...prev, [step.id]: 'me' }))
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                draftOwner === 'me'
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Briefcase className="w-3 h-3" />
                              <span>Mía</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNewTaskOwner((prev) => ({ ...prev, [step.id]: 'client' }))
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                draftOwner === 'client'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <User className="w-3 h-3" />
                              <span>Cliente</span>
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={!(newTaskText[step.id] || '').trim()}
                            className="px-3 py-2 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Step Notes & Conversations Section */}
                    <div className="pt-3 border-t border-slate-800/70 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <MessageSquareText className="w-3.5 h-3.5 text-[#00F0FF]" />
                        <span>Notas y Conversaciones de este paso ({step.notes.length})</span>
                      </div>

                      {step.notes.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {step.notes.map((note) => (
                            <div
                              key={note.id}
                              className="p-3 rounded-xl bg-[#0A0D14] border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-500">
                                  {formatNoteDateTime(note.createdAt)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(step.id, note.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                                  title="Eliminar nota"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {note.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleAddNote(step.id, e)}
                        className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2"
                      >
                        <textarea
                          rows={2}
                          value={newNoteText[step.id] || ''}
                          onChange={(e) =>
                            setNewNoteText((prev) => ({
                              ...prev,
                              [step.id]: e.target.value,
                            }))
                          }
                          placeholder="Pega aquí una conversación de WhatsApp, acuerdos de llamada o notas clave de este paso..."
                          className="flex-1 px-3 py-2 rounded-xl bg-[#0A0D14] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF] resize-y"
                        />
                        <button
                          type="submit"
                          disabled={!(newNoteText[step.id] || '').trim()}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-bold cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Guardar Nota
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
