// Tiny app-wide event so a screen deep in navigation can send the user back to onboarding.
type Listener = () => void;
const resetListeners = new Set<Listener>();

export function onAppReset(listener: Listener): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function emitAppReset(): void {
  resetListeners.forEach((l) => l());
}

// Fired when the App Lock switch changes in Settings
type LockListener = (enabled: boolean) => void;
const lockListeners = new Set<LockListener>();

export function onAppLockChanged(listener: LockListener): () => void {
  lockListeners.add(listener);
  return () => lockListeners.delete(listener);
}

export function emitAppLockChanged(enabled: boolean): void {
  lockListeners.forEach((l) => l(enabled));
}

// Fired after a backup is restored, so the app reloads everything
const restoreListeners = new Set<Listener>();

export function onDataRestored(listener: Listener): () => void {
  restoreListeners.add(listener);
  return () => restoreListeners.delete(listener);
}

export function emitDataRestored(): void {
  restoreListeners.forEach((l) => l());
}
