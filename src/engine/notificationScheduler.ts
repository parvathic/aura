import * as Notifications from 'expo-notifications';
import { getActiveRoutines, Routine } from '../db/repositories/routineRepository';
import { getCurrentCycle, getCompletedCycles } from '../db/repositories/cycleRepository';
import { predictCycleLength, predictNextPeriodStart } from './cycleEngine';
import { getPhaseForDate } from './phaseEngine';
import { PhaseName } from '../constants/phases';
import { addDays, parseSqliteUtc, startOfDay } from '../utils/date';
import { getCyclePreferences } from '../db/database';

/** Shown instead of the real text when App Lock is on, since notifications appear on the lock screen. */
const DISCREET_CONTENT = { title: 'Aura', body: 'You have a reminder.' };

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel all scheduled notifications and reschedule based on current data.
 * Called when: new period logged, routine created/edited, app foregrounded.
 */
export async function rescheduleAllNotifications(): Promise<void> {
  // Cancel all existing
  await Notifications.cancelAllScheduledNotificationsAsync();

  const prefs = await getCyclePreferences();
  if (!prefs.notificationsEnabled) return;

  const currentCycle = await getCurrentCycle();
  if (!currentCycle) return;

  const completedCycles = await getCompletedCycles(6);
  const predictedLength = predictCycleLength(completedCycles, prefs.cycleLength);

  // Period reminder first, so it always fits under iOS's 64-notification limit
  await schedulePeriodReminder(
    predictNextPeriodStart(currentCycle.start_date, predictedLength),
    prefs.periodReminderDays,
    prefs.discreetNotifications,
  );

  const routines = await getActiveRoutines();
  const routinesWithReminders = routines.filter((r) => r.reminder_time);
  if (routinesWithReminders.length === 0) return;

  const notifications: Array<{
    date: Date;
    routine: Routine;
  }> = [];

  // Generate dates for the next 90 days
  const today = startOfDay(new Date());

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = addDays(today, dayOffset);

    const phaseResult = getPhaseForDate(
      date,
      currentCycle.start_date,
      predictedLength,
      prefs.periodLength,
    );

    for (const routine of routinesWithReminders) {
      if (shouldNotify(routine, phaseResult.phase, date)) {
        notifications.push({ date, routine });
      }
    }
  }

  // iOS limit: 64 local notifications. Schedule nearest 60 (period reminder uses one).
  const sorted = notifications.sort((a, b) => a.date.getTime() - b.date.getTime());
  const toSchedule = sorted.slice(0, 60);

  for (const { date, routine } of toSchedule) {
    const [hours, minutes] = (routine.reminder_time ?? '09:00').split(':').map(Number);
    const triggerDate = new Date(date);
    triggerDate.setHours(hours, minutes, 0, 0);

    // Skip notifications in the past
    if (triggerDate.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      content: prefs.discreetNotifications
        ? { ...DISCREET_CONTENT, data: { routineId: routine.id } }
        : {
            title: routine.name,
            body: `Time for your ${routine.name.toLowerCase()} ritual`,
            data: { routineId: routine.id },
          },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

function shouldNotify(routine: Routine, currentPhase: PhaseName, _date: Date): boolean {
  // Daily routines always notify
  if (routine.frequency === 'daily' && !routine.phase_target) {
    return true;
  }

  // Phase-based routines
  if (routine.phase_target) {
    return currentPhase === routine.phase_target;
  }

  // Weekly: notify on the same weekday as creation
  if (routine.frequency === 'weekly') {
    const createdDay = parseSqliteUtc(routine.created_at).getDay();
    return _date.getDay() === createdDay;
  }

  // Monthly: notify on the same day of month as creation
  if (routine.frequency === 'monthly') {
    const createdDate = parseSqliteUtc(routine.created_at).getDate();
    return _date.getDate() === createdDate;
  }

  return true;
}

/**
 * Schedule a one-off "period coming" notification.
 */
export async function schedulePeriodReminder(
  nextPeriodDate: Date,
  daysBefore: number = 1,
  discreet: boolean = false,
): Promise<void> {
  const reminderDate = addDays(nextPeriodDate, -daysBefore);
  reminderDate.setHours(9, 0, 0, 0);

  if (reminderDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: discreet
      ? DISCREET_CONTENT
      : {
          title: 'Period Coming Soon',
          body:
            daysBefore === 0
              ? 'Your period is predicted to start today. Take care of yourself.'
              : `Your period is predicted to start in ${daysBefore} day${daysBefore > 1 ? 's' : ''}. Take care of yourself.`,
        },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}
