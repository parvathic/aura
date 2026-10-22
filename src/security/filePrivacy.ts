// Applies iOS file protection and the backup choice to Aura's database folder.
import { Platform } from 'react-native';
import { getDatabase, getSetting } from '../db/database';

function nativeModule() {
  if (Platform.OS !== 'ios') return null;
  // Loaded lazily so tests and other platforms don't need the native module
  return require('../../modules/aura-security').default as typeof import('../../modules/aura-security').default;
}

async function databaseFolder(): Promise<string> {
  const db = await getDatabase();
  return db.databasePath.replace(/\/[^/]+$/, '');
}

/** Run at startup: encrypt the database folder while locked, and apply the backup setting. */
export async function applyFilePrivacy(): Promise<void> {
  const native = nativeModule();
  if (!native) return;
  const folder = await databaseFolder();
  native.protectDirectory(folder);
  const include = (await getSetting('include_in_backups')) !== '0';
  native.setExcludedFromBackup(folder, !include);
}

export async function setIncludedInBackups(include: boolean): Promise<void> {
  const native = nativeModule();
  if (!native) return;
  native.setExcludedFromBackup(await databaseFolder(), !include);
}

/** For checking on a device that protection is in place. */
export async function describeFilePrivacy(): Promise<{ protection: string | null; excluded: boolean } | null> {
  const native = nativeModule();
  if (!native) return null;
  const db = await getDatabase();
  return {
    protection: native.getProtection(db.databasePath),
    excluded: native.isExcludedFromBackup(await databaseFolder()),
  };
}
