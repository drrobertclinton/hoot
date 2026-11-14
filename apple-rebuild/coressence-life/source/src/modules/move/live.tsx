// Move: live heart rate and zones from a Bluetooth strap during a workout, saved as a Move session.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { LineChart } from '@core/charts';
import { dayKey } from '@core/dates';
import { setSettings, useSettings } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Note, Screen, SectionTitle, Stat, Stepper, T } from '@core/ui';
import { ZONE_BOUNDS, ZONE_NAMES, maxHrFor, zoneOf, zonesFrom } from '../devices/zones';
import * as real from './hr/ble';
import * as sim from './hr/sim';
import type { HrReading } from './hr/gatt';
import { TYPES, type MoveType } from './model';
import { logWorkout } from './state';

const ZONE_COLORS = ['#7FB4D9', '#3DB39E', '#E7B416', '#E98A2C', '#D9534F'];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function LiveHrScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'move');
  const demo = useSettings((s) => s.demo);
  const ownMax = useSettings((s) => s.maxHr);
  const hr = real.SIMULATED || demo ? sim : real;
  const [phase, setPhase] = useState<'scan' | 'live' | 'saved'>('scan');
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [readings, setReadings] = useState<HrReading[]>([]);
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [type, setType] = useState<MoveType>('cardio');
  const stopRef = useRef<null | (() => void)>(null);
  const maxHr = maxHrFor({ own: ownMax });

  useEffect(() => {
    if (phase !== 'scan') return;
    let stop: (() => void) | null = null;
    hr.bluetoothReady().then((r) => {
      if (r.message) setMsg(r.message);
      if (r.ok) stop = hr.scan((d) => setDevices((xs) => (xs.some((x) => x.id === d.id) ? xs : [...xs, d])));
    });
    return () => stop?.();
  }, [phase, hr]);

  useEffect(() => {
    if (phase !== 'live') return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => () => stopRef.current?.(), []);

  const begin = async (d: { id: string; name: string }) => {
    try {
      setMsg('Connecting…');
      const stop = await hr.stream(
        d.id,
        (r) => setReadings((xs) => [...xs.slice(-7200), r]),
        () => setMsg('The strap disconnected. Your session so far is kept.'),
      );
      stopRef.current = stop;
      setDeviceName(d.name);
      setStart(Date.now());
      setNow(Date.now());
      setReadings([]);
      setMsg('');
      setPhase('live');
    } catch {
      setMsg('Could not connect. Wet the strap’s contacts, wake it by putting it on, and try again.');
    }
  };

  const latest = readings[readings.length - 1];
  const elapsed = (now - start) / 1000;
  const samples = readings.map((r) => ({ t: r.t, bpm: r.bpm }));
  const z = zonesFrom(samples, start, now, maxHr);
  const curZone = latest ? zoneOf(latest.bpm, maxHr) : 0;
  const recent = readings.slice(-120);

  const save = () => {
    stopRef.current?.();
    stopRef.current = null;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const hardShare = (z.zones[3] + z.zones[4]) / Math.max(1, minutes);
    logWorkout({ date: dayKey(start), type, minutes, effort: Math.max(2, Math.min(9, Math.round(3 + hardShare * 8 + z.zones[2] / Math.max(1, minutes) * 3))), avgHr: z.avgHr ?? undefined, maxHr: z.maxHr ?? undefined, zones: z.zones, device: deviceName });
    setPhase('saved');
  };

  return (
    <Screen title="Live heart rate" subtitle="Real-time zones from a Bluetooth strap" color={color} accentBar testID="live-hr">
      {phase === 'scan' ? (
        <>
          <Card>
            <T variant="heading">Find your strap</T>
            <T variant="small" color={c.muted} style={{ marginTop: 4 }}>
              Put the strap on (moisten the contacts) so it wakes up. Coressence looks for anything using the standard Bluetooth heart rate service.
            </T>
            <View style={{ marginTop: 10, gap: 8 }}>
              {devices.map((d) => (
                <Card key={d.id} onPress={() => begin(d)} style={{ padding: 12 }} testID={`hr-dev-${d.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Feather name="bluetooth" size={18} color={color} />
                    <T variant="bodyStrong" style={{ flex: 1 }}>
                      {d.name}
                    </T>
                    <Feather name="chevron-right" size={18} color={c.muted} />
                  </View>
                </Card>
              ))}
              {!devices.length ? (
                <T variant="caption" testID="hr-searching">
                  Searching…
                </T>
              ) : null}
            </View>
            {msg ? <Note text={msg} /> : null}
          </Card>
          <SectionTitle>Your zones</SectionTitle>
          <Card>
            <Stepper label="Maximum heart rate" value={maxHr} onChange={(v) => setSettings({ maxHr: v })} step={1} min={130} max={220} unit="bpm" testID="maxhr" />
            <View style={{ marginTop: 10, gap: 6 }}>
              {ZONE_NAMES.map((n, i) => (
                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ZONE_COLORS[i] }} />
                  <T variant="small" style={{ flex: 1 }}>
                    Zone {i + 1} · {n}
                  </T>
                  <T variant="caption">
                    {Math.round(ZONE_BOUNDS[i] * maxHr)}
                    {i < 4 ? `–${Math.round(ZONE_BOUNDS[i + 1] * maxHr) - 1}` : '+'} bpm
                  </T>
                </View>
              ))}
            </View>
            <T variant="caption" style={{ marginTop: 8 }}>
              185 bpm is used until you enter your own. If your clinician or a fitness test gave you a maximum, use that; some heart and blood pressure medicines change it.
            </T>
          </Card>
        </>
      ) : null}

      {phase === 'live' ? (
        <>
          <Card testID="hr-live">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T variant="caption">{deviceName}</T>
              <T variant="caption">{mmss(elapsed)}</T>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <T variant="hero" style={{ fontSize: 64, lineHeight: 72 }} color={curZone ? ZONE_COLORS[curZone - 1] : c.ink} testID="hr-bpm">
                {latest ? latest.bpm : '–'}
              </T>
              <T variant="caption">bpm</T>
              <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: (curZone ? ZONE_COLORS[curZone - 1] : c.muted) + '26' }}>
                <T variant="bodyStrong" color={curZone ? ZONE_COLORS[curZone - 1] : c.muted}>
                  {curZone ? `Zone ${curZone} · ${ZONE_NAMES[curZone - 1]}` : 'Below zone 1'}
                </T>
              </View>
            </View>
            <LineChart data={recent.map((r, i) => ({ label: i === 0 ? '' : '', value: r.bpm }))} color={color} height={110} />
          </Card>
          <SectionTitle>Time in zones</SectionTitle>
          <Card>
            {z.zones.map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                <T variant="caption" style={{ width: 54 }}>
                  Zone {i + 1}
                </T>
                <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surface2, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (m / Math.max(1, elapsed / 60)) * 100)}%`, height: 10, backgroundColor: ZONE_COLORS[i] }} />
                </View>
                <T variant="caption" style={{ width: 52, textAlign: 'right' }}>
                  {mmss(m * 60)}
                </T>
              </View>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Stat label="Average" value={z.avgHr ? String(z.avgHr) : '–'} unit="bpm" />
              <Stat label="Peak" value={z.maxHr ? String(z.maxHr) : '–'} unit="bpm" />
            </View>
          </Card>
          <SectionTitle>Session</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.filter((t) => t.key !== 'other').map((t) => (
              <Chip key={t.key} small label={t.label} selected={type === t.key} onPress={() => setType(t.key)} color={color} />
            ))}
          </View>
          <Button label="Stop and save" icon="square" style={{ marginTop: 16 }} onPress={save} testID="hr-save" />
          {msg ? <Note text={msg} tone="warn" /> : null}
        </>
      ) : null}

      {phase === 'saved' ? (
        <Card testID="hr-saved">
          <T variant="heading">Saved to Move</T>
          <T variant="small" color={c.muted} style={{ marginTop: 4 }}>
            {Math.max(1, Math.round(elapsed / 60))} minutes, average {z.avgHr ?? '–'} bpm, with your time in each zone.
          </T>
          <Button label="Back to Move" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.replace('/move')} />
        </Card>
      ) : null}
      <Note text="Heart rate zones are for pacing exercise. Stop and seek care if you have chest pain, unusual shortness of breath, dizziness or a racing heartbeat that does not settle with rest." />
    </Screen>
  );
}
