import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { getDB } from '@/db/client';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    getDB();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="habits/new" options={{ title: 'New Habit', presentation: 'modal' }} />
        <Stack.Screen name="habits/[id]" options={{ title: 'Habit Detail' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </ThemeProvider>
  );
}
