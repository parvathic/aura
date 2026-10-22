import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import PillButton from '../components/ui/PillButton';
import { insertCycle } from '../db/repositories/cycleRepository';
import { setSetting } from '../db/database';
import { requestNotificationPermissions } from '../engine/notificationScheduler';
import { toDateKey } from '../utils/date';
import { runRestoreFlow } from '../backup/backupFlows';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [lastPeriodDate, setLastPeriodDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [loading, setLoading] = useState(false);

  const handleDateChange = (_event: unknown, date: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    setLastPeriodDate(date);
  };

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      // Format date as YYYY-MM-DD
      const dateStr = toDateKey(lastPeriodDate);
      try {
        await insertCycle(dateStr);
        await setSetting('onboarding_complete', '1');
      } catch (dbErr) {
        console.warn('DB write failed (expected on web):', dbErr);
      }

      // Request notification permissions (no-op on web)
      await requestNotificationPermissions().catch(() => {});

      onComplete();
    } catch (e) {
      console.error('Onboarding error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoIcon}>✦</Text>
          <Text style={styles.logo}>Aura</Text>
        </View>

        {/* Welcome */}
        <View style={styles.heroSection}>
          <Text style={styles.welcome}>Welcome to{'\n'}your cycle</Text>
          <Text style={styles.subtitle}>
            Track your rhythm, honor your phases, and build rituals that align with your body.
          </Text>
        </View>

        {/* Date picker section */}
        <View style={styles.dateSection}>
          <Text style={styles.label}>WHEN DID YOUR LAST PERIOD START?</Text>
          <View style={styles.datePickerContainer}>
            {(showDatePicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={lastPeriodDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onValueChange={handleDateChange}
                onDismiss={() => setShowDatePicker(Platform.OS === 'ios')}
                accentColor={colors.secondary}
                style={styles.datePicker}
              />
            )}
            {Platform.OS === 'android' && !showDatePicker && (
              <PillButton
                title={lastPeriodDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                onPress={() => setShowDatePicker(true)}
                variant="secondary"
              />
            )}
          </View>
        </View>

        {/* Info note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            We will use this to predict your cycle phases, fertility window, and personalize your wellness rituals. All data stays on your device.
          </Text>
        </View>

        {/* CTA */}
        <PillButton
          title="Get Started"
          onPress={handleGetStarted}
          variant="gradient"
          size="lg"
          fullWidth
          loading={loading}
        />

        <TouchableOpacity
          style={styles.restoreLink}
          onPress={() => runRestoreFlow(setLoading)}
          accessibilityRole="button"
        >
          <Text style={styles.restoreText}>
            Moving from another phone? <Text style={styles.restoreTextBold}>Restore a backup</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  restoreLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  restoreText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  restoreTextBold: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.secondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['4xl'],
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing['4xl'],
  },
  logoIcon: {
    fontSize: 24,
    color: colors.secondary,
  },
  logo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.secondary,
    letterSpacing: -1,
  },
  heroSection: {
    marginBottom: spacing['4xl'],
  },
  welcome: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: 36,
    color: colors.onSurface,
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 16,
    color: colors.onSurfaceVariant,
    lineHeight: 25.6,
  },
  dateSection: {
    marginBottom: spacing['3xl'],
  },
  label: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: spacing.md,
  },
  datePickerContainer: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.default,
    padding: spacing.lg,
    alignItems: 'center',
  },
  datePicker: {
    width: '100%',
  },
  infoCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.default,
    padding: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  infoText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
});
