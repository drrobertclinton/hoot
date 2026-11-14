// Coach Portal hand-off in the Coach screen: share a consented summary file, and open coach feedback files.
// All imported text is shown as plain text.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { dayKey } from '@core/dates';
import { useSettings } from '@core/settings';
import { shareFile } from '@core/share';
import { FONTS, moduleColor, useTheme } from '@core/theme';
import { Button, Card, Note, Screen, SectionTitle, T } from '@core/ui';
import { coursesFor } from '../education/catalog';
import { useEdu } from '../education/state';
import { useSlices } from '../life/state';
import { currentPlan } from '../plan/model';
import { CONSENT_INFO, NO_CONSENT, buildShare, parseFeedbackText, shareFileName, type Consent } from './share';
import { addFeedback, deleteFeedback, useCoach } from './state';

async function pickFeedbackText(): Promise<string | null> {
  const DocumentPicker = await import('expo-document-picker');
  const r = await DocumentPicker.getDocumentAsync({ type: Platform.OS === 'ios' ? ['public.json', 'public.text'] : ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  if (a.size && a.size > 2_000_000) return '\u0000too-large';
  if (Platform.OS === 'web' && a.file) return await a.file.text();
  const { File } = await import('expo-file-system');
  return await new File(a.uri).text();
}

/** The "Your coach" section on the Coach screen. */
export function CoachPortalSection() {
  const c = useTheme();
  const coach = useCoach();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const open = async () => {
    setMsg(null);
    try {
      const text = await pickFeedbackText();
      if (text === null) return;
      const r = text === '\u0000too-large' ? { ok: false as const, error: 'That file is too large to be coach feedback.' } : parseFeedbackText(text);
      if (!r.ok) return setMsg({ tone: 'warn', text: r.error });
      addFeedback(r.value);
      setMsg({ tone: 'ok', text: `Feedback from ${r.value.coach} saved on this device.` });
    } catch {
      setMsg({ tone: 'warn', text: 'That file could not be opened. Try again, or ask your coach to export it again.' });
    }
  };
  const list = coach.feedback ?? [];
  return (
    <>
      <SectionTitle>Your coach</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Share with my coach" icon="send" kind="secondary" style={{ flex: 1 }} onPress={() => router.push('/coach-share')} testID="coach-share" />
        <Button label="Open coach feedback" icon="inbox" kind="secondary" style={{ flex: 1 }} onPress={open} testID="coach-feedback-open" />
      </View>
      {msg ? <Note tone={msg.tone} text={msg.text} /> : null}
      {list.map((f) => (
        <Card key={f.id} style={{ marginTop: 12 }} testID="coach-feedback">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="message-square" size={18} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{f.coach}</T>
              <T variant="caption">
                {f.file ? `On ${f.file} · ` : ''}opened {new Date(f.received).toLocaleDateString()}
              </T>
            </View>
            <Button label="Delete" icon="trash-2" kind="ghost" compact onPress={() => deleteFeedback(f.id)} testID="coach-feedback-delete" />
          </View>
          {f.overall ? (
            <T variant="body" style={{ marginTop: 10 }}>
              {f.overall}
            </T>
          ) : null}
          {f.comments.map((cm, i) => (
            <View key={i} style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: c.line }}>
              <T variant="caption" style={{ fontFamily: FONTS.semibold }}>
                {cm.at}
              </T>
              <T variant="small">{cm.text}</T>
            </View>
          ))}
        </Card>
      ))}
      {!list.length ? (
        <T variant="caption" style={{ marginTop: 8 }}>
          You choose what to share, and you choose where the file goes. Coach feedback files you open stay on this device.
        </T>
      ) : null}
    </>
  );
}

/** Consent and preview before anything is shared. */
export function CoachShareScreen() {
  const c = useTheme();
  const s = useSlices();
  const edu = useEdu();
  const name = useSettings((x) => x.name);
  const track = useSettings((x) => x.track);
  const color = moduleColor(c, 'coach');
  const [consent, setConsent] = useState<Consent>(NO_CONSENT);
  const [result, setResult] = useState<string>('');
  const today = dayKey();
  const plan = currentPlan(s.plan);
  const payload = buildShare({ name, goal: plan?.outcome ?? null, track: s.track, measure: s.measure, sleep: s.sleep, move: s.move, rehearse: s.rehearse, edu, courses: coursesFor(track), today }, consent);
  const json = JSON.stringify(payload, null, 2);
  const file = shareFileName(today);
  return (
    <Screen title="Share with my coach" subtitle="You choose what goes in the file" color={color} accentBar testID="coach-share-screen">
      <T variant="small" color={c.inkSoft}>
        Everything is off until you switch it on. Your name and your plan’s goal are always included so your coach knows who the file is from.
      </T>
      <Card style={{ marginTop: 12 }} padded={false}>
        {CONSENT_INFO.map((x, i) => (
          <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{x.title}</T>
              <T variant="caption">{x.line}</T>
            </View>
            <Switch value={consent[x.key]} onValueChange={(v) => setConsent({ ...consent, [x.key]: v })} testID={`consent-${x.key}`} accessibilityLabel={`Share ${x.title}`} />
          </View>
        ))}
      </Card>
      <SectionTitle>Exactly what will be shared</SectionTitle>
      <Card tint={c.surface2}>
        <T variant="caption" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} testID="coach-share-preview">
          {json}
        </T>
      </Card>
      <T variant="caption" style={{ marginTop: 6 }}>
        File: {file}. Values with no data are left empty (null); nothing is estimated.
      </T>
      <Button
        label={Platform.OS === 'web' ? 'Download file' : 'Share file'}
        icon="share"
        style={{ marginTop: 16 }}
        color={color}
        testID="coach-share-send"
        onPress={async () => {
          const ok = await shareFile(file, json, 'application/json');
          setResult(ok ? (Platform.OS === 'web' ? 'Downloaded.' : 'Handed to your share sheet.') : 'Sharing did not finish. Nothing was sent.');
        }}
      />
      {result ? (
        <T variant="small" color={c.ok} style={{ marginTop: 8 }}>
          {result}
        </T>
      ) : null}
      <Note text="Coressence does not send this file anywhere. Your phone’s share sheet lets you pick the app or person. Sharing is educational; it does not set up medical care." />
    </Screen>
  );
}
