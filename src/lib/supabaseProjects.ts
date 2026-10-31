import { supabase, isSupabaseConfigured } from './supabase';
import { Project } from '../types';

export interface ProjectCloudPayload {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  progress?: number;
  category?: string;
  tasks?: any[];
}

export async function createCloudProject(project: ProjectCloudPayload): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }

  try {
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
    if (userAuthError || !user) {
      console.error("Error al insertar proyecto: Usuario no autenticado", userAuthError);
      return { success: false, error: userAuthError || 'Usuario no autenticado' };
    }

    const payload: Record<string, any> = {
      title: project.title,
      description: project.description || '',
      status: project.status || 'Planificación',
      priority: project.priority || 'Media',
      progress: project.progress || 0,
      tasks: project.tasks || [],
      user_id: user.id
    };

    console.log("PAYLOAD A INSERTAR (projects):", payload);
    const { data, error } = await supabase.from('projects').insert([payload]).select();

    if (error) {
      console.error("ERROR EN INSERT [projects]:", error);
      return { success: false, error };
    }

    console.log("Proyecto insertado exitosamente en Supabase:", data);
    return { success: true, data: data ? data[0] : null };
  } catch (err: any) {
    console.error("Error al insertar proyecto:", err);
    return { success: false, error: err };
  }
}

export async function updateCloudProject(
  projectId: string,
  updates: Partial<ProjectCloudPayload>
): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured || String(projectId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de proyecto."); return { success: false, error: "Usuario no autenticado" }; }

    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;
    if (updates.progress !== undefined) updatePayload.progress = updates.progress;
    if (updates.tasks !== undefined) updatePayload.tasks = updates.tasks;

    const { data, error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('Error al actualizar proyecto en Supabase:', error);
      return { success: false, error };
    }

    return { success: true, data: data ? data[0] : null };
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

    return data.map(row => ({
      id: String(row.id),
      title: row.title || 'Proyecto sin título',
      description: row.description || '',
      category: row.category || 'General',
      status: row.status || 'Planificación',
      priority: row.priority || 'Media',
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      targetDate: row.end_date || row.target_date || undefined,
      progress: typeof row.progress === 'number' ? row.progress : 0,
      tasks: (row.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title || 'Tarea sin título',
        completed: Boolean(t.completed || t.status === 'completed'),
        dueDate: t.due_date || t.date || undefined,
        isExec: t.is_exec !== undefined ? Boolean(t.is_exec) : true,
        isMyDay: Boolean(t.is_my_day),
        description: t.description || '',
        priority: t.priority || 'medium',
        status: t.status || (t.completed ? 'completed' : 'pending')
      })),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    }));
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
      console.error("No hay usuario autenticado. Cancelando eliminación de proyecto."); 
      return { success: false, error: "Usuario no autenticado" }; 
    }

    if (projectId === 'proj-other') {
      const { error: tasksError1 } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .is('project_id', null);

      if (tasksError1) {
        console.error('Error al eliminar tareas sin proyecto en Supabase:', tasksError1);
        return { success: false, error: tasksError1 };
      }

      const { error: tasksError2 } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', 'proj-other');

      if (tasksError2) {
        console.error('Error al eliminar tareas de proj-other en Supabase:', tasksError2);
        return { success: false, error: tasksError2 };
      }

      await supabase
        .from('projects')
        .delete()
        .eq('user_id', user.id)
        .or(`id.eq.proj-other,title.eq.Sin Proyecto / Otros,title.eq.Otros`);

      return { success: true };
    }

    // 1. Explicitly delete tasks associated with project in Supabase
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId);

    if (tasksError) {
      console.error('Error al eliminar sub-tareas asociadas en Supabase:', tasksError);
      return { success: false, error: tasksError };
    }

    // 2. Explicitly delete project in Supabase
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error al eliminar proyecto de Supabase:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Error al eliminar proyecto:', err);
    return { success: false, error: err };
  }
}
