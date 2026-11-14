import { useSlice, updateSlice, getSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, mergePlanItems, planToItems, type PlanItem, type PlanSlice, type PlanVersion } from './model';

export const usePlan = () => useSlice<PlanSlice>(KEY, EMPTY);
export const getPlan = () => getSlice<PlanSlice>(KEY, EMPTY);
const up = (fn: (s: PlanSlice) => PlanSlice) => updateSlice<PlanSlice>(KEY, EMPTY, fn);

export function savePlanVersion(p: Omit<PlanVersion, 'id'>): PlanVersion {
  const v: PlanVersion = { ...p, id: uid('p-') };
  up((s) => ({ versions: [v, ...s.versions], items: mergePlanItems(s.items, planToItems(v, 4)) }));
  return v;
}
export function addItem(i: Omit<PlanItem, 'id' | 'done'>) {
  up((s) => ({ ...s, items: [...s.items, { ...i, id: uid('i-'), done: false }].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))) }));
}
export function toggleItem(id: string) {
  up((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) }));
}
export function deleteItem(id: string) {
  up((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
}
