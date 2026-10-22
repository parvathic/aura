import {
  daysUntilNextPeriod,
  getCycleDay,
  predictCycleLength,
  predictNextPeriodStart,
} from '../cycleEngine';
import { Cycle } from '../../db/repositories/cycleRepository';
import { toDateKey } from '../../utils/date';

const cycles = (...lengths: Array<number | null>): Cycle[] =>
  lengths.map((cycle_length, i) => ({
    id: i + 1,
    start_date: '2026-01-01',
    end_date: null,
    cycle_length,
    created_at: '2026-01-01 00:00:00',
  }));

describe('getCycleDay', () => {
  it('is day 1 on the start date', () => {
    expect(getCycleDay('2026-10-08', new Date(2026, 9, 8, 0, 0))).toBe(1);
    expect(getCycleDay('2026-10-08', new Date(2026, 9, 8, 23, 59))).toBe(1);
  });

  it('is day 14 thirteen days later at any hour (off-by-one regression)', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(getCycleDay('2026-10-08', new Date(2026, 9, 21, hour, 30))).toBe(14);
    }
  });

  it('counts correctly across the DST change', () => {
    expect(getCycleDay('2026-10-25', new Date(2026, 10, 7, 12))).toBe(14);
  });
});

describe('predictNextPeriodStart', () => {
  it('adds the cycle length to the start date', () => {
    expect(toDateKey(predictNextPeriodStart('2026-10-08', 28))).toBe('2026-11-05');
  });
});

describe('daysUntilNextPeriod', () => {
  it('counts days to the predicted start', () => {
    expect(daysUntilNextPeriod('2026-10-08', 28, new Date(2026, 9, 21, 20))).toBe(15);
  });

  it('is 0 on the day itself and never negative when late', () => {
    expect(daysUntilNextPeriod('2026-10-08', 28, new Date(2026, 10, 5))).toBe(0);
    expect(daysUntilNextPeriod('2026-10-08', 28, new Date(2026, 10, 9))).toBe(0);
  });
});

describe('predictCycleLength', () => {
  it('defaults to 28 with no history', () => {
    expect(predictCycleLength([])).toBe(28);
  });

  it("uses the cycle length from Settings until there's history", () => {
    expect(predictCycleLength([], 32)).toBe(32);
    expect(predictCycleLength(cycles(null), 32)).toBe(32);
    expect(predictCycleLength(cycles(26), 32)).toBe(26);
  });

  it('averages one or two cycles', () => {
    expect(predictCycleLength(cycles(30))).toBe(30);
    expect(predictCycleLength(cycles(30, 26))).toBe(28);
  });

  it('weights recent cycles more with 3+ cycles (most recent first)', () => {
    // (30*3 + 30*2.5 + 30*2 + 26 + 26 + 26) / 10.5 = 28.86
    expect(predictCycleLength(cycles(30, 30, 30, 26, 26, 26))).toBe(29);
  });

  it('ignores cycles without a valid length', () => {
    expect(predictCycleLength(cycles(null, 0, 32))).toBe(32);
    expect(predictCycleLength(cycles(null))).toBe(28);
  });

  it('clamps to 21–45 days', () => {
    expect(predictCycleLength(cycles(15))).toBe(21);
    expect(predictCycleLength(cycles(60))).toBe(45);
  });
});
