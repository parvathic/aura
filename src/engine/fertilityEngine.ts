import { DEFAULTS } from '../constants/phases';

export type FertilityStatus =
  | 'High Fertility'
  | 'Peak Fertility'
  | 'Fertility Starts Tomorrow'
  | 'Low Fertility';

/**
 * Calculate the fertile window (6-day window: 5 days before ovulation + ovulation day).
 */
export function getFertileWindow(predictedCycleLength: number): {
  start: number; // cycle day
  end: number;   // cycle day (ovulation day)
  ovulationDay: number;
} {
  const ovulationDay = predictedCycleLength - DEFAULTS.lutealLength;
  return {
    start: ovulationDay - 5,
    end: ovulationDay,
    ovulationDay,
  };
}

/**
 * Get the fertility status for a given cycle day.
 */
export function getFertilityStatus(
  cycleDay: number,
  predictedCycleLength: number,
): FertilityStatus {
  const { start, end, ovulationDay } = getFertileWindow(predictedCycleLength);

  if (cycleDay === ovulationDay || cycleDay === ovulationDay - 1) {
    return 'Peak Fertility';
  }
  if (cycleDay >= start && cycleDay <= end) {
    return 'High Fertility';
  }
  if (cycleDay === start - 1) {
    return 'Fertility Starts Tomorrow';
  }
  return 'Low Fertility';
}

/**
 * Check if a given cycle day falls within the fertile window.
 */
export function isInFertileWindow(
  cycleDay: number,
  predictedCycleLength: number,
): boolean {
  const { start, end } = getFertileWindow(predictedCycleLength);
  return cycleDay >= start && cycleDay <= end;
}

/**
 * Days until fertility window starts.
 */
export function daysUntilFertility(
  cycleDay: number,
  predictedCycleLength: number,
): number | null {
  const { start } = getFertileWindow(predictedCycleLength);
  if (cycleDay >= start) return null; // Already in or past the window
  return start - cycleDay;
}
