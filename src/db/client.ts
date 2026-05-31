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
      glyph          TEXT    NOT NULL DEFAULT '●',
      target_per_day INTEGER NOT NULL DEFAULT 1,
      period         TEXT    NOT NULL DEFAULT 'anytime',
      reminders      TEXT    NOT NULL DEFAULT '[]',
      freezes_left   INTEGER NOT NULL DEFAULT 2,
      created_at     INTEGER NOT NULL,
      archived_at    INTEGER
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      count      INTEGER NOT NULL DEFAULT 1,
      frozen     INTEGER NOT NULL DEFAULT 0,
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

  // Migrations: add new columns to existing tables (ignored if already present)
  for (const sql of [
    `ALTER TABLE habits ADD COLUMN glyph TEXT NOT NULL DEFAULT '●'`,
    `ALTER TABLE habits ADD COLUMN period TEXT NOT NULL DEFAULT 'anytime'`,
    `ALTER TABLE habits ADD COLUMN reminders TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE habits ADD COLUMN freezes_left INTEGER NOT NULL DEFAULT 2`,
    `ALTER TABLE habit_logs ADD COLUMN frozen INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try { await _db.execAsync(sql); } catch { /* column already exists */ }
  }

  // Seed design categories if none exist
  const catCount = await _db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM categories`);
  if (!catCount || catCount.n === 0) {
    const seedCats = [
      ['Health',   '#5fae7c'],
      ['Mind',     '#6e6fd9'],
      ['Learning', '#d6a437'],
      ['Work',     '#5a6473'],
      ['Creative', '#e88a6b'],
    ];
    for (const [name, color] of seedCats) {
      await _db.runAsync(
        `INSERT OR IGNORE INTO categories (name, color, created_at) VALUES (?, ?, ?)`,
        [name, color, Date.now()]
      );
    }
  }

  return _db;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM habit_logs;
    DELETE FROM habits;
    DELETE FROM settings;
    DELETE FROM categories;
  `);
  const seedCats: [string, string][] = [
    ['Health',   '#5fae7c'],
    ['Mind',     '#6e6fd9'],
    ['Learning', '#d6a437'],
    ['Work',     '#5a6473'],
    ['Creative', '#e88a6b'],
  ];
  for (const [name, color] of seedCats) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (name, color, created_at) VALUES (?, ?, ?)`,
      [name, color, Date.now()]
    );
  }
}
