import { supabase, isSupabaseConfigured } from './supabase';
import { OneOnOneReview } from '../types';

export async function fetchCloudReviews(userId: string): Promise<OneOnOneReview[]> {
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al obtener revisiones 1-on-1 de Supabase:', error);
      return [];
    }

    if (!data) return [];

    return data.map((r: any) => ({
      id: String(r.id),
      year: Number(r.year),
      month: Number(r.month),
      weekNumber: Number(r.week_number || r.week_number),
      createdAt: r.created_at || new Date().toISOString(),
      bestHabitId: r.best_habit_id || undefined,
      revelationHabitId: r.revelation_habit_id || undefined,
      focusHabitId: r.focus_habit_id || undefined,
      notesWorkedWell: r.notes_worked_well || '',
      notesObstacles: r.notes_obstacles || '',
      notesCommitments: r.notes_commitments || ''
    }));
  } catch (err) {
    console.error('Error inesperado al cargar revisiones:', err);
    return [];
  }
}

export async function upsertCloudReview(review: OneOnOneReview): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado' };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const payload = {
      id: review.id,
      user_id: user.id,
      year: review.year,
      month: review.month,
      week_number: review.weekNumber,
      best_habit_id: review.bestHabitId || null,
      revelation_habit_id: review.revelationHabitId || null,
      focus_habit_id: review.focusHabitId || null,
      notes_worked_well: review.notesWorkedWell || '',
      notes_obstacles: review.notesObstacles || '',
      notes_commitments: review.notesCommitments || '',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('reviews')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Error al guardar revisión 1-on-1 en Supabase:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Error inesperado al guardar revisión:', err);
    return { success: false, error: err };
  }
}
