import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCycleData } from '../hooks/useCycleData';
import CountdownRing from '../components/ui/CountdownRing';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { PHASES, PhaseName } from '../constants/phases';
import { getPhaseForDate } from '../engine/phaseEngine';
import { getLogsForRange } from '../db/repositories/dailyLogRepository';
import { toDateKey, todayKey } from '../utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const PHASE_COLORS: Record<PhaseName, string> = {
  menstrual: colors.phaseMenustrual,
  follicular: colors.phaseFollicular,
  ovulatory: colors.phaseOvulatory,
  luteal: colors.phaseLuteal,
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const openLog = (date: string) => navigation.navigate('Log', { date, requestId: Date.now() });
  const {
    currentCycle,
    predictedCycleLength,
    periodLength,
    cycleDay,
    phase,
    phaseInfo,
    fertilityStatus,
    daysUntilPeriod,
    daysUntilFertile,
  } = useCycleData();

  const [calendarMonth, setCalendarMonth] = useState(new Date());

  if (!currentCycle || !phase || !phaseInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading your cycle data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = cycleDay / predictedCycleLength;
  const phaseName = phaseInfo.displayName.replace(' Phase', '');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoIcon}>✦</Text>
            <Text style={styles.logo}>Aura</Text>
          </View>
          <View style={styles.avatar} />
        </View>

        {/* Hero: Cycle Ring */}
        <View style={styles.heroSection}>
          <CountdownRing size={260} strokeWidth={12} progress={progress}>
            <Text style={styles.phaseLabel}>{phaseName} Day {phase.daysIntoPhase}</Text>
            <Text style={styles.fertilityTitle}>
              {fertilityStatus === 'Peak Fertility'
                ? 'Peak\nFertility'
                : fertilityStatus === 'High Fertility'
                  ? 'High\nFertility'
                  : 'Low\nFertility'}
            </Text>
            {(fertilityStatus === 'High Fertility' || fertilityStatus === 'Peak Fertility') && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Action Required</Text>
              </View>
            )}
          </CountdownRing>

          {/* Log Symptoms Card */}
          <TouchableOpacity
            style={[styles.logPromptCard, shadows.editorial]}
            onPress={() => openLog(todayKey())}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Log symptoms for today"
          >
            <View>
              <Text style={styles.logPromptTitle}>Log Symptoms</Text>
              <Text style={styles.logPromptSubtitle}>Personalize your insights</Text>
            </View>
            <LinearGradient
              colors={['#7345B6', '#B48A8F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logPromptButton}
            >
              <MaterialIcons name="add" size={24} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <MaterialIcons name="water-drop" size={24} color={colors.secondary} />
            <View style={styles.statBottom}>
              <Text style={styles.statLabel}>NEXT PERIOD</Text>
              <Text style={styles.statValue}>
                {daysUntilPeriod}{' '}
                <Text style={styles.statUnit}>Days</Text>
              </Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primaryContainer }]}>
            <MaterialIcons name="favorite" size={24} color={colors.onPrimaryContainer} />
            <View style={styles.statBottom}>
              <Text style={[styles.statLabel, { color: 'rgba(66, 37, 41, 0.7)' }]}>FERTILITY</Text>
              <Text style={[styles.statValueSm, { color: colors.onPrimaryContainer }]}>
                {daysUntilFertile === 1
                  ? 'Starts tomorrow'
                  : daysUntilFertile !== null
                    ? `Starts in ${daysUntilFertile} days`
                    : fertilityStatus === 'Peak Fertility'
                      ? 'Peak today'
                      : fertilityStatus === 'High Fertility'
                        ? 'Window open'
                        : 'Window passed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Calendar */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonth}>
              {calendarMonth.toLocaleDateString('en-US', { month: 'long' })}
            </Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={() => {
                const prev = new Date(calendarMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCalendarMonth(prev);
              }}>
                <MaterialIcons name="chevron-left" size={24} color={colors.outline} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const next = new Date(calendarMonth);
                next.setMonth(next.getMonth() + 1);
                setCalendarMonth(next);
              }}>
                <MaterialIcons name="chevron-right" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, i) => (
              <Text key={i} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <CalendarGrid
            month={calendarMonth}
            cycleStartDate={currentCycle.start_date}
            predictedCycleLength={predictedCycleLength}
            periodLength={periodLength}
            onSelectDate={openLog}
          />
        </View>

        {/* Weekly Insight Card */}
        <View style={styles.insightCard}>
          <LinearGradient
            colors={['transparent', 'rgba(115, 69, 182, 0.8)']}
            style={styles.insightGradient}
          >
            <Text style={styles.insightLabel}>WEEKLY INSIGHT</Text>
            <Text style={styles.insightTitle}>{phaseInfo.insight}</Text>
          </LinearGradient>
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Calendar grid component
function CalendarGrid({
  month,
  cycleStartDate,
  predictedCycleLength,
  periodLength,
  onSelectDate,
}: {
  month: Date;
  cycleStartDate: string;
  predictedCycleLength: number;
  periodLength: number;
  onSelectDate: (date: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  // Which days this month already have a log, so they can be marked
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      const first = toDateKey(new Date(year, monthIndex, 1));
      const last = toDateKey(new Date(year, monthIndex + 1, 0));
      getLogsForRange(first, last)
        .then((logs) => setLoggedDays(new Set(logs.map((l) => l.log_date))))
        .catch(() => {});
    }, [year, monthIndex]),
  );
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: React.ReactNode[] = [];

  // Empty cells for days before the first
  for (let i = 0; i < firstDay; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const phaseResult = getPhaseForDate(date, cycleStartDate, predictedCycleLength, periodLength);
    const phaseColor = PHASE_COLORS[phaseResult.phase];

    // Show phase dot indicator
    const isFuture = date > today;

    const dateKey = toDateKey(date);
    const hasLog = loggedDays.has(dateKey);

    cells.push(
      <TouchableOpacity
        key={day}
        style={styles.calendarCell}
        disabled={isFuture}
        onPress={() => onSelectDate(dateKey)}
        accessibilityRole="button"
        accessibilityLabel={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${hasLog ? ', logged' : ''}`}
      >
        <View
          style={[
            styles.dayCircle,
            hasLog && !isToday && styles.dayCircleLogged,
            isToday && { backgroundColor: colors.secondary },
          ]}
        >
          <Text
            style={[
              styles.dayText,
              isToday && { color: colors.white, fontFamily: typography.fontFamily.bold },
            ]}
          >
            {day}
          </Text>
        </View>
        <View
          style={[
            styles.phaseDot,
            { backgroundColor: isFuture ? `${phaseColor}80` : phaseColor },
          ]}
        />
      </TouchableOpacity>,
    );
  }

  return <View style={styles.calendarGrid}>{cells}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 24,
    color: colors.secondary,
  },
  logo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.secondary,
    letterSpacing: -1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  phaseLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  fertilityTitle: {
    fontFamily: typography.fontFamily.extraBold,
    fontSize: 32,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 36,
  },
  actionBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(115, 69, 182, 0.1)',
  },
  actionBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: colors.secondary,
  },

  // Log prompt
  logPromptCard: {
    marginTop: -24,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    zIndex: 10,
  },
  logPromptTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  logPromptSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.outline,
    fontStyle: 'italic',
  },
  logPromptButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  statCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    justifyContent: 'space-between',
  },
  statBottom: {},
  statLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.onSurface,
  },
  statUnit: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
  },
  statValueSm: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
  },

  // Calendar
  calendarSection: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
    marginBottom: spacing['3xl'],
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  calendarMonth: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: colors.onSurface,
  },
  calendarNav: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleLogged: {
    borderWidth: 1.5,
    borderColor: 'rgba(115, 69, 182, 0.45)',
  },
  dayText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurface,
  },
  phaseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },

  // Insight card
  insightCard: {
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    height: 200,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: spacing.lg,
  },
  insightGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing['3xl'],
  },
  insightLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  insightTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    color: colors.white,
    lineHeight: 28,
  },
});
