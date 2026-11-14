import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { dayKey } from '@core/dates';
import { EMPTY, KEY, type Night, type SleepLog, type SleepSlice } from './model';
import { analyzeNight } from './noise';

export const useSleep = () => useSlice<SleepSlice>(KEY, EMPTY);
const up = (fn: (s: SleepSlice) => SleepSlice) => updateSlice<SleepSlice>(KEY, EMPTY, fn);

export function saveSleepLog(l: SleepLog) {
  up((s) => ({ ...s, logs: { ...s.logs, [l.date]: l } }));
}

export function saveNight(samples: number[], start: number, stepMs = 1000): Night {
  const a = analyzeNight(samples, start, stepMs);
  const night: Night = { id: uid('n-'), date: dayKey(a.end), ...a };
  up((s) => ({ ...s, nights: [night, ...s.nights] }));
  return night;
}

export function deleteNight(id: string) {
  up((s) => ({ ...s, nights: s.nights.filter((n) => n.id !== id) }));
}
