import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/context/ThemeContext';
import {
  ScreenHeader, Section, SettingsRow, Toggle, Segmented, MONO, TimePickerModal, Toast,
} from '@/components/ui';
import { ACCENT_OPTIONS, type AccentName } from '@/theme/design';
import { listActiveHabits, getLogsForRange } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { resetDatabase } from '@/db/client';
import { requestNotificationPermissions, scheduleReminder, cancelReminder } from '@/utils/notifications';
import type { Habit, Category } from '@/types';

export default function SettingsScreen() {
  const { t, accent, card, themeMode, setAccent, setCard, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const load = useCallback(async () => {
    const [h, cats, enabled, time] = await Promise.all([
      listActiveHabits(),
      listCategories(),
      getSetting('reminder_enabled'),
      getSetting('reminder_time'),
    ]);
    setHabits(h);
    setCategories(cats);
    setReminderEnabled(enabled === 'true');
    if (time) setReminderTime(time);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission needed', 'Enable notifications in Settings to use reminders.');
        return;
      }
      const [h, m] = reminderTime.split(':').map(Number);
      await scheduleReminder(h, m);
      await setSetting('reminder_enabled', 'true');
      await setSetting('reminder_time', reminderTime);
      setReminderEnabled(true);
    } else {
      await cancelReminder();
      await setSetting('reminder_enabled', 'false');
      setReminderEnabled(false);
    }
  };

  const onTimeConfirm = async (time: string) => {
    setShowTimePicker(false);
    setReminderTime(time);
    await setSetting('reminder_time', time);
    if (reminderEnabled) {
      const [h, m] = time.split(':').map(Number);
      await scheduleReminder(h, m);
    }
  };

  const onExportData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const allLogs = await getLogsForRange('2000-01-01', today);
      const payload = JSON.stringify({ habits, logs: allLogs }, null, 2);
      const kb = (payload.length / 1024).toFixed(1);
      const path = (FileSystem.cacheDirectory ?? '') + 'habits-export.json';
      await FileSystem.writeAsStringAsync(path, payload, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'application/json' });
      showToast(`Exported · ${allLogs.length} logs · ${kb} KB`);
    } catch {
      Alert.alert('Export failed', 'Could not export data.');
    }
  };

  const onResetData = () => {
    Alert.alert(
      'Reset all data?',
      'This will permanently delete all habits, logs, and settings. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive', onPress: async () => {
            await resetDatabase();
            await load();
            showToast('All data cleared');
          },
        },
      ]
    );
  };

  const onPerHabitReminders = () => {
    const first = habits.find(h => h.reminders.length > 0);
    if (first) {
      router.push(`/habits/${first.id}` as any);
    } else {
      Alert.alert('No reminders set', 'Open a habit\'s detail screen to add a reminder.');
    }
  };

  const habitsWithReminders = habits.filter(h => h.reminders.length > 0).length;
  const freezeSummary = habits.slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader t={t} eyebrow="Preferences" title="Settings" />

        {/* Appearance */}
        <Section t={t} label="Appearance">
          <SettingsRow
            t={t}
            label="Theme"
            right={
              <Segmented
                t={t}
                value={themeMode}
                onChange={setThemeMode}
                options={[
                  { v: 'light', label: 'Light', icon: <Ionicons name="sunny-outline" size={14} color={themeMode === 'light' ? t.text : t.muted}/> },
                  { v: 'system', label: 'Auto' },
                  { v: 'dark', label: 'Dark', icon: <Ionicons name="moon-outline" size={14} color={themeMode === 'dark' ? t.text : t.muted}/> },
                ]}
              />
            }
          />
          <SettingsRow
            t={t}
            label="Accent"
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ACCENT_OPTIONS.map(a => (
                  <Pressable
                    key={a.value}
                    onPress={() => setAccent(a.value as AccentName)}
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: a.color,
                      borderWidth: accent === a.value ? 2 : 0,
                      borderColor: t.text,
                    }}
                  />
                ))}
              </View>
            }
          />
          <SettingsRow
            t={t}
            label="Card style"
            last
            right={
              <Segmented
                t={t}
                value={card}
                onChange={setCard}
                options={[
                  { v: 'soft',     label: 'Soft'    },
                  { v: 'outlined', label: 'Outline' },
                  { v: 'shadow',   label: 'Lift'    },
                ]}
              />
            }
          />
        </Section>

        {/* Reminders */}
        <Section t={t} label="Reminders">
          <SettingsRow
            t={t}
            label="Daily nudge"
            right={<Toggle t={t} value={reminderEnabled} onChange={onToggleReminder} />}
          />
          <SettingsRow
            t={t}
            label="Time"
            chevron
            onPress={() => setShowTimePicker(true)}
            right={
              <Text style={{ ...MONO, color: reminderEnabled ? t.accent : t.subtle, fontSize: 14, fontWeight: '600' }}>
                {reminderTime}
              </Text>
            }
          />
          <SettingsRow
            t={t}
            label="Per-habit reminders"
            hint={`${habitsWithReminders} active`}
            chevron
            last
            onPress={onPerHabitReminders}
          />
        </Section>

        {/* Categories */}
        <Section t={t} label="Categories">
          <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {categories.map(c => (
              <View key={c.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
                backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.color }}/>
                <Text style={{ fontSize: 13, color: t.text }}>{c.name}</Text>
                <Text style={{ ...MONO, color: t.subtle, fontSize: 11 }}>
                  · {habits.filter(h => h.categoryId === c.id).length}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Streak freezes */}
        <Section t={t} label="Streak freezes">
          <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 18 }}>
            <Text style={{ color: t.muted, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
              Save your streak when life gets in the way. You earn 1 freeze every 7-day streak.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {freezeSummary.map(h => (
                <Pressable key={h.id} onPress={() => router.push(`/habits/${h.id}` as any)} style={{
                  flex: 1, padding: 10, borderRadius: 12, backgroundColor: t.surfaceMute,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Ionicons name="snow-outline" size={11} color="#6e6fd9" />
                    <Text style={{ ...MONO, fontSize: 14, color: t.text, fontWeight: '600' }}>
                      {h.freezesLeft}
                    </Text>
                  </View>
                  <Text style={{
                    color: t.muted, fontSize: 11, lineHeight: 15,
                  }} numberOfLines={1}>
                    {h.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Section>

        {/* About */}
        <Section t={t} label="About">
          <SettingsRow
            t={t}
            label="Replay onboarding"
            chevron
            onPress={() => router.push('/onboarding' as any)}
          />
          <SettingsRow
            t={t}
            label="Export data"
            hint="JSON"
            chevron
            onPress={onExportData}
          />
          <SettingsRow
            t={t}
            label="Reset all data"
            hint="Cannot be undone"
            danger
            last
            onPress={onResetData}
          />
        </Section>

        <TimePickerModal
          t={t}
          visible={showTimePicker}
          value={reminderTime}
          onConfirm={onTimeConfirm}
          onCancel={() => setShowTimePicker(false)}
        />

        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ ...MONO, color: t.subtle, fontSize: 11, letterSpacing: 1.4 }}>
            v 2.0 · BUILT WITH CARE
          </Text>
        </View>
      </ScrollView>

      <Toast t={t} message={toast} />
    </View>
  );
}
