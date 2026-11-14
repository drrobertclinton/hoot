// Keeps scheduled reminders in step with Settings and the plan calendar.
import { useEffect } from 'react';
import { applyReminders } from '@core/notifications';
import { buildReminders } from '@core/reminders';
import { useSettings } from '@core/settings';
import { usePlan } from '@modules/plan/state';

export function ReminderSync() {
  const reminders = useSettings((s) => s.reminders);
  const plan = usePlan();
  useEffect(() => {
    const t = setTimeout(() => {
      applyReminders(buildReminders(reminders, plan.items)).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [reminders, plan.items]);
  return null;
}
