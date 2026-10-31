import { supabase, isSupabaseConfigured } from './supabase';
import { createCloudTask } from './supabaseTasks';
import { Project } from '../types';
import { TabType } from '../components/Sidebar';

export interface AgentResult {
  type: 'crear_tarea' | 'consultar_pendientes' | 'navegar' | 'chat';
  message: string;
  source?: string;
  details?: any;
}

// Global audio player reference to allow interrupting
let currentAudio: HTMLAudioElement | null = null;

export function stopCurrentSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Holographic HUD chirp on wake word detection
 */
export function playJarvisWakeChirp() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // ignore
  }
}

/**
 * Format date into Spanish weekday and month name
 */
export function formatSpanishDate(dateStr: string): { diaSemana: string; diaMes: string; full: string } {
  try {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const diaSemana = weekdays[date.getDay()];
    const diaMes = `${day} de ${months[month - 1]}`;
    return {
      diaSemana,
      diaMes,
      full: `${diaSemana} ${diaMes}`
    };
  } catch (e) {
    return { diaSemana: 'fecha', diaMes: dateStr, full: dateStr };
  }
}

/**
 * ElevenLabs Speech Synthesis with seamless Web Speech API fallback
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  stopCurrentSpeech();

  if (!text || text.trim() === '') return;

  try {
    const savedVoiceId = typeof window !== 'undefined' ? localStorage.getItem('jarvis_elevenlabs_voice_id') : null;

    const res = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: savedVoiceId || undefined }),
    });

    const contentType = res.headers.get('content-type') || '';

    // If server returned audio stream directly
    if (res.ok && contentType.includes('audio/')) {
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      
      return new Promise((resolve) => {
        audio.onended = () => {
          currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          fallbackWebSpeech(text).then(resolve);
        };
        audio.play().catch(() => {
          fallbackWebSpeech(text).then(resolve);
        });
      });
    }

    // Otherwise fallback to Web Speech Synthesis
    await fallbackWebSpeech(text);
  } catch (error) {
    await fallbackWebSpeech(text);
  }
}

function fallbackWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const savedURI = localStorage.getItem('jarvis_browser_voice_uri');
    const savedRate = parseFloat(localStorage.getItem('jarvis_voice_rate') || '1.02');
    const savedPitch = parseFloat(localStorage.getItem('jarvis_voice_pitch') || '1.0');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = isNaN(savedRate) ? 1.02 : savedRate;
    utterance.pitch = isNaN(savedPitch) ? 1.0 : savedPitch;

    // Pick configured or best natural/neural human sounding voice in Spanish
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    if (savedURI) {
      selectedVoice = voices.find(v => v.voiceURI === savedURI);
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('es') && 
        (
          v.name.toLowerCase().includes('natural') || 
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('online') ||
          v.name.toLowerCase().includes('google')
        )
      )
      || voices.find(v => 
        v.lang.toLowerCase().startsWith('es') && 
        (
          v.name.includes('Jorge') || 
          v.name.includes('Paulina') || 
          v.name.includes('Diego') || 
          v.name.includes('Mónica') || 
          v.name.includes('Monica') || 
          v.name.includes('Alvaro') ||
          v.name.includes('Lucia')
        )
      )
      || voices.find(v => v.lang.toLowerCase().startsWith('es'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Retrieve pending tasks for today or a given date (excluding habits)
 */
export async function getTodayPendingTasksSummary(projects?: Project[], targetDateArg?: string): Promise<{ count: number; tasks: any[]; summaryText: string }> {
  const todayISO = new Date().toISOString().split('T')[0];
  const targetDate = !targetDateArg || targetDateArg === 'hoy' ? todayISO : targetDateArg;
  let tasksForDate: any[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rows } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);

        if (rows && rows.length > 0) {
          // STRICTLY EXCLUDE habits ('habits')
          const validTasks = rows.filter(
            (r: any) => r.type !== 'habit' && r.type !== 'Habit' && typeof r.frequency === 'undefined'
          );

          tasksForDate = validTasks.filter((r: any) => {
            const isPending = !r.completed && r.status !== 'completed';
            if (!isPending) return false;
            if (targetDate === todayISO) {
              return r.due_date === todayISO || r.date === todayISO || Boolean(r.is_my_day);
            }
            return r.due_date === targetDate || r.date === targetDate;
          });
        }
      }
    } catch (e) {
      // fallback to local projects
    }
  }

  // Fallback to local projects tasks if no cloud tasks found or guest mode
  if (tasksForDate.length === 0 && projects && projects.length > 0) {
    for (const p of projects) {
      if (p.tasks && Array.isArray(p.tasks)) {
        for (const t of p.tasks) {
          const isPending = !t.completed && t.status !== 'completed';
          if (!isPending) continue;
          if (targetDate === todayISO) {
            if (t.dueDate === todayISO || t.isMyDay) {
              tasksForDate.push({ title: t.title, due_date: t.dueDate });
            }
          } else if (t.dueDate === targetDate) {
            tasksForDate.push({ title: t.title, due_date: t.dueDate });
          }
        }
      }
    }
  }

  const count = tasksForDate.length;
  let summaryText = '';
  if (count === 0) {
    summaryText = 'Para el día de hoy no tiene tareas pendientes registradas en su consola.';
  } else {
    const titles = tasksForDate.slice(0, 5).map((t, i) => `${i + 1}: ${t.title}`).join('. ');
    summaryText = `Para hoy tiene ${count} ${count === 1 ? 'tarea pendiente' : 'tareas pendientes'}: ${titles}.`;
  }

  return { count, tasks: tasksForDate, summaryText };
}

/**
 * Execute JARVIS Agent Orchestration with Function Calling & Persistence
 */
export async function executeJarvisOrchestration(params: {
  userPrompt: string;
  currentDate?: string;
  currentView?: string;
  projects?: Project[];
  onNavigate?: (tab: TabType) => void;
  onRefreshData?: () => Promise<void> | void;
}): Promise<AgentResult> {
  const { userPrompt, currentDate = new Date().toISOString(), currentView = 'exec', projects = [], onNavigate, onRefreshData } = params;

  try {
    const response = await fetch('/api/agent/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt,
        currentDate,
        currentView,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Fallo en la orquestación del agente');
    }

    const data = await response.json();

    // Check if Gemini or tactical engine invoked a tool
    if (data.functionCalls && data.functionCalls.length > 0) {
      const call = data.functionCalls[0];
      const name = call.name;
      const args = call.args || {};

      // 1. TOOL: CREAR TAREA
      if (name === 'crear_tarea') {
        const title = (args.title || 'Nueva Tarea').trim();
        const dueDate = args.due_date || new Date().toISOString().split('T')[0];
        const projectName = args.project_name;

        // Match project if specified
        let matchedProjectId: string | undefined = undefined;
        if (projectName && projects.length > 0) {
          const match = projects.find(p => (p.title || '').toLowerCase().includes(projectName.toLowerCase()));
          if (match) {
            matchedProjectId = match.id;
          }
        }

        const todayISO = new Date().toISOString().split('T')[0];
        const isToday = dueDate === todayISO;

        // Persist directly into Supabase 'tasks'
        await createCloudTask({
          title,
          dueDate,
          projectId: matchedProjectId,
          isExec: true,
          isMyDay: isToday,
          priority: 'medium',
          status: 'pending'
        });

        if (onRefreshData) {
          await onRefreshData();
        }

        const dateInfo = formatSpanishDate(dueDate);
        const jarvisResponse = `¡Listo! Ya te agendé "${title}" para el ${dateInfo.diaSemana} ${dateInfo.diaMes}.`;

        await speakWithElevenLabs(jarvisResponse);

        return {
          type: 'crear_tarea',
          message: jarvisResponse,
          source: data.source,
          details: { title, dueDate, projectName }
        };
      }

      // 2. TOOL: CONSULTAR PENDIENTES
      if (name === 'consultar_pendientes') {
        const { count: taskCount, tasks: tasksForDate, summaryText } = await getTodayPendingTasksSummary(projects, args.fecha);
        const jarvisResponse = summaryText;

        await speakWithElevenLabs(jarvisResponse);

        return {
          type: 'consultar_pendientes',
          message: jarvisResponse,
          source: data.source,
          details: { count: taskCount, tasks: tasksForDate }
        };
      }

      // 3. TOOL: NAVEGAR
      if (name === 'navegar') {
        const rawVista = String(args.vista || '').toLowerCase();
        let targetTab: TabType = 'exec';
        let tabLabel = 'tus tareas principales';

        if (rawVista.includes('proyect')) {
          targetTab = 'projects';
          tabLabel = 'tus proyectos';
        } else if (rawVista.includes('mi_dia') || rawVista.includes('dia') || rawVista.includes('tracker')) {
          targetTab = 'tracker';
          tabLabel = 'tu día de hoy';
        } else if (rawVista.includes('progreso') || rawVista.includes('metrica') || rawVista.includes('grafic') || rawVista.includes('analyt')) {
          targetTab = 'analytics';
          tabLabel = 'tus métricas y progreso';
        } else {
          targetTab = 'exec';
          tabLabel = 'tus tareas principales';
        }

        if (onNavigate) {
          onNavigate(targetTab);
        }

        const jarvisResponse = `Aquí tienes ${tabLabel}.`;
        await speakWithElevenLabs(jarvisResponse);

        return {
          type: 'navegar',
          message: jarvisResponse,
          source: data.source,
          details: { targetTab }
        };
      }
    }

    // Regular conversation response
    const jarvisMessage = data.text || '¡Listo! Ya quedó procesado.';
    await speakWithElevenLabs(jarvisMessage);

    return {
      type: 'chat',
      message: jarvisMessage,
      source: data.source,
    };
  } catch (error: any) {
    const fallbackMessage = 'No te alcancé a escuchar bien, ¿me lo podrías repetir por favor?';
    await speakWithElevenLabs(fallbackMessage);
    return {
      type: 'chat',
      message: fallbackMessage,
      details: error?.message,
    };
  }
}
