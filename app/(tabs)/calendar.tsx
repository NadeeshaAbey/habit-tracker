import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { format, subDays, startOfMonth, endOfMonth, addDays, eachDayOfInterval } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { cardStyle, ScreenHeader, GlyphTile, HabitHeatmap, Chip, MONO } from '@/components/ui';
import { listActiveHabits, getLogsForRange } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { buildLogMap, completionRate } from '@/utils/streak';
import type { Habit, HabitLog, Category } from '@/types';

export default function CalendarScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [activeHabitId, setActiveHabitId] = useState<number | null>(null);

  const today = new Date();

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
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getCatColor = (habit: Habit) =>
    categories.find(c => c.id === habit.categoryId)?.color ?? t.accent;

  const goPrev = () => setCursor(d => startOfMonth(subDays(d, 1)));
  const goNext = () => {
    const next = startOfMonth(addDays(endOfMonth(cursor), 1));
    if (next <= startOfMonth(today)) setCursor(next);
  };
  const canNext = endOfMonth(cursor) < endOfMonth(today);

  const intensity = useCallback((d: Date): { v: number; frozen: boolean } => {
    const k = format(d, 'yyyy-MM-dd');
    if (activeHabitId !== null) {
      const h = habits.find(x => x.id === activeHabitId);
      if (!h) return { v: 0, frozen: false };
      const log = logs.get(`${h.id}|${k}`);
      if (log?.frozen) return { v: 0.5, frozen: true };
      return { v: log && log.count >= h.targetPerDay ? 1 : (log?.count ?? 0) > 0 ? 0.4 : 0, frozen: false };
    }
    const total = habits.length;
    if (!total) return { v: 0, frozen: false };
    const done = habits.filter(h => {
      const log = logs.get(`${h.id}|${k}`);
      return log && log.count >= h.targetPerDay;
    }).length;
    const partial = habits.filter(h => {
      const log = logs.get(`${h.id}|${k}`);
      return log && log.count > 0 && log.count < h.targetPerDay;
    }).length;
    return { v: (done + partial * 0.4) / total, frozen: false };
  }, [habits, logs, activeHabitId]);

  const monthStats = useMemo(() => {
    const mEnd = endOfMonth(cursor);
    let perfect = 0, partial = 0, frozen = 0, days = 0;
    const interval = eachDayOfInterval({ start: cursor, end: mEnd > today ? today : mEnd });
    for (const d of interval) {
      days++;
      const k = format(d, 'yyyy-MM-dd');
      const total = habits.length;
      const done = habits.filter(h => {
        const log = logs.get(`${h.id}|${k}`);
        return log && log.count >= h.targetPerDay;
      }).length;
      if (done === total && total) perfect++;
      else if (done > 0) partial++;
      if (habits.some(h => logs.get(`${h.id}|${k}`)?.frozen)) frozen++;
    }
    return { perfect, partial, frozen, days };
  }, [cursor, habits, logs, today]);

  // Build calendar grid (6 weeks = 42 cells)
  const monthStart = cursor;
  const firstWeekday = monthStart.getDay();
  const gridStart = subDays(monthStart, firstWeekday);

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
        <ScreenHeader t={t} eyebrow="History" title="Calendar" />

        {/* Habit filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: 6 }}
          style={{ flexShrink: 0 }}
        >
          <Chip t={t} active={activeHabitId === null} onPress={() => setActiveHabitId(null)} label="All habits" />
          {habits.map(h => (
            <Chip
              key={h.id}
              t={t}
              active={activeHabitId === h.id}
              onPress={() => setActiveHabitId(h.id === activeHabitId ? null : h.id)}
              label={h.name}
              color={getCatColor(h)}
              glyph={h.glyph}
            />
          ))}
        </ScrollView>

        {/* Calendar card */}
        <View style={{ paddingHorizontal: 14 }}>
          <View style={cardStyle(t, { padding: 18 })}>
            {/* Month nav */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
            }}>
              <Pressable onPress={goPrev} style={navBtnStyle}>
                <Ionicons name="chevron-back" size={18} color={t.text} />
              </Pressable>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 }}>
                {format(cursor, 'MMMM yyyy')}
              </Text>
              <Pressable onPress={goNext} disabled={!canNext} style={[navBtnStyle, { opacity: canNext ? 1 : 0.3 }]}>
                <Ionicons name="chevron-forward" size={18} color={t.text} />
              </Pressable>
            </View>

            {/* Weekday header */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ ...MONO, color: t.muted, fontSize: 10, letterSpacing: 0.5 }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day cells */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: 42 }, (_, i) => {
                const d = addDays(gridStart, i);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isFuture = d > today;
                const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                const { v, frozen } = intensity(d);
                const bg =
                  isFuture ? t.surfaceMute :
                  v >= 1   ? t.accent :
                  v >= 0.6 ? `${t.accent}99` :
                  v >= 0.3 ? `${t.accent}55` :
                  v > 0    ? `${t.accent}22` :
                  t.surfaceMute;
                const fg = v >= 0.6 && !isFuture ? t.onAccent : t.text;
                return (
                  <View
                    key={i}
                    style={{
                      width: '14.28%', aspectRatio: 1,
                      padding: 2, opacity: inMonth ? 1 : 0.25,
                    }}
                  >
                    <View style={{
                      flex: 1, borderRadius: 8, backgroundColor: bg,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: isToday ? 1.5 : 0, borderColor: t.text,
                      position: 'relative',
                    }}>
                      <Text style={{
                        ...MONO, fontSize: 12,
                        color: fg, fontWeight: isToday ? '600' : '400',
                        opacity: isFuture ? 0.4 : 1,
                      }}>
                        {d.getDate()}
                      </Text>
                      {frozen && (
                        <View style={{ position: 'absolute', top: 1, right: 2 }}>
                          <Ionicons name="snow-outline" size={8} color="#6e6fd9" />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Month stats */}
            <View style={{
              flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 14,
              borderTopWidth: 1, borderTopColor: t.border,
            }}>
              <MonthStat t={t} label="Perfect" value={monthStats.perfect} suffix="d" tint={t.accent}/>
              <MonthStat t={t} label="Partial"  value={monthStats.partial}  suffix="d" tint={t.muted}/>
              <MonthStat t={t} label="Frozen"   value={monthStats.frozen}   suffix="d" tint="#6e6fd9"/>
              <MonthStat t={t} label="Logged"
                value={Math.round(((monthStats.perfect + monthStats.partial) / Math.max(monthStats.days, 1)) * 100)}
                suffix="%" tint={t.text}/>
            </View>
          </View>
        </View>

        {/* Per-habit heatmaps */}
        <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 }}>
          <Text style={{
            ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
          }}>Per habit · last 12 weeks</Text>
        </View>
        <View style={{ paddingHorizontal: 14, gap: 8 }}>
          {habits.map(h => (
            <MiniHeatmap
              key={h.id}
              t={t}
              habit={h}
              logs={logs}
              today={today}
              catColor={getCatColor(h)}
              onOpen={() => router.push(`/habits/${h.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MonthStat({ t, label, value, suffix, tint }: { t: any; label: string; value: number; suffix: string; tint: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...MONO, color: tint, fontSize: 18, fontWeight: '600', letterSpacing: -0.3 }}>
        {value}<Text style={{ fontSize: 11, color: t.muted }}>{suffix}</Text>
      </Text>
      <Text style={{ ...MONO, color: t.muted, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function MiniHeatmap({
  t, habit, logs, today, catColor, onOpen,
}: {
  t: any; habit: Habit; logs: Map<string, HabitLog>; today: Date; catColor: string; onOpen: () => void;
}) {
  const DAYS = 84; // 12 weeks
  const COLS = 13;
  const ROWS = 7;
  const start = subDays(today, DAYS - 1);
  const startWeekday = start.getDay();
  const gridStart = subDays(start, startWeekday);

  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const d = addDays(gridStart, i);
    const todayKey = format(today, 'yyyy-MM-dd');
    const sinceKey = format(subDays(today, DAYS), 'yyyy-MM-dd');
    const dKey = format(d, 'yyyy-MM-dd');
    if (d > today || dKey < sinceKey) return t.surfaceMute + '00';
    const log = logs.get(`${habit.id}|${dKey}`);
    if (log?.frozen) return '#6e6fd966';
    if (log && log.count >= habit.targetPerDay) return catColor;
    if (log && log.count > 0) return `${catColor}55`;
    return t.surfaceMute;
  });

  const rate = completionRate(habit, logs, 84, today);

  return (
    <Pressable onPress={onOpen} style={cardStyle(t, {
      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    })}>
      <GlyphTile t={t} glyph={habit.glyph} color={catColor} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: t.text, fontSize: 14, fontWeight: '500', marginBottom: 6 }}>
          {habit.name}
        </Text>
        <HabitHeatmap t={t} cols={COLS} rows={ROWS} cells={cells} height={52} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ ...MONO, color: catColor, fontSize: 16, fontWeight: '600' }}>
          {Math.round(rate * 100)}%
        </Text>
        <Text style={{ ...MONO, color: t.muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
          12w
        </Text>
      </View>
    </Pressable>
  );
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 16,
  alignItems: 'center' as const, justifyContent: 'center' as const,
};
