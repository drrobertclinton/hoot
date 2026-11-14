// Coach: the course cycle, notes drawn from your data, and the weekly review.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePremium } from '@core/billing/billing';
import { addDays, dayKey, longDate, shortDate, weekStart } from '@core/dates';
import { useSettings } from '@core/settings';
import { FONTS, moduleColor, useTheme } from '@core/theme';
import { Button, Card, Field, Note, Screen, SectionTitle, T } from '@core/ui';
import { coachNotes, cycleFor, fmtNumber, weekNumbers } from '../life/today';
import { useSlices } from '../life/state';
import { adherence, currentPlan } from '../plan/model';
import { PHASES } from './model';
import { saveReview, useCoach } from './state';
import { CoachPortalSection } from './portal';

const NEXT_STEP: Record<string, { label: string; route: string }> = {
  assess: { label: 'Do today’s check-in', route: '/checkin' },
  plan: { label: 'Build my plan', route: '/plan-builder' },
  execute: { label: 'See this week', route: '/plan' },
  measure: { label: 'Open Measure', route: '/measure' },
  review: { label: 'Start weekly review', route: '/review' },
  adjust: { label: 'Revise my plan', route: '/plan-builder' },
  maintain: { label: 'Start weekly review', route: '/review' },
};

function CycleWheel({ phase, color, track }: { phase: string; color: string; track: string }) {
  const size = 210;
  const r = 82;
  const cx = size / 2;
  const n = PHASES.length;
  const idx = PHASES.findIndex((p) => p.key === phase);
  const arc = (i: number) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.06;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.06;
    return `M ${cx + r * Math.cos(a0)} ${cx + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cx + r * Math.sin(a1)}`;
  };
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={1} fill="none" />
        {PHASES.map((p, i) => (
          <Path key={p.key} d={arc(i)} stroke={i === idx ? color : i < idx ? color + '66' : track} strokeWidth={i === idx ? 16 : 10} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
      {PHASES.map((p, i) => {
        const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
        const lr = r + 0;
        return i === idx ? null : (
          <View key={p.key} style={{ position: 'absolute', left: cx + lr * Math.cos(a) - 2, top: cx + lr * Math.sin(a) - 2, width: 4, height: 4 }} />
        );
      })}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <T variant="caption">Step {idx + 1} of 7</T>
        <T variant="display" style={{ fontFamily: FONTS.displayBold }}>
          {PHASES[idx].label}
        </T>
      </View>
    </View>
  );
}

export function CoachScreen() {
  const c = useTheme();
  const s = useSlices();
  const coach = useCoach();
  const goals = useSettings((x) => x.goals);
  const premium = usePremium();
  const today = dayKey();
  const phase = cycleFor(s, today);
  const notes = coachNotes(s, goals, premium, today);
  const color = moduleColor(c, 'coach');
  const ph = PHASES.find((p) => p.key === phase)!;
  return (
    <Screen title="Coach" subtitle="Assess, plan, do, measure, review, adjust, keep what works" color={color} accentBar testID="coach">
      <Card>
        <CycleWheel phase={phase} color={c.teal} track={c.surface2} />
        <T variant="body" style={{ textAlign: 'center', marginTop: 4 }}>
          {ph.text}
        </T>
        <Button label={NEXT_STEP[phase].label} icon="arrow-right" style={{ marginTop: 14 }} onPress={() => router.push(NEXT_STEP[phase].route as never)} testID="coach-next" />
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {PHASES.map((p, i) => (
          <T key={p.key} variant="caption" color={p.key === phase ? c.teal : c.muted} style={{ fontFamily: p.key === phase ? FONTS.semibold : FONTS.medium }}>
            {i + 1}. {p.label}
            {i < PHASES.length - 1 ? '  ›' : ''}
          </T>
        ))}
      </View>

      <SectionTitle>Coach notes</SectionTitle>
      {notes.length ? (
        notes.map((n) => (
          <Card key={n.id} style={{ marginBottom: 10 }} onPress={n.route ? () => router.push(n.route as never) : undefined}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Feather name={n.tone === 'warn' ? 'alert-circle' : n.tone === 'good' ? 'award' : 'info'} size={18} color={n.tone === 'warn' ? c.warn : n.tone === 'good' ? c.ok : c.accent} style={{ marginTop: 2 }} />
              <T variant="small" style={{ flex: 1 }}>
                {n.text}
              </T>
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <T variant="small" color={c.muted}>
            Notes appear here as you log. A few days of check-ins, sleep and movement are enough to start.
          </T>
        </Card>
      )}

      <SectionTitle right={<T variant="caption" color={c.accent} onPress={() => router.push('/review')}>New review</T>}>Weekly reviews</SectionTitle>
      {coach.reviews.length ? (
        coach.reviews.map((r) => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <T variant="label">{longDate(r.date)}</T>
            {r.wins ? (
              <T variant="small" style={{ marginTop: 6 }}>
                <T variant="small" style={{ fontWeight: '600' }}>Went well: </T>
                {r.wins}
              </T>
            ) : null}
            {r.obstacles ? (
              <T variant="small" style={{ marginTop: 4 }}>
                <T variant="small" style={{ fontWeight: '600' }}>Got in the way: </T>
                {r.obstacles}
              </T>
            ) : null}
            {r.adjustment ? (
              <T variant="small" style={{ marginTop: 4 }}>
                <T variant="small" style={{ fontWeight: '600' }}>Adjustment: </T>
                {r.adjustment}
              </T>
            ) : null}
            {r.ruleIf ? (
              <T variant="caption" style={{ marginTop: 6 }}>
                If {r.ruleIf}, then {r.ruleThen}. Next review {shortDate(r.nextReview)}.
              </T>
            ) : null}
          </Card>
        ))
      ) : (
        <Card>
          <T variant="small" color={c.muted}>
            No reviews yet. Your first one takes about five minutes at the end of the week.
          </T>
        </Card>
      )}
      <CoachPortalSection />
      <Note text="Coach notes are simple rules applied to what you log. They are general education and never a diagnosis or treatment advice." />
    </Screen>
  );
}

export function ReviewScreen() {
  const c = useTheme();
  const s = useSlices();
  const goals = useSettings((x) => x.goals);
  const today = dayKey();
  const nums = weekNumbers(s, goals, today);
  const p = currentPlan(s.plan);
  const adh = adherence(s.plan.items, addDays(today, -6), today);
  const [f, setF] = useState({ wins: '', obstacles: '', adjustment: '', ruleIf: p?.ruleIf ?? '', ruleThen: p?.ruleThen ?? '' });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const color = moduleColor(c, 'coach');
  const next = addDays(today, 7);
  return (
    <Screen title="Weekly review" subtitle={`${shortDate(addDays(today, -6))} to ${shortDate(today)}, compared with the week before`} color={color} accentBar testID="review">
      <Card padded={false}>
        {nums.map((n, i) => {
          const d = n.cur !== null && n.prev !== null ? n.cur - n.prev : null;
          const good = d === null || n.better === 'none' ? null : (d > 0) === (n.better === 'up');
          const flat = d !== null && Math.abs(d) < (n.dp ? 0.05 : 0.5);
          return (
            <View key={n.key} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <T variant="small" style={{ flex: 1 }}>
                {n.label}
              </T>
              <T variant="caption" style={{ width: 80, textAlign: 'right' }}>
                {fmtNumber(n, n.prev)}
              </T>
              <Feather name="arrow-right" size={13} color={c.muted} style={{ marginHorizontal: 8 }} />
              <T variant="bodyStrong" style={{ width: 84, textAlign: 'right' }} color={flat || good === null ? c.ink : good ? c.ok : c.warn}>
                {fmtNumber(n, n.cur)}
              </T>
            </View>
          );
        })}
      </Card>
      {adh.total ? (
        <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
          Plan: {adh.done} of {adh.total} scheduled sessions done in the last 7 days.
        </T>
      ) : null}
      <SectionTitle>Reflect</SectionTitle>
      <Card>
        <Field label="What went well?" value={f.wins} onChangeText={set('wins')} multiline testID="rv-wins" />
        <Field label="What got in the way?" value={f.obstacles} onChangeText={set('obstacles')} multiline />
        <Field label="One adjustment for next week" value={f.adjustment} onChangeText={set('adjustment')} placeholder="Change one thing at a time" testID="rv-adjust" />
        <Field label="Decision rule: if…" value={f.ruleIf} onChangeText={set('ruleIf')} />
        <Field label="…then I will" value={f.ruleThen} onChangeText={set('ruleThen')} />
        <T variant="caption" style={{ marginTop: 10 }}>
          Next review: {longDate(next)}
        </T>
      </Card>
      {saved ? (
        <Card style={{ marginTop: 14 }}>
          <T variant="heading">Review saved</T>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
            {f.adjustment ? 'You chose an adjustment. Update your plan so the calendar matches.' : 'Keep going with your current plan.'}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {f.adjustment ? <Button label="Revise my plan" icon="edit" compact onPress={() => router.replace('/plan-builder')} /> : null}
            <Button label="Done" kind="secondary" compact onPress={() => router.back()} />
          </View>
        </Card>
      ) : (
        <Button
          label="Save review"
          icon="check"
          style={{ marginTop: 16 }}
          testID="rv-save"
          onPress={() => {
            saveReview({ date: today, numbers: nums.map((n) => ({ label: n.label, value: fmtNumber(n, n.cur) })), ...f, nextReview: next });
            setSaved(true);
          }}
        />
      )}
      <T variant="caption" style={{ marginTop: 12 }}>
        Week starting {shortDate(weekStart(today))}. Look at averages, note the context, and change one thing at a time.
      </T>
    </Screen>
  );
}
