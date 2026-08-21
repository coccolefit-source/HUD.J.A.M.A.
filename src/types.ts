export interface UserSession {
  isGuest?: boolean;
  email?: string;
  alias?: string;
  hudName: string;
  updatedAt: string;
}

export interface UserProfileState {
  streak: number;
  xp: number;
  level: number;
  rankTitle: string;
  progressPercentage: number;
  isMaxLevel: boolean;
}

export type CategoryType = 'Salud' | 'Productividad' | 'Mente' | 'Finanzas' | 'Relaciones' | 'Personal';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  category: CategoryType;
  color: string; // Tailwind color class or hex identifier
  icon: string; // Lucide icon name identifier
  targetDaysPerWeek: number; // e.g. 7 for daily, 5 for weekdays
  createdAt: string; // ISO string
  archived?: boolean;
  daysOfWeek?: string[];
  completed?: boolean;
  streak?: number;
  lastCompletedAt?: string | null;
  order?: number;
}

export type SportType = 'Ciclismo' | 'Running' | 'Fútbol' | 'Natación' | 'Gimnasio' | 'Caminata' | 'Padel / Tenis' | 'Otros';

export interface SportsEntry {
  id: string;
  sportType: SportType;
  km: number; // Kilometros recorridos
  durationMinutes?: number;
  notes?: string;
  createdAt?: string;
}

export interface FocusSessionEntry {
  id: string;
  minutes: number;
  xpEarned: number;
  taskName: string;
  completedAt: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  completedHabitIds: string[];
  isClosed?: boolean;
  closedAt?: string;
  notes?: string;
  dailyWins?: string[]; // Array of victory entries for the day
  sportsEntries?: SportsEntry[]; // Array of sports sessions for the day
  closureRate?: number; // snapshot of percentage when closed
  bonusXP?: number;
  focusMinutes?: number;
  focusSessions?: FocusSessionEntry[];
}

export interface OneOnOneReview {
  id: string;
  year: number;
  month: number; // 1-12
  weekNumber: number; // 1-52
  createdAt: string;
  bestHabitId?: string;
  revelationHabitId?: string;
  focusHabitId?: string;
  notesWorkedWell: string;
  notesObstacles: string;
  notesCommitments: string;
}

export interface MotivationalQuote {
  id: string;
  quote: string;
  author: string;
  role?: string;
  category?: 'perseverance' | 'mindset' | 'discipline' | 'resilience';
}

export interface CategoryStat {
  category: CategoryType;
  total: number;
  completed: number;
  rate: number;
  color: string;
}

export type IdeaCategory = 'PROYECTO' | 'MEJORA' | 'ESTRATEGIA' | 'PERSONAL';

export interface Idea {
  id: string;
  title: string;
  notes?: string;
  category: IdeaCategory;
  createdAt: string;
}

export type ProjectStatus = 'Planificación' | 'En Progreso' | 'En Pausa' | 'Completado';
export type ProjectPriority = 'Alta' | 'Media' | 'Baja';

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  category?: string;
  startDate: string;
  targetDate?: string;
  progress: number; // 0 - 100
  tasks: ProjectTask[];
  kpis?: string;
  createdAt: string;
  updatedAt?: string;
}
