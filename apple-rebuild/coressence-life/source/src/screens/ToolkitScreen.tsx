// Toolkit: every tool in the app, filed under the step of the method it serves, with the three signature tools first.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Deep, Paper } from '@core/art';
import { PURCHASES_LIVE } from '@core/appConfig';
import { usePremium } from '@core/billing/billing';
import { FONTS, moduleColor, useTheme } from '@core/theme';
import { Card, Divider, Row, Screen, SectionTitle, T, type IconName } from '@core/ui';
import { STEPS } from '../modules/cycle/model';
import { MODULES, type ModuleInfo } from '../modules/registry';

const SIGNATURE: { id: string; name: string; text: string; icon: IconName; route: string }[] = [
  { id: 'experiment', name: 'Weekly Experiment', text: 'One change, one week, your own numbers. Keep, adjust or drop.', icon: 'git-branch', route: '/experiment' },
  { id: 'performer', name: 'Performer Day', text: 'Show countdown, voice-load budget and the performance-day sequence.', icon: 'star', route: '/performer' },
  { id: 'why', name: 'Why this number', text: 'Readiness taken apart: what moved it, and by how many points.', icon: 'help-circle', route: '/why' },
];

const GROUPS: { key: ModuleInfo['step']; label: string; ask: string; extra?: { name: string; tagline: string; icon: IconName; route: string; id: string }[] }[] = [
  { key: 'assess', label: '1 · Assess', ask: STEPS[0].ask, extra: [{ id: 'checkin', name: 'Daily check-in', tagline: 'Twenty seconds: energy, mood, stress, soreness, focus', icon: 'edit-3', route: '/checkin' }] },
  { key: 'plan', label: '2 · Plan', ask: STEPS[1].ask, extra: [{ id: 'plan-builder', name: 'Plan builder', tagline: 'Outcome, action, constraint, minimum plan, decision rule', icon: 'edit', route: '/plan-builder' }] },
  { key: 'do', label: '3 · Do', ask: STEPS[2].ask },
  { key: 'measure', label: '4 · Measure', ask: STEPS[3].ask },
  { key: 'review', label: '5 · Review  ·  6 · Adjust', ask: STEPS[4].ask, extra: [{ id: 'review', name: 'Weekly review', tagline: 'This week against last, one adjustment, one rule', icon: 'refresh-ccw', route: '/review' }] },
  { key: 'more', label: 'Care and shop', ask: '' },
];

export default function ToolkitScreen() {
  const c = useTheme();
  const premium = usePremium();
  return (
    <Screen title="Toolkit" subtitle="Every tool, filed under the step it serves" back={false} testID="more">
      <View style={{ gap: 10 }}>
        {SIGNATURE.map((x) => (
          <Paper key={x.id} onPress={() => router.push(x.route as never)} testID={`sig-${x.id}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.sandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={x.icon} size={19} color={c.sand} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="title" style={{ fontSize: 19, lineHeight: 24 }}>
                  {x.name}
                </T>
                <T variant="small" color={c.inkSoft}>
                  {x.text}
                </T>
              </View>
              <Feather name="arrow-up-right" size={18} color={c.sand} />
            </View>
          </Paper>
        ))}
      </View>

      <Card style={{ marginTop: 14 }} onPress={() => router.push('/coressence')} testID="open-coressence">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Feather name="grid" size={20} color={c.teal} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">All of Coressence</T>
            <T variant="small" color={c.muted}>
              Every section on one page: Move, Fuel, Sleep, Recover, Restore, Stack Check, Resources, MD, Shop and more.
            </T>
          </View>
          <Feather name="chevron-right" size={17} color={c.muted} />
        </View>
      </Card>

      {GROUPS.map((g) => {
        const mods = MODULES.filter((m) => m.step === g.key);
        const rows = [...(g.extra ?? []), ...mods];
        if (!rows.length) return null;
        return (
          <View key={g.key}>
            <SectionTitle right={g.ask ? <T variant="quote" color={c.muted} style={{ fontSize: 14, lineHeight: 18 }}>{g.ask}</T> : undefined}>{g.label}</SectionTitle>
            <Card padded={false} style={{ paddingHorizontal: 14 }}>
              {rows.map((m, i) => (
                <View key={m.id}>
                  {i ? <Divider inset={48} /> : null}
                  <Row
                    icon={m.icon}
                    iconColor={moduleColor(c, m.id)}
                    title={m.name}
                    subtitle={m.tagline}
                    onPress={() => router.push(m.route as never)}
                    testID={`mod-${m.id}`}
                    right={<Feather name="chevron-right" size={17} color={c.muted} />}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      {PURCHASES_LIVE && !premium ? (
        <Pressable onPress={() => router.push('/plus')} testID="more-plus" style={{ marginTop: 22 }} accessibilityRole="button" accessibilityLabel="Coressence+ All-Access">
          <Deep>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name="star" size={22} color={c.foam} />
              <View style={{ flex: 1 }}>
                <T variant="heading" color="#FFFFFF" style={{ fontFamily: FONTS.semibold }}>
                  Coressence+ All-Access
                </T>
                <T variant="small" color="#CFE2EC">
                  Both courses in full, long history and every routine. 14-day free trial.
                </T>
              </View>
              <Feather name="chevron-right" size={20} color="#CFE2EC" />
            </View>
          </Deep>
        </Pressable>
      ) : null}

      <SectionTitle>App</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <Row icon="settings" title="Settings" onPress={() => router.push('/settings')} />
        <Divider inset={48} />
        <Row icon="shield" title="Privacy" onPress={() => router.push('/privacy')} />
      </Card>
    </Screen>
  );
}
