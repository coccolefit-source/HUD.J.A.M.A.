import { ProjectPhase, ProjectTask } from '../types';

export const DEFAULT_MVP_PHASES: ProjectPhase[] = [
  {
    id: 'phase-1',
    title: 'Fase 1: Diagnóstico Express (1-2 días)',
    items: [
      {
        id: 'p1-1',
        title: 'Identificar el dolor principal del dueño (¿dónde pierde tiempo o dinero hoy?).',
        completed: false
      },
      {
        id: 'p1-2',
        title: 'Mapear el flujo actual (cómo lo hacen en cuaderno, Excel o WhatsApp) y simplificarlo al máximo.',
        completed: false
      },
      {
        id: 'p1-3',
        title: 'Definir las 3 pantallas clave que el negocio necesita para operar sin complicarse.',
        completed: false
      },
      {
        id: 'p1-4',
        title: 'Validar el boceto rápido con el emprendedor (que lo entienda en menos de 2 minutos).',
        completed: false
      }
    ]
  },
  {
    id: 'phase-2',
    title: 'Fase 2: Construcción Rápida (MVP)',
    items: [
      {
        id: 'p2-1',
        title: 'Configurar proyecto, base de datos y acceso simple (usuario/contraseña o PIN rápido).',
        completed: false
      },
      {
        id: 'p2-2',
        title: 'Desarrollar el registro operativo diario (ventas, pedidos, citas o movimientos).',
        completed: false
      },
      {
        id: 'p2-3',
        title: 'Crear módulo de control básico (inventario, clientes o caja según el negocio).',
        completed: false
      },
      {
        id: 'p2-4',
        title: 'Armar pantalla de resumen para el dueño (cuánto vendió, gastó o ganó hoy).',
        completed: false
      },
      {
        id: 'p2-5',
        title: 'Conectar botón rápido de WhatsApp (para enviar recibos, pedidos o recordatorios).',
        completed: false
      }
    ]
  },
  {
    id: 'phase-3',
    title: 'Fase 3: Entrega y Uso Real',
    items: [
      {
        id: 'p3-1',
        title: 'Probar la app desde el celular (los emprendedores operan 90% desde el teléfono).',
        completed: false
      },
      {
        id: 'p3-2',
        title: 'Cargar productos, precios o datos iniciales del negocio para que arranque lista.',
        completed: false
      },
      {
        id: 'p3-3',
        title: 'Hacer sesión de 15 minutos con el dueño y su equipo para enseñarles a usarla.',
        completed: false
      },
      {
        id: 'p3-4',
        title: 'Revisar uso a los 7 días y ajustar detalles de comodidad o velocidad.',
        completed: false
      },
      {
        id: 'p3-5',
        title: 'Pedir testimonio / caso de éxito y cerrar mantenimiento o mensualidad.',
        completed: false
      }
    ]
  }
];

export function createDefaultProjectPhases(): ProjectPhase[] {
  return DEFAULT_MVP_PHASES.map(phase => ({
    id: phase.id,
    title: phase.title,
    items: phase.items.map(item => ({ ...item }))
  }));
}

export function ensureProjectPhases(phases?: unknown): ProjectPhase[] {
  if (Array.isArray(phases) && phases.length > 0) {
    return phases.map((phase: any, pIdx: number) => ({
      id: String(phase?.id || `phase-${pIdx + 1}`),
      title: String(phase?.title || `Fase ${pIdx + 1}`),
      items: Array.isArray(phase?.items)
        ? phase.items.map((item: any, iIdx: number) => ({
            id: String(item?.id || `p${pIdx + 1}-${iIdx + 1}`),
            title: String(item?.title || ''),
            completed: Boolean(item?.completed)
          }))
        : []
    }));
  }
  return createDefaultProjectPhases();
}

export function getPhasesCompletionStats(phases?: ProjectPhase[]): { completed: number; total: number; percent: number } {
  const safePhases = ensureProjectPhases(phases);
  let total = 0;
  let completed = 0;
  for (const phase of safePhases) {
    for (const item of phase.items) {
      total += 1;
      if (item.completed) completed += 1;
    }
  }
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export function calculateProjectProgress(tasks?: ProjectTask[], phases?: ProjectPhase[]): number {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  if (safeTasks.length > 0) {
    const completedCount = safeTasks.filter(t => t.completed || t.status === 'completed').length;
    return Math.min(100, Math.round((completedCount / safeTasks.length) * 100));
  }
  if (Array.isArray(phases) && phases.length > 0) {
    const phaseStats = getPhasesCompletionStats(phases);
    if (phaseStats.completed > 0) {
      return phaseStats.percent;
    }
  }
  return 0;
}
