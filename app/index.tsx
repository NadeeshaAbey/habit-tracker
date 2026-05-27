import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useColorScheme, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { palette, type Theme } from '@/theme/colors';
import {
  listActiveHabits, getLogsForDate, toggleLog, deleteHabit,
} from '@/db/repositories/habits';
import type { Habit } from '@/types';

const todayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function Dashboard() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? palette.dark : palette.light;
  const s = styles(t);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [h, logs] = await Promise.all([
      listActiveHabits(),
      getLogsForDate(todayKey()),
    ]);
    setHabits(h);
    setDoneIds(new Set(logs.map(l => l.habitId)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggle = async (habit: Habit) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleLog(habit.id, todayKey());
    setDoneIds(prev => {
      const next = new Set(prev);
      next.has(habit.id) ? next.delete(habit.id) : next.add(habit.id);
      return next;
    });
  };

  const onDelete = async (habit: Habit) => {
    await deleteHabit(habit.id);
    setHabits(prev => prev.filter(h => h.id !== habit.id));
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  const completed = doneIds.size;
  const total = habits.length;

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>{format(new Date(), 'EEEE, MMM d')}</Text>
          <Text style={s.title}>Today</Text>
          <Text style={s.progress}>
            {total === 0 ? 'No habits yet' : `${completed} of ${total} done`}
          </Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable hitSlop={12}>
            <Ionicons name="settings-outline" size={24} color={t.muted} />
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={habits}
        keyExtractor={h => String(h.id)}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="leaf-outline" size={48} color={t.muted} />
            <Text style={s.emptyText}>Add your first habit to get started</Text>
          </View>
        }
        renderItem={({ item }) => {
          const done = doneIds.has(item.id);
          return (
            <Pressable
              onPress={() => onToggle(item)}
              onLongPress={() => onDelete(item)}
              style={s.card}>
              <View style={[s.check, done && s.checkDone]}>
                {done && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <Text style={[s.habitName, done && s.habitNameDone]}>{item.name}</Text>
              <Pressable onPress={() => router.push(`/habits/${item.id}` as any)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={18} color={t.muted} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      <Link href="/habits/new" asChild>
        <Pressable style={s.fab}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  date: { color: t.muted, fontSize: 14, marginBottom: 4 },
  title: { color: t.text, fontSize: 34, fontWeight: '700' },
  progress: { color: t.muted, fontSize: 15, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: t.surface, padding: 16, borderRadius: 14,
    marginBottom: 10, borderWidth: 1, borderColor: t.border,
  },
  check: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: t.muted,
    justifyContent: 'center', alignItems: 'center',
  },
  checkDone: { backgroundColor: t.success, borderColor: t.success },
  habitName: { color: t.text, fontSize: 16, flex: 1 },
  habitNameDone: { color: t.muted, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: t.muted, fontSize: 15 },
  fab: {
    position: 'absolute', right: 20, bottom: 32,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
