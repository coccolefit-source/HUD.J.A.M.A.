import { supabase, isSupabaseConfigured } from './supabase';
import { ProjectTask, Project } from '../types';
import { getGuestTasks, saveGuestTasks } from '../utils/storage';

export interface TaskCloudPayload {
  title: string;
  description?: string;
  completed?: boolean;
  category?: string;
  dueDate?: string;
  projectId?: string;
  id?: string;
  priority?: string;
  status?: string;
  isExec?: boolean;
  isMyDay?: boolean;
}

/**
 * 1. Obtener tareas desde Supabase
 */
export async function fetchCloudTasks(userId?: string): Promise<{ task: ProjectTask; projectId?: string }[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      console.error('Error al cargar tareas desde Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const validTasks = data.filter((row: any) => row.type !== 'habit' && row.type !== 'Habit' && typeof row.frequency === 'undefined');
    const todayISO = new Date().toISOString().split('T')[0];

    return validTasks.map(row => {
      const isMyDayCalculated = row.is_my_day !== undefined && row.is_my_day !== null 
        ? Boolean(row.is_my_day) 
        : (row.due_date === todayISO || row.date === todayISO);
      const isExecCalculated = row.is_exec !== undefined && row.is_exec !== null
        ? Boolean(row.is_exec)
        : true;
      const isCompleted = row.is_completed !== undefined && row.is_completed !== null
        ? Boolean(row.is_completed)
        : Boolean(row.completed || row.status === 'completed');

      return {
        task: {
          id: String(row.id),
          title: row.title || 'Tarea sin título',
          description: row.description || '',
          completed: isCompleted,
          dueDate: row.due_date || row.date || undefined,
          priority: row.priority || 'medium',
          status: row.status || (isCompleted ? 'completed' : 'pending'),
          isExec: isExecCalculated,
          isMyDay: isMyDayCalculated
        },
        projectId: row.project_id || undefined
      };
    });
  } catch (err) {
    console.error('Error al consultar tareas de Supabase:', err);
    return [];
  }
}

function extractMissingColumn(error: any): string | null {
  const msg = String(error?.message || error?.details || '');
  if (!msg) return null;
  const postgrestMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (postgrestMatch && postgrestMatch[1]) return postgrestMatch[1];
  const pgMatch = msg.match(/column "([^"]+)"/i);
  if (pgMatch && pgMatch[1]) return pgMatch[1];
  return null;
}

/**
 * 2. Guardar tarea en Supabase
 */
export async function createCloudTask(task: TaskCloudPayload): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn("ATENCIÓN: No hay sesión detectada en Supabase.");
      return { success: false, error: "Usuario no autenticado en Supabase" };
    }

    const isTempProjId =
      !task.projectId ||
      task.projectId === 'none' ||
      task.projectId === 'proj-other' ||
      String(task.projectId).startsWith('guest_') ||
      String(task.projectId).startsWith('proj-temp-');
    const validProjectId = isTempProjId ? null : task.projectId;
    const todayISO = new Date().toISOString().split('T')[0];
    const isToday = task.dueDate === todayISO;

    const attemptPayload: Record<string, any> = {
      user_id: user.id,
      title: task.title ? task.title.trim() : 'Nueva Tarea',
      type: 'task',
      description: task.description || '',
      completed: Boolean(task.completed),
      is_completed: Boolean(task.completed),
      priority: task.priority || 'medium',
      status: task.completed ? 'completed' : (task.status || 'pending'),
      due_date: task.dueDate || todayISO,
      project_id: validProjectId,
      is_exec: task.isExec !== undefined ? Boolean(task.isExec) : true,
      is_my_day: task.isMyDay !== undefined ? Boolean(task.isMyDay) : Boolean(isToday)
    };

    console.log("PAYLOAD A INSERTAR EN SUPABASE (tasks):", attemptPayload);
    let data: any[] | null = null;
    let error: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase.from('tasks').insert([attemptPayload]).select();
      data = res.data;
      error = res.error;
      if (!error) break;

      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in attemptPayload) {
        console.warn(`Columna '${missingCol}' no existe en tabla tasks, reintentando sin ella...`);
        delete attemptPayload[missingCol];
        continue;
      }
      break;
    }

    if (error) {
      console.error("ERROR AL INSERTAR TAREA EN SUPABASE (RLS/Tabla/Columna):", error);
      return { success: false, error: error.message || error };
    }

    console.log("TAREA GUARDADA EXITOSAMENTE EN SUPABASE:", data);
    if (data && data[0]) {
      return { success: true, data: data[0] };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error imprevisto guardando tarea en Supabase:", err);
    return { success: false, error: err };
  }
}

/**
 * 3. Actualizar estado de tarea en Supabase
 */
export async function updateCloudTask(
  taskId: string,
  updates: { 
    completed?: boolean; 
    title?: string; 
    dueDate?: string; 
    priority?: string; 
    status?: string; 
    projectId?: string;
    isExec?: boolean;
    isMyDay?: boolean;
    description?: string;
  }
): Promise<{ success: boolean; error?: any }> {
  if (
    !isSupabaseConfigured ||
    String(taskId).startsWith('guest_') ||
    String(taskId).startsWith('pt-') ||
    String(taskId).startsWith('temp-')
  ) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de tarea."); return { success: false, error: "Usuario no autenticado" }; }

    const attemptPayload: Record<string, any> = {};

    if (updates.completed !== undefined) {
      attemptPayload.completed = updates.completed;
      attemptPayload.is_completed = updates.completed;
      attemptPayload.status = updates.completed ? 'completed' : 'pending';
    }
    if (updates.title !== undefined) {
      attemptPayload.title = updates.title;
    }
    if (updates.description !== undefined) {
      attemptPayload.description = updates.description;
    }
    if (updates.dueDate !== undefined) {
      attemptPayload.due_date = updates.dueDate || null;
      const todayISO = new Date().toISOString().split('T')[0];
      if (updates.dueDate === todayISO) {
        attemptPayload.is_my_day = true;
      }
    }
    if (updates.priority !== undefined) {
      attemptPayload.priority = updates.priority;
    }
    if (updates.status !== undefined) {
      attemptPayload.status = updates.status;
    }
    if (updates.projectId !== undefined) {
      attemptPayload.project_id =
        (!updates.projectId || updates.projectId === 'none' || updates.projectId === 'proj-other')
          ? null
          : updates.projectId;
    }
    if (updates.isExec !== undefined) {
      attemptPayload.is_exec = updates.isExec;
    }
    if (updates.isMyDay !== undefined) {
      attemptPayload.is_my_day = updates.isMyDay;
    }

    let data: any[] | null = null;
    let error: any = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      if (Object.keys(attemptPayload).length === 0) return { success: true };
      const res = await supabase
        .from('tasks')
        .update(attemptPayload)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select('id');
      data = res.data;
      error = res.error;
      if (!error) break;

      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in attemptPayload) {
        console.warn(`Columna '${missingCol}' no existe en tabla tasks al actualizar, reintentando sin ella...`);
        delete attemptPayload[missingCol];
        continue;
      }
      break;
    }

    if (error) {
      console.error('Error al actualizar tarea en Supabase:', error);
      return { success: false, error };
    }

    if (!data || data.length === 0) {
      const { data: stillExists } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .maybeSingle();

      if (stillExists) {
        console.error('Supabase rechazó la actualización de la tarea (posible bloqueo RLS UPDATE):', taskId);
        return {
          success: false,
          error: 'Supabase rechazó actualizar la tarea (revisa la política RLS de UPDATE en la tabla tasks).'
        };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al actualizar tarea en Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * 4. Eliminar tarea en Supabase
 */
export async function deleteCloudTask(taskId: string, projectId?: string): Promise<{ success: boolean; data?: any; error?: any }> {
  if (
    !isSupabaseConfigured ||
    String(taskId).startsWith('guest_') ||
    String(taskId).startsWith('pt-') ||
    String(taskId).startsWith('temp-')
  ) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No hay usuario autenticado. Cancelando eliminación de tarea.");
      return { success: false, error: "Usuario no autenticado" };
    }

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      console.error('Error al eliminar tarea de Supabase:', error);
      return { success: false, error: error.message || error };
    }

    // Si Supabase no devolvió filas eliminadas, validar si la fila sigue existiendo (ej. bloqueo por política RLS de DELETE)
    if (!data || data.length === 0) {
      const { data: stillExists } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .maybeSingle();

      if (stillExists) {
        console.error('La tarea sigue existiendo en Supabase tras DELETE (posible bloqueo RLS):', taskId);
        return {
          success: false,
          error: 'Supabase rechazó la eliminación (revisa la política RLS de DELETE en la tabla tasks).'
        };
      }
    }

    if (projectId && projectId !== 'proj-other' && !String(projectId).startsWith('proj-temp-') && !String(projectId).startsWith('proj-')) {
      try {
        const { data: projData } = await supabase
          .from('projects')
          .select('tasks')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single();

        if (projData && Array.isArray(projData.tasks)) {
          const updatedJsonbTasks = projData.tasks.filter((t: any) => String(t.id) !== String(taskId));
          await supabase
            .from('projects')
            .update({ tasks: updatedJsonbTasks })
            .eq('id', projectId)
            .eq('user_id', user.id);
        }
      } catch (jsonErr) {
        console.warn("Advertencia al limpiar JSONB de proyecto:", jsonErr);
      }
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Error al eliminar tarea de Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Sincroniza proyectos/tareas hacia Supabase sin duplicar tareas existentes
 * y opcionalmente elimina tareas removidas del proyecto en Supabase.
 */
export async function syncProjectTasksToCloud(
  project: Project,
  options?: { syncDeletions?: boolean; errorsOut?: string[] }
): Promise<Project> {
  if (!isSupabaseConfigured || String(project.id).startsWith('guest_')) return project;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return project;

    const isVirtualProject = project.id === 'proj-other' || String(project.id).startsWith('proj-temp-') || String(project.id).startsWith('proj-');
    const targetDbProjectId = isVirtualProject ? null : project.id;

    // 1. Consultar IDs de tareas actuales en Supabase para este proyecto (o project_id IS NULL para proj-other)
    let dbTaskIdsInCloud = new Set<string>();
    if (options?.syncDeletions && targetDbProjectId) {
      const { data: dbExistingTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', targetDbProjectId);
      dbTaskIdsInCloud = new Set((dbExistingTasks || []).map((row: any) => String(row.id)));
    }

    const currentTaskIdsInClient = new Set<string>();
    const updatedTasksList: ProjectTask[] = [];

    if (project.tasks && project.tasks.length > 0) {
      for (const t of project.tasks) {
        if (String(t.id).startsWith('guest_')) continue;

        const isTempId =
          !t.id ||
          String(t.id).startsWith('pt-') ||
          String(t.id).startsWith('temp-') ||
          String(t.id).startsWith('proj-');

        if (isTempId) {
          // Nueva tarea agregada en cliente: insertar en Supabase
          const res = await createCloudTask({
            title: t.title,
            description: t.description,
            completed: Boolean(t.completed),
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
            isExec: t.isExec !== undefined ? t.isExec : true,
            isMyDay: t.isMyDay,
            projectId: targetDbProjectId || undefined
          });

          if (res.success && res.data && res.data.id) {
            const realTaskId = String(res.data.id);
            currentTaskIdsInClient.add(realTaskId);
            updatedTasksList.push({
              ...t,
              id: realTaskId
            });
          } else {
            const errMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Error al insertar subtarea');
            console.error('Error al insertar subtarea en syncProjectTasksToCloud:', res.error);
            options?.errorsOut?.push(`${t.title}: ${errMsg}`);
            updatedTasksList.push(t);
          }
        } else {
          // Tarea ya existente con ID real: actualizar en Supabase
          currentTaskIdsInClient.add(String(t.id));
          await updateCloudTask(String(t.id), {
            title: t.title,
            description: t.description,
            completed: Boolean(t.completed),
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
            isExec: t.isExec,
            isMyDay: t.isMyDay,
            projectId: targetDbProjectId || undefined
          });
          updatedTasksList.push(t);
        }
      }
    }

    // 2. Si se solicitó sincronizar eliminaciones (ej. al guardar el modal de edición), borrar de Supabase las tareas quitadas
    if (options?.syncDeletions && targetDbProjectId && dbTaskIdsInCloud.size > 0) {
      const removedIds = Array.from(dbTaskIdsInCloud).filter(id => !currentTaskIdsInClient.has(id));
      for (const removedId of removedIds) {
        const { error: delErr } = await supabase
          .from('tasks')
          .delete()
          .eq('id', removedId)
          .eq('user_id', user.id);
        if (delErr) {
          console.warn('Error al eliminar subtarea removida del proyecto:', delErr);
        }
      }
    }

    // 3. Sincronizar columna tasks (jsonb) en la tabla projects de Supabase para reflejar los cambios
    if (targetDbProjectId) {
      await supabase
        .from('projects')
        .update({ tasks: updatedTasksList })
        .eq('id', targetDbProjectId)
        .eq('user_id', user.id);
    }

    return {
      ...project,
      tasks: updatedTasksList
    };
  } catch (e) {
    console.error('Error al sincronizar proyecto con Supabase:', e);
    return project;
  }
}
