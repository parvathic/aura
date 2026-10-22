import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../constants/theme';
import PillButton from '../ui/PillButton';
import { authenticate, getUnlockMethod, UnlockMethod } from '../../security/appLock';

/** Full-screen cover shown while Aura is locked. Prompts for Face ID as soon as it appears. */
export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [method, setMethod] = useState<UnlockMethod>('Face ID');
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    try {
      if (await authenticate('Unlock Aura')) onUnlock();
    } finally {
      setBusy(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    getUnlockMethod().then(setMethod).catch(() => {});
    // iOS only shows Face ID to an app in the foreground, so wait until Aura is active
    const promptOnce = () => {
      if (prompted.current) return;
      prompted.current = true;
      tryUnlock();
    };
    if (AppState.currentState === 'active') {
      promptOnce();
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') promptOnce();
    });
    return () => sub.remove();
  }, [tryUnlock]);

  return (
    <View style={styles.container} accessibilityViewIsModal>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="lock" size={32} color={colors.secondary} />
        </View>
        <Text style={styles.logo}>✦ Aura</Text>
        <Text style={styles.subtitle}>Locked to keep your cycle data private.</Text>
      </View>
      <PillButton
        title={`Unlock with ${method}`}
        onPress={tryUnlock}
        variant="gradient"
        size="lg"
        fullWidth
        loading={busy}
      />
    </View>
  );
}

/** Plain cover used in the app switcher so screenshots of Aura show nothing private. */
export function PrivacyCover() {
  return (
    <View style={styles.container} accessibilityViewIsModal>
      <View style={styles.center}>
        <Text style={styles.logo}>✦ Aura</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['6xl'],
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(115, 69, 182, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 32,
    color: colors.secondary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
