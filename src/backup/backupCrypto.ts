// Password-based encryption for Aura backup files.
// AES-256-GCM, with the key derived from the password using PBKDF2-SHA256.
// Pure JS (no native modules) so it can be unit-tested; randomness is passed in.
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';

export const BACKUP_FORMAT = 'aura-backup';
export const BACKUP_FORMAT_VERSION = 1;
/** OWASP-recommended work factor for PBKDF2-SHA256. */
export const DEFAULT_ITERATIONS = 600_000;

export type RandomBytes = (length: number) => Uint8Array;
/** PBKDF2-SHA256 → 32-byte key. The app passes a fast native version; tests use the JS one. */
export type DeriveKey = (password: string, salt: Uint8Array, iterations: number) => Promise<Uint8Array>;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: number;
  kdf: { name: 'PBKDF2-SHA256'; iterations: number; salt: string };
  cipher: { name: 'AES-256-GCM'; nonce: string };
  ciphertext: string;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('That password is not right, or the file has been changed.');
    this.name = 'WrongPasswordError';
  }
}

export class NotABackupError extends Error {
  constructor(detail = 'This file is not an Aura backup.') {
    super(detail);
    this.name = 'NotABackupError';
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Pure-JS PBKDF2-SHA256. Correct everywhere, but slow on a phone at 600k iterations. */
export const jsDeriveKey: DeriveKey = (password, salt, iterations) =>
  pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 });

/** The header fields are authenticated too, so nobody can quietly weaken them. */
function headerBytes(env: Omit<BackupEnvelope, 'ciphertext'>): Uint8Array {
  return encoder.encode(
    JSON.stringify([env.format, env.version, env.kdf.name, env.kdf.iterations, env.kdf.salt, env.cipher.name, env.cipher.nonce]),
  );
}

export async function encryptBackup(
  plaintext: string,
  password: string,
  randomBytes: RandomBytes,
  iterations: number = DEFAULT_ITERATIONS,
  deriveKey: DeriveKey = jsDeriveKey,
): Promise<BackupEnvelope> {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = await deriveKey(password.normalize('NFC'), salt, iterations);
  const header: Omit<BackupEnvelope, 'ciphertext'> = {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    kdf: { name: 'PBKDF2-SHA256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-256-GCM', nonce: toBase64(nonce) },
  };
  const ciphertext = gcm(key, nonce, headerBytes(header)).encrypt(encoder.encode(plaintext));
  return { ...header, ciphertext: toBase64(ciphertext) };
}

/** Parse a file's text and check it looks like an Aura backup (without decrypting). */
export function parseEnvelope(fileText: string): BackupEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new NotABackupError();
  }
  const env = parsed as Partial<BackupEnvelope>;
  if (
    !env ||
    env.format !== BACKUP_FORMAT ||
    typeof env.version !== 'number' ||
    env.kdf?.name !== 'PBKDF2-SHA256' ||
    typeof env.kdf.iterations !== 'number' ||
    typeof env.kdf.salt !== 'string' ||
    env.cipher?.name !== 'AES-256-GCM' ||
    typeof env.cipher.nonce !== 'string' ||
    typeof env.ciphertext !== 'string'
  ) {
    throw new NotABackupError();
  }
  if (env.version > BACKUP_FORMAT_VERSION) {
    throw new NotABackupError('This backup was made by a newer version of Aura. Update the app first.');
  }
  // Guard against absurd work factors in a crafted file
  if (
    !Number.isInteger(env.kdf.iterations) ||
    env.kdf.iterations < 10_000 ||
    env.kdf.iterations > 10_000_000
  ) {
    throw new NotABackupError();
  }
  // Salt, nonce and ciphertext must be valid base64 of the right sizes
  try {
    if (fromBase64(env.kdf.salt).length < 16) throw new Error();
    if (fromBase64(env.cipher.nonce).length !== 12) throw new Error();
    if (fromBase64(env.ciphertext).length < 16) throw new Error(); // at least the GCM tag
  } catch {
    throw new NotABackupError();
  }
  return env as BackupEnvelope;
}

export async function decryptBackup(
  env: BackupEnvelope,
  password: string,
  deriveKey: DeriveKey = jsDeriveKey,
): Promise<string> {
  const key = await deriveKey(password.normalize('NFC'), fromBase64(env.kdf.salt), env.kdf.iterations);
  try {
    const plain = gcm(key, fromBase64(env.cipher.nonce), headerBytes(env)).decrypt(
      fromBase64(env.ciphertext),
    );
    return decoder.decode(plain);
  } catch {
    throw new WrongPasswordError();
  }
}
