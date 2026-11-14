import { dayKey } from '@core/dates';
import { uid } from '@core/id';
import { getSlice, useSlice, updateSlice } from '@core/store';
import { addHabit } from '../track/state';
import { EMPTY, KEY, closeExperiment, newExperiment, type Evaluation, type ExperimentMetric, type ExperimentSlice, type Template, type VerdictKey } from './model';

export const useExperiment = () => useSlice<ExperimentSlice>(KEY, EMPTY);
const up = (fn: (s: ExperimentSlice) => ExperimentSlice) => updateSlice<ExperimentSlice>(KEY, EMPTY, fn);

export function startExperiment(i: { template?: Template; title?: string; how?: string; metric?: ExperimentMetric }) {
  up((s) => ({ ...s, current: newExperiment({ id: uid('x-'), ...i }) }));
}
export function toggleDone(date = dayKey()) {
  up((s) => (s.current ? { ...s, current: { ...s.current, done: { ...s.current.done, [date]: !s.current.done[date] } } } : s));
}
export function cancelExperiment() {
  up((s) => ({ ...s, current: null }));
}
/** Close with the person's decision. "Keep" also adds the change to Track as a habit; "adjust" starts another week. */
export function decide(decision: VerdictKey, ev: Evaluation) {
  const cur = getSlice<ExperimentSlice>(KEY, EMPTY).current;
  if (!cur) return;
  up((s) => closeExperiment(s, decision, ev));
  if (decision === 'keep') addHabit(cur.title, 'check-circle');
  if (decision === 'adjust') up((s) => ({ ...s, current: newExperiment({ id: uid('x-'), title: cur.title, how: cur.how, metric: cur.metric, template: undefined }) }));
}
