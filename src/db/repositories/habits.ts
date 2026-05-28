import { getDB } from '../client';
import type { Habit, HabitLog, Period } from '@/types';

export async function listActiveHabits(): Promise<Habit[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, category_id, icon, glyph, target_per_day, period, reminders, freezes_left, created_at, archived_at
     FROM habits WHERE archived_at IS NULL ORDER BY created_at ASC`
  );
  return rows.map(toHabit);
}

export async function getHabitById(id: number): Promise<Habit | null> {
  const db = await getDB();
  const r = await db.getFirstAsync<any>(
    `SELECT id, name, category_id, icon, glyph, target_per_day, period, reminders, freezes_left, created_at, archived_at
     FROM habits WHERE id = ?`,
    [id]
  );
  return r ? toHabit(r) : null;
}

export async function addHabit(
  name: string,
  categoryId: number | null,
  targetPerDay = 1,
  glyph = '●',
  period: Period = 'anytime',
  reminders: string[] = [],
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO habits (name, category_id, target_per_day, glyph, period, reminders, freezes_left, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 2, ?)`,
    [name, categoryId, targetPerDay, glyph, period, JSON.stringify(reminders), Date.now()]
  );
  return result.lastInsertRowId;
}

export async function updateHabit(
  id: number,
  name: string,
  categoryId: number | null,
  targetPerDay: number,
  glyph?: string,
  period?: Period,
  reminders?: string[],
): Promise<void> {
  const db = await getDB();
  if (glyph !== undefined && period !== undefined && reminders !== undefined) {
    await db.runAsync(
      `UPDATE habits SET name = ?, category_id = ?, target_per_day = ?, glyph = ?, period = ?, reminders = ? WHERE id = ?`,
      [name, categoryId, targetPerDay, glyph, period, JSON.stringify(reminders), id]
    );
  } else {
    await db.runAsync(
      `UPDATE habits SET name = ?, category_id = ?, target_per_day = ? WHERE id = ?`,
      [name, categoryId, targetPerDay, id]
    );
  }
}

export async function updateHabitReminders(id: number, reminders: string[]): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE habits SET reminders = ? WHERE id = ?`, [JSON.stringify(reminders), id]);
}

export async function decrementFreezes(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE habits SET freezes_left = MAX(0, freezes_left - 1) WHERE id = ?`, [id]);
}

export async function getLogsForDate(date: string): Promise<HabitLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, habit_id, date, count, frozen, created_at FROM habit_logs WHERE date = ?`,
    [date]
  );
  return rows.map(toLog);
}

export async function getLogsForRange(since: string, until: string): Promise<HabitLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, habit_id, date, count, frozen, created_at
     FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date ASC`,
    [since, until]
  );
  return rows.map(toLog);
}

export async function getLogsForHabit(habitId: number, since: string): Promise<HabitLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, habit_id, date, count, frozen, created_at
     FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC`,
    [habitId, since]
  );
  return rows.map(toLog);
}

export async function incrementLog(
  habitId: number,
  date: string,
  target: number,
): Promise<number> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ id: number; count: number }>(
    `SELECT id, count FROM habit_logs WHERE habit_id = ? AND date = ?`,
    [habitId, date]
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO habit_logs (habit_id, date, count, frozen, created_at) VALUES (?, ?, 1, 0, ?)`,
      [habitId, date, Date.now()]
    );
    return 1;
  }
  if (existing.count >= target) {
    await db.runAsync(`DELETE FROM habit_logs WHERE id = ?`, [existing.id]);
    return 0;
  }
  const newCount = existing.count + 1;
  await db.runAsync(`UPDATE habit_logs SET count = ? WHERE id = ?`, [newCount, existing.id]);
  return newCount;
}

export async function setLogCount(habitId: number, date: string, count: number): Promise<void> {
  const db = await getDB();
  if (count <= 0) {
    await db.runAsync(`DELETE FROM habit_logs WHERE habit_id = ? AND date = ?`, [habitId, date]);
    return;
  }
  await db.runAsync(
    `INSERT INTO habit_logs (habit_id, date, count, frozen, created_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET count = excluded.count, frozen = 0`,
    [habitId, date, count, Date.now()]
  );
}

export async function freezeLog(habitId: number, date: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO habit_logs (habit_id, date, count, frozen, created_at) VALUES (?, ?, 0, 1, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET frozen = 1`,
    [habitId, date, Date.now()]
  );
  await decrementFreezes(habitId);
}

export async function deleteHabit(habitId: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE habits SET archived_at = ? WHERE id = ?`,
    [Date.now(), habitId]
  );
}

function toHabit(r: any): Habit {
  let reminders: string[] = [];
  try { reminders = JSON.parse(r.reminders || '[]'); } catch { reminders = []; }
  return {
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    icon: r.icon,
    glyph: r.glyph || '●',
    targetPerDay: r.target_per_day,
    period: (r.period as Period) || 'anytime',
    reminders,
    freezesLeft: r.freezes_left ?? 2,
    createdAt: r.created_at,
    archivedAt: r.archived_at,
  };
}

function toLog(r: any): HabitLog {
  return {
    id: r.id,
    habitId: r.habit_id,
    date: r.date,
    count: r.count,
    frozen: !!r.frozen,
    createdAt: r.created_at,
  };
}
