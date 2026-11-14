// Sleep sound check (iOS and Android): microphone loudness once a second, analyzed on the phone.
// The recorder writes a small temporary audio file because the platform requires one; it is deleted as soon
// as the check ends. Only the loudness numbers and the summary are kept.
import { Feather } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from 'expo-audio';
import { File } from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { durationWords } from '@core/dates';
import { useTheme } from '@core/theme';
import { Button, Card, Note, Screen, T } from '@core/ui';
import { saveNight } from './state';

const OPTIONS: RecordingOptions = { ...RecordingPresets.LOW_QUALITY, sampleRate: 8000, numberOfChannels: 1, bitRate: 12000, isMeteringEnabled: true };

function Awake() {
  useKeepAwake();
  return null;
}

export default function RecordScreen() {
  const c = useTheme();
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 1000);
  const samples = useRef<number[]>([]);
  const started = useRef<number>(0);
  const [phase, setPhase] = useState<'intro' | 'recording' | 'saving'>('intro');
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    if (phase === 'recording' && state.isRecording) {
      samples.current.push(typeof state.metering === 'number' ? state.metering : -160);
      setTick((t) => t + 1);
    }
  }, [state.durationMillis]);

  const start = async () => {
    setError('');
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) return setError('Microphone permission is needed for the sound check. You can allow it in your phone settings.');
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: true, allowsBackgroundRecording: true } as never);
      await recorder.prepareToRecordAsync();
      recorder.record();
      samples.current = [];
      started.current = Date.now();
      setPhase('recording');
    } catch {
      setError('The microphone could not start. Close other apps using it and try again.');
    }
  };

  const stop = async () => {
    setPhase('saving');
    try {
      await recorder.stop();
    } catch {
      /* already stopped */
    }
    try {
      if (recorder.uri) new File(recorder.uri).delete();
    } catch {
      /* temporary file already gone */
    }
    await setAudioModeAsync({ allowsRecording: false } as never).catch(() => undefined);
    if (samples.current.length < 30) {
      setPhase('intro');
      return setError('That was too short to analyze. Let it run for at least a minute.');
    }
    const night = saveNight(samples.current, started.current, 1000);
    router.replace(`/sleep/${night.id}`);
  };

  if (phase !== 'intro') {
    const secs = samples.current.length;
    const level = typeof state.metering === 'number' ? Math.max(0, Math.min(1, (state.metering + 70) / 60)) : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#03111A', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Awake />
        <Feather name="moon" size={34} color="#5E7A8C" />
        <T variant="hero" color="#9FB8C6" style={{ marginTop: 16 }}>
          {durationWords(secs / 60)}
        </T>
        <T variant="small" color="#5E7A8C" style={{ marginTop: 6, textAlign: 'center' }}>
          Listening for loudness only. Keep the phone plugged in, screen down, near the bed.
        </T>
        <View style={{ width: 160, height: 6, borderRadius: 3, backgroundColor: '#0E2533', marginTop: 24, overflow: 'hidden' }}>
          <View style={{ width: `${level * 100}%`, height: 6, backgroundColor: '#3E6A84' }} />
        </View>
        <Button label={phase === 'saving' ? 'Analyzing…' : 'Stop and see my night'} icon="square" kind="secondary" loading={phase === 'saving'} onPress={stop} style={{ marginTop: 40 }} testID="sound-stop" />
      </View>
    );
  }

  return (
    <Screen title="Sleep sound check" subtitle="Runs on your phone overnight" color={c.pillar.sleep} accentBar>
      <Card>
        <T variant="body">
          Your phone samples how loud the room is once a second. In the morning you will see a timeline of snoring-like, short and longer sounds with a plain-language summary.
        </T>
        <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
          · No audio is saved or sent anywhere.{'\n'}· It also hears partners, pets and street noise. Let anyone sharing the room know.{'\n'}· Keep the phone plugged in and the app open; the screen dims.
        </T>
      </Card>
      {error ? <Note tone="warn" text={error} /> : null}
      <Button label="Start now" icon="moon" style={{ marginTop: 16 }} onPress={start} testID="sound-begin" color={c.pillar.sleep} />
      <Note text="This is a sound check, not a medical test. It cannot diagnose snoring problems or sleep apnea. If loud snoring with gasping or pauses happens often, talk with a clinician." />
    </Screen>
  );
}
