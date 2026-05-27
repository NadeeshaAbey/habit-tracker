import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, ActivityIndicator, Dimensions,
  Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { format, subDays } from 'date-fns';

import { palette, type Theme } from '@/theme/colors';
import { getHabitById, getLogsForHabit, updateHabit, deleteHabit } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { computeStreak, computeBestStreak } from '@/utils/streak';
import type { Habit, HabitLog, Category } from '@/types';

const DAYS = 30;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? palette.dark : palette.light;
  const s = styles(t);

  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const since = format(subDays(new Date(), DAYS - 1), 'yyyy-MM-dd');
      Promise.all([
        getHabitById(Number(id)),
        getLogsForHabit(Number(id), since),
        listCategories(),
      ]).then(([h, l, cats]) => {
        setHabit(h);
        setLogs(l);
        setCategories(cats);
        setEditName(h?.name ?? '');
        setEditCategoryId(h?.categoryId ?? null);
        setLoading(false);
      });
    }, [id])
  );

  const onSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Habit name cannot be empty.');
      return;
    }
    setSaving(true);
    await updateHabit(Number(id), trimmed, editCategoryId);
    setHabit(prev => prev ? { ...prev, name: trimmed, categoryId: editCategoryId } : prev);
    setSaving(false);
    setEditing(false);
  };

  const onCancel = () => {
    setEditName(habit?.name ?? '');
    setEditCategoryId(habit?.categoryId ?? null);
    setEditing(false);
  };

  const onArchive = () => {
    Alert.alert(
      'Archive habit?',
      'It will be hidden from your dashboard. Your log history is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(Number(id));
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.muted }}>Habit not found.</Text>
      </View>
    );
  }

  const doneSet = new Set(logs.map(l => l.date));
  const streak = computeStreak([...doneSet]);
  const bestStreak = computeBestStreak([...doneSet]);
  const completionRate = Math.round((doneSet.size / DAYS) * 100);

  const chartWidth = SCREEN_WIDTH - 48;
  const barWidth = Math.max(4, Math.floor((chartWidth - 40) / DAYS) - 1);

  const barData = Array.from({ length: DAYS }, (_, i) => {
    const d = format(subDays(new Date(), DAYS - 1 - i), 'yyyy-MM-dd');
    return {
      value: doneSet.has(d) ? 1 : 0,
      frontColor: doneSet.has(d) ? t.success : t.border,
      label: i % 7 === 0 ? format(subDays(new Date(), DAYS - 1 - i), 'M/d') : '',
    };
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Habit' : habit.name,
          headerRight: () =>
            !editing ? (
              <Pressable onPress={() => setEditing(true)} hitSlop={12}>
                <Ionicons name="pencil-outline" size={22} color={t.primary} />
              </Pressable>
            ) : (
              <Pressable onPress={onSave} disabled={saving} hitSlop={12}>
                <Text style={[s.headerBtn, saving && { opacity: 0.5 }]}>Save</Text>
              </Pressable>
            ),
          headerLeft: editing
            ? () => (
                <Pressable onPress={onCancel} hitSlop={12}>
                  <Text style={[s.headerBtn, { color: t.muted }]}>Cancel</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {editing ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: t.bg }}
          contentContainerStyle={s.editContainer}
          keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Habit name</Text>
          <TextInput
            style={s.input}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor={t.muted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
          />

          {categories.length > 0 && (
            <>
              <Text style={[s.label, { marginTop: 24 }]}>Category</Text>
              <View style={s.chips}>
                {categories.map(cat => {
                  const selected = cat.id === editCategoryId;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setEditCategoryId(selected ? null : cat.id)}
                      style={[s.chip, { borderColor: cat.color }, selected && { backgroundColor: cat.color }]}>
                      <Text style={[s.chipText, selected && { color: '#fff' }]}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={s.container}>
          <Text style={s.habitName}>{habit.name}</Text>

          <View style={s.statsRow}>
            <StatCard label="Streak" value={`${streak} 🔥`} t={t} />
            <StatCard label="Best" value={`${bestStreak}d`} t={t} />
            <StatCard label="30-day" value={`${completionRate}%`} t={t} />
          </View>

          <Text style={s.sectionLabel}>Last 30 days</Text>
          <View style={s.chartCard}>
            <BarChart
              data={barData}
              width={chartWidth - 32}
              height={120}
              barWidth={barWidth}
              spacing={1}
              hideRules
              hideYAxisText
              xAxisColor={t.border}
              yAxisColor={t.border}
              xAxisLabelTextStyle={{ color: t.muted, fontSize: 10 }}
              noOfSections={1}
              maxValue={1}
              isAnimated
            />
          </View>

          <Pressable onPress={onArchive} style={s.archiveBtn}>
            <Ionicons name="archive-outline" size={18} color="#EF4444" />
            <Text style={s.archiveBtnText}>Archive Habit</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

function StatCard({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <View style={[statCard.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[statCard.value, { color: t.text }]}>{value}</Text>
      <Text style={[statCard.label, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

const statCard = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  value: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 2 },
});

const styles = (t: Theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, gap: 16 },
  habitName: { color: t.text, fontSize: 28, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: {
    color: t.muted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8,
  },
  chartCard: {
    backgroundColor: t.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: t.border,
  },
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, padding: 16, borderRadius: 14,
    backgroundColor: t.surface, borderWidth: 1, borderColor: '#EF4444',
  },
  archiveBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  headerBtn: { color: t.primary, fontWeight: '600', fontSize: 16 },
  editContainer: { padding: 24, gap: 8 },
  label: {
    color: t.muted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: t.surface, color: t.text, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: t.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: t.text, fontSize: 14 },
});
