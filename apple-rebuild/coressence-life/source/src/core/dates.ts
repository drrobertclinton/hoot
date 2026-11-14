// Local-date helpers. A "day key" is the local calendar date as YYYY-MM-DD.

export const DAY = 86_400_000;

export function dayKey(d: Date | number = Date.now()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** The last n day keys ending with `end` (oldest first). */
export function lastDays(n: number, end: string = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY);
}

/** Monday-start week containing the day. */
export function weekStart(key: string): string {
  const d = parseDay(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayShort = (key: string) => DOW[parseDay(key).getDay()];
export const weekdayLong = (key: string) => DOW_LONG[parseDay(key).getDay()];
export const weekdayName = (i: number) => DOW_LONG[i];
export const shortDate = (key: string) => {
  const d = parseDay(key);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
};
export const longDate = (key: string) => `${weekdayLong(key)}, ${shortDate(key)}`;

/** "07:30" -> minutes after midnight. */
export function hm(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function fmtHm(mins: number): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
/** "07:30" -> "7:30 AM" */
export function clock(t: string): string {
  const m = hm(t);
  const h = Math.floor(m / 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${ap}`;
}
export function clockOf(ts: number): string {
  const d = new Date(ts);
  return clock(`${d.getHours()}:${d.getMinutes()}`);
}

/** Hours between a bedtime and a wake time ("23:15" -> "06:45" = 7.5). */
export function sleepHours(bed: string, wake: string): number {
  let d = hm(wake) - hm(bed);
  if (d <= 0) d += 1440;
  return Math.round((d / 60) * 100) / 100;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function durationWords(mins: number): string {
  const m = Math.round(mins);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
}
