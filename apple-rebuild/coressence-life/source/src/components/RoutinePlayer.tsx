// Guided routine player: one step at a time with a countdown. Logs the session when finished.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Tide } from '@core/charts';
import { dayKey } from '@core/dates';
import { routineMinutes, routinePosition, type Routine } from '@core/routine';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Note, Screen, T } from '@core/ui';
import { logWorkout } from '@modules/move/state';
import { logRestore } from '@modules/restore/state';
import { saveVoice, useRehearse } from '@modules/rehearse/state';
import type { MoveType } from '@modules/move/model';

function KeepAwake() {
  useKeepAwake();
  return null;
}

export function RoutinePlayer({ routine }: { routine: Routine }) {
  const c = useTheme();
  const rh = useRehearse();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = routine.steps.reduce((a, s) => a + s.seconds, 0);
  const pos = routinePosition(routine, elapsed);
  const step = routine.steps[pos.index];
  const next = routine.steps[pos.index + 1];
  const color = moduleColor(c, routine.module);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);
  useEffect(() => {
    if (pos.done && running) setRunning(false);
  }, [pos.done, running]);

  const skip = () => {
    let t = 0;
    for (let i = 0; i <= pos.index; i++) t += routine.steps[i].seconds;
    setElapsed(Math.min(total, t));
  };
  const back = () => {
    let t = 0;
    for (let i = 0; i < Math.max(0, pos.index - (pos.left < step.seconds - 2 ? 0 : 1)); i++) t += routine.steps[i].seconds;
    setElapsed(t);
  };
  const finish = () => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const today = dayKey();
    if (routine.module === 'move') logWorkout({ date: today, type: routine.kind as MoveType, minutes, effort: routine.kind === 'strength' ? 6 : 3, routineId: routine.id });
    else if (routine.module === 'restore') logRestore({ date: today, kind: 'breathing', minutes });
    else {
      const cur = rh.voice[today];
      saveVoice({ date: today, voiceHours: cur?.voiceHours ?? 0, hoarseness: cur?.hoarseness ?? 0, restMinutes: cur?.restMinutes ?? 0, note: cur?.note, warmedUp: true });
    }
    setSaved(true);
  };

  return (
    <Screen title={routine.title} subtitle={`${routineMinutes(routine)} min · ${routine.level}`} color={color} accentBar testID="routine">
      {running ? <KeepAwake /> : null}
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Tide
          value={pos.done ? 1 : 1 - pos.left / step.seconds}
          color={color}
          size={200}
          stroke={14}
          center={
            <View style={{ alignItems: 'center' }}>
              <T variant="hero" testID="routine-countdown">
                {pos.done ? 'Done' : `${Math.floor(pos.left / 60)}:${String(pos.left % 60).padStart(2, '0')}`}
              </T>
              <T variant="caption">
                Step {pos.index + 1} of {routine.steps.length}
              </T>
            </View>
          }
        />
        <T variant="title" style={{ marginTop: 18, textAlign: 'center' }}>
          {pos.done ? 'Nice work' : step.name}
        </T>
        <T variant="body" color={c.inkSoft} style={{ marginTop: 6, textAlign: 'center' }}>
          {pos.done ? 'Save it to your log so it counts toward today.' : step.cue}
        </T>
        {!pos.done && next ? (
          <T variant="caption" style={{ marginTop: 12 }}>
            Next: {next.name}
          </T>
        ) : null}
      </Card>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, marginTop: 14, overflow: 'hidden' }}>
        <View style={{ width: `${(elapsed / total) * 100}%`, height: 6, backgroundColor: color }} />
      </View>
      {pos.done ? (
        saved ? (
          <Card style={{ marginTop: 16, alignItems: 'center' }}>
            <Feather name="check-circle" size={26} color={c.ok} />
            <T variant="heading" style={{ marginTop: 6 }}>
              Saved to today
            </T>
            <Button label="Done" kind="secondary" compact style={{ marginTop: 10 }} onPress={() => router.back()} />
          </Card>
        ) : (
          <Button label="Save to my log" icon="check" style={{ marginTop: 16 }} onPress={finish} testID="routine-save" />
        )
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'center' }}>
          <Button label="Back" icon="skip-back" kind="secondary" compact onPress={back} />
          <Button label={running ? 'Pause' : elapsed ? 'Resume' : 'Start'} icon={running ? 'pause' : 'play'} onPress={() => setRunning(!running)} testID="routine-start" style={{ minWidth: 130 }} color={color} />
          <Button label="Skip" icon="skip-forward" kind="secondary" compact onPress={skip} testID="routine-skip" />
        </View>
      )}
      {elapsed > 0 && !pos.done ? <Button label="Finish early and save" kind="ghost" compact style={{ marginTop: 8 }} onPress={() => { setElapsed(total); setRunning(false); }} /> : null}
      {routine.caution ? <Note text={routine.caution} tone="warn" /> : null}
      <T variant="label" style={{ marginTop: 22, marginBottom: 6 }}>
        All steps
      </T>
      {routine.steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, opacity: i < pos.index ? 0.5 : 1 }}>
          <T variant="caption" style={{ width: 22 }}>
            {i + 1}
          </T>
          <T variant="small" style={{ flex: 1, fontWeight: i === pos.index ? '600' : '400' }}>
            {s.name}
          </T>
          <T variant="caption">{s.seconds >= 60 ? `${Math.round((s.seconds / 60) * 10) / 10} min` : `${s.seconds} s`}</T>
        </View>
      ))}
    </Screen>
  );
}
