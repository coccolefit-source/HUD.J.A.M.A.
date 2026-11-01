export type ThemeId = 
  | 'jarvis_hud' 
  | 'arc_reactor' 
  | 'cobalt_hud' 
  | 'cyberpunk' 
  | 'oro_titanio'
  | 'blanco_magenta'
  | 'blanco_celeste'
  | 'blanco_esmeralda'
  | 'blanco_oro'
  | 'clean_pro'
  | 'luxury_gold'
  | 'stealth_platino';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  isLight?: boolean;
  primaryBg: string;
  cardBg: string;
  accentColor: string;
  accentHex: string;
  accentRgb: string;
  secondaryHex: string;
  secondaryRgb: string;
  bgColor: string;
  cardBgColor: string;
  accentGradient: string;
  badgeBg: string;
  borderAccent: string;
  textAccent: string;
  glowColor: string;
  previewColors: string[];
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'blanco_magenta',
    name: 'Blanco Suave & Magenta (Claro)',
    description: 'Fondo blanco suave perlado (#F8F6FA), tarjetas blancas limpias (#FFFFFF) y acentos magenta vibrante (#E11D74).',
    isLight: true,
    primaryBg: 'bg-[#F8F6FA]',
    cardBg: 'bg-white',
    accentColor: 'magenta',
    accentHex: '#E11D74',
    accentRgb: '225, 29, 116',
    secondaryHex: '#C026D3',
    secondaryRgb: '192, 38, 211',
    bgColor: '#F8F6FA',
    cardBgColor: '#FFFFFF',
    accentGradient: 'from-[#E11D74] to-[#C026D3]',
    badgeBg: 'bg-[#E11D74]/15 text-[#E11D74] border-[#E11D74]/30',
    borderAccent: 'border-[#E11D74]/35',
    textAccent: 'text-[#E11D74]',
    glowColor: 'shadow-[#E11D74]/20',
    previewColors: ['#FFFFFF', '#F8F6FA', '#E11D74']
  },
  {
    id: 'blanco_celeste',
    name: 'Blanco Nube & Azul Stark (Claro)',
    description: 'Fondo blanco nube (#F3F7FB) de descanso visual con tarjetas puras (#FFFFFF) y destellos azul cian (#0284C7).',
    isLight: true,
    primaryBg: 'bg-[#F3F7FB]',
    cardBg: 'bg-white',
    accentColor: 'cyan',
    accentHex: '#0284C7',
    accentRgb: '2, 132, 199',
    secondaryHex: '#06B6D4',
    secondaryRgb: '6, 182, 212',
    bgColor: '#F3F7FB',
    cardBgColor: '#FFFFFF',
    accentGradient: 'from-[#0284C7] to-[#06B6D4]',
    badgeBg: 'bg-[#0284C7]/15 text-[#0284C7] border-[#0284C7]/30',
    borderAccent: 'border-[#0284C7]/35',
    textAccent: 'text-[#0284C7]',
    glowColor: 'shadow-[#0284C7]/20',
    previewColors: ['#FFFFFF', '#F3F7FB', '#0284C7']
  },
  {
    id: 'blanco_esmeralda',
    name: 'Blanco Marfil & Esmeralda (Claro)',
    description: 'Estética clínica y luminosa: fondo blanco marfil suave (#F4F9F6), tarjetas blancas y acento verde esmeralda (#059669).',
    isLight: true,
    primaryBg: 'bg-[#F4F9F6]',
    cardBg: 'bg-white',
    accentColor: 'emerald',
    accentHex: '#059669',
    accentRgb: '5, 150, 105',
    secondaryHex: '#10B981',
    secondaryRgb: '16, 185, 129',
    bgColor: '#F4F9F6',
    cardBgColor: '#FFFFFF',
    accentGradient: 'from-[#059669] to-[#10B981]',
    badgeBg: 'bg-[#059669]/15 text-[#059669] border-[#059669]/30',
    borderAccent: 'border-[#059669]/35',
    textAccent: 'text-[#059669]',
    glowColor: 'shadow-[#059669]/20',
    previewColors: ['#FFFFFF', '#F4F9F6', '#059669']
  },
  {
    id: 'blanco_oro',
    name: 'Blanco Alabastro & Ámbar (Claro)',
    description: 'Fondo blanco cálido alabastro (#FAF8F5), tarjetas marfil claro (#FFFFFF) y acentos dorado titanio (#D97706).',
    isLight: true,
    primaryBg: 'bg-[#FAF8F5]',
    cardBg: 'bg-white',
    accentColor: 'amber',
    accentHex: '#D97706',
    accentRgb: '217, 119, 6',
    secondaryHex: '#F59E0B',
    secondaryRgb: '245, 158, 11',
    bgColor: '#FAF8F5',
    cardBgColor: '#FFFFFF',
    accentGradient: 'from-[#D97706] to-[#F59E0B]',
    badgeBg: 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30',
    borderAccent: 'border-[#D97706]/35',
    textAccent: 'text-[#D97706]',
    glowColor: 'shadow-[#D97706]/20',
    previewColors: ['#FFFFFF', '#FAF8F5', '#D97706']
  },
  {
    id: 'jarvis_hud',
    name: 'J.A.R.V.I.S. HUD Holográfico',
    description: 'Fondo negro espacial (#080B11), módulo vidriado (#101827), bordes cian neón (#06B6D4) y destellos azul cian (#00F0FF).',
    primaryBg: 'bg-[#080B11]',
    cardBg: 'bg-[#101827]/85',
    accentColor: 'cyan',
    accentHex: '#00F0FF',
    accentRgb: '0, 240, 255',
    secondaryHex: '#06B6D4',
    secondaryRgb: '6, 182, 212',
    bgColor: '#080B11',
    cardBgColor: '#101827',
    accentGradient: 'from-[#00F0FF] to-cyan-500',
    badgeBg: 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30',
    borderAccent: 'border-[#00F0FF]/30',
    textAccent: 'text-[#00F0FF]',
    glowColor: 'shadow-[#00F0FF]/20',
    previewColors: ['#00F0FF', '#06B6D4', '#080B11']
  },
  {
    id: 'arc_reactor',
    name: 'Reactor Arc Neón',
    description: 'Negro reactor (#050B14), destellos azul cielo eléctrico (#00E5FF) y acentos cobalto Stark (#3B82F6).',
    primaryBg: 'bg-[#050B14]',
    cardBg: 'bg-[#0C182E]/85',
    accentColor: 'cyan',
    accentHex: '#00E5FF',
    accentRgb: '0, 229, 255',
    secondaryHex: '#3B82F6',
    secondaryRgb: '59, 130, 246',
    bgColor: '#050B14',
    cardBgColor: '#0C182E',
    accentGradient: 'from-[#00E5FF] to-blue-500',
    badgeBg: 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30',
    borderAccent: 'border-[#00E5FF]/40',
    textAccent: 'text-[#00E5FF]',
    glowColor: 'shadow-[#00E5FF]/25',
    previewColors: ['#00E5FF', '#3B82F6', '#050B14']
  },
  {
    id: 'cobalt_hud',
    name: 'Azul Cobalto Tactical',
    description: 'Azul comando militar táctico (#2563EB) con acentos hielo (#38BDF8) para máxima concentración.',
    primaryBg: 'bg-[#060C1B]',
    cardBg: 'bg-[#0E1B38]/85',
    accentColor: 'blue',
    accentHex: '#38BDF8',
    accentRgb: '56, 189, 248',
    secondaryHex: '#2563EB',
    secondaryRgb: '37, 99, 235',
    bgColor: '#060C1B',
    cardBgColor: '#0E1B38',
    accentGradient: 'from-sky-400 to-blue-600',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    borderAccent: 'border-sky-500/40',
    textAccent: 'text-sky-400',
    glowColor: 'shadow-sky-500/20',
    previewColors: ['#38BDF8', '#2563EB', '#060C1B']
  },
  {
    id: 'cyberpunk',
    name: 'Neón Cyberpunk',
    description: 'Rosa magenta neón (#FF007F) y violeta eléctrico (#A855F7). Estilo Cyberpunk de alta energía visual.',
    primaryBg: 'bg-[#0D0512]',
    cardBg: 'bg-[#1E0C24]/85',
    accentColor: 'pink',
    accentHex: '#FF007F',
    accentRgb: '255, 0, 127',
    secondaryHex: '#A855F7',
    secondaryRgb: '168, 85, 247',
    bgColor: '#0D0512',
    cardBgColor: '#1E0C24',
    accentGradient: 'from-[#FF007F] to-fuchsia-600',
    badgeBg: 'bg-[#FF007F]/20 text-pink-300 border-[#FF007F]/30',
    borderAccent: 'border-[#FF007F]/40',
    textAccent: 'text-[#FF007F]',
    glowColor: 'shadow-[#FF007F]/25',
    previewColors: ['#FF007F', '#A855F7', '#0D0512']
  },
  {
    id: 'oro_titanio',
    name: 'Oro & Titanio Stark',
    description: 'Dorado Stark (#F59E0B) y ámbar titanio (#D97706) sobre obsidiana (#0E0A05). Estilo armadura premium.',
    primaryBg: 'bg-[#0E0A05]',
    cardBg: 'bg-[#1F180B]/85',
    accentColor: 'amber',
    accentHex: '#F59E0B',
    accentRgb: '245, 158, 11',
    secondaryHex: '#D97706',
    secondaryRgb: '217, 119, 6',
    bgColor: '#0E0A05',
    cardBgColor: '#1F180B',
    accentGradient: 'from-amber-400 to-yellow-600',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderAccent: 'border-amber-500/40',
    textAccent: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    previewColors: ['#F59E0B', '#D97706', '#0E0A05']
  },
  {
    id: 'clean_pro',
    name: 'Minimal Ejecutivo Pro',
    description: 'Diseño sobrio, ultra limpio y profesional de alta productividad. Grafito táctico con acento menta esmeralda quirúrgico (#10B981).',
    primaryBg: 'bg-[#080D0B]',
    cardBg: 'bg-[#0E1714]/85',
    accentColor: 'emerald',
    accentHex: '#10B981',
    accentRgb: '16, 185, 129',
    secondaryHex: '#34D399',
    secondaryRgb: '52, 211, 153',
    bgColor: '#080D0B',
    cardBgColor: '#0E1714',
    accentGradient: 'from-emerald-400 to-teal-600',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    borderAccent: 'border-emerald-500/40',
    textAccent: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/25',
    previewColors: ['#10B981', '#34D399', '#080D0B']
  },
  {
    id: 'luxury_gold',
    name: 'Obsidiana & Champagne Prestige',
    description: 'Lujo supremo, refinado y costoso. Negro terciopelo (#070709) con toques de oro champagne (#E6CA65) y bronce de alta relojería.',
    primaryBg: 'bg-[#070709]',
    cardBg: 'bg-[#131215]/85',
    accentColor: 'amber',
    accentHex: '#E6CA65',
    accentRgb: '230, 202, 101',
    secondaryHex: '#B89535',
    secondaryRgb: '184, 149, 53',
    bgColor: '#070709',
    cardBgColor: '#131215',
    accentGradient: 'from-[#E6CA65] to-[#B89535]',
    badgeBg: 'bg-[#E6CA65]/20 text-[#E6CA65] border-[#E6CA65]/35',
    borderAccent: 'border-[#E6CA65]/40',
    textAccent: 'text-[#E6CA65]',
    glowColor: 'shadow-[#E6CA65]/25',
    previewColors: ['#E6CA65', '#B89535', '#070709']
  },
  {
    id: 'stealth_platino',
    name: 'Stealth Platino & Carbono',
    description: 'Elegancia monocromática ultra limpia y sofisticada. Plata platino (#E2E8F0) sobre fibra de carbono profunda (#0A0C0E).',
    primaryBg: 'bg-[#0A0C0E]',
    cardBg: 'bg-[#12161A]/85',
    accentColor: 'slate',
    accentHex: '#E2E8F0',
    accentRgb: '226, 232, 240',
    secondaryHex: '#94A3B8',
    secondaryRgb: '148, 163, 184',
    bgColor: '#0A0C0E',
    cardBgColor: '#12161A',
    accentGradient: 'from-slate-200 to-slate-400',
    badgeBg: 'bg-slate-200/20 text-slate-100 border-slate-200/40',
    borderAccent: 'border-slate-300/40',
    textAccent: 'text-slate-100',
    glowColor: 'shadow-slate-300/20',
    previewColors: ['#E2E8F0', '#94A3B8', '#0A0C0E']
  }
];

const THEME_STORAGE_KEY = 'jam_hud_active_theme';

export function getStoredTheme(): ThemeId {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some(t => t.id === saved)) {
        return saved;
      }
    }
  } catch (e) {
    // fallback
  }
  return 'jarvis_hud';
}

export function saveStoredTheme(themeId: ThemeId): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  } catch (e) {
    // fallback
  }
}

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-mode', theme.isLight ? 'light' : 'dark');
    root.style.setProperty('--hud-accent', theme.accentHex);
    root.style.setProperty('--hud-accent-rgb', theme.accentRgb);
    root.style.setProperty('--hud-secondary', theme.secondaryHex);
    root.style.setProperty('--hud-secondary-rgb', theme.secondaryRgb);
    root.style.setProperty('--hud-bg', theme.bgColor);
    root.style.setProperty('--hud-card', theme.cardBgColor);
    root.style.backgroundColor = theme.bgColor;
  }
}

// Auto-apply initial theme immediately on module load to prevent flash
if (typeof window !== 'undefined') {
  try {
    applyTheme(getStoredTheme());
  } catch (e) {
    // ignore
  }
}

