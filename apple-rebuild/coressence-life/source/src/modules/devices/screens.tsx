// Connected devices: every brand with its status, last sync, what it provides, connect and disconnect, and a clear
// note when the vendor still has to approve Coressence.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSettings } from '@core/settings';
import { useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Divider, Note, Screen, SectionTitle, T } from '@core/ui';
import { CONNECT } from '@core/appConfig';
import { ALSO_THROUGH_PLATFORM, CONNECTIONS, connectionInfo, type ConnectionId, type ConnectionInfo } from './catalog';
import { statusOf, suppliedBy, type StatusView } from './model';
import { serviceReady } from './cloud';
import { connectVendor, disconnectVendor, finishVendor, refreshVendors, useDevices } from './state';
import { AGGREGATORS } from './aggregator';
import { METRIC_INFO, type MetricKey } from '../measure/model';
import { connectSource, disconnect as disconnectPlatform, syncNow, useMeasure } from '../measure/state';

export const DEVICES_COLOR = '#2F7FA8';
const PRIVACY_NOTE = 'Coressence only reads from your devices; it never writes to them. Health data is never used for advertising or sold, and it is not stored in iCloud. Apple Health and Health Connect data stays on your phone.';

export function ago(ts: number | null | undefined): string {
  if (!ts) return 'Not synced yet';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'Synced just now';
  if (m < 60) return `Synced ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Synced ${h} h ago`;
  return `Synced ${Math.round(h / 24)} d ago`;
}

function useStatus() {
  const d = useDevices();
  const m = useMeasure();
  const demo = useSettings((s) => s.demo);
  const platform = (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web') as 'ios' | 'android' | 'web';
  return { d, m, demo, of: (info: ConnectionInfo) => statusOf(info, d, { platform, serviceReady: serviceReady(), measureSource: m.source, demo }) };
}

function Avatar({ info, size = 40 }: { info: ConnectionInfo; size?: number }) {
  const icon = info.kind === 'bluetooth' ? 'bluetooth' : info.kind === 'platform' ? (info.id === 'healthkit' ? 'heart' : 'smartphone') : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: DEVICES_COLOR + '1F', alignItems: 'center', justifyContent: 'center' }}>
      {icon ? (
        <Feather name={icon} size={size * 0.48} color={DEVICES_COLOR} />
      ) : (
        <T variant="heading" color={DEVICES_COLOR}>
          {info.name.slice(0, 1)}
        </T>
      )}
    </View>
  );
}

function StatusBadge({ v }: { v: StatusView }) {
  const c = useTheme();
  const col = { ok: c.ok, info: c.accent, muted: c.muted, warn: c.warn }[v.tone];
  return <Badge text={v.label} color={col} />;
}

function DeviceRow({ info, v, lastSync, onPress }: { info: ConnectionInfo; v: StatusView; lastSync?: number | null; onPress: () => void }) {
  const c = useTheme();
  return (
    <Card onPress={onPress} style={{ marginTop: 10, padding: 14 }} testID={`dev-${info.id}`}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar info={info} />
        <View style={{ flex: 1 }}>
          <T variant="heading">{info.name}</T>
          <T variant="caption" numberOfLines={1}>
            {v.status === 'connected' ? ago(lastSync) : info.provides.slice(0, 3).join(' · ')}
          </T>
          <View style={{ marginTop: 6 }}>
            <StatusBadge v={v} />
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={c.muted} />
      </View>
    </Card>
  );
}

export function DevicesScreen() {
  const c = useTheme();
  const { d, m, demo, of } = useStatus();
  const params = useLocalSearchParams<{ connected?: string; ok?: string }>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    refreshVendors();
  }, []);
  useEffect(() => {
    if (params.connected && CONNECTIONS.some((x) => x.id === params.connected)) {
      finishVendor(params.connected as ConnectionId, params.ok !== '0');
      setMsg(params.ok === '0' ? 'The sign-in was cancelled.' : `${connectionInfo(params.connected as ConnectionId).name} connected.`);
    }
  }, [params.connected, params.ok]);

  const views = CONNECTIONS.map((info) => ({ info, v: of(info) }));
  const connected = views.filter((x) => x.v.status === 'connected');
  const last = (id: ConnectionId) => d.conns[id]?.lastSync ?? (connectionInfo(id).kind === 'platform' ? m.lastSync : null);
  const section = (ids: ConnectionId[]) => views.filter((x) => ids.includes(x.info.id)).map(({ info, v }) => <DeviceRow key={info.id} info={info} v={v} lastSync={last(info.id)} onPress={() => router.push(`/devices/${info.id}` as never)} />);

  return (
    <Screen title="Connected devices" subtitle="Wearables, scales, cuffs and glucose sensors" color={DEVICES_COLOR} accentBar testID="devices">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: DEVICES_COLOR + '1F', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="watch" size={21} color={DEVICES_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading">
              {connected.length} connected{demo ? ' (demo profile)' : ''}
            </T>
            <T variant="small" color={c.muted}>
              {connected.length ? connected.map((x) => x.info.name.split(' ')[0]).join(', ') : 'Start with Apple Health or Health Connect: most devices already share there.'}
            </T>
          </View>
        </View>
        {connected.length ? (
          <Button
            label="Sync now"
            icon="refresh-cw"
            compact
            kind="secondary"
            loading={busy}
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            testID="devices-sync"
            onPress={async () => {
              setBusy(true);
              const ok = demo ? true : await syncNow();
              setBusy(false);
              setMsg(ok ? 'Up to date.' : 'Some connections could not sync right now.');
            }}
          />
        ) : null}
        {msg ? (
          <T variant="small" color={c.accent} style={{ marginTop: 8 }}>
            {msg}
          </T>
        ) : null}
      </Card>

      <SectionTitle>On your phone</SectionTitle>
      {section(['healthkit', 'healthconnect', 'samsung'])}
      {serviceReady() || demo ? (
        <>
          <SectionTitle>Direct connections</SectionTitle>
          <T variant="small" color={c.muted}>
            Richer data straight from each company, such as recovery scores, sleep stages and glucose readings. Where both exist, Coressence uses the direct connection and ignores the copy in Apple Health or Health Connect.
          </T>
          {section(['oura', 'whoop', 'garmin', 'fitbit', 'withings', 'polar', 'dexcom'])}
        </>
      ) : null}
      <SectionTitle>During workouts</SectionTitle>
      {section(['ble'])}

      <SectionTitle>Also works through Apple Health or Health Connect</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ALSO_THROUGH_PLATFORM.map((b) => (
          <Chip key={b} small label={b} />
        ))}
      </View>
      {CONNECT.aggregator ? <Note text={`Extra brands are connected through ${AGGREGATORS.find((a) => a.id === CONNECT.aggregator)?.name}.`} /> : null}
      <Note text={PRIVACY_NOTE} icon="shield" />
    </Screen>
  );
}

export function DeviceScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const info = CONNECTIONS.find((x) => x.id === id);
  const { d, m, demo, of } = useStatus();
  const units = useSettings((s) => s.units);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!info)
    return (
      <Screen title="Device" testID="device">
        <T>Not found.</T>
      </Screen>
    );
  const v = of(info);
  const brand = info.id === 'healthkit' ? 'apple' : info.id === 'healthconnect' ? 'google' : info.brand;
  const supplied = suppliedBy(m.provenance, brand).filter((k) => METRIC_INFO[k] && k !== 'bedMin' && k !== 'wakeMin');
  const latestDay = m.provenance ? Object.keys(m.provenance).sort().reverse().find((day) => supplied.some((k) => m.provenance![day][k] === brand)) : undefined;
  const fmt = (k: MetricKey, val: number) => {
    const i = METRIC_INFO[k];
    if (k === 'weightKg' || k === 'leanKg') return units === 'us' ? `${(val * 2.20462).toFixed(1)} lb` : `${val.toFixed(1)} kg`;
    if (k === 'steps') return Math.round(val).toLocaleString('en-US');
    return `${k === 'tempDev' && val > 0 ? '+' : ''}${val.toFixed(i.decimals)}${i.unit ? ' ' + i.unit : ''}`;
  };

  const connect = async () => {
    setBusy(true);
    const r = info.kind === 'platform' ? await connectSource() : await connectVendor(info.id);
    setBusy(false);
    setMsg(r.message);
  };
  const disconnect = async () => {
    setBusy(true);
    if (info.kind === 'platform') disconnectPlatform();
    else await disconnectVendor(info.id);
    setBusy(false);
    setMsg('Disconnected. Data already shown from this connection is removed from your dashboard.');
  };

  return (
    <Screen title={info.name} subtitle={info.devices} color={DEVICES_COLOR} accentBar testID="device">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar info={info} size={46} />
          <View style={{ flex: 1 }}>
            <StatusBadge v={v} />
            <T variant="small" color={c.muted} style={{ marginTop: 4 }}>
              {v.status === 'connected' ? ago(d.conns[info.id]?.lastSync ?? m.lastSync) : info.kind === 'cloud' ? 'Signs in on the company’s own page. Coressence never sees your password.' : info.kind === 'bluetooth' ? 'Pairs during a workout in Move.' : 'Reads from the health store on your phone.'}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {info.kind === 'bluetooth' ? (
            <Button label="Open live heart rate" icon="activity" compact onPress={() => router.push('/move-live' as never)} testID="dev-live" />
          ) : v.status === 'connected' ? (
            <>
              {!demo ? <Button label="Sync now" icon="refresh-cw" compact loading={busy} onPress={async () => setMsg((await syncNow()) ? 'Up to date.' : 'Could not sync right now.')} /> : null}
              <Button label="Disconnect" kind="ghost" compact onPress={disconnect} testID="dev-disconnect" />
            </>
          ) : v.status === 'not_connected' ? (
            <Button label={`Connect ${info.name.split(' ')[0]}`} icon="link" compact loading={busy} onPress={connect} testID="dev-connect" />
          ) : null}
        </View>
        {msg ? (
          <T variant="small" color={c.accent} style={{ marginTop: 8 }}>
            {msg}
          </T>
        ) : null}
      </Card>

      {info.approval ? <Note tone={v.status === 'waiting_approval' || v.status === 'waiting_service' ? 'warn' : 'info'} text={info.approval} /> : null}
      {info.membership ? <Note text={info.membership} icon="credit-card" /> : null}

      {supplied.length ? (
        <>
          <SectionTitle>{`Shown from ${info.name.split(' ')[0]} now`}</SectionTitle>
          <Card testID="dev-supplied">
            {supplied.slice(0, 12).map((k, i) => {
              const val = latestDay ? m.synced[latestDay]?.[k] : undefined;
              return (
                <View key={k}>
                  {i ? <Divider /> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }}>
                    <T variant="small">{METRIC_INFO[k].label}</T>
                    <T variant="small" color={c.muted}>
                      {typeof val === 'number' ? fmt(k, val) : '–'}
                    </T>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <SectionTitle>What it can provide</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {info.provides.map((p) => (
          <Chip key={p} small label={p} />
        ))}
      </View>
      {info.kind === 'cloud' ? <Note text="When this brand also shares to Apple Health or Health Connect, Coressence uses the direct connection for the numbers it provides and ignores the copy, so nothing is counted twice." /> : null}
      {info.id === 'healthkit' ? <Note text="ECG results and irregular rhythm notifications are shown exactly as Apple Watch reported them. Coressence does not read the ECG recording or make a diagnosis." /> : null}
      <Note text={PRIVACY_NOTE} icon="shield" />
    </Screen>
  );
}
