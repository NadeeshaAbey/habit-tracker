import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { buildTheme, type AppTheme, type AccentName, type CardStyle } from '@/theme/design';

type ThemeCtx = {
  t: AppTheme;
  accent: AccentName;
  card: CardStyle;
  themeMode: 'system' | 'light' | 'dark';
  setAccent: (a: AccentName) => void;
  setCard: (c: CardStyle) => void;
  setThemeMode: (m: 'system' | 'light' | 'dark') => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [accent, setAccentState] = useState<AccentName>('sage');
  const [card, setCardState] = useState<CardStyle>('soft');
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    Promise.all([
      getSetting('accent'),
      getSetting('card_style'),
      getSetting('theme_mode'),
    ]).then(([a, c, m]) => {
      if (a) setAccentState(a as AccentName);
      if (c) setCardState(c as CardStyle);
      if (m) setThemeModeState(m as 'system' | 'light' | 'dark');
    });
  }, []);

  const isDark =
    themeMode === 'dark' ? true :
    themeMode === 'light' ? false :
    systemScheme === 'dark';

  const t = buildTheme(isDark, accent, card);

  const setAccent = useCallback(async (a: AccentName) => {
    setAccentState(a);
    await setSetting('accent', a);
  }, []);

  const setCard = useCallback(async (c: CardStyle) => {
    setCardState(c);
    await setSetting('card_style', c);
  }, []);

  const setThemeMode = useCallback(async (m: 'system' | 'light' | 'dark') => {
    setThemeModeState(m);
    await setSetting('theme_mode', m);
  }, []);

  return (
    <ThemeContext.Provider value={{ t, accent, card, themeMode, setAccent, setCard, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
