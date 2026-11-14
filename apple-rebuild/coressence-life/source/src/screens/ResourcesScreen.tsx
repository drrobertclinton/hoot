// Resources and books: the two course books (their full text is in the app), the worksheets and homework, the
// practical guides built into each section, and where to turn for urgent help.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, View } from 'react-native';
import { BOOK_LINKS, LIBRARY_LINKS } from '@core/appConfig';
import { Paper } from '@core/art';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Divider, Note, Row, Screen, SectionTitle, T, type IconName } from '@core/ui';
import { BOOKS, COURSE_TITLE, type Course } from '../modules/education/course/modules';

const BLURB: Record<Course, string> = {
  live: 'The everyday program: sleep, movement, food, recovery and restoration, built into one weekly cycle.',
  perform: 'For singers, actors and speakers: the same method, tuned to rehearsal weeks, show days and the voice.',
};

const GUIDES: { icon: IconName; id: string; title: string; text: string; route: string }[] = [
  { icon: 'wind', id: 'restore', title: 'Breathing sessions', text: 'Paced breathing you can follow with the screen', route: '/breathe' },
  { icon: 'activity', id: 'move', title: 'Movement routines', text: 'Pilates, yoga, stretching and strength, step by step', route: '/move' },
  { icon: 'mic', id: 'rehearse', title: 'Vocal warmups', text: 'Warmups and a voice health log', route: '/rehearse' },
  { icon: 'moon', id: 'sleep', title: 'Sleep sounds', text: 'Steady noise for falling asleep', route: '/sleep' },
  { icon: 'edit', id: 'plan', title: 'Plan builder', text: 'Outcome, action, constraint, minimum plan, decision rule', route: '/plan-builder' },
  { icon: 'layers', id: 'stack', title: 'Stack Check', text: 'Everything you take, ready to show a pharmacist', route: '/stack' },
  { icon: 'droplet', id: 'labs', title: 'Lab results explained', text: 'What common panels measure, in plain words', route: '/labs' },
];

// The Coressence Health Library: six books by the same author. They are finished manuscripts that are not in stores
// yet, so each entry points to the section of the app that covers the same ground today. LIBRARY_LINKS adds a
// "Get the book" button per title once it is published.
const LIBRARY: { key: string; title: string; sub: string; goes: string; route: string; id: string }[] = [
  { key: 'lifestyle', title: 'The Coressence Lifestyle', sub: 'A Physician’s Plan for Body, Mind, Spirit and the Life Around Them', goes: 'The weekly cycle', route: '/coach', id: 'coach' },
  { key: 'nutrition', title: 'Coressence Nutrition', sub: 'What to Eat, How Much and When, Without the Fads', goes: 'Fuel', route: '/fuel', id: 'fuel' },
  { key: 'kitchen', title: 'The Coressence Kitchen', sub: 'Food That Tastes Good and Works as Hard as You Do', goes: 'Fuel', route: '/fuel', id: 'fuel' },
  { key: 'recovery', title: 'Recovery', sub: 'What Actually Helps You Bounce Back, and What Gets in the Way', goes: 'Recover', route: '/recover', id: 'recover' },
  { key: 'mind', title: 'A Sharp Mind', sub: 'Habits That Keep You Focused, Calm and Clear at Every Age', goes: 'Restore', route: '/restore', id: 'restore' },
  { key: 'zinc', title: 'From A to Zinc', sub: 'Making Sense of Supplements', goes: 'Stack Check', route: '/stack', id: 'stack' },
];

export default function ResourcesScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'resources');
  return (
    <Screen title="Resources and books" subtitle="What to read, and what to reach for" color={color} accentBar testID="resources">
      <SectionTitle>Books</SectionTitle>
      <View style={{ gap: 10 }}>
        {(['live', 'perform'] as Course[]).map((k) => {
          const b = BOOKS[k];
          const link = BOOK_LINKS[k];
          return (
            <Paper key={k} testID={`book-${k}`}>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ width: 62, height: 88, borderRadius: 6, backgroundColor: k === 'live' ? c.teal : moduleColor(c, 'rehearse'), padding: 7, justifyContent: 'space-between' }}>
                  <T variant="caption" color="#FFFFFF" style={{ fontSize: 9.5, lineHeight: 12 }}>
                    {COURSE_TITLE[k]}
                  </T>
                  <T variant="caption" color="#FFFFFFB3" style={{ fontSize: 8, lineHeight: 10 }}>
                    Robert Clinton, MD
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="title" style={{ fontSize: 19, lineHeight: 24 }}>
                    {COURSE_TITLE[k]}
                  </T>
                  <T variant="small" color={c.inkSoft}>
                    {BLURB[k]}
                  </T>
                  <T variant="caption" style={{ marginTop: 6 }}>
                    {b.weeks.length} weeks · {b.topics.length} topics · {b.worksheets.length} worksheets
                  </T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button label="Read in the app" icon="book-open" compact color={color} style={{ flex: 1 }} onPress={() => router.push('/learn')} testID={`book-read-${k}`} />
                {link ? <Button label="Get the book" icon="external-link" kind="secondary" compact style={{ flex: 1 }} onPress={() => Linking.openURL(link)} /> : null}
              </View>
            </Paper>
          );
        })}
      </View>

      <SectionTitle>The Coressence Health Library</SectionTitle>
      <T variant="small" color={c.muted} style={{ marginBottom: 10 }}>
        Six books by Robert Clinton, MD, in preparation for print. Each one pairs with a section you can use in the app today.
      </T>
      <Card padded={false} style={{ paddingHorizontal: 14 }} testID="library">
        {LIBRARY.map((b, i) => {
          const tint = moduleColor(c, b.id);
          const link = LIBRARY_LINKS[b.key];
          return (
            <View key={b.key}>
              {i ? <Divider /> : null}
              <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'center' }}>
                <View style={{ width: 8, alignSelf: 'stretch', borderRadius: 3, backgroundColor: tint }} />
                <View style={{ flex: 1 }}>
                  <T variant="title" style={{ fontSize: 17, lineHeight: 22 }}>
                    {b.title}
                  </T>
                  <T variant="small" color={c.muted}>
                    {b.sub}
                  </T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <Button label={`Open ${b.goes}`} icon="arrow-right" kind="secondary" compact onPress={() => router.push(b.route as never)} testID={`lib-${b.key}`} />
                    {link ? <Button label="Get the book" icon="external-link" kind="ghost" compact onPress={() => Linking.openURL(link)} /> : null}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <SectionTitle>From the courses</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <Row icon="file-text" iconColor={color} title="Worksheets and homework" subtitle="Fill them in, save copies, share a finished one" onPress={() => router.push('/learn')} testID="res-worksheets" />
        <Divider inset={48} />
        <Row icon="compass" iconColor={color} title="The method on one page" subtitle="Assess, plan, do, measure, review, adjust" onPress={() => router.push('/coach')} testID="res-method" />
        <Divider inset={48} />
        <Row icon="refresh-ccw" iconColor={color} title="Weekly review" subtitle="This week against last, one adjustment, one rule" onPress={() => router.push('/review')} />
      </Card>

      <SectionTitle>Practical guides</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {GUIDES.map((g, i) => (
          <View key={g.title}>
            {i ? <Divider inset={48} /> : null}
            <Row icon={g.icon} iconColor={moduleColor(c, g.id)} title={g.title} subtitle={g.text} onPress={() => router.push(g.route as never)} testID={`res-${g.id}`} />
          </View>
        ))}
      </Card>

      <SectionTitle>When you need a person</SectionTitle>
      <Card>
        {[
          ['phone', 'Emergency: call 911 or your local emergency number.'],
          ['message-circle', 'In the U.S., call or text 988 for the Suicide and Crisis Lifeline, any time.'],
          ['user', 'Your pharmacist can review everything you take. Your clinician knows your history.'],
        ].map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5 }}>
            <Feather name={icon as IconName} size={16} color={color} style={{ marginTop: 3 }} />
            <T variant="small" color={c.inkSoft} style={{ flex: 1 }}>
              {text}
            </T>
          </View>
        ))}
        <Button label="Coressence MD" icon="video" kind="secondary" compact style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/md')} />
      </Card>
      <Note text="General education, not medical advice." />
    </Screen>
  );
}
