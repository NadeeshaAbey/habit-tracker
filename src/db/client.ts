import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let _db: SQLite.SQLiteDatabase | null = null;

// Each entry migrates from version N → N+1.
// The baseline (version 0 → 1) encodes all the ALTER TABLEs that were
// previously applied ad-hoc, so existing installs skip them automatically.
const MIGRATIONS: Array<(db: SQLite.SQLiteDatabase) => Promise<void>> = [
  // v0 → v1: add columns that were added via try/catch ALTER in the old client
  async (db) => {
    for (const sql of [
      `ALTER TABLE habits ADD COLUMN glyph TEXT NOT NULL DEFAULT '●'`,
      `ALTER TABLE habits ADD COLUMN period TEXT NOT NULL DEFAULT 'anytime'`,
      `ALTER TABLE habits ADD COLUMN reminders TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE habits ADD COLUMN freezes_left INTEGER NOT NULL DEFAULT 2`,
      `ALTER TABLE habit_logs ADD COLUMN frozen INTEGER NOT NULL DEFAULT 0`,
    ]) {
      try { await db.execAsync(sql); } catch { /* column already exists on fresh installs */ }
    }
  },
];

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('habits.db');

  await db.execAsync(`
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

  // Run pending migrations
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[v](db);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }

  // Seed categories if none exist
  const catCount = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM categories`);
  if (!catCount || catCount.n === 0) {
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

  return db;
}

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  try {
    _db = await openAndInit();
    return _db;
  } catch (err) {
    // Corrupt DB: delete the file and retry once
    const dbPath = `${FileSystem.documentDirectory}SQLite/habits.db`;
    try { await FileSystem.deleteAsync(dbPath, { idempotent: true }); } catch { /* ignore */ }
    _db = await openAndInit();
    return _db;
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM habit_logs;
    DELETE FROM habits;
    DELETE FROM settings;
    DELETE FROM categories;
  `);
  // Reset user_version so migrations re-run on next open (seeds fresh categories)
  await db.execAsync(`PRAGMA user_version = 0`);
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
