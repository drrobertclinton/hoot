// Measure: connected-device data with a clean empty state, manual entries and trends.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LineChart, Bars } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { dayKey, shortDate, weekdayShort, clockOf } from '@core/dates';
import { useSettings } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Empty, Field, Note, Screen, SectionTitle, Stat, T } from '@core/ui';
import { DEMO_TOOLS } from '@core/appConfig';
import { setDemo } from '../../demo/demo';
import { METRIC_INFO, baseline, dayMetrics, hasAnyData, kgToLb, lbToKg, metricSeries, type MetricKey } from './model';
import { brandName } from '../devices/catalog';
import type { BrandId } from '../devices/schema';
import type { MeasureSlice } from './model';
import { connectSource, disconnect, platformSourceName, provider, saveManual, sourceLabel, syncNow, useMeasure } from './state';

const SHOWN: MetricKey[] = ['steps', 'exerciseMin', 'restingHr', 'hrv', 'sleepH', 'weightKg', 'activeKcal', 'systolic', 'respRate', 'spo2', 'tempDev', 'vo2max', 'bodyFatPct', 'leanKg', 'glucoseAvg', 'walkingHr', 'cardioRecovery', 'distanceKm', 'mindfulMin', 'audioEnvDb'];
const BARS: MetricKey[] = ['steps', 'exerciseMin', 'activeKcal', 'distanceKm', 'mindfulMin'];

export function MeasureScreen() {
  const c = useTheme();
  const m = useMeasure();
  const demo = useSettings((s) => s.demo);
  const units = useSettings((s) => s.units);
  const goals = useSettings((s) => s.goals);
  const [range, setRange] = useState<Range>(7);
  const [metric, setMetric] = useState<MetricKey>('steps');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [manual, setManual] = useState({ weight: '', sys: '', dia: '', rhr: '' });
  const today = dayKey();
  const color = moduleColor(c, 'measure');
  const any = hasAnyData(m);
  const dm = dayMetrics(m, today);
  const conv = (k: MetricKey, v: number) => (k === 'weightKg' && units === 'us' ? kgToLb(v) : v);
  const unitOf = (k: MetricKey) => (k === 'weightKg' && units === 'us' ? 'lb' : METRIC_INFO[k].unit);
  const latest = (k: MetricKey) => {
    const s = metricSeries(m, k, 30, today);
    return [...s].reverse().find((x) => x.value !== null)?.value ?? null;
  };
  const fmtV = (k: MetricKey, v: number | null) => (v === null ? '–' : k === 'steps' ? Math.round(v).toLocaleString('en-US') : conv(k, v).toFixed(METRIC_INFO[k].decimals));
  const data = metricSeries(m, metric, range, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value === null ? null : conv(metric, x.value) }));
  const base = baseline(m, metric, today);

  const connect = async () => {
    setBusy(true);
    const r = await connectSource();
    setBusy(false);
    setMsg(r.message);
  };

  return (
    <Screen title="Measure" subtitle="Objective numbers from your devices" color={color} accentBar testID="measure">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={demo ? 'play-circle' : m.source === 'none' ? 'link' : 'check-circle'} size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading">{demo ? 'Demo data' : m.source === 'none' ? 'No device connected' : sourceLabel(m.source)}</T>
            <T variant="small" color={c.muted}>
              {demo ? 'Sample numbers for a demo profile. Your own data is untouched.' : m.lastSync ? `Last synced ${clockOf(m.lastSync)}` : `Connect ${platformSourceName} to fill this in automatically.`}
            </T>
          </View>
        </View>
        {demo || m.provenance ? <SourcesLine m={m} /> : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Button label="Connected devices" icon="watch" compact kind="secondary" onPress={() => router.push('/devices' as never)} testID="measure-devices" />
          <Button label="Monitor" icon="activity" compact kind="ghost" onPress={() => router.push('/monitor' as never)} testID="measure-monitor" />
        </View>
        {!demo ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {m.source === 'none' ? (
              <Button label={`Connect ${provider ? provider.label : platformSourceName}`} icon="link" compact loading={busy} onPress={connect} testID="measure-connect" />
            ) : (
              <>
                <Button
                  label="Sync now"
                  icon="refresh-cw"
                  compact
                  loading={busy}
                  onPress={async () => {
                    setBusy(true);
                    const ok = await syncNow();
                    setBusy(false);
                    setMsg(ok ? 'Up to date.' : 'Could not sync right now.');
                  }}
                />
                <Button label="Disconnect" kind="ghost" compact onPress={disconnect} />
              </>
            )}
          </View>
        ) : null}
        {msg ? (
          <T variant="small" color={c.accent} style={{ marginTop: 8 }}>
            {msg}
          </T>
        ) : null}
      </Card>

      {!any ? (
        <Card style={{ marginTop: 14 }}>
          <Empty
            icon="bar-chart-2"
            title="Nothing measured yet"
            text="Connect a device, or add a number by hand below. Steps, heart rate, heart rate variability, sleep and weight appear here with your own baseline."
            action={DEMO_TOOLS && !demo ? <Button label="Load demo data" kind="ghost" compact icon="play-circle" onPress={() => setDemo(true)} /> : undefined}
          />
        </Card>
      ) : (
        <>
          <SectionTitle>Today</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
              <Stat label="Steps" value={fmtV('steps', dm.steps ?? null)} sub={`Goal ${goals.steps.toLocaleString('en-US')}`} color={c.pillar.move} />
              <Stat label="Resting HR" value={fmtV('restingHr', latest('restingHr'))} unit="bpm" sub={baseline(m, 'restingHr', today) ? `Usual ${Math.round(baseline(m, 'restingHr', today)!)}` : undefined} />
              <Stat label="HRV" value={fmtV('hrv', latest('hrv'))} unit="ms" sub={baseline(m, 'hrv', today) ? `Usual ${Math.round(baseline(m, 'hrv', today)!)}` : undefined} color={c.pillar.recover} />
            </View>
          </Card>

          <SectionTitle>Trends</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SHOWN.filter((k) => latest(k) !== null).map((k) => (
              <Chip key={k} small label={METRIC_INFO[k].label} selected={metric === k} onPress={() => setMetric(k)} testID={`mm-${k}`} />
            ))}
          </View>
          <RangePicker value={range} onChange={setRange} />
          <Card style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <T variant="heading">{METRIC_INFO[metric].label}</T>
              <T variant="caption">{unitOf(metric)}</T>
            </View>
            {BARS.includes(metric) ? (
              <Bars data={data} color={metric === 'steps' ? c.pillar.move : color} goal={metric === 'steps' ? goals.steps : metric === 'exerciseMin' ? goals.moveMinutes : undefined} testID="measure-chart" />
            ) : (
              <LineChart data={data} color={metric === 'hrv' ? c.pillar.recover : metric === 'restingHr' ? c.danger : color} decimals={METRIC_INFO[metric].decimals} band={base !== null ? [conv(metric, base) * 0.97, conv(metric, base) * 1.03] : undefined} testID="measure-chart" />
            )}
            <T variant="caption" style={{ marginTop: 6 }}>
              {METRIC_INFO[metric].note}
              {base !== null && metric !== 'steps' ? ' The shaded band is your 14-day average.' : ''}
            </T>
          </Card>
        </>
      )}

      <SectionTitle>Add by hand</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={`Weight (${units === 'us' ? 'lb' : 'kg'})`} keyboardType="decimal-pad" value={manual.weight} onChangeText={(x) => setManual({ ...manual, weight: x })} testID="man-weight" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Resting HR (bpm)" keyboardType="number-pad" value={manual.rhr} onChangeText={(x) => setManual({ ...manual, rhr: x })} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Blood pressure, top" keyboardType="number-pad" value={manual.sys} onChangeText={(x) => setManual({ ...manual, sys: x })} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Bottom" keyboardType="number-pad" value={manual.dia} onChangeText={(x) => setManual({ ...manual, dia: x })} />
          </View>
        </View>
        <Button
          label="Save for today"
          icon="plus"
          compact
          kind="secondary"
          style={{ marginTop: 12, alignSelf: 'flex-start' }}
          testID="man-save"
          onPress={() => {
            const num = (x: string) => (x.trim() && Number.isFinite(Number(x)) ? Number(x) : undefined);
            const w = num(manual.weight);
            const patch = { weightKg: w === undefined ? undefined : units === 'us' ? Math.round(lbToKg(w) * 10) / 10 : w, restingHr: num(manual.rhr), systolic: num(manual.sys), diastolic: num(manual.dia) };
            const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
            if (Object.keys(clean).length) saveManual(today, clean);
            setManual({ weight: '', sys: '', dia: '', rhr: '' });
            setMsg('Saved.');
          }}
        />
      </Card>
      <Note text="Devices estimate many of these numbers, and they differ between brands. Compare a number with your own usual level. Apple Health reports heart rate variability as SDNN and Health Connect as RMSSD, so values are not interchangeable. General information, not medical advice." />
      {busy ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    </Screen>
  );
}

function SourcesLine({ m }: { m: MeasureSlice }) {
  const c = useTheme();
  const days = Object.keys(m.provenance || {}).sort().slice(-7);
  const brands = new Set<BrandId>();
  for (const d of days) for (const b of Object.values(m.provenance![d])) if (b && b !== 'phone') brands.add(b);
  if (!brands.size) return null;
  return (
    <T variant="caption" color={c.muted} style={{ marginTop: 8 }} testID="measure-sources">
      This week from {[...brands].map(brandName).join(', ')}
    </T>
  );
}
