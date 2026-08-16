/**
 * Date utility functions for the Action & Habit Tracker
 */

export function formatDateToISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayISO(): string {
  return formatDateToISO(new Date());
}

export function formatFriendlyDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  const todayStr = getTodayISO();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateToISO(yesterday);

  if (dateStr === todayStr) {
    return 'Hoy';
  } else if (dateStr === yesterdayStr) {
    return 'Ayer';
  }

  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  };
  return date.toLocaleDateString('es-ES', options);
}

export function formatFullDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Get week number of the year (ISO week date)
export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getPastNDays(n: number, endDate: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    result.push(formatDateToISO(d));
  }
  return result;
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
