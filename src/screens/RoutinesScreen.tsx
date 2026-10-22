import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { dateFromTimeKey, formatTimeKey, toTimeKey } from '../utils/date';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import {
  FREQUENCY_OPTIONS,
  INTENTION_ICONS,
  INTENTION_OPTIONS,
  PHASES,
  PhaseName,
} from '../constants/phases';
import PillButton from '../components/ui/PillButton';
import SectionHeader from '../components/ui/SectionHeader';
import RitualTimer from '../components/routines/RitualTimer';
import { useRoutines } from '../hooks/useRoutines';
import { useCycleData } from '../hooks/useCycleData';

const PHASE_TIMER_DEFAULTS: Record<string, number> = {
  menstrual: 300,
  follicular: 600,
  ovulatory: 180,
  luteal: 300,
};

const PHASE_OPTIONS: Array<{ label: string; value: PhaseName | null }> = [
  { label: 'Any Phase', value: null },
  { label: 'Menstrual', value: 'menstrual' },
  { label: 'Follicular', value: 'follicular' },
  { label: 'Ovulatory', value: 'ovulatory' },
  { label: 'Luteal', value: 'luteal' },
];

export default function RoutinesScreen() {
  const { routines, completions, addRoutine, removeRoutine, toggleComplete } = useRoutines();
  const { phaseInfo } = useCycleData();

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);

  // Form state
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [intention, setIntention] = useState('balance');
  const [phaseTarget, setPhaseTarget] = useState<PhaseName | null>(null);
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState(() => dateFromTimeKey('09:00'));
  const [adding, setAdding] = useState(false);

  const handleAddRoutine = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your ritual.');
      return;
    }
    setAdding(true);
    try {
      await addRoutine({
        name: name.trim(),
        frequency,
        intention,
        phase_target: phaseTarget,
        reminder_time: reminderOn ? toTimeKey(reminderTime) : null,
      });
      setName('');
    } finally {
      setAdding(false);
    }
  };

  // Featured ritual based on current phase
  const featuredRitual = phaseInfo?.ritualSuggestion ?? 'Start a wellness ritual';

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
        </View>

        {/* Hero: Featured Ritual */}
        <View style={[styles.heroCard, shadows.editorial]}>
          {timerActive ? (
            <View style={styles.heroTimerContent}>
              <Text style={styles.heroLabel}>RITUAL IN PROGRESS</Text>
              <RitualTimer
                durationSeconds={timerDuration}
                onComplete={() => setTimerActive(false)}
                onCancel={() => setTimerActive(false)}
              />
            </View>
          ) : (
            <>
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>FEATURED RITUAL</Text>
                <Text style={styles.heroTitle}>
                  {phaseInfo
                    ? phaseInfo.ritualSuggestion.split('—')[0].trim()
                    : 'Herbal Infusion Ritual'}
                </Text>
                <Text style={styles.heroDescription}>
                  {phaseInfo
                    ? `Align your hormones during your ${phaseInfo.displayName.toLowerCase()}.`
                    : 'Align your hormones with a warming ritual.'}
                </Text>
                <PillButton
                  title="Start Timer"
                  onPress={() => {
                    const phase = phaseInfo?.name as string;
                    setTimerDuration(phase ? (PHASE_TIMER_DEFAULTS[phase] ?? 300) : 300);
                    setTimerActive(true);
                  }}
                  variant="gradient"
                  size="sm"
                />
              </View>
              <View style={styles.heroImage}>
                <LinearGradient
                  colors={['#7345B6', '#B48A8F']}
                  style={styles.heroImagePlaceholder}
                >
                  <MaterialIcons name="spa" size={40} color="rgba(255,255,255,0.5)" />
                </LinearGradient>
              </View>
            </>
          )}
        </View>

        {/* Active Rituals */}
        <SectionHeader title="Active Rituals" action="VIEW ALL" />

        {routines.length === 0 ? (
          <View style={styles.emptyRituals}>
            <Text style={styles.emptyText}>No rituals yet. Create one below!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.completionSummary}>
              {Object.keys(completions).length} of {routines.length} completed today
            </Text>
            <View style={styles.ritualsGrid}>
              {routines.map((routine, index) => {
                const isCompleted = !!completions[routine.id];
                return (
                  <TouchableOpacity
                    key={routine.id}
                    style={[
                      styles.ritualCard,
                      {
                        backgroundColor:
                          index % 2 === 0
                            ? colors.surfaceContainerLow
                            : colors.surfaceContainerHigh,
                        opacity: isCompleted ? 0.7 : 1,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      toggleComplete(routine.id);
                    }}
                    onLongPress={() => {
                      Alert.alert('Delete Ritual', `Remove "${routine.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => removeRoutine(routine.id),
                        },
                      ]);
                    }}
                  >
                    <View style={styles.ritualTop}>
                      <View style={[
                        styles.ritualIcon,
                        isCompleted && { backgroundColor: colors.secondaryContainer },
                      ]}>
                        <MaterialIcons
                          name={
                            isCompleted
                              ? 'check-circle'
                              : INTENTION_ICONS[routine.intention ?? ''] ?? 'self-improvement'
                          }
                          size={20}
                          color={isCompleted ? colors.secondary : colors.secondary}
                        />
                      </View>
                      {routine.phase_target && (
                        <View style={styles.phaseBadge}>
                          <Text style={styles.phaseBadgeText}>
                            {routine.phase_target.charAt(0).toUpperCase() +
                              routine.phase_target.slice(1)}
                          </Text>
                        </View>
                      )}
                      {!routine.phase_target && (
                        <View style={[styles.phaseBadge, { backgroundColor: 'rgba(180, 138, 143, 0.2)' }]}>
                          <Text style={[styles.phaseBadgeText, { color: colors.onPrimaryContainer }]}>
                            {routine.frequency.charAt(0).toUpperCase() + routine.frequency.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ritualBottom}>
                      <Text style={styles.ritualName}>{routine.name}</Text>
                      <Text style={styles.ritualSubtitle}>
                        {isCompleted
                          ? 'Completed'
                          : [
                              routine.intention
                                ? routine.intention.charAt(0).toUpperCase() + routine.intention.slice(1)
                                : 'Daily Support',
                              routine.reminder_time ? formatTimeKey(routine.reminder_time) : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Create New Action */}
        <View style={[styles.createCard, shadows.editorial]}>
          <Text style={styles.createTitle}>Create New Action</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ACTION NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Morning Sunlight"
              placeholderTextColor="rgba(80, 68, 69, 0.4)"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>FREQUENCY</Text>
              <View style={styles.pickerContainer}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setFrequency(opt.toLowerCase())}
                    style={[
                      styles.pickerOption,
                      frequency === opt.toLowerCase() && styles.pickerOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        frequency === opt.toLowerCase() && styles.pickerOptionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>INTENTION</Text>
              <View style={styles.pickerContainer}>
                {INTENTION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setIntention(opt.toLowerCase())}
                    style={[
                      styles.pickerOption,
                      intention === opt.toLowerCase() && styles.pickerOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        intention === opt.toLowerCase() && styles.pickerOptionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Phase target */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PHASE (OPTIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.phaseRow}>
                {PHASE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setPhaseTarget(opt.value)}
                    style={[
                      styles.pickerOption,
                      phaseTarget === opt.value && styles.pickerOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        phaseTarget === opt.value && styles.pickerOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Reminder */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>REMINDER</Text>
            <View style={styles.reminderRow}>
              <Switch
                value={reminderOn}
                onValueChange={setReminderOn}
                trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondaryContainer }}
                thumbColor={reminderOn ? colors.secondary : colors.outline}
                accessibilityLabel="Remind me"
              />
              {reminderOn ? (
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display="compact"
                  minuteInterval={5}
                  accentColor={colors.secondary}
                  onValueChange={(_event, date) => setReminderTime(date)}
                />
              ) : (
                <Text style={styles.reminderOffText}>No reminder</Text>
              )}
            </View>
          </View>

          <PillButton
            title="Add to Rituals"
            onPress={handleAddRoutine}
            variant="primary"
            size="lg"
            fullWidth
            loading={adding}
            icon={<MaterialIcons name="add" size={20} color={colors.white} />}
          />
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
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: { fontSize: 24, color: colors.secondary },
  logo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.secondary,
    letterSpacing: -1,
  },

  // Hero
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing['3xl'],
  },
  heroContent: {
    flex: 3,
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  heroTimerContent: {
    flex: 1,
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  heroTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  heroImage: {
    flex: 2,
  },
  heroImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rituals grid
  emptyRituals: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.default,
    padding: spacing['3xl'],
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  completionSummary: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  ritualsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  ritualCard: {
    width: '47%',
    height: 170,
    borderRadius: borderRadius.default,
    padding: spacing['2xl'],
    justifyContent: 'space-between',
  },
  ritualTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ritualIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBadge: {
    backgroundColor: 'rgba(184, 137, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.onSecondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ritualBottom: {},
  ritualName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.onSurface,
  },
  ritualSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Create form
  createCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
  },
  createTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: spacing['2xl'],
  },
  formGroup: {
    marginBottom: spacing.xl,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.default,
    padding: spacing.lg,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.onSurface,
  },
  pickerContainer: {
    gap: 4,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.default,
    backgroundColor: colors.surfaceContainerHigh,
  },
  pickerOptionActive: {
    backgroundColor: colors.secondaryContainer,
  },
  pickerOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  pickerOptionTextActive: {
    color: colors.onSecondaryContainer,
    fontFamily: typography.fontFamily.semiBold,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reminderOffText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
