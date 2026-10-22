jest.mock('../../database', () => ({}));
import { parseMoods, parseSymptoms, DailyLog } from '../dailyLogRepository';

const log = (moods: string | null, symptoms: string | null = null) =>
  ({ id: 1, log_date: '2026-10-01', flow: null, moods, symptoms, notes: null } as unknown as DailyLog);

describe('parseMoods / parseSymptoms', () => {
  it('reads a stored list', () => {
    expect(parseMoods(log('["Tired","Balanced"]'))).toEqual(['Tired', 'Balanced']);
  });

  it.each([null, '', 'not json', '{"a":1}', '"Tired"', '42'])('returns [] for %p', (stored) => {
    expect(parseMoods(log(stored))).toEqual([]);
    expect(parseSymptoms(log(null, stored))).toEqual([]);
  });

  it('drops non-string entries', () => {
    expect(parseMoods(log('["Tired", 3, null, {"x":1}]'))).toEqual(['Tired']);
  });
});
