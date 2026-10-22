import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCurrentCycle,
  getCompletedCycles,
  Cycle,
} from '../db/repositories/cycleRepository';
import { predictCycleLength, getCycleDay, daysUntilNextPeriod, predictNextPeriodStart } from '../engine/cycleEngine';
import { getPhaseForCycleDay, PhaseResult } from '../engine/phaseEngine';
import { getFertilityStatus, FertilityStatus, daysUntilFertility } from '../engine/fertilityEngine';
import { PHASES, PhaseName, DEFAULTS } from '../constants/phases';
import { getCyclePreferences } from '../db/database';

export interface CycleData {
  currentCycle: Cycle | null;
  predictedCycleLength: number;
  periodLength: number;
  cycleDay: number;
  phase: PhaseResult | null;
  phaseInfo: typeof PHASES[PhaseName] | null;
  fertilityStatus: FertilityStatus;
  daysUntilPeriod: number;
  daysUntilFertile: number | null;
  nextPeriodDate: Date | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCycleData(): CycleData {
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [completedCycles, setCompletedCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    cycleLength: DEFAULTS.cycleLength,
    periodLength: DEFAULTS.periodLength,
  });

  const load = useCallback(async () => {
    try {
      const [cycle, completed, preferences] = await Promise.all([
        getCurrentCycle(),
        getCompletedCycles(6),
        getCyclePreferences(),
      ]);
      setCurrentCycle(cycle);
      setCompletedCycles(completed);
      setPrefs(preferences);
    } catch (e) {
      console.warn('Failed to load cycle data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the screen comes into view, so changes made on other tabs show up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const predictedLength = predictCycleLength(completedCycles, prefs.cycleLength);
  const periodLength = prefs.periodLength;

  let cycleDay = 1;
  let phase: PhaseResult | null = null;
  let fertilityStatus: FertilityStatus = 'Low Fertility';
  let daysUntilPeriod = 0;
  let daysUntilFertile: number | null = null;
  let nextPeriodDate: Date | null = null;

  if (currentCycle) {
    cycleDay = getCycleDay(currentCycle.start_date);
    phase = getPhaseForCycleDay(cycleDay, predictedLength, periodLength);
    fertilityStatus = getFertilityStatus(cycleDay, predictedLength);
    daysUntilPeriod = daysUntilNextPeriod(currentCycle.start_date, predictedLength);
    daysUntilFertile = daysUntilFertility(cycleDay, predictedLength);
    nextPeriodDate = predictNextPeriodStart(currentCycle.start_date, predictedLength);
  }

  const phaseInfo = phase ? PHASES[phase.phase] : null;

  return {
    currentCycle,
    predictedCycleLength: predictedLength,
    periodLength,
    cycleDay,
    phase,
    phaseInfo,
    fertilityStatus,
    daysUntilPeriod,
    daysUntilFertile,
    nextPeriodDate,
    loading,
    refresh: load,
  };
}
