import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getDB, resetDatabase } from './client';
import type { Habit, HabitLog } from '@/types';

export type ImportPayload = {
  habits: Habit[];
  logs: HabitLog[];
};

export type ImportResult = {
  habitCount: number;
  logCount: number;
};

function isValidPayload(data: unknown): data is ImportPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.habits) && Array.isArray(d.logs);
}

export async function pickAndImport(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new Error('CANCELLED');

  const asset = result.assets[0];
  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!isValidPayload(parsed)) {
    throw new Error('File does not contain valid habit data');
  }

  const { habits, logs } = parsed;

  await resetDatabase();

  const db = await getDB();

  await db.withTransactionAsync(async () => {
    for (const h of habits) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habits
           (id, name, category_id, icon, glyph, target_per_day, period,
            reminders, freezes_left, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          h.id, h.name, h.categoryId ?? null, h.icon ?? null,
          h.glyph, h.targetPerDay, h.period,
          JSON.stringify(h.reminders), h.freezesLeft,
          h.createdAt, h.archivedAt ?? null,
        ]
      );
    }

    for (const l of logs) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habit_logs
           (id, habit_id, date, count, frozen, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [l.id, l.habitId, l.date, l.count, l.frozen ? 1 : 0, l.createdAt]
      );
    }
  });

  return { habitCount: habits.length, logCount: logs.length };
}
