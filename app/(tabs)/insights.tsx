import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { format, subDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { cardStyle, ScreenHeader, GlyphTile, BarChart, PeriodIcon, MONO } from '@/components/ui';
import { listActiveHabits, getLogsForRange } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import {
  buildLogMap, computeHabitStreak, computeHabitBest, completionRate,
} from '@/utils/streak';
import { PERIODS } from '@/theme/design';
import type { Habit, HabitLog, Category } from '@/types';

export default function InsightsScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);

  const load = useCallback(async () => {
    const since = format(subDays(today, 120), 'yyyy-MM-dd');
    const until = format(today, 'yyyy-MM-dd');
    const [h, rawLogs, cats] = await Promise.all([
      listActiveHabits(),
      getLogsForRange(since, until),
      listCategories(),
    ]);
    setHabits(h);
    setLogs(buildLogMap(rawLogs));
    setCategories(cats);
    setLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getCatColor = (habit: Habit) =>
    categories.find(c => c.id === habit.categoryId)?.color ?? t.accent;

  const avg30 = useMemo(() => {
    if (!habits.length) return 0;
    let total = 0, done = 0;
    habits.forEach(h => {
      for (let off = 0; off < 30; off++) {
        total++;
        const d = format(subDays(today, off), 'yyyy-MM-dd');
        const log = logs.get(`${h.id}|${d}`);
        if (log && log.count >= h.targetPerDay) done++;
      }
    });
    return total ? done / total : 0;
  }, [habits, logs, today]);

  const bestOverall = useMemo(() =>
    habits.reduce((best, h) => Math.max(best, computeHabitBest(h, logs, 120, today)), 0),
  [habits, logs, today]);

  const weeklyDone = useCallback((offset: number) => {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(today, offset + i), 'yyyy-MM-dd');
      habits.forEach(h => {
        if ((logs.get(`${h.id}|${d}`)?.count ?? 0) >= h.targetPerDay) count++;
      });
    }
    return count;
  }, [habits, logs, today]);

  const thisWeek = weeklyDone(0);
  const lastWeek = weeklyDone(7);
  const wow = lastWeek === 0 ? 0 : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    const k = format(d, 'yyyy-MM-dd');
    const total = habits.length;
    const done = habits.filter(h => (logs.get(`${h.id}|${k}`)?.count ?? 0) >= h.targetPerDay).length;
    return { d, pct: total ? done / total : 0 };
  }), [habits, logs, today]);

  const catStats = useMemo(() => categories.map(cat => {
    const hs = habits.filter(h => h.categoryId === cat.id);
    if (!hs.length) return null;
    let possible = 0, done = 0;
    hs.forEach(h => {
      for (let off = 0; off < 30; off++) {
        possible++;
        const d = format(subDays(today, off), 'yyyy-MM-dd');
        const log = logs.get(`${h.id}|${d}`);
        if (log && log.count >= h.targetPerDay) done++;
      }
    });
    return { ...cat, pct: possible ? done / possible : 0, count: hs.length };
  }).filter(Boolean) as Array<Category & { pct: number; count: number }>, [categories, habits, logs, today]);

  const periodStats = useMemo(() => PERIODS.map(p => {
    const hs = habits.filter(h => h.period === p.id);
    if (!hs.length) return null;
    let possible = 0, done = 0;
    hs.forEach(h => {
      for (let off = 0; off < 30; off++) {
        possible++;
        const d = format(subDays(today, off), 'yyyy-MM-dd');
        const log = logs.get(`${h.id}|${d}`);
        if (log && log.count >= h.targetPerDay) done++;
      }
    });
    return { ...p, pct: possible ? done / possible : 0, count: hs.length };
  }).filter(Boolean) as Array<{ id: string; name: string; pct: number; count: number }>, [habits, logs, today]);

  const dowStats = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
    for (let off = 0; off < 56; off++) {
      const d = subDays(today, off);
      const dow = d.getDay();
      const k = format(d, 'yyyy-MM-dd');
      habits.forEach(h => {
        buckets[dow].total++;
        const log = logs.get(`${h.id}|${k}`);
        if (log && log.count >= h.targetPerDay) buckets[dow].done++;
      });
    }
    return buckets.map((b, i) => ({
      day: ['S','M','T','W','T','F','S'][i],
      full: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      pct: b.total ? b.done / b.total : 0,
    }));
  }, [habits, logs, today]);
  const bestDow = dowStats.reduce((acc, cur) => cur.pct > acc.pct ? cur : acc, dowStats[0]);

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
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader t={t} eyebrow="Last 30 days" title="Insights" />

        {/* Big stats */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 16, flexDirection: 'row', gap: 10 }}>
          <BigStat
            t={t}
            label="Completion"
            value={`${Math.round(avg30 * 100)}`}
            suffix="%"
            trend={wow}
            hint={`${wow >= 0 ? '+' : ''}${wow}% vs last week`}
          />
          <BigStat
            t={t}
            label="Best streak"
            value={String(bestOverall)}
            suffix="d"
            hint={`${habits.length} active habits`}
            accent
          />
        </View>

        {/* 14-day bar chart */}
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={cardStyle(t, { padding: 16 })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Daily completion
              </Text>
              <Text style={{ ...MONO, color: t.subtle, fontSize: 11 }}>14 days</Text>
            </View>
            <BarChart
              t={t}
              data={last14.map((d, i) => ({
                value: d.pct,
                color: d.pct >= 1 ? t.accent : d.pct > 0 ? `${t.accent}88` : t.surfaceMute,
                label: (i % 2 === 0 || i === last14.length - 1) ? String(d.d.getDate()) : '',
                labelColor: i === last14.length - 1 ? t.text : t.subtle,
                outlined: i === last14.length - 1,
              }))}
              height={108} gap={4}
            />
          </View>
        </View>

        {/* By category */}
        {catStats.length > 0 && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <View style={cardStyle(t, { padding: 16 })}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
                By category · 30d
              </Text>
              <View style={{ gap: 12 }}>
                {catStats.map(c => (
                  <View key={c.id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.color }}/>
                        <Text style={{ color: t.text, fontSize: 13, fontWeight: '500' }}>{c.name}</Text>
                        <Text style={{ ...MONO, color: t.subtle, fontSize: 11 }}>· {c.count}</Text>
                      </View>
                      <Text style={{ ...MONO, color: t.text, fontSize: 12, fontWeight: '600' }}>
                        {Math.round(c.pct * 100)}%
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceMute, overflow: 'hidden' }}>
                      <View style={{ width: `${c.pct * 100}%`, height: '100%', backgroundColor: c.color }}/>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Time of day */}
        {periodStats.length > 0 && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <View style={cardStyle(t, { padding: 16 })}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
                Time of day · 30d
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {periodStats.map(p => (
                  <View key={p.id} style={{
                    flex: 1, padding: 12, borderRadius: 12, backgroundColor: t.surfaceMute, gap: 8,
                  }}>
                    <PeriodIcon id={p.id as any} color={t.muted} size={14} />
                    <Text style={{ ...MONO, color: t.text, fontSize: 20, fontWeight: '600', letterSpacing: -0.3 }}>
                      {Math.round(p.pct * 100)}<Text style={{ fontSize: 11, color: t.muted }}>%</Text>
                    </Text>
                    <Text style={{ color: t.muted, fontSize: 11 }}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Day pattern */}
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={cardStyle(t, { padding: 16 })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Day pattern
              </Text>
              <Text style={{ color: t.text, fontSize: 11 }}>
                Best: <Text style={{ color: t.accent, fontWeight: '600' }}>{bestDow.full}</Text>
              </Text>
            </View>
            <BarChart
              t={t}
              data={dowStats.map(d => ({
                value: Math.max(d.pct, 0.04),
                color: d === bestDow ? t.accent : `${t.accent}55`,
                label: d.day,
                labelColor: d === bestDow ? t.accent : t.muted,
              }))}
              height={86} gap={5}
            />
          </View>
        </View>

        {/* Per-habit list */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 6 }}>
          <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
            By habit
          </Text>
        </View>
        <View style={{ paddingHorizontal: 14, gap: 8 }}>
          {habits.map(h => {
            const rate = completionRate(h, logs, 30, today);
            const streak = computeHabitStreak(h, logs, today);
            const best = computeHabitBest(h, logs, 120, today);
            const catColor = getCatColor(h);
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/habits/${h.id}` as any)}
                style={cardStyle(t, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 })}
              >
                <GlyphTile t={t} glyph={h.glyph} color={catColor} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: '500' }}>{h.name}</Text>
                  <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 2 }}>
                    🔥 {streak}d · best {best}d
                  </Text>
                </View>
                <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
                  <Text style={{ ...MONO, color: t.text, fontSize: 16, fontWeight: '600' }}>
                    {Math.round(rate * 100)}%
                  </Text>
                  <Text style={{ ...MONO, color: t.subtle, fontSize: 10, letterSpacing: 1 }}>30D</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function BigStat({
  t, label, value, suffix, hint, trend, accent,
}: {
  t: any; label: string; value: string; suffix: string; hint?: string; trend?: number; accent?: boolean;
}) {
  return (
    <View style={[cardStyle(t, { padding: 16 }), { flex: 1 }]}>
      <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 }}>
        <Text style={{ ...MONO, color: accent ? t.accent : t.text, fontSize: 34, fontWeight: '600', letterSpacing: -1 }}>
          {value}
        </Text>
        <Text style={{ ...MONO, color: t.muted, fontSize: 14, fontWeight: '500' }}>{suffix}</Text>
      </View>
      {hint ? (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {typeof trend === 'number' && trend !== 0 && (
            <Text style={{ color: trend > 0 ? t.accent : t.danger, fontWeight: '600' }}>
              {trend > 0 ? '↑' : '↓'}
            </Text>
          )}
          <Text style={{ ...MONO, color: t.muted, fontSize: 11 }}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}
