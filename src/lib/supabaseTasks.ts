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
    let query = supabase.from('tasks').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;

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

      return {
        task: {
          id: String(row.id),
          title: row.title || 'Tarea sin título',
          description: row.description || '',
          completed: Boolean(row.completed || row.status === 'completed'),
          dueDate: row.due_date || row.date || undefined,
          priority: row.priority || 'medium',
          status: row.status || (row.completed ? 'completed' : 'pending'),
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

    const isTempProjId = !task.projectId || String(task.projectId).startsWith('guest_') || String(task.projectId).startsWith('proj-temp-');
    const validProjectId = isTempProjId ? null : task.projectId;
    const todayISO = new Date().toISOString().split('T')[0];
    const isToday = task.dueDate === todayISO;

    const payload: Record<string, any> = {
      user_id: user.id,
      title: task.title ? task.title.trim() : 'Nueva Tarea',
      description: task.description || '',
      completed: Boolean(task.completed),
      priority: task.priority || 'medium',
      status: task.completed ? 'completed' : (task.status || 'pending'),
      due_date: task.dueDate || todayISO,
      project_id: validProjectId,
      is_exec: task.isExec !== undefined ? Boolean(task.isExec) : true,
      is_my_day: task.isMyDay !== undefined ? Boolean(task.isMyDay) : Boolean(isToday)
    };

    console.log("PAYLOAD A INSERTAR EN SUPABASE (tasks):", payload);
    let { data, error } = await supabase.from('tasks').insert([payload]).select();

    if (error && (error.message?.includes('is_exec') || error.message?.includes('is_my_day'))) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.is_exec;
      delete fallbackPayload.is_my_day;
      const retry = await supabase.from('tasks').insert([fallbackPayload]).select();
      data = retry.data;
      error = retry.error;
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
  if (!isSupabaseConfigured || String(taskId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de tarea."); return { success: false, error: "Usuario no autenticado" }; }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.completed !== undefined) {
      updatePayload.completed = updates.completed;
      updatePayload.status = updates.completed ? 'completed' : 'pending';
    }
    if (updates.title !== undefined) {
      updatePayload.title = updates.title;
    }
    if (updates.description !== undefined) {
      updatePayload.description = updates.description;
    }
    if (updates.dueDate !== undefined) {
      updatePayload.due_date = updates.dueDate || null;
      const todayISO = new Date().toISOString().split('T')[0];
      if (updates.dueDate === todayISO) {
        updatePayload.is_my_day = true;
      }
    }
    if (updates.priority !== undefined) {
      updatePayload.priority = updates.priority;
    }
    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
    }
    if (updates.projectId !== undefined) {
      updatePayload.project_id = updates.projectId || null;
    }
    if (updates.isExec !== undefined) {
      updatePayload.is_exec = updates.isExec;
    }
    if (updates.isMyDay !== undefined) {
      updatePayload.is_my_day = updates.isMyDay;
    }

    let { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (error && (error.message?.includes('is_exec') || error.message?.includes('is_my_day'))) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.is_exec;
      delete fallbackPayload.is_my_day;
      const retry = await supabase
        .from('tasks')
        .update(fallbackPayload)
        .eq('id', taskId);
      if (!retry.error) return { success: true };
      return { success: false, error: retry.error };
    }

    if (error) {
      console.error('Error al actualizar tarea en Supabase:', error);
      return { success: false, error };
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
export async function deleteCloudTask(taskId: string): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured || String(taskId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de tarea."); return { success: false, error: "Usuario no autenticado" }; }

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error al eliminar tarea:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar tarea de Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Sincroniza proyectos/tareas hacia Supabase sin duplicar tareas existentes
 * y elimina tareas removidas del proyecto en Supabase.
 */
export async function syncProjectTasksToCloud(project: Project): Promise<Project> {
  if (!isSupabaseConfigured || String(project.id).startsWith('guest_')) return project;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return project;

    const isVirtualProject = project.id === 'proj-other' || String(project.id).startsWith('proj-temp-') || String(project.id).startsWith('proj-');
    const targetDbProjectId = isVirtualProject ? null : project.id;

    // 1. Consultar IDs de tareas actuales en Supabase para este proyecto (o project_id IS NULL para proj-other)
    let query = supabase.from('tasks').select('id').eq('user_id', user.id);
    if (targetDbProjectId) {
      query = query.eq('project_id', targetDbProjectId);
    } else {
      query = query.is('project_id', null);
    }
    const { data: dbExistingTasks } = await query;
    const dbTaskIdsInCloud = new Set((dbExistingTasks || []).map((row: any) => String(row.id)));

    const currentTaskIdsInClient = new Set<string>();
    const updatedTasksList: ProjectTask[] = [];

    if (project.tasks && project.tasks.length > 0) {
      for (const t of project.tasks) {
        if (String(t.id).startsWith('guest_')) continue;

        const isTempId = String(t.id).startsWith('pt-') || String(t.id).startsWith('temp-') || String(t.id).startsWith('proj-');

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

          if (res.data && res.data.id) {
            const realTaskId = String(res.data.id);
            currentTaskIdsInClient.add(realTaskId);
            updatedTasksList.push({
              ...t,
              id: realTaskId
            });
          } else {
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

    // 2. Identificar tareas que existían en Supabase para este proyecto pero ya no están en project.tasks -> Eliminar de Supabase
    for (const cloudTaskId of dbTaskIdsInCloud) {
      if (!currentTaskIdsInClient.has(cloudTaskId)) {
        console.log(`Eliminando tarea removida de Supabase: ${cloudTaskId}`);
        await deleteCloudTask(cloudTaskId);
      }
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
