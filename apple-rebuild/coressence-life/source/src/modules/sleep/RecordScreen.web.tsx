// Web preview: the sound check needs the phone app's microphone and overnight recording.
import { router } from 'expo-router';
import React from 'react';
import { useTheme } from '@core/theme';
import { Button, Card, Note, Screen, T } from '@core/ui';

export default function RecordScreen() {
  const c = useTheme();
  return (
    <Screen title="Sleep sound check" subtitle="Runs on your phone overnight" color={c.pillar.sleep} accentBar testID="sound-web">
      <Card>
        <T variant="body">The sound check runs in the Coressence Life app for iPhone and Android. Your phone samples how loud the room is once a second through the night, analyzes it on the device, and keeps only the loudness summary.</T>
      </Card>
      <Note text="In the demo profile, the Sleep screen shows six sample nights so you can see the timeline and the summary." />
      <Button label="Back to Sleep" kind="secondary" style={{ marginTop: 16 }} onPress={() => router.back()} />
    </Screen>
  );
}
