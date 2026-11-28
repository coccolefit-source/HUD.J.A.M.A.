import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Copy,
  Check,
  Edit3,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Briefcase,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Package,
  TrendingUp,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
} from 'lucide-react';
import {
  BillingCycle,
  Client,
  ClientMonthlyReview,
  ClientPaymentRecord,
  ClientProjectStep,
  ClientSegment,
  DevelopmentStage,
  PaymentStatus,
  ProspectStage,
} from '../../types';
import { getTodayISO } from '../../utils/dateUtils';
import { calculateClientProjectMetrics } from '../../utils/clientProjectTemplate';
import { ClientProjectWorkspaceModal } from './ClientProjectWorkspaceModal';

type ClientsSubTab = 'prospects' | 'active' | 'followup' | 'receivables';

interface ClientsManagerProps {
  clients: Client[];
  senderName?: string;
  isLoading?: boolean;
  cloudError?: string | null;
  tableMissing?: boolean;
  onRefreshClients: () => Promise<void> | void;
  onCreateClient: (
    payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateClient: (
    clientId: string,
    payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteClient: (clientId: string) => Promise<{ success: boolean; error?: string }>;
}

const PROSPECT_STAGES: {
  id: ProspectStage;
  step: number;
  label: string;
  shortLabel: string;
  nextStepText: string;
}[] = [
  {
    id: 'contacto_inicial',
    step: 1,
    label: '1. Contacto Inicial',
    shortLabel: 'Contacto',
    nextStepText: 'agendar nuestro diagnóstico rápido de 15 minutos para entender tu operación',
  },
  {
    id: 'diagnostico',
    step: 2,
    label: '2. Diagnóstico Express',
    shortLabel: 'Diagnóstico',
    nextStepText: 'preparar y enviarte la propuesta con las pantallas clave y tiempos de entrega',
  },
  {
    id: 'propuesta_enviada',
    step: 3,
    label: '3. Propuesta Enviada',
    shortLabel: 'Propuesta',
    nextStepText: 'revisar juntos la propuesta y resolver cualquier duda que tengas',
  },
  {
    id: 'negociacion',
    step: 4,
    label: '4. En Negociación',
    shortLabel: 'Negociación',
    nextStepText: 'confirmar los detalles finales del alcance y la forma de pago',
  },
  {
    id: 'listo_para_pago',
    step: 5,
    label: '5. Listo para Pago',
    shortLabel: 'Pago Inicial',
    nextStepText: 'recibir la confirmación del pago inicial para arrancar de inmediato con tu app',
  },
];

const DEV_STAGES: {
  id: DevelopmentStage;
  step: number;
  label: string;
  shortLabel: string;
  progress: number;
  nextStepText: string;
}[] = [
  {
    id: 'onboarding',
    step: 1,
    label: '1. Inicio y Accesos',
    shortLabel: 'Inicio',
    progress: 20,
    nextStepText: 'definir y aprobar las pantallas principales de tu sistema',
  },
  {
    id: 'diseno_ux',
    step: 2,
    label: '2. Diseño de Pantallas',
    shortLabel: 'Diseño',
    progress: 40,
    nextStepText: 'iniciar la construcción funcional de la base de datos y módulos clave',
  },
  {
    id: 'desarrollo_mvp',
    step: 3,
    label: '3. Desarrollo MVP',
    shortLabel: 'Desarrollo',
    progress: 65,
    nextStepText: 'pasar a pruebas reales desde celular con tus datos',
  },
  {
    id: 'pruebas_qa',
    step: 4,
    label: '4. Pruebas en Celular',
    shortLabel: 'Pruebas',
    progress: 85,
    nextStepText: 'cargar tu catálogo/datos iniciales y agendar la capacitación de 15 minutos',
  },
  {
    id: 'capacitacion_entrega',
    step: 5,
    label: '5. Entrega y Capacitación',
    shortLabel: 'Entrega',
    progress: 100,
    nextStepText: 'iniciar el seguimiento mensual de ventas e inventario para optimizar tu negocio',
  },
];

const BILLING_CYCLES: { id: BillingCycle; label: string; addDays?: number; addMonths?: number }[] = [
  { id: 'mensual', label: 'Mensual', addMonths: 1 },
  { id: 'quincenal', label: 'Quincenal', addDays: 15 },
  { id: 'trimestral', label: 'Trimestral', addMonths: 3 },
  { id: 'semestral', label: 'Semestral', addMonths: 6 },
  { id: 'anual', label: 'Anual', addMonths: 12 },
  { id: 'personalizado', label: 'Fecha personalizada' },
];

function addToIsoDate(baseIso: string, options: { days?: number; months?: number }): string {
  const parts = baseIso.split('-').map(Number);
  const d =
    parts.length === 3 && !parts.some(Number.isNaN)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();

  if (options.months) {
    d.setMonth(d.getMonth() + options.months);
  }
  if (options.days) {
    d.setDate(d.getDate() + options.days);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function suggestNextPaymentDate(baseIso: string, cycle: BillingCycle): string {
  const match = BILLING_CYCLES.find((c) => c.id === cycle);
  if (match?.addMonths) return addToIsoDate(baseIso, { months: match.addMonths });
  if (match?.addDays) return addToIsoDate(baseIso, { days: match.addDays });
  return addToIsoDate(baseIso, { months: 1 });
}

function getDaysDiffFromToday(targetIso?: string): number | null {
  if (!targetIso) return null;
  const todayStr = getTodayISO();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [y, m, d] = targetIso.split('-').map(Number);
  if ([ty, tm, td, y, m, d].some(Number.isNaN)) return null;
  const todayMs = Date.UTC(ty, tm - 1, td);
  const targetMs = Date.UTC(y, m - 1, d);
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

function formatMoney(amount: number, currency = 'USD'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: currency === 'COP' || currency === 'CLP' ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toLocaleString('es-CO')}`;
  }
}

function formatDateFriendly(dateIso?: string): string {
  if (!dateIso) return 'Sin definir';
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (mIdx < 0 || mIdx > 11 || Number.isNaN(day)) return dateIso;
  return `${day} ${months[mIdx]} ${parts[0]}`;
}

function sanitizePhoneForWhatsApp(phone: string): string {
  return String(phone || '').replace(/[^\d]/g, '');
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = sanitizePhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  if (digits) {
    return `https://wa.me/${digits}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

type WhatsAppTemplateKind =
  | 'welcome_diagnostic'
  | 'setup_day0'
  | 'ready_day2'
  | 'manager_meeting'
  | 'quote'
  | 'payment';

const E_PRIME_QUOTE_MESSAGE = `¡Hola! Qué gusto saludarte. Somos el equipo de E-prime.

Organizamos las ventas y el inventario de tu negocio dejándote un sistema fácil de usar en tu celular vestido con el logo y nombre de tu marca. Además, un Gerente de nuestro equipo se reúne contigo para revisar tus ventas y ayudarte a aumentar tus ganancias.

Tenemos 3 planes mensuales según qué tan seguido quieras reunirte con el Gerente:

*Plan Esencial — $150.000/mes*
Sistema con tu marca + 1 reunión al mes (30 min) con un Gerente.

*Plan Crecimiento — $200.000/mes (Más elegido)*
Sistema con tu marca + 2 reuniones quincenales con un Gerente + alertas de inventario quieto.

*Plan Control Total — $300.000/mes*
Sistema con tu marca + 4 reuniones semanales con un Gerente + hasta 2 cajas.

*Beneficio Cupo Fundador (Esta semana):*
El montaje inicial de todo tu catálogo normalmente vale $450.000, pero te sale 100% GRATIS arrancando con tus primeros 2 meses por adelantado.

¿Con qué plan te gustaría que empezáramos o prefieres que hagamos una llamada rápida de 10 minutos para recomendarte el ideal?`;

function resolveSenderDisplayName(senderName?: string): string {
  const cleaned = (senderName || '').replace(/^HUD\s+/i, '').trim();
  if (!cleaned || cleaned.toUpperCase() === 'INVITADO' || cleaned.toUpperCase() === 'OPERADOR') {
    return '[Tu Nombre]';
  }
  return cleaned;
}

function buildClientStatusMessage(
  client: Client,
  kind: WhatsAppTemplateKind,
  senderName?: string
): string {
  const clientName = client.name?.trim() || '[Nombre]';
  const businessName =
    client.company?.trim() || client.projectName?.trim() || '[Negocio]';
  const sender = resolveSenderDisplayName(senderName);

  if (kind === 'quote') {
    return E_PRIME_QUOTE_MESSAGE;
  }

  if (kind === 'welcome_diagnostic') {
    return (
      `Hola ${clientName}, ¿cómo vas? Te saluda ${sender} del equipo de e-prime.\n\n` +
      `Ya tenemos todo listo para revisar cómo estás llevando hoy las cuentas de ${businessName}.\n\n` +
      `Agendemos una llamada corta de 15 minutos para conocer tus productos y mostrarte cómo te vamos a organizar todo.\n\n` +
      `¿Te queda bien hoy a las [Hora] o mañana en la mañana?`
    );
  }

  if (kind === 'setup_day0') {
    return (
      `¡Listo, ${clientName}! Ya recibimos el logo y los precios de ${businessName}.\n\n` +
      `Nuestro equipo ya empezó a montar tu sistema personalizado y a cargar tus productos con sus costos reales.\n\n` +
      `En menos de 48 horas te lo entregamos funcionando para que lo manejes desde tu celular.\n\n` +
      `Apenas quede listo te aviso por aquí para coordinar la entrega.`
    );
  }

  if (kind === 'ready_day2') {
    return (
      `¡Buenas noticias, ${clientName}! Ya quedó listo el sistema de ${businessName} con tu logo, tus precios y tus costos cargados.\n\n` +
      `El siguiente paso es una sesión rápida de 15 minutos para entregártelo en tu celular y enseñarte cómo registrar ventas y cerrar caja en segundos.\n\n` +
      `¿A qué hora te queda bien hoy o mañana?`
    );
  }

  if (kind === 'manager_meeting') {
    const meetingDate = client.nextMeetingDate
      ? formatDateFriendly(client.nextMeetingDate)
      : '[Fecha]';
    return (
      `Hola ${clientName}, ¿cómo va todo con los registros en ${businessName}?\n\n` +
      `Te escribo para confirmar nuestra próxima sesión de 30 minutos con el Gerente de e-prime este ${meetingDate}, donde vamos a revisar cuánto vendiste, qué te dejó más ganancia y cómo va tu inventario.\n\n` +
      `¿Te funciona ese día o prefieres que la movamos de horario?`
    );
  }

  // payment reminder
  const dueText = client.nextPaymentDate
    ? formatDateFriendly(client.nextPaymentDate)
    : 'próximamente';
  return (
    `Hola ${clientName}, te escribo con un recordatorio amable del pago de tu sistema en ${businessName}:\n\n` +
    `Monto: ${formatMoney(client.monthlyFee, client.currency)}\n` +
    `Fecha de pago: ${dueText}\n\n` +
    `Apenas realices el pago me envías el comprobante para dejarlo registrado y programar tu siguiente ciclo. ¡Muchas gracias!`
  );
}

function isClientReceivable(client: Client): boolean {
  if (client.paymentStatus === 'pending' || client.paymentStatus === 'overdue') {
    return true;
  }
  if (client.segment !== 'prospect' && client.nextPaymentDate) {
    const diff = getDaysDiffFromToday(client.nextPaymentDate);
    if (diff !== null && diff <= 0) {
      return true;
    }
  }
  return false;
}

function toClientPayload(client: Client): Omit<Client, 'id' | 'createdAt' | 'updatedAt'> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = client;
  return rest;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  senderName,
  isLoading = false,
  cloudError = null,
  tableMissing = false,
  onRefreshClients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ClientsSubTab>('prospects');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);

  // Quick Quote Modal (e-prime 3 plans + Cupo Fundador)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotePhone, setQuotePhone] = useState('');

  // Step-by-Step Client Project Workspace Modal
  const [projectWorkspaceClientId, setProjectWorkspaceClientId] = useState<string | null>(null);
  const activeProjectClient = useMemo(
    () =>
      projectWorkspaceClientId
        ? clients.find((c) => c.id === projectWorkspaceClientId) || null
        : null,
    [clients, projectWorkspaceClientId]
  );

  const handleSaveClientProjectSteps = async (
    client: Client,
    nextSteps: ClientProjectStep[],
    devProgress: number,
    devStage: DevelopmentStage
  ) => {
    setActionError(null);
    const res = await onUpdateClient(client.id, {
      ...toClientPayload(client),
      projectSteps: nextSteps,
      devProgress,
      devStage,
    });
    if (!res.success && res.error) {
      setActionError(res.error);
    }
    return res;
  };

  // Add / Edit Client Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client form fields
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formSegment, setFormSegment] = useState<ClientSegment>('prospect');
  const [formProspectStage, setFormProspectStage] = useState<ProspectStage>('contacto_inicial');
  const [formDevStage, setFormDevStage] = useState<DevelopmentStage>('onboarding');
  const [formDevProgress, setFormDevProgress] = useState<number>(20);
  const [formMonthlyFee, setFormMonthlyFee] = useState<string>('');
  const [formSetupFee, setFormSetupFee] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('COP');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('mensual');
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>('up_to_date');
  const [formNextPaymentDate, setFormNextPaymentDate] = useState<string>('');
  const [formNextMeetingDate, setFormNextMeetingDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Cyclic Payment Modal (Register payment + choose next cyclic payment date)
  const [paymentModalClient, setPaymentModalClient] = useState<Client | null>(null);
  const [paymentPromoteToActive, setPaymentPromoteToActive] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayISO());
  const [paymentNextDate, setPaymentNextDate] = useState<string>('');
  const [paymentCycle, setPaymentCycle] = useState<BillingCycle>('mensual');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Monthly Review Modal (Sales & Inventory meeting)
  const [reviewModalClient, setReviewModalClient] = useState<Client | null>(null);
  const [reviewDate, setReviewDate] = useState<string>(getTodayISO());
  const [reviewSales, setReviewSales] = useState<string>('');
  const [reviewInventory, setReviewInventory] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewNextMeetingDate, setReviewNextMeetingDate] = useState<string>('');

  // Filtered segments
  const prospectsList = useMemo(
    () => clients.filter((c) => c.segment === 'prospect'),
    [clients]
  );
  const activeList = useMemo(
    () => clients.filter((c) => c.segment === 'active'),
    [clients]
  );
  const followupList = useMemo(
    () => clients.filter((c) => c.segment === 'followup'),
    [clients]
  );
  const receivablesList = useMemo(
    () => clients.filter(isClientReceivable),
    [clients]
  );

  // Stats
  const stats = useMemo(() => {
    const overdueCount = receivablesList.filter((c) => {
      const diff = getDaysDiffFromToday(c.nextPaymentDate);
      return c.paymentStatus === 'overdue' || (diff !== null && diff < 0);
    }).length;

    const totalReceivable = receivablesList.reduce((acc, c) => acc + (Number(c.monthlyFee) || 0), 0);
    const primaryCurrency =
      receivablesList[0]?.currency || clients[0]?.currency || 'COP';

    return {
      prospects: prospectsList.length,
      active: activeList.length,
      followup: followupList.length,
      receivablesCount: receivablesList.length,
      overdueCount,
      totalReceivable,
      primaryCurrency,
    };
  }, [clients, prospectsList, activeList, followupList, receivablesList]);

  const displayedClients = useMemo(() => {
    const base =
      activeSubTab === 'prospects'
        ? prospectsList
        : activeSubTab === 'active'
        ? activeList
        : activeSubTab === 'followup'
        ? followupList
        : receivablesList;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;

    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.projectName && c.projectName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [activeSubTab, prospectsList, activeList, followupList, receivablesList, searchQuery]);

  const handleCopyMessage = async (key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      setActionError('No se pudo copiar al portapapeles. Usa el botón de WhatsApp directo.');
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setActionError(null);
    const today = getTodayISO();
    const defaultSeg: ClientSegment =
      activeSubTab === 'prospects'
        ? 'prospect'
        : activeSubTab === 'followup'
        ? 'followup'
        : 'active';

    setFormName('');
    setFormCompany('');
    setFormPhone('');
    setFormEmail('');
    setFormProjectName('');
    setFormSegment(defaultSeg);
    setFormProspectStage('contacto_inicial');
    setFormDevStage('onboarding');
    setFormDevProgress(20);
    setFormMonthlyFee('');
    setFormSetupFee('');
    setFormCurrency('COP');
    setFormBillingCycle('mensual');
    setFormPaymentStatus(activeSubTab === 'receivables' ? 'overdue' : 'up_to_date');
    setFormNextPaymentDate(
      activeSubTab === 'receivables' ? today : suggestNextPaymentDate(today, 'mensual')
    );
    setFormNextMeetingDate(
      defaultSeg === 'followup' ? addToIsoDate(today, { months: 1 }) : ''
    );
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setActionError(null);
    setFormName(client.name);
    setFormCompany(client.company || '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormProjectName(client.projectName || '');
    setFormSegment(client.segment);
    setFormProspectStage(client.prospectStage);
    setFormDevStage(client.devStage);
    setFormDevProgress(client.devProgress);
    setFormMonthlyFee(client.monthlyFee ? String(client.monthlyFee) : '');
    setFormSetupFee(client.setupFee ? String(client.setupFee) : '');
    setFormCurrency(client.currency || 'COP');
    setFormBillingCycle(client.billingCycle || 'mensual');
    setFormPaymentStatus(client.paymentStatus || 'up_to_date');
    setFormNextPaymentDate(client.nextPaymentDate || '');
    setFormNextMeetingDate(client.nextMeetingDate || '');
    setFormNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveClientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    const payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formName.trim(),
      company: formCompany.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      projectName: formProjectName.trim(),
      segment: formSegment,
      prospectStage: formProspectStage,
      devStage: formDevStage,
      devProgress: Math.max(0, Math.min(100, Number(formDevProgress) || 0)),
      monthlyFee: Number(formMonthlyFee) || 0,
      setupFee: Number(formSetupFee) || 0,
      currency: formCurrency || 'COP',
      billingCycle: formBillingCycle,
      paymentStatus: formPaymentStatus,
      lastPaymentDate: editingClient?.lastPaymentDate,
      nextPaymentDate: formNextPaymentDate || undefined,
      nextMeetingDate: formNextMeetingDate || undefined,
      lastSalesAmount: editingClient?.lastSalesAmount,
      lastInventoryNote: editingClient?.lastInventoryNote,
      notes: formNotes.trim(),
      monthlyReviews: editingClient?.monthlyReviews || [],
      paymentHistory: editingClient?.paymentHistory || [],
    };

    try {
      const res = editingClient
        ? await onUpdateClient(editingClient.id, payload)
        : await onCreateClient(payload);

      if (!res.success) {
        setActionError(res.error || 'No se pudo guardar el cliente en Supabase.');
        return;
      }

      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUpdateClient = async (
    client: Client,
    changes: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    setBusyClientId(client.id);
    setActionError(null);
    try {
      const res = await onUpdateClient(client.id, {
        ...toClientPayload(client),
        ...changes,
      });
      if (!res.success) {
        setActionError(res.error || 'No se pudo actualizar el cliente en Supabase.');
      }
    } finally {
      setBusyClientId(null);
    }
  };

  const openPaymentModal = (client: Client, promoteToActive = false) => {
    const today = getTodayISO();
    const cycle = client.billingCycle || 'mensual';
    const suggestedAmount =
      promoteToActive && client.setupFee && client.setupFee > 0
        ? client.setupFee
        : client.monthlyFee || 0;

    setPaymentModalClient(client);
    setPaymentPromoteToActive(promoteToActive);
    setPaymentAmount(suggestedAmount > 0 ? String(suggestedAmount) : '');
    setPaymentDate(today);
    setPaymentCycle(cycle);
    setPaymentNextDate(suggestNextPaymentDate(today, cycle));
    setPaymentNotes(promoteToActive ? 'Pago inicial / anticipo de desarrollo' : 'Pago de mensualidad / ciclo');
    setActionError(null);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalClient || !paymentNextDate || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    const amountNum = Number(paymentAmount) || 0;
    const newRecord: ClientPaymentRecord = {
      id: `pay-${Date.now()}`,
      date: paymentDate || getTodayISO(),
      amount: amountNum,
      nextPaymentDate: paymentNextDate,
      notes: paymentNotes.trim() || undefined,
    };

    const nextSegment: ClientSegment = paymentPromoteToActive
      ? 'active'
      : paymentModalClient.segment;

    const payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      ...toClientPayload(paymentModalClient),
      segment: nextSegment,
      devStage: paymentPromoteToActive ? 'onboarding' : paymentModalClient.devStage,
      devProgress: paymentPromoteToActive ? 20 : paymentModalClient.devProgress,
      billingCycle: paymentCycle,
      paymentStatus: 'up_to_date',
      lastPaymentDate: paymentDate || getTodayISO(),
      nextPaymentDate: paymentNextDate,
      paymentHistory: [newRecord, ...(paymentModalClient.paymentHistory || [])],
    };

    try {
      const res = await onUpdateClient(paymentModalClient.id, payload);
      if (!res.success) {
        setActionError(res.error || 'No se pudo registrar el pago en Supabase.');
        return;
      }
      setPaymentModalClient(null);
      if (paymentPromoteToActive) {
        setActiveSubTab('active');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (client: Client) => {
    const today = getTodayISO();
    setReviewModalClient(client);
    setReviewDate(today);
    setReviewSales(client.lastSalesAmount !== undefined ? String(client.lastSalesAmount) : '');
    setReviewInventory(client.lastInventoryNote || '');
    setReviewNotes('');
    setReviewNextMeetingDate(addToIsoDate(today, { months: 1 }));
    setActionError(null);
  };

  const handleConfirmMonthlyReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalClient || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    const salesNum = Number(reviewSales) || 0;
    const newReview: ClientMonthlyReview = {
      id: `rev-${Date.now()}`,
      date: reviewDate || getTodayISO(),
      salesAmount: salesNum,
      inventoryStatus: reviewInventory.trim() || 'Sin novedades',
      notes: reviewNotes.trim(),
    };

    const payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      ...toClientPayload(reviewModalClient),
      lastSalesAmount: salesNum,
      lastInventoryNote: reviewInventory.trim(),
      nextMeetingDate: reviewNextMeetingDate || reviewModalClient.nextMeetingDate,
      monthlyReviews: [newReview, ...(reviewModalClient.monthlyReviews || [])],
    };

    try {
      const res = await onUpdateClient(reviewModalClient.id, payload);
      if (!res.success) {
        setActionError(res.error || 'No se pudo guardar la revisión mensual en Supabase.');
        return;
      }
      setReviewModalClient(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (clientId: string) => {
    setBusyClientId(clientId);
    setActionError(null);
    try {
      const res = await onDeleteClient(clientId);
      if (!res.success) {
        setActionError(res.error || 'No se pudo eliminar el cliente en Supabase.');
      } else {
        setConfirmDeleteId(null);
      }
    } finally {
      setBusyClientId(null);
    }
  };

  const subTabs: { id: ClientsSubTab; label: string; count: number; icon: React.ComponentType<any> }[] = [
    { id: 'prospects', label: 'Prospectos de Clientes', count: stats.prospects, icon: UserPlus },
    { id: 'active', label: 'Clientes Activos', count: stats.active, icon: Briefcase },
    { id: 'followup', label: 'Clientes de Seguimiento', count: stats.followup, icon: BarChart3 },
    { id: 'receivables', label: 'Cuentas por Cobrar', count: stats.receivablesCount, icon: CreditCard },
  ];

  const getPaymentBadge = (client: Client) => {
    const diff = getDaysDiffFromToday(client.nextPaymentDate);
    const isOverdue =
      client.paymentStatus === 'overdue' || (client.segment !== 'prospect' && diff !== null && diff < 0);
    const isDueToday = client.segment !== 'prospect' && diff === 0;
    const isPending = client.paymentStatus === 'pending';

    if (isOverdue) {
      const daysLate = diff !== null && diff < 0 ? Math.abs(diff) : null;
      return (
        <span className="text-[11px] font-mono font-semibold text-rose-400 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{daysLate ? `Vencido (${daysLate}d)` : 'Vencido'}</span>
        </span>
      );
    }
    if (isDueToday || isPending) {
      return (
        <span className="text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{isDueToday ? 'Vence hoy' : 'Pago pendiente'}</span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Al día</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101827] p-6 rounded-2xl border border-[#00F0FF]/30 shadow-[0_0_25px_rgba(0,240,255,0.08)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF]">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight font-sans">
              Gestión de Clientes
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Flujo de software, notificaciones WhatsApp, seguimiento mensual y pagos cíclicos en Supabase
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQuotePhone('');
              setIsQuoteModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Enviar o copiar cotización oficial de planes e-prime"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Cotización WA</span>
          </button>
          <button
            type="button"
            onClick={() => onRefreshClients()}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-slate-800 hover:border-[#00F0FF]/50 text-slate-300 hover:text-[#00F0FF] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title="Sincronizar desde Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)] cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Supabase Table Missing / Cloud Error Banners */}
      {tableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Falta crear la tabla <code className="font-mono">public.clients</code> en Supabase
              </p>
              <p className="text-slate-300 mt-0.5">
                Pega y ejecuta el script SQL de clientes en el SQL Editor de Supabase para habilitar la sincronización 100% en la nube.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRefreshClients()}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            Reintentar conexión
          </button>
        </div>
      )}

      {(cloudError || actionError) && !tableMissing && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{actionError || cloudError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-300 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#101827]/85 p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Prospectos</span>
          <div className="text-2xl font-black text-slate-100 tabular-nums">{stats.prospects}</div>
        </div>
        <div className="bg-[#101827]/85 p-4 rounded-xl border border-[#00F0FF]/30 space-y-1">
          <span className="text-xs text-[#00F0FF] font-medium block">Clientes Activos</span>
          <div className="text-2xl font-black text-[#00F0FF] tabular-nums">{stats.active}</div>
        </div>
        <div className="bg-[#101827]/85 p-4 rounded-xl border border-emerald-500/30 space-y-1">
          <span className="text-xs text-emerald-400 font-medium block">En Seguimiento</span>
          <div className="text-2xl font-black text-emerald-400 tabular-nums">{stats.followup}</div>
        </div>
        <div className="bg-[#101827]/85 p-4 rounded-xl border border-rose-500/30 space-y-1">
          <span className="text-xs text-rose-400 font-medium block">
            Por Cobrar ({stats.receivablesCount})
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums truncate">
            {formatMoney(stats.totalReceivable, stats.primaryCurrency)}
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation & Search */}
      <div className="bg-[#101827]/75 p-3 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/50'
                    : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                <span className="text-[11px] opacity-80 tabular-nums">({tab.count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente por nombre, negocio, app o teléfono..."
            className="w-full pl-9 pr-4 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#00F0FF] placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Sub-tab Contextual Description */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-400">
        {activeSubTab === 'prospects' && (
          <span>
            Mapea en qué paso del proceso comercial está cada prospecto y envíale su estado por WhatsApp en un clic.
          </span>
        )}
        {activeSubTab === 'active' && (
          <span>
            Clientes que ya realizaron el pago y cuya app se encuentra en desarrollo activo.
          </span>
        )}
        {activeSubTab === 'followup' && (
          <span>
            Clientes con app en producción para reuniones mensuales de revisión de ventas e inventario.
          </span>
        )}
        {activeSubTab === 'receivables' && (
          <span>
            Clientes con pagos vencidos o pendientes. Al registrar un pago puedes elegir exactamente la fecha del siguiente ciclo.
          </span>
        )}
      </div>

      {/* Client Cards Grid */}
      {displayedClients.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedClients.map((client) => {
            const isBusy = busyClientId === client.id;
            const isReadyForDelivery =
              client.devStage === 'capacitacion_entrega' || client.devProgress >= 90;
            const waKind: WhatsAppTemplateKind =
              activeSubTab === 'receivables'
                ? 'payment'
                : activeSubTab === 'followup'
                ? 'manager_meeting'
                : activeSubTab === 'active'
                ? isReadyForDelivery
                  ? 'ready_day2'
                  : 'setup_day0'
                : 'welcome_diagnostic';
            const waMessage = buildClientStatusMessage(client, waKind, senderName);
            const waUrl = buildWhatsAppUrl(client.phone, waMessage);
            const waQuoteMessage = buildClientStatusMessage(client, 'quote', senderName);
            const waQuoteUrl = buildWhatsAppUrl(client.phone, waQuoteMessage);
            const waDay0Message = buildClientStatusMessage(client, 'setup_day0', senderName);
            const waDay0Url = buildWhatsAppUrl(client.phone, waDay0Message);
            const waDay2Message = buildClientStatusMessage(client, 'ready_day2', senderName);
            const waDay2Url = buildWhatsAppUrl(client.phone, waDay2Message);
            const copyKey = `${client.id}-${waKind}`;
            const isHistoryOpen = Boolean(expandedHistoryIds[client.id]);

            const currentProspectIdx = PROSPECT_STAGES.findIndex(
              (s) => s.id === client.prospectStage
            );
            const currentDevIdx = DEV_STAGES.findIndex((s) => s.id === client.devStage);

            return (
              <div
                key={client.id}
                className={`bg-[#101827]/95 rounded-2xl border border-slate-800 hover:border-[#00F0FF]/40 transition-all p-5 space-y-4 flex flex-col justify-between ${
                  isBusy ? 'opacity-65 pointer-events-none' : ''
                }`}
              >
                {/* Top Info & Actions */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-100 truncate">
                          {client.name}
                        </h3>
                        {client.company && (
                          <span className="text-xs text-slate-400 truncate">
                            · {client.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        {client.projectName && (
                          <span className="text-[#00F0FF] font-semibold">
                            App: {client.projectName}
                          </span>
                        )}
                        {client.projectName && client.phone && <span aria-hidden="true">·</span>}
                        {client.phone && (
                          <span className="font-mono tabular-nums">{client.phone}</span>
                        )}
                        {client.segment !== 'prospect' && (
                          <>
                            <span aria-hidden="true">·</span>
                            {getPaymentBadge(client)}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === client.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(client.id)}
                            className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold cursor-pointer"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(client.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PROSPECTOS: Visual 5-stage client flow mapper */}
                  {activeSubTab === 'prospects' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">
                          Flujo del Prospecto
                        </span>
                        <span className="text-[#00F0FF] font-bold tabular-nums">
                          Paso {Math.max(1, currentProspectIdx + 1)}/{PROSPECT_STAGES.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {PROSPECT_STAGES.map((stage, idx) => {
                          const isCurrent = stage.id === client.prospectStage;
                          const isPassed = idx < currentProspectIdx;
                          return (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() =>
                                handleQuickUpdateClient(client, { prospectStage: stage.id })
                              }
                              className={`px-1.5 py-2 rounded-lg text-[10px] font-bold transition-all text-center border cursor-pointer truncate ${
                                isCurrent
                                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/60'
                                  : isPassed
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                  : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                              }`}
                              title={stage.label}
                            >
                              {stage.shortLabel}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>
                          Cotización / Mensualidad:{' '}
                          <strong className="text-slate-200 tabular-nums">
                            {formatMoney(client.monthlyFee, client.currency)}
                          </strong>
                        </span>
                        {client.setupFee && client.setupFee > 0 ? (
                          <span>
                            Inicial:{' '}
                            <strong className="text-slate-200 tabular-nums">
                              {formatMoney(client.setupFee, client.currency)}
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* CLIENTES ACTIVOS: Development stage tracker + cyclic payment date */}
                  {activeSubTab === 'active' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-300">
                          Desarrollo de la App
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00F0FF] font-black tabular-nums">
                            {client.devProgress}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setProjectWorkspaceClientId(client.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/45 text-[#00F0FF] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                            title="Abrir el paso a paso del proyecto, tareas mías/del cliente y notas"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>
                              Abrir Proyecto
                              {client.projectSteps && client.projectSteps.length > 0
                                ? ` (${calculateClientProjectMetrics(client.projectSteps).completed}/${calculateClientProjectMetrics(client.projectSteps).total})`
                                : ''}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#0A0D14] border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00F0FF] to-[#10B981] transition-all duration-300"
                          style={{ width: `${client.devProgress}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {DEV_STAGES.map((stage, idx) => {
                          const isCurrent = stage.id === client.devStage;
                          const isPassed = idx < currentDevIdx;
                          return (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() =>
                                handleQuickUpdateClient(client, {
                                  devStage: stage.id,
                                  devProgress: stage.progress,
                                })
                              }
                              className={`px-1.5 py-2 rounded-lg text-[10px] font-bold transition-all text-center border cursor-pointer truncate ${
                                isCurrent
                                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/60'
                                  : isPassed
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                  : 'bg-[#0A0D14] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                              }`}
                              title={`${stage.label} (${stage.progress}%)`}
                            >
                              {stage.shortLabel}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <strong className="text-slate-200 tabular-nums">
                            {formatMoney(client.monthlyFee, client.currency)}
                          </strong>
                          <span>/ {client.billingCycle}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Siguiente pago:{' '}
                          <strong className="text-slate-200 tabular-nums">
                            {formatDateFriendly(client.nextPaymentDate)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CLIENTES DE SEGUIMIENTO: Monthly Sales & Inventory Reviews */}
                  {activeSubTab === 'followup' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-slate-800">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-400" /> Últimas Ventas
                          </span>
                          <div className="text-sm font-bold text-slate-100 mt-0.5 tabular-nums">
                            {client.lastSalesAmount !== undefined
                              ? formatMoney(client.lastSalesAmount, client.currency)
                              : 'Sin registrar'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-slate-800">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Package className="w-3 h-3 text-[#00F0FF]" /> Inventario
                          </span>
                          <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                            {client.lastInventoryNote || 'Sin registrar'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#00F0FF]" />
                          Próxima reunión:{' '}
                          <strong className="text-slate-200 tabular-nums">
                            {formatDateFriendly(client.nextMeetingDate)}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          Siguiente pago:{' '}
                          <strong className="text-slate-200 tabular-nums">
                            {formatDateFriendly(client.nextPaymentDate)}
                          </strong>
                        </span>
                      </div>

                      {client.monthlyReviews && client.monthlyReviews.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistoryIds((prev) => ({
                                ...prev,
                                [client.id]: !prev[client.id],
                              }))
                            }
                            className="text-xs text-[#00F0FF] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            {isHistoryOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>
                              Historial de reuniones ({client.monthlyReviews.length})
                            </span>
                          </button>

                          {isHistoryOpen && (
                            <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {client.monthlyReviews.map((rev) => (
                                <li
                                  key={rev.id}
                                  className="p-2.5 rounded-xl bg-[#0A0D14] border border-slate-800 text-xs space-y-0.5"
                                >
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-slate-300 tabular-nums">
                                      {formatDateFriendly(rev.date)}
                                    </span>
                                    <span className="text-emerald-400 tabular-nums">
                                      Ventas: {formatMoney(rev.salesAmount, client.currency)}
                                    </span>
                                  </div>
                                  <div className="text-slate-400">
                                    Inventario: {rev.inventoryStatus}
                                  </div>
                                  {rev.notes && (
                                    <div className="text-slate-500 text-[11px]">{rev.notes}</div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CUENTAS POR COBRAR: Overdue/pending amount + cyclic next payment control */}
                  {activeSubTab === 'receivables' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0D14] border border-rose-500/30">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Monto pendiente</span>
                          <span className="text-lg font-black text-rose-400 tabular-nums">
                            {formatMoney(client.monthlyFee, client.currency)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">
                            Fecha de vencimiento ({client.billingCycle})
                          </span>
                          <span className="text-xs font-bold text-slate-200 tabular-nums">
                            {formatDateFriendly(client.nextPaymentDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>
                          Último pago:{' '}
                          <strong className="text-slate-200 tabular-nums">
                            {formatDateFriendly(client.lastPaymentDate)}
                          </strong>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]">Estado:</span>
                          <select
                            value={client.paymentStatus}
                            onChange={(e) =>
                              handleQuickUpdateClient(client, {
                                paymentStatus: e.target.value as PaymentStatus,
                              })
                            }
                            className="bg-[#0A0D14] border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-[#00F0FF]"
                          >
                            <option value="overdue">Vencido</option>
                            <option value="pending">Pendiente</option>
                            <option value="up_to_date">Al día</option>
                          </select>
                        </div>
                      </div>

                      {client.paymentHistory && client.paymentHistory.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistoryIds((prev) => ({
                                ...prev,
                                [client.id]: !prev[client.id],
                              }))
                            }
                            className="text-xs text-[#00F0FF] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            {isHistoryOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>Historial de pagos ({client.paymentHistory.length})</span>
                          </button>

                          {isHistoryOpen && (
                            <ul className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {client.paymentHistory.map((pay) => (
                                <li
                                  key={pay.id}
                                  className="p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs flex items-center justify-between gap-2"
                                >
                                  <span className="text-slate-300 tabular-nums">
                                    {formatDateFriendly(pay.date)} → Próx:{' '}
                                    {formatDateFriendly(pay.nextPaymentDate)}
                                  </span>
                                  <span className="text-emerald-400 font-bold tabular-nums">
                                    {formatMoney(pay.amount, client.currency)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {client.notes}
                    </p>
                  )}
                </div>

                {/* Action Bar: WhatsApp Flow Buttons + Sub-tab Primary Action */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  {/* WhatsApp & Copy controls */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeSubTab === 'prospects' && (
                      <>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          title="Enviar mensaje de Bienvenida y Diagnóstico (15 min) por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>WA Bienvenida</span>
                        </a>
                        <a
                          href={waQuoteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          title="Enviar cotización oficial de los 3 planes e-prime + Cupo Fundador"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>WA Cotización</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(copyKey, waMessage)}
                          className="p-2 rounded-xl bg-[#0A0D14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar mensaje de Bienvenida y Diagnóstico"
                        >
                          {copiedId === copyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}

                    {activeSubTab === 'active' && (
                      <>
                        <a
                          href={waDay0Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                            !isReadyForDelivery
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400'
                              : 'bg-[#0A0D14] hover:bg-emerald-500/15 border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400'
                          }`}
                          title="Enviar Confirmación de Montaje (Día 0, tras recibir pago, logo y precios)"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>WA Día 0 Montaje</span>
                        </a>
                        <a
                          href={waDay2Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                            isReadyForDelivery
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400'
                              : 'bg-[#0A0D14] hover:bg-emerald-500/15 border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400'
                          }`}
                          title="Enviar Sistema Listo para Entregar (Día 2)"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>WA Día 2 Listo</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(copyKey, waMessage)}
                          className="p-2 rounded-xl bg-[#0A0D14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title={
                            isReadyForDelivery
                              ? 'Copiar mensaje de Sistema Listo (Día 2)'
                              : 'Copiar mensaje de Confirmación de Montaje (Día 0)'
                          }
                        >
                          {copiedId === copyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}

                    {(activeSubTab === 'followup' || activeSubTab === 'receivables') && (
                      <>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          title={
                            activeSubTab === 'followup'
                              ? 'Enviar Recordatorio de Reunión con el Gerente de e-prime'
                              : 'Enviar recordatorio de cobro por WhatsApp'
                          }
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {activeSubTab === 'followup'
                              ? 'WA Reunión Gerente'
                              : 'WA Cobro'}
                          </span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(copyKey, waMessage)}
                          className="p-2 rounded-xl bg-[#0A0D14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar mensaje de WhatsApp"
                        >
                          {copiedId === copyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Contextual Workflow Transition / Payment Action */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeSubTab === 'prospects' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setProjectWorkspaceClientId(client.id)}
                          className="px-3 py-2 rounded-xl bg-[#0A0D14] hover:border-[#00F0FF]/50 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Abrir Proyecto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPaymentModal(client, true)}
                          className="px-3 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Pagó → Activar</span>
                        </button>
                      </>
                    )}

                    {activeSubTab === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openPaymentModal(client, false)}
                          className="px-3 py-2 rounded-xl bg-[#0A0D14] hover:border-[#00F0FF]/50 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Registrar Pago</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickUpdateClient(client, {
                              segment: 'followup',
                              devStage: 'capacitacion_entrega',
                              devProgress: 100,
                              nextMeetingDate:
                                client.nextMeetingDate ||
                                addToIsoDate(getTodayISO(), { months: 1 }),
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>A Seguimiento</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {activeSubTab === 'followup' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setProjectWorkspaceClientId(client.id)}
                          className="px-3 py-2 rounded-xl bg-[#0A0D14] hover:border-[#00F0FF]/50 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Abrir Proyecto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPaymentModal(client, false)}
                          className="px-3 py-2 rounded-xl bg-[#0A0D14] hover:border-[#00F0FF]/50 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Pago</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openReviewModal(client)}
                          className="px-3 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Registrar Revisión</span>
                        </button>
                      </>
                    )}

                    {activeSubTab === 'receivables' && (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(client, false)}
                        className="px-3.5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Registrar Pago</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center bg-[#101827]/70 border border-dashed border-slate-800 rounded-2xl text-slate-400 space-y-3">
          <Users className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">
            {searchQuery.trim()
              ? 'No se encontraron clientes con esa búsqueda.'
              : activeSubTab === 'prospects'
              ? 'Aún no tienes prospectos de clientes registrados.'
              : activeSubTab === 'active'
              ? 'No hay clientes activos en desarrollo todavía.'
              : activeSubTab === 'followup'
              ? 'No tienes clientes en seguimiento mensual todavía.'
              : 'Excelente: no hay cuentas por cobrar pendientes.'}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {activeSubTab === 'receivables'
                ? 'Registrar Cuenta por Cobrar'
                : 'Agregar Cliente'}
            </span>
          </button>
        </div>
      )}

      {/* Modal 1: Add / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#101827] border border-[#00F0FF]/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="text-base font-bold text-slate-100">
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Carlos Pérez"
                    className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Negocio / Empresa
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Ej: Distribuidora del Norte"
                    className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp (con código país) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej: 573001234567"
                    className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre de la App / Software
                  </label>
                  <input
                    type="text"
                    value={formProjectName}
                    onChange={(e) => setFormProjectName(e.target.value)}
                    placeholder="Ej: App de Ventas e Inventario"
                    className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo (opcional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              {/* Segment & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoría del Cliente
                  </label>
                  <select
                    value={formSegment}
                    onChange={(e) => setFormSegment(e.target.value as ClientSegment)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="prospect">Prospecto de Cliente</option>
                    <option value="active">Cliente Activo (En desarrollo)</option>
                    <option value="followup">Cliente de Seguimiento (Reunión mensual)</option>
                  </select>
                </div>

                {formSegment === 'prospect' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estado del Prospecto
                    </label>
                    <select
                      value={formProspectStage}
                      onChange={(e) => setFormProspectStage(e.target.value as ProspectStage)}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    >
                      {PROSPECT_STAGES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : formSegment === 'active' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Etapa de Desarrollo
                    </label>
                    <select
                      value={formDevStage}
                      onChange={(e) => {
                        const nextStage = e.target.value as DevelopmentStage;
                        setFormDevStage(nextStage);
                        const match = DEV_STAGES.find((s) => s.id === nextStage);
                        if (match) setFormDevProgress(match.progress);
                      }}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    >
                      {DEV_STAGES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label} ({st.progress}%)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Próxima Reunión Mensual
                    </label>
                    <input
                      type="date"
                      value={formNextMeetingDate}
                      onChange={(e) => setFormNextMeetingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                )}
              </div>

              {/* Cyclic Payments & Fees */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <span className="text-xs font-bold text-[#00F0FF] block">
                  Pagos Cíclicos y Cobranza
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Moneda
                    </label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    >
                      <option value="COP">COP ($)</option>
                      <option value="USD">USD ($)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Valor Recurrente
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formMonthlyFee}
                      onChange={(e) => setFormMonthlyFee(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pago Inicial (Setup)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formSetupFee}
                      onChange={(e) => setFormSetupFee(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Ciclo de Pago
                    </label>
                    <select
                      value={formBillingCycle}
                      onChange={(e) => {
                        const nextCycle = e.target.value as BillingCycle;
                        setFormBillingCycle(nextCycle);
                        if (nextCycle !== 'personalizado') {
                          setFormNextPaymentDate(suggestNextPaymentDate(getTodayISO(), nextCycle));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    >
                      {BILLING_CYCLES.map((bc) => (
                        <option key={bc.id} value={bc.id}>
                          {bc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fecha del Siguiente Pago
                    </label>
                    <input
                      type="date"
                      value={formNextPaymentDate}
                      onChange={(e) => setFormNextPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estado de Pago
                    </label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                    >
                      <option value="up_to_date">Al día</option>
                      <option value="pending">Pendiente (Cuentas por Cobrar)</option>
                      <option value="overdue">Vencido (Cuentas por Cobrar)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas / Alcance / Acuerdos
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Dolor principal del negocio, pantallas solicitadas, observaciones..."
                  className="w-full px-3.5 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar en Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Register Payment & Pick Next Cyclic Payment Date */}
      {paymentModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#101827] border border-[#00F0FF]/40 rounded-2xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="text-base font-bold text-slate-100">
                  {paymentPromoteToActive
                    ? 'Registrar Pago y Activar Cliente'
                    : 'Registrar Pago Cíclico'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cliente: <strong className="text-slate-100">{paymentModalClient.name}</strong>
              {paymentModalClient.projectName ? ` · ${paymentModalClient.projectName}` : ''}
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Monto Recibido ({paymentModalClient.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha del Pago Hoy
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  ¿Cuándo será el siguiente pago? *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+15 días', cycle: 'quincenal' as BillingCycle, opts: { days: 15 } },
                    { label: '+1 mes', cycle: 'mensual' as BillingCycle, opts: { months: 1 } },
                    { label: '+3 meses', cycle: 'trimestral' as BillingCycle, opts: { months: 3 } },
                    { label: '+6 meses', cycle: 'semestral' as BillingCycle, opts: { months: 6 } },
                    { label: '+1 año', cycle: 'anual' as BillingCycle, opts: { months: 12 } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setPaymentCycle(preset.cycle);
                        setPaymentNextDate(addToIsoDate(paymentDate || getTodayISO(), preset.opts));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0A0D14] hover:bg-[#00F0FF]/15 border border-slate-800 hover:border-[#00F0FF]/50 text-[11px] font-semibold text-slate-300 hover:text-[#00F0FF] transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  required
                  value={paymentNextDate}
                  onChange={(e) => {
                    setPaymentNextDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nota del pago (opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej: Transferencia Bancolombia / Nequi..."
                  className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalClient(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !paymentNextDate}
                  className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Monthly Follow-up Review (Sales & Inventory) */}
      {reviewModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#101827] border border-[#00F0FF]/40 rounded-2xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="text-base font-bold text-slate-100">
                  Revisión Mensual (Ventas e Inventario)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cliente: <strong className="text-slate-100">{reviewModalClient.name}</strong>
              {reviewModalClient.company ? ` · ${reviewModalClient.company}` : ''}
            </p>

            <form onSubmit={handleConfirmMonthlyReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha de Reunión
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ventas del Mes ({reviewModalClient.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={reviewSales}
                    onChange={(e) => setReviewSales(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estado del Inventario *
                </label>
                <input
                  type="text"
                  required
                  value={reviewInventory}
                  onChange={(e) => setReviewInventory(e.target.value)}
                  placeholder="Ej: Stock sano, 3 referencias agotadas por reponer"
                  className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observaciones / Acciones acordadas
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Hallazgos de ventas, productos más vendidos, ajustes..."
                  className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fecha de la Próxima Reunión Mensual
                </label>
                <input
                  type="date"
                  value={reviewNextMeetingDate}
                  onChange={(e) => setReviewNextMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalClient(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-[#0A0D14] font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Revisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cotización Oficial e-prime (WhatsApp rápido / Copiar) */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101827] border border-emerald-500/40 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Cotización Oficial e-prime
                  </h2>
                  <p className="text-xs text-slate-400">
                    Envía los 3 planes mensuales y el Beneficio Cupo Fundador por WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp del cliente (opcional)
              </label>
              <input
                type="tel"
                value={quotePhone}
                onChange={(e) => setQuotePhone(e.target.value)}
                placeholder="Ej: 573001234567 (si lo dejas vacío, eliges el contacto en WhatsApp)"
                className="w-full px-3 py-2 bg-[#0A0D14] border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto">
              {E_PRIME_QUOTE_MESSAGE}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleCopyMessage('global-eprime-quote', E_PRIME_QUOTE_MESSAGE)}
                className="px-4 py-2 rounded-xl bg-[#0A0D14] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'global-eprime-quote' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
              <a
                href={buildWhatsAppUrl(quotePhone, E_PRIME_QUOTE_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A0D14] font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Proyecto del Cliente (Paso a Paso, Mis Tareas vs Cliente, Notas) */}
      {activeProjectClient && (
        <ClientProjectWorkspaceModal
          client={activeProjectClient}
          onClose={() => setProjectWorkspaceClientId(null)}
          onSaveProjectSteps={handleSaveClientProjectSteps}
        />
      )}
    </div>
  );
};
