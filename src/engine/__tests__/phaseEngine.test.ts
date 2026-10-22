import { getPhaseForCycleDay, getPhaseForDate } from '../phaseEngine';

describe('getPhaseForCycleDay (28-day cycle, 5-day period)', () => {
  it.each([
    [1, 'menstrual'],
    [5, 'menstrual'],
    [6, 'follicular'],
    [12, 'follicular'],
    [13, 'ovulatory'],
    [15, 'ovulatory'],
    [16, 'luteal'],
    [28, 'luteal'],
  ])('day %i → %s', (day, phase) => {
    expect(getPhaseForCycleDay(day, 28).phase).toBe(phase);
  });

  it('reports position within the phase', () => {
    expect(getPhaseForCycleDay(14, 28)).toEqual({
      phase: 'ovulatory',
      cycleDay: 14,
      daysIntoPhase: 2,
      daysRemainingInPhase: 1,
      totalPhaseDays: 3,
    });
  });

  it('shifts the follicular phase for longer cycles', () => {
    // 35-day cycle: ovulation day 21, ovulatory 20–22
    expect(getPhaseForCycleDay(19, 35).phase).toBe('follicular');
    expect(getPhaseForCycleDay(21, 35).phase).toBe('ovulatory');
    expect(getPhaseForCycleDay(23, 35).phase).toBe('luteal');
  });
});

describe('getPhaseForDate', () => {
  it('uses the local calendar day of the cycle start', () => {
    // Oct 8 start → Oct 21 is cycle day 14 (was 15 before the UTC fix)
    const result = getPhaseForDate(new Date(2026, 9, 21, 8), '2026-10-08', 28);
    expect(result.cycleDay).toBe(14);
    expect(result.phase).toBe('ovulatory');
  });

  it('wraps into future predicted cycles', () => {
    expect(getPhaseForDate(new Date(2026, 10, 5), '2026-10-08', 28).cycleDay).toBe(1);
    expect(getPhaseForDate(new Date(2026, 10, 6), '2026-10-08', 28).cycleDay).toBe(2);
  });

  it('wraps dates before the start into the previous cycle', () => {
    expect(getPhaseForDate(new Date(2026, 9, 7), '2026-10-08', 28).cycleDay).toBe(28);
  });
});
