import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '../db/database';
import { rescheduleAllNotifications } from '../engine/notificationScheduler';

const SETTING_KEYS = [
  'custom_cycle_length',
  'custom_period_length',
  'notifications_enabled',
  'default_reminder_time',
  'period_reminder_days',
  'app_lock_enabled',
  'include_in_backups',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  custom_cycle_length: '28',
  custom_period_length: '5',
  notifications_enabled: '1',
  default_reminder_time: '09:00',
  period_reminder_days: '1',
  app_lock_enabled: '0',
  include_in_backups: '1',
};

export function useSettings() {
  const [settings, setSettings] = useState<Record<SettingKey, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const loaded = { ...DEFAULTS };
        for (const key of SETTING_KEYS) {
          const value = await getSetting(key);
          if (value !== null) loaded[key] = value;
        }
        setSettings(loaded);
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSetting = useCallback(async (key: SettingKey, value: string) => {
    await setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Every setting affects what gets scheduled (cycle length, reminders on/off, lead time)
    rescheduleAllNotifications().catch(console.error);
  }, []);

  return {
    settings,
    loading,
    updateSetting,
    cycleLength: parseInt(settings.custom_cycle_length, 10),
    periodLength: parseInt(settings.custom_period_length, 10),
    notificationsEnabled: settings.notifications_enabled === '1',
    defaultReminderTime: settings.default_reminder_time,
    periodReminderDays: parseInt(settings.period_reminder_days, 10),
    appLockEnabled: settings.app_lock_enabled === '1',
    includeInBackups: settings.include_in_backups !== '0',
  };
}
