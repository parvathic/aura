import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCycleData } from '../hooks/useCycleData';
import CountdownRing from '../components/ui/CountdownRing';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';

export default function CycleInsightsScreen() {
  const { phase, phaseInfo, cycleDay, predictedCycleLength } = useCycleData();

  if (!phase || !phaseInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Complete onboarding to see insights</Text>
        </View>
      </SafeAreaView>
    );
  }

  const phaseProgress = phase.daysIntoPhase / phase.totalPhaseDays;
  const daysLeft = phase.daysRemainingInPhase;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Phase countdown ring */}
        <View style={styles.ringSection}>
          <CountdownRing size={200} strokeWidth={10} progress={phaseProgress}>
            <Text style={styles.daysLeftNumber}>{daysLeft}</Text>
            <Text style={styles.daysLeftLabel}>{daysLeft === 1 ? 'day left' : 'days left'}</Text>
          </CountdownRing>
        </View>

        {/* Phase info */}
        <View style={styles.phaseSection}>
          <Text style={styles.phaseTitle}>{phaseInfo.displayName}</Text>
          <Text style={styles.phaseDescription}>{phaseInfo.description}</Text>
        </View>

        {/* Food Recommendations */}
        <View style={[styles.card, shadows.editorial]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="restaurant" size={20} color={colors.secondary} />
            <Text style={styles.cardTitle}>Recommended Foods</Text>
          </View>
          <View style={styles.foodList}>
            {phaseInfo.foods.map((food) => (
              <View key={food} style={styles.foodItem}>
                <View style={styles.foodDot} />
                <Text style={styles.foodText}>{food}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Exercise Intensity */}
        <View style={[styles.card, shadows.editorial]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="fitness-center" size={20} color={colors.secondary} />
            <Text style={styles.cardTitle}>{phaseInfo.exerciseLevel} Intensity</Text>
          </View>
          <Text style={styles.exerciseText}>{phaseInfo.exerciseDescription}</Text>
          <View style={styles.intensityBar}>
            <View
              style={[
                styles.intensityFill,
                {
                  width:
                    phaseInfo.exerciseLevel === 'High'
                      ? '100%'
                      : phaseInfo.exerciseLevel === 'Moderate'
                        ? '66%'
                        : phaseInfo.exerciseLevel === 'Light'
                          ? '33%'
                          : '50%',
                },
              ]}
            />
          </View>
        </View>

        {/* Editorial Insight Card */}
        <View style={styles.insightCard}>
          <LinearGradient
            colors={['transparent', 'rgba(115, 69, 182, 0.85)']}
            style={styles.insightGradient}
          >
            <Text style={styles.insightQuote}>{phaseInfo.insight}</Text>
          </LinearGradient>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },

  // Ring
  ringSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  daysLeftNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 40,
    color: colors.secondary,
  },
  daysLeftLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'lowercase',
  },

  // Phase
  phaseSection: {
    marginBottom: spacing['3xl'],
  },
  phaseTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  phaseDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },

  // Cards
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
  },

  // Food
  foodList: {
    gap: spacing.md,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  foodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  foodText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurface,
  },

  // Exercise
  exerciseText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  intensityBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },

  // Insight
  insightCard: {
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    height: 180,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: spacing.lg,
  },
  insightGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing['2xl'],
  },
  insightQuote: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.white,
    lineHeight: 26,
    fontStyle: 'italic',
  },
});
