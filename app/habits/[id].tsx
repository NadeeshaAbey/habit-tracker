import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, addDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import {
  cardStyle, GlyphTile, HabitHeatmap, BarChart, PeriodIcon, IconBtn, MONO,
  TimePickerModal, Toast,
} from '@/components/ui';
import {
  getHabitById, getLogsForHabit, setLogCount,
  updateHabitReminders, freezeLog, deleteHabit,
} from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { buildLogMap, computeHabitStreak, computeHabitBest, completionRate } from '@/utils/streak';
import { PERIODS } from '@/theme/design';
import type { Habit, HabitLog, Category } from '@/types';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingReminderIdx, setEditingReminderIdx] = useState<number>(-1);
  const [freezeDay, setFreezeDay] = useState(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [toast, setToast] = useState<string | null>(null);

  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const load = useCallback(async () => {
    const since = format(subDays(today, 119), 'yyyy-MM-dd');
    const [h, rawLogs, cats] = await Promise.all([
      getHabitById(Number(id)),
      getLogsForHabit(Number(id), since),
      listCategories(),
    ]);
    setHabit(h);
    setLogs(buildLogMap(rawLogs));
    setCategories(cats);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (!habit) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <Text style={{ color: t.muted }}>Habit not found.</Text>
      </View>
    );
  }

  const cat = categories.find(c => c.id === habit.categoryId);
  const tint = cat?.color ?? t.accent;

  const streak = computeHabitStreak(habit, logs, today);
  const best = computeHabitBest(habit, logs, 120, today);
  const rate30 = completionRate(habit, logs, 30, today);
  const rate90 = completionRate(habit, logs, 90, today);
  const totalDone = [...logs.values()].filter(l => l.count >= habit.targetPerDay).length;

  const todayLog = logs.get(`${habit.id}|${todayKey}`);
  const todayCount = todayLog?.count ?? 0;
  const todayDone = todayCount >= habit.targetPerDay;

  const onToggleToday = async () => {
    const next = todayDone ? 0 : 1;
    await setLogCount(habit.id, todayKey, next);
    setLogs(prev => {
      const m = new Map(prev);
      const key = `${habit.id}|${todayKey}`;
      if (next === 0) m.delete(key);
      else m.set(key, { id: 0, habitId: habit.id, date: todayKey, count: 1, frozen: false, createdAt: Date.now() });
      return m;
    });
  };

  const onIncrementToday = async (delta: number) => {
    const key = `${habit.id}|${todayKey}`;
    const cur = todayCount;
    const next = Math.max(0, Math.min(cur + delta, habit.targetPerDay * 2));
    await setLogCount(habit.id, todayKey, next);
    setLogs(prev => {
      const m = new Map(prev);
      if (next === 0) m.delete(key);
      else m.set(key, { id: 0, habitId: habit.id, date: todayKey, count: next, frozen: false, createdAt: Date.now() });
      return m;
    });
  };

  const onUseFreeze = async () => {
    if (habit.freezesLeft === 0) return;
    await freezeLog(habit.id, freezeDay);
    const newFreezesLeft = habit.freezesLeft - 1;
    setHabit(prev => prev ? { ...prev, freezesLeft: newFreezesLeft } : prev);
    const key = `${habit.id}|${freezeDay}`;
    setLogs(prev => {
      const m = new Map(prev);
      m.set(key, { id: 0, habitId: habit.id, date: freezeDay, count: 0, frozen: true, createdAt: Date.now() });
      return m;
    });
    showToast(`Day frozen · ${newFreezesLeft} freeze${newFreezesLeft === 1 ? '' : 's'} left`);
  };

  const onAddReminder = () => {
    setEditingReminderIdx(-1);
    setShowTimePicker(true);
  };

  const onReminderConfirm = async (time: string) => {
    if (!habit) return;
    setShowTimePicker(false);
    const newReminders =
      editingReminderIdx === -1
        ? [...habit.reminders, time]
        : habit.reminders.map((r, i) => (i === editingReminderIdx ? time : r));
    await updateHabitReminders(habit.id, newReminders);
    setHabit(prev => prev ? { ...prev, reminders: newReminders } : prev);
  };

  const onRemoveReminder = async (i: number) => {
    const newReminders = habit.reminders.filter((_, j) => j !== i);
    await updateHabitReminders(habit.id, newReminders);
    setHabit(prev => prev ? { ...prev, reminders: newReminders } : prev);
  };

  const onArchive = () => {
    Alert.alert(
      'Archive habit?',
      'It will be hidden from your dashboard. Log history is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: async () => {
          await deleteHabit(habit.id);
          router.back();
        }},
      ]
    );
  };

  const onDotMenu = () => {
    Alert.alert('Options', undefined, [
      { text: todayDone ? 'Unmark today' : 'Mark today', onPress: onToggleToday },
      { text: 'Edit habit', onPress: () => router.push(`/habits/new?editId=${habit.id}` as any) },
      { text: 'Archive', style: 'destructive', onPress: onArchive },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // 14-day freeze picker days (13 days ago → today)
  const freezeDays = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    const key = format(d, 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${key}`);
    const disabled = !!(log && (log.count >= habit.targetPerDay || log.frozen));
    return {
      key,
      label: key === todayKey ? 'Today' : format(d, 'MMM d'),
      disabled,
    };
  });

  // Build heatmap cells
  const COLS = 13, ROWS = 7;
  const gridBase = subDays(today, 83);
  const gridStart = subDays(gridBase, gridBase.getDay());
  const heatCells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const d = addDays(gridStart, i);
    if (d > today) return 'transparent';
    const k = format(d, 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${k}`);
    if (log?.frozen) return '#6e6fd966';
    if (log && log.count >= habit.targetPerDay) return tint;
    if (log && log.count > 0) return `${tint}55`;
    return t.surfaceMute;
  });

  // 30-day bar data
  const barData30 = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(today, 29 - i), 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${d}`);
    const v = log ? (log.frozen ? 0.4 : Math.min(log.count / habit.targetPerDay, 1)) : 0;
    return {
      value: v,
      color: log?.frozen ? '#6e6fd9aa' : v >= 1 ? tint : v > 0 ? `${tint}77` : t.surfaceMute,
      outlined: i === 29,
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconBtn t={t} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </IconBtn>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconBtn t={t} onPress={() => router.push(`/habits/new?editId=${habit.id}` as any)}>
            <Ionicons name="pencil-outline" size={18} color={t.text} />
          </IconBtn>
          <IconBtn t={t} onPress={onDotMenu}>
            <Ionicons name="ellipsis-horizontal" size={18} color={t.text} />
          </IconBtn>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <GlyphTile t={t} glyph={habit.glyph} color={tint} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.6 }}>
                {habit.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                {cat && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tint }}/>
                    <Text style={{ color: t.muted, fontSize: 12 }}>{cat.name}</Text>
                  </View>
                )}
                <Text style={{ color: t.subtle }}>·</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <PeriodIcon id={habit.period} color={t.muted} size={12} />
                  <Text style={{ color: t.muted, fontSize: 12 }}>
                    {PERIODS.find(p => p.id === habit.period)?.name}
                  </Text>
                </View>
                {habit.targetPerDay > 1 && (
                  <>
                    <Text style={{ color: t.subtle }}>·</Text>
                    <Text style={{ ...MONO, color: t.muted, fontSize: 12 }}>
                      {habit.targetPerDay}×/day
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Streak hero */}
          <View style={cardStyle(t, {
            padding: 20, flexDirection: 'row', gap: 18, alignItems: 'center',
            backgroundColor: streak > 0 ? `${tint}11` : undefined,
            borderWidth: streak > 0 ? 1 : 0,
            borderColor: streak > 0 ? `${tint}33` : 'transparent',
          })}>
            <View style={{
              width: 76, height: 76, borderRadius: 38,
              backgroundColor: `${tint}22`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="flame" size={22} color={tint} />
              <Text style={{ ...MONO, color: tint, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
                {streak}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Current streak
              </Text>
              <Text style={{ color: t.text, fontSize: 18, fontWeight: '600', marginTop: 4, letterSpacing: -0.3 }}>
                {streak} day{streak === 1 ? '' : 's'} in a row
              </Text>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 6 }}>
                BEST · {best}D  ·  FREEZES · {habit.freezesLeft}
              </Text>
            </View>
          </View>

          {/* Today action */}
          <View style={{ marginTop: 12 }}>
            {habit.targetPerDay > 1 ? (
              <View style={cardStyle(t, { padding: 16 })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    Today
                  </Text>
                  <Text style={{ ...MONO, color: t.text, fontSize: 13, fontWeight: '600' }}>
                    {todayCount} / {habit.targetPerDay}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
                  {Array.from({ length: habit.targetPerDay }, (_, i) => (
                    <View key={i} style={{
                      flex: 1, height: 10, borderRadius: 5,
                      backgroundColor: i < todayCount ? tint : t.surfaceMute,
                    }}/>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => onIncrementToday(-1)}
                    disabled={todayCount === 0}
                    style={[styles.actionBtn, {
                      flex: 1, backgroundColor: t.surfaceMute,
                      opacity: todayCount === 0 ? 0.4 : 1,
                    }]}
                  >
                    <Ionicons name="remove" size={14} color={t.text} />
                    <Text style={{ color: t.text, fontSize: 14, fontWeight: '500' }}>Remove</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onIncrementToday(1)}
                    style={[styles.actionBtn, {
                      flex: 2, backgroundColor: todayDone ? t.surfaceMute : tint,
                    }]}
                  >
                    <Ionicons name={todayDone ? 'checkmark' : 'add'} size={15} color={todayDone ? t.text : '#fff'} />
                    <Text style={{ color: todayDone ? t.text : '#fff', fontSize: 14, fontWeight: '500' }}>
                      {todayDone ? 'Goal reached' : 'Log one'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={onToggleToday}
                style={[styles.actionBtn, {
                  width: '100%', paddingVertical: 14,
                  backgroundColor: todayDone ? t.surfaceMute : tint,
                  borderWidth: todayDone ? 1 : 0, borderColor: t.border,
                  borderRadius: 14,
                }]}
              >
                <Ionicons name={todayDone ? 'checkmark' : 'radio-button-off'} size={17} color={todayDone ? t.text : '#fff'} />
                <Text style={{ color: todayDone ? t.text : '#fff', fontSize: 15, fontWeight: '500' }}>
                  {todayDone ? 'Done for today' : 'Mark today complete'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={{ paddingHorizontal: 14, paddingTop: 18, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <DetailStat t={t} label="30 days" value={Math.round(rate30 * 100)} suffix="%" />
            <DetailStat t={t} label="90 days" value={Math.round(rate90 * 100)} suffix="%" />
            <DetailStat t={t} label="Total"   value={totalDone} suffix="d" />
          </View>
        </View>

        {/* 12-week heatmap */}
        <View style={{ paddingHorizontal: 14, paddingTop: 18, paddingBottom: 4 }}>
          <View style={cardStyle(t, { padding: 16 })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Last 12 weeks
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {[1, 0.6, 0.3, 0].map(v => (
                  <View key={v} style={{
                    width: 9, height: 9, borderRadius: 2,
                    backgroundColor: v >= 1 ? tint : v >= 0.6 ? `${tint}99` : v >= 0.3 ? `${tint}55` : t.surfaceMute,
                  }}/>
                ))}
              </View>
            </View>
            <HabitHeatmap t={t} cols={COLS} rows={ROWS} cells={heatCells} height={110} />
          </View>
        </View>

        {/* 30-day bar chart */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
          <View style={cardStyle(t, { padding: 16 })}>
            <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
              Last 30 days
            </Text>
            <BarChart t={t} data={barData30} height={84} gap={2} barRadius={2} />
          </View>
        </View>

        {/* Reminders */}
        <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
            Reminders
          </Text>
        </View>
        <View style={{ paddingHorizontal: 14 }}>
          <View style={cardStyle(t, { padding: 4 })}>
            {habit.reminders.length === 0 && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: t.muted, fontSize: 13 }}>No reminders. Add one to get nudged.</Text>
              </View>
            )}
            {habit.reminders.map((r, i) => (
              <Pressable key={i} onPress={() => { setEditingReminderIdx(i); setShowTimePicker(true); }} style={{
                paddingHorizontal: 12, paddingVertical: 12,
                borderBottomWidth: i < habit.reminders.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: t.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: t.surfaceMute,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="notifications-outline" size={15} color={t.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...MONO, color: t.text, fontSize: 16, fontWeight: '600' }}>{r}</Text>
                  <Text style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>Tap to change · every day</Text>
                </View>
                <Pressable onPress={() => onRemoveReminder(i)} style={{ padding: 8 }} hitSlop={8}>
                  <Ionicons name="close" size={16} color={t.subtle} />
                </Pressable>
              </Pressable>
            ))}
            <Pressable onPress={onAddReminder} style={{
              paddingHorizontal: 14, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <Ionicons name="add" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '500' }}>Add reminder</Text>
            </Pressable>
          </View>
        </View>

        <TimePickerModal
          t={t}
          visible={showTimePicker}
          value={editingReminderIdx === -1 ? '08:00' : (habit.reminders[editingReminderIdx] ?? '08:00')}
          onConfirm={onReminderConfirm}
          onCancel={() => setShowTimePicker(false)}
        />

        {/* Streak Freeze */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
          <View style={cardStyle(t, { padding: 16, backgroundColor: t.surfaceMute })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: '#6e6fd922',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="snow-outline" size={18} color="#6e6fd9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>Streak Freeze</Text>
                <Text style={{ color: t.muted, fontSize: 12, marginTop: 1 }}>
                  <Text style={MONO}>{habit.freezesLeft}</Text> remaining · earn 1 every 7-day streak
                </Text>
              </View>
            </View>

            {/* 14-day day picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingHorizontal: 2 }}
            >
              {freezeDays.map(({ key, label, disabled }) => {
                const isSelected = freezeDay === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => { if (!disabled) setFreezeDay(key); }}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
                      backgroundColor: isSelected ? '#6e6fd9' : t.surfaceAlt,
                      opacity: disabled ? 0.38 : 1,
                    }}
                  >
                    <Text style={{
                      ...MONO, fontSize: 12, fontWeight: '500',
                      color: isSelected ? '#fff' : disabled ? t.subtle : t.text,
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Confirm */}
            <Pressable
              onPress={onUseFreeze}
              disabled={habit.freezesLeft === 0}
              style={{
                paddingVertical: 10, borderRadius: 100, alignItems: 'center',
                backgroundColor: habit.freezesLeft > 0 ? '#6e6fd9' : t.surfaceAlt,
                opacity: habit.freezesLeft === 0 ? 0.45 : 1,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: '600',
                color: habit.freezesLeft > 0 ? '#fff' : t.subtle,
              }}>
                {habit.freezesLeft > 0
                  ? `Freeze ${format(new Date(freezeDay + 'T00:00:00'), 'MMM d')}`
                  : 'No freezes left'
                }
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Archive */}
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 30 }}>
          <Pressable onPress={onArchive} style={[styles.actionBtn, {
            borderWidth: 1, borderColor: t.border, borderRadius: 14,
            paddingVertical: 14, backgroundColor: 'transparent',
          }]}>
            <Ionicons name="archive-outline" size={14} color={t.danger} />
            <Text style={{ color: t.danger, fontSize: 13, fontWeight: '500' }}>Archive habit</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Toast t={t} message={toast} />
    </View>
  );
}

function DetailStat({ t, label, value, suffix }: { t: any; label: string; value: number; suffix: string }) {
  return (
    <View style={[cardStyle(t, { padding: 14 }), { flex: 1 }]}>
      <Text style={{ ...MONO, color: t.muted, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ ...MONO, color: t.text, fontSize: 20, fontWeight: '600', marginTop: 6, letterSpacing: -0.4 }}>
        {value}<Text style={{ color: t.muted, fontSize: 11, fontWeight: '400' }}>{suffix}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 14, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
  },
});
