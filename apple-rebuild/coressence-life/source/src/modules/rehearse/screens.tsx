// Rehearse / Perform: warmups, voice health log, performances and a pre-show checklist.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bars, LineChart } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { usePremium } from '@core/billing/billing';
import { clock, dayKey, longDate, shortDate, weekdayShort } from '@core/dates';
import { routineMinutes } from '@core/routine';
import { moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Note, Scale, Screen, SectionTitle, Stepper, T, ToggleRow } from '@core/ui';
import { usePlan } from '../plan/state';
import { voiceAdvice, voiceSeries, warmupStreak } from './model';
import { saveVoice, useRehearse } from './state';
import { WARMUPS } from './warmups';

const CHECKLIST = ['Warmup done', 'Water bottle filled', 'Meal 2–3 hours before', 'Costume and props checked', 'Two minutes of slow breathing'];

export function RehearseScreen() {
  const c = useTheme();
  const s = useRehearse();
  const plan = usePlan();
  const premium = usePremium();
  const today = dayKey();
  const cur = s.voice[today];
  const [hours, setHours] = useState(cur?.voiceHours ?? 2);
  const [hoarse, setHoarse] = useState<number | null>(cur?.hoarseness ?? 0);
  const [warm, setWarm] = useState(cur?.warmedUp ?? false);
  const [rest, setRest] = useState(cur?.restMinutes ?? 0);
  const [saved, setSaved] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const [range, setRange] = useState<Range>(7);
  const color = moduleColor(c, 'rehearse');
  const advice = voiceAdvice(s, today);
  const shows = plan.items.filter((i) => (i.kind === 'performance' || i.kind === 'rehearsal') && i.date >= today && !i.done).slice(0, 4);
  const lbl = (d: string) => (range <= 7 ? weekdayShort(d) : shortDate(d));

  return (
    <Screen title="Rehearse" subtitle="Warmups and voice care for performers" color={color} accentBar testID="rehearse">
      <SectionTitle>Warmups</SectionTitle>
      {WARMUPS.map((r) => {
        const locked = r.premium && !premium;
        return (
          <Card key={r.id} style={{ marginBottom: 10 }} onPress={() => (locked ? router.push({ pathname: '/plus', params: { reason: 'routines' } }) : router.push(`/routine/${r.id}`))} testID={`warmup-${r.id}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={r.kind === 'voice' ? 'mic' : 'zap'} size={19} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{r.title}</T>
                <T variant="caption">
                  {routineMinutes(r)} min · {r.level}
                </T>
              </View>
              {locked ? <Badge text="Coressence+" /> : <Feather name="play-circle" size={22} color={color} />}
            </View>
          </Card>
        );
      })}
      <T variant="caption">{warmupStreak(s, today)} day warmup streak</T>

      <SectionTitle>Voice log, today</SectionTitle>
      <Card testID="voice-form">
        <Stepper label="Hours of voice use" value={hours} onChange={setHours} step={0.5} min={0} max={16} unit="h" testID="voice-hours" />
        <T variant="caption">Singing, speaking, calls and talking over noise all count.</T>
        <Scale label="Hoarseness" value={hoarse} onChange={setHoarse} min={0} max={5} low="Clear" high="Very hoarse" color={color} testID="hoarse" />
        <Stepper label="Vocal rest" value={rest} onChange={setRest} step={15} min={0} max={600} unit="min" />
        <ToggleRow title="Warmed up before heavy use" value={warm} onChange={setWarm} />
        <Button
          label={saved ? 'Saved' : 'Save voice log'}
          icon="check"
          compact
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
          testID="voice-save"
          onPress={() => {
            saveVoice({ date: today, voiceHours: hours, hoarseness: hoarse ?? 0, warmedUp: warm, restMinutes: rest });
            setSaved(true);
          }}
        />
      </Card>
      <Note tone={advice.tone} text={advice.text} />

      <SectionTitle>Voice load</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <T variant="caption">Hours of voice use</T>
        <Bars data={voiceSeries(s, 'voiceHours', range, today).map((x) => ({ label: lbl(x.date), value: x.value }))} color={color} unit=" h" height={120} testID="voice-chart" />
        <T variant="caption" style={{ marginTop: 10 }}>
          Hoarseness (0 clear to 5)
        </T>
        <LineChart data={voiceSeries(s, 'hoarseness', range, today).map((x) => ({ label: lbl(x.date), value: x.value }))} color={c.danger} minY={0} maxY={5} height={120} />
      </Card>

      <SectionTitle right={<T variant="caption" color={c.accent} onPress={() => router.push('/plan')}>Calendar</T>}>Coming up</SectionTitle>
      <Card padded={false}>
        {shows.length ? (
          shows.map((i, k) => (
            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: k ? 1 : 0, borderTopColor: c.line }}>
              <Feather name={i.kind === 'performance' ? 'star' : 'music'} size={17} color={color} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{i.title}</T>
                <T variant="caption">
                  {longDate(i.date)}
                  {i.time ? ` · ${clock(i.time)}` : ''}
                </T>
              </View>
            </View>
          ))
        ) : (
          <T variant="small" color={c.muted} style={{ padding: 16 }}>
            Add rehearsals and performances in Plan.
          </T>
        )}
      </Card>

      <SectionTitle>Pre-show checklist</SectionTitle>
      <Card padded={false}>
        {CHECKLIST.map((x, i) => {
          const on = checks.includes(x);
          return (
            <Pressable key={x} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setChecks(on ? checks.filter((y) => y !== x) : [...checks, x])} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Feather name={on ? 'check-square' : 'square'} size={19} color={on ? color : c.muted} />
              <T variant="body">{x}</T>
            </Pressable>
          );
        })}
      </Card>
      <Note text="Hoarseness that lasts more than a few weeks, or sooner if your voice is your work, should be checked by a clinician, ideally an ENT or laryngologist. Seek care promptly for pain, trouble swallowing or breathing, or coughing up blood." />
    </Screen>
  );
}
