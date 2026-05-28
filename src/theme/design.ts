export const CATS = [
  { id: 'health', name: 'Health',   color: '#5fae7c' },
  { id: 'mind',   name: 'Mind',     color: '#6e6fd9' },
  { id: 'learn',  name: 'Learning', color: '#d6a437' },
  { id: 'work',   name: 'Work',     color: '#5a6473' },
  { id: 'craft',  name: 'Creative', color: '#e88a6b' },
] as const;

export type CatId = typeof CATS[number]['id'];

export const PERIODS = [
  { id: 'morning', name: 'Morning', hint: 'Before 11am' },
  { id: 'day',     name: 'Daytime', hint: '11am – 5pm'  },
  { id: 'evening', name: 'Evening', hint: 'After 5pm'   },
  { id: 'anytime', name: 'Anytime', hint: 'No specific time' },
] as const;

export const GLYPHS = ['●','○','◆','◇','◐','◑','▤','▥','✎','✦','✱','⌘','▣','◌','☾','↗','⚑','⌗'];

export const TEMPLATES = [
  { id: 't_water',   name: 'Drink water',          glyph: '◐', target: 8, period: 'anytime', cat: 'health' },
  { id: 't_walk',    name: 'Walk 10k steps',        glyph: '↗', target: 1, period: 'day',     cat: 'health' },
  { id: 't_lift',    name: 'Strength training',     glyph: '◆', target: 1, period: 'morning', cat: 'health' },
  { id: 't_sleep',   name: 'Sleep before 11pm',     glyph: '☾', target: 1, period: 'evening', cat: 'health' },
  { id: 't_med',     name: 'Meditate 10 min',       glyph: '○', target: 1, period: 'morning', cat: 'mind'   },
  { id: 't_journ',   name: 'Journal',               glyph: '✎', target: 1, period: 'evening', cat: 'mind'   },
  { id: 't_read',    name: 'Read 20 min',           glyph: '▤', target: 1, period: 'evening', cat: 'mind'   },
  { id: 't_nophone', name: 'No phone before 10am',  glyph: '◌', target: 1, period: 'morning', cat: 'mind'   },
  { id: 't_lang',    name: 'Practice language',     glyph: '✦', target: 1, period: 'day',     cat: 'learn'  },
  { id: 't_code',    name: 'Code 30 min',           glyph: '⌘', target: 1, period: 'day',     cat: 'learn'  },
  { id: 't_inbox',   name: 'Inbox zero',            glyph: '▣', target: 1, period: 'day',     cat: 'work'   },
  { id: 't_draw',    name: 'Sketch',                glyph: '✱', target: 1, period: 'anytime', cat: 'craft'  },
];

export const ACCENT_OPTIONS = [
  { value: 'sage',   color: '#5fae7c', soft: '#dfeee5', label: 'Sage'   },
  { value: 'indigo', color: '#6e6fd9', soft: '#e3e2f8', label: 'Indigo' },
  { value: 'coral',  color: '#e88a6b', soft: '#f9e4dc', label: 'Coral'  },
  { value: 'amber',  color: '#d6a437', soft: '#f4ead0', label: 'Amber'  },
  { value: 'slate',  color: '#5a6473', soft: '#e2e5e9', label: 'Slate'  },
] as const;

export type AccentName = typeof ACCENT_OPTIONS[number]['value'];
export type CardStyle  = 'soft' | 'outlined' | 'shadow';

export function buildTheme(dark: boolean, accentName: AccentName = 'sage', cardStyle: CardStyle = 'soft') {
  const a = ACCENT_OPTIONS.find(x => x.value === accentName) ?? ACCENT_OPTIONS[0];

  const light = {
    bg: '#fafaf7' as string,
    surface: '#ffffff' as string,
    surfaceAlt: '#f3f3ee' as string,
    surfaceMute: '#ebebe4' as string,
    text: '#1a1a17' as string,
    muted: '#75756d' as string,
    subtle: '#b5b5ad' as string,
    border: '#e8e8e1' as string,
    borderStrong: '#d8d8d0' as string,
    danger: '#c0573c' as string,
    accent: a.color,
    accentSoft: a.soft,
    onAccent: '#ffffff' as string,
    isDark: false,
    cardStyle,
  };

  const dark_t = {
    bg: '#0f0f0d' as string,
    surface: '#181815' as string,
    surfaceAlt: '#1f1f1b' as string,
    surfaceMute: '#2a2a25' as string,
    text: '#f4f4ef' as string,
    muted: '#8a8a82' as string,
    subtle: '#54544e' as string,
    border: '#2a2a25' as string,
    borderStrong: '#3a3a33' as string,
    danger: '#e88a6b' as string,
    accent: a.color,
    accentSoft: 'rgba(255,255,255,0.08)' as string,
    onAccent: '#0f0f0d' as string,
    isDark: true,
    cardStyle,
  };

  return dark ? dark_t : light;
}

export type AppTheme = ReturnType<typeof buildTheme>;
