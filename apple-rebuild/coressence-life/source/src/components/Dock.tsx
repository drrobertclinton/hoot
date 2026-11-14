// The step dock: a floating capsule in place of a tab bar. It names where the person is on the loop, holds the
// three places of the app (the place you are in opens out to show its name), and keeps the daily check-in one tap away.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayKey } from '@core/dates';
import { FONTS, useTheme } from '@core/theme';
import { T, type IconName } from '@core/ui';
import { STEPS, stepFor } from '@modules/cycle/model';
import { cycleFor } from '@modules/life/today';
import { useSlices } from '@modules/life/state';

const PLACES: Record<string, { label: string; icon: IconName; testID: string }> = {
  index: { label: 'This week', icon: 'repeat', testID: 'tab-today' },
  learn: { label: 'Course', icon: 'book-open', testID: 'tab-learn' },
  toolkit: { label: 'Toolkit', icon: 'layers', testID: 'tab-more' },
};

export function Dock({ index, routes, go }: { index: number; routes: { key: string; name: string }[]; go: (name: string) => void }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = useSlices();
  const today = dayKey();
  const at = stepFor(cycleFor(s, today));
  const checked = !!s.track.checkins[today];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 6, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 440, paddingHorizontal: 20 }}>
        <View testID="dock" style={{ flex: 1, height: 62, borderRadius: 22, backgroundColor: c.deep, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, gap: 2, shadowColor: '#03121B', shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10, borderWidth: 1, borderColor: '#FFFFFF1F' }}>
          {routes.map((r, i) => {
            const p = PLACES[r.name];
            if (!p) return null;
            const on = i === index;
            return (
              <Pressable key={r.key} testID={p.testID} accessibilityRole="tab" accessibilityLabel={p.label} accessibilityState={{ selected: on }} onPress={() => go(r.name)} style={({ pressed }) => ({ height: 48, flexGrow: on ? 1 : 0, minWidth: 52, borderRadius: 16, paddingHorizontal: on ? 14 : 0, backgroundColor: on ? '#FFFFFF' : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.75 : 1 })}>
                <Feather name={p.icon} size={19} color={on ? c.deep : '#B5CFDA'} />
                {on ? (
                  <View>
                    <T variant="caption" color={c.deep} style={{ fontFamily: FONTS.semibold, fontSize: 13.5, lineHeight: 16 }}>
                      {p.label}
                    </T>
                    {r.name === 'index' ? (
                      <T variant="caption" color="#3C6377" style={{ fontSize: 10.5, lineHeight: 13 }} numberOfLines={1}>
                        Step {at.step.n} of {STEPS.length} · {at.step.label}
                      </T>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Pressable testID="dock-checkin" accessibilityRole="button" accessibilityLabel={checked ? 'Edit today’s check-in' : 'Daily check-in'} onPress={() => router.push('/checkin')} style={({ pressed }) => ({ width: 62, height: 62, borderRadius: 22, backgroundColor: checked ? c.surface : c.teal, borderWidth: 1, borderColor: checked ? c.line : c.teal, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1, shadowColor: '#03121B', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 })}>
          <Feather name={checked ? 'check' : 'edit-3'} size={22} color={checked ? c.ok : '#FFFFFF'} />
        </Pressable>
      </View>
    </View>
  );
}
