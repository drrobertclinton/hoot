// Live heart rate from a Bluetooth strap on iPhone and Android, through react-native-ble-plx (needs a development
// or store build, not Expo Go). The web build uses ble.web.ts, a simulated strap.
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State, type Device, type Subscription } from 'react-native-ble-plx';
import { HR_MEASUREMENT, HR_SERVICE, base64ToBytes, parseHeartRate, type HrReading } from './gatt';

export type HrDevice = { id: string; name: string; rssi?: number | null };
export const SIMULATED = false;

let manager: BleManager | null = null;
const mgr = () => (manager ||= new BleManager());

async function permissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Number(Platform.Version) >= 31) {
    const r = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
    return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }
  // Android 11 and older need location permission to scan, which Coressence does not request.
  return false;
}

export async function bluetoothReady(): Promise<{ ok: boolean; message?: string }> {
  try {
    if (!(await permissions())) return { ok: false, message: Platform.OS === 'android' && Number(Platform.Version) < 31 ? 'Live heart rate straps need Android 12 or newer.' : 'Allow Bluetooth for Coressence Life in your phone settings.' };
    const st = await mgr().state();
    if (st === State.PoweredOn) return { ok: true };
    if (st === State.Unauthorized) return { ok: false, message: 'Allow Bluetooth for Coressence Life in your phone settings.' };
    if (st === State.Unsupported) return { ok: false, message: 'This phone does not support Bluetooth Low Energy.' };
    return { ok: false, message: 'Turn on Bluetooth to find your strap.' };
  } catch {
    return { ok: false, message: 'Bluetooth is not available right now.' };
  }
}

/** Find straps that advertise the Heart Rate Service. Returns a stop function. */
export function scan(onDevice: (d: HrDevice) => void): () => void {
  const seen = new Set<string>();
  mgr().startDeviceScan([HR_SERVICE], { allowDuplicates: false }, (err, d) => {
    if (err || !d || seen.has(d.id)) return;
    seen.add(d.id);
    onDevice({ id: d.id, name: d.name || d.localName || 'Heart rate strap', rssi: d.rssi });
  });
  return () => {
    mgr().stopDeviceScan();
  };
}

/** Connect and stream readings. Returns a stop function that disconnects. */
export async function stream(id: string, onReading: (r: HrReading) => void, onEnd: () => void): Promise<() => void> {
  mgr().stopDeviceScan();
  const d: Device = await mgr().connectToDevice(id, { autoConnect: false });
  await d.discoverAllServicesAndCharacteristics();
  const sub: Subscription = d.monitorCharacteristicForService(HR_SERVICE, HR_MEASUREMENT, (err, ch) => {
    if (err || !ch?.value) return;
    const r = parseHeartRate(base64ToBytes(ch.value));
    if (r) onReading(r);
  });
  const dis = mgr().onDeviceDisconnected(id, () => onEnd());
  return () => {
    sub.remove();
    dis.remove();
    mgr().cancelDeviceConnection(id).catch(() => undefined);
  };
}
