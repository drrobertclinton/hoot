// Local reminders on iOS and Android (expo-notifications). Nothing is sent to a server.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderSpec } from './reminders';

export const notificationsSupported = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => undefined);
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function applyReminders(specs: ReminderSpec[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!specs.length) return 0;
  if (!(await ensurePermission())) return 0;
  const T = Notifications.SchedulableTriggerInputTypes;
  let n = 0;
  for (const s of specs) {
    const trigger: Notifications.NotificationTriggerInput =
      s.trigger.type === 'daily'
        ? { type: T.DAILY, hour: s.trigger.hour, minute: s.trigger.minute, channelId: 'reminders' }
        : s.trigger.type === 'weekly'
          ? { type: T.WEEKLY, weekday: s.trigger.weekday, hour: s.trigger.hour, minute: s.trigger.minute, channelId: 'reminders' }
          : { type: T.DATE, date: new Date(s.trigger.at), channelId: 'reminders' };
    try {
      await Notifications.scheduleNotificationAsync({ identifier: s.id, content: { title: s.title, body: s.body }, trigger });
      n++;
    } catch {
      /* skip one bad trigger */
    }
  }
  return n;
}
