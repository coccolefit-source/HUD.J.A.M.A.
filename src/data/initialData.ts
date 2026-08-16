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

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: 'Lanzamiento Nueva Versión App Mobil',
    description: 'Implementación del nuevo módulo de sincronización en la nube y rediseño de interfaz de usuario.',
    status: 'Planificación',
    priority: 'Alta',
    category: 'Tecnología',
    startDate: '2026-07-01',
    targetDate: '2026-08-15',
    progress: 0,
    kpis: 'Superar 10,000 usuarios activos diarios y reducir latencia un 30%',
    createdAt: new Date().toISOString(),
    tasks: [
      { id: 't1-1', title: 'Diseño de maquetas UI en Figma', completed: false, dueDate: '2026-07-10' },
      { id: 't1-2', title: 'Integración de API de sincronización', completed: false, dueDate: '2026-07-20' },
      { id: 't1-3', title: 'Pruebas QA de estrés y carga', completed: false, dueDate: '2026-08-01' },
      { id: 't1-4', title: 'Despliegue a tiendas App Store & Play Store', completed: false, dueDate: '2026-08-15' }
    ]
  },
  {
    id: 'proj-2',
    title: 'Optimización de Rutina de Ciclismo & Fondo',
    description: 'Preparación estructurada para completar fondo de 100km en carretera a fin de mes.',
    status: 'Planificación',
    priority: 'Alta',
    category: 'Deporte',
    startDate: '2026-07-10',
    targetDate: '2026-08-30',
    progress: 0,
    kpis: 'Acumular 300 km en el mes y mantener cadencia promedio de 85 RPM',
    createdAt: new Date().toISOString(),
    tasks: [
      { id: 't2-1', title: 'Mantenimiento preventivo y ajuste de bicicleta', completed: false, dueDate: '2026-07-15' },
      { id: 't2-2', title: 'Completar 3 salidas de 30+ km semanales', completed: false, dueDate: '2026-07-25' },
      { id: 't2-3', title: 'Simulación de fondo de 60km con hidratación adecuada', completed: false, dueDate: '2026-08-10' },
      { id: 't2-4', title: 'Fondo oficial de 100km', completed: false, dueDate: '2026-08-30' }
    ]
  },
  {
    id: 'proj-3',
    title: 'Estrategia de Crecimiento & Ventas Q3',
    description: 'Definición de embudo de ventas B2B y campañas de prospección automatizadas.',
    status: 'Planificación',
    priority: 'Media',
    category: 'Negocios',
    startDate: '2026-08-01',
    targetDate: '2026-09-30',
    progress: 0,
    kpis: 'Cerrar 5 nuevos clientes corporativos y generar $25k MRR',
    createdAt: new Date().toISOString(),
    tasks: [
      { id: 't3-1', title: 'Segmentación de base de datos de prospectos', completed: false, dueDate: '2026-08-05' },
      { id: 't3-2', title: 'Creación de propuestas de valor y pitch deck', completed: false, dueDate: '2026-08-20' },
      { id: 't3-3', title: 'Lanzamiento de campaña de correos personalizados', completed: false, dueDate: '2026-09-01' }
    ]
  }
];
