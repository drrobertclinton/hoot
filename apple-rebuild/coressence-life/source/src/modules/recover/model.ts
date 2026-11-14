// Recover: how ready the body is today, from heart data, sleep and soreness, plus recovery habits.
import { clamp } from '@core/stats';

export type RecoveryAction = 'mobility' | 'easywalk' | 'nap' | 'massage' | 'heat' | 'cold' | 'rest' | 'breathing';
export type RecoveryLog = { date: string; soreness: number; actions: RecoveryAction[]; note?: string };
export type RecoverSlice = { logs: Record<string, RecoveryLog> };
export const KEY = 'recover';
export const EMPTY: RecoverSlice = { logs: {} };

export const ACTIONS: { key: RecoveryAction; label: string; icon: string }[] = [
  { key: 'mobility', label: 'Mobility or foam roll', icon: 'refresh-cw' },
  { key: 'easywalk', label: 'Easy walk', icon: 'navigation' },
  { key: 'nap', label: 'Short nap', icon: 'moon' },
  { key: 'massage', label: 'Massage', icon: 'heart' },
  { key: 'heat', label: 'Sauna or warm bath', icon: 'thermometer' },
  { key: 'cold', label: 'Cool shower or cold water', icon: 'droplet' },
  { key: 'rest', label: 'Planned rest day', icon: 'pause-circle' },
  { key: 'breathing', label: 'Slow breathing', icon: 'wind' },
];

export type ReadinessInput = {
  hrv?: number | null;
  hrvBase?: number | null;
  rhr?: number | null;
  rhrBase?: number | null;
  sleep?: number | null; // sleep ring 0..1
  soreness?: number | null; // 0..10
  /** Overnight temperature change from the device baseline, °C. */
  tempDev?: number | null;
};

/**
 * Readiness 0..1, a simple and transparent blend: start at 70, then
 * HRV above your 14-day average adds (below subtracts) up to 15 points,
 * resting heart rate above your average subtracts 2.5 points per beat (up to 15),
 * sleep adds or subtracts up to 15, soreness above 3 of 10 subtracts 3 points per step, and an overnight
 * temperature more than 0.3 °C away from the device's baseline subtracts up to 8.
 * Returns null when there is nothing to go on.
 */
export function readiness(i: ReadinessInput): { score: number | null; parts: { label: string; delta: number }[] } {
  const parts: { label: string; delta: number }[] = [];
  if (i.hrv && i.hrvBase) parts.push({ label: 'Heart rate variability', delta: clamp(((i.hrv - i.hrvBase) / i.hrvBase) * 100, -15, 15) });
  if (i.rhr && i.rhrBase) parts.push({ label: 'Resting heart rate', delta: clamp(-(i.rhr - i.rhrBase) * 2.5, -15, 15) });
  if (typeof i.sleep === 'number') parts.push({ label: 'Sleep', delta: clamp((i.sleep - 0.8) * 75, -15, 15) });
  if (typeof i.soreness === 'number') parts.push({ label: 'Soreness', delta: clamp(-(i.soreness - 3) * 3, -18, 6) });
  if (typeof i.tempDev === 'number' && Math.abs(i.tempDev) > 0.3) parts.push({ label: 'Temperature', delta: clamp(-(Math.abs(i.tempDev) - 0.3) * 20, -8, 0) });
  if (!parts.length) return { score: null, parts };
  const total = 70 + parts.reduce((a, p) => a + p.delta, 0);
  return { score: clamp(total) / 100, parts: parts.map((p) => ({ ...p, delta: Math.round(p.delta) })) };
}

export function readinessWords(score: number | null): string {
  if (score === null) return 'Log soreness or connect a device to see readiness.';
  if (score >= 0.8) return 'Ready for a full day. A good day for your harder session.';
  if (score >= 0.6) return 'Steady. Train as planned and keep an eye on how you feel.';
  if (score >= 0.45) return 'A little run down. Consider your minimum plan or an easier session.';
  return 'Low today. Favor rest, easy movement and an early night.';
}
