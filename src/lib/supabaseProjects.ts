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

    const payload = {
      title: project.title,
      description: project.description || '',
      status: project.status || 'Planificación',
      priority: project.priority || 'Media',
      progress: project.progress || 0,
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
    let query = supabase.from('projects').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
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
      progress: typeof row.progress === 'number' ? row.progress : 0,
      tasks: [],
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
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de proyecto."); return { success: false, error: "Usuario no autenticado" }; }

    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

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
