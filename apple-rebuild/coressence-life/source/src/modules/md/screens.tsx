// MD: entry point for telehealth visits. A separate clinical service, clearly apart from the education program.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, View } from 'react-native';
import { MD } from '@core/appConfig';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Note, Row, Divider, Screen, SectionTitle, T } from '@core/ui';
import { setInterested, useMd } from './state';

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function requestVisit() {
  const subject = encodeURIComponent(`Coressence MD visit request (${list(MD.statesLive)})`);
  const body = encodeURIComponent('Please contact me about a Coressence MD telehealth visit.\n\nName:\nState I will be in at the time of the visit:\nBest phone number and time to reach me:\n\nPlease do not put medical details in this email. The practice will collect those securely.');
  Linking.openURL(`mailto:${MD.requestEmail}?subject=${subject}&body=${body}`).catch(() => undefined);
}

export function MdScreen() {
  const c = useTheme();
  const md = useMd();
  const color = moduleColor(c, 'md');
  const where = list(MD.statesLive);
  return (
    <Screen title="Coressence MD" subtitle="Telehealth visits with a licensed physician" color={color} accentBar testID="md">
      <Card style={{ borderColor: color, borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="video" size={20} color={color} />
          <T variant="heading">A separate medical service</T>
        </View>
        <T variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
          Coressence Life is an education program. Medical visits are clinical care from a licensed medical practice, kept separate from the course, the coaching and the app’s data. Nothing you log in the app is shared with a clinician unless you choose to share it.
        </T>
      </Card>

      <SectionTitle>Where visits are available</SectionTitle>
      <Card testID="md-states">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="map-pin" size={18} color={color} />
          <T variant="title" style={{ fontSize: 20, lineHeight: 25 }}>
            {where}
          </T>
        </View>
        <T variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
          Visits are open today to people who are in {where} at the time of the visit, through {MD.practiceName || 'the medical practice of Robert Clinton, MD'}. Telehealth law follows where the patient is, so other states are added only as the physician is licensed there.
        </T>
      </Card>

      <SectionTitle>{MD.bookingUrl ? 'Book a visit' : 'Request a visit'}</SectionTitle>
      <Card>
        {MD.bookingUrl ? (
          <>
            <T variant="body">Book a video visit{MD.practiceName ? ` with ${MD.practiceName}` : ''}.</T>
            <Button label="Book a visit" icon="calendar" style={{ marginTop: 12 }} onPress={() => Linking.openURL(MD.bookingUrl)} color={color} />
          </>
        ) : (
          <>
            <T variant="body">Send a short request and the practice will contact you to set up the visit. Leave medical details out of the email.</T>
            <Button label={`Request a visit in ${where}`} icon="mail" style={{ marginTop: 12 }} onPress={requestVisit} color={color} testID="md-request" />
          </>
        )}
        <T variant="caption" style={{ marginTop: 10 }}>
          Visits are billed by the medical practice, outside the app. The app does not sell or take payment for medical care.
        </T>
      </Card>

      <SectionTitle>{`Not in ${where}?`}</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <Row
          icon={md.interested ? 'check' : 'bell'}
          iconColor={color}
          title={md.interested ? 'Noted on this device' : 'Remind me to check back'}
          subtitle={md.interested ? 'This page will show new states as they open.' : 'Keeps a note here; nothing is sent anywhere.'}
          onPress={() => setInterested(!md.interested)}
          testID="md-interest"
        />
        <Divider inset={48} />
        <Row icon="share-2" iconColor={color} title="Bring your own clinician your data" subtitle="Coach share makes a summary you choose to send" onPress={() => router.push('/coach-share')} />
      </Card>

      <SectionTitle>Good reasons to book</SectionTitle>
      <Card>
        {['A score or symptom that stays off for more than two weeks', 'Questions about labs, medicines or supplements', 'A plan for sleep, weight, blood pressure or blood sugar', 'Voice or performance concerns that are not settling'].map((x) => (
          <View key={x} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5 }}>
            <Feather name="check" size={16} color={color} style={{ marginTop: 3 }} />
            <T variant="small" color={c.inkSoft} style={{ flex: 1 }}>
              {x}
            </T>
          </View>
        ))}
      </Card>

      <Note tone="danger" text="If you think you are having a medical emergency, call 911 or your local emergency number. In the U.S., call or text 988 for the Suicide and Crisis Lifeline." />
      <Note text="Some concerns need an in-person exam. The physician decides whether telehealth is appropriate for yours." />
    </Screen>
  );
}
