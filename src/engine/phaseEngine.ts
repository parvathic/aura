import { PhaseName, DEFAULTS } from '../constants/phases';
import { daysBetween, parseDateKey } from '../utils/date';

export interface PhaseResult {
  phase: PhaseName;
  cycleDay: number;
  daysIntoPhase: number;
  daysRemainingInPhase: number;
  totalPhaseDays: number;
}

/**
 * Get phase boundaries based on predicted cycle length.
 * The luteal phase is biologically fixed (~14 days); the follicular phase length varies.
 */
export function getPhaseBoundaries(
  predictedCycleLength: number,
  periodLength: number = DEFAULTS.periodLength,
) {
  const ovulationDay = predictedCycleLength - DEFAULTS.lutealLength;

  return {
    menstrualEnd: periodLength,              // day 1 to periodLength
    follicularEnd: ovulationDay - 2,         // after menstrual to before ovulatory
    ovulatoryEnd: ovulationDay + 1,          // ~3 day window around ovulation
    lutealEnd: predictedCycleLength,         // after ovulatory to end of cycle
    ovulationDay,
  };
}

/**
 * Determine the current phase for a given cycle day.
 */
export function getPhaseForCycleDay(
  cycleDay: number,
  predictedCycleLength: number,
  periodLength: number = DEFAULTS.periodLength,
): PhaseResult {
  const bounds = getPhaseBoundaries(predictedCycleLength, periodLength);

  let phase: PhaseName;
  let phaseStart: number;
  let phaseEnd: number;

  if (cycleDay <= bounds.menstrualEnd) {
    phase = 'menstrual';
    phaseStart = 1;
    phaseEnd = bounds.menstrualEnd;
  } else if (cycleDay <= bounds.follicularEnd) {
    phase = 'follicular';
    phaseStart = bounds.menstrualEnd + 1;
    phaseEnd = bounds.follicularEnd;
  } else if (cycleDay <= bounds.ovulatoryEnd) {
    phase = 'ovulatory';
    phaseStart = bounds.follicularEnd + 1;
    phaseEnd = bounds.ovulatoryEnd;
  } else {
    phase = 'luteal';
    phaseStart = bounds.ovulatoryEnd + 1;
    phaseEnd = bounds.lutealEnd;
  }

  const daysIntoPhase = cycleDay - phaseStart + 1;
  const totalPhaseDays = phaseEnd - phaseStart + 1;
  const daysRemainingInPhase = phaseEnd - cycleDay;

  return {
    phase,
    cycleDay,
    daysIntoPhase,
    daysRemainingInPhase,
    totalPhaseDays,
  };
}

/**
 * Get the phase for a specific calendar date.
 */
export function getPhaseForDate(
  date: Date,
  cycleStartDate: string,
  predictedCycleLength: number,
  periodLength: number = DEFAULTS.periodLength,
): PhaseResult {
  let cycleDay = daysBetween(parseDateKey(cycleStartDate), date) + 1;

  // Handle dates beyond current cycle — wrap into predicted cycles
  if (cycleDay > predictedCycleLength) {
    cycleDay = ((cycleDay - 1) % predictedCycleLength) + 1;
  }

  // Handle dates before cycle start
  if (cycleDay < 1) {
    cycleDay = ((cycleDay - 1) % predictedCycleLength + predictedCycleLength) % predictedCycleLength + 1;
  }

  return getPhaseForCycleDay(cycleDay, predictedCycleLength, periodLength);
}
