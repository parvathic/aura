// Export and import of password-encrypted backup files (the parts that touch the phone).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { readAllTables, replaceAllData } from '../db/database';
import {
  BackupEnvelope,
  DEFAULT_ITERATIONS,
  NotABackupError,
  decryptBackup,
  DeriveKey,
  encryptBackup,
  fromBase64,
  parseEnvelope,
  toBase64,
} from './backupCrypto';
import AuraSecurity from '../../modules/aura-security';
import { BackupPayload, buildPayload, parsePayload } from './backupData';
import { toDateKey } from '../utils/date';

export const MIN_PASSWORD_LENGTH = 8;
/** Real backups are a few KB to a few MB; anything far larger is not ours. */
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

/** PBKDF2 via Apple's CommonCrypto: well under a second, versus over a minute in JavaScript. */
const nativeDeriveKey: DeriveKey = async (password, salt, iterations) =>
  fromBase64(await AuraSecurity.pbkdf2Sha256(password, toBase64(salt), iterations));

/** Encrypt everything and open the share sheet (Save to Files, AirDrop, etc.). */
export async function exportBackup(password: string): Promise<void> {
  const payload = buildPayload(await readAllTables());
  const envelope = await encryptBackup(
    JSON.stringify(payload),
    password,
    (n) => Crypto.getRandomBytes(n),
    DEFAULT_ITERATIONS,
    nativeDeriveKey,
  );

  const file = new File(Paths.cache, `aura-backup-${toDateKey(new Date())}.json`);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(envelope));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save your Aura backup',
    });
  } finally {
    // Don't leave a copy behind in the app's cache
    if (file.exists) file.delete();
  }
}

/** Let the user pick a backup file. Returns null if they cancel. */
export async function pickBackupFile(): Promise<BackupEnvelope | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const picked = new File(asset.uri);
  try {
    if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) throw new NotABackupError();
    const text = await picked.text();
    if (text.length > MAX_BACKUP_BYTES) throw new NotABackupError();
    return parseEnvelope(text);
  } finally {
    if (picked.exists) picked.delete();
  }
}

/** Decrypt and validate. Throws WrongPasswordError or NotABackupError. */
export async function openBackup(envelope: BackupEnvelope, password: string): Promise<BackupPayload> {
  return parsePayload(await decryptBackup(envelope, password, nativeDeriveKey));
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await replaceAllData(payload);
}
