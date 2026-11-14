// "Why this number": the readiness score taken apart. Every input that moved it, by how many points, in plain
// words with the person's own figures, what was left out, and what changed since yesterday (pure).
import { round } from '@core/stats';
import { readiness, type ReadinessInput } from './model';

export type ExplainInput = ReadinessInput & { sleepHours?: number | null; sleepGoal?: number };
export type ExplainRow = { key: 'hrv' | 'rhr' | 'sleep' | 'soreness' | 'temp'; label: string; delta: number; value: string; against: string; text: string };
export type Explanation = {
  score: number | null;
  start: number;
  rows: ExplainRow[];
  missing: { label: string; how: string; route: string }[];
  biggest: ExplainRow | null;
  sentence: string;
  yesterday: { score: number | null; change: number | null; mover: string | null; text: string };
  /** Running total after each row, for the step chart. */
  steps: { label: string; from: number; to: number }[];
};

export const START = 70;
const KEYS: Record<string, ExplainRow['key']> = { 'Heart rate variability': 'hrv', 'Resting heart rate': 'rhr', Sleep: 'sleep', Soreness: 'soreness', Temperature: 'temp' };
const pts = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} point${Math.abs(n) === 1 ? '' : 's'}`;

function describe(key: ExplainRow['key'], i: ExplainInput, delta: number): Pick<ExplainRow, 'value' | 'against' | 'text'> {
  const dir = delta > 0 ? 'lifted' : delta < 0 ? 'lowered' : 'did not move';
  switch (key) {
    case 'hrv': {
      const pct = Math.round(((i.hrv! - i.hrvBase!) / i.hrvBase!) * 100);
      return { value: `${Math.round(i.hrv!)} ms`, against: `your 14-day average ${Math.round(i.hrvBase!)} ms`, text: `${Math.abs(pct)}% ${pct >= 0 ? 'above' : 'below'} your own average, which ${dir} the score. Each 1% counts one point, up to 15.` };
    }
    case 'rhr': {
      const d = round(i.rhr! - i.rhrBase!, 1);
      return { value: `${Math.round(i.rhr!)} bpm`, against: `your 14-day average ${Math.round(i.rhrBase!)} bpm`, text: `${Math.abs(d)} beat${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'above' : d < 0 ? 'below' : 'from'} your average. Each beat counts 2.5 points, up to 15.` };
    }
    case 'sleep': {
      const h = typeof i.sleepHours === 'number' ? `${round(i.sleepHours, 1)} h` : `${Math.round((i.sleep ?? 0) * 100)}% of goal`;
      return { value: h, against: i.sleepGoal ? `your ${i.sleepGoal} h goal` : 'your sleep goal', text: `Last night scored ${Math.round((i.sleep ?? 0) * 100)} of 100 for time asleep and how rested you felt. 80 is neutral; every point either side counts three quarters of a point, up to 15.` };
    }
    case 'soreness':
      return { value: `${round(i.soreness ?? 0, 1)} of 10`, against: 'neutral at 3', text: `Each step above 3 takes 3 points (up to 18); below 3 gives a little back (up to 6).` };
    default:
      return { value: `${(i.tempDev ?? 0) > 0 ? '+' : ''}${round(i.tempDev ?? 0, 1)} °C`, against: 'your device baseline', text: 'More than 0.3 °C from your overnight baseline takes up to 8 points. It can follow illness, alcohol or a late hard session.' };
  }
}

export function explainReadiness(today: ExplainInput, prev?: ExplainInput | null): Explanation {
  const r = readiness(today);
  const rows: ExplainRow[] = r.parts.map((p) => {
    const key = KEYS[p.label];
    return { key, label: p.label, delta: p.delta, ...describe(key, today, p.delta) };
  });
  const missing: Explanation['missing'] = [];
  if (!(today.hrv && today.hrvBase)) missing.push({ label: 'Heart rate variability', how: 'Needs a watch or ring that reports it, and a few days for your average.', route: '/devices' });
  if (!(today.rhr && today.rhrBase)) missing.push({ label: 'Resting heart rate', how: 'Comes from a watch or ring, or enter it by hand in Measure.', route: '/measure' });
  if (typeof today.sleep !== 'number') missing.push({ label: 'Sleep', how: 'Log last night in Sleep, or let your watch report it.', route: '/sleep' });
  if (typeof today.soreness !== 'number') missing.push({ label: 'Soreness', how: 'Log it in Recover or do the daily check-in.', route: '/checkin' });

  const biggest = rows.length ? [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] : null;
  const score = r.score === null ? null : Math.round(r.score * 100);
  let run = START;
  const steps = rows.map((x) => ({ label: x.label, from: run, to: (run += x.delta) }));

  const p = prev ? readiness(prev) : null;
  const prevScore = p && p.score !== null ? Math.round(p.score * 100) : null;
  const change = score !== null && prevScore !== null ? score - prevScore : null;
  let mover: string | null = null;
  if (p && change !== null) {
    let top = 0;
    for (const label of new Set([...r.parts, ...p.parts].map((x) => x.label))) {
      const d = (r.parts.find((x) => x.label === label)?.delta ?? 0) - (p.parts.find((x) => x.label === label)?.delta ?? 0);
      if (Math.abs(d) > Math.abs(top)) {
        top = d;
        mover = label;
      }
    }
  }
  const yText = change === null ? 'No score yesterday to compare with.' : change === 0 ? `The same as yesterday (${prevScore}).` : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)} from yesterday’s ${prevScore}${mover ? `, mostly ${mover.toLowerCase()}` : ''}.`;

  const sentence =
    score === null
      ? 'There is nothing to score yet. Log soreness, last night’s sleep, or connect a device.'
      : !biggest || biggest.delta === 0
        ? `Readiness starts at ${START} and nothing moved it far today.`
        : `Readiness starts at ${START}. ${biggest.label} moved it most today: ${pts(biggest.delta)}.`;
  return { score, start: START, rows, missing, biggest, sentence, yesterday: { score: prevScore, change, mover, text: yText }, steps };
}

export const pointsWords = pts;
