// Calendar-date helpers. All dates are stored as local 'YYYY-MM-DD' keys.
// Never use `new Date('YYYY-MM-DD')` (parsed as UTC midnight) or
// `toISOString()` (formats in UTC) for calendar days — both shift the day
// in time zones west of UTC.

/** Format a Date as a local 'YYYY-MM-DD' key. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local date key. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parse a 'YYYY-MM-DD' key as local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local midnight of the given date (new object). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Return a new Date `days` calendar days after `date` (at local midnight). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Whole calendar days from `from` to `to` (negative if `to` is earlier).
 * Rounds so daylight-saving days (23h/25h) still count as one day.
 */
export function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Parse an SQLite `datetime('now')` value ('YYYY-MM-DD HH:MM:SS', UTC). */
export function parseSqliteUtc(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}

/** Format a Date's local time as 'HH:MM' (24-hour), the format reminder times are stored in. */
export function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** A Date today at the given 'HH:MM' time (for seeding a time picker). */
export function dateFromTimeKey(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Display an 'HH:MM' time as '9:00 AM' / '8:30 PM'. */
export function formatTimeKey(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
