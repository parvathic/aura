import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { getAllCycles, Cycle } from '../db/repositories/cycleRepository';
import { setSetting } from '../db/database';
import PillButton from '../components/ui/PillButton';
import { parseDateKey } from '../utils/date';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [cycles, setCycles] = useState<Cycle[]>([]);

  useEffect(() => {
    getAllCycles().then(setCycles).catch(console.error);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialIcons name="settings" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Privacy card */}
        <View style={[styles.card, shadows.editorial]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="lock" size={20} color={colors.secondary} />
            <Text style={styles.cardTitle}>Your Data is Private</Text>
          </View>
          <Text style={styles.cardBody}>
            All your cycle data is stored locally on this device. Nothing is sent to any server. Your health information stays completely private.
          </Text>
        </View>

        {/* Cycle History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle History</Text>
          {cycles.length === 0 ? (
            <Text style={styles.emptyText}>No cycles recorded yet.</Text>
          ) : (
            cycles.map((cycle) => (
              <View key={cycle.id} style={styles.cycleRow}>
                <View style={styles.cycleInfo}>
                  <Text style={styles.cycleDate}>
                    {parseDateKey(cycle.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {cycle.end_date && (
                    <Text style={styles.cycleEndDate}>
                      to{' '}
                      {parseDateKey(cycle.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
                {cycle.cycle_length ? (
                  <Text style={styles.cycleLength}>{cycle.cycle_length} days</Text>
                ) : (
                  <Text style={styles.cycleCurrent}>Current</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Aura</Text>
          <Text style={styles.aboutText}>
            Aura is a wellness tracking app designed to help you understand and honor your menstrual cycle. Predictions are estimates based on your logged data and should not be used as medical advice.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
  },
  cardBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },

  // Section
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },

  // Cycle rows
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.default,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  cycleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cycleDate: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  cycleEndDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  cycleLength: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.secondary,
  },
  cycleCurrent: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    color: colors.tertiary,
  },

  // About
  aboutText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  versionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.outline,
  },
});
