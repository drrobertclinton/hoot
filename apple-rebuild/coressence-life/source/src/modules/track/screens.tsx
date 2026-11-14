// Track screens: the daily check-in and the Track tab (habits, trends, patterns).
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LineChart } from '@core/charts';
import { LockCard, RangePicker, type Range } from '@core/gate';
import { usePremium } from '@core/billing/billing';
import { dayKey, shortDate, weekdayShort } from '@core/dates';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Field, Note, Scale, Screen, SectionTitle, T } from '@core/ui';
import { METRICS, checkinStreak, habitStreak, relate, relationWords, series, wellbeing, type Checkin } from './model';
import { addHabit, archiveHabit, saveCheckin, toggleHabit, useTrack } from './state';
import { useSleep } from '../sleep/state';
import { useMeasure } from '../measure/state';
import { hoursFor } from '../sleep/model';
import { dayMetrics } from '../measure/model';
import { lastDays } from '@core/dates';

export function CheckinScreen() {
  const c = useTheme();
  const t = useTrack();
  const today = dayKey();
  const cur = t.checkins[today];
  const [v, setV] = useState<Checkin>(cur ?? { date: today, energy: 3, mood: 3, stress: 3, soreness: 2, focus: 3 });
  const [note, setNote] = useState(cur?.note ?? '');
  const color = moduleColor(c, 'track');
  return (
    <Screen title="Daily check-in" subtitle="About 20 seconds. Tap what fits today." testID="checkin">
      {METRICS.map((m) => (
        <Scale key={m.key} label={m.label} value={v[m.key]} onChange={(x) => setV({ ...v, [m.key]: x })} low={m.low} high={m.high} color={color} testID={`ci-${m.key}`} />
      ))}
      <Field label="Anything to note? (optional)" value={note} onChangeText={setNote} placeholder="Late rehearsal, slept badly, felt great…" multiline testID="ci-note" />
      <Button
        label={cur ? 'Update check-in' : 'Save check-in'}
        icon="check"
        style={{ marginTop: 18 }}
        testID="ci-save"
        onPress={() => {
          saveCheckin({ ...v, note: note.trim() || undefined });
          router.back();
        }}
      />
    </Screen>
  );
}

export function TrackScreen() {
  const c = useTheme();
  const t = useTrack();
  const premium = usePremium();
  const sleep = useSleep();
  const measure = useMeasure();
  const [range, setRange] = useState<Range>(7);
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('energy');
  const [newHabit, setNewHabit] = useState('');
  const today = dayKey();
  const color = moduleColor(c, 'track');
  const ci = t.checkins[today];
  const habits = t.habits.filter((h) => !h.archived);
  const done = t.done[today] || [];
  const data = series(t, metric, range, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value }));
  const sleepMap: Record<string, number | null> = {};
  for (const d of lastDays(30, today)) sleepMap[d] = hoursFor(sleep, d, dayMetrics(measure, d).sleepH);
  const rel = relate(t, 'energy', sleepMap, 30, today);
  const stepsMap: Record<string, number | null> = {};
  for (const d of lastDays(30, today)) stepsMap[d] = dayMetrics(measure, d).steps ?? null;
  const rel2 = relate(t, 'mood', stepsMap, 30, today);
  const wb = wellbeing(ci);

  return (
    <Screen title="Track" subtitle="How you feel and the habits you are building" color={color} accentBar testID="track">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T variant="label" color={color}>
              Today
            </T>
            <T variant="title" style={{ marginTop: 2 }}>
              {ci ? `Feeling ${wb! >= 0.7 ? 'strong' : wb! >= 0.5 ? 'steady' : wb! >= 0.3 ? 'a bit flat' : 'low'}` : 'Not checked in yet'}
            </T>
            <T variant="small" color={c.muted}>
              {checkinStreak(t, today)} day check-in streak
            </T>
          </View>
          <Button label={ci ? 'Edit' : 'Check in'} icon="edit-3" compact onPress={() => router.push('/checkin')} testID="track-checkin" />
        </View>
        {ci ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {METRICS.map((m) => (
              <Chip key={m.key} small label={`${m.label} ${ci[m.key]}`} />
            ))}
          </View>
        ) : null}
      </Card>

      <SectionTitle>Habits</SectionTitle>
      <Card padded={false}>
        {habits.map((h, i) => {
          const on = done.includes(h.id);
          return (
            <Pressable key={h.id} testID={`habit-${i}`} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleHabit(h.id, today)} onLongPress={() => archiveHabit(h.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Feather name={on ? 'check-circle' : 'circle'} size={22} color={on ? color : c.muted} />
              <T variant="bodyStrong" style={{ flex: 1 }}>
                {h.name}
              </T>
              <T variant="caption">{habitStreak(t, h.id, today)} day streak</T>
            </Pressable>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field value={newHabit} onChangeText={setNewHabit} placeholder="Add a habit" style={{ minHeight: 42 }} testID="habit-new" />
          </View>
          <Button
            label="Add"
            compact
            kind="secondary"
            disabled={!newHabit.trim()}
            onPress={() => {
              addHabit(newHabit.trim());
              setNewHabit('');
            }}
          />
        </View>
      </Card>
      <T variant="caption" style={{ marginTop: 6 }}>
        Long-press a habit to retire it.
      </T>

      <SectionTitle>Trends</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {METRICS.map((m) => (
          <Chip key={m.key} label={m.label} small selected={metric === m.key} onPress={() => setMetric(m.key)} color={color} testID={`metric-${m.key}`} />
        ))}
      </View>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <LineChart data={data} color={color} minY={1} maxY={5} testID="track-chart" />
        <T variant="caption">{METRICS.find((m) => m.key === metric)?.invert ? 'Lower is better (1 to 5)' : 'Higher is better (1 to 5)'}</T>
      </Card>

      <SectionTitle>Patterns</SectionTitle>
      {premium ? (
        <Card testID="track-patterns">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Feather name="moon" size={17} color={c.pillar.sleep} style={{ marginTop: 2 }} />
            <T variant="small" style={{ flex: 1 }}>
              {relationWords(rel.r, 'sleep', 'energy')} ({rel.n} days)
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Feather name="navigation" size={17} color={c.pillar.move} style={{ marginTop: 2 }} />
            <T variant="small" style={{ flex: 1 }}>
              {relationWords(rel2.r, 'steps', 'mood')} ({rel2.n} days)
            </T>
          </View>
          <Note text="Patterns show what tends to happen together in your own logs over the last 30 days. They do not prove one causes the other." />
        </Card>
      ) : (
        <LockCard title="Patterns between sleep, movement and mood" text="Coressence+ compares your check-ins with your sleep and activity to show what moves together for you." reason="patterns" />
      )}
    </Screen>
  );
}
