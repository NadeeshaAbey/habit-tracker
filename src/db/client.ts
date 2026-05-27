import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('habits.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      color      TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      icon           TEXT,
      target_per_day INTEGER NOT NULL DEFAULT 1,
      created_at     INTEGER NOT NULL,
      archived_at    INTEGER
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      count      INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      UNIQUE(habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_habits_active    ON habits(archived_at);
    CREATE INDEX IF NOT EXISTS idx_logs_habit_date  ON habit_logs(habit_id, date DESC);
  `);
  return _db;
}
