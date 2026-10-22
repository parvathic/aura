import { getDatabase } from '../database';

export interface DailyLog {
  id: number;
  log_date: string;
  flow: string | null;
  moods: string | null;    // JSON array string
  symptoms: string | null; // JSON array string
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLogInput {
  log_date: string;
  flow?: string | null;
  moods?: string[];
  symptoms?: string[];
  notes?: string | null;
}

export async function getLogForDate(date: string): Promise<DailyLog | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DailyLog>(
    'SELECT * FROM daily_logs WHERE log_date = ?',
    [date],
  );
}

export async function getLogsForRange(startDate: string, endDate: string): Promise<DailyLog[]> {
  const db = await getDatabase();
  return db.getAllAsync<DailyLog>(
    'SELECT * FROM daily_logs WHERE log_date >= ? AND log_date <= ? ORDER BY log_date DESC',
    [startDate, endDate],
  );
}

export async function upsertLog(input: DailyLogInput): Promise<void> {
  const db = await getDatabase();
  const moodsJson = input.moods ? JSON.stringify(input.moods) : null;
  const symptomsJson = input.symptoms ? JSON.stringify(input.symptoms) : null;

  await db.runAsync(
    `INSERT INTO daily_logs (log_date, flow, moods, symptoms, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(log_date) DO UPDATE SET
       flow = excluded.flow,
       moods = excluded.moods,
       symptoms = excluded.symptoms,
       notes = excluded.notes,
       updated_at = datetime('now')`,
    [input.log_date, input.flow ?? null, moodsJson, symptomsJson, input.notes ?? null],
  );
}

/** Read a stored JSON list, ignoring anything that isn't a list of strings. */
function parseStringList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function parseMoods(log: DailyLog): string[] {
  return parseStringList(log.moods);
}

export function parseSymptoms(log: DailyLog): string[] {
  return parseStringList(log.symptoms);
}
