// First run: welcome, choose a track, and a clear note on privacy and medical scope.
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_TOOLS } from '@core/appConfig';
import { setSettings } from '@core/settings';
import { useTheme } from '@core/theme';
import { Button, Card, Chip, Field, T } from '@core/ui';
import { Deep } from '@core/art';
import { setDemo } from '../demo/demo';

export default function OnboardingScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [track, setTrack] = useState<'live' | 'perform' | 'both'>('live');
  const finish = (demo: boolean) => {
    setSettings({ onboarded: true, ...(demo ? { track: 'both' as const } : { name: name.trim(), track }) });
    if (demo) setDemo(true);
    router.replace('/');
  };
  return (
    <ScrollView testID="onboarding" style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 22, paddingBottom: insets.bottom + 30, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      {step === 0 ? (
        <>
          <Image source={c.dark ? require('../../assets/brand/logo-white.png') : require('../../assets/brand/logo-navy.png')} style={{ width: 260, height: 87, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel="Coressence" />
          <T variant="hero" style={{ marginTop: 30, textAlign: 'center' }}>
            Live and perform at your peak
          </T>
          <T variant="body" color={c.inkSoft} style={{ marginTop: 10, textAlign: 'center' }}>
            The companion to the Coressence courses. One weekly loop: assess, plan, do, measure, review, adjust, and keep what works.
          </T>
          <Deep style={{ marginTop: 26 }}>
            {[
              ['Loop', 'Your week on the Peak Cycle: this week’s module, today’s actions, your biggest signal'],
              ['Test', 'One change a week, measured from your own data: keep, adjust or drop'],
              ['Learn', 'Live at Your Peak and Perform at Your Peak, by Robert Clinton, MD'],
            ].map(([a, b]) => (
              <View key={a} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                <T variant="bodyStrong" color="#5FD3CF" style={{ width: 56 }}>
                  {a}
                </T>
                <T variant="body" color="#E4F0F5" style={{ flex: 1 }}>
                  {b}
                </T>
              </View>
            ))}
          </Deep>
          <Button label="Get started" icon="arrow-right" style={{ marginTop: 26 }} onPress={() => setStep(1)} testID="ob-start" />
          {DEMO_TOOLS ? <Button label="Explore with demo data" kind="ghost" icon="play-circle" style={{ marginTop: 8 }} onPress={() => finish(true)} testID="ob-demo" /> : null}
        </>
      ) : (
        <>
          <T variant="display">A little about you</T>
          <Field label="First name (optional)" value={name} onChangeText={setName} placeholder="What should we call you?" testID="ob-name" />
          <T variant="caption" style={{ marginTop: 18 }}>
            Which track fits you?
          </T>
          <View style={{ gap: 10, marginTop: 8 }}>
            {[
              { k: 'live' as const, t: 'Live at Your Peak', d: 'Everyday energy, work, family and healthy aging.' },
              { k: 'perform' as const, t: 'Perform at Your Peak', d: 'For singers, actors, dancers and anyone who performs.' },
              { k: 'both' as const, t: 'Both', d: 'All lessons from both tracks.' },
            ].map((x) => (
              <Card key={x.k} onPress={() => setTrack(x.k)} style={{ borderWidth: track === x.k ? 2 : 1, borderColor: track === x.k ? c.teal : c.line }} testID={`ob-track-${x.k}`}>
                <T variant="heading">{x.t}</T>
                <T variant="small" color={c.muted}>
                  {x.d}
                </T>
              </Card>
            ))}
          </View>
          <Card style={{ marginTop: 18 }} tint={c.accentSoft}>
            <T variant="small" color={c.inkSoft}>
              Your data stays on this phone. Coressence Life is general education and coaching, not medical care, and does not diagnose or treat any condition. For medical concerns, talk with your clinician.
            </T>
          </Card>
          <Button label="Start" icon="check" style={{ marginTop: 20 }} onPress={() => finish(false)} testID="ob-finish" />
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            <Chip small label="Privacy" icon="shield" onPress={() => router.push('/privacy')} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
