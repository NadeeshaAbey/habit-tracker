import { format, subDays, parseISO } from 'date-fns';

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
