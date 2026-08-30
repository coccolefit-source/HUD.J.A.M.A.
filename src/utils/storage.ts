import { Habit, DailyLog, OneOnOneReview, Project, ProjectTask, Idea } from '../types';

export function getStoredHabits(): Habit[] {
  return [];
}

export function saveStoredHabits(_habits: Habit[]): void {
  // Persistence strictly handled via Supabase
}

export function getStoredLogs(): Record<string, DailyLog> {
  return {};
}

export function saveStoredLogs(_logs: Record<string, DailyLog>): void {
  // Persistence strictly handled via Supabase
}

export function getStoredReviews(): OneOnOneReview[] {
  return [];
}

export function saveStoredReviews(_reviews: OneOnOneReview[]): void {
  // Persistence strictly handled via Supabase
}

export function getStoredProjects(): Project[] {
  return [];
}

export function saveStoredProjects(_projects: Project[]): void {
  // Persistence strictly handled via Supabase
}

export function getGuestInsights(): OneOnOneReview[] {
  return [];
}

export function saveGuestInsights(_reviews: OneOnOneReview[]): void {
  // Persistence strictly handled via Supabase
}

export function getGuestDailyLogs(): Record<string, DailyLog> {
  return {};
}

export function saveGuestDailyLogs(_logs: Record<string, DailyLog>): void {
  // Persistence strictly handled via Supabase
}

export function getGuestTasks(): ProjectTask[] {
  return [];
}

export function saveGuestTasks(_tasks: ProjectTask[]): void {
  // Persistence strictly handled via Supabase
}

export const defaultGuestHabits: any[] = [];

export function getGuestHabits(): Habit[] {
  return [];
}

export function saveGuestHabits(_habits: Habit[]): void {
  // Persistence strictly handled via Supabase
}

export function getGuestProjects(): Project[] {
  return [];
}

export function saveGuestProjects(_projects: Project[]): void {
  // Persistence strictly handled via Supabase
}

export function getGuestIdeas(): Idea[] {
  return [];
}

export function saveGuestIdeas(_ideas: Idea[]): void {
  // Persistence strictly handled via Supabase
}

export function getStoredIdeas(): Idea[] {
  return [];
}

export function saveStoredIdeas(_ideas: Idea[]): void {
  // Persistence strictly handled via Supabase
}

export function resetToSampleData(): void {
  window.location.reload();
}
