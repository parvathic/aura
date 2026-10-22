import { getDatabase } from '../database';

export interface Routine {
  id: number;
  name: string;
  frequency: string;
  intention: string | null;
  phase_target: string | null;
  reminder_time: string | null;
  is_active: number;
  created_at: string;
}

export interface RoutineInput {
  name: string;
  frequency: string;
  intention?: string | null;
  phase_target?: string | null;
  reminder_time?: string | null;
}

export async function getActiveRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>(
    'SELECT * FROM routines WHERE is_active = 1 ORDER BY created_at DESC',
  );
}

export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Routine>('SELECT * FROM routines ORDER BY created_at DESC');
}

export async function insertRoutine(input: RoutineInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO routines (name, frequency, intention, phase_target, reminder_time) VALUES (?, ?, ?, ?, ?)',
    [
      input.name,
      input.frequency,
      input.intention ?? null,
      input.phase_target ?? null,
      input.reminder_time ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function updateRoutine(id: number, input: Partial<RoutineInput>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.frequency !== undefined) { fields.push('frequency = ?'); values.push(input.frequency); }
  if (input.intention !== undefined) { fields.push('intention = ?'); values.push(input.intention ?? null); }
  if (input.phase_target !== undefined) { fields.push('phase_target = ?'); values.push(input.phase_target ?? null); }
  if (input.reminder_time !== undefined) { fields.push('reminder_time = ?'); values.push(input.reminder_time ?? null); }

  if (fields.length === 0) return;
  values.push(String(id));
  await db.runAsync(`UPDATE routines SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteRoutine(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
}

export async function toggleRoutine(id: number, isActive: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE routines SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

// Routine completion tracking
export async function markRoutineCompleted(routineId: number, date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO routine_logs (routine_id, log_date, completed) VALUES (?, ?, 1)`,
    [routineId, date],
  );
}

export async function isRoutineCompleted(routineId: number, date: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ completed: number }>(
    'SELECT completed FROM routine_logs WHERE routine_id = ? AND log_date = ?',
    [routineId, date],
  );
  return row?.completed === 1;
}

export async function unmarkRoutineCompleted(routineId: number, date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM routine_logs WHERE routine_id = ? AND log_date = ?',
    [routineId, date],
  );
}

export async function getCompletionsForDate(date: string): Promise<Record<number, boolean>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ routine_id: number }>(
    'SELECT routine_id FROM routine_logs WHERE log_date = ? AND completed = 1',
    [date],
  );
  const map: Record<number, boolean> = {};
  for (const row of rows) map[row.routine_id] = true;
  return map;
}
