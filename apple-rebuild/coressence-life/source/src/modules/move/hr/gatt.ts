// Standard Bluetooth Heart Rate Service (GATT 0x180D), Heart Rate Measurement characteristic 0x2A37 (pure;
// unit-tested). Polar H10 and Verity Sense, Garmin HRM straps, Wahoo TICKR and most chest and arm straps use it.
export const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
export const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export type HrReading = { t: number; bpm: number; rr: number[]; contact: boolean | null; energyKj?: number };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : -1));
    out.push((n[0] << 2) | (n[1] >> 4));
    if (n[2] >= 0) out.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (n[3] >= 0) out.push(((n[2] & 3) << 6) | n[3]);
  }
  return Uint8Array.from(out);
}

/**
 * Flags (byte 0): bit 0 heart rate is 16-bit; bits 1–2 sensor contact (bit 2 = supported, bit 1 = detected);
 * bit 3 energy expended present (16-bit, kJ); bit 4 RR intervals present (16-bit each, 1/1024 s).
 */
export function parseHeartRate(bytes: Uint8Array, t = Date.now()): HrReading | null {
  if (bytes.length < 2) return null;
  const flags = bytes[0];
  let i = 1;
  const u16 = () => {
    const v = bytes[i] | (bytes[i + 1] << 8);
    i += 2;
    return v;
  };
  let bpm: number;
  if (flags & 1) {
    if (bytes.length < 3) return null;
    bpm = u16();
  } else bpm = bytes[i++];
  const contact = flags & 4 ? !!(flags & 2) : null;
  let energyKj: number | undefined;
  if (flags & 8 && i + 1 < bytes.length) energyKj = u16();
  const rr: number[] = [];
  if (flags & 16) while (i + 1 < bytes.length) rr.push(Math.round((u16() / 1024) * 1000));
  return { t, bpm, rr, contact, ...(energyKj !== undefined ? { energyKj } : {}) };
}

/** A believable simulated workout heart rate for the web preview and investor demo: warm-up, efforts, cool-down. */
export function simulatedBpm(elapsedSec: number, seed = 1): number {
  const warm = Math.min(1, elapsedSec / 240);
  const cycle = Math.sin(elapsedSec / 70 + seed) * 12 + Math.sin(elapsedSec / 9 + seed * 2) * 2.5;
  const effort = elapsedSec % 600 > 420 ? 18 : 0;
  return Math.round(72 + warm * 58 + (warm > 0.9 ? cycle + effort : cycle * warm * 0.3));
}
