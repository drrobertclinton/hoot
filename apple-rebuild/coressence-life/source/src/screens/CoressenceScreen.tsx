// All of Coressence: every section of the family on one page, grouped by what it is for. Each tile opens that
// section inside Life, so one app (and later one membership) reaches everything.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { MD } from '@core/appConfig';
import { RADIUS, moduleColor, useTheme } from '@core/theme';
import { Screen, SectionTitle, T } from '@core/ui';
import { moduleInfo, type ModuleId } from '../modules/registry';

const SHELVES: { title: string; line: string; ids: ModuleId[] }[] = [
  { title: 'Body', line: 'Train it, feed it, rest it', ids: ['move', 'fuel', 'sleep', 'recover'] },
  { title: 'Mind and voice', line: 'Quiet the noise, protect the instrument', ids: ['restore', 'rehearse', 'track'] },
  { title: 'Your numbers', line: 'What the data says this week', ids: ['measure', 'monitor', 'devices', 'labs'] },
  { title: 'Learn and plan', line: 'The courses and the week ahead', ids: ['education', 'plan', 'coach'] },
  { title: 'Care and shop', line: 'Outside the app, when you want it', ids: ['md', 'shop'] },
];

const SHORT: Partial<Record<ModuleId, string>> = {
  move: 'Pilates, yoga, stretching, strength',
  fuel: 'Nutrition, water, eating windows',
  sleep: 'Sleep log and sound check',
  recover: 'Rest, replenish, readiness',
  restore: 'Breathing, quiet time, reflection',
  rehearse: 'Warmups and voice health',
  track: 'Check-in and habits',
  measure: 'Steps, heart, sleep, weight',
  monitor: 'Readiness, load, glucose, BP',
  devices: 'Watches, rings and straps',
  labs: 'Results, trends and notes',
  education: 'Live and Perform at Your Peak',
  plan: 'Personal plan and calendar',
  coach: 'The method and weekly review',
  md: `Telehealth visits · ${MD.statesLive.length === 1 ? MD.statesLive[0] : `${MD.statesLive.length} states`}`,
  shop: 'Gear guide and books',
};

export default function CoressenceScreen() {
  const c = useTheme();
  return (
    <Screen title="All of Coressence" subtitle="Every section, one app" testID="coressence">
      {SHELVES.map((s) => (
        <View key={s.title}>
          <SectionTitle right={<T variant="quote" color={c.muted} style={{ fontSize: 14, lineHeight: 18 }}>{s.line}</T>}>{s.title}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {s.ids.map((id) => {
              const m = moduleInfo(id);
              if (!m) return null;
              const color = moduleColor(c, id);
              return (
                <Pressable
                  key={id}
                  testID={`hub-${id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}. ${SHORT[id] ?? m.tagline}`}
                  onPress={() => router.push(m.route as never)}
                  style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 112, backgroundColor: c.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, borderTopWidth: 4, borderTopColor: color, padding: 14, opacity: pressed ? 0.75 : 1 })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={m.icon} size={18} color={color} />
                    </View>
                    <Feather name="arrow-up-right" size={16} color={c.muted} />
                  </View>
                  <T variant="title" style={{ fontSize: 19, lineHeight: 24, marginTop: 10 }}>
                    {id === 'education' ? 'Courses' : m.name}
                  </T>
                  <T variant="small" color={c.muted}>
                    {SHORT[id] ?? m.tagline}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <T variant="caption" style={{ marginTop: 18 }}>
        Everything you log stays on this device. Coressence MD is a separate medical service; nothing here is shared with a clinician unless you choose to share it.
      </T>
    </Screen>
  );
}
