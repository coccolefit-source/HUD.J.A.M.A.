import { supabase, isSupabaseConfigured } from './supabase';
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
} from '../types';

export interface ClientsCloudResult<T = Client> {
  success: boolean;
  data?: T;
  error?: string;
  tableMissing?: boolean;
}

function isTableMissingError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || error?.details || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('Could not find the table') ||
    msg.includes('relation "public.clients" does not exist') ||
    msg.includes('relation "clients" does not exist')
  );
}

function isProjectStepsColumnMissingError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || error?.details || '');
  return (
    (code === '42703' || code === 'PGRST204') &&
    msg.includes('project_steps')
  );
}

function mapRowToClient(row: any): Client {
  const validSegments: ClientSegment[] = ['prospect', 'active', 'followup'];
  const validProspectStages: ProspectStage[] = [
    'contacto_inicial',
    'diagnostico',
    'propuesta_enviada',
    'negociacion',
    'listo_para_pago',
  ];
  const validDevStages: DevelopmentStage[] = [
    'onboarding',
    'diseno_ux',
    'desarrollo_mvp',
    'pruebas_qa',
    'capacitacion_entrega',
  ];
  const validPaymentStatuses: PaymentStatus[] = ['up_to_date', 'pending', 'overdue'];
  const validCycles: BillingCycle[] = [
    'mensual',
    'quincenal',
    'trimestral',
    'semestral',
    'anual',
    'personalizado',
  ];

  const segment: ClientSegment = validSegments.includes(row.segment) ? row.segment : 'prospect';
  const prospectStage: ProspectStage = validProspectStages.includes(row.prospect_stage)
    ? row.prospect_stage
    : 'contacto_inicial';
  const devStage: DevelopmentStage = validDevStages.includes(row.dev_stage)
    ? row.dev_stage
    : 'onboarding';
  const paymentStatus: PaymentStatus = validPaymentStatuses.includes(row.payment_status)
    ? row.payment_status
    : 'up_to_date';
  const billingCycle: BillingCycle = validCycles.includes(row.billing_cycle)
    ? row.billing_cycle
    : 'mensual';

  const monthlyReviews: ClientMonthlyReview[] = Array.isArray(row.monthly_reviews)
    ? row.monthly_reviews
    : [];
  const paymentHistory: ClientPaymentRecord[] = Array.isArray(row.payment_history)
    ? row.payment_history
    : [];
  const projectSteps: ClientProjectStep[] = Array.isArray(row.project_steps)
    ? row.project_steps
    : [];

  return {
    id: String(row.id),
    name: row.name || 'Cliente sin nombre',
    company: row.company || '',
    phone: row.phone || '',
    email: row.email || '',
    projectName: row.project_name || '',
    segment,
    prospectStage,
    devStage,
    devProgress: typeof row.dev_progress === 'number' ? row.dev_progress : 0,
    monthlyFee: typeof row.monthly_fee === 'number' ? row.monthly_fee : Number(row.monthly_fee || 0),
    setupFee:
      row.setup_fee !== null && row.setup_fee !== undefined
        ? Number(row.setup_fee)
        : 0,
    currency: row.currency || 'USD',
    billingCycle,
    paymentStatus,
    lastPaymentDate: row.last_payment_date || undefined,
    nextPaymentDate: row.next_payment_date || undefined,
    nextMeetingDate: row.next_meeting_date || undefined,
    lastSalesAmount:
      row.last_sales_amount !== null && row.last_sales_amount !== undefined
        ? Number(row.last_sales_amount)
        : undefined,
    lastInventoryNote: row.last_inventory_note || '',
    notes: row.notes || '',
    monthlyReviews,
    paymentHistory,
    projectSteps,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapClientToPayload(
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  includeProjectSteps = true
) {
  const base: Record<string, any> = {
    user_id: userId,
    name: client.name.trim(),
    company: client.company?.trim() || null,
    phone: client.phone.trim(),
    email: client.email?.trim() || null,
    project_name: client.projectName?.trim() || null,
    segment: client.segment,
    prospect_stage: client.prospectStage,
    dev_stage: client.devStage,
    dev_progress: Math.max(0, Math.min(100, Number(client.devProgress || 0))),
    monthly_fee: Number(client.monthlyFee || 0),
    setup_fee: Number(client.setupFee || 0),
    currency: client.currency || 'USD',
    billing_cycle: client.billingCycle || 'mensual',
    payment_status: client.paymentStatus || 'up_to_date',
    last_payment_date: client.lastPaymentDate || null,
    next_payment_date: client.nextPaymentDate || null,
    next_meeting_date: client.nextMeetingDate || null,
    last_sales_amount:
      client.lastSalesAmount !== undefined && !Number.isNaN(client.lastSalesAmount)
        ? Number(client.lastSalesAmount)
        : null,
    last_inventory_note: client.lastInventoryNote?.trim() || null,
    notes: client.notes?.trim() || null,
    monthly_reviews: Array.isArray(client.monthlyReviews) ? client.monthlyReviews : [],
    payment_history: Array.isArray(client.paymentHistory) ? client.paymentHistory : [],
  };

  if (includeProjectSteps && Array.isArray(client.projectSteps) && client.projectSteps.length > 0) {
    base.project_steps = client.projectSteps;
  }

  return base;
}

/**
 * 100% Cloud-only fetch from Supabase public.clients (NO localStorage)
 */
export async function fetchCloudClients(userId?: string): Promise<ClientsCloudResult<Client[]>> {
  if (!isSupabaseConfigured) {
    return { success: false, data: [], error: 'Supabase no está configurado.' };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      return { success: false, data: [], error: 'Usuario no autenticado en Supabase.' };
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar clientes desde Supabase:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Error al cargar clientes desde Supabase',
        tableMissing: isTableMissingError(error),
      };
    }

    return {
      success: true,
      data: (data || []).map(mapRowToClient),
    };
  } catch (err: any) {
    console.error('Error imprevisto al cargar clientes:', err);
    return {
      success: false,
      data: [],
      error: err?.message || 'Error de conexión con Supabase',
    };
  }
}

export async function createCloudClient(
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ClientsCloudResult<Client>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para guardar clientes en la nube.' };
    }

    const payload = mapClientToPayload(client, user.id, true);
    let { data, error } = await supabase.from('clients').insert([payload]).select().single();

    if (error && isProjectStepsColumnMissingError(error)) {
      const fallbackPayload = mapClientToPayload(client, user.id, false);
      const retry = await supabase.from('clients').insert([fallbackPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Error al crear cliente en Supabase:', error);
      return {
        success: false,
        error: error.message || 'No se pudo crear el cliente en Supabase.',
        tableMissing: isTableMissingError(error),
      };
    }

    return {
      success: true,
      data: mapRowToClient(data),
    };
  } catch (err: any) {
    console.error('Error imprevisto al crear cliente:', err);
    return { success: false, error: err?.message || 'Error al crear cliente en Supabase.' };
  }
}

export async function updateCloudClient(
  clientId: string,
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ClientsCloudResult<Client>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para actualizar clientes en la nube.' };
    }

    const payload = {
      ...mapClientToPayload(client, user.id, true),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', clientId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (isProjectStepsColumnMissingError(error)) {
        return {
          success: false,
          error:
            'Falta agregar la columna project_steps en Supabase. Ejecuta el SQL ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_steps jsonb NOT NULL DEFAULT \'[]\'::jsonb;',
        };
      }
      console.error('Error al actualizar cliente en Supabase:', error);
      return {
        success: false,
        error: error.message || 'No se pudo actualizar el cliente en Supabase.',
        tableMissing: isTableMissingError(error),
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Supabase rechazó la actualización del cliente (revisa políticas RLS de UPDATE).',
      };
    }

    return {
      success: true,
      data: mapRowToClient(data),
    };
  } catch (err: any) {
    console.error('Error imprevisto al actualizar cliente:', err);
    return { success: false, error: err?.message || 'Error al actualizar cliente.' };
  }
}

export async function deleteCloudClient(clientId: string): Promise<ClientsCloudResult<null>> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no está configurado.' };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para eliminar clientes.' };
    }

    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      console.error('Error al eliminar cliente en Supabase:', error);
      return {
        success: false,
        error: error.message || 'No se pudo eliminar el cliente en Supabase.',
        tableMissing: isTableMissingError(error),
      };
    }

    if (!data || data.length === 0) {
      const { data: stillExists } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();

      if (stillExists) {
        return {
          success: false,
          error: 'Supabase rechazó eliminar el cliente (revisa políticas RLS de DELETE).',
        };
      }
    }

    return { success: true, data: null };
  } catch (err: any) {
    console.error('Error imprevisto al eliminar cliente:', err);
    return { success: false, error: err?.message || 'Error al eliminar cliente.' };
  }
}
