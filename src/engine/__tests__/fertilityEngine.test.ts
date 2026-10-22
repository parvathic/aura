import {
  daysUntilFertility,
  getFertileWindow,
  getFertilityStatus,
  isInFertileWindow,
} from '../fertilityEngine';

describe('getFertileWindow', () => {
  it('puts ovulation 14 days before the next period', () => {
    expect(getFertileWindow(28)).toEqual({ start: 9, end: 14, ovulationDay: 14 });
    expect(getFertileWindow(32)).toEqual({ start: 13, end: 18, ovulationDay: 18 });
  });
});

describe('getFertilityStatus (28-day cycle)', () => {
  it.each([
    [1, 'Low Fertility'],
    [8, 'Fertility Starts Tomorrow'],
    [9, 'High Fertility'],
    [12, 'High Fertility'],
    [13, 'Peak Fertility'],
    [14, 'Peak Fertility'],
    [15, 'Low Fertility'],
    [28, 'Low Fertility'],
  ])('day %i → %s', (day, status) => {
    expect(getFertilityStatus(day, 28)).toBe(status);
  });
});

describe('isInFertileWindow', () => {
  it('includes days 9–14 of a 28-day cycle', () => {
    expect(isInFertileWindow(8, 28)).toBe(false);
    expect(isInFertileWindow(9, 28)).toBe(true);
    expect(isInFertileWindow(14, 28)).toBe(true);
    expect(isInFertileWindow(15, 28)).toBe(false);
  });
});

describe('daysUntilFertility', () => {
  it('counts down to the window, then returns null', () => {
    expect(daysUntilFertility(1, 28)).toBe(8);
    expect(daysUntilFertility(8, 28)).toBe(1);
    expect(daysUntilFertility(9, 28)).toBeNull();
    expect(daysUntilFertility(20, 28)).toBeNull();
  });
});
