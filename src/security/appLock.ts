// Face ID / Touch ID / passcode lock for the whole app.
import * as LocalAuthentication from 'expo-local-authentication';

export type UnlockMethod = 'Face ID' | 'Touch ID' | 'Passcode';

/** True if this phone has Face ID, Touch ID or at least a passcode set up. */
export async function canUseAppLock(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/** What the unlock button should say on this phone. */
export async function getUnlockMethod(): Promise<UnlockMethod> {
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (enrolled) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID';
  }
  return 'Passcode';
}

/** Show the system Face ID / passcode prompt. Resolves true on success. */
export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use Passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // allow the phone passcode if Face ID fails
  });
  return result.success;
}
