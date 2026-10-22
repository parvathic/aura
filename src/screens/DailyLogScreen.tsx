import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import { MOOD_OPTIONS, SYMPTOM_OPTIONS, FLOW_OPTIONS } from '../constants/phases';
import Chip from '../components/ui/Chip';
import PillButton from '../components/ui/PillButton';
import { useDailyLog } from '../hooks/useDailyLog';
import { startNewPeriod, getCurrentCycle } from '../db/repositories/cycleRepository';
import { rescheduleAllNotifications } from '../engine/notificationScheduler';
import { addDays, daysBetween, parseDateKey, toDateKey, todayKey } from '../utils/date';

export default function DailyLogScreen() {
  const route = useRoute();
  const params = route.params as { date?: string; requestId?: number } | undefined;

  // The day being logged. Opening the tab shows today, unless another screen just asked for a
  // specific day (e.g. tapping a day on the Home calendar). Each request has a unique id so it is
  // used once; after that, opening the tab goes back to today.
  const [today, setToday] = useState(todayKey);
  const handledRequest = useRef<number | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      if (params?.date && params.requestId !== handledRequest.current) {
        handledRequest.current = params.requestId;
        setToday(params.date <= todayKey() ? params.date : todayKey());
      } else {
        setToday(todayKey());
      }
    }, [params?.date, params?.requestId]),
  );
  const log = useDailyLog(today);

  const isToday = today === todayKey();
  const shiftDay = (delta: number) => {
    const next = toDateKey(addDays(parseDateKey(today), delta));
    if (next <= todayKey()) setToday(next);
  };

  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const handleSave = async () => {
    await log.save();
    setJustSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Check if user logged flow and might be starting a new period
    if (log.flow && log.flow.toLowerCase() !== 'none') {
      const currentCycle = await getCurrentCycle();
      if (currentCycle) {
        const daysSinceStart = daysBetween(
          parseDateKey(currentCycle.start_date),
          parseDateKey(today),
        );

        // If it has been more than 20 days since cycle start, this might be a new period
        if (daysSinceStart > 20) {
          Alert.alert(
            'New Period?',
            'Is this the start of a new period?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes',
                onPress: async () => {
                  await startNewPeriod(today);
                  rescheduleAllNotifications().catch(console.error);
                },
              },
            ],
          );
        }
      }
    }
  };

  const todayFormatted = parseDateKey(today).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dateBar}>
            <TouchableOpacity
              onPress={() => shiftDay(-1)}
              style={styles.dateArrow}
              accessibilityLabel="Previous day"
            >
              <MaterialIcons name="chevron-left" size={22} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{todayFormatted.toUpperCase()}</Text>
            <TouchableOpacity
              onPress={() => shiftDay(1)}
              disabled={isToday}
              style={styles.dateArrow}
              accessibilityLabel="Next day"
            >
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={isToday ? colors.outlineVariant : colors.onSurface}
              />
            </TouchableOpacity>
            {!isToday && (
              <TouchableOpacity onPress={() => setToday(todayKey())} style={styles.todayPill}>
                <Text style={styles.todayPillText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.title}>Daily Log</Text>
          <Text style={styles.subtitle}>
            Reflect on your inner rhythm. Your inputs help Aura create your personalized wellness journey.
          </Text>
        </View>

        {/* Current Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Mood</Text>
          <View style={styles.flowRow}>
            {MOOD_OPTIONS.map((mood) => (
              <Chip
                key={mood}
                label={mood}
                selected={log.moods.includes(mood)}
                onPress={() => log.toggleMood(mood)}
              />
            ))}
          </View>
        </View>

        {/* Flow Intensity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flow Intensity</Text>
          <View style={styles.flowRow}>
            {FLOW_OPTIONS.map((level) => (
              <Chip
                key={level}
                label={level}
                selected={log.flow?.toLowerCase() === level.toLowerCase()}
                onPress={() =>
                  log.setFlow(
                    log.flow?.toLowerCase() === level.toLowerCase() ? null : level.toLowerCase(),
                  )
                }
              />
            ))}
          </View>
        </View>

        {/* Physical Symptoms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Symptoms</Text>
          <View style={styles.symptomGrid}>
            {SYMPTOM_OPTIONS.map(({ label, icon }) => (
              <View key={label} style={styles.symptomItem}>
                <Chip
                  label={label}
                  selected={log.symptoms.includes(label)}
                  onPress={() => log.toggleSymptom(label)}
                  icon={
                    <MaterialIcons
                      name={icon as any}
                      size={18}
                      color={
                        log.symptoms.includes(label)
                          ? colors.onSecondaryContainer
                          : colors.onSurfaceVariant
                      }
                    />
                  }
                />
              </View>
            ))}
          </View>
        </View>

        {/* Personal Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="How are you feeling today?"
            placeholderTextColor="rgba(80, 68, 69, 0.4)"
            value={log.notes}
            onChangeText={log.setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <PillButton
          title={justSaved ? 'Saved ✓' : 'Save Log'}
          onPress={handleSave}
          disabled={log.loading}
          variant="gradient"
          size="lg"
          fullWidth
          loading={log.saving}
        />

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
    marginBottom: spacing['3xl'],
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -spacing.sm,
    marginBottom: spacing.sm,
  },
  dateArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.55,
  },
  todayPill: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(115, 69, 182, 0.1)',
  },
  todayPillText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    color: colors.secondary,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  flowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  symptomItem: {},
  notesInput: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.default,
    padding: spacing.lg,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurface,
    minHeight: 100,
    lineHeight: 22,
  },
});
