import { createClient } from '@supabase/supabase-js';
import { Habit, DailyLog, Project, Idea } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hgjfjvbnaysjjgeucrxq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnamZqdmJuYXlzampnZXVjcnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MDIxMDcsImV4cCI6MjEwMTI3ODEwN30.a0WegQYXpIPGHmhm3NFpMzLRp2WoWfnSOg6ezs2iI-M';

export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
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
      console.log('Usando perfil fallback de la sesión activa');
      return { 
        id: userId, 
        email: email || '', 
        hudName: email ? `HUD ${email.split('@')[0].toUpperCase()}` : 'HUD OPERADOR' 
      };
    }
    return data;
  } catch (err) {
    console.log('Usando perfil fallback de la sesión activa');
    return { 
      id: userId, 
      email: email || '', 
      hudName: email ? `HUD ${email.split('@')[0].toUpperCase()}` : 'HUD OPERADOR' 
    };
  }
}

/**
 * Migration helper: takes local explorer data and attempts to save it to Supabase
 */
export async function migrateGuestDataToCloud(userId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const habitsStr = localStorage.getItem('habitpulse_habits_v1');
    const logsStr = localStorage.getItem('habitpulse_logs_v1');
    const projectsStr = localStorage.getItem('habitpulse_projects_v1');
    const ideasStr = localStorage.getItem('habitpulse_ideas_v1');

    const habits: Habit[] = habitsStr ? JSON.parse(habitsStr) : [];
    const logs: Record<string, DailyLog> = logsStr ? JSON.parse(logsStr) : {};
    const projects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];
    const ideas: Idea[] = ideasStr ? JSON.parse(ideasStr) : [];

    // Attempt to upsert user profile or data document
    try {
      await supabase.from('user_profiles').upsert({
        id: userId,
        updated_at: new Date().toISOString(),
        habits_data: habits,
        logs_data: logs,
        projects_data: projects,
        ideas_data: ideas
      });
    } catch (err) {
      console.warn('Supabase user_profiles table note:', err);
    }

    // Also attempt table-based upserts if individual tables exist
    if (ideas.length > 0) {
      const formattedIdeas = ideas.map(i => ({
        id: i.id,
        user_id: userId,
        title: i.title,
        notes: i.notes,
        category: i.category,
        created_at: i.createdAt
      }));
      try {
        await supabase.from('ideas').upsert(formattedIdeas);
      } catch {
        // ignore if table doesn't exist
      }
    }

    if (projects.length > 0) {
      const formattedProjects = projects.map(p => ({
        id: p.id,
        user_id: userId,
        title: p.title,
        description: p.description,
        status: p.status,
        priority: p.priority,
        tasks: p.tasks,
        progress: p.progress,
        updated_at: p.updatedAt || new Date().toISOString()
      }));
      try {
        await supabase.from('projects').upsert(formattedProjects);
      } catch {
        // ignore if table doesn't exist
      }

      // Also upsert individual tasks into tasks table
      const allTasksToMigrate: any[] = [];
      projects.forEach(p => {
        if (p.tasks && p.tasks.length > 0) {
          p.tasks.forEach(t => {
            allTasksToMigrate.push({
              id: t.id,
              user_id: userId,
              title: t.title,
              completed: t.completed,
              status: t.completed ? 'completed' : 'pending',
              due_date: t.dueDate || null,
              project_id: p.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          });
        }
      });

      if (allTasksToMigrate.length > 0) {
        try {
          await supabase.from('tasks').upsert(allTasksToMigrate);
        } catch {
          try {
            await supabase.from('todos').upsert(allTasksToMigrate);
          } catch {
            // ignore if table doesn't exist
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during guest data migration to Supabase:', error);
  }
}
