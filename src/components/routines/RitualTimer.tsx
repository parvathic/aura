import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import CountdownRing from '../ui/CountdownRing';
import PillButton from '../ui/PillButton';
import { colors, typography, spacing } from '../../constants/theme';

interface RitualTimerProps {
  durationSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export default function RitualTimer({ durationSeconds, onComplete, onCancel }: RitualTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= durationSeconds) {
            clearInterval(intervalRef.current!);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            onComplete();
            return durationSeconds;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, durationSeconds, onComplete]);

  const remaining = durationSeconds - elapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = elapsed / durationSeconds;

  return (
    <View style={styles.container}>
      <CountdownRing size={160} strokeWidth={10} progress={progress}>
        <Text style={styles.time}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>
        <Text style={styles.label}>remaining</Text>
      </CountdownRing>
      <View style={styles.controls}>
        <PillButton
          title={running ? 'Pause' : 'Resume'}
          onPress={() => setRunning((r) => !r)}
          variant="secondary"
          size="sm"
        />
        <PillButton
          title="Cancel"
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  time: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
