// Labs: store and trend results you enter yourself, with plain-language reference notes. No diagnosis.
export type LabResult = { id: string; testId: string; date: string; value: number; low?: number; high?: number; note?: string };
export type LabsSlice = { results: LabResult[] };
export const KEY = 'labs';
export const EMPTY: LabsSlice = { results: [] };

export type LabTest = { id: string; name: string; short: string; unit: string; group: string; about: string; notes: string };

export function resultsFor(s: LabsSlice, testId: string) {
  return s.results.filter((r) => r.testId === testId).sort((a, b) => a.date.localeCompare(b.date));
}

/** Compare only with the range printed on the person's own lab report. */
export function rangeStatus(r: LabResult): 'below' | 'within' | 'above' | 'none' {
  if (r.low === undefined && r.high === undefined) return 'none';
  if (r.low !== undefined && r.value < r.low) return 'below';
  if (r.high !== undefined && r.value > r.high) return 'above';
  return 'within';
}

export function rangeWords(r: LabResult): string {
  const st = rangeStatus(r);
  if (st === 'none') return 'No lab range entered';
  if (st === 'within') return 'Within the range on your report';
  return `${st === 'above' ? 'Above' : 'Below'} the range on your report. Ask the clinician who ordered it what it means for you.`;
}

export function latestByTest(s: LabsSlice): Record<string, LabResult> {
  const out: Record<string, LabResult> = {};
  for (const r of s.results) if (!out[r.testId] || r.date > out[r.testId].date) out[r.testId] = r;
  return out;
}
