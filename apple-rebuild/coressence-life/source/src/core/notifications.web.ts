// Web preview: reminders are a phone feature. Settings still save so they apply in the app.
import type { ReminderSpec } from './reminders';

export const notificationsSupported = false;
export async function ensurePermission(): Promise<boolean> {
  return false;
}
export async function applyReminders(_specs: ReminderSpec[]): Promise<number> {
  return 0;
}
