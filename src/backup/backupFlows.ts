// The step-by-step export and restore conversations (password prompts, confirmations, errors).
import { Alert } from 'react-native';
import { exportBackup, MIN_PASSWORD_LENGTH, openBackup, pickBackupFile, restoreBackup } from './backupFile';
import { NotABackupError, WrongPasswordError } from './backupCrypto';
import { summarizePayload } from './backupData';
import { emitDataRestored } from '../state/appEvents';

function promptSecure(title: string, message: string, submitLabel = 'Continue'): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: submitLabel, onPress: (value?: string) => resolve(value ?? '') },
      ],
      'secure-text',
    );
  });
}

function confirm(title: string, message: string, actionLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: actionLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function errorMessage(e: unknown): string {
  if (e instanceof WrongPasswordError || e instanceof NotABackupError) return e.message;
  return 'Something went wrong. Your data has not been changed.';
}

/** Ask for a password twice, encrypt everything, and open the share sheet. */
export async function runExportFlow(setBusy: (busy: boolean) => void): Promise<void> {
  const password = await promptSecure(
    'Choose a Backup Password',
    `At least ${MIN_PASSWORD_LENGTH} characters. You'll need it to restore. If you forget it, the backup can't be opened by anyone, including you.`,
  );
  if (password === null) return;
  if (password.length < MIN_PASSWORD_LENGTH) {
    Alert.alert('Password Too Short', `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    return;
  }
  const again = await promptSecure('Confirm Password', 'Type the same password again.', 'Export');
  if (again === null) return;
  if (again !== password) {
    Alert.alert("Passwords Don't Match", 'Nothing was exported. Please try again.');
    return;
  }

  setBusy(true);
  try {
    await exportBackup(password);
  } catch (e) {
    console.error('[Aura] Export failed:', e);
    Alert.alert('Export Failed', 'The backup could not be created.');
  } finally {
    setBusy(false);
  }
}

/** Pick a backup file, ask for its password, confirm, and replace everything on this phone. */
export async function runRestoreFlow(setBusy: (busy: boolean) => void): Promise<boolean> {
  let envelope;
  try {
    envelope = await pickBackupFile();
  } catch (e) {
    Alert.alert('Not an Aura Backup', errorMessage(e));
    return false;
  }
  if (!envelope) return false;

  const password = await promptSecure('Backup Password', 'Enter the password you chose when you exported this backup.', 'Open');
  if (password === null) return false;

  setBusy(true);
  let payload;
  try {
    payload = await openBackup(envelope, password);
  } catch (e) {
    setBusy(false);
    Alert.alert("Couldn't Open Backup", errorMessage(e));
    return false;
  }
  setBusy(false);

  const when = payload.exportedAt
    ? new Date(payload.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'an earlier date';
  const ok = await confirm(
    'Replace Data on This Phone?',
    `This backup from ${when} has ${summarizePayload(payload)}. Everything currently in Aura on this phone will be replaced.`,
    'Restore',
  );
  if (!ok) return false;

  setBusy(true);
  try {
    await restoreBackup(payload);
  } catch (e) {
    console.error('[Aura] Restore failed:', e);
    Alert.alert('Restore Failed', errorMessage(e));
    return false;
  } finally {
    setBusy(false);
  }
  emitDataRestored();
  Alert.alert('Backup Restored', `Restored ${summarizePayload(payload)}.`);
  return true;
}
