import { dayKey } from '@core/dates';
import { useSlice, updateSlice } from '@core/store';
import { EMPTY as VOICE_EMPTY, KEY as VOICE_KEY, type RehearseSlice } from '../rehearse/model';
import { EMPTY, KEY, toggleCheck, type PerformerSlice } from './model';

export const usePerformer = () => useSlice<PerformerSlice>(KEY, EMPTY);
export const tick = (date: string, id: string) => updateSlice<PerformerSlice>(KEY, EMPTY, (s) => toggleCheck({ ...EMPTY, ...s }, date, id));
export function saveShowNote(date: string, note: { success: string; issue: string; question: string }) {
  updateSlice<PerformerSlice>(KEY, EMPTY, (s) => ({ ...EMPTY, ...s, notes: { ...(s.notes ?? {}), [date]: note } }));
}
/** Add voice use to today's voice log (the same log Rehearse keeps). Negative hours take time back off. */
export function addVoiceUse(hours: number, date = dayKey()) {
  updateSlice<RehearseSlice>(VOICE_KEY, VOICE_EMPTY, (s) => {
    const cur = s.voice[date] ?? { date, voiceHours: 0, hoarseness: 0, warmedUp: false, restMinutes: 0 };
    return { ...s, voice: { ...s.voice, [date]: { ...cur, voiceHours: Math.max(0, Math.round((cur.voiceHours + hours) * 4) / 4) } } };
  });
}
