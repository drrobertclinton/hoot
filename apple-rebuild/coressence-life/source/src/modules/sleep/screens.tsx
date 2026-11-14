// Sleep: nightly log, trends, and results from the sleep sound check.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Bars, NightTimeline } from '@core/charts';
import { LockCard, RangePicker, type Range } from '@core/gate';
import { usePremium } from '@core/billing/billing';
import { clock, clockOf, dayKey, durationWords, fmtHm, hm, shortDate, sleepHours, weekdayShort, longDate } from '@core/dates';
import { useSettings } from '@core/settings';
import { moduleColor, useTheme, type Palette } from '@core/theme';
import { Badge, Button, Card, Note, Scale, Screen, SectionTitle, Stat, Stepper, T } from '@core/ui';
import { useMeasure } from '../measure/state';
import { avgSleep, bedtimeSpread, hoursFor, sleepScore, sleepSeries } from './model';
import { interpret, patternAdvice, type SoundKind } from './noise';
import { deleteNight, saveSleepLog, useSleep } from './state';
import { deviceSleep } from '../life/today';

export const kindColor = (c: Palette) => (k: string) => (k === 'rhythmic' ? c.pillar.sleep : k === 'pause-loud' ? c.danger : k === 'sustained' ? c.pillar.fuel : c.muted);
const KIND_LABEL: Record<SoundKind, string> = { rhythmic: 'Rhythmic (snoring-like)', 'pause-loud': 'Pause, then loud', sustained: 'Longer sound', brief: 'Short sound' };

export function SleepScreen() {
  const c = useTheme();
  const s = useSleep();
  const m = useMeasure();
  const goals = useSettings((x) => x.goals);
  const premium = usePremium();
  const params = useLocalSearchParams<{ add?: string }>();
  const today = dayKey();
  const log = s.logs[today];
  const [editing, setEditing] = useState(!!params.add || false);
  const [bed, setBed] = useState(log ? hm(log.bed) : 23 * 60);
  const [wake, setWake] = useState(log ? hm(log.wake) : 7 * 60);
  const [quality, setQuality] = useState<number | null>(log?.quality ?? 3);
  const [awakenings, setAwakenings] = useState(log?.awakenings ?? 0);
  const [range, setRange] = useState<Range>(7);
  const color = moduleColor(c, 'sleep');
  const ds = deviceSleep(m);
  const hours = hoursFor(s, today, ds[today]);
  const score = sleepScore(hours, log?.quality ?? null, goals.sleepHours);
  const avg = avgSleep(s, 7, ds, today);
  const spread = bedtimeSpread(s, today);
  const advice = patternAdvice(s.nights);
  const nights = premium ? s.nights : s.nights.slice(0, 3);

  return (
    <Screen title="Sleep" subtitle="Your nights, your rhythm, and the sound check" color={color} accentBar testID="sleep">
      <Card>
        <T variant="label" color={color}>
          Last night
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <T variant="display">{hours !== null ? durationWords(hours * 60) : 'Not logged'}</T>
          {score !== null ? <Badge text={`${Math.round(score * 100)}% of ring`} color={color} /> : null}
        </View>
        {log ? (
          <T variant="small" color={c.muted}>
            {clock(log.bed)} to {clock(log.wake)} · felt {log.quality}/5 · woke {log.awakenings} time{log.awakenings === 1 ? '' : 's'}
          </T>
        ) : hours !== null ? (
          <T variant="small" color={c.muted}>
            From your device
          </T>
        ) : null}
        {!editing ? <Button label={log ? 'Edit last night' : 'Log last night'} icon="edit-3" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => setEditing(true)} testID="sleep-log" /> : null}
      </Card>

      {editing ? (
        <Card style={{ marginTop: 12 }} testID="sleep-form">
          <Stepper label="In bed" display={clock(fmtHm(bed))} value={bed} step={15} min={-9999} max={9999} onChange={(v) => setBed((v + 1440) % 1440)} testID="bed" />
          <Stepper label="Woke up" display={clock(fmtHm(wake))} value={wake} step={15} min={-9999} max={9999} onChange={(v) => setWake((v + 1440) % 1440)} testID="wake" />
          <T variant="caption">{durationWords(sleepHours(fmtHm(bed), fmtHm(wake)) * 60)} in bed</T>
          <Scale label="How rested do you feel?" value={quality} onChange={setQuality} low="Not at all" high="Fully" color={color} />
          <Stepper label="Times you woke up" value={awakenings} onChange={setAwakenings} min={0} max={20} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label="Save"
              icon="check"
              compact
              testID="sleep-save"
              onPress={() => {
                saveSleepLog({ date: today, bed: fmtHm(bed), wake: fmtHm(wake), quality: quality ?? 3, awakenings });
                setEditing(false);
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setEditing(false)} />
          </View>
        </Card>
      ) : null}

      {m.synced[today]?.sleepDeepH !== undefined || m.synced[today]?.bedMin !== undefined ? (
        <Card style={{ marginTop: 12 }} onPress={() => router.push('/monitor/sleep' as never)} testID="sleep-stages-link">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="layers" size={18} color={color} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">Sleep stages and consistency</T>
              <T variant="caption">
                {m.synced[today]?.sleepDeepH !== undefined ? `Deep ${m.synced[today].sleepDeepH!.toFixed(1)} h · REM ${(m.synced[today].sleepRemH ?? 0).toFixed(1)} h last night, from your device` : 'From your device'}
              </T>
            </View>
            <Feather name="chevron-right" size={18} color={c.muted} />
          </View>
        </Card>
      ) : null}

      <SectionTitle>Hours per night</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <Bars data={sleepSeries(s, range, ds, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value === null ? null : Math.round(x.value * 10) / 10 }))} color={color} goal={goals.sleepHours} unit=" h" testID="sleep-chart" />
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Stat label="7-day average" value={avg === null ? '–' : avg.toFixed(1)} unit="h" />
          <Stat label="Bedtime spread" value={spread === null ? '–' : String(spread)} unit="min" sub="Lower is steadier" />
        </View>
      </Card>

      <SectionTitle>Sleep sound check</SectionTitle>
      <Card testID="sound-card">
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="mic" size={19} color={color} />
          </View>
          <T variant="small" color={c.inkSoft} style={{ flex: 1 }}>
            Leave your phone on the nightstand, plugged in. It measures loudness through the night and shows when snoring-like or other sounds happened. No audio is kept.
          </T>
        </View>
        <Button label={Platform.OS === 'web' ? 'Start a sound check (phone app)' : 'Start a sound check'} icon="moon" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/sleep/record')} testID="sound-start" color={color} />
      </Card>
      {advice ? <Note tone="warn" text={advice} /> : null}
      {nights.map((n) => (
        <Card key={n.id} style={{ marginTop: 10 }} onPress={() => router.push(`/sleep/${n.id}`)} testID={`night-${n.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <T variant="bodyStrong">{longDate(n.date)}</T>
              <T variant="caption">
                {clockOf(n.start)} to {clockOf(n.end)} · {durationWords(n.summary.minutes)}
              </T>
            </View>
            <Badge text={n.summary.level === 'quiet' ? 'Quiet' : n.summary.level === 'some' ? 'Some snoring-like sound' : 'Frequent loud sound'} color={n.summary.level === 'frequent' ? c.danger : n.summary.level === 'some' ? c.pillar.fuel : c.ok} />
          </View>
          <View style={{ marginTop: 8 }}>
            <NightTimeline buckets={n.buckets} events={n.events} start={n.start} end={n.end} height={56} color={c.muted} eventColor={kindColor(c)} hourLabel={() => ''} />
          </View>
        </Card>
      ))}
      {!premium && s.nights.length > 3 ? <LockCard title="Older nights" text="The free plan shows your three most recent sound checks. Coressence+ keeps every night." reason="history" /> : null}
      <Note text="Adults generally need 7 or more hours of sleep a night (American Academy of Sleep Medicine). The sound check is not a medical test and cannot diagnose a sleep disorder." />
    </Screen>
  );
}

export function NightScreen() {
  const c = useTheme();
  const s = useSleep();
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = s.nights.find((x) => x.id === id);
  if (!n)
    return (
      <Screen title="Night">
        <T>That night is no longer saved.</T>
      </Screen>
    );
  const kc = kindColor(c);
  const lines = interpret(n.summary);
  const counts: [SoundKind, number][] = [
    ['rhythmic', n.events.filter((e) => e.kind === 'rhythmic').length],
    ['pause-loud', n.summary.pauseLoud],
    ['sustained', n.summary.sustained],
    ['brief', n.summary.brief],
  ];
  const notable = n.events.filter((e) => e.kind !== 'rhythmic').slice(0, 12);
  return (
    <Screen title={longDate(n.date)} subtitle={`${clockOf(n.start)} to ${clockOf(n.end)} · ${durationWords(n.summary.minutes)}`} color={c.pillar.sleep} accentBar testID="night">
      <Card>
        <T variant="label">Night timeline</T>
        <View style={{ marginTop: 8 }}>
          <NightTimeline buckets={n.buckets} events={n.events} start={n.start} end={n.end} height={150} color={c.muted} eventColor={kc} hourLabel={(t) => clockOf(t).replace(':00', '').replace(' ', '')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {counts.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: kc(k) }} />
              <T variant="caption">
                {KIND_LABEL[k]} {k === 'rhythmic' ? `${Math.round(n.summary.rhythmicMinutes)} min` : v}
              </T>
            </View>
          ))}
        </View>
      </Card>
      <SectionTitle>What we noticed</SectionTitle>
      <Card testID="night-interpretation">
        {lines.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: i ? 10 : 0 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.pillar.sleep, marginTop: 9 }} />
            <T variant="body" style={{ flex: 1 }}>
              {l}
            </T>
          </View>
        ))}
      </Card>
      {n.summary.level === 'frequent' ? (
        <Note tone="warn" text="If loud snoring happens on most nights, or someone notices pauses, gasping or choking, or you feel very sleepy during the day, talk with a clinician. A sleep study is the way to find out what is going on." />
      ) : null}
      {notable.length ? (
        <>
          <SectionTitle>Moments</SectionTitle>
          <Card padded={false}>
            {notable.map((e, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: kc(e.kind) }} />
                <T variant="bodyStrong" style={{ width: 86 }}>
                  {clockOf(e.start)}
                </T>
                <T variant="small" color={c.inkSoft} style={{ flex: 1 }}>
                  {KIND_LABEL[e.kind]}
                </T>
                <T variant="caption">{Math.max(1, Math.round((e.end - e.start) / 1000))} s</T>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <T variant="caption" style={{ marginTop: 14 }}>
        Room quiet level about {n.summary.baselineDb} dB; sounds above {n.summary.thresholdDb} dB counted as loud (phone microphone levels, not calibrated).
      </T>
      <Pressable onPress={() => { deleteNight(n.id); router.back(); }} style={{ marginTop: 18 }}>
        <T variant="small" color={c.danger}>
          Delete this night
        </T>
      </Pressable>
    </Screen>
  );
}
