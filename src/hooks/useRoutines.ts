import { useState, useEffect, useCallback } from 'react';
import {
  getActiveRoutines,
  insertRoutine,
  deleteRoutine,
  toggleRoutine,
  markRoutineCompleted,
  unmarkRoutineCompleted,
  getCompletionsForDate,
  Routine,
  RoutineInput,
} from '../db/repositories/routineRepository';
import { rescheduleAllNotifications } from '../engine/notificationScheduler';
import { todayKey } from '../utils/date';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const today = todayKey();

  const load = useCallback(async () => {
    try {
      const [data, comps] = await Promise.all([
        getActiveRoutines(),
        getCompletionsForDate(today),
      ]);
      setRoutines(data);
      setCompletions(comps);
    } catch (e) {
      console.error('Failed to load routines:', e);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const addRoutine = useCallback(async (input: RoutineInput) => {
    await insertRoutine(input);
    await load();
    // Reschedule notifications after adding a new routine
    rescheduleAllNotifications().catch(console.error);
  }, [load]);

  const removeRoutine = useCallback(async (id: number) => {
    await deleteRoutine(id);
    await load();
    rescheduleAllNotifications().catch(console.error);
  }, [load]);

  const toggle = useCallback(async (id: number, isActive: boolean) => {
    await toggleRoutine(id, isActive);
    await load();
    rescheduleAllNotifications().catch(console.error);
  }, [load]);

  const complete = useCallback(async (id: number, date: string) => {
    await markRoutineCompleted(id, date);
  }, []);

  const toggleComplete = useCallback(async (id: number) => {
    if (completions[id]) {
      await unmarkRoutineCompleted(id, today);
      setCompletions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      await markRoutineCompleted(id, today);
      setCompletions((prev) => ({ ...prev, [id]: true }));
    }
  }, [completions, today]);

  return {
    routines,
    completions,
    loading,
    addRoutine,
    removeRoutine,
    toggle,
    complete,
    toggleComplete,
    refresh: load,
  };
}
