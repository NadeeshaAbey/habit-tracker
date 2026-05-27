import { getDB } from '../client';
import type { Habit, HabitLog } from '@/types';

export async function listActiveHabits(): Promise<Habit[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, category_id, icon, target_per_day, created_at, archived_at
     FROM habits WHERE archived_at IS NULL ORDER BY created_at ASC`
  );
  return rows.map(toHabit);
}

export async function getHabitById(id: number): Promise<Habit | null> {
  const db = await getDB();
  const r = await db.getFirstAsync<any>(
    `SELECT id, name, category_id, icon, target_per_day, created_at, archived_at
     FROM habits WHERE id = ?`,
    [id]
  );
  return r ? toHabit(r) : null;
}

export async function addHabit(name: string, categoryId: number | null): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO habits (name, category_id, target_per_day, created_at) VALUES (?, ?, 1, ?)`,
    [name, categoryId, Date.now()]
  );
  return result.lastInsertRowId;
}

export async function getLogsForDate(date: string): Promise<HabitLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, habit_id, date, count, created_at FROM habit_logs WHERE date = ?`,
    [date]
  );
  return rows.map(toLog);
}

export async function getLogsForHabit(habitId: number, since: string): Promise<HabitLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, habit_id, date, count, created_at
     FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC`,
    [habitId, since]
  );
  return rows.map(toLog);
}

export async function toggleLog(habitId: number, date: string): Promise<void> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?`,
    [habitId, date]
  );
  if (existing) {
    await db.runAsync(`DELETE FROM habit_logs WHERE id = ?`, [existing.id]);
  } else {
    await db.runAsync(
      `INSERT INTO habit_logs (habit_id, date, count, created_at) VALUES (?, ?, 1, ?)`,
      [habitId, date, Date.now()]
    );
  }
}

export async function updateHabit(id: number, name: string, categoryId: number | null): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE habits SET name = ?, category_id = ? WHERE id = ?`,
    [name, categoryId, id]
  );
}

export async function deleteHabit(habitId: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE habits SET archived_at = ? WHERE id = ?`,
    [Date.now(), habitId]
  );
}

function toHabit(r: any): Habit {
  return {
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    icon: r.icon,
    targetPerDay: r.target_per_day,
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
    createdAt: r.created_at,
  };
}
