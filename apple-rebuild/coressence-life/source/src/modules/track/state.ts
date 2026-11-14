// Track state: reading and writing this module's slice on the device.
import { useSlice, updateSlice } from '@core/store';
import { dayKey } from '@core/dates';
import { uid } from '@core/id';
import { EMPTY, KEY, type Checkin, type TrackSlice } from './model';

export const useTrack = () => useSlice<TrackSlice>(KEY, EMPTY);
const up = (fn: (s: TrackSlice) => TrackSlice) => updateSlice<TrackSlice>(KEY, EMPTY, fn);

export function saveCheckin(c: Checkin) {
  up((s) => ({ ...s, checkins: { ...s.checkins, [c.date]: c } }));
}
export function toggleHabit(id: string, date = dayKey()) {
  up((s) => {
    const cur = s.done[date] || [];
    return { ...s, done: { ...s.done, [date]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
  });
}
export function addHabit(name: string, icon = 'check-circle') {
  up((s) => ({ ...s, habits: [...s.habits, { id: uid('h-'), name, icon }] }));
}
export function archiveHabit(id: string) {
  up((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)) }));
}

