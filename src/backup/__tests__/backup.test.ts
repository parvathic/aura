import {
  BackupEnvelope,
  decryptBackup,
  encryptBackup,
  fromBase64,
  jsDeriveKey,
  NotABackupError,
  parseEnvelope,
  toBase64,
  WrongPasswordError,
} from '../backupCrypto';
import { buildPayload, parsePayload, summarizePayload } from '../backupData';

// Node's built-in Web Crypto stands in for expo-crypto in tests
const random = (n: number) => (globalThis as any).crypto.getRandomValues(new Uint8Array(n)) as Uint8Array;
// Low work factor keeps tests fast; real exports use DEFAULT_ITERATIONS
const ITER = 10_000;

const sampleTables = () => ({
  cycles: [{ id: 1, start_date: '2026-10-08', end_date: null, cycle_length: null, created_at: '2026-10-21 14:45:06' }],
  daily_logs: [
    { id: 1, log_date: '2026-10-21', flow: 'light', moods: '["Tired"]', symptoms: '["Cramps"]', notes: 'Feeling ok ✨', created_at: '2026-10-21 14:52:25', updated_at: '2026-10-21 14:52:25' },
  ],
  routines: [{ id: 1, name: 'Evening stretch', frequency: 'daily', intention: 'calm', phase_target: null, reminder_time: '21:00', is_active: 1, created_at: '2026-10-21 15:02:00' }],
  routine_logs: [{ id: 1, routine_id: 1, log_date: '2026-10-21', completed: 1 }],
  app_settings: [
    { key: 'custom_cycle_length', value: '30' },
    { key: 'app_lock_enabled', value: '1' },
    { key: 'onboarding_complete', value: '1' },
  ],
});

describe('base64', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = random(257);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});

describe('jsDeriveKey', () => {
  // Published PBKDF2-HMAC-SHA256 test vectors; the native version must match these too
  const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const salt = new TextEncoder().encode('salt');
  it.each([
    [1, '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b'],
    [2, 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43'],
    [4096, 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a'],
  ])('matches the standard vector for %i iterations', async (c, expected) => {
    expect(hex(await jsDeriveKey('password', salt, c))).toBe(expected);
  });

  it('can be swapped for another implementation', async () => {
    const calls: number[] = [];
    const spy = async (p: string, s: Uint8Array, c: number) => {
      calls.push(c);
      return jsDeriveKey(p, s, c);
    };
    const env = await encryptBackup('data', 'password1', random, ITER, spy);
    expect(await decryptBackup(env, 'password1', spy)).toBe('data');
    expect(calls).toEqual([ITER, ITER]);
  });
});

describe('encryptBackup / decryptBackup', () => {
  it('round-trips with the right password, including non-ASCII text', async () => {
    const text = JSON.stringify({ hello: 'wörld ✨' });
    const env = await encryptBackup(text, 'correct horse', random, ITER);
    expect(await decryptBackup(env, 'correct horse')).toBe(text);
  });

  it('never stores the plaintext or password in the file', async () => {
    const env = await encryptBackup('secret period data', 'hunter2hunter2', random, ITER);
    const file = JSON.stringify(env);
    expect(file).not.toContain('secret period data');
    expect(file).not.toContain('hunter2hunter2');
  });

  it('uses a fresh salt and nonce every time', async () => {
    const a = await encryptBackup('same', 'password1', random, ITER);
    const b = await encryptBackup('same', 'password1', random, ITER);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.nonce).not.toBe(b.cipher.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('rejects the wrong password', async () => {
    const env = await encryptBackup('data', 'password1', random, ITER);
    await expect(decryptBackup(env, 'password2')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('rejects a tampered ciphertext', async () => {
    const env = await encryptBackup('data', 'password1', random, ITER);
    const bytes = fromBase64(env.ciphertext);
    bytes[0] ^= 1;
    await expect(
      decryptBackup({ ...env, ciphertext: toBase64(bytes) }, 'password1'),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('rejects a tampered header (e.g. weakened iterations)', async () => {
    const env = await encryptBackup('data', 'password1', random, 20_000);
    const tampered: BackupEnvelope = { ...env, kdf: { ...env.kdf, iterations: 10_000 } };
    await expect(decryptBackup(tampered, 'password1')).rejects.toBeInstanceOf(WrongPasswordError);
  });
});

describe('parseEnvelope', () => {
  it('accepts a real backup file', async () => {
    const env = await encryptBackup('data', 'password1', random, ITER);
    expect(parseEnvelope(JSON.stringify(env))).toEqual(env);
  });

  it.each([
    ['not JSON', 'hello'],
    ['some other JSON', '{"foo": 1}'],
    ['an absurd work factor', JSON.stringify({ format: 'aura-backup', version: 1, kdf: { name: 'PBKDF2-SHA256', iterations: 1, salt: '' }, cipher: { name: 'AES-256-GCM', nonce: '' }, ciphertext: '' })],
  ])('rejects %s', (_label, text) => {
    expect(() => parseEnvelope(text)).toThrow(NotABackupError);
  });

  it.each([
    ['a short nonce', (e: BackupEnvelope) => ({ ...e, cipher: { ...e.cipher, nonce: toBase64(random(8)) } })],
    ['a short salt', (e: BackupEnvelope) => ({ ...e, kdf: { ...e.kdf, salt: toBase64(random(4)) } })],
    ['invalid base64', (e: BackupEnvelope) => ({ ...e, ciphertext: '%%%not base64%%%' })],
    ['fractional iterations', (e: BackupEnvelope) => ({ ...e, kdf: { ...e.kdf, iterations: 10_000.5 } })],
  ])('rejects a file with %s', async (_label, mutate) => {
    const env = await encryptBackup('data', 'password1', random, ITER);
    expect(() => parseEnvelope(JSON.stringify(mutate(env)))).toThrow(NotABackupError);
  });

  it('asks for an update when the file is from a newer version', () => {
    const text = JSON.stringify({ format: 'aura-backup', version: 99, kdf: { name: 'PBKDF2-SHA256', iterations: 600000, salt: '' }, cipher: { name: 'AES-256-GCM', nonce: '' }, ciphertext: '' });
    expect(() => parseEnvelope(text)).toThrow(/newer version/);
  });
});

describe('backup payload', () => {
  it('leaves out settings that belong to this phone', () => {
    const payload = buildPayload(sampleTables());
    const keys = payload.tables.app_settings.map((r) => r.key);
    expect(keys).toEqual(['custom_cycle_length']);
  });

  it('round-trips through JSON unchanged', () => {
    const payload = buildPayload(sampleTables(), new Date('2026-10-21T15:00:00Z'));
    expect(parsePayload(JSON.stringify(payload))).toEqual(payload);
  });

  it('survives a full encrypt → decrypt → parse cycle', async () => {
    const payload = buildPayload(sampleTables());
    const env = await encryptBackup(JSON.stringify(payload), 'password1', random, ITER);
    const restored = parsePayload(await decryptBackup(parseEnvelope(JSON.stringify(env)), 'password1'));
    expect(restored.tables.daily_logs[0].notes).toBe('Feeling ok ✨');
    expect(summarizePayload(restored)).toBe('1 period, 1 daily log, 1 routine');
  });

  it('drops unknown columns and fills required defaults', () => {
    const text = JSON.stringify({
      app: 'aura',
      schema: 1,
      tables: {
        cycles: [{ start_date: '2026-09-10', evil: 'DROP TABLE cycles' }],
        routines: [{ name: 'Walk', frequency: 'daily' }],
      },
    });
    const p = parsePayload(text, new Date('2026-10-21T15:00:00Z'));
    expect(p.tables.cycles[0]).toEqual({
      id: null,
      start_date: '2026-09-10',
      end_date: null,
      cycle_length: null,
      created_at: '2026-10-21 15:00:00',
    });
    expect(p.tables.routines[0].is_active).toBe(1);
    expect(p.tables.daily_logs).toEqual([]);
  });

  it('ignores inherited/prototype keys like __proto__', () => {
    const text = '{"app":"aura","schema":1,"tables":{"cycles":[{"start_date":"2026-09-10","__proto__":{"cycle_length":999}}]}}';
    const p = parsePayload(text);
    expect(p.tables.cycles[0].cycle_length).toBeNull();
    expect(({} as any).cycle_length).toBeUndefined();
  });

  it('normalizes stored mood lists', () => {
    const p = parsePayload(JSON.stringify({
      app: 'aura', schema: 1,
      tables: { daily_logs: [{ log_date: '2026-10-01', moods: '[ "Tired" ]' }] },
    }));
    expect(p.tables.daily_logs[0].moods).toBe('["Tired"]');
  });

  it.each([
    ['an unknown flow value', { daily_logs: [{ log_date: '2026-10-01', flow: "heavy'; DROP TABLE cycles;--" }] }],
    ['a reminder time that is not HH:MM', { routines: [{ name: 'Walk', frequency: 'daily', reminder_time: '25:99' }] }],
    ['an unknown frequency', { routines: [{ name: 'Walk', frequency: 'hourly' }] }],
    ['an unknown phase', { routines: [{ name: 'Walk', frequency: 'daily', phase_target: 'winter' }] }],
    ['a huge note', { daily_logs: [{ log_date: '2026-10-01', notes: 'x'.repeat(10_001) }] }],
    ['moods that are not a list', { daily_logs: [{ log_date: '2026-10-01', moods: '{"a":1}' }] }],
    ['moods with non-strings', { daily_logs: [{ log_date: '2026-10-01', moods: '[1,2]' }] }],
    ['a fractional cycle length', { cycles: [{ start_date: '2026-10-01', cycle_length: 28.5 }] }],
    ['a cycle length as text', { cycles: [{ start_date: '2026-10-01', cycle_length: '28' }] }],
    ['an out-of-range is_active', { routines: [{ name: 'Walk', frequency: 'daily', is_active: 7 }] }],
    ['a bad setting key', { app_settings: [{ key: 'x; DROP', value: '1' }] }],
    ['a row that is an array', { cycles: [['2026-10-01']] }],
    ['too many rows', { routine_logs: Array.from({ length: 50_001 }, () => ({ routine_id: 1, log_date: '2026-10-01' })) }],
    ['a bad date', { cycles: [{ start_date: 'October 8' }] }],
    ['a missing required field', { routines: [{ name: 'Walk' }] }],
    ['a non-array table', { cycles: 'nope' }],
    ['an object where a value should be', { cycles: [{ start_date: { $gt: '' } }] }],
  ])('rejects %s', (_label, tables) => {
    expect(() => parsePayload(JSON.stringify({ app: 'aura', schema: 1, tables }))).toThrow(NotABackupError);
  });
});
