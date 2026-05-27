export const palette = {
  light: {
    bg: '#FFFFFF',
    surface: '#F4F4F5',
    text: '#18181B',
    muted: '#71717A',
    primary: '#4F46E5',
    success: '#10B981',
    border: '#E4E4E7',
  },
  dark: {
    bg: '#0B0B0F',
    surface: '#18181B',
    text: '#FAFAFA',
    muted: '#A1A1AA',
    primary: '#818CF8',
    success: '#34D399',
    border: '#27272A',
  },
};

export type Theme = typeof palette.light;
