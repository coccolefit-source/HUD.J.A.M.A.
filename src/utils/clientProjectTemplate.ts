import { ClientProjectStep, DevelopmentStage } from '../types';

export function createDefaultClientProjectSteps(): ClientProjectStep[] {
  return [
    {
      id: 'onboarding',
      stepNumber: 1,
      title: 'Paso 1 · Inicio y Recolección (Día 0)',
      subtitle: 'Recepción de pago, logo, precios y costos para arrancar el montaje',
      tasks: [
        {
          id: 'step1-client-1',
          title: 'Confirmar pago inicial y plan mensual elegido',
          owner: 'client',
          completed: false,
        },
        {
          id: 'step1-client-2',
          title: 'Enviar logo del negocio y colores de la marca',
          owner: 'client',
          completed: false,
        },
        {
          id: 'step1-client-3',
          title: 'Enviar listado de productos, precios de venta y costos reales',
          owner: 'client',
          completed: false,
        },
        {
          id: 'step1-me-1',
          title: 'Configurar proyecto, base de datos y acceso rápido (PIN/usuario)',
          owner: 'me',
          completed: false,
        },
      ],
      notes: [],
    },
    {
      id: 'diseno_ux',
      stepNumber: 2,
      title: 'Paso 2 · Personalización y Pantallas Clave',
      subtitle: 'Vestir la app con la marca del negocio y validar el flujo simple',
      tasks: [
        {
          id: 'step2-me-1',
          title: 'Vestir la app con logo, nombre y colores de marca del cliente',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step2-me-2',
          title: 'Definir las 3 pantallas clave (ventas, inventario/clientes y resumen de caja)',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step2-client-1',
          title: 'Validar el boceto rápido (que se entienda en menos de 2 minutos)',
          owner: 'client',
          completed: false,
        },
      ],
      notes: [],
    },
    {
      id: 'desarrollo_mvp',
      stepNumber: 3,
      title: 'Paso 3 · Montaje y Carga de Catálogo',
      subtitle: 'Construcción operativa diaria, inventario y carga de productos reales',
      tasks: [
        {
          id: 'step3-me-1',
          title: 'Cargar productos, precios de venta y costos reales en el sistema',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step3-me-2',
          title: 'Configurar registro diario de ventas, gastos y cierre de caja',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step3-me-3',
          title: 'Conectar botón rápido de WhatsApp para recibos o pedidos',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step3-client-1',
          title: 'Revisar que los productos y precios cargados estén correctos',
          owner: 'client',
          completed: false,
        },
      ],
      notes: [],
    },
    {
      id: 'pruebas_qa',
      stepNumber: 4,
      title: 'Paso 4 · Pruebas en Celular (QA)',
      subtitle: 'Verificar velocidad, claridad y funcionamiento real desde teléfono',
      tasks: [
        {
          id: 'step4-me-1',
          title: 'Probar flujo completo en celular (registrar venta, inventario y resumen)',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step4-client-1',
          title: 'Hacer 2 pruebas reales desde el celular y reportar ajustes',
          owner: 'client',
          completed: false,
        },
      ],
      notes: [],
    },
    {
      id: 'capacitacion_entrega',
      stepNumber: 5,
      title: 'Paso 5 · Entrega y Capacitación (Día 2)',
      subtitle: 'Sesión de 15 minutos con el dueño y arranque en operación real',
      tasks: [
        {
          id: 'step5-me-1',
          title: 'Realizar sesión de 15 minutos para entregar la app y enseñar cierre de caja',
          owner: 'me',
          completed: false,
        },
        {
          id: 'step5-client-1',
          title: 'Instalar acceso directo en el celular y registrar primeras ventas reales',
          owner: 'client',
          completed: false,
        },
        {
          id: 'step5-me-2',
          title: 'Agendar primera reunión de seguimiento con el Gerente de e-prime',
          owner: 'me',
          completed: false,
        },
      ],
      notes: [],
    },
  ];
}

export function ensureClientProjectSteps(steps?: ClientProjectStep[]): ClientProjectStep[] {
  if (Array.isArray(steps) && steps.length > 0) {
    return steps.map((step, index) => ({
      id: step.id,
      stepNumber: step.stepNumber || index + 1,
      title: step.title || `Paso ${index + 1}`,
      subtitle: step.subtitle || '',
      tasks: Array.isArray(step.tasks)
        ? step.tasks.map((t) => ({
            id: String(t.id),
            title: String(t.title || ''),
            owner: t.owner === 'client' ? 'client' : 'me',
            completed: Boolean(t.completed),
          }))
        : [],
      notes: Array.isArray(step.notes)
        ? step.notes.map((n) => ({
            id: String(n.id),
            text: String(n.text || ''),
            createdAt: n.createdAt || new Date().toISOString(),
          }))
        : [],
    }));
  }
  return createDefaultClientProjectSteps();
}

export function calculateClientProjectMetrics(steps: ClientProjectStep[]): {
  progress: number;
  completed: number;
  total: number;
  myCompleted: number;
  myTotal: number;
  clientCompleted: number;
  clientTotal: number;
  currentStage: DevelopmentStage;
} {
  let completed = 0;
  let total = 0;
  let myCompleted = 0;
  let myTotal = 0;
  let clientCompleted = 0;
  let clientTotal = 0;

  let currentStage: DevelopmentStage = steps[0]?.id || 'onboarding';
  let foundIncompleteStep = false;

  for (const step of steps) {
    const stepTotal = step.tasks.length;
    const stepCompleted = step.tasks.filter((t) => t.completed).length;

    total += stepTotal;
    completed += stepCompleted;

    for (const task of step.tasks) {
      if (task.owner === 'client') {
        clientTotal += 1;
        if (task.completed) clientCompleted += 1;
      } else {
        myTotal += 1;
        if (task.completed) myCompleted += 1;
      }
    }

    if (!foundIncompleteStep && (stepTotal === 0 || stepCompleted < stepTotal)) {
      currentStage = step.id;
      foundIncompleteStep = true;
    }
  }

  if (!foundIncompleteStep && steps.length > 0) {
    currentStage = steps[steps.length - 1].id;
  }

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    progress,
    completed,
    total,
    myCompleted,
    myTotal,
    clientCompleted,
    clientTotal,
    currentStage,
  };
}
