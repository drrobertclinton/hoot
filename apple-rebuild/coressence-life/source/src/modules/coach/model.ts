// Coach: where you are in the course cycle, and the weekly review.
export type Phase = 'assess' | 'plan' | 'execute' | 'measure' | 'review' | 'adjust' | 'maintain';
export const PHASES: { key: Phase; label: string; text: string }[] = [
  { key: 'assess', label: 'Assess', text: 'Notice where you are now: a few days of check-ins and a small set of numbers.' },
  { key: 'plan', label: 'Plan', text: 'Choose one outcome, one action and the constraint you are working around.' },
  { key: 'execute', label: 'Do', text: 'Do the plan in an ordinary week. Use your minimum plan on hard days.' },
  { key: 'measure', label: 'Measure', text: 'Keep logging. A week of observations beats one good or bad day.' },
  { key: 'review', label: 'Review', text: 'Compare what you intended with what happened.' },
  { key: 'adjust', label: 'Adjust', text: 'Change one thing, write the decision rule, and set the next review date.' },
  { key: 'maintain', label: 'Keep what works', text: 'Keep what works with a lighter review rhythm, and restart the cycle when life changes.' },
];

export type WeeklyReview = {
  id: string;
  date: string;
  numbers: { label: string; value: string }[];
  wins: string;
  obstacles: string;
  adjustment: string;
  ruleIf: string;
  ruleThen: string;
  nextReview: string;
};
export type CoachSlice = { reviews: WeeklyReview[]; feedback?: import('./share').StoredFeedback[] };
export const KEY = 'coach';
export const EMPTY: CoachSlice = { reviews: [] };

export function cyclePhase(i: { hasData: boolean; planStart: string | null; lastReview: string | null; lastReviewAdjusted: boolean; planAfterReview: boolean; reviews: number; daysSince: (d: string) => number }): Phase {
  if (!i.planStart) return i.hasData ? 'plan' : 'assess';
  if (i.lastReview && i.lastReviewAdjusted && !i.planAfterReview && i.daysSince(i.lastReview) < 3) return 'adjust';
  const anchor = i.lastReview && i.lastReview > i.planStart ? i.lastReview : i.planStart;
  const since = i.daysSince(anchor);
  if (since >= 7) return 'review';
  if (i.reviews >= 3) return 'maintain';
  return since < 3 ? 'execute' : 'measure';
}
