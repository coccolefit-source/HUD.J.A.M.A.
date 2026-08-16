export type ThemeId = 'jarvis_hud' | 'arc_reactor' | 'cobalt_hud' | 'cyberpunk' | 'oro_titanio';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  primaryBg: string; // e.g. bg-[#0A0D14]
  cardBg: string; // e.g. bg-[#101827]/80
  accentColor: string;
  accentHex: string;
  accentGradient: string;
  badgeBg: string;
  borderAccent: string;
  textAccent: string;
  glowColor: string;
  previewColors: string[];
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'jarvis_hud',
    name: 'J.A.R.V.I.S. HUD Holográfico',
    description: 'Fondo negro espacial (#0A0D14), módulo vidriado (#101827), bordes cian neón (#06B6D4) y destellos azul cian (#00F0FF).',
    primaryBg: 'bg-[#0A0D14]',
    cardBg: 'bg-[#101827]/80',
    accentColor: 'cyan',
    accentHex: '#00F0FF',
    accentGradient: 'from-[#00F0FF] to-cyan-500',
    badgeBg: 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30',
    borderAccent: 'border-[#00F0FF]/30',
    textAccent: 'text-[#00F0FF]',
    glowColor: 'shadow-[#00F0FF]/20',
    previewColors: ['#00F0FF', '#06B6D4', '#0A0D14']
  },
  {
    id: 'arc_reactor',
    name: 'Reactor Arc Neón',
    description: 'Negro espacial (#0A0D14), azul cian neón (#00F0FF) y acentos azul cobalto.',
    primaryBg: 'bg-[#0A0D14]',
    cardBg: 'bg-[#101827]/80',
    accentColor: 'cyan',
    accentHex: '#00F0FF',
    accentGradient: 'from-[#00F0FF] to-blue-500',
    badgeBg: 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/30',
    borderAccent: 'border-[#00F0FF]/40',
    textAccent: 'text-[#00F0FF]',
    glowColor: 'shadow-[#00F0FF]/20',
    previewColors: ['#00F0FF', '#38BDF8', '#0A0D14']
  },
  {
    id: 'cobalt_hud',
    name: 'Azul Cobalto Tactical',
    description: 'Azul profundo y cian eléctrico. Diseñado para alta legibilidad y cero fatiga visual.',
    primaryBg: 'bg-[#0A0D14]',
    cardBg: 'bg-[#101827]/80',
    accentColor: 'blue',
    accentHex: '#38BDF8',
    accentGradient: 'from-sky-400 to-blue-600',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    borderAccent: 'border-sky-500/40',
    textAccent: 'text-sky-400',
    glowColor: 'shadow-sky-500/20',
    previewColors: ['#38BDF8', '#2563EB', '#0A0D14']
  },
  {
    id: 'cyberpunk',
    name: 'Neón Cyberpunk',
    description: 'Cian eléctrico y magenta neón. Energético y futurista.',
    primaryBg: 'bg-[#0A0D14]',
    cardBg: 'bg-[#101827]/80',
    accentColor: 'cyan',
    accentHex: '#06b6d4',
    accentGradient: 'from-cyan-400 to-fuchsia-500',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    borderAccent: 'border-cyan-500/40',
    textAccent: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/20',
    previewColors: ['#06b6d4', '#d946ef', '#0A0D14']
  },
  {
    id: 'oro_titanio',
    name: 'Oro & Titanio Stark',
    description: 'Dorado mate y bronce obsidian. Sensación de laboratorio de tecnología avanzada.',
    primaryBg: 'bg-[#0A0D14]',
    cardBg: 'bg-[#101827]/80',
    accentColor: 'amber',
    accentHex: '#f59e0b',
    accentGradient: 'from-amber-400 to-yellow-600',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderAccent: 'border-amber-500/40',
    textAccent: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    previewColors: ['#f59e0b', '#d97706', '#0A0D14']
  }
];

export function getStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('habitpulse_theme');
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved as ThemeId;
    }
  } catch (e) {
    console.error('Error reading theme', e);
  }
  return 'jarvis_hud';
}

export function saveStoredTheme(themeId: ThemeId): void {
  try {
    localStorage.setItem('habitpulse_theme', themeId);
  } catch (e) {
    console.error('Error saving theme', e);
  }
}
