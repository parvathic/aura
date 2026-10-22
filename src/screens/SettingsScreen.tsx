import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { useSettings } from '../hooks/useSettings';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { clearAllData } from '../db/database';
import { emitAppLockChanged, emitAppReset } from '../state/appEvents';
import { authenticate, canUseAppLock, getUnlockMethod, UnlockMethod } from '../security/appLock';
import { setIncludedInBackups } from '../security/filePrivacy';
import { runExportFlow, runRestoreFlow } from '../backup/backupFlows';

function Stepper({
  value,
  min,
  max,
  suffix,
  onchange,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  onchange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => value > min && onchange(value - 1)}
        disabled={value <= min}
      >
        <MaterialIcons
          name="remove"
          size={18}
          color={value <= min ? colors.outline : colors.onSurface}
        />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>
        {value} {suffix}
      </Text>
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => value < max && onchange(value + 1)}
        disabled={value >= max}
      >
        <MaterialIcons
          name="add"
          size={18}
          color={value >= max ? colors.outline : colors.onSurface}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const {
    loading,
    updateSetting,
    cycleLength,
    periodLength,
    notificationsEnabled,
    periodReminderDays,
    appLockEnabled,
    includeInBackups,
  } = useSettings();
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod>('Face ID');
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  useEffect(() => {
    getUnlockMethod().then(setUnlockMethod).catch(() => {});
  }, []);

  const handleAppLockToggle = async (turnOn: boolean) => {
    if (turnOn && !(await canUseAppLock())) {
      Alert.alert(
        'Set Up a Passcode First',
        'App Lock uses your iPhone passcode or Face ID. Set one up in the iPhone Settings app, then try again.',
      );
      return;
    }
    // Confirm it's really you before changing the lock either way
    const ok = await authenticate(turnOn ? 'Turn on App Lock' : 'Turn off App Lock');
    if (!ok) return;
    await updateSetting('app_lock_enabled', turnOn ? '1' : '0');
    emitAppLockChanged(turnOn);
  };

  const handleBackupToggle = async (include: boolean) => {
    if (!include) {
      const proceed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Leave Aura Out of Backups?',
          "Your data will never leave this phone, even in iCloud or computer backups. If you lose or replace your phone, it's gone unless you exported a backup.",
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Leave Out', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!proceed) return;
    }
    await setIncludedInBackups(include);
    await updateSetting('include_in_backups', include ? '1' : '0');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This permanently deletes every period, log and routine stored on this phone, then returns to the welcome screen. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
            await clearAllData();
            emitAppReset();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Profile"
          >
            <MaterialIcons name="chevron-left" size={28} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Cycle Preferences */}
        <View style={[styles.card, shadows.editorial]}>
          <Text style={styles.sectionTitle}>Cycle Preferences</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Cycle Length</Text>
              <Text style={styles.rowHint}>Average days between periods</Text>
            </View>
            <Stepper
              value={cycleLength}
              min={21}
              max={45}
              suffix="days"
              onchange={(v) => updateSetting('custom_cycle_length', String(v))}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Period Length</Text>
              <Text style={styles.rowHint}>Average days of flow</Text>
            </View>
            <Stepper
              value={periodLength}
              min={2}
              max={8}
              suffix="days"
              onchange={(v) => updateSetting('custom_period_length', String(v))}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.card, shadows.editorial]}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Reminders</Text>
              <Text style={styles.rowHint}>Routine and period reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) =>
                updateSetting('notifications_enabled', v ? '1' : '0')
              }
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondaryContainer }}
              thumbColor={notificationsEnabled ? colors.secondary : colors.outline}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabel}>
                  <Text style={styles.rowTitle}>Period Reminder</Text>
                  <Text style={styles.rowHint}>Days before predicted period</Text>
                </View>
                <Stepper
                  value={periodReminderDays}
                  min={0}
                  max={5}
                  suffix={periodReminderDays === 1 ? 'day' : 'days'}
                  onchange={(v) => updateSetting('period_reminder_days', String(v))}
                />
              </View>
            </>
          )}
        </View>

        {/* Privacy & Security */}
        <View style={[styles.card, shadows.editorial]}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Lock with {unlockMethod}</Text>
              <Text style={styles.rowHint}>Ask every time you open Aura</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondaryContainer }}
              thumbColor={appLockEnabled ? colors.secondary : colors.outline}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Include in iPhone Backups</Text>
              <Text style={styles.rowHint}>
                {includeInBackups
                  ? 'Restored automatically on a new phone'
                  : 'Never leaves this phone. Export to keep a copy'}
              </Text>
            </View>
            <Switch
              value={includeInBackups}
              onValueChange={handleBackupToggle}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondaryContainer }}
              thumbColor={includeInBackups ? colors.secondary : colors.outline}
            />
          </View>
        </View>

        {/* Data */}
        <View style={[styles.card, shadows.editorial]}>
          <Text style={styles.sectionTitle}>Data</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => runExportFlow((b) => setBusyMessage(b ? 'Encrypting your backup…' : null))}
          >
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Export Backup</Text>
              <Text style={styles.rowHint}>Password-protected file you can save anywhere</Text>
            </View>
            <MaterialIcons name="ios-share" size={22} color={colors.outline} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => runRestoreFlow((b) => setBusyMessage(b ? 'Opening your backup…' : null))}
          >
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Restore from Backup</Text>
              <Text style={styles.rowHint}>Replaces everything on this phone</Text>
            </View>
            <MaterialIcons name="restore" size={22} color={colors.outline} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleReset}>
            <View style={styles.rowLabel}>
              <Text style={[styles.rowTitle, { color: '#C62828' }]}>Reset App</Text>
              <Text style={styles.rowHint}>Clear all data and start over</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      {busyMessage && (
        <View style={styles.busyOverlay} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <View style={styles.busyCard}>
            <ActivityIndicator color={colors.secondary} />
            <Text style={styles.busyText}>{busyMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  busyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30, 27, 27, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
  },
  busyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.onSurface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },

  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: spacing.xl,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    marginRight: spacing.lg,
  },
  rowTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  rowHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.lg,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.onSurface,
    minWidth: 60,
    textAlign: 'center',
  },
});
