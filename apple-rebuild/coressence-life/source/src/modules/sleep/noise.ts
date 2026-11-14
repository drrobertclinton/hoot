// Sleep sound check: loudness analysis that runs on the phone (pure; unit-tested).
//
// The phone samples microphone loudness (dBFS) about once a second. No audio is stored. This file finds
// loud moments by simple thresholding over the room's own quiet level, groups them, and writes a plain-language
// summary. It is not a medical test and does not diagnose anything.
import { median, percentile } from '@core/stats';

export type SoundKind = 'rhythmic' | 'sustained' | 'brief' | 'pause-loud';
export type SoundEvent = { start: number; end: number; peak: number; kind: SoundKind };
export type NightSummary = {
  minutes: number;
  baselineDb: number;
  thresholdDb: number;
  rhythmicMinutes: number;
  rhythmicPct: number;
  pauseLoud: number;
  brief: number;
  sustained: number;
  /** "quiet" | "some" | "frequent" rhythmic sound, used for the weekly pattern check. */
  level: 'quiet' | 'some' | 'frequent';
};

export const OPTS = {
  /** dB above the room's quiet level that counts as loud. */
  aboveBaseline: 15,
  /** Never treat anything quieter than this as loud (very quiet rooms). */
  minLoudDb: -50,
  /** Join loud samples only when they touch (one reading a second). */
  joinGapMs: 500,
  /** Rhythmic: at least this many events in a row, each starting 2–8 s after the last. */
  rhythmMin: 6,
  rhythmSpacing: [2000, 8000] as [number, number],
  /** Sustained: one loud stretch longer than this (talking, TV, traffic). */
  sustainedMs: 12000,
  /** Pause-then-loud: 10–60 s of quiet inside rhythmic sound, then a sound this much louder than usual. */
  pauseMs: [10000, 60000] as [number, number],
  pauseLouderDb: 6,
  bucketMs: 30000,
};

/** samples: dBFS values taken every `stepMs` starting at `start`. */
export function analyzeNight(samples: number[], start: number, stepMs = 1000) {
  const clean = samples.map((v) => (Number.isFinite(v) ? Math.max(-160, Math.min(0, v)) : -160));
  const end = start + clean.length * stepMs;
  const baselineDb = percentile(clean, 20) ?? -160;
  const thresholdDb = Math.max(baselineDb + OPTS.aboveBaseline, OPTS.minLoudDb);

  // 1) loud runs
  const runs: { start: number; end: number; peak: number }[] = [];
  let cur: { start: number; end: number; peak: number } | null = null;
  clean.forEach((v, i) => {
    const t = start + i * stepMs;
    if (v >= thresholdDb) {
      if (cur && t - cur.end <= OPTS.joinGapMs) {
        cur.end = t + stepMs;
        cur.peak = Math.max(cur.peak, v);
      } else {
        if (cur) runs.push(cur);
        cur = { start: t, end: t + stepMs, peak: v };
      }
    }
  });
  if (cur) runs.push(cur);

  // 2) classify
  const events: SoundEvent[] = runs.map((r) => ({ ...r, kind: r.end - r.start >= OPTS.sustainedMs ? 'sustained' : 'brief' }));
  const [lo, hi] = OPTS.rhythmSpacing;
  let i = 0;
  while (i < events.length) {
    let j = i;
    while (j + 1 < events.length && events[j + 1].kind === 'brief' && events[j].kind === 'brief' && events[j + 1].start - events[j].start >= lo && events[j + 1].start - events[j].start <= hi) j++;
    if (j - i + 1 >= OPTS.rhythmMin) for (let k = i; k <= j; k++) events[k].kind = 'rhythmic';
    i = j + 1;
  }

  // 3) pause-then-loud: quiet gap inside rhythmic sound, then a louder-than-usual sound
  const rhythmicPeaks = events.filter((e) => e.kind === 'rhythmic').map((e) => e.peak);
  const usual = median(rhythmicPeaks) ?? thresholdDb;
  for (let k = 1; k < events.length; k++) {
    const prev = events[k - 1];
    const e = events[k];
    const gap = e.start - prev.end;
    if (prev.kind === 'rhythmic' && gap >= OPTS.pauseMs[0] && gap <= OPTS.pauseMs[1] && e.peak >= usual + OPTS.pauseLouderDb) e.kind = 'pause-loud';
  }

  // 4) summary
  const minutes = Math.round(((end - start) / 60000) * 10) / 10;
  let rhythmicMs = 0;
  for (let k = 0; k < events.length; k++) {
    if (events[k].kind !== 'rhythmic') continue;
    const next = events[k + 1];
    // count the span between successive rhythmic sounds as part of the rhythmic stretch
    rhythmicMs += next && next.kind === 'rhythmic' && next.start - events[k].start <= hi ? next.start - events[k].start : events[k].end - events[k].start;
  }
  const rhythmicMinutes = Math.round((rhythmicMs / 60000) * 10) / 10;
  const rhythmicPct = minutes > 0 ? Math.round((rhythmicMinutes / minutes) * 1000) / 10 : 0;
  const pauseLoud = events.filter((e) => e.kind === 'pause-loud').length;
  const summary: NightSummary = {
    minutes,
    baselineDb: Math.round(baselineDb),
    thresholdDb: Math.round(thresholdDb),
    rhythmicMinutes,
    rhythmicPct,
    pauseLoud,
    brief: events.filter((e) => e.kind === 'brief').length,
    sustained: events.filter((e) => e.kind === 'sustained').length,
    level: rhythmicPct >= 20 || pauseLoud >= 5 ? 'frequent' : rhythmicPct >= 5 ? 'some' : 'quiet',
  };

  // 5) 30-second buckets for the timeline
  const per = Math.max(1, Math.round(OPTS.bucketMs / stepMs));
  const buckets: { t: number; max: number }[] = [];
  for (let b = 0; b < clean.length; b += per) buckets.push({ t: start + b * stepMs, max: Math.max(...clean.slice(b, b + per)) });

  return { start, end, events, summary, buckets };
}

export function interpret(s: NightSummary): string[] {
  const out: string[] = [];
  if (s.minutes < 60) out.push('This was a short recording, so treat it as a quick check rather than a full night.');
  if (s.level === 'quiet') out.push('Very little rhythmic, snoring-like sound was picked up.');
  else
    out.push(
      `Rhythmic, snoring-like sound was picked up for about ${Math.round(s.rhythmicMinutes)} minutes (${s.rhythmicPct}% of the recording)${s.rhythmicPct >= 20 ? ', which is a large part of the night' : ''}.`,
    );
  if (s.pauseLoud > 0)
    out.push(
      `${s.pauseLoud} time${s.pauseLoud === 1 ? '' : 's'}, the rhythmic sound stopped for 10 seconds or more and came back noticeably louder. That pattern has many possible causes, including turning over.`,
    );
  if (s.brief > 0) out.push(`${s.brief} short sound${s.brief === 1 ? '' : 's'}, such as movement, a cough or a noise in the room.`);
  if (s.sustained > 0) out.push(`${s.sustained} longer stretch${s.sustained === 1 ? '' : 'es'} of sound, such as talking, a TV or traffic.`);
  out.push('A phone microphone also hears partners, pets, fans and street noise. This is a sound check, not a sleep test.');
  return out;
}

/** Suggest talking to a clinician when loud rhythmic sound or pause-then-loud moments show up on most recent nights. */
export function patternAdvice(nights: { summary: NightSummary }[]): string | null {
  const recent = nights.slice(0, 7);
  const frequent = recent.filter((n) => n.summary.level === 'frequent').length;
  if (recent.length >= 3 && frequent >= 3)
    return `Loud, snoring-like sound showed up on ${frequent} of your last ${recent.length} recorded nights. Regular loud snoring, especially with gasping, choking, pauses someone else notices, or daytime sleepiness, is worth raising with a clinician. Only a sleep study can show what is happening.`;
  return null;
}
