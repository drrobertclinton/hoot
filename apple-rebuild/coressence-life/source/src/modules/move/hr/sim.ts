// A simulated strap with the same interface as ble.ts, for the web preview and the investor demo.
import { simulatedBpm, type HrReading } from './gatt';

export type HrDevice = { id: string; name: string; rssi?: number | null };

export async function bluetoothReady(): Promise<{ ok: boolean; message?: string }> {
  return { ok: true, message: 'Simulated strap for the web preview. On a phone, Coressence pairs with any standard Bluetooth heart rate strap.' };
}

export function scan(onDevice: (d: HrDevice) => void): () => void {
  const t = setTimeout(() => onDevice({ id: 'sim-h10', name: 'Polar H10 (simulated)', rssi: -52 }), 700);
  const t2 = setTimeout(() => onDevice({ id: 'sim-hrm', name: 'Garmin HRM-Pro (simulated)', rssi: -68 }), 1300);
  return () => {
    clearTimeout(t);
    clearTimeout(t2);
  };
}

export async function stream(id: string, onReading: (r: HrReading) => void, _onEnd: () => void): Promise<() => void> {
  const started = Date.now();
  const seed = id === 'sim-hrm' ? 3 : 1;
  const iv = setInterval(() => {
    const sec = (Date.now() - started) / 1000 + 900; // start partway into a session so zones show quickly
    const bpm = simulatedBpm(sec, seed);
    onReading({ t: Date.now(), bpm, rr: [Math.round(60000 / bpm)], contact: true });
  }, 1000);
  return () => clearInterval(iv);
}
