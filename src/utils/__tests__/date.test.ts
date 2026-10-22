import {
  addDays,
  dateFromTimeKey,
  formatTimeKey,
  toTimeKey,
  daysBetween,
  parseDateKey,
  parseSqliteUtc,
  toDateKey,
} from '../date';

// Tests run with TZ=America/Los_Angeles (see package.json) so UTC slips show up.

describe('toDateKey', () => {
  it('uses the local calendar day, even late in the evening', () => {
    // 11:30pm Pacific is already the next day in UTC
    expect(toDateKey(new Date(2026, 9, 8, 23, 30))).toBe('2026-10-08');
  });

  it('pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseDateKey', () => {
  it('parses as local midnight, not UTC', () => {
    const d = parseDateKey('2026-10-08');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with toDateKey', () => {
    expect(toDateKey(parseDateKey('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('daysBetween', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysBetween(new Date(2026, 9, 8, 23, 59), new Date(2026, 9, 9, 0, 1))).toBe(1);
    expect(daysBetween(new Date(2026, 9, 9, 0, 1), new Date(2026, 9, 8, 23, 59))).toBe(-1);
  });

  it('handles the fall-back DST day (25 hours)', () => {
    // US DST ends Sunday Nov 1, 2026
    expect(daysBetween(parseDateKey('2026-10-31'), parseDateKey('2026-11-02'))).toBe(2);
  });

  it('handles the spring-forward DST day (23 hours)', () => {
    // US DST starts Sunday Mar 8, 2026
    expect(daysBetween(parseDateKey('2026-03-07'), parseDateKey('2026-03-09'))).toBe(2);
  });
});

describe('addDays', () => {
  it('lands on local midnight across DST', () => {
    const d = addDays(parseDateKey('2026-10-31'), 2);
    expect(toDateKey(d)).toBe('2026-11-02');
    expect(d.getHours()).toBe(0);
  });

  it('rolls over months and years', () => {
    expect(toDateKey(addDays(parseDateKey('2026-12-20'), 28))).toBe('2027-01-17');
  });
});

describe('parseSqliteUtc', () => {
  it("reads SQLite datetime('now') as UTC", () => {
    expect(parseSqliteUtc('2026-10-21 03:00:00').toISOString()).toBe(
      '2026-10-21T03:00:00.000Z',
    );
  });
});

describe('reminder times', () => {
  it('stores times as 24-hour HH:MM', () => {
    expect(toTimeKey(new Date(2026, 9, 21, 20, 5))).toBe('20:05');
    expect(toTimeKey(new Date(2026, 9, 21, 0, 0))).toBe('00:00');
  });

  it('round-trips through a picker Date', () => {
    expect(toTimeKey(dateFromTimeKey('07:45'))).toBe('07:45');
  });

  it('displays as 12-hour with AM/PM', () => {
    expect(formatTimeKey('09:00')).toBe('9:00 AM');
    expect(formatTimeKey('20:30')).toBe('8:30 PM');
    expect(formatTimeKey('00:15')).toBe('12:15 AM');
    expect(formatTimeKey('12:00')).toBe('12:00 PM');
  });
});
