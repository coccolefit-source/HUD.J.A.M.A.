import { supabase, isSupabaseConfigured } from './supabase';
import { DailyProductivity } from '../types';

export interface ProductivityCloudRecord {
  id?: string;
  user_id?: string;
  date: string;
  own_project_minutes: number;
  social_media_minutes: number;
  notes?: string;
}

/**
 * Fetch all productivity records from daily_productivity table if it exists.
 */
export async function fetchCloudProductivity(userId?: string): Promise<Record<string, DailyProductivity>> {
  if (!isSupabaseConfigured) return {};
  try {
    let query = supabase.from('daily_productivity').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      // Table may not have been created yet by the user, fail silently
      return {};
    }
    if (!data) return {};

    const map: Record<string, DailyProductivity> = {};
    data.forEach((row: any) => {
      if (row.date) {
        map[row.date] = {
          ownProjectMinutes: Number(row.own_project_minutes || 0),
          socialMediaMinutes: Number(row.social_media_minutes || 0),
          notes: row.notes || ''
        };
      }
    });
    return map;
  } catch (err) {
    return {};
  }
}

/**
 * Persist productivity directly to Supabase cloud (daily_productivity table).
 * Never uses localStorage.
 */
export async function upsertCloudProductivity(
  date: string,
  ownProjectMinutes: number,
  socialMediaMinutes: number,
  notes?: string
): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No hay usuario autenticado para guardar productividad en Supabase.');
      return { success: false, error: 'Usuario no autenticado' };
    }

    const payload = {
      user_id: user.id,
      date,
      own_project_minutes: ownProjectMinutes,
      social_media_minutes: socialMediaMinutes,
      notes: notes || '',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('daily_productivity')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      console.warn('Upsert onConflict en daily_productivity falló o la tabla no existe aún:', error.message);
      // Intentar select y update como fallback
      const { data: existing } = await supabase
        .from('daily_productivity')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('daily_productivity')
          .update({
            own_project_minutes: ownProjectMinutes,
            social_media_minutes: socialMediaMinutes,
            notes: notes || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('daily_productivity').insert([payload]);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al sincronizar con daily_productivity:', err);
    return { success: false, error: err };
  }
}
