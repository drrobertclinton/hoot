import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, withPortion, type FuelSlice, type Meal } from './model';
import type { Portion } from './off';

export const useFuel = () => useSlice<FuelSlice>(KEY, EMPTY);
const up = (fn: (s: FuelSlice) => FuelSlice) => updateSlice<FuelSlice>(KEY, EMPTY, fn);

export function addWater(date: string, ml: number) {
  up((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, (s.water[date] || 0) + ml) } }));
}
export function logMeal(m: Omit<Meal, 'id'>) {
  up((s) => ({ ...s, meals: [{ ...m, id: uid('m-') }, ...s.meals] }));
}
export function deleteMeal(id: string) {
  up((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
}
export function startFast(at = Date.now()) {
  up((s) => (s.fasts.some((f) => f.end === null) ? s : { ...s, fasts: [{ id: uid('f-'), start: at, end: null }, ...s.fasts] }));
}
export function endFast(at = Date.now()) {
  up((s) => ({ ...s, fasts: s.fasts.map((f) => (f.end === null ? { ...f, end: at } : f)) }));
}
export function setMealPortion(id: string, portion: Portion) {
  up((s) => ({ ...s, meals: s.meals.map((m) => (m.id === id && m.food ? { ...m, food: withPortion(m.food, portion) } : m)) }));
}
