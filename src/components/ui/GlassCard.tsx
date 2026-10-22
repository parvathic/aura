import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, shadows } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  useBlur?: boolean;
}

export default function GlassCard({
  children,
  style,
  intensity = 40,
  tint = 'light',
  useBlur = false,
}: GlassCardProps) {
  if (useBlur) {
    return (
      <BlurView intensity={intensity} tint={tint} style={[styles.glass, style]}>
        {children}
      </BlurView>
    );
  }

  // Tonal layering fallback (preferred per design system — no borders)
  return (
    <View style={[styles.card, shadows.editorial, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.default,
    padding: 24,
  },
});
