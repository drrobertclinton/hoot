// One hook that gathers every module's slice for the hub screens.
import { useTrack } from '../track/state';
import { useMeasure } from '../measure/state';
import { useMove } from '../move/state';
import { useFuel } from '../fuel/state';
import { useSleep } from '../sleep/state';
import { useRecover } from '../recover/state';
import { useRestore } from '../restore/state';
import { useRehearse } from '../rehearse/state';
import { usePlan } from '../plan/state';
import { useCoach } from '../coach/state';
import type { Slices } from './today';

export function useSlices(): Slices {
  return {
    track: useTrack(),
    measure: useMeasure(),
    move: useMove(),
    fuel: useFuel(),
    sleep: useSleep(),
    recover: useRecover(),
    restore: useRestore(),
    rehearse: useRehearse(),
    plan: usePlan(),
    coach: useCoach(),
  };
}
