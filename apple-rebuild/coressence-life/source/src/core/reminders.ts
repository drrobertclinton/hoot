// Turns reminder settings and scheduled plan items into a list of local notifications (pure; unit-tested).
import { hm, parseDay } from './dates';
import type { ReminderSettings } from './settingsModel';

export type ReminderTrigger = { type: 'daily'; hour: number; minute: number } | { type: 'weekly'; weekday: number; hour: number; minute: number } | { type: 'date'; at: number };
export type ReminderSpec = { id: string; title: string; body: string; trigger: ReminderTrigger };
export type RemindableItem = { id: string; date: string; time?: string; title: string; remind?: boolean; done?: boolean };

/** iOS keeps at most 64 pending local notifications per app. */
export const MAX_PENDING = 60;

const at = (t: string) => ({ hour: Math.floor(hm(t) / 60), minute: hm(t) % 60 });

export function buildReminders(r: ReminderSettings, items: RemindableItem[], now = Date.now()): ReminderSpec[] {
  const out: ReminderSpec[] = [];
  if (r.checkin.on) out.push({ id: 'checkin', title: 'Daily check-in', body: 'How are your energy, mood and stress today? It takes about 20 seconds.', trigger: { type: 'daily', ...at(r.checkin.time) } });
  if (r.bedtime.on) out.push({ id: 'bedtime', title: 'Wind down', body: 'Your bedtime is coming up. Dim the lights and put the day away.', trigger: { type: 'daily', ...at(r.bedtime.time) } });
  if (r.water.on) {
    const every = Math.max(1, Math.round(r.water.everyHours)) * 60;
    for (let m = hm(r.water.from); m <= hm(r.water.to); m += every)
      out.push({ id: `water-${m}`, title: 'Water break', body: 'A glass of water now keeps you on track for today.', trigger: { type: 'daily', hour: Math.floor(m / 60), minute: m % 60 } });
  }
  // expo-notifications weekly triggers use 1 = Sunday ... 7 = Saturday.
  if (r.review.on) out.push({ id: 'review', title: 'Weekly review', body: 'Look back at your week and choose one adjustment for the next.', trigger: { type: 'weekly', weekday: (r.review.weekday % 7) + 1, ...at(r.review.time) } });
  if (r.plan.on) {
    const upcoming = items
      .filter((i) => i.remind && !i.done && i.time)
      .map((i) => {
        const d = parseDay(i.date);
        d.setHours(0, hm(i.time!) - r.plan.minutesBefore, 0, 0);
        return { i, ts: d.getTime() };
      })
      .filter((x) => x.ts > now)
      .sort((a, b) => a.ts - b.ts);
    for (const { i, ts } of upcoming) {
      if (out.length >= MAX_PENDING) break;
      out.push({ id: `plan-${i.id}`, title: i.title, body: `Starts in ${r.plan.minutesBefore} minutes.`, trigger: { type: 'date', at: ts } });
    }
  }
  return out.slice(0, MAX_PENDING);
}
