import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import {
  cardStyle, GlyphTile, ProgressRing, PeriodIcon, ScreenHeader, IconBtn, MONO,
} from '@/components/ui';
import {
  listActiveHabits, getLogsForRange, setLogCount, incrementLog,
} from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { buildLogMap } from '@/utils/streak';
import { PERIODS } from '@/theme/design';
import type { Habit, HabitLog, Category } from '@/types';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export default function TodayScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(todayStr);

  const load = useCallback(async () => {
    const today = todayStr();
    const since = format(subDays(new Date(), 89), 'yyyy-MM-dd');
    const [h, rawLogs, cats] = await Promise.all([
      listActiveHabits(),
      getLogsForRange(since, today),
      listCategories(),
    ]);
    setHabits(h);
    setLogs(buildLogMap(rawLogs));
    setCategories(cats);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = new Date();
  const todayKey = todayStr();
  const isToday = selectedKey === todayKey;
  const isFuture = selectedKey > todayKey;

  const done = useMemo(
    () => habits.filter(h => {
      const log = logs.get(`${h.id}|${selectedKey}`);
      return log && (log.frozen || log.count >= h.targetPerDay);
    }).length,
    [habits, logs, selectedKey]
  );
  const total = habits.length;
  const pct = total ? done / total : 0;

  const overallStreak = useMemo(() => {
    let c = 0;
    for (let off = 0; off < 60; off++) {
      const d = format(subDays(today, off), 'yyyy-MM-dd');
      const allDone = habits.every(h => {
        const log = logs.get(`${h.id}|${d}`);
        return log && (log.count >= h.targetPerDay || log.frozen);
      });
      if (off === 0 && !allDone) continue;
      if (off > 0 && !allDone) break;
      if (allDone) c++;
    }
    return c;
  }, [habits, logs]);

  const byPeriod = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    habits.forEach(h => { (groups[h.period] ||= []).push(h); });
    return PERIODS.filter(p => groups[p.id]?.length).map(p => ({ ...p, items: groups[p.id] }));
  }, [habits]);

  const onToggle = useCallback(async (habit: Habit) => {
    if (isFuture) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${habit.id}|${selectedKey}`;
    const cur = logs.get(key)?.count ?? 0;
    if (habit.targetPerDay === 1) {
      const next = cur >= 1 ? 0 : 1;
      await setLogCount(habit.id, selectedKey, next);
      setLogs(prev => {
        const m = new Map(prev);
        if (next === 0) m.delete(key);
        else m.set(key, { id: 0, habitId: habit.id, date: selectedKey, count: 1, frozen: false, createdAt: Date.now() });
        return m;
      });
    } else {
      const newCount = await incrementLog(habit.id, selectedKey, habit.targetPerDay);
      setLogs(prev => {
        const m = new Map(prev);
        if (newCount === 0) m.delete(key);
        else m.set(key, { id: 0, habitId: habit.id, date: selectedKey, count: newCount, frozen: false, createdAt: Date.now() });
        return m;
      });
    }
  }, [logs, selectedKey, isFuture]);

  const onIncrement = useCallback(async (habit: Habit, delta: number) => {
    if (isFuture) return;
    const key = `${habit.id}|${selectedKey}`;
    const cur = logs.get(key)?.count ?? 0;
    const next = Math.max(0, Math.min(cur + delta, habit.targetPerDay * 2));
    await setLogCount(habit.id, selectedKey, next);
    setLogs(prev => {
      const m = new Map(prev);
      if (next === 0) m.delete(key);
      else m.set(key, { id: 0, habitId: habit.id, date: selectedKey, count: next, frozen: false, createdAt: Date.now() });
      return m;
    });
  }, [logs, selectedKey, isFuture]);

  const getCatColor = (habit: Habit) => {
    const dbCat = categories.find(c => c.id === habit.categoryId);
    if (dbCat) return dbCat.color;
    return t.accent;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          t={t}
          eyebrow={format(today, 'EEEE, MMM d')}
          title="Today"
          right={
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {!isToday && (
                <IconBtn t={t} onPress={() => setSelectedKey(todayKey)} active>
                  <Ionicons name="today-outline" size={18} color={t.accent} />
                </IconBtn>
              )}
              <IconBtn t={t} onPress={() => router.push('/settings' as any)}>
                <Ionicons name="settings-outline" size={20} color={t.text} />
              </IconBtn>
            </View>
          }
        />

        {/* Progress hero */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
          <View style={cardStyle(t, { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18 })}>
            <ProgressRing t={t} pct={pct} done={done} total={total} size={68} stroke={5} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {isToday ? 'Daily progress' : format(new Date(selectedKey + 'T00:00:00'), 'EEE, MMM d')}
              </Text>
              <Text style={{ color: t.text, fontSize: 22, fontWeight: '600', marginTop: 4, letterSpacing: -0.3 }}>
                {isToday
                  ? (done === total && total > 0 ? 'All done.' : `${total - done} habit${total - done === 1 ? '' : 's'} left`)
                  : `${done}/${total} logged`
                }
              </Text>
              <View style={{ marginTop: 10 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
                  backgroundColor: t.accentSoft, alignSelf: 'flex-start',
                }}>
                  <Ionicons name="flame" size={13} color={t.accent} />
                  <Text style={{ ...MONO, color: t.accent, fontSize: 12, fontWeight: '500' }}>
                    {overallStreak} day{overallStreak === 1 ? '' : 's'} all‑green
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Week strip */}
        <WeekStrip
          t={t} habits={habits} logs={logs} today={today}
          selectedKey={selectedKey} onSelectDay={setSelectedKey}
        />

        {/* Habit groups */}
        <View style={{ paddingTop: 6 }}>
          {byPeriod.length === 0 && (
            <EmptyState t={t} onAdd={() => router.push('/habits/new')} />
          )}
          {byPeriod.map(group => {
            const groupDone = group.items.filter(h => {
              const log = logs.get(`${h.id}|${selectedKey}`);
              return log && (log.count >= h.targetPerDay || log.frozen);
            }).length;
            return (
              <View key={group.id} style={{ marginBottom: 14 }}>
                <View style={{
                  paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}>
                  <PeriodIcon id={group.id as any} color={t.muted} size={14} />
                  <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {group.name}
                  </Text>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />
                  <Text style={{ ...MONO, color: t.subtle, fontSize: 11 }}>
                    {groupDone}/{group.items.length}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 14, gap: 8 }}>
                  {group.items.map(h => (
                    <HabitRow
                      key={h.id}
                      t={t}
                      habit={h}
                      logs={logs}
                      dateKey={selectedKey}
                      catColor={getCatColor(h)}
                      readOnly={isFuture}
                      onToggle={() => onToggle(h)}
                      onIncrement={(d) => onIncrement(h, d)}
                      onOpen={() => router.push(`/habits/${h.id}` as any)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {byPeriod.length > 0 && (
          <Text style={{
            ...MONO, color: t.subtle, fontSize: 11, letterSpacing: 1.2,
            textTransform: 'uppercase', textAlign: 'center', marginTop: 20,
          }}>
            Long-press a habit to open detail
          </Text>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/habits/new')}
        style={[
          styles.fab,
          { backgroundColor: t.text, bottom: insets.bottom + 80 },
        ]}
      >
        <Ionicons name="add" size={28} color={t.bg} />
      </Pressable>
    </View>
  );
}

function WeekStrip({
  t, habits, logs, today, selectedKey, onSelectDay,
}: {
  t: any; habits: Habit[]; logs: Map<string, HabitLog>; today: Date;
  selectedKey: string; onSelectDay: (k: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  const todayKey = format(today, 'yyyy-MM-dd');
  return (
    <View style={{ paddingHorizontal: 22, paddingBottom: 4 }}>
      <View style={cardStyle(t, { padding: 14 })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {days.map(d => {
            const k = format(d, 'yyyy-MM-dd');
            const done = habits.filter(h => {
              const log = logs.get(`${h.id}|${k}`);
              return log && (log.count >= h.targetPerDay || log.frozen);
            }).length;
            const total = habits.length;
            const pct = total ? done / total : 0;
            const isToday = k === todayKey;
            const isSelected = k === selectedKey;
            const bg = isSelected
              ? t.accent
              : pct >= 1 ? t.accent
              : pct > 0 ? `${t.accent}33`
              : t.surfaceMute;
            return (
              <Pressable key={k} onPress={() => onSelectDay(k)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Text style={{
                  ...MONO, fontSize: 10, letterSpacing: 0.5,
                  color: isSelected ? t.accent : isToday ? t.accent : t.muted,
                  fontWeight: isSelected || isToday ? '600' : '400',
                }}>
                  {format(d, 'EEEEE')}
                </Text>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: bg,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: isToday ? 2 : 0,
                  borderColor: t.accent,
                }}>
                  {(isSelected || pct >= 1) && !isToday ? (
                    isSelected && pct < 1 ? (
                      <Text style={{ ...MONO, fontSize: 12, color: t.onAccent, fontWeight: '500' }}>
                        {d.getDate()}
                      </Text>
                    ) : (
                      <Ionicons name="checkmark" size={16} color={t.onAccent} />
                    )
                  ) : pct >= 1 ? (
                    <Ionicons name="checkmark" size={16} color={t.onAccent} />
                  ) : (
                    <Text style={{ ...MONO, fontSize: 12, color: isSelected ? t.onAccent : pct > 0 ? t.text : t.subtle, fontWeight: '500' }}>
                      {d.getDate()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function HabitRow({
  t, habit, logs, dateKey, catColor, readOnly, onToggle, onIncrement, onOpen,
}: {
  t: any; habit: Habit; logs: Map<string, HabitLog>; dateKey: string;
  catColor: string; readOnly: boolean; onToggle: () => void; onIncrement: (d: number) => void; onOpen: () => void;
}) {
  const log = logs.get(`${habit.id}|${dateKey}`);
  const count = log?.count ?? 0;
  const isMulti = habit.targetPerDay > 1;
  const isDone = count >= habit.targetPerDay;
  const pct = Math.min(count / habit.targetPerDay, 1);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressIn = () => { pressTimer.current = setTimeout(onOpen, 480); };
  const onPressOut = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        cardStyle(t, {
          paddingVertical: 14, paddingHorizontal: 14,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }),
        { opacity: isDone ? 0.7 : readOnly ? 0.5 : 1 },
      ]}
    >
      <GlyphTile t={t} glyph={habit.glyph} color={catColor} size={42} />

      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={onOpen}>
        <Text style={{
          color: t.text, fontSize: 15, fontWeight: '500',
          textDecorationLine: isDone && !isMulti ? 'line-through' : 'none',
        }}>
          {habit.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: catColor }} />
          <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 0.3 }}>
            {isMulti ? `${count}/${habit.targetPerDay}` : ''}
          </Text>
        </View>
        {isMulti && habit.targetPerDay <= 10 && (
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
            {Array.from({ length: habit.targetPerDay }, (_, i) => (
              <View key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                backgroundColor: i < count ? catColor : t.surfaceMute,
              }} />
            ))}
          </View>
        )}
        {isMulti && habit.targetPerDay > 10 && (
          <View style={{ marginTop: 6, height: 4, backgroundColor: t.surfaceMute, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: catColor }} />
          </View>
        )}
      </Pressable>

      {isMulti ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {count > 0 && (
            <Pressable
              onPress={() => onIncrement(-1)}
              disabled={readOnly}
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: t.surfaceMute,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="remove" size={14} color={t.muted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => onIncrement(1)}
            disabled={readOnly}
            style={{
              minWidth: 44, height: 32, paddingHorizontal: 10, borderRadius: 10,
              backgroundColor: isDone ? t.accent : `${catColor}22`,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3,
            }}
          >
            <Ionicons
              name={isDone ? 'checkmark' : 'add'}
              size={14}
              color={isDone ? t.onAccent : catColor}
            />
            <Text style={{ ...MONO, fontSize: 13, color: isDone ? t.onAccent : catColor, fontWeight: '600' }}>
              {count}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onToggle}
          disabled={readOnly}
          style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: isDone ? t.accent : 'transparent',
            borderWidth: 2,
            borderColor: isDone ? t.accent : t.borderStrong,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <Ionicons name="checkmark" size={16} color={t.onAccent} />}
        </Pressable>
      )}
    </Pressable>
  );
}

function EmptyState({ t, onAdd }: { t: any; onAdd: () => void }) {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: t.accentSoft, marginBottom: 14,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name="sparkles-outline" size={26} color={t.accent} />
      </View>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: '500', marginBottom: 4 }}>
        Start your first habit
      </Text>
      <Text style={{ color: t.muted, fontSize: 13, marginBottom: 18, textAlign: 'center', paddingHorizontal: 24 }}>
        Pick from a template or build your own.
      </Text>
      <Pressable
        onPress={onAdd}
        style={{
          backgroundColor: t.text, paddingHorizontal: 18, paddingVertical: 10,
          borderRadius: 100, flexDirection: 'row', alignItems: 'center', gap: 6,
        }}
      >
        <Ionicons name="add" size={16} color={t.bg} />
        <Text style={{ color: t.bg, fontSize: 14, fontWeight: '500' }}>Add a habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
