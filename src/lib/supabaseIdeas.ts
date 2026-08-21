import { supabase, isSupabaseConfigured } from './supabase';
import { Idea } from '../types';

/**
 * 1. Carga inicial de ideas desde Supabase filtrando por user_id
 */
export async function fetchCloudIdeas(userId: string): Promise<Idea[]> {
  if (!isSupabaseConfigured || !userId) {
    console.log('Supabase no está configurado o no hay userId para cargar ideas.');
    return [];
  }

  try {
    const response = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId);

    console.log('Supabase ideas response:', response.data, response.error);

    if (response.error || !response.data) {
      return [];
    }

    return response.data.map(row => ({
      id: String(row.id),
      title: row.title || 'Idea sin título',
      notes: row.notes || undefined,
      category: row.category || 'PROYECTO',
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error al obtener ideas desde Supabase:', err);
    return [];
  }
}

/**
 * 2. Guardar/Insertar nueva idea en Supabase con await
 */
export async function createCloudIdea(idea: Idea): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error al insertar idea: Usuario no autenticado", userError);
      return { success: false, error: 'Usuario no autenticado' };
    }

    const { data, error } = await supabase.from('ideas').insert([
      { 
        title: idea.title,
        notes: idea.notes || '',
        category: idea.category || 'PROYECTO',
        user_id: user.id
      }
    ]).select();

    if (error) {
      console.error("Error al insertar idea en Supabase:", error);
      return { success: false, error };
    }

    console.log("Idea insertada exitosamente en Supabase:", data);
    const insertedRow = data && data[0];
    return { 
      success: true, 
      data: insertedRow ? {
        id: String(insertedRow.id),
        title: insertedRow.title || idea.title,
        notes: insertedRow.notes || idea.notes,
        category: insertedRow.category || idea.category,
        createdAt: insertedRow.created_at || new Date().toISOString()
      } : idea 
    };
  } catch (err: any) {
    console.error("Error al insertar idea:", err);
    return { success: false, error: err };
  }
}

/**
 * 3. Eliminar idea en Supabase con await
 */
export async function deleteCloudIdea(ideaId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: true };

    const response = await supabase
      .from('ideas')
      .delete()
      .eq('id', ideaId)
      .eq('user_id', user.id);

    console.log('Supabase delete idea response:', response.data, response.error);

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar idea de Supabase:', err);
    return { success: false, error: err?.message || 'Error eliminando idea en Supabase' };
  }
}

/**
 * 4. Actualizar idea existente en Supabase con await
 */
export async function updateCloudIdea(ideaId: string, updates: Partial<Idea>): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error al actualizar idea: Usuario no autenticado", userError);
      return { success: false, error: 'Usuario no autenticado' };
    }

    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.notes !== undefined) payload.notes = updates.notes || '';
    if (updates.category !== undefined) payload.category = updates.category;

    const { data, error } = await supabase
      .from('ideas')
      .update(payload)
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error("Error al actualizar idea en Supabase:", error);
      return { success: false, error };
    }

    const updatedRow = data && data[0];
    return { 
      success: true, 
      data: updatedRow ? {
        id: String(updatedRow.id),
        title: updatedRow.title,
        notes: updatedRow.notes || undefined,
        category: updatedRow.category,
        createdAt: updatedRow.created_at || new Date().toISOString()
      } : null
    };
  } catch (err: any) {
    console.error("Error al actualizar idea:", err);
    return { success: false, error: err };
  }
}

