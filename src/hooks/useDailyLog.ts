import { useState, useEffect, useCallback } from 'react';
import {
  getLogForDate,
  upsertLog,
  DailyLog,
  DailyLogInput,
  parseMoods,
  parseSymptoms,
} from '../db/repositories/dailyLogRepository';

export interface DailyLogState {
  flow: string | null;
  moods: string[];
  symptoms: string[];
  notes: string;
  loading: boolean;
  saving: boolean;
  save: () => Promise<void>;
  setFlow: (flow: string | null) => void;
  toggleMood: (mood: string) => void;
  toggleSymptom: (symptom: string) => void;
  setNotes: (notes: string) => void;
}

export function useDailyLog(date: string): DailyLogState {
  const [flow, setFlow] = useState<string | null>(null);
  const [moods, setMoods] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Ignore a slow lookup for a day the user has already moved away from
    let stale = false;
    (async () => {
      setLoading(true);
      const log = await getLogForDate(date);
      if (stale) return;
      if (log) {
        setFlow(log.flow);
        setMoods(parseMoods(log));
        setSymptoms(parseSymptoms(log));
        setNotes(log.notes ?? '');
      } else {
        setFlow(null);
        setMoods([]);
        setSymptoms([]);
        setNotes('');
      }
      setLoading(false);
    })();
    return () => {
      stale = true;
    };
  }, [date]);

  const toggleMood = useCallback((mood: string) => {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  }, []);

  const toggleSymptom = useCallback((symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await upsertLog({
        log_date: date,
        flow,
        moods,
        symptoms,
        notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  }, [date, flow, moods, symptoms, notes]);

  return {
    flow,
    moods,
    symptoms,
    notes,
    loading,
    saving,
    save,
    setFlow,
    toggleMood,
    toggleSymptom,
    setNotes,
  };
}
