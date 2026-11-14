// Fuel: meals (by pattern, not calorie counting), hydration and eating windows.
import { dayKey, lastDays } from '@core/dates';
import { streak, sum } from '@core/stats';
import { portionNutrients, type FoodItem, type Nutrients, type Portion } from './off';

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealTag = 'protein' | 'plants' | 'wholegrain' | 'processed' | 'late';
/** A specific food or product logged with a meal (the optional "add specific food" path). Nutrients are estimates
 * from Open Food Facts for the portion eaten. */
export type MealFood = {
  source: 'openfoodfacts';
  code: string;
  name: string;
  brand: string | null;
  servingText: string | null;
  servingG: number | null;
  per100: Nutrients;
  portion: Portion;
  grams: number | null;
  nutrients: Nutrients;
};
export type Meal = { id: string; date: string; time: string; kind: MealKind; tags: MealTag[]; note?: string; food?: MealFood };
export type Fast = { id: string; start: number; end: number | null };
export type FuelSlice = { meals: Meal[]; water: Record<string, number>; fasts: Fast[] };
export const KEY = 'fuel';
export const EMPTY: FuelSlice = { meals: [], water: {}, fasts: [] };

export const MEAL_KINDS: { key: MealKind; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];
export const TAGS: { key: MealTag; label: string; good: boolean }[] = [
  { key: 'protein', label: 'Protein', good: true },
  { key: 'plants', label: 'Vegetables or fruit', good: true },
  { key: 'wholegrain', label: 'Whole grains or beans', good: true },
  { key: 'processed', label: 'Mostly packaged', good: false },
  { key: 'late', label: 'Late night', good: false },
];

export const GLASS_ML = 250;

export function mealPoints(m: Meal): number {
  let p = 0;
  if (m.tags.includes('protein')) p += 2;
  if (m.tags.includes('plants')) p += 2;
  if (m.tags.includes('wholegrain')) p += 1;
  if (m.tags.includes('processed')) p -= 1;
  return Math.max(0, p);
}

/** Fuel ring 0..1: half hydration, half meal pattern (three balanced meals = full). */
export function fuelScore(s: FuelSlice, date: string, waterGoal: number): number | null {
  const meals = s.meals.filter((m) => m.date === date);
  const water = s.water[date] || 0;
  if (!meals.length && !water) return null;
  const hyd = Math.min(1, water / Math.max(1, waterGoal));
  const pattern = Math.min(1, sum(meals.map(mealPoints)) / 13);
  return hyd * 0.5 + pattern * 0.5;
}

export function waterSeries(s: FuelSlice, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => ({ date: d, value: s.water[d] || 0 }));
}

export function hydrationStreak(s: FuelSlice, goal: number, today = dayKey()) {
  return streak(Object.entries(s.water).filter(([, v]) => v >= goal).map(([d]) => d), today);
}

/** Eating-window tracking: how long since the last meal, and past fasts in hours. */
export function fastHours(f: Fast, now = Date.now()) {
  return ((f.end ?? now) - f.start) / 3_600_000;
}

export function activeFast(s: FuelSlice): Fast | null {
  return s.fasts.find((f) => f.end === null) ?? null;
}

export function fastSeries(s: FuelSlice, days: number, end = dayKey()) {
  return lastDays(days, end).map((d) => {
    const f = s.fasts.filter((x) => x.end !== null && dayKey(x.end) === d);
    return { date: d, value: f.length ? Math.max(...f.map((x) => fastHours(x))) : null };
  });
}

/** Build the food record stored with a meal, with nutrients worked out for the portion. */
export function mealFood(item: FoodItem, portion: Portion): MealFood {
  const { grams, nutrients } = portionNutrients(item, portion);
  return { source: 'openfoodfacts', code: item.code, name: item.name, brand: item.brand, servingText: item.servingText, servingG: item.servingG, per100: item.per100, portion, grams, nutrients };
}

/** Change the portion of a logged food; nutrients follow. */
export function withPortion(f: MealFood, portion: Portion): MealFood {
  const { grams, nutrients } = portionNutrients(f, portion);
  return { ...f, portion, grams, nutrients };
}

export const portionWords = (f: Pick<MealFood, 'portion' | 'grams' | 'servingText'>) =>
  f.portion.mode === 'servings'
    ? `${f.portion.amount} serving${f.portion.amount === 1 ? '' : 's'}${f.servingText ? ` of ${f.servingText}` : ''}${f.grams !== null ? ` (${f.grams} g)` : ''}`
    : `${f.portion.amount} g`;
