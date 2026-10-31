import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Shared Gemini instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = 
  'Te llamas Prime (pronunciado Praim). Eres un asistente personal inteligente, cálido, humano y muy cercano. Hablas siempre en español de forma natural, amigable y cotidiana, como una persona real conversando con un amigo o compañero de confianza. NUNCA hables como un robot ni uses lenguaje militar o rígido; NUNCA digas "señor", ni "órdenes tácticas", ni "consola central". Sé claro, ágil, empático y directo. Si el usuario te pide información o consejos, explícaselo con palabras sencillas y naturales. Solo usa las herramientas cuando el usuario te pida crear una tarea, revisar sus pendientes o cambiar de pantalla.';

// Function declarations for Gemini Function Calling
const FUNCTION_DECLARATIONS = [
  {
    name: 'crear_tarea',
    description: 'Para agendar tareas calculando fechas relativas (ej. "mañana", "el próximo miércoles", "en 3 días") en formato ISO YYYY-MM-DD.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título o nombre claro de la tarea.',
        },
        due_date: {
          type: Type.STRING,
          description: 'Fecha calculada para la tarea en formato ISO YYYY-MM-DD.',
        },
        project_name: {
          type: Type.STRING,
          description: 'Nombre opcional del proyecto al que pertenece la tarea si el usuario lo menciona.',
        },
      },
      required: ['title', 'due_date'],
    },
  },
  {
    name: 'consultar_pendientes',
    description: 'Para consultar tareas de la consola Exec para una fecha dada (excluyendo hábitos).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fecha: {
          type: Type.STRING,
          description: 'Fecha para la consulta en formato YYYY-MM-DD o la palabra "hoy".',
        },
      },
      required: ['fecha'],
    },
  },
  {
    name: 'navegar',
    description: 'Para alternar vistas del sistema ("proyectos", "exec", "mi_dia", "progreso").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        vista: {
          type: Type.STRING,
          enum: ['proyectos', 'exec', 'mi_dia', 'progreso'],
          description: 'Identificador de la vista a la cual navegar.',
        },
      },
      required: ['vista'],
    },
  },
];

/**
 * Tactical date calculator helper in case of offline/fallback calculation
 */
function calculateFallbackRelativeDate(baseDateStr: string, text: string): string {
  const baseDate = new Date(baseDateStr || new Date().toISOString());
  const lower = text.toLowerCase();
  
  const d = new Date(baseDate);

  if (lower.includes('pasado mañana')) {
    d.setDate(d.getDate() + 2);
  } else if (lower.includes('mañana')) {
    d.setDate(d.getDate() + 1);
  } else if (lower.includes('hoy')) {
    // Keep today
  } else {
    // Check for "en X días"
    const daysMatch = lower.match(/en\s+(\d+)\s+d[íi]as?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      d.setDate(d.getDate() + days);
    } else {
      // Days of week
      const weekdays: { [key: string]: number } = {
        'domingo': 0,
        'lunes': 1,
        'martes': 2,
        'miércoles': 3,
        'miercoles': 3,
        'jueves': 4,
        'viernes': 5,
        'sábado': 6,
        'sabado': 6,
      };

      for (const [dayName, targetDay] of Object.entries(weekdays)) {
        if (lower.includes(dayName)) {
          const currentDay = d.getDay();
          let diff = targetDay - currentDay;
          if (diff <= 0) diff += 7;
          d.setDate(d.getDate() + diff);
          break;
        }
      }
    }
  }

  return d.toISOString().split('T')[0];
}

/**
 * Intelligent tactical rule fallback when external Gemini API quota is depleted
 */
function tacticalIntentFallback(userPrompt: string, currentDateStr: string): {
  functionCalls?: Array<{ name: string; args: Record<string, any> }>;
  text?: string;
} {
  const lower = userPrompt.toLowerCase().trim();
  const todayISO = (currentDateStr || new Date().toISOString()).split('T')[0];

  // 1. Check for task creation FIRST
  if (
    lower.startsWith('crea') ||
    lower.startsWith('crear') ||
    lower.startsWith('agrega') ||
    lower.startsWith('agregar') ||
    lower.startsWith('agenda') ||
    lower.startsWith('agendar') ||
    lower.startsWith('anota') ||
    lower.startsWith('anotar') ||
    lower.startsWith('programa') ||
    lower.startsWith('programar') ||
    lower.includes('crear tarea') ||
    lower.includes('crea una tarea') ||
    lower.includes('agrega una tarea') ||
    lower.includes('agregar tarea') ||
    lower.includes('nueva tarea') ||
    lower.includes('agendar tarea') ||
    lower.includes('agendar reunión') ||
    lower.includes('agendar reunion')
  ) {
    const calculatedDate = calculateFallbackRelativeDate(currentDateStr, userPrompt);

    // Extract task title
    let cleaned = userPrompt
      .replace(/^(prime|praim|praym|jarvis)\s*,?\s*/i, '')
      .replace(/^(por favor\s*,?\s*)/i, '')
      .replace(/^(crea|crear|agrega|agregar|agenda|agendar|anota|anotar|programa|programar)\s+(una\s+|la\s+)?(tarea\s+)?(llamada\s+|titulada\s+)?/i, '')
      .trim();

    // Extract project if present: "en el proyecto X"
    let projectName: string | undefined = undefined;
    const projMatch = cleaned.match(/\s+en\s+el\s+proyecto\s+([^,.]+)/i);
    if (projMatch) {
      projectName = projMatch[1].trim();
      cleaned = cleaned.replace(projMatch[0], '');
    }

    // Clean date words from title
    cleaned = cleaned
      .replace(/\s+para\s+(mañana|hoy|pasado\s+mañana|el\s+próximo\s+\w+|el\s+\w+|en\s+\d+\s+d[íi]as?).*$/i, '')
      .replace(/^(tarea\s*:?\s*)/i, '')
      .trim();

    if (!cleaned) {
      cleaned = 'Nueva Tarea';
    }

    return {
      functionCalls: [
        {
          name: 'crear_tarea',
          args: {
            title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
            due_date: calculatedDate,
            ...(projectName ? { project_name: projectName } : {}),
          },
        },
      ],
      text: `¡Listo! Ya te agendé: ${cleaned}.`,
    };
  }

  // 2. Check for queries on pending tasks
  if (
    lower.includes('qué tengo') ||
    lower.includes('que tengo') ||
    lower.includes('pendientes') ||
    lower.includes('tareas de hoy') ||
    lower.includes('agenda de hoy') ||
    lower.includes('tengo para hoy') ||
    lower.includes('mis tareas') ||
    lower.includes('qué hay para hoy') ||
    lower.includes('que hay para hoy')
  ) {
    const targetDate = calculateFallbackRelativeDate(currentDateStr, userPrompt);
    return {
      functionCalls: [{ name: 'consultar_pendientes', args: { fecha: targetDate } }],
      text: 'Revisando tus tareas pendientes para esa fecha...',
    };
  }

  // 3. Check for navigation
  if (
    lower.includes('ir a proyectos') ||
    lower.includes('ver proyectos') ||
    lower.includes('mostrar proyectos') ||
    lower.includes('vista proyectos') ||
    lower.includes('navegar a proyectos') ||
    lower === 'proyectos'
  ) {
    return {
      functionCalls: [{ name: 'navegar', args: { vista: 'proyectos' } }],
      text: 'Aquí tienes tus proyectos.',
    };
  }
  if (
    lower.includes('ir a exec') ||
    lower.includes('ver exec') ||
    lower.includes('consola exec') ||
    lower.includes('vista exec') ||
    lower.includes('tareas central') ||
    lower.includes('ir a tareas') ||
    lower.includes('consola central') ||
    lower === 'exec'
  ) {
    return {
      functionCalls: [{ name: 'navegar', args: { vista: 'exec' } }],
      text: 'Abriendo tu lista principal de tareas.',
    };
  }
  if (
    lower.includes('ir a mi día') ||
    lower.includes('ir a mi dia') ||
    lower.includes('ver mi día') ||
    lower.includes('ver mi dia') ||
    lower.includes('vista mi día') ||
    lower.includes('mi día') ||
    lower.includes('mi dia')
  ) {
    return {
      functionCalls: [{ name: 'navegar', args: { vista: 'mi_dia' } }],
      text: 'Aquí tienes tu vista de hoy.',
    };
  }
  if (
    lower.includes('ir a progreso') ||
    lower.includes('ver progreso') ||
    lower.includes('ir a estadísticas') ||
    lower.includes('ver estadísticas') ||
    lower.includes('ver métricas') ||
    lower.includes('vista progreso') ||
    lower === 'progreso'
  ) {
    return {
      functionCalls: [{ name: 'navegar', args: { vista: 'progreso' } }],
      text: 'Aquí están tus métricas y progreso.',
    };
  }

  // 4. Check for informational / knowledge queries
  if (lower.includes('dopamina')) {
    return {
      text: 'La dopamina es la molécula de la motivación. No se libera tanto al terminar algo, sino mientras vas avanzando hacia tu meta. Por eso, marcar cada hábito completado en Prime te da ese pequeño impulso natural para seguir enfocado.',
    };
  }
  if (lower.includes('pomodoro')) {
    return {
      text: 'La técnica Pomodoro es trabajar 25 minutos con enfoque total y descansar 5 minutos. Después de cuatro bloques, te tomas un descanso más largo de 20 minutos. Es ideal para no quemarte y mantener la mente fresca.',
    };
  }
  if (lower.includes('procrastina') || lower.includes('pereza')) {
    return {
      text: 'La procrastinación es normal, no te sientas mal por eso. Tu cerebro suele evitar lo que ve difícil o aburrido. El mejor truco es la regla de los 2 minutos: dile a tu mente que solo vas a trabajar dos minutos en esa tarea. Casi siempre, una vez que arrancas, sigues de largo.',
    };
  }
  if (lower.includes('eisenhower') || lower.includes('matriz') || lower.includes('priorizar') || lower.includes('priorización')) {
    return {
      text: 'La matriz de Eisenhower te ayuda a ordenar el día: haz primero lo importante y urgente, agenda lo importante que no es urgente, delega lo que no dependa de ti, y elimina todo lo que sea pura pérdida de tiempo.',
    };
  }
  if (lower.includes('hábito') || lower.includes('habito') || lower.includes('rutina')) {
    return {
      text: 'Para crear un hábito duradero, conéctalo a algo que ya haces todos los días. Por ejemplo: después de tomar café, leo 5 páginas. Haz que sea muy fácil empezar y celébralo al marcarlo en la app.',
    };
  }
  if (
    lower.includes('qué es') || lower.includes('que es') ||
    lower.includes('cómo') || lower.includes('como') ||
    lower.includes('explica') || lower.includes('explícame') ||
    lower.includes('dame información') || lower.includes('información sobre') ||
    lower.includes('cuál es') || lower.includes('cual es') ||
    lower.includes('quién fue') || lower.includes('quien fue') ||
    lower.includes('por qué') || lower.includes('por que') ||
    lower.includes('consejo') || lower.includes('recomienda') ||
    lower.includes('definición') || lower.includes('dime sobre')
  ) {
    const cleanTopic = userPrompt.replace(/[¿?]/g, '').trim();
    return {
      text: `Sobre "${cleanTopic}": Lo más importante es tener claridad en el objetivo, quitarte distracciones del camino y dar un paso concreto a la vez. ¿Quieres que te ayude a agendar una tarea para avanzar con esto?`,
    };
  }

  // Default natural personal assistant response
  return {
    text: '¡Hola! ¿En qué te puedo ayudar hoy? Puedo agendarte una tarea, revisar tus pendientes o explicarte lo que necesites.',
  };
}

// 1. ORCHESTRATE ENDPOINT (GEMINI FUNCTION CALLING)
app.post('/api/agent/orchestrate', async (req: Request, res: Response) => {
  try {
    const { userPrompt, currentDate, currentView } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string') {
      res.status(400).json({ error: 'userPrompt es requerido' });
      return;
    }

    const systemDate = currentDate || new Date().toISOString();
    const systemPromptWithContext = `${SYSTEM_INSTRUCTION}
La fecha y hora del sistema es: ${systemDate}.
La vista actual de la interfaz es: "${currentView || 'exec'}".
Si el usuario hace cualquier pregunta, pide información, conocimientos o consejos, respóndele directamente con explicaciones claras, amigables, humanas y conversacionales, sin tecnicismos innecesarios ni formalismos militares.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPromptWithContext,
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS as any }],
        },
      });

      const functionCalls = response.functionCalls;
      const text = response.text || '';

      if (functionCalls && functionCalls.length > 0) {
        res.json({
          success: true,
          source: 'gemini',
          functionCalls: functionCalls.map((fc: any) => ({
            name: fc.name,
            args: fc.args,
          })),
          text,
        });
        return;
      }

      // If Gemini returned only text
      if (text) {
        res.json({
          success: true,
          source: 'gemini',
          text,
        });
        return;
      }

      // If empty response, evaluate fallback
      const fallback = tacticalIntentFallback(userPrompt, systemDate);
      res.json({
        success: true,
        source: 'tactical_fallback',
        ...fallback,
      });
    } catch (geminiError: any) {
      // Graceful fallback to tactical engine
      const fallback = tacticalIntentFallback(userPrompt, systemDate);
      res.json({
        success: true,
        source: 'tactical_engine',
        ...fallback,
      });
    }
  } catch (error: any) {
    console.error('Error general en /api/agent/orchestrate:', error);
    res.status(500).json({ error: error?.message || 'Error interno del servidor' });
  }
});

// 2. ELEVENLABS TTS ENDPOINT
app.post('/api/tts/speak', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text es requerido' });
      return;
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      // Clean fallback indicator: tell frontend to use Web Speech Synthesis
      res.json({
        fallback: true,
        reason: 'no_api_key',
        text,
      });
      return;
    }

    // Default voice: Adam (pNInz6obpgDQGcFmaJgB) or custom
    const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB';

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.85,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      res.json({
        fallback: true,
        reason: 'api_error',
        status: ttsResponse.status,
        text,
      });
      return;
    }

    const arrayBuffer = await ttsResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error en /api/tts/speak:', error);
    res.json({
      fallback: true,
      reason: 'exception',
      text: req.body?.text || '',
    });
  }
});

// Dev server or Production static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Orchestration Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
