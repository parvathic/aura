// What goes inside an Aura backup, and how it is checked before restoring.
import { NotABackupError } from './backupCrypto';

export const BACKUP_SCHEMA_VERSION = 1;

/** Columns copied for each table. Anything else in a file is ignored. */
export const BACKUP_TABLES = {
  cycles: ['id', 'start_date', 'end_date', 'cycle_length', 'created_at'],
  daily_logs: ['id', 'log_date', 'flow', 'moods', 'symptoms', 'notes', 'created_at', 'updated_at'],
  routines: ['id', 'name', 'frequency', 'intention', 'phase_target', 'reminder_time', 'is_active', 'created_at'],
  routine_logs: ['id', 'routine_id', 'log_date', 'completed'],
  app_settings: ['key', 'value'],
} as const;

export type BackupTable = keyof typeof BACKUP_TABLES;
export type Row = Record<string, string | number | null>;

/** Settings that belong to this phone, not to your data. Never exported or overwritten. */
export const DEVICE_ONLY_SETTINGS = ['app_lock_enabled', 'include_in_backups', 'onboarding_complete'];

export interface BackupPayload {
  app: 'aura';
  schema: number;
  exportedAt: string;
  tables: Record<BackupTable, Row[]>;
}

/** Required columns that must be present and non-null for a row to be restorable. */
const REQUIRED: Record<BackupTable, string[]> = {
  cycles: ['start_date'],
  daily_logs: ['log_date'],
  routines: ['name', 'frequency'],
  routine_logs: ['routine_id', 'log_date'],
  app_settings: ['key'],
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY = /^([01]\d|2[0-3]):[0-5]\d$/;
const SQL_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** Limits that keep a hand-made or corrupted file from bloating the database or the UI. */
export const MAX_ROWS_PER_TABLE = 50_000;
const MAX_NOTE_LENGTH = 10_000;
const MAX_TEXT_LENGTH = 200;

type ColumnRule =
  | { kind: 'int'; min: number; max: number }
  | { kind: 'text'; max: number; pattern?: RegExp; oneOf?: readonly string[] }
  | { kind: 'stringList' }; // JSON array of short strings, stored as text

const LIST: ColumnRule = { kind: 'stringList' };
const ID: ColumnRule = { kind: 'int', min: 1, max: Number.MAX_SAFE_INTEGER };
const DATE: ColumnRule = { kind: 'text', max: 10, pattern: DATE_KEY };
const STAMP: ColumnRule = { kind: 'text', max: 19, pattern: SQL_DATETIME };
const BOOL: ColumnRule = { kind: 'int', min: 0, max: 1 };

/** What each column may contain. Anything else means the file is rejected. */
const RULES: { [T in BackupTable]: Record<(typeof BACKUP_TABLES)[T][number], ColumnRule> } = {
  cycles: {
    id: ID,
    start_date: DATE,
    end_date: DATE,
    cycle_length: { kind: 'int', min: 1, max: 365 },
    created_at: STAMP,
  },
  daily_logs: {
    id: ID,
    log_date: DATE,
    flow: { kind: 'text', max: 20, oneOf: ['none', 'light', 'medium', 'heavy'] },
    moods: LIST,
    symptoms: LIST,
    notes: { kind: 'text', max: MAX_NOTE_LENGTH },
    created_at: STAMP,
    updated_at: STAMP,
  },
  routines: {
    id: ID,
    name: { kind: 'text', max: MAX_TEXT_LENGTH },
    frequency: { kind: 'text', max: 20, oneOf: ['daily', 'weekly', 'monthly'] },
    intention: { kind: 'text', max: MAX_TEXT_LENGTH },
    phase_target: { kind: 'text', max: 20, oneOf: ['menstrual', 'follicular', 'ovulatory', 'luteal'] },
    reminder_time: { kind: 'text', max: 5, pattern: TIME_KEY },
    is_active: BOOL,
    created_at: STAMP,
  },
  routine_logs: {
    id: ID,
    routine_id: ID,
    log_date: DATE,
    completed: BOOL,
  },
  app_settings: {
    key: { kind: 'text', max: 64, pattern: /^[a-z_]+$/ },
    value: { kind: 'text', max: MAX_TEXT_LENGTH },
  },
};

function bad(): never {
  throw new NotABackupError('The backup contains data Aura does not recognize.');
}

function checkValue(rule: ColumnRule, v: string | number): string | number {
  switch (rule.kind) {
    case 'int':
      if (typeof v !== 'number' || !Number.isInteger(v) || v < rule.min || v > rule.max) bad();
      return v;
    case 'text':
      if (typeof v !== 'string' || v.length > rule.max) bad();
      if (rule.pattern && !rule.pattern.test(v)) bad();
      if (rule.oneOf && !rule.oneOf.includes(v)) bad();
      return v;
    case 'stringList': {
      if (typeof v !== 'string' || v.length > 2_000) bad();
      let list: unknown;
      try {
        list = JSON.parse(v);
      } catch {
        bad();
      }
      if (!Array.isArray(list) || list.length > 50) bad();
      if (!list.every((x) => typeof x === 'string' && x.length <= 50)) bad();
      return JSON.stringify(list);
    }
  }
}

/** Values for NOT NULL columns that an older or hand-edited backup might leave empty. */
function columnDefaults(now: Date): Partial<Record<BackupTable, Row>> {
  const ts = now.toISOString().slice(0, 19).replace('T', ' '); // SQLite datetime('now') format
  return {
    cycles: { created_at: ts },
    daily_logs: { created_at: ts, updated_at: ts },
    routines: { created_at: ts, is_active: 1 },
    routine_logs: { completed: 0 },
  };
}

export function buildPayload(tables: Record<BackupTable, Row[]>, now = new Date()): BackupPayload {
  return {
    app: 'aura',
    schema: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tables: {
      ...tables,
      app_settings: tables.app_settings.filter(
        (r) => !DEVICE_ONLY_SETTINGS.includes(String(r.key)),
      ),
    },
  };
}

/** Validate decrypted backup text and return only the known columns of each row. */
export function parsePayload(text: string, now = new Date()): BackupPayload {
  const defaults = columnDefaults(now);
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new NotABackupError('The backup could not be read.');
  }
  if (!raw || raw.app !== 'aura' || typeof raw.schema !== 'number' || typeof raw.tables !== 'object') {
    throw new NotABackupError('The backup could not be read.');
  }
  if (raw.schema > BACKUP_SCHEMA_VERSION) {
    throw new NotABackupError('This backup was made by a newer version of Aura. Update the app first.');
  }

  const tables = {} as Record<BackupTable, Row[]>;
  for (const table of Object.keys(BACKUP_TABLES) as BackupTable[]) {
    const rows = raw.tables[table] ?? [];
    if (!Array.isArray(rows) || rows.length > MAX_ROWS_PER_TABLE) bad();
    const rules = RULES[table] as Record<string, ColumnRule>;
    tables[table] = rows.map((row: any) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) bad();
      const clean: Row = {};
      for (const col of BACKUP_TABLES[table]) {
        // Only read the row's own properties, never inherited ones like __proto__
        const v = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : undefined;
        clean[col] =
          v === undefined || v === null ? (defaults[table]?.[col] ?? null) : checkValue(rules[col], v);
      }
      for (const col of REQUIRED[table]) {
        if (clean[col] === null) throw new NotABackupError('The backup is missing some data.');
      }
      return clean;
    });
  }

  tables.app_settings = tables.app_settings.filter(
    (r) => !DEVICE_ONLY_SETTINGS.includes(String(r.key)),
  );

  const exportedAt =
    typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt)) ? raw.exportedAt : '';
  return { app: 'aura', schema: raw.schema, exportedAt, tables };
}

export function summarizePayload(p: BackupPayload): string {
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return [
    n(p.tables.cycles.length, 'period'),
    n(p.tables.daily_logs.length, 'daily log'),
    n(p.tables.routines.length, 'routine'),
  ].join(', ');
}
