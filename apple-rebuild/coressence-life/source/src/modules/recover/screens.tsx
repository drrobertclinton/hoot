// Recover: today's readiness, what drives it, and recovery habits.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { LineChart, Tide } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { dayKey, lastDays, shortDate, weekdayShort } from '@core/dates';
import { useSettings } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Note, Scale, Screen, SectionTitle, T } from '@core/ui';
import { ACTIONS, readinessWords, type RecoveryAction } from './model';
import { saveRecovery, useRecover } from './state';
import { snapshot } from '../life/today';
import { useSlices } from '../life/state';

export function RecoverScreen() {
  const c = useTheme();
  const all = useSlices();
  const r = useRecover();
  const goals = useSettings((x) => x.goals);
  const today = dayKey();
  const log = r.logs[today];
  const [soreness, setSoreness] = useState<number | null>(log?.soreness ?? null);
  const [actions, setActions] = useState<RecoveryAction[]>(log?.actions ?? []);
  const [range, setRange] = useState<Range>(7);
  const [saved, setSaved] = useState(false);
  const color = moduleColor(c, 'recover');
  const snap = snapshot(all, goals, today);
  const score = snap.recover.score;
  const trend = lastDays(range, today).map((d) => {
    const sc = snapshot(all, goals, d).recover.score;
    return { label: range <= 7 ? weekdayShort(d) : shortDate(d), value: sc === null ? null : Math.round(sc * 100) };
  });

  return (
    <Screen title="Recover" subtitle="How ready your body is today" color={color} accentBar testID="recover">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide
            value={score}
            color={color}
            size={110}
            stroke={12}
            label="Readiness"
            center={
              <View style={{ alignItems: 'center' }}>
                <T variant="stat">{score === null ? '–' : Math.round(score * 100)}</T>
                <T variant="caption">readiness</T>
              </View>
            }
          />
          <T variant="body" style={{ flex: 1 }}>
            {readinessWords(score)}
          </T>
        </View>
        {snap.recover.parts.length ? (
          <View style={{ marginTop: 14, gap: 8 }}>
            {snap.recover.parts.map((p) => (
              <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name={p.delta > 0 ? 'arrow-up-right' : p.delta < 0 ? 'arrow-down-right' : 'minus'} size={16} color={p.delta > 0 ? c.ok : p.delta < 0 ? c.warn : c.muted} />
                <T variant="small" style={{ flex: 1 }}>
                  {p.label}
                </T>
                <T variant="caption">
                  {p.delta > 0 ? '+' : ''}
                  {p.delta}
                </T>
              </View>
            ))}
          </View>
        ) : null}
        <Button label="Why this number" icon="help-circle" kind="secondary" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/why')} testID="recover-why" />
      </Card>

      <SectionTitle>Today</SectionTitle>
      <Card>
        <Scale label="Muscle soreness" value={soreness} onChange={setSoreness} min={0} max={10} low="None" high="Severe" color={color} testID="soreness" />
        <T variant="caption" style={{ marginTop: 14 }}>
          Recovery I did today
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {ACTIONS.map((a) => (
            <Chip key={a.key} small icon={a.icon as never} label={a.label} selected={actions.includes(a.key)} onPress={() => setActions(actions.includes(a.key) ? actions.filter((x) => x !== a.key) : [...actions, a.key])} color={color} />
          ))}
        </View>
        <Button
          label={saved ? 'Saved' : 'Save'}
          icon="check"
          compact
          style={{ marginTop: 14, alignSelf: 'flex-start' }}
          disabled={soreness === null}
          testID="recover-save"
          onPress={() => {
            saveRecovery({ date: today, soreness: soreness ?? 0, actions });
            setSaved(true);
          }}
        />
      </Card>

      <SectionTitle>Readiness trend</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <LineChart data={trend} color={color} minY={20} maxY={100} testID="recover-chart" />
      </Card>
      <Note text="Readiness is a simple, transparent blend: your heart rate variability and resting heart rate compared with your own 14-day average, last night’s sleep, and soreness. It is a prompt to listen to your body, not a medical measurement. Pain that is sharp, swollen or lasts more than a few days deserves a clinician’s look." />
    </Screen>
  );
}
