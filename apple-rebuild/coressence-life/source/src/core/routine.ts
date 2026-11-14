// A guided routine: timed steps with a short cue each. Used by Move, Rehearse and Restore.
export type RoutineStep = { name: string; seconds: number; cue: string };
export type Routine = {
  id: string;
  module: 'move' | 'rehearse' | 'restore';
  title: string;
  kind: string;
  level: string;
  summary: string;
  premium?: boolean;
  steps: RoutineStep[];
  caution?: string;
};

export const routineMinutes = (r: Routine) => Math.max(1, Math.round(r.steps.reduce((a, s) => a + s.seconds, 0) / 60));

/** Where the player is after `elapsed` seconds. */
export function routinePosition(r: Routine, elapsed: number) {
  let t = elapsed;
  for (let i = 0; i < r.steps.length; i++) {
    if (t < r.steps[i].seconds) return { index: i, left: r.steps[i].seconds - t, done: false };
    t -= r.steps[i].seconds;
  }
  return { index: r.steps.length - 1, left: 0, done: true };
}
