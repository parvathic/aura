import { getDatabase } from '../database';
import { daysBetween, parseDateKey } from '../../utils/date';

export interface Cycle {
  id: number;
  start_date: string;
  end_date: string | null;
  cycle_length: number | null;
  created_at: string;
}

export async function getCurrentCycle(): Promise<Cycle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Cycle>(
    'SELECT * FROM cycles ORDER BY start_date DESC LIMIT 1',
  );
}

export async function getCompletedCycles(limit = 6): Promise<Cycle[]> {
  const db = await getDatabase();
  return db.getAllAsync<Cycle>(
    'SELECT * FROM cycles WHERE cycle_length IS NOT NULL ORDER BY start_date DESC LIMIT ?',
    [limit],
  );
}

export async function getAllCycles(): Promise<Cycle[]> {
  const db = await getDatabase();
  return db.getAllAsync<Cycle>('SELECT * FROM cycles ORDER BY start_date DESC');
}

export async function insertCycle(startDate: string, endDate?: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO cycles (start_date, end_date) VALUES (?, ?)',
    [startDate, endDate ?? null],
  );
  return result.lastInsertRowId;
}

export async function endCurrentPeriod(cycleId: number, endDate: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE cycles SET end_date = ? WHERE id = ?', [endDate, cycleId]);
}

export async function backfillCycleLength(
  previousCycleId: number,
  cycleLength: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE cycles SET cycle_length = ? WHERE id = ?', [
    cycleLength,
    previousCycleId,
  ]);
}

export async function startNewPeriod(startDate: string): Promise<number> {
  const db = await getDatabase();

  // Backfill the previous cycle's length
  const previousCycle = await getCurrentCycle();
  if (previousCycle && previousCycle.cycle_length === null) {
    const diffDays = daysBetween(
      parseDateKey(previousCycle.start_date),
      parseDateKey(startDate),
    );
    if (diffDays > 0) {
      await backfillCycleLength(previousCycle.id, diffDays);
    }
  }

  return insertCycle(startDate);
}
