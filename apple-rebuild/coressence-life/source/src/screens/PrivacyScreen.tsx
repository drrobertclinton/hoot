// Privacy statement, in plain language.
import React from 'react';
import { Linking, View } from 'react-native';
import { PUBLISHER, SUPPORT_EMAIL } from '@core/appConfig';
import { LEGAL } from '@core/billing/config';
import { useTheme } from '@core/theme';
import { Button, Card, Screen, T } from '@core/ui';

const SECTIONS: [string, string][] = [
  ['Your data stays on your phone', 'Check-ins, sleep, meals, workouts, lab results, plans and lesson answers are stored only on this device. There is no Coressence account and no server copy. If you delete the app or use "Delete all my data", they are gone.'],
  ['Apple Health and Health Connect', 'If you connect them, the app reads (never writes) activity, workouts and heart rate zones, heart rate and heart rate variability, sleep and sleep stages, breathing rate, blood oxygen, temperature changes, VO2 max, weight and body composition, blood pressure, glucose, cycle days, mindful minutes, sound levels, cardio recovery, and ECG results and rhythm notifications as your watch reported them. This data stays on your phone. It is never sent to Coressence, never stored in iCloud, never used for advertising and never sold or shared.'],
  ['Bluetooth heart rate straps', 'During a live workout the app reads heart rate from a strap you pair. Readings stay on your phone and are saved only as part of the workout you log.'],
  ['Microphone', 'The sleep sound check measures how loud the room is once a second while it runs. The phone needs a temporary recording file to do this; it is deleted when the check ends. No audio is kept or sent anywhere. Only the loudness summary is saved.'],
  ['Reminders', 'Reminders are scheduled on your phone. Nothing is sent to a server to deliver them.'],
  ['No tracking, no ads', 'The app has no advertising, no analytics SDKs and no tracking across other apps or websites.'],
  ['Camera and food lookups', 'If you scan a food barcode, the camera reads the barcode only while the scanner is open; no photos or video are kept. The barcode number, or the words you type into food search, go to Open Food Facts to find the product. Nothing else about you is sent.'],
  ['Sharing with your coach', 'A coach summary is built only from the categories you switch on, shown to you first, and handed to your share sheet. Coressence does not send it anywhere.'],
  ['Children', 'Coressence Life is meant for adults and is not directed to children under 13.'],
];

export default function PrivacyScreen() {
  const c = useTheme();
  return (
    <Screen title="Privacy" subtitle="Plain-language summary" testID="privacy">
      {SECTIONS.map(([h, b]) => (
        <Card key={h} style={{ marginBottom: 10 }}>
          <T variant="heading">{h}</T>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
            {b}
          </T>
        </Card>
      ))}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Button label="Full privacy policy" kind="secondary" compact onPress={() => Linking.openURL(LEGAL.privacy)} />
        <Button label="Contact us" kind="ghost" compact onPress={() => Linking.openURL(LEGAL.support)} />
      </View>
      <T variant="caption" style={{ marginTop: 14 }}>
        Questions: {SUPPORT_EMAIL}. Published by {PUBLISHER}.
      </T>
    </Screen>
  );
}
