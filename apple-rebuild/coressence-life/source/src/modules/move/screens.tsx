// Move: weekly targets, guided routines, logging and history.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bars, Tide } from '@core/charts';
import { LockCard, RangePicker, type Range } from '@core/gate';
import { usePremium } from '@core/billing/billing';
import { FREE } from '@core/billing/config';
import { addDays, dayKey, shortDate, weekdayShort } from '@core/dates';
import { routineMinutes } from '@core/routine';
import { useSettings } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Field, Note, Scale, Screen, SectionTitle, Stat, Stepper, T } from '@core/ui';
import { TYPES, dailyMinutes, moveStreak, typeLabel, weekSummary, type MoveType } from './model';
import { MOVE_ROUTINES } from './routines';
import { deleteWorkout, logWorkout, useMove } from './state';

export function MoveScreen() {
  const c = useTheme();
  const s = useMove();
  const goals = useSettings((x) => x.goals);
  const premium = usePremium();
  const params = useLocalSearchParams<{ add?: string }>();
  const [adding, setAdding] = useState(!!params.add);
  const [type, setType] = useState<MoveType>('strength');
  const [minutes, setMinutes] = useState(30);
  const [effort, setEffort] = useState<number | null>(6);
  const [note, setNote] = useState('');
  const [range, setRange] = useState<Range>(7);
  const today = dayKey();
  const color = moduleColor(c, 'move');
  const wk = weekSummary(s.workouts.length ? s : { workouts: [] }, today);
  const data = dailyMinutes(s, range, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value }));
  const cutoff = premium ? '0000' : addDays(today, -FREE.historyDays + 1);
  const history = s.workouts.filter((w) => w.date >= cutoff).slice(0, 30);
  const hidden = s.workouts.length - s.workouts.filter((w) => w.date >= cutoff).length;

  return (
    <Screen title="Move" subtitle="Pilates, yoga, stretching and strength" color={color} accentBar testID="move">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide
            value={wk.minutes / goals.weeklyMoveMinutes}
            color={color}
            size={92}
            stroke={10}
            label="Weekly minutes"
            center={
              <View style={{ alignItems: 'center' }}>
                <T variant="heading">{wk.minutes}</T>
                <T variant="caption">min</T>
              </View>
            }
          />
          <View style={{ flex: 1 }}>
            <T variant="label" color={color}>
              This week
            </T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
              {wk.minutes} of {goals.weeklyMoveMinutes} minutes · {wk.strengthDays} of {goals.strengthDays} strength days · {wk.sessions} session{wk.sessions === 1 ? '' : 's'}
            </T>
            <T variant="caption" style={{ marginTop: 4 }}>
              {moveStreak(s, today)} day movement streak
            </T>
          </View>
        </View>
        {!adding ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Button label="Log a session" icon="plus" compact onPress={() => setAdding(true)} testID="move-add" />
            <Button label="Live heart rate" icon="activity" compact kind="secondary" onPress={() => router.push('/move-live' as never)} testID="move-live" />
          </View>
        ) : null}
      </Card>

      {adding ? (
        <Card style={{ marginTop: 12 }} testID="move-form">
          <T variant="heading">Log a session</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {TYPES.map((t) => (
              <Chip key={t.key} label={t.label} small selected={type === t.key} onPress={() => setType(t.key)} color={color} testID={`move-type-${t.key}`} />
            ))}
          </View>
          <Stepper label="Minutes" value={minutes} onChange={setMinutes} step={5} min={5} max={300} testID="move-min" />
          <Scale label="Effort" value={effort} onChange={setEffort} min={1} max={10} low="Very easy" high="All out" color={color} />
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="How did it feel?" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button
              label="Save"
              icon="check"
              compact
              testID="move-save"
              onPress={() => {
                logWorkout({ date: today, type, minutes, effort: effort ?? 5, note: note.trim() || undefined });
                setAdding(false);
                setNote('');
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : null}

      <SectionTitle>Guided routines</SectionTitle>
      {MOVE_ROUTINES.map((r) => {
        const locked = r.premium && !premium;
        return (
          <Card key={r.id} style={{ marginBottom: 10 }} onPress={() => (locked ? router.push({ pathname: '/plus', params: { reason: 'routines' } }) : router.push(`/routine/${r.id}`))} testID={`routine-${r.id}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={(TYPES.find((t) => t.key === r.kind)?.icon ?? 'play') as never} size={19} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{r.title}</T>
                <T variant="caption">
                  {routineMinutes(r)} min · {r.level}
                </T>
              </View>
              {locked ? <Badge text="Coressence+" /> : <Feather name="play-circle" size={22} color={color} />}
            </View>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
              {r.summary}
            </T>
          </Card>
        );
      })}

      <SectionTitle>Minutes per day</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <Bars data={data} color={color} goal={goals.moveMinutes} unit=" min" testID="move-chart" />
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card padded={false}>
        {history.length ? (
          history.map((w, i) => (
            <Pressable key={w.id} onLongPress={() => deleteWorkout(w.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Feather name={(TYPES.find((t) => t.key === w.type)?.icon ?? 'activity') as never} size={17} color={color} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{typeLabel(w.type)}</T>
                <T variant="caption">
                  {shortDate(w.date)} · effort {w.effort}/10{w.avgHr ? ` · avg ${w.avgHr} bpm` : ''}{w.note ? ` · ${w.note}` : ''}
                </T>
                {w.zones ? (
                  <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 5 }}>
                    {w.zones.map((z, k) => (
                      <View key={k} style={{ flex: z || 0.0001, backgroundColor: ['#7FB4D9', '#3DB39E', '#E7B416', '#E98A2C', '#D9534F'][k] }} />
                    ))}
                  </View>
                ) : null}
              </View>
              <T variant="heading">{w.minutes} min</T>
            </Pressable>
          ))
        ) : (
          <T variant="small" color={c.muted} style={{ padding: 16 }}>
            No sessions yet. Try a guided routine above.
          </T>
        )}
      </Card>
      {hidden > 0 ? <LockCard title={`${hidden} older sessions`} text="The free plan shows the last 7 days. Coressence+ keeps your full history and trends." reason="history" /> : null}
      <Note text="Adults are advised to get 150–300 minutes of moderate activity a week plus strength work on two or more days (Physical Activity Guidelines for Americans). Check with your clinician before starting if you have a heart condition or symptoms with exertion." />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Stat label="Week sessions" value={String(wk.sessions)} />
        <Stat label="Strength days" value={`${wk.strengthDays}/${goals.strengthDays}`} />
      </View>
    </Screen>
  );
}
