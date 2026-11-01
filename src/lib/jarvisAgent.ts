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

// Global audio player reference to allow interrupting and mobile iOS audio unlock
let currentAudio: HTMLAudioElement | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;

export const DEFAULT_ELEVENLABS_VOICE_ID = '0SKRlkm2sk4SFqESZzly'; // Carlos Pro (Custom connected voice)

// Pre-unlock audio on first user gesture for iOS Safari / Mobile browsers
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      if (!sharedAudioElement) {
        sharedAudioElement = new Audio();
        sharedAudioElement.preload = 'auto';
        // Play a tiny silent data URI to unlock the element on iOS
        sharedAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        sharedAudioElement.volume = 0.01;
        sharedAudioElement.play().then(() => {
          if (sharedAudioElement) {
            sharedAudioElement.pause();
            sharedAudioElement.currentTime = 0;
            sharedAudioElement.volume = 1.0;
          }
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

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

function playAudioBlob(blob: Blob, fallbackText: string): Promise<void> {
  const audioUrl = URL.createObjectURL(blob);
  const audio = sharedAudioElement || new Audio();
  audio.src = audioUrl;
  audio.volume = 1.0;
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
      fallbackWebSpeech(fallbackText).then(resolve);
    };
    audio.play().catch(() => {
      currentAudio = null;
      URL.revokeObjectURL(audioUrl);
      fallbackWebSpeech(fallbackText).then(resolve);
    });
  });
}

/**
 * ElevenLabs Speech Synthesis with server proxy + direct client fallback + Web Speech API fallback
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  stopCurrentSpeech();

  if (!text || text.trim() === '') return;

  try {
    const savedVoiceId = typeof window !== 'undefined' ? localStorage.getItem('prime_elevenlabs_voice_id') : null;
    const selectedVoiceId =
      savedVoiceId && savedVoiceId !== 'pNInz6obpgDQGcFmaJgB' && savedVoiceId !== 'IKne3meq5aSn9XLyUdCD'
        ? savedVoiceId
        : DEFAULT_ELEVENLABS_VOICE_ID;

    // 1. Try server proxy route (/api/tts/speak)
    try {
      const res = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoiceId }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('audio/')) {
        const blob = await res.blob();
        if (blob.size > 100) {
          return await playAudioBlob(blob, text);
        }
      }
    } catch (serverErr) {
      // Server route unreachable (e.g. static deployment), continue to direct ElevenLabs call
    }

    // 2. Direct ElevenLabs API fallback (for static deployments like GitHub/Vercel/Netlify)
    const buildTimeKey = process.env.ELEVENLABS_API_KEY || '';
    const clientApiKey =
      (typeof window !== 'undefined' && localStorage.getItem('prime_elevenlabs_api_key')) ||
      (import.meta as any).env?.VITE_ELEVENLABS_API_KEY ||
      buildTimeKey ||
      '';

    if (clientApiKey) {
      const callDirectEleven = async (vid: string) =>
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': clientApiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.42,
              similarity_boost: 0.85,
              style: 0.25,
              use_speaker_boost: true,
            },
          }),
        });

      let directRes = await callDirectEleven(selectedVoiceId);
      if (!directRes.ok && (directRes.status === 402 || directRes.status === 403 || directRes.status === 400)) {
        directRes = await callDirectEleven('onwK4e9ZLuTAKqWW03F9');
      }

      if (directRes.ok) {
        const blob = await directRes.blob();
        if (blob.size > 100) {
          return await playAudioBlob(blob, text);
        }
      }
    }

    // 3. Otherwise fallback to Web Speech Synthesis
    await fallbackWebSpeech(text);
  } catch (error) {
    await fallbackWebSpeech(text);
  }
}

function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }
    const timeout = setTimeout(() => {
      resolve(window.speechSynthesis.getVoices() || []);
    }, 600);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices() || []);
    };
  });
}

async function fallbackWebSpeech(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const voices = await getAvailableVoices();

  return new Promise((resolve) => {
    const savedURI = localStorage.getItem('jarvis_browser_voice_uri');
    const savedRate = parseFloat(localStorage.getItem('jarvis_voice_rate') || '1.02');
    const savedPitch = parseFloat(localStorage.getItem('jarvis_voice_pitch') || '1.0');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = isNaN(savedRate) ? 1.02 : savedRate;
    utterance.pitch = isNaN(savedPitch) ? 1.0 : savedPitch;

    // Pick configured or best natural/neural human sounding voice in Spanish
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
  const seenTaskKeys = new Set<string>();

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rows } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);

        if (rows && rows.length > 0) {
          // STRICTLY EXCLUDE habits
          const validTasks = rows.filter(
            (r: any) => r.type !== 'habit' && r.type !== 'Habit' && typeof r.frequency === 'undefined'
          );

          for (const r of validTasks) {
            const isPending = !r.completed && r.status !== 'completed';
            if (!isPending) continue;

            const isForTarget = targetDate === todayISO
              ? (r.due_date === todayISO || r.date === todayISO || Boolean(r.is_my_day) || Boolean(r.is_exec) || !r.due_date || (r.due_date && r.due_date <= todayISO))
              : (r.due_date === targetDate || r.date === targetDate);

            if (isForTarget) {
              const key = (r.id ? String(r.id) : '') + '_' + (r.title || '').toLowerCase().trim();
              if (!seenTaskKeys.has(key)) {
                seenTaskKeys.add(key);
                tasksForDate.push({ id: r.id, title: r.title, due_date: r.due_date || r.date });
              }
            }
          }
        }
      }
    } catch (e) {
      // fallback
    }
  }

  // Combine with tasks in `projects` array to ensure 100% coverage
  if (projects && projects.length > 0) {
    for (const p of projects) {
      if (p.tasks && Array.isArray(p.tasks)) {
        for (const t of p.tasks) {
          const isPending = !t.completed && t.status !== 'completed';
          if (!isPending) continue;

          const isForTarget = targetDate === todayISO
            ? (t.dueDate === todayISO || t.isMyDay || t.isExec || !t.dueDate || (t.dueDate && t.dueDate <= todayISO))
            : (t.dueDate === targetDate);

          if (isForTarget) {
            const key = (t.id ? String(t.id) : '') + '_' + (t.title || '').toLowerCase().trim();
            if (!seenTaskKeys.has(key)) {
              seenTaskKeys.add(key);
              tasksForDate.push({ id: t.id, title: t.title, due_date: t.dueDate });
            }
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
