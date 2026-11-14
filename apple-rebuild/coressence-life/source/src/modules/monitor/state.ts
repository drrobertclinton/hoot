import { updateSlice, useSlice } from '@core/store';
import { EMPTY, KEY, type MonitorSlice, type Targets } from './model';

export const useMonitor = () => useSlice<MonitorSlice>(KEY, EMPTY);
const up = (fn: (s: MonitorSlice) => MonitorSlice) => updateSlice<MonitorSlice>(KEY, EMPTY, fn);

export function saveTargets(patch: Partial<Targets>) {
  up((s) => ({ ...s, targets: { ...EMPTY.targets, ...s.targets, ...patch } }));
}
export function setCycleOn(on: boolean) {
  up((s) => ({ ...s, cycleOn: on }));
}
