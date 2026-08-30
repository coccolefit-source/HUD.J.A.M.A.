import { createClient } from '@supabase/supabase-js';
import { Habit, DailyLog, Project, Idea } from '../types';

const supabaseUrl = 'https://hgjfjvbnaysjjgeucrxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnamZqdmJuYXlzampnZXVjcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MDIxMDcsImV4cCI6MjEwMTI3ODEwN30.a0WegQYXpIPGHmhm3NFpMzLRp2WoWfnSOg6ezs2iI-M';

export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Safe fetch for user_profiles with fallback to session user data
 */
export async function fetchCloudUserProfile(userId: string, email?: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error || !data) {
      return { 
        id: userId, 
        email: email || '', 
        hudName: email ? `HUD ${email.split('@')[0].toUpperCase()}` : 'HUD OPERADOR' 
      };
    }
    return data;
  } catch (err) {
    return { 
      id: userId, 
      email: email || '', 
      hudName: email ? `HUD ${email.split('@')[0].toUpperCase()}` : 'HUD OPERADOR' 
    };
  }
}

/**
 * Migration helper
 */
export async function migrateGuestDataToCloud(_userId: string) {
  // No-op: localStorage has been removed
}
