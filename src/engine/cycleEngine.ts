import { Cycle } from '../db/repositories/cycleRepository';
import { DEFAULTS } from '../constants/phases';
import { addDays, daysBetween, parseDateKey } from '../utils/date';

/**
 * Predict the cycle length based on completed cycle history.
 * - 0 cycles: the user's cycle length from Settings (28 by default)
 * - 1-2 cycles: simple average
 * - 3+ cycles: weighted moving average (recent cycles weighted more)
 */
export function predictCycleLength(
  completedCycles: Cycle[],
  fallbackLength: number = DEFAULTS.cycleLength,
): number {
  if (completedCycles.length === 0) {
    return fallbackLength;
  }

  // Filter to only cycles with valid lengths
  const lengths = completedCycles
    .filter((c) => c.cycle_length !== null && c.cycle_length > 0)
    .map((c) => c.cycle_length as number);

  if (lengths.length === 0) {
    return fallbackLength;
  }

  let predicted: number;

  if (lengths.length <= 2) {
    // Simple average for few data points
    predicted = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  } else {
    // Weighted moving average — most recent cycles weighted higher
    // Weights: [3, 2.5, 2, 1, 1, 1] for up to 6 cycles (most recent first)
    const weights = [3, 2.5, 2, 1, 1, 1];
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < Math.min(lengths.length, 6); i++) {
      const w = weights[i] ?? 1;
      weightedSum += lengths[i] * w;
      totalWeight += w;
    }
    predicted = weightedSum / totalWeight;
  }

  // Clamp to biologically reasonable range
  return Math.round(
    Math.max(DEFAULTS.minCycleLength, Math.min(DEFAULTS.maxCycleLength, predicted)),
  );
}

/**
 * Predict the next period start date.
 */
export function predictNextPeriodStart(
  currentCycleStartDate: string,
  predictedCycleLength: number,
): Date {
  return addDays(parseDateKey(currentCycleStartDate), predictedCycleLength);
}

/**
 * Calculate the current cycle day (1-indexed).
 */
export function getCycleDay(currentCycleStartDate: string, date: Date = new Date()): number {
  return daysBetween(parseDateKey(currentCycleStartDate), date) + 1;
}

/**
 * Days until next predicted period.
 */
export function daysUntilNextPeriod(
  currentCycleStartDate: string,
  predictedCycleLength: number,
  date: Date = new Date(),
): number {
  const nextPeriod = predictNextPeriodStart(currentCycleStartDate, predictedCycleLength);
  return Math.max(0, daysBetween(date, nextPeriod));
}
