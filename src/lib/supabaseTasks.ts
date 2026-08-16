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
}

/**
 * 1. Obtener tareas desde Supabase:
 * const { data, error } = await supabase.from('tasks').select('*');
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

    return validTasks.map(row => ({
      task: {
        id: String(row.id),
        title: row.title || 'Tarea sin título',
        completed: Boolean(row.completed || row.status === 'completed'),
        dueDate: row.due_date || row.date || undefined
      },
      projectId: row.project_id || undefined
    }));
  } catch (err) {
    console.error('Error al consultar tareas de Supabase:', err);
    return [];
  }
}

/**
 * 2. Guardar tarea en Supabase:
 */
export async function createCloudTask(task: TaskCloudPayload): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("⚠️ ATENCIÓN: No hay sesión detectada en Supabase. Se guardará solo temporalmente.");
      const existing = getGuestTasks();
      const guestTask = { ...task, id: 'guest_' + Date.now(), completed: false };
      saveGuestTasks([...existing, guestTask]);
      return { success: true, data: guestTask };
    }

    const validProjectId = (task.projectId && !String(task.projectId).startsWith('guest_') && !String(task.projectId).startsWith('proj-')) ? task.projectId : null;

    const payload = {
      user_id: user.id,
      title: task.title ? task.title.trim() : 'Nueva Tarea',
      description: task.description || '',
      completed: false,
      priority: task.priority || 'medium',
      status: 'pending',
      due_date: task.dueDate || new Date().toLocaleDateString('sv-SE'),
      project_id: validProjectId
    };

    console.log("PAYLOAD A INSERTAR (tasks):", payload);
    const { data, error } = await supabase.from('tasks').insert([payload]).select();

    if (error) {
      console.error("ERROR EN INSERT [tasks]:", error);
      alert("🔴 ERROR SUPABASE: " + error.message);
      return { success: false, error };
    } else {
      alert("✅ TAREA GUARDADA CON ÉXITO EN SUPABASE");
      if (data && data[0]) {
        return { success: true, data: data[0] };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error guardando tarea:", err);
    alert("🔴 ERROR SUPABASE: " + (err.message || err));
    return { success: false, error: err };
  }
}

/**
 * 3. Actualizar estado de tarea en Supabase
 */
export async function updateCloudTask(
  taskId: string,
  updates: { completed?: boolean; title?: string; dueDate?: string; priority?: string; status?: string; projectId?: string }
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
    if (updates.dueDate !== undefined) {
      updatePayload.due_date = updates.dueDate || null;
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

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error al actualizar tarea:', error);
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
 * Sincroniza proyectos/tareas hacia Supabase
 */
export async function syncProjectTasksToCloud(project: Project): Promise<void> {
  if (!isSupabaseConfigured || String(project.id).startsWith('guest_')) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (project.tasks && project.tasks.length > 0) {
      for (const t of project.tasks) {
        if (!String(t.id).startsWith('guest_')) {
          await createCloudTask({
            title: t.title,
            completed: t.completed,
            dueDate: t.dueDate,
            projectId: project.id
          });
        }
      }
    }
  } catch (e) {
    console.error('Error al sincronizar proyecto con Supabase:', e);
  }
}
