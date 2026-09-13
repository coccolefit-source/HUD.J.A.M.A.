import { Habit, DailyLog, MotivationalQuote, OneOnOneReview, Project } from '../types';
import { formatDateToISO, getPastNDays, getTodayISO, getWeekNumber } from '../utils/dateUtils';

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 'q1',
    quote: "Si te tropiezas de nuevo con la misma piedra, no te lamentes por la piedra; examina la firmeza de tu paso.",
    author: "Marco Aurelio",
    role: "Emperador Romano y Filósofo Estoico",
    category: 'mindset'
  },
  {
    id: 'q2',
    quote: "No fracasé. Solo encontré 10,000 formas que no funcionan. Lo único de lo que debes preocuparte es de aprender del intento.",
    author: "Steve Jobs",
    role: "Cofundador de Apple",
    category: 'resilience'
  },
  {
    id: 'q3',
    quote: "No nos atrevemos a muchas cosas porque son difíciles; son difíciles porque no nos atrevemos a hacerlas.",
    author: "Sénica",
    role: "Filósofo Estoico",
    category: 'perseverance'
  },
  {
    id: 'q4',
    quote: "Si no crees en ti mismo, nadie lo hará por ti. El fracaso es la mayor herramienta para ajustar tu entrenamiento.",
    author: "Kobe Bryant",
    role: "Leyenda del Baloncesto y Mentalidad Mamba",
    category: 'discipline'
  },
  {
    id: 'q5',
    quote: "Cuando ya no somos capaces de cambiar una situación, nos enfrentamos al desafío de cambiarnos a nosotros mismos.",
    author: "Viktor Frankl",
    role: "Psiquiatra y Autor de 'El Hombre en Busca de Sentido'",
    category: 'resilience'
  },
  {
    id: 'q6',
    quote: "Un viaje de mil millas comienza con un solo paso. No importa cuán pequeño sea el progreso hoy, sigue caminando.",
    author: "Lao Tzu",
    role: "Filósofo Antiguo",
    category: 'perseverance'
  },
  {
    id: 'q7',
    quote: "No es lo que te ocurre, sino cómo reaccionas ante ello lo que realmente importa.",
    author: "Epicteto",
    role: "Filósofo Estoico",
    category: 'mindset'
  },
  {
    id: 'q8',
    quote: "La gloria más grande no consiste en no caer nunca, sino en levantarse cada vez que nos caemos.",
    author: "Nelson Mandela",
    role: "Líder Humanitario",
    category: 'perseverance'
  }
];

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'h1',
    title: 'Meditación & Enfoque',
    description: '10 minutos de respiración consciente o presencia stoica por la mañana.',
    category: 'Mente',
    color: 'emerald',
    icon: 'Brain',
    targetDaysPerWeek: 7,
    createdAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'h2',
    title: 'Entrenamiento Físico',
    description: '45 min de ejercicio (fuerza, cardio o movilidad activa).',
    category: 'Salud',
    color: 'indigo',
    icon: 'Dumbbell',
    targetDaysPerWeek: 5,
    createdAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'h3',
    title: 'Bloque de Trabajo Profundo',
    description: '90 minutos sin teléfono ni redes para proyectos clave.',
    category: 'Productividad',
    color: 'violet',
    icon: 'Zap',
    targetDaysPerWeek: 5,
    createdAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'h4',
    title: 'Lectura Constructiva',
    description: 'Leer al menos 15 páginas de desarrollo personal o profesional.',
    category: 'Personal',
    color: 'amber',
    icon: 'BookOpen',
    targetDaysPerWeek: 7,
    createdAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'h5',
    title: 'Hidratación Óptima (2.5L)',
    description: 'Mantener constante flujo de agua e electrólitos.',
    category: 'Salud',
    color: 'cyan',
    icon: 'Droplets',
    targetDaysPerWeek: 7,
    createdAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'h6',
    title: 'Registro Financiero Diario',
    description: 'Anotar gastos e ingresos al final del día.',
    category: 'Finanzas',
    color: 'rose',
    icon: 'PiggyBank',
    targetDaysPerWeek: 7,
    createdAt: '2026-07-01T00:00:00.000Z'
  }
];

// Returns clean initial logs (0 streak, 0 XP)
export function generateSampleLogs(): Record<string, DailyLog> {
  return {};
}

export const INITIAL_REVIEWS: OneOnOneReview[] = [];

export const INITIAL_PROJECTS: Project[] = [];
