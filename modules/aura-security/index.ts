import { requireNativeModule } from 'expo';

interface AuraSecurityNative {
  protectDirectory(path: string): void;
  getProtection(path: string): string | null;
  setExcludedFromBackup(path: string, excluded: boolean): void;
  isExcludedFromBackup(path: string): boolean;
  pbkdf2Sha256(password: string, saltBase64: string, iterations: number): Promise<string>;
}

export default requireNativeModule<AuraSecurityNative>('AuraSecurity');
