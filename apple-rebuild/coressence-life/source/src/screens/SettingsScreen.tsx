// Settings: profile, goals, reminders, faith content, appearance, investor demo, privacy and data deletion.
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { DEMO_TOOLS, PUBLISHER, PURCHASES_LIVE, SUPPORT_EMAIL } from '@core/appConfig';
import { billing, useBilling } from '@core/billing/billing';
import { LEGAL } from '@core/billing/config';
import { clock, fmtHm, hm, weekdayName } from '@core/dates';
import { notificationsSupported, ensurePermission } from '@core/notifications';
import { setGoals, setSettings, useSettings, getSettings, type ReminderSettings } from '@core/settings';
import { wipeAll } from '@core/store';
import { useTheme } from '@core/theme';
import { Button, Card, Chip, Divider, Field, Note, Row, Screen, SectionTitle, Stepper, T, ToggleRow } from '@core/ui';
import { setDemo, ensureDemoFresh } from '../demo/demo';

export default function SettingsScreen() {
  const c = useTheme();
  const s = useSettings((x) => x);
  useBilling();
  const [name, setName] = useState(s.name);
  const [msg, setMsg] = useState('');
  const r = s.reminders;
  const setR = <K extends keyof ReminderSettings>(k: K, patch: Partial<ReminderSettings[K]>) => {
    const cur = getSettings().reminders;
    setSettings({ reminders: { ...cur, [k]: { ...cur[k], ...patch } } });
    if ((patch as { on?: boolean }).on) ensurePermission().catch(() => undefined);
  };
  const timeStep = (label: string, t: string, on: (v: string) => void) => <Stepper label={label} display={clock(t)} value={hm(t)} step={15} min={-9999} max={9999} onChange={(v) => on(fmtHm((v + 1440) % 1440))} />;

  const confirmDelete = () => {
    const go = async () => {
      await wipeAll();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete all your Coressence Life data from this device? This cannot be undone.')) go();
      return;
    }
    Alert.alert('Delete all my data?', 'Every log, plan, lesson answer and setting is removed from this device. Purchases stay with your store account and can be restored. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen title="Settings" testID="settings">
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <Field label="First name (stays on this phone)" value={name} onChangeText={setName} onBlur={() => setSettings({ name: name.trim() })} placeholder="Your name" />
        <T variant="caption" style={{ marginTop: 12 }}>
          Course track
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {(['live', 'perform', 'both'] as const).map((t) => (
            <Chip key={t} small label={t === 'live' ? 'Live at Your Peak' : t === 'perform' ? 'Perform at Your Peak' : 'Both'} selected={s.track === t} onPress={() => setSettings({ track: t })} />
          ))}
        </View>
        <T variant="caption" style={{ marginTop: 12 }}>
          Units
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <Chip small label="US (lb)" selected={s.units === 'us'} onPress={() => setSettings({ units: 'us' })} />
          <Chip small label="Metric (kg)" selected={s.units === 'metric'} onPress={() => setSettings({ units: 'metric' })} />
        </View>
      </Card>

      <SectionTitle>Daily goals</SectionTitle>
      <Card>
        <Stepper label="Sleep" value={s.goals.sleepHours} onChange={(v) => setGoals({ sleepHours: v })} step={0.5} min={5} max={10} unit="h" />
        <Stepper label="Movement" value={s.goals.moveMinutes} onChange={(v) => setGoals({ moveMinutes: v })} step={5} min={5} max={180} unit="min" />
        <Stepper label="Weekly movement" value={s.goals.weeklyMoveMinutes} onChange={(v) => setGoals({ weeklyMoveMinutes: v })} step={10} min={30} max={600} unit="min" />
        <Stepper label="Strength days" value={s.goals.strengthDays} onChange={(v) => setGoals({ strengthDays: v })} min={0} max={7} />
        <Stepper label="Steps" value={s.goals.steps} onChange={(v) => setGoals({ steps: v })} step={500} min={1000} max={30000} />
        <Stepper label="Water" value={s.goals.waterMl} onChange={(v) => setGoals({ waterMl: v })} step={250} min={500} max={5000} unit="ml" />
        <Stepper label="Restore" value={s.goals.restoreMinutes} onChange={(v) => setGoals({ restoreMinutes: v })} step={5} min={5} max={120} unit="min" />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <Card>
        {!notificationsSupported ? <Note text="Reminders are delivered by the phone app. Your choices here are saved and apply on iPhone and Android." /> : null}
        <ToggleRow icon="edit-3" title="Daily check-in" value={r.checkin.on} onChange={(on) => setR('checkin', { on })} testID="rem-checkin" />
        {r.checkin.on ? timeStep('Time', r.checkin.time, (time) => setR('checkin', { time })) : null}
        <Divider />
        <ToggleRow icon="droplet" title="Water" subtitle={`Every ${r.water.everyHours} hours, ${clock(r.water.from)} to ${clock(r.water.to)}`} value={r.water.on} onChange={(on) => setR('water', { on })} />
        {r.water.on ? <Stepper label="Every" value={r.water.everyHours} onChange={(v) => setR('water', { everyHours: v })} min={1} max={4} unit="h" /> : null}
        <Divider />
        <ToggleRow icon="moon" title="Bedtime wind-down" value={r.bedtime.on} onChange={(on) => setR('bedtime', { on })} />
        {r.bedtime.on ? timeStep('Time', r.bedtime.time, (time) => setR('bedtime', { time })) : null}
        <Divider />
        <ToggleRow icon="refresh-ccw" title="Weekly review" subtitle={`${weekdayName(r.review.weekday)}s at ${clock(r.review.time)}`} value={r.review.on} onChange={(on) => setR('review', { on })} />
        <Divider />
        <ToggleRow icon="calendar" title="Plan items" subtitle={`${r.plan.minutesBefore} minutes before anything marked "remind me"`} value={r.plan.on} onChange={(on) => setR('plan', { on })} />
      </Card>

      <SectionTitle>Devices</SectionTitle>
      <Card>
        <Row icon="watch" title="Connected devices" subtitle="Apple Health, Health Connect, Oura, WHOOP, Garmin and more" onPress={() => router.push('/devices' as never)} testID="settings-devices" />
        <Divider />
        <Row icon="activity" title="Monitor targets" subtitle="Blood pressure and glucose targets from your clinician" onPress={() => router.push('/monitor/bp' as never)} />
      </Card>

      <SectionTitle>Content</SectionTitle>
      <Card>
        <ToggleRow icon="book-open" title="Faith content" subtitle="Adds optional Scripture reflection to Restore" value={s.faith} onChange={(faith) => setSettings({ faith })} testID="faith-toggle" />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['system', 'light', 'dark'] as const).map((a) => (
          <Chip key={a} label={a === 'system' ? 'Match phone' : a === 'light' ? 'Light' : 'Dark'} selected={s.appearance === a} onPress={() => setSettings({ appearance: a })} testID={`appearance-${a}`} />
        ))}
      </View>

      {DEMO_TOOLS ? (
        <>
          <SectionTitle>Investor demo</SectionTitle>
          <Card testID="demo-card">
            <ToggleRow icon="play-circle" title="Load demo data" subtitle="Switches to a sample profile with 60 days of realistic data. Your own data is kept separately and returns when you switch off." value={s.demo} onChange={(on) => setDemo(on)} testID="demo-toggle" />
            {s.demo ? (
              <>
                <ToggleRow icon="star" title="Preview Coressence+" subtitle="Unlocks every premium feature for the demo without a purchase" value={s.previewAll} onChange={(previewAll) => setSettings({ previewAll })} testID="preview-toggle" />
                <Button label="Refresh demo data" kind="ghost" compact icon="refresh-cw" onPress={() => ensureDemoFresh(true)} style={{ alignSelf: 'flex-start' }} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {PURCHASES_LIVE ? (
        <>
      <SectionTitle>Membership</SectionTitle>
      <Card>
        <Row icon="star" title="Coressence+" subtitle={billing.allAccess() ? 'Active' : 'Free plan'} onPress={() => router.push('/plus')} testID="settings-plus" />
        <Divider />
        <Row
          icon="rotate-ccw"
          title="Restore Purchases"
          onPress={async () => {
            const res = await billing.restore();
            setMsg(res.ok ? (billing.allAccess() ? 'Coressence+ restored.' : 'No purchases were found for this account.') : res.error || 'Could not restore.');
          }}
          testID="restore-purchases"
        />
        {msg ? (
          <T variant="small" color={c.accent}>
            {msg}
          </T>
        ) : null}
      </Card>
        </>
      ) : null}

      <SectionTitle>Privacy and support</SectionTitle>
      <Card>
        <Row icon="shield" title="Privacy" subtitle="What is stored and where" onPress={() => router.push('/privacy')} testID="open-privacy" />
        <Divider />
        <Row icon="file-text" title="Terms of Use" onPress={() => Linking.openURL(LEGAL.terms)} />
        <Divider />
        <Row icon="mail" title="Support" subtitle={SUPPORT_EMAIL} onPress={() => Linking.openURL(LEGAL.support)} />
        <Divider />
        <Row icon="trash-2" title="Delete all my data" subtitle="Removes everything from this device" destructive onPress={confirmDelete} testID="delete-all" />
      </Card>
      <T variant="caption" style={{ textAlign: 'center', marginTop: 20 }}>
        Coressence Life 1.0 · Published by {PUBLISHER}
      </T>
      <T variant="caption" style={{ textAlign: 'center', marginTop: 4 }}>
        General education, not medical advice.
      </T>
    </Screen>
  );
}
