// Restore: breathing, quiet time, gratitude, time outdoors and optional Scripture reflection.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Bars, Tide } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { dayKey, parseDay, shortDate, weekdayShort } from '@core/dates';
import { useSettings } from '@core/settings';
import { FONTS, moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Field, Note, Screen, SectionTitle, Stepper, T } from '@core/ui';
import { KINDS, restoreMinutes, restoreSeries, restoreStreak, type RestoreKind } from './model';
import { reflectionFor } from './scripture';
import { logRestore, useRestore } from './state';

export function RestoreScreen() {
  const c = useTheme();
  const s = useRestore();
  const goals = useSettings((x) => x.goals);
  const faith = useSettings((x) => x.faith);
  const [kind, setKind] = useState<RestoreKind>('quiet');
  const [mins, setMins] = useState(10);
  const [note, setNote] = useState('');
  const [range, setRange] = useState<Range>(7);
  const [reflected, setReflected] = useState(false);
  const today = dayKey();
  const color = moduleColor(c, 'restore');
  const m = restoreMinutes(s, today);
  const kinds = KINDS.filter((k) => !k.faith || faith);
  const dayIndex = Math.floor(parseDay(today).getTime() / 86400000);
  const verse = reflectionFor(dayIndex);
  const todays = s.sessions.filter((x) => x.date === today);

  return (
    <Screen title="Restore" subtitle="Rest for the mind as well as the body" color={color} accentBar testID="restore">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide
            value={m / goals.restoreMinutes}
            color={color}
            size={96}
            stroke={10}
            center={
              <View style={{ alignItems: 'center' }}>
                <T variant="heading">{m}</T>
                <T variant="caption">of {goals.restoreMinutes} min</T>
              </View>
            }
          />
          <View style={{ flex: 1 }}>
            <T variant="label" color={color}>
              Today
            </T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
              {todays.length ? todays.map((x) => `${KINDS.find((k) => k.key === x.kind)?.label} ${x.minutes} min`).join(' · ') : 'Nothing yet. Five minutes counts.'}
            </T>
            <T variant="caption" style={{ marginTop: 4 }}>
              {restoreStreak(s, today)} day streak
            </T>
          </View>
        </View>
        <Button label="Guided breathing" icon="wind" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/breathe')} testID="restore-breathe" color={color} />
      </Card>

      {faith ? (
        <>
          <SectionTitle>Scripture reflection</SectionTitle>
          <Card testID="scripture">
            <T variant="title" style={{ fontFamily: FONTS.displayMedium, lineHeight: 30 }}>
              “{verse.text}”
            </T>
            <T variant="caption" style={{ marginTop: 8 }}>
              {verse.ref} (WEB)
            </T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 12 }}>
              {verse.prompt}
            </T>
            <Button
              label={reflected ? 'Saved to today' : 'I spent time with this (5 min)'}
              icon={reflected ? 'check' : 'book-open'}
              kind="secondary"
              compact
              disabled={reflected}
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
              onPress={() => {
                logRestore({ date: today, kind: 'scripture', minutes: 5, note: verse.ref });
                setReflected(true);
              }}
            />
          </Card>
        </>
      ) : null}

      <SectionTitle>Log restore time</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {kinds.map((k) => (
            <Chip key={k.key} small icon={k.icon as never} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} color={color} testID={`restore-kind-${k.key}`} />
          ))}
        </View>
        <Stepper label="Minutes" value={mins} onChange={setMins} step={5} min={5} max={180} />
        <Field label={kind === 'gratitude' ? 'Three things I am grateful for' : 'Note (optional)'} value={note} onChangeText={setNote} multiline={kind === 'gratitude'} placeholder={kind === 'gratitude' ? 'A call with my sister, a quiet morning, good coffee' : ''} />
        <Button
          label="Save"
          icon="check"
          compact
          style={{ marginTop: 12, alignSelf: 'flex-start' }}
          testID="restore-save"
          onPress={() => {
            logRestore({ date: today, kind, minutes: mins, note: note.trim() || undefined });
            setNote('');
          }}
        />
      </Card>

      <SectionTitle>Minutes per day</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <Bars data={restoreSeries(s, range, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value }))} color={color} goal={goals.restoreMinutes} unit=" min" testID="restore-chart" />
      </Card>
      {!faith ? (
        <Pressable onPress={() => router.push('/settings')} style={{ marginTop: 14 }}>
          <T variant="caption">Scripture reflection is available as an optional section. Turn on Faith content in Settings.</T>
        </Pressable>
      ) : null}
      <Note text="Slow breathing, quiet time and time outdoors are low-risk ways to unwind. If stress, low mood or worry are hard to manage, talking with a clinician or counselor can help. In a crisis in the U.S., call or text 988." />
    </Screen>
  );
}

const PACES: { key: string; label: string; inhale: number; hold: number; exhale: number }[] = [
  { key: 'calm', label: 'Calm  4 in · 6 out', inhale: 4, hold: 0, exhale: 6 },
  { key: 'box', label: 'Box  4 · 4 · 4', inhale: 4, hold: 4, exhale: 4 },
  { key: 'even', label: 'Even  5 in · 5 out', inhale: 5, hold: 0, exhale: 5 },
];

function Awake() {
  useKeepAwake();
  return null;
}

export function BreatheScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'restore');
  const [pace, setPace] = useState(PACES[0]);
  const [minutes, setMinutes] = useState(5);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const scale = useRef(new Animated.Value(0.55)).current;
  const cycle = pace.inhale + pace.hold + pace.exhale + (pace.key === 'box' ? pace.hold : 0);
  const inCycle = elapsed % cycle;
  const phase = inCycle < pace.inhale ? 'Breathe in' : inCycle < pace.inhale + pace.hold ? 'Hold' : inCycle < pace.inhale + pace.hold + pace.exhale ? 'Breathe out' : 'Hold';
  const total = minutes * 60;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (!running) return;
    if (elapsed >= total) {
      setRunning(false);
      setDone(true);
      logRestore({ date: dayKey(), kind: 'breathing', minutes });
      return;
    }
    if (inCycle === 0) Animated.timing(scale, { toValue: 1, duration: pace.inhale * 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    if (inCycle === pace.inhale + pace.hold) Animated.timing(scale, { toValue: 0.55, duration: pace.exhale * 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [elapsed, running]);

  return (
    <Screen title="Breathe" subtitle="Slow, easy breathing with a longer breath out" color={color} accentBar testID="breathe">
      {running ? <Awake /> : null}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 280 }}>
        <Animated.View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: color + '33', transform: [{ scale }] }} />
        <Animated.View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: color + '55', transform: [{ scale }] }} />
        <T variant="title">{done ? 'Well done' : running ? phase : 'Ready'}</T>
        <T variant="caption" style={{ marginTop: 4 }}>
          {done ? `${minutes} minutes saved to Restore` : `${Math.floor((total - elapsed) / 60)}:${String((total - elapsed) % 60).padStart(2, '0')} left`}
        </T>
      </View>
      {!running && !done ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {PACES.map((p) => (
              <Chip key={p.key} small label={p.label} selected={pace.key === p.key} onPress={() => setPace(p)} color={color} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {[3, 5, 10].map((m) => (
              <Chip key={m} small label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </View>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 }}>
        {done ? (
          <Button label="Done" kind="secondary" onPress={() => router.back()} />
        ) : (
          <Button label={running ? 'Pause' : elapsed ? 'Resume' : 'Begin'} icon={running ? 'pause' : 'play'} onPress={() => setRunning(!running)} color={color} testID="breathe-start" style={{ minWidth: 150 }} />
        )}
      </View>
      <Note text="Breathe gently through the nose if you can. If you feel light-headed, return to normal breathing." />
      <Feather name="wind" size={1} color="transparent" />
    </Screen>
  );
}
