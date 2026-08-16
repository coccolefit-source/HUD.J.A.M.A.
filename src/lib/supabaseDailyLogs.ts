import { supabase, isSupabaseConfigured } from './supabase';
import { DailyLog } from '../types';

export async function fetchCloudDailyLogs(userId?: string): Promise<Record<string, DailyLog>> {
  if (!isSupabaseConfigured) return {};
  try {
    let query = supabase.from('daily_logs').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error al cargar daily_logs desde Supabase:', error);
      return {};
    }
    if (!data || data.length === 0) return {};

    const logsMap: Record<string, DailyLog> = {};
    data.forEach((row: any) => {
      let metrics: any = {};
      if (typeof row.metrics === 'string') {
        try { metrics = JSON.parse(row.metrics); } catch (e) { metrics = {}; }
      } else if (row.metrics) {
        metrics = row.metrics;
      }

      let dailyWins: string[] = [];
      if (typeof row.reflection === 'string') {
        try { dailyWins = JSON.parse(row.reflection); } catch (e) { dailyWins = []; }
      } else if (Array.isArray(row.reflection)) {
        dailyWins = row.reflection;
      } else if (metrics.dailyWins && Array.isArray(metrics.dailyWins)) {
        dailyWins = metrics.dailyWins;
      }

      const dateStr = row.date;
      if (dateStr) {
        logsMap[dateStr] = {
          date: dateStr,
          notes: row.notes || '',
          dailyWins,
          completedHabitIds: metrics.completedHabitIds || [],
          isClosed: Boolean(metrics.isClosed),
          closedAt: metrics.closedAt || undefined,
          closureRate: metrics.closureRate || 0,
          sportsEntries: metrics.sportsEntries || [],
          bonusXP: metrics.bonusXP || 0,
          focusMinutes: metrics.focusMinutes || 0,
          focusSessions: metrics.focusSessions || []
        };
      }
    });

    return logsMap;
  } catch (err) {
    console.error('Error al consultar daily_logs de Supabase:', err);
    return {};
  }
}

export async function upsertCloudDailyLog(log: DailyLog): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.error("No hay usuario autenticado. Cancelando guardado de log diario."); return { success: false, error: "Usuario no autenticado" }; }

    const metrics = {
      completedHabitIds: log.completedHabitIds || [],
      isClosed: log.isClosed || false,
      closedAt: log.closedAt || null,
      closureRate: log.closureRate || 0,
      sportsEntries: log.sportsEntries || [],
      bonusXP: log.bonusXP || 0,
      focusMinutes: log.focusMinutes || 0,
      focusSessions: log.focusSessions || [],
      dailyWins: log.dailyWins || []
    };

    const payload = {
      user_id: user.id,
      date: log.date,
      notes: log.notes || '',
      reflection: log.dailyWins || [],
      metrics: metrics
    };

    console.log("PAYLOAD A INSERTAR (daily_logs):", payload);
    const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      console.error('ERROR EN UPSERT [daily_logs]:', error);
      // Fallback if unique constraint is slightly different
      console.warn('Upsert daily_logs with onConflict failed, retrying simple insert/update:', error.message);
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', log.date)
        .single();

      if (existing?.id) {
        await supabase
          .from('daily_logs')
          .update({
            notes: log.notes || '',
            reflection: log.dailyWins || [],
            metrics: metrics
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_logs')
          .insert([payload]);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al guardar daily_log en Supabase:', err);
    return { success: false, error: err };
  }
}
