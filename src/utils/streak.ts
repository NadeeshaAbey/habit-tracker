import { format, subDays, parseISO } from 'date-fns';
import type { Habit, HabitLog } from '@/types';

export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  let streak = 0;
  let cursor = format(new Date(), 'yyyy-MM-dd');
  for (const d of unique) {
    if (d === cursor) {
      streak++;
      cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd');
    } else if (d < cursor) {
      break;
    }
  }
  return streak;
}

export function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1]);
    const curr = parseISO(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      best = Math.max(best, ++current);
    } else {
      current = 1;
    }
  }
  return best;
}

// Returns done/total for habit from logs map (keyed by date)
export function isDone(habit: Habit, logs: Map<string, HabitLog>, date: string): boolean {
  const log = logs.get(`${habit.id}|${date}`);
  if (!log) return false;
  return log.frozen || log.count >= habit.targetPerDay;
}

export function getCount(habit: Habit, logs: Map<string, HabitLog>, date: string): number {
  return logs.get(`${habit.id}|${date}`)?.count ?? 0;
}

export function isFrozen(habit: Habit, logs: Map<string, HabitLog>, date: string): boolean {
  return logs.get(`${habit.id}|${date}`)?.frozen ?? false;
}

// Streak including frozen days
export function computeHabitStreak(habit: Habit, logs: Map<string, HabitLog>, asOf = new Date()): number {
  let count = 0;
  const todayStr = format(asOf, 'yyyy-MM-dd');
  const todayLog = logs.get(`${habit.id}|${todayStr}`);
  if (todayLog && (todayLog.count >= habit.targetPerDay || todayLog.frozen)) count++;
  for (let off = 1; off < 365; off++) {
    const d = format(subDays(asOf, off), 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${d}`);
    if (log && (log.count >= habit.targetPerDay || log.frozen)) count++;
    else break;
  }
  return count;
}

export function computeHabitBest(habit: Habit, logs: Map<string, HabitLog>, days = 120, asOf = new Date()): number {
  let best = 0, run = 0;
  for (let off = days - 1; off >= 0; off--) {
    const d = format(subDays(asOf, off), 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${d}`);
    if (log && (log.count >= habit.targetPerDay || log.frozen)) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}

export function completionRate(habit: Habit, logs: Map<string, HabitLog>, days = 30, asOf = new Date()): number {
  let done = 0;
  for (let off = 0; off < days; off++) {
    const d = format(subDays(asOf, off), 'yyyy-MM-dd');
    const log = logs.get(`${habit.id}|${d}`);
    if (log && log.count >= habit.targetPerDay) done++;
  }
  return done / days;
}

// Build a flat log map keyed as "habitId|date"
export function buildLogMap(logs: HabitLog[]): Map<string, HabitLog> {
  const m = new Map<string, HabitLog>();
  for (const log of logs) {
    m.set(`${log.habitId}|${log.date}`, log);
  }
  return m;
}
