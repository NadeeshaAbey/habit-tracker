import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getDB } from '@/db/client';

function InnerLayout() {
  const { t } = useTheme();
  return (
    <>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habits/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habits/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => { getDB(); }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
