import { supabase, isSupabaseConfigured } from './supabase';
import { Habit } from '../types';

export interface HabitCloudPayload {
  title: string;
  description?: string;
  category?: string;
  color?: string;
  icon?: string;
  frequency?: number;
  targetDaysPerWeek?: number;
  completed?: boolean;
  streak?: number;
  lastCompletedAt?: string | null;
  daysOfWeek?: string[];
}

export async function fetchCloudHabits(userId?: string): Promise<Habit[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase.from('habits').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error al cargar hábitos desde Supabase:', error);
      return [];
    }
    if (!data) return [];
    return data.map(row => ({
      id: String(row.id),
      title: row.title || 'Hábito sin título',
      description: row.description || '',
      category: row.category || 'Productividad',
      color: row.color || 'cyan',
      icon: row.icon || 'Zap',
      targetDaysPerWeek: row.frequency || row.target_days_per_week || 7,
      createdAt: row.created_at || new Date().toISOString(),
      completed: Boolean(row.completed),
      streak: Number(row.streak || 0),
      lastCompletedAt: row.last_completed_at || null,
      archived: Boolean(row.archived),
      daysOfWeek: row.days_of_week || []
    }));
  } catch (err) {
    console.error('Error al consultar hábitos de Supabase:', err);
    return [];
  }
}

export async function createCloudHabit(payload: HabitCloudPayload): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
    if (userAuthError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const payloadToInsert = {
      title: payload.title,
      description: payload.description || '',
      category: payload.category || 'Productividad',
      color: payload.color || 'cyan',
      icon: payload.icon || 'Zap',
      target_days: typeof payload.frequency === 'number' ? payload.frequency : typeof payload.targetDaysPerWeek === 'number' ? payload.targetDaysPerWeek : 7,
      frequency: typeof payload.frequency === 'number' ? payload.frequency : typeof payload.targetDaysPerWeek === 'number' ? payload.targetDaysPerWeek : 7,
      completed: payload.completed ?? false,
      streak: payload.streak ?? 0,
      last_completed_at: payload.lastCompletedAt || null,
      days_of_week: payload.daysOfWeek || [],
      user_id: user.id
    };

    console.log("PAYLOAD A INSERTAR (habits):", payloadToInsert);
    const { data, error } = await supabase.from('habits').insert([payloadToInsert]).select();

    if (error) {
      if (error.code === 'PGRST204') {
        let fallbackPayload = { ...payloadToInsert };
        let shouldRetry = false;
        
        if (error.message.includes('days_of_week')) {
          console.warn('⚠️ COLUMNA FALTANTE: La base de datos no tiene la columna "days_of_week". Por favor, ejecuta este SQL en Supabase:\n\nALTER TABLE habits ADD COLUMN days_of_week text[] DEFAULT \'{}\';\nNOTIFY pgrst, reload_schema;\n\nReintentando guardado sin días de la semana...');
          delete (fallbackPayload as any).days_of_week;
          shouldRetry = true;
        }
        if (error.message.includes('target_days')) {
          console.warn('⚠️ COLUMNA FALTANTE "target_days", reintentando sin ella...');
          delete (fallbackPayload as any).target_days;
          shouldRetry = true;
        }

        if (shouldRetry) {
          const retryRes = await supabase.from('habits').insert([fallbackPayload]).select();
          
          // Secondary fallback if BOTH are missing but we only caught one in the first error message
          if (retryRes.error && retryRes.error.code === 'PGRST204' && retryRes.error.message.includes('days_of_week')) {
              delete (fallbackPayload as any).days_of_week;
              const retryRes2 = await supabase.from('habits').insert([fallbackPayload]).select();
              if (retryRes2.error) {
                  return { success: false, error: retryRes2.error };
              }
              return { success: true, data: retryRes2.data ? retryRes2.data[0] : null };
          }
          if (retryRes.error && retryRes.error.code === 'PGRST204' && retryRes.error.message.includes('target_days')) {
              delete (fallbackPayload as any).target_days;
              const retryRes2 = await supabase.from('habits').insert([fallbackPayload]).select();
              if (retryRes2.error) {
                  return { success: false, error: retryRes2.error };
              }
              return { success: true, data: retryRes2.data ? retryRes2.data[0] : null };
          }

          if (retryRes.error) {
            console.error('ERROR EN INSERT (REINTENTO) [habits]:', retryRes.error);
            return { success: false, error: retryRes.error };
          }
          return { success: true, data: retryRes.data ? retryRes.data[0] : null };
        }
      }

      console.error('ERROR EN INSERT [habits]:', error);
      return { success: false, error };
    }
    return { success: true, data: data ? data[0] : null };
  } catch (err: any) {
    console.error('Error al insertar hábito:', err);
    return { success: false, error: err };
  }
}

export async function updateCloudHabit(
  habitId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    color?: string;
    icon?: string;
    frequency?: number;
    completed?: boolean;
    streak?: number;
    lastCompletedAt?: string | null;
    daysOfWeek?: string[];
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!isSupabaseConfigured || String(habitId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de habito."); return { success: false, error: "Usuario no autenticado" }; }

    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.color !== undefined) updatePayload.color = updates.color;
    if (updates.icon !== undefined) updatePayload.icon = updates.icon;
    if (updates.frequency !== undefined) updatePayload.frequency = updates.frequency;
    if (updates.completed !== undefined) updatePayload.completed = updates.completed;
    if (updates.streak !== undefined) updatePayload.streak = updates.streak;
    if (updates.lastCompletedAt !== undefined) updatePayload.last_completed_at = updates.lastCompletedAt;
    if (updates.daysOfWeek !== undefined) updatePayload.days_of_week = updates.daysOfWeek;

    const { data, error } = await supabase
      .from('habits')
      .update(updatePayload)
      .eq('id', habitId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      if (error.code === 'PGRST204' && error.message.includes('days_of_week')) {
        console.warn('⚠️ COLUMNA FALTANTE: La base de datos no tiene la columna "days_of_week". Por favor, ejecuta este SQL en Supabase:\n\nALTER TABLE habits ADD COLUMN days_of_week text[] DEFAULT \'{}\';\nNOTIFY pgrst, reload_schema;\n\nReintentando actualización sin días de la semana...');
        
        const fallbackPayload = { ...updatePayload };
        delete (fallbackPayload as any).days_of_week;
        
        const retryRes = await supabase
          .from('habits')
          .update(fallbackPayload)
          .eq('id', habitId)
          .eq('user_id', user.id)
          .select();
          
        if (retryRes.error) {
          console.error('Error al actualizar hábito en Supabase (Reintento):', retryRes.error);
          return { success: false, error: retryRes.error };
        }
        return { success: true, data: retryRes.data ? retryRes.data[0] : null };
      }

      console.error('Error al actualizar hábito en Supabase:', error);
      return { success: false, error };
    }
    return { success: true, data: data ? data[0] : null };
  } catch (err: any) {
    console.error('Error al actualizar hábito en Supabase:', err);
    return { success: false, error: err };
  }
}

export async function deleteCloudHabit(habitId: string): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured || String(habitId).startsWith('guest_')) {
    return { success: true };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de habito."); return { success: false, error: "Usuario no autenticado" }; }

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error al eliminar hábito de Supabase:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar hábito de Supabase:', err);
    return { success: false, error: err };
  }
}
