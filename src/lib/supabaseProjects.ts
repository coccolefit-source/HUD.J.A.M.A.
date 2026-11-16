import { supabase, isSupabaseConfigured } from './supabase';
import { Project, ProjectPhase } from '../types';
import { ensureProjectPhases, calculateProjectProgress } from '../utils/projectTemplates';

const PHASES_BACKUP_PREFIX = 'prime_project_phases_';

export function saveLocalProjectPhasesBackup(projectId: string, phases: ProjectPhase[]) {
  try {
    if (projectId) {
      localStorage.setItem(`${PHASES_BACKUP_PREFIX}${projectId}`, JSON.stringify(phases));
    }
  } catch (e) {
    // ignore storage quota errors
  }
}

export function getLocalProjectPhasesBackup(projectId: string): ProjectPhase[] | null {
  try {
    const raw = localStorage.getItem(`${PHASES_BACKUP_PREFIX}${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return ensureProjectPhases(parsed);
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

export interface ProjectCloudPayload {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  progress?: number;
  category?: string;
  tasks?: any[];
  phases?: ProjectPhase[];
}

function extractMissingProjectColumn(error: any): string | null {
  const msg = String(error?.message || error?.details || '');
  if (!msg) return null;
  const postgrestMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (postgrestMatch && postgrestMatch[1]) return postgrestMatch[1];
  const pgMatch = msg.match(/column "([^"]+)"/i);
  if (pgMatch && pgMatch[1]) return pgMatch[1];
  return null;
}

export async function createCloudProject(project: ProjectCloudPayload): Promise<{ success: boolean; data?: any; error?: any; phasesMissingInCloud?: boolean }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }

  try {
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
    if (userAuthError || !user) {
      console.error("Error al insertar proyecto: Usuario no autenticado", userAuthError);
      return { success: false, error: userAuthError || 'Usuario no autenticado' };
    }

    const resolvedPhases = ensureProjectPhases(project.phases);
    const attemptPayload: Record<string, any> = {
      title: project.title,
      description: project.description || '',
      status: project.status || 'Planificación',
      priority: project.priority || 'Media',
      progress: project.progress || 0,
      tasks: project.tasks || [],
      phases: resolvedPhases,
      user_id: user.id
    };

    let data: any[] | null = null;
    let error: any = null;
    let phasesMissingInCloud = false;

    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase.from('projects').insert([attemptPayload]).select();
      data = res.data;
      error = res.error;
      if (!error) break;

      const missingCol = extractMissingProjectColumn(error);
      if (missingCol && missingCol in attemptPayload) {
        if (missingCol === 'phases') phasesMissingInCloud = true;
        console.warn(`Columna '${missingCol}' no existe en tabla projects al insertar, reintentando sin ella...`);
        delete attemptPayload[missingCol];
        continue;
      }
      break;
    }

    if (error) {
      console.error("ERROR EN INSERT [projects]:", error);
      return { success: false, error };
    }

    if (data && data[0]?.id) {
      saveLocalProjectPhasesBackup(String(data[0].id), resolvedPhases);
    }

    return { success: true, data: data ? data[0] : null, phasesMissingInCloud };
  } catch (err: any) {
    console.error("Error al insertar proyecto:", err);
    return { success: false, error: err };
  }
}

export async function updateCloudProject(
  projectId: string,
  updates: Partial<ProjectCloudPayload>
): Promise<{ success: boolean; data?: any; error?: any; phasesMissingInCloud?: boolean }> {
  if (!isSupabaseConfigured || String(projectId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de proyecto."); return { success: false, error: "Usuario no autenticado" }; }

    const attemptPayload: Record<string, any> = {};
    if (updates.title !== undefined) attemptPayload.title = updates.title;
    if (updates.description !== undefined) attemptPayload.description = updates.description;
    if (updates.status !== undefined) attemptPayload.status = updates.status;
    if (updates.priority !== undefined) attemptPayload.priority = updates.priority;
    if (updates.progress !== undefined) attemptPayload.progress = updates.progress;
    if (updates.tasks !== undefined) attemptPayload.tasks = updates.tasks;
    if (updates.phases !== undefined) {
      attemptPayload.phases = updates.phases;
      saveLocalProjectPhasesBackup(String(projectId), updates.phases);
    }

    let data: any[] | null = null;
    let error: any = null;
    let phasesMissingInCloud = false;

    for (let attempt = 0; attempt < 8; attempt++) {
      if (Object.keys(attemptPayload).length === 0) {
        return { success: true, phasesMissingInCloud };
      }

      const res = await supabase
        .from('projects')
        .update(attemptPayload)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select('id');

      data = res.data;
      error = res.error;
      if (!error) break;

      const missingCol = extractMissingProjectColumn(error);
      if (missingCol && missingCol in attemptPayload) {
        if (missingCol === 'phases') phasesMissingInCloud = true;
        console.warn(`Columna '${missingCol}' no existe en tabla projects al actualizar, reintentando sin ella...`);
        delete attemptPayload[missingCol];
        continue;
      }
      break;
    }

    if (error) {
      console.error('Error al actualizar proyecto en Supabase:', error);
      return { success: false, error, phasesMissingInCloud };
    }

    if (!data || data.length === 0) {
      const { data: existingRow } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();

      if (existingRow) {
        console.error('Supabase bloqueó la actualización del proyecto (posible política RLS de UPDATE):', projectId);
        return {
          success: false,
          error: 'Supabase rechazó la actualización del proyecto (revisa la política RLS de UPDATE en la tabla projects).'
        };
      }
    }

    return { success: true, data: data ? data[0] : null, phasesMissingInCloud };
  } catch (err: any) {
    console.error('Error al actualizar proyecto en Supabase:', err);
    return { success: false, error: err };
  }
}

export async function fetchCloudProjects(userId?: string): Promise<Project[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return [];

    let query = supabase.from('projects').select('*, tasks(*)');
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }
    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener proyectos desde Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(row => {
      const pId = String(row.id);
      const cloudPhases = Array.isArray(row.phases) && row.phases.length > 0 ? row.phases : null;
      const resolvedPhases = cloudPhases
        ? ensureProjectPhases(cloudPhases)
        : (getLocalProjectPhasesBackup(pId) || ensureProjectPhases());

      const mappedTasks = (row.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title || 'Tarea sin título',
        completed: Boolean(t.is_completed !== undefined ? t.is_completed : (t.completed || t.status === 'completed')),
        dueDate: t.due_date || t.date || undefined,
        isExec: t.is_exec !== undefined ? Boolean(t.is_exec) : true,
        isMyDay: Boolean(t.is_my_day),
        description: t.description || '',
        priority: t.priority || 'medium',
        status: t.status || (t.completed ? 'completed' : 'pending')
      }));

      return {
        id: pId,
        title: row.title || 'Proyecto sin título',
        description: row.description || '',
        category: row.category || 'General',
        status: row.status || 'Planificación',
        priority: row.priority || 'Media',
        startDate: row.start_date || new Date().toISOString().split('T')[0],
        targetDate: row.end_date || row.target_date || undefined,
        progress: calculateProjectProgress(mappedTasks, resolvedPhases),
        tasks: mappedTasks,
        phases: resolvedPhases,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString()
      };
    });
  } catch (err) {
    console.error('Error al obtener proyectos desde Supabase:', err);
    return [];
  }
}

export async function deleteCloudProject(projectId: string): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured || String(projectId).startsWith('guest_')) return { success: true };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      console.warn("No hay usuario autenticado al eliminar proyecto."); 
      return { success: true }; 
    }

    if (projectId === 'proj-other') {
      try {
        await supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id)
          .is('project_id', null);
      } catch (e) {
        console.warn('Advertencia al eliminar tareas con project_id null:', e);
      }

      try {
        await supabase
          .from('tasks')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', 'proj-other');
      } catch (e) {
        console.warn('Advertencia al eliminar tareas de proj-other:', e);
      }

      try {
        await supabase
          .from('projects')
          .delete()
          .eq('user_id', user.id)
          .or(`id.eq.proj-other,title.eq.Sin Proyecto / Otros,title.eq.Otros`);
      } catch (e) {
        console.warn('Advertencia al eliminar registro de proyecto proj-other:', e);
      }

      return { success: true };
    }

    // 1. Explicitly delete tasks associated with project in Supabase
    const { error: tasksDelErr } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (tasksDelErr) {
      console.warn('Advertencia al eliminar sub-tareas de proyecto:', tasksDelErr);
    }

    // 2. Explicitly delete project in Supabase
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('Advertencia al eliminar proyecto de Supabase:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Error al eliminar proyecto:', err);
    return { success: false, error: err };
  }
}
