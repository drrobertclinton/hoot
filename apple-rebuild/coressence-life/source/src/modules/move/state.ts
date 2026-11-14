import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, type MoveSlice, type Workout } from './model';

export const useMove = () => useSlice<MoveSlice>(KEY, EMPTY);
const up = (fn: (s: MoveSlice) => MoveSlice) => updateSlice<MoveSlice>(KEY, EMPTY, fn);

export function logWorkout(w: Omit<Workout, 'id'>) {
  up((s) => ({ ...s, workouts: [{ ...w, id: uid('w-') }, ...s.workouts] }));
}
export function deleteWorkout(id: string) {
  up((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
}
