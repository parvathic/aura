import * as SQLite from 'expo-sqlite';
import {
  BACKUP_TABLES,
  BackupPayload,
  BackupTable,
  DEVICE_ONLY_SETTINGS,
  Row,
} from '../backup/backupData';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('aura.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL mode for better performance
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL UNIQUE,
      end_date TEXT,
      cycle_length INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cycles_start ON cycles(start_date DESC);

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT NOT NULL UNIQUE,
      flow TEXT,
      moods TEXT,
      symptoms TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_logs_date ON daily_logs(log_date DESC);

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      intention TEXT,
      phase_target TEXT,
      reminder_time TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(routine_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default settings if not present
  await database.runAsync(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('onboarding_complete', '0')`,
  );
  await database.runAsync(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_reminder_time', '09:00')`,
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export interface CyclePreferences {
  cycleLength: number;
  periodLength: number;
  notificationsEnabled: boolean;
  periodReminderDays: number;
  /** When on, notifications hide what they're about (they show on the iPhone lock screen). */
  discreetNotifications: boolean;
}

/** User preferences from Settings, with defaults for anything not set yet. */
export async function getCyclePreferences(): Promise<CyclePreferences> {
  const [cycle, period, notifications, reminderDays, appLock] = await Promise.all([
    getSetting('custom_cycle_length'),
    getSetting('custom_period_length'),
    getSetting('notifications_enabled'),
    getSetting('period_reminder_days'),
    getSetting('app_lock_enabled'),
  ]);
  // Same ranges the Settings steppers allow, so a bad stored value can't skew predictions
  const num = (value: string | null, fallback: number, min: number, max: number) => {
    const n = value === null ? NaN : Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    cycleLength: num(cycle, 28, 21, 45),
    periodLength: num(period, 5, 2, 8),
    notificationsEnabled: notifications !== '0',
    periodReminderDays: num(reminderDays, 1, 0, 5),
    discreetNotifications: appLock === '1',
  };
}

/** Permanently delete every cycle, log, routine and setting on this device. */
export async function clearAllData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM routine_logs;
    DELETE FROM routines;
    DELETE FROM daily_logs;
    DELETE FROM cycles;
    DELETE FROM app_settings;
  `);
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES ('onboarding_complete', '0')`,
  );
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES ('default_reminder_time', '09:00')`,
  );
}

/** Every row of every table, for writing a backup. */
export async function readAllTables(): Promise<Record<BackupTable, Row[]>> {
  const database = await getDatabase();
  const result = {} as Record<BackupTable, Row[]>;
  for (const table of Object.keys(BACKUP_TABLES) as BackupTable[]) {
    const cols = BACKUP_TABLES[table].join(', ');
    result[table] = await database.getAllAsync<Row>(`SELECT ${cols} FROM ${table}`);
  }
  return result;
}

/**
 * Replace all data on this phone with a backup's contents, in a single transaction:
 * either everything is restored or nothing changes. Device-only settings are kept.
 */
export async function replaceAllData(payload: BackupPayload): Promise<void> {
  const database = await getDatabase();
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM routine_logs;
      DELETE FROM routines;
      DELETE FROM daily_logs;
      DELETE FROM cycles;
    `);
    const keep = DEVICE_ONLY_SETTINGS.map(() => '?').join(', ');
    await txn.runAsync(`DELETE FROM app_settings WHERE key NOT IN (${keep})`, DEVICE_ONLY_SETTINGS);

    // Parents before children so foreign keys hold
    const order: BackupTable[] = ['cycles', 'daily_logs', 'routines', 'routine_logs', 'app_settings'];
    for (const table of order) {
      const cols = BACKUP_TABLES[table];
      const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
      for (const row of payload.tables[table]) {
        await txn.runAsync(sql, cols.map((c) => row[c] ?? null));
      }
    }
    await txn.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('onboarding_complete', ?)`,
      [payload.tables.cycles.length > 0 ? '1' : '0'],
    );
  });
}
