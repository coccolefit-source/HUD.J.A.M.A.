import { Habit, DailyLog, OneOnOneReview, Project, ProjectTask, Idea } from '../types';
import { INITIAL_HABITS, INITIAL_REVIEWS, INITIAL_PROJECTS, generateSampleLogs } from '../data/initialData';
import { getTodayISO } from './dateUtils';

const KEYS = {
  HABITS: 'habitpulse_habits_v1',
  LOGS: 'habitpulse_logs_v1',
  REVIEWS: 'habitpulse_reviews_v1',
  PROJECTS: 'habitpulse_projects_v1',
  IDEAS: 'habitpulse_ideas_v1'
};

export function getStoredHabits(): Habit[] {
  try {
    const data = localStorage.getItem(KEYS.HABITS);
    if (!data) {
      localStorage.setItem(KEYS.HABITS, JSON.stringify(INITIAL_HABITS));
      return INITIAL_HABITS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading habits from localStorage', e);
    return INITIAL_HABITS;
  }
}

export function saveStoredHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
  } catch (e) {
    console.error('Error saving habits', e);
  }
}

export function getStoredLogs(): Record<string, DailyLog> {
  try {
    const data = localStorage.getItem(KEYS.LOGS);
    if (!data) {
      localStorage.setItem(KEYS.LOGS, JSON.stringify({}));
      return {};
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading logs from localStorage', e);
    return {};
  }
}

export function saveStoredLogs(logs: Record<string, DailyLog>): void {
  try {
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving logs', e);
  }
}

export function getStoredReviews(): OneOnOneReview[] {
  try {
    const data = localStorage.getItem(KEYS.REVIEWS);
    if (!data) {
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading reviews from localStorage', e);
    return INITIAL_REVIEWS;
  }
}

export function saveStoredReviews(reviews: OneOnOneReview[]): void {
  try {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
  } catch (e) {
    console.error('Error saving reviews', e);
  }
}

export function getStoredProjects(): Project[] {
  try {
    const data = localStorage.getItem(KEYS.PROJECTS);
    if (!data) {
      const cleanProjects = INITIAL_PROJECTS.map(p => ({
        ...p,
        progress: 0,
        tasks: []
      }));
      return cleanProjects;
    }
    const parsed: Project[] = JSON.parse(data);
    // Garantizar que las tareas vengan siempre exclusivamente de Supabase
    return parsed.map(p => ({ ...p, tasks: [] }));
  } catch (e) {
    console.error('Error loading projects from localStorage', e);
    return [];
  }
}

export function saveStoredProjects(projects: Project[]): void {
  try {
    // Guardar proyectos en localStorage sin tareas (las tareas viven únicamente en Supabase)
    const projectsWithoutTasks = projects.map(({ tasks, ...rest }) => ({
      ...rest,
      tasks: []
    }));
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projectsWithoutTasks));
  } catch (e) {
    console.error('Error saving projects', e);
  }
}

const GUEST_KEYS = {
  HABITS: 'guest_habits',
  TASKS: 'guest_tasks',
  PROJECTS: 'guest_projects',
  IDEAS: 'guest_ideas',
  LOGS: 'guest_daily_logs'
};

export function getGuestInsights(): OneOnOneReview[] {
  try {
    const data = localStorage.getItem('guest_insights');
    if (!data) return getStoredReviews();
    return JSON.parse(data);
  } catch (e) {
    return getStoredReviews();
  }
}

export function saveGuestInsights(reviews: OneOnOneReview[]): void {
  try {
    localStorage.setItem('guest_insights', JSON.stringify(reviews));
    saveStoredReviews(reviews);
  } catch (e) {
    console.error('Error saving guest insights', e);
  }
}

export function getGuestDailyLogs(): Record<string, DailyLog> {
  try {
    const data = localStorage.getItem(GUEST_KEYS.LOGS);
    if (!data) return getStoredLogs();
    return JSON.parse(data);
  } catch (e) {
    return getStoredLogs();
  }
}

export function saveGuestDailyLogs(logs: Record<string, DailyLog>): void {
  try {
    localStorage.setItem(GUEST_KEYS.LOGS, JSON.stringify(logs));
    saveStoredLogs(logs);
  } catch (e) {
    console.error('Error saving guest daily logs', e);
  }
}

export function getGuestTasks(): ProjectTask[] {
  try {
    const data = localStorage.getItem(GUEST_KEYS.TASKS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveGuestTasks(tasks: ProjectTask[]): void {
  try {
    localStorage.setItem(GUEST_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving guest tasks', e);
  }
}

export const defaultGuestHabits = [
  {
    id: 'guest_1',
    title: 'Hidratación Táctica (2L)',
    description: 'Mantener rendimiento cognitivo y físico',
    category: 'Salud',
    color: '#06b6d4',
    icon: 'zap',
    frequency: 7,
    completed: false
  },
  {
    id: 'guest_2',
    title: 'Lectura Profunda (20 min)',
    description: 'Enfoque absoluto sin distracciones',
    category: 'Mente',
    color: '#8b5cf6',
    icon: 'book',
    frequency: 7,
    completed: false
  },
  {
    id: 'guest_3',
    title: 'Bloque de Trabajo Enfocado',
    description: 'Completar la tarea de mayor impacto del día',
    category: 'Productividad',
    color: '#f59e0b',
    icon: 'target',
    frequency: 5,
    completed: false
  }
];

export function getGuestHabits(): Habit[] {
  try {
    const data = localStorage.getItem(GUEST_KEYS.HABITS);
    if (data === null) {
      localStorage.setItem(GUEST_KEYS.HABITS, JSON.stringify(defaultGuestHabits));
      return defaultGuestHabits.map((h: any) => ({
        id: String(h.id),
        title: h.title,
        description: h.description,
        category: h.category,
        color: h.color,
        icon: h.icon,
        targetDaysPerWeek: h.frequency || 7,
        createdAt: new Date().toISOString()
      }));
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map((h: any) => ({
        id: String(h.id),
        title: h.title || 'Hábito sin título',
        description: h.description || '',
        category: h.category || 'Productividad',
        color: h.color || 'cyan',
        icon: h.icon || 'Zap',
        targetDaysPerWeek: h.targetDaysPerWeek || h.frequency || 7,
        createdAt: h.createdAt || h.created_at || new Date().toISOString(),
        archived: Boolean(h.archived)
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveGuestHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(GUEST_KEYS.HABITS, JSON.stringify(habits));
    saveStoredHabits(habits);
  } catch (e) {
    console.error('Error saving guest habits', e);
  }
}

export function getGuestProjects(): Project[] {
  try {
    const data = localStorage.getItem(GUEST_KEYS.PROJECTS);
    if (!data) return getStoredProjects();
    return JSON.parse(data);
  } catch (e) {
    return getStoredProjects();
  }
}

export function saveGuestProjects(projects: Project[]): void {
  try {
    localStorage.setItem(GUEST_KEYS.PROJECTS, JSON.stringify(projects));
    saveStoredProjects(projects);
  } catch (e) {
    console.error('Error saving guest projects', e);
  }
}

export function getGuestIdeas(): Idea[] {
  try {
    const data = localStorage.getItem(GUEST_KEYS.IDEAS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveGuestIdeas(ideas: Idea[]): void {
  try {
    localStorage.setItem(GUEST_KEYS.IDEAS, JSON.stringify(ideas));
  } catch (e) {
    console.error('Error saving guest ideas', e);
  }
}

export function getStoredIdeas(): Idea[] {
  return getGuestIdeas();
}

export function saveStoredIdeas(ideas: Idea[]): void {
  saveGuestIdeas(ideas);
}

export function resetToSampleData(): void {
  try {
    localStorage.clear();
    const resetProfile = { streak: 0, xp: 0, level: 1, rankTitle: "OPERADOR NOVATO", progressPercentage: 0, isMaxLevel: false };
    localStorage.setItem('habitpulse_profile_v1', JSON.stringify(resetProfile));
    localStorage.setItem('habitpulse_user_session_v1', JSON.stringify({
      email: '',
      alias: '',
      hudName: 'HUD INVITADO',
      updatedAt: new Date().toISOString()
    }));
    window.location.reload();
  } catch (e) {
    console.error('Error resetting data', e);
  }
}
