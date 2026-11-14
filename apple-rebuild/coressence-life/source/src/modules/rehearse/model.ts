// Rehearse / Perform: warmups and a voice health log for singers, actors and speakers.
import { dayKey, lastDays } from '@core/dates';
import { mean, streak } from '@core/stats';

export type VoiceLog = { date: string; voiceHours: number; hoarseness: number; warmedUp: boolean; restMinutes: number; note?: string };
export type RehearseSlice = { voice: Record<string, VoiceLog> };
export const KEY = 'rehearse';
export const EMPTY: RehearseSlice = { voice: {} };

export function voiceSeries(s: RehearseSlice, key: 'voiceHours' | 'hoarseness', days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: s.voice[d] ? s.voice[d][key] : null }));
}

export function warmupStreak(s: RehearseSlice, today = dayKey()) {
  return streak(Object.values(s.voice).filter((v) => v.warmedUp).map((v) => v.date), today);
}

/** Days in a row (ending today) with hoarseness of 2 or more on a 0–5 scale. */
export function hoarseRun(s: RehearseSlice, today = dayKey()) {
  return streak(Object.values(s.voice).filter((v) => v.hoarseness >= 2).map((v) => v.date), today);
}

export function voiceAdvice(s: RehearseSlice, today = dayKey()): { tone: 'info' | 'warn'; text: string } {
  const run = hoarseRun(s, today);
  const load = mean(voiceSeries(s, 'voiceHours', 7, today).map((x) => x.value));
  if (run >= 14)
    return { tone: 'warn', text: `You have logged hoarseness for ${run} days in a row. Hoarseness that lasts more than a few weeks, or sooner when your voice is your work, is a reason to see a clinician, ideally an ENT or laryngologist. Seek care promptly for pain, trouble swallowing or breathing, or coughing up blood.` };
  if (run >= 3) return { tone: 'warn', text: `Hoarseness for ${run} days in a row. Lighten your voice load where you can, keep hydrated and build in vocal rest. If it continues, check in with a clinician.` };
  if (load !== null && load >= 5) return { tone: 'info', text: `Heavy voice week: about ${load.toFixed(1)} hours of voice use a day. Plan short rests between sessions and a lighter day soon.` };
  return { tone: 'info', text: 'Warm up before heavy voice use, take short breaks, and notice changes early.' };
}
