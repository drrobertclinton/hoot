// Monitor: readiness, sleep stages, training load, glucose, blood pressure, body composition, cycle and heart rhythm
// records from connected devices, each in plain language with the person's own trend. Nothing here diagnoses.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Bars, Hypnogram, LineChart, MultiLine, Tide, Spark, StackedBars } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { clockOf, dayKey, lastDays, shortDate, weekdayShort } from '@core/dates';
import { useSettings } from '@core/settings';
import { moduleColor, useTheme, type Palette } from '@core/theme';
import { Badge, Button, Card, Divider, Field, Note, Screen, SectionTitle, Stat, T, ToggleRow, type IconName } from '@core/ui';
import { useSlices } from '../life/state';
import { snapshot } from '../life/today';
import { readinessWords } from '../recover/model';
import { baseline, dayMetrics, eventsOf, kgToLb, metricSeries } from '../measure/model';
import { syncNow, useMeasure } from '../measure/state';
import { useMove } from '../move/state';
import { logMeal, useFuel } from '../fuel/state';
import { voiceAdvice } from '../rehearse/model';
import { useRehearse } from '../rehearse/state';
import { ZONE_NAMES } from '../devices/zones';
import type { BrandId } from '../devices/schema';
import { brandName } from '../devices/catalog';
import {
  ECG_LABEL,
  PHASE_LABEL,
  availableCards,
  bodyTrend,
  bpInsights,
  bpReadings,
  bpSummary,
  cycleInsights,
  cycleState,
  glucoseDaily,
  glucoseInsights,
  glucoseLifeInsights,
  glucoseStats,
  glucoseWarnings,
  loadBalance,
  mealAt,
  mealAverages,
  mealPatterns,
  mealResponses,
  spottedMeals,
  workoutResponses,
  periods,
  rhythmHistory,
  rhythmInsights,
  sleepConsistency,
  sleepInsights,
  stageSummary,
  type Insight,
  type MonitorCard,
} from './model';
import { dismissSpike, saveTargets, setCycleOn, useMonitor } from './state';

export const MONITOR_COLOR = '#C2477A';
const DISCLAIMER = 'Monitor shows what your devices report, compared with your own history or with targets your clinician gave you. It does not diagnose any condition. Readings from wearables are estimates; blood pressure comes from a cuff and glucose from a glucose sensor, never from the phone alone.';


const stageColors = (c: Palette) => ({ deep: c.dark ? '#5468E8' : '#2E3FA8', core: c.dark ? '#7F90F0' : '#5C70DA', rem: c.dark ? '#5CC6D8' : '#1F96CC', awake: c.dark ? '#F2AE4A' : '#DE8F1F' });
const zoneColors = ['#7FB4D9', '#3DB39E', '#E7B416', '#E98A2C', '#D9534F'];
const hourShort = (ts: number) => {
  const h = new Date(ts).getHours();
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
};
const toneOf = (t: Insight['tone']) => (t === 'good' ? 'ok' : t) as 'ok' | 'info' | 'warn' | 'danger';

function Insights({ items }: { items: Insight[] }) {
  return (
    <>
      {items.map((i, k) => (
        <Note key={k} tone={toneOf(i.tone)} text={i.text} />
      ))}
    </>
  );
}

const CARD_META: Record<MonitorCard, { title: string; icon: IconName; color: (c: Palette) => string }> = {
  readiness: { title: 'Readiness', icon: 'battery-charging', color: (c) => c.pillar.recover },
  sleep: { title: 'Sleep stages', icon: 'moon', color: (c) => c.pillar.sleep },
  load: { title: 'Strain and load', icon: 'trending-up', color: (c) => c.pillar.move },
  glucose: { title: 'Glucose', icon: 'droplet', color: () => '#D2691E' },
  bp: { title: 'Blood pressure', icon: 'heart', color: (c) => c.danger },
  body: { title: 'Body composition', icon: 'user', color: (c) => c.teal },
  cycle: { title: 'Cycle', icon: 'circle', color: () => MONITOR_COLOR },
  rhythm: { title: 'Heart rhythm records', icon: 'activity', color: (c) => c.danger },
  voice: { title: 'Voice load', icon: 'mic', color: (c) => moduleColor(c, 'rehearse') },
};

export function MonitorScreen() {
  const c = useTheme();
  const all = useSlices();
  const m = useMeasure();
  const move = useMove();
  const mon = useMonitor();
  const voice = useRehearse();
  const goals = useSettings((s) => s.goals);
  const units = useSettings((s) => s.units);
  const today = dayKey();
  const ev = eventsOf(m);
  const cards = availableCards(m, mon);
  const snap = snapshot(all, goals, today);
  const now = Date.now();
  const g = glucoseStats(ev.glucose, now - 14 * 86400_000, now, mon.targets);
  const bpR = bpReadings(m);
  const bp = bpSummary(bpR, mon.targets, now);
  const load = loadBalance(m, move, today);
  const st = stageSummary(m, 7, today);
  const cyc = cycleState(ev.cycle, today);
  const rh = rhythmHistory(ev.ecg, ev.rhythm);
  const w = bodyTrend(m, 'weightKg', 30, today);
  const attention = [...bpInsights(bpR, mon.targets, now), ...rhythmInsights(ev.ecg, ev.rhythm, now), ...glucoseWarnings(ev.glucose, mon.targets, now, clockOf), ...glucoseInsights(g, mon.targets), ...cycleInsights(cyc, m, today)].filter((i) => i.tone === 'warn' || i.tone === 'danger');

  const summary: Record<MonitorCard, { value: string; sub: string; spark?: (number | null)[] }> = {
    readiness: { value: snap.recover.score === null ? '–' : String(Math.round(snap.recover.score * 100)), sub: snap.recover.score === null ? 'Needs heart data or soreness' : readinessWords(snap.recover.score).split('.')[0], spark: lastDays(14, today).map((d) => snapshot(all, goals, d).recover.score) },
    sleep: { value: st ? `${st.asleep} h` : '–', sub: st ? `Deep ${st.deep} h · REM ${st.rem} h, 7-night average` : 'Needs a device that records sleep stages', spark: metricSeries(m, 'sleepH', 14, today).map((x) => x.value) },
    load: { value: load.ratio === null ? '–' : `${load.ratio.toFixed(1)}×`, sub: load.ratio === null ? 'Log or sync workouts' : 'This week against your 4-week average', spark: load.series.slice(-14).map((x) => x.load) },
    glucose: { value: g ? `${g.inRange}%` : '–', sub: g ? `In range ${mon.targets.glucoseLow}–${mon.targets.glucoseHigh} mg/dL, 14 days` : 'No recent readings', spark: glucoseDaily(ev.glucose, 14, mon.targets, today).map((x) => x.avg) },
    bp: { value: bp.week ? `${bp.week.sys}/${bp.week.dia}` : '–', sub: bp.week ? `7-day average of ${bp.week.n} readings` : 'Add a reading or connect a cuff', spark: lastDays(14, today).map((d) => dayMetrics(m, d).systolic ?? null) },
    body: { value: w.latest === null ? '–' : units === 'us' ? `${kgToLb(w.latest).toFixed(1)} lb` : `${w.latest.toFixed(1)} kg`, sub: w.change === null ? 'Weight trend' : `${w.change > 0 ? '+' : ''}${(units === 'us' ? kgToLb(w.change) : w.change).toFixed(1)} ${units === 'us' ? 'lb' : 'kg'} over 30 days`, spark: w.series.map((x) => x.value) },
    cycle: { value: cyc ? `Day ${cyc.day}` : '–', sub: cyc ? PHASE_LABEL[cyc.phase] : 'Turn on cycle tracking', spark: undefined },
    rhythm: { value: String(rh.length), sub: rh[0] ? `Latest: ${rh[0].title}` : 'No records', spark: undefined },
    voice: { value: voice.voice[today]?.voiceHours !== undefined ? `${voice.voice[today].voiceHours} h` : '–', sub: voiceAdvice(voice, today).text.split('.')[0], spark: lastDays(14, today).map((d) => voice.voice[d]?.voiceHours ?? null) },
  };

  return (
    <Screen title="Monitor" subtitle="What your devices are telling you, in plain words" color={MONITOR_COLOR} accentBar testID="monitor">
      {attention.length ? (
        <Card testID="monitor-attention">
          <T variant="label" color={c.warn}>
            Worth a look
          </T>
          <Insights items={attention.slice(0, 3)} />
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: attention.length ? 14 : 0 }}>
        {cards.map((k) => {
          const meta = CARD_META[k];
          const col = meta.color(c);
          const s = summary[k];
          return (
            <Card key={k} style={{ width: '48%', flexGrow: 1, padding: 14 }} onPress={() => router.push((k === 'voice' ? '/rehearse' : `/monitor/${k}`) as never)} testID={`mon-${k}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: col + '1F', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={meta.icon} size={16} color={col} />
                </View>
                {s.spark ? <Spark values={s.spark} color={col} width={64} height={24} /> : null}
              </View>
              <T variant="caption" style={{ marginTop: 10 }}>
                {meta.title}
              </T>
              <T variant="stat" style={{ fontSize: 22, lineHeight: 27 }}>
                {s.value}
              </T>
              <T variant="caption" numberOfLines={2}>
                {s.sub}
              </T>
            </Card>
          );
        })}
      </View>
      <Button label="Connected devices" icon="watch" kind="secondary" compact style={{ marginTop: 16, alignSelf: 'flex-start' }} onPress={() => router.push('/devices' as never)} testID="monitor-devices" />
      <Note text={DISCLAIMER} />
    </Screen>
  );
}

export function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: MonitorCard }>();
  switch (id) {
    case 'readiness':
      return <ReadinessDetail />;
    case 'sleep':
      return <SleepDetail />;
    case 'load':
      return <LoadDetail />;
    case 'glucose':
      return <GlucoseDetail />;
    case 'bp':
      return <BpDetail />;
    case 'body':
      return <BodyDetail />;
    case 'cycle':
      return <CycleDetail />;
    case 'rhythm':
      return <RhythmDetail />;
    default:
      return <MonitorScreen />;
  }
}

function SourceLine({ brands }: { brands: (BrandId | undefined)[] }) {
  const names = [...new Set(brands.filter((b): b is BrandId => !!b))].map(brandName);
  if (!names.length) return null;
  return (
    <T variant="caption" style={{ marginTop: 8 }}>
      From {names.join(', ')}
    </T>
  );
}

function ReadinessDetail() {
  const c = useTheme();
  const all = useSlices();
  const m = useMeasure();
  const goals = useSettings((s) => s.goals);
  const [range, setRange] = useState<Range>(30);
  const today = dayKey();
  const snap = snapshot(all, goals, today);
  const dm = dayMetrics(m, today);
  const color = c.pillar.recover;
  const lbl = (d: string) => (range <= 7 ? weekdayShort(d) : shortDate(d));
  const line = (k: 'hrv' | 'restingHr' | 'tempDev' | 'respRate') => metricSeries(m, k, range, today).map((x) => ({ label: lbl(x.date), value: x.value }));
  const base = (k: 'hrv' | 'restingHr') => baseline(m, k, today);
  const prov = m.provenance?.[today] || {};
  return (
    <Screen title="Readiness" subtitle="Heart rate variability, resting heart rate, sleep and temperature" color={color} accentBar testID="mon-detail-readiness">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide value={snap.recover.score} color={color} size={104} stroke={11} label="Readiness" center={<T variant="stat">{snap.recover.score === null ? '–' : Math.round(snap.recover.score * 100)}</T>} />
          <T variant="body" style={{ flex: 1 }}>
            {readinessWords(snap.recover.score)}
          </T>
        </View>
        <View style={{ marginTop: 12, gap: 6 }}>
          {snap.recover.parts.map((p) => (
            <View key={p.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T variant="small">{p.label}</T>
              <T variant="small" color={p.delta > 0 ? c.ok : p.delta < 0 ? c.warn : c.muted}>
                {p.delta > 0 ? '+' : ''}
                {p.delta}
              </T>
            </View>
          ))}
        </View>
        <Button label="Why this number" icon="help-circle" kind="secondary" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/why')} testID="mon-why" />
        <SourceLine brands={[prov.hrv, prov.restingHr, prov.tempDev, prov.sleepH]} />
      </Card>
      {dm.vendorReadiness !== undefined || dm.vendorRecovery !== undefined ? (
        <Card style={{ marginTop: 12 }} testID="vendor-scores">
          <T variant="caption">As your devices score it today</T>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {dm.vendorReadiness !== undefined ? <Stat label="Oura readiness" value={String(dm.vendorReadiness)} /> : null}
            {dm.vendorRecovery !== undefined ? <Stat label="WHOOP recovery" value={String(dm.vendorRecovery)} unit="%" /> : null}
          </View>
          <T variant="caption" style={{ marginTop: 6 }}>
            Each company scores recovery its own way, so these will not match Coressence’s number exactly. Coressence’s readiness uses one transparent formula whichever device you wear.
          </T>
        </Card>
      ) : null}
      <SectionTitle>What feeds it</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      {(
        [
          ['hrv', 'Heart rate variability', 'ms', c.pillar.recover, base('hrv')],
          ['restingHr', 'Resting heart rate', 'bpm', c.danger, base('restingHr')],
          ['tempDev', 'Overnight temperature change', '°C', '#D2691E', null],
          ['respRate', 'Breathing rate during sleep', '/min', c.teal, null],
        ] as const
      ).map(([k, title, unit, col, b]) => (
        <Card key={k} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="heading">{title}</T>
            <T variant="caption">{unit}</T>
          </View>
          <LineChart data={line(k)} color={col} decimals={k === 'tempDev' ? 1 : 0} band={b !== null && b !== undefined ? [b * 0.97, b * 1.03] : k === 'tempDev' ? [-0.3, 0.3] : undefined} />
          <T variant="caption">{k === 'tempDev' ? 'The shaded band is ±0.3 °C, the usual night-to-night wobble.' : b ? 'The shaded band is your 14-day average.' : 'Compare with your own usual level.'}</T>
        </Card>
      ))}
      <Button label="Recover: log soreness and recovery" kind="ghost" compact icon="battery-charging" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/recover')} />
      <Note text="Readiness is a prompt to listen to your body, not a medical measurement. A temperature that stays raised with feeling unwell, or a resting heart rate that stays well above your usual for several days, is worth checking with a clinician." />
    </Screen>
  );
}

function SleepDetail() {
  const c = useTheme();
  const m = useMeasure();
  const [range, setRange] = useState<Range>(7);
  const today = dayKey();
  const ev = eventsOf(m);
  const night = [...ev.nights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const st = stageSummary(m, range, today);
  const cons = sleepConsistency(m, 14, today);
  const sc = stageColors(c);
  const lbl = (d: string) => (range <= 7 ? weekdayShort(d) : shortDate(d));
  const bars = lastDays(range, today).map((d) => {
    const dm = dayMetrics(m, d);
    return { label: lbl(d), parts: [{ value: dm.sleepDeepH ?? 0, color: sc.deep }, { value: dm.sleepCoreH ?? 0, color: sc.core }, { value: dm.sleepRemH ?? 0, color: sc.rem }, { value: dm.sleepAwakeH ?? 0, color: sc.awake }] };
  });
  const dm = dayMetrics(m, today);
  const clockMin = (min: number | undefined) => {
    if (min === undefined) return '–';
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return clockOf(t.getTime() + min * 60000);
  };
  return (
    <Screen title="Sleep stages" subtitle="Stages, timing and consistency from your devices" color={c.pillar.sleep} accentBar testID="mon-detail-sleep">
      {night ? (
        <Card testID="hypnogram">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="heading">Last night</T>
            <T variant="caption">
              {clockOf(night.start)} to {clockOf(night.end)}
            </T>
          </View>
          <Hypnogram segments={night.segments} start={night.start} end={night.end} colors={sc} hourLabel={hourShort} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
            {(['deep', 'core', 'rem', 'awake'] as const).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: sc[k] }} />
                <T variant="caption">{{ deep: 'Deep', core: 'Light', rem: 'REM', awake: 'Awake' }[k]}</T>
              </View>
            ))}
          </View>
          <SourceLine brands={[night.origin]} />
        </Card>
      ) : null}
      <SectionTitle>Stages by night</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <StackedBars data={bars} unit=" h" testID="stage-bars" />
        {st ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginTop: 10 }}>
            <Stat label="Asleep" value={String(st.asleep)} unit="h" />
            <Stat label="Deep" value={String(st.deep)} unit="h" sub={`${st.deepPct}%`} color={sc.deep} />
            <Stat label="REM" value={String(st.rem)} unit="h" sub={`${st.remPct}%`} color={sc.rem} />
          </View>
        ) : null}
      </Card>
      <SectionTitle>Consistency</SectionTitle>
      <Card testID="sleep-consistency">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide value={cons ? cons.score / 100 : null} color={c.pillar.sleep} size={84} stroke={9} label="Consistency" center={<T variant="heading">{cons ? cons.score : '–'}</T>} />
          <View style={{ flex: 1 }}>
            <T variant="small">{cons ? `Bedtime moved about ${cons.sdBed} min and wake time about ${cons.sdWake} min from night to night over the last ${cons.nights} nights.` : 'Needs at least five nights with bed and wake times from a device.'}</T>
            <T variant="caption" style={{ marginTop: 4 }}>
              Last night: {clockMin(dm.bedMin)} to {clockMin(dm.wakeMin)}
            </T>
          </View>
        </View>
      </Card>
      <SectionTitle>Overnight vitals</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          <Stat label="Breathing rate" value={dm.respRate !== undefined ? dm.respRate.toFixed(1) : '–'} unit="/min" />
          <Stat label="Blood oxygen" value={dm.spo2 !== undefined ? String(Math.round(dm.spo2)) : '–'} unit="%" />
          <Stat label="Temperature" value={dm.tempDev !== undefined ? `${dm.tempDev > 0 ? '+' : ''}${dm.tempDev.toFixed(1)}` : '–'} unit="°C" />
        </View>
        <SourceLine brands={[m.provenance?.[today]?.respRate, m.provenance?.[today]?.spo2, m.provenance?.[today]?.tempDev]} />
      </Card>
      <Insights items={sleepInsights(m, today)} />
      <Button label="Sleep log and sound check" kind="ghost" compact icon="moon" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/sleep')} />
      <Note text="Wearables estimate sleep stages from movement and heart rate; they are useful for your own trend but are not a sleep study. Blood oxygen readings from a ring or watch are wellness estimates. Loud snoring, gasping, or feeling unrefreshed despite enough time in bed are worth raising with a clinician." />
    </Screen>
  );
}

function ZoneBar({ zones }: { zones: number[] }) {
  const total = zones.reduce((a, b) => a + b, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      {zones.map((z, i) => (
        <View key={i} style={{ width: `${(z / total) * 100}%`, backgroundColor: zoneColors[i] }} />
      ))}
    </View>
  );
}

function LoadDetail() {
  const c = useTheme();
  const m = useMeasure();
  const move = useMove();
  const today = dayKey();
  const lb = loadBalance(m, move, today);
  const ev = eventsOf(m);
  const dm = dayMetrics(m, today);
  const color = c.pillar.move;
  const recent = ev.workouts.slice(0, 8);
  return (
    <Screen title="Strain and load" subtitle="How hard you have trained, against your own recent weeks" color={color} accentBar testID="mon-detail-load">
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          <Stat label="This week, per day" value={String(lb.acute)} sub="load points" color={color} />
          <Stat label="4-week average" value={String(lb.chronic)} sub="load points" />
          <Stat label="Balance" value={lb.ratio === null ? '–' : `${lb.ratio.toFixed(1)}×`} />
        </View>
        <Note tone={toneOf(lb.tone)} text={lb.words} />
      </Card>
      {dm.vendorStrain !== undefined || dm.vendorLoad !== undefined ? (
        <Card style={{ marginTop: 12 }}>
          <T variant="caption">As your devices report it today</T>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {dm.vendorStrain !== undefined ? <Stat label="WHOOP strain" value={dm.vendorStrain.toFixed(1)} sub="0 to 21" /> : null}
            {dm.vendorLoad !== undefined ? <Stat label="Garmin training load" value={String(Math.round(dm.vendorLoad))} /> : null}
          </View>
        </Card>
      ) : null}
      <SectionTitle>Daily load, 4 weeks</SectionTitle>
      <Card>
        <Bars data={lb.series.map((x) => ({ label: shortDate(x.date), value: x.load }))} color={color} testID="load-bars" />
        <T variant="caption" style={{ marginTop: 6 }}>
          Load is minutes in each heart rate zone weighted 1 to 5, or minutes × effort ÷ 2 for sessions without heart rate.
        </T>
      </Card>
      <SectionTitle>Recent workouts from devices</SectionTitle>
      <Card testID="device-workouts">
        {recent.length ? (
          recent.map((w, i) => (
            <View key={w.id}>
              {i ? <Divider /> : null}
              <View style={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T variant="bodyStrong">{w.label}</T>
                  <T variant="caption">{shortDate(dayKey(w.start))}</T>
                </View>
                <T variant="caption">
                  {Math.round((w.end - w.start) / 60000)} min{w.avgHr ? ` · avg ${w.avgHr} bpm` : ''}
                  {w.kcal ? ` · ${w.kcal} kcal` : ''} · {brandName(w.origin)}
                </T>
                {w.zones ? <ZoneBar zones={w.zones} /> : null}
              </View>
            </View>
          ))
        ) : (
          <T variant="small" color={c.muted}>
            Workouts from a watch or strap appear here with their heart rate zones.
          </T>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          {ZONE_NAMES.map((n, i) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: zoneColors[i] }} />
              <T variant="caption">
                Zone {i + 1} {n}
              </T>
            </View>
          ))}
        </View>
      </Card>
      <Button label="Live heart rate with a strap" icon="activity" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/move-live' as never)} testID="load-live" />
    </Screen>
  );
}

function TargetFields({ fields, onSave, saved }: { fields: { key: string; label: string; value: string; set: (v: string) => void; keyboard?: 'number-pad' | 'default' }[]; onSave: () => void; saved: boolean }) {
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 }}>
        {fields.map((f) => (
          <View key={f.key} style={{ flexGrow: 1, flexBasis: f.keyboard === 'default' ? '100%' : '30%' }}>
            <Field label={f.label} value={f.value} onChangeText={f.set} keyboardType={f.keyboard ?? 'number-pad'} testID={`target-${f.key}`} />
          </View>
        ))}
      </View>
      <Button label={saved ? 'Saved' : 'Save targets'} icon="check" compact kind="secondary" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={onSave} testID="target-save" />
    </>
  );
}

function GlucoseDetail() {
  const c = useTheme();
  const m = useMeasure();
  const mon = useMonitor();
  const t = mon.targets;
  const [low, setLow] = useState(String(t.glucoseLow));
  const [high, setHigh] = useState(String(t.glucoseHigh));
  const [by, setBy] = useState(t.glucoseSetBy || '');
  const [saved, setSaved] = useState(false);
  const ev = eventsOf(m);
  const now = Date.now();
  const color = '#D2691E';
  const day = ev.glucose.filter((r) => r.t >= now - 86400_000);
  const stats = glucoseStats(ev.glucose, now - 14 * 86400_000, now, t);
  const daily = glucoseDaily(ev.glucose, 14, t);
  const latest = ev.glucose[ev.glucose.length - 1];
  const demo = useSettings((x) => x.demo);
  // While this screen is open, fetch new readings as soon as the sensor's app has shared them.
  useEffect(() => {
    if (demo) return;
    void syncNow();
    const id = setInterval(() => void syncNow(), 5 * 60_000);
    return () => clearInterval(id);
  }, [demo]);
  const age = latest ? Math.max(0, Math.round((now - latest.t) / 60_000)) : null;
  const fuel = useFuel();
  const since = now - 14 * 86400_000;
  const meals = mealResponses(ev.glucose, fuel.meals, ev.workouts, now).filter((r) => r.t >= since);
  const sessions = workoutResponses(ev.glucose, ev.workouts, now, fuel.meals).filter((w) => w.t >= since);
  const patterns = mealPatterns(meals);
  const pairs = [patterns.moved, patterns.protein, patterns.plants, patterns.packaged].filter((x): x is NonNullable<typeof x> => !!x);
  const [open, setOpen] = useState<string | null>(null);
  const averages = mealAverages(meals);
  const spotted = spottedMeals(ev.glucose, fuel.meals, { since, now, ignore: mon.notMeals }).slice(0, 5);
  const [marked, setMarked] = useState<number | null>(null);
  const shown = meals.find((r) => r.id === open) ?? meals.find((r) => r.at2h !== null) ?? meals[0];
  const mealIdx = shown ? shown.curve.reduce((best, p, i) => (Math.abs(p.min) < Math.abs(shown.curve[best].min) ? i : best), 0) : 0;
  return (
    <Screen title="Glucose" subtitle="Readings from your glucose sensor, shown as reported" color={color} accentBar testID="mon-detail-glucose">
      <View testID="glucose-warnings">
        <Insights items={glucoseWarnings(ev.glucose, t, now, clockOf)} />
      </View>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T variant="heading">Last 24 hours</T>
          <T variant="caption">mg/dL</T>
        </View>
        <LineChart data={day.map((r) => ({ label: hourShort(r.t), value: r.mgdl }))} color={color} band={[t.glucoseLow, t.glucoseHigh]} testID="glucose-chart" />
        <T variant="caption">{latest ? `Latest ${latest.mgdl} mg/dL at ${clockOf(latest.t)} (${age! < 60 ? `${age} min ago` : `${Math.round(age! / 60)} h ago`}) · ${brandName(latest.origin)}. New readings appear here as soon as your sensor’s app shares them; this screen checks every five minutes while it is open.` : 'No readings yet.'}</T>
      </Card>
      {stats ? (
        <>
          <SectionTitle>Last 14 days</SectionTitle>
          <Card testID="glucose-stats">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
              <Stat label="Time in range" value={`${stats.inRange}%`} color={c.ok} />
              <Stat label="Below range" value={`${stats.below}%`} />
              <Stat label="Above range" value={`${stats.above}%`} />
              <Stat label="Average" value={String(stats.avg)} unit="mg/dL" />
              <Stat label="Variability" value={`${stats.cv}%`} sub="coefficient of variation" />
              <Stat label="Readings" value={stats.n.toLocaleString('en-US')} />
            </View>
            <SectionTitle>Time in range by day</SectionTitle>
            <Bars data={daily.map((d) => ({ label: weekdayShort(d.date), value: d.inRange }))} color={c.ok} max={100} unit="%" testID="glucose-tir" />
          </Card>
          <Insights items={glucoseInsights(stats, t)} />
        </>
      ) : null}
      <SectionTitle>With your meals</SectionTitle>
      <Card testID="glucose-mark">
        {averages ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginBottom: 12 }}>
            <Stat label="Before meals" value={String(averages.before)} unit="mg/dL" sub={`average, ${averages.n} meals`} />
            <Stat label="2 hours after" value={averages.at2h === null ? '–' : String(averages.at2h)} unit={averages.at2h === null ? undefined : 'mg/dL'} sub={averages.n2h ? `${averages.settled} of ${averages.n2h} back near the start` : 'not in yet'} color={color} />
          </View>
        ) : null}
        <T variant="small" color={c.muted}>
          Mark the moment you start eating. Coressence keeps your reading from just before and the one two hours after, side by side.
        </T>
        <Button
          label={marked ? `Marked at ${clockOf(marked)}` : 'I’m eating now'}
          icon={marked ? 'check' : 'clock'}
          compact
          disabled={!!marked}
          style={{ marginTop: 12, alignSelf: 'flex-start' }}
          onPress={() => {
            const at = Date.now();
            logMeal(mealAt(at));
            setMarked(at);
          }}
          testID="glucose-eating-now"
        />
        {marked ? (
          <T variant="caption" style={{ marginTop: 8 }}>
            Your two-hour reading appears here once your sensor has shared it. Add what you ate in Fuel if you like.
          </T>
        ) : null}
      </Card>
      {spotted.length ? (
        <Card style={{ marginTop: 10 }} testID="glucose-spotted">
          <T variant="heading">Did you eat around these times?</T>
          <T variant="small" color={c.muted}>
            Your glucose rose here and no meal was marked. Confirm the ones that were meals and they join your list.
          </T>
          {spotted.map((r, i) => (
            <View key={r.id} style={{ marginTop: 10 }}>
              {i ? <Divider /> : null}
              <T variant="body" style={{ marginTop: i ? 10 : 0 }}>{`${weekdayShort(dayKey(r.t))} ${clockOf(r.t)} · ${r.before} to ${r.peak} (+${r.rise})${r.at2h === null ? '' : ` · 2 h ${r.at2h}`}`}</T>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button label="Yes, a meal" icon="check" compact kind="secondary" onPress={() => logMeal(mealAt(r.t, 'Marked from a glucose rise'))} testID={`spot-yes-${i}`} />
                <Button label="Not a meal" compact kind="ghost" onPress={() => dismissSpike(r.t)} testID={`spot-no-${i}`} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <View style={{ height: 10 }} />
      {shown ? (
        <>
          <Card testID="glucose-meal">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T variant="heading">{`${shown.kind[0].toUpperCase()}${shown.kind.slice(1)}, ${shortDate(dayKey(shown.t))} at ${clockOf(shown.t)}`}</T>
              <T variant="caption">mg/dL</T>
            </View>
            {shown.name ? <T variant="small" color={c.muted}>{shown.name}</T> : null}
            <LineChart data={shown.curve.map((p, i) => ({ label: i === mealIdx ? 'Meal' : i === 0 || i === shown.curve.length - 1 ? `${p.min > 0 ? '+' : ''}${p.min} min` : '', value: p.mgdl }))} color={color} band={[t.glucoseLow, t.glucoseHigh]} height={130} testID="glucose-meal-chart" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginTop: 6 }}>
              <Stat label="Before" value={String(shown.before)} unit="mg/dL" />
              <Stat label="Peak" value={String(shown.peak)} sub={`after ${shown.minutesToPeak} min`} />
              <Stat label="Rise" value={`+${shown.rise}`} color={color} />
              <Stat label="At 2 hours" value={shown.at2h === null ? '–' : String(shown.at2h)} />
            </View>
            {shown.movedAfter ? <Badge text="You moved within 90 minutes" color={c.ok} /> : null}
          </Card>
          <Card style={{ marginTop: 10 }} testID="glucose-meal-list">
            <T variant="heading">Recent meals</T>
            {meals.slice(0, 8).map((r, i) => (
              <React.Fragment key={r.id}>
                {i ? <Divider /> : null}
                <T variant="small" onPress={() => setOpen(r.id)} testID={`glucose-meal-${i}`} style={{ paddingVertical: 8 }} color={r.id === shown.id ? color : c.ink}>
                  {`${weekdayShort(dayKey(r.t))} ${clockOf(r.t)} · ${r.kind} · before ${r.before} · peak ${r.peak} · 2 h ${r.at2h ?? '–'}${r.movedAfter ? ' · moved after' : ''}`}
                </T>
              </React.Fragment>
            ))}
          </Card>
          {patterns.byKind.length ? (
            <Card style={{ marginTop: 10 }} testID="glucose-meal-kinds">
              <T variant="heading">Average rise by meal</T>
              <Bars data={patterns.byKind.map((g) => ({ label: g.label, value: g.rise }))} color={color} unit=" mg/dL" valueLabels height={120} />
            </Card>
          ) : null}
          {pairs.length ? (
            <Card style={{ marginTop: 10 }} testID="glucose-meal-pairs">
              <T variant="heading">Your meals, side by side</T>
              {pairs.map((pr, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 10 }}>
                  {pr.map((g) => (
                    <Stat key={g.label} label={g.label} value={`+${g.rise}`} unit="mg/dL" sub={`${g.n} meals`} />
                  ))}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <Card testID="glucose-meal-empty">
          <T variant="small" color={c.muted}>
            Log a meal in Fuel and Coressence will show your glucose for the two hours after it: where you started, how high it went and how fast it settled.
          </T>
          <Button label="Log a meal" icon="coffee" compact kind="secondary" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/fuel' as never)} testID="glucose-log-meal" />
        </Card>
      )}
      <SectionTitle>With your workouts</SectionTitle>
      {sessions.length ? (
        <Card testID="glucose-workouts">
          {sessions.slice(0, 8).map((w, i) => (
            <React.Fragment key={w.id}>
              {i ? <Divider /> : null}
              <View style={{ paddingVertical: 8 }}>
                <T variant="body">{`${w.label}, ${w.minutes} min · ${weekdayShort(dayKey(w.t))} ${clockOf(w.t)}`}</T>
                <T variant="small" color={c.muted}>
                  {`Before ${w.before} · lowest ${w.lowest}${w.after === null ? '' : ` · hour after ${w.after} (${w.change! > 0 ? '+' : ''}${w.change})`} mg/dL${w.mealNearby ? ' · meal nearby' : ''}`}
                </T>
              </View>
            </React.Fragment>
          ))}
        </Card>
      ) : (
        <Card testID="glucose-workouts-empty">
          <T variant="small" color={c.muted}>
            Record a workout or walk on your watch and Coressence will show your glucose before, during and for the hour after it.
          </T>
        </Card>
      )}
      <Insights items={glucoseLifeInsights(meals, sessions)} />
      <SectionTitle>Your range</SectionTitle>
      <Card>
        <T variant="small" color={c.muted}>
          70–180 mg/dL is the range glucose sensor reports use by default. If your clinician gave you a different range, enter it here.
        </T>
        <TargetFields
          saved={saved}
          fields={[
            { key: 'glow', label: 'Low (mg/dL)', value: low, set: setLow },
            { key: 'ghigh', label: 'High (mg/dL)', value: high, set: setHigh },
            { key: 'gby', label: 'Set by (optional)', value: by, set: setBy, keyboard: 'default' },
          ]}
          onSave={() => {
            const lo = Number(low);
            const hi = Number(high);
            if (lo >= 40 && hi > lo && hi <= 400) saveTargets({ glucoseLow: lo, glucoseHigh: hi, glucoseSetBy: by.trim() || undefined });
            setSaved(true);
          }}
        />
      </Card>
      <Note text="Glucose readings are shown for your information and are not for treatment decisions. Readings shared from Dexcom through a direct connection arrive about one hour late in the US. If you use insulin or other glucose-lowering medicine, follow your clinician’s plan and your sensor’s own app for alerts." />
    </Screen>
  );
}

function BpDetail() {
  const c = useTheme();
  const m = useMeasure();
  const mon = useMonitor();
  const t = mon.targets;
  const [sys, setSys] = useState(t.bpSys ? String(t.bpSys) : '');
  const [dia, setDia] = useState(t.bpDia ? String(t.bpDia) : '');
  const [by, setBy] = useState(t.bpSetBy || '');
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState<Range>(30);
  const today = dayKey();
  const readings = bpReadings(m);
  const s = bpSummary(readings, t);
  const days = lastDays(range, today);
  const byDay = (d: string, k: 'sys' | 'dia') => {
    const xs = readings.filter((r) => dayKey(r.t) === d);
    return xs.length ? Math.round(xs.reduce((a, r) => a + r[k], 0) / xs.length) : null;
  };
  const color = c.danger;
  return (
    <Screen title="Blood pressure" subtitle="Your home readings and trend, against your clinician’s targets" color={color} accentBar testID="mon-detail-bp">
      <Insights items={bpInsights(readings, t).filter((i) => i.tone === 'danger')} />
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          <Stat label="Latest" value={readings[0] ? `${readings[0].sys}/${readings[0].dia}` : '–'} sub={readings[0] ? `${shortDate(dayKey(readings[0].t))} · ${brandName(readings[0].origin)}` : undefined} />
          <Stat label="7-day average" value={s.week ? `${s.week.sys}/${s.week.dia}` : '–'} sub={s.week ? `${s.week.n} readings` : undefined} />
          <Stat label="30-day average" value={s.month ? `${s.month.sys}/${s.month.dia}` : '–'} sub={s.month ? `${s.month.n} readings` : undefined} />
        </View>
        {s.hasTargets ? (
          <T variant="caption" style={{ marginTop: 8 }}>
            Targets {t.bpSys}/{t.bpDia}
            {t.bpSetBy ? `, set by ${t.bpSetBy}` : ''} · {s.aboveCount} of {s.recentCount} readings in the last 14 days were above them
          </T>
        ) : null}
      </Card>
      <SectionTitle>Daily average</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <MultiLine
          labels={days.map((d) => (range <= 7 ? weekdayShort(d) : shortDate(d)))}
          series={[
            { values: days.map((d) => byDay(d, 'sys')), color: c.danger, target: t.bpSys },
            { values: days.map((d) => byDay(d, 'dia')), color: c.accent, target: t.bpDia },
          ]}
          testID="bp-chart"
        />
        <T variant="caption">Top line: systolic. Bottom line: diastolic. Dashed lines: your targets.</T>
      </Card>
      <Insights items={bpInsights(readings, t).filter((i) => i.tone !== 'danger')} />
      <SectionTitle>Recent readings</SectionTitle>
      <Card testID="bp-list">
        {readings.slice(0, 10).map((r, i) => (
          <View key={r.t + '-' + i}>
            {i ? <Divider /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }}>
              <View>
                <T variant="bodyStrong" color={s.above(r) ? c.warn : c.ink}>
                  {r.sys}/{r.dia}
                  {r.pulse ? `  ·  ${r.pulse} bpm` : ''}
                </T>
                <T variant="caption">{brandName(r.origin)}</T>
              </View>
              <T variant="caption">
                {shortDate(dayKey(r.t))} {clockOf(r.t)}
              </T>
            </View>
          </View>
        ))}
        {!readings.length ? (
          <T variant="small" color={c.muted}>
            Add a reading in Measure or connect a cuff (Withings, Omron through Apple Health or Health Connect).
          </T>
        ) : null}
      </Card>
      <SectionTitle>Targets from your clinician</SectionTitle>
      <Card>
        <TargetFields
          saved={saved}
          fields={[
            { key: 'sys', label: 'Top number', value: sys, set: setSys },
            { key: 'dia', label: 'Bottom number', value: dia, set: setDia },
            { key: 'by', label: 'Set by (for example, Dr. Lee, May 2026)', value: by, set: setBy, keyboard: 'default' },
          ]}
          onSave={() => {
            const a = Number(sys);
            const b = Number(dia);
            if (a >= 90 && a <= 200 && b >= 50 && b <= 130) saveTargets({ bpSys: a, bpDia: b, bpSetBy: by.trim() || undefined });
            setSaved(true);
          }}
        />
      </Card>
      <Note text="For a reliable home reading: sit quietly for five minutes, back supported, feet flat, arm resting at heart level, and take two readings a minute apart. Coressence compares readings only with the targets you enter and never measures blood pressure with the phone." />
    </Screen>
  );
}

function BodyDetail() {
  const c = useTheme();
  const m = useMeasure();
  const units = useSettings((s) => s.units);
  const [range, setRange] = useState<Range>(90);
  const today = dayKey();
  const conv = (v: number | null, kg: boolean) => (v === null ? null : kg && units === 'us' ? kgToLb(v) : v);
  const rows = [
    { k: 'weightKg' as const, title: 'Weight', unit: units === 'us' ? 'lb' : 'kg', kg: true, color: c.teal },
    { k: 'bodyFatPct' as const, title: 'Body fat', unit: '%', kg: false, color: '#D2691E' },
    { k: 'leanKg' as const, title: 'Lean mass', unit: units === 'us' ? 'lb' : 'kg', kg: true, color: c.accent },
  ];
  return (
    <Screen title="Body composition" subtitle="Weight, body fat and lean mass from a smart scale" color={c.teal} accentBar testID="mon-detail-body">
      <RangePicker value={range} onChange={setRange} />
      {rows.map((r) => {
        const tr = bodyTrend(m, r.k, range, today);
        const ch = conv(tr.change, r.kg);
        return (
          <Card key={r.k} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T variant="heading">{r.title}</T>
              <T variant="caption">
                {tr.latest !== null ? `${conv(tr.latest, r.kg)!.toFixed(1)} ${r.unit}` : '–'}
                {ch !== null ? `  ·  ${ch > 0 ? '+' : ''}${ch.toFixed(1)} ${r.unit} over ${range} days` : ''}
              </T>
            </View>
            <LineChart data={tr.series.map((x) => ({ label: shortDate(x.date), value: conv(x.value, r.kg) }))} color={r.color} decimals={1} />
          </Card>
        );
      })}
      <SourceLine brands={[m.provenance?.[Object.keys(m.provenance || {}).sort().reverse().find((d) => m.provenance![d].weightKg) || '']?.weightKg]} />
      <Note text="Scales estimate body fat and lean mass from a small electrical signal, and hydration shifts the numbers day to day. Weigh at the same time each morning and look at the trend over weeks." />
    </Screen>
  );
}

function CycleDetail() {
  const c = useTheme();
  const m = useMeasure();
  const mon = useMonitor();
  const today = dayKey();
  const ev = eventsOf(m);
  const cs = cycleState(ev.cycle, today);
  const ps = periods(ev.cycle).slice(-6).reverse();
  return (
    <Screen title="Cycle" subtitle="Cycle-aware context for sleep, temperature and readiness" color={MONITOR_COLOR} accentBar testID="mon-detail-cycle">
      <Card>
        <ToggleRow title="Cycle tracking" subtitle="Reads period days from Apple Health, Health Connect, Oura or Garmin" value={mon.cycleOn || !!ev.cycle.length} onChange={setCycleOn} testID="cycle-toggle" />
      </Card>
      {cs ? (
        <Card style={{ marginTop: 12 }} testID="cycle-state">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
            <Stat label="Cycle day" value={String(cs.day)} color={MONITOR_COLOR} />
            <Stat label="Average length" value={String(cs.avgLen)} unit="days" sub={`last ${cs.lengths.length} cycles`} />
            <Stat label="Next period (estimate)" value={shortDate(cs.nextStart)} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Badge text={PHASE_LABEL[cs.phase]} color={MONITOR_COLOR} />
          </View>
        </Card>
      ) : (
        <Note text="When period days are logged in Apple Health, Health Connect or a connected ring or watch, Coressence shows where you are in your cycle and adds that context to sleep and readiness." />
      )}
      <Insights items={cycleInsights(cs, m, today)} />
      {ps.length ? (
        <>
          <SectionTitle>Recent periods</SectionTitle>
          <Card>
            {ps.map((p, i) => (
              <View key={p.start}>
                {i ? <Divider /> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }}>
                  <T variant="small">{shortDate(p.start)}</T>
                  <T variant="caption">{Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86400000) + 1} days</T>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <Note text="Dates and phases are estimates from your own history. They are not for preventing or planning pregnancy. Coressence never shares cycle data and does not use it for advertising." />
      <T variant="caption" color={c.muted} style={{ marginTop: 8 }}>
        Phases: period, follicular (after the period), around ovulation (about 14 days before the next period), luteal (the second half).
      </T>
    </Screen>
  );
}

function RhythmDetail() {
  const c = useTheme();
  const m = useMeasure();
  const ev = eventsOf(m);
  const list = rhythmHistory(ev.ecg, ev.rhythm);
  return (
    <Screen title="Heart rhythm records" subtitle="ECG results and rhythm notifications, as your watch reported them" color={c.danger} accentBar testID="mon-detail-rhythm">
      <Insights items={rhythmInsights(ev.ecg, ev.rhythm)} />
      <Card style={{ marginTop: 12 }} testID="rhythm-list">
        {list.length ? (
          list.map((r, i) => (
            <View key={r.id}>
              {i ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <Feather name={r.kind === 'ecg' ? 'activity' : 'bell'} size={18} color={r.flag ? c.warn : c.muted} />
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{r.title}</T>
                  <T variant="caption">
                    {r.detail} · {brandName(r.origin)}
                  </T>
                </View>
                <T variant="caption">
                  {shortDate(dayKey(r.t))}
                  {'\n'}
                  {clockOf(r.t)}
                </T>
              </View>
            </View>
          ))
        ) : (
          <T variant="small" color={c.muted}>
            No ECG recordings or rhythm notifications yet. They appear here from Apple Watch, Fitbit, Pixel Watch, Samsung Galaxy Watch or Withings ScanWatch once connected.
          </T>
        )}
      </Card>
      <Note text={`Results are listed exactly as the device’s own ECG app or notification reported them (${Object.values(ECG_LABEL).slice(0, 3).join(', ')} and so on). Coressence does not look at the recording itself and does not diagnose heart conditions. Bring this list to your clinician. If you have chest pain, fainting or trouble breathing, call 911.`} />
    </Screen>
  );
}
