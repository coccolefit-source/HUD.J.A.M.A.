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

export interface DailyProductivity {
  ownProjectMinutes: number;
  socialMediaMinutes: number;
  notes?: string;
}

export interface ProductivityEntry {
  id: string;
  category: 'Proyecto propio' | 'Redes sociales';
  minutes: number;
  notes?: string;
  createdAt?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  completedHabitIds: string[];
  isClosed?: boolean;
  closedAt?: string;
  notes?: string;
  dailyWins?: string[]; // Array of victory entries for the day
  sportsEntries?: SportsEntry[]; // Array of sports sessions for the day
  productivity?: DailyProductivity; // Total minutos en Proyecto Propio y Redes Sociales
  productivityEntries?: ProductivityEntry[]; // Registros individuales de productividad
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
  isExec?: boolean;
  isMyDay?: boolean;
  description?: string;
  priority?: string;
  status?: string;
}

export interface ProjectPhaseItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface ProjectPhase {
  id: string;
  title: string;
  items: ProjectPhaseItem[];
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
  phases?: ProjectPhase[];
  kpis?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ClientSegment = 'prospect' | 'active' | 'followup';

export type ProspectStage =
  | 'contacto_inicial'
  | 'diagnostico'
  | 'propuesta_enviada'
  | 'negociacion'
  | 'listo_para_pago';

export type DevelopmentStage =
  | 'onboarding'
  | 'diseno_ux'
  | 'desarrollo_mvp'
  | 'pruebas_qa'
  | 'capacitacion_entrega';

export type PaymentStatus = 'up_to_date' | 'pending' | 'overdue';

export type BillingCycle =
  | 'mensual'
  | 'quincenal'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'personalizado';

export interface ClientMonthlyReview {
  id: string;
  date: string; // YYYY-MM-DD
  salesAmount: number;
  inventoryStatus: string;
  notes: string;
}

export interface ClientPaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  nextPaymentDate: string; // YYYY-MM-DD
  notes?: string;
}

export type ProjectTaskOwner = 'me' | 'client';

export interface ClientProjectTask {
  id: string;
  title: string;
  owner: ProjectTaskOwner;
  completed: boolean;
}

export interface ClientProjectStepNote {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
}

export interface ClientProjectStep {
  id: DevelopmentStage;
  stepNumber: number;
  title: string;
  subtitle: string;
  tasks: ClientProjectTask[];
  notes: ClientProjectStepNote[];
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  projectName?: string;
  segment: ClientSegment;
  prospectStage: ProspectStage;
  devStage: DevelopmentStage;
  devProgress: number; // 0 - 100
  monthlyFee: number;
  setupFee?: number;
  currency: string; // e.g., 'COP', 'USD', 'MXN'
  billingCycle: BillingCycle;
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string; // YYYY-MM-DD
  nextPaymentDate?: string; // YYYY-MM-DD
  nextMeetingDate?: string; // YYYY-MM-DD
  lastSalesAmount?: number;
  lastInventoryNote?: string;
  notes?: string;
  monthlyReviews: ClientMonthlyReview[];
  paymentHistory: ClientPaymentRecord[];
  projectSteps?: ClientProjectStep[];
  createdAt: string;
  updatedAt?: string;
}

