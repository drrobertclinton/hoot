// "Why this number": readiness taken apart, point by point, for any of the last seven days.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Deep, Rise } from '@core/art';
import { addDays, dayKey, lastDays, longDate, weekdayShort } from '@core/dates';
import { useSettings } from '@core/settings';
import { FONTS, RADIUS, moduleColor, useTheme } from '@core/theme';
import { Card, Divider, Note, Row, Screen, SectionTitle, T } from '@core/ui';
import { readinessInput } from '../life/today';
import { useSlices } from '../life/state';
import { explainReadiness, pointsWords, type ExplainRow } from './explain';
import { readinessWords } from './model';

const RAISE: Record<ExplainRow['key'], string> = {
  sleep: 'An earlier night is the fastest way to move this tomorrow. It is also a good Weekly Experiment.',
  hrv: 'Heart rate variability recovers with sleep, an easier day and less alcohol. Favor your minimum plan today.',
  rhr: 'A raised resting heart rate usually settles with rest, fluids and sleep. If it stays up for several days or you feel unwell, check in with a clinician.',
  soreness: 'Swap the hard session for easy movement and mobility; soreness usually clears in a day or two.',
  temp: 'A temperature shift can mean your body is fighting something. Keep today light and watch how you feel.',
};
const ICON: Record<ExplainRow['key'], 'activity' | 'heart' | 'moon' | 'zap' | 'thermometer'> = { hrv: 'activity', rhr: 'heart', sleep: 'moon', soreness: 'zap', temp: 'thermometer' };

export function WhyScreen() {
  const c = useTheme();
  const s = useSlices();
  const goals = useSettings((x) => x.goals);
  const today = dayKey();
  const [date, setDate] = useState(today);
  const color = moduleColor(c, 'recover');
  const input = (d: string) => ({ ...readinessInput(s, goals, d), sleepGoal: goals.sleepHours });
  const e = explainReadiness(input(date), input(addDays(date, -1)));
  const days = lastDays(7, today).map((d) => ({ d, score: explainReadiness(input(d)).score }));
  const worst = [...e.rows].sort((a, b) => a.delta - b.delta)[0];
  // The step chart runs from 40 to 100 points.
  const LO = 40;
  const HI = 100;
  const pct = (v: number) => `${((Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * 100}%` as const;

  return (
    <Screen title="Why this number" subtitle="Readiness, taken apart" color={color} accentBar testID="why">
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
        {days.map(({ d, score }) => {
          const on = d === date;
          return (
            <Pressable key={d} testID={`why-day-${d === today ? 'today' : d}`} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${longDate(d)}: readiness ${score ?? 'no data'}`} onPress={() => setDate(d)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.chip, backgroundColor: on ? c.deep : c.surface, borderWidth: 1, borderColor: on ? c.deep : c.line }}>
              <T variant="caption" color={on ? '#A9C6D2' : c.muted} style={{ fontSize: 10.5 }}>
                {d === today ? 'Today' : weekdayShort(d)}
              </T>
              <T variant="stat" color={on ? '#FFFFFF' : c.ink} style={{ fontSize: 17, lineHeight: 22 }}>
                {score ?? '–'}
              </T>
            </Pressable>
          );
        })}
      </View>

      <Rise>
        <Deep style={{ marginTop: 12 }} testID="why-hero">
          <T variant="label" color={c.foam}>
            {date === today ? 'Today' : longDate(date)}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <T variant="figure" color="#FFFFFF" style={{ fontSize: 84, lineHeight: 86 }} testID="why-score">
              {e.score ?? '–'}
            </T>
            <T variant="small" color="#A9C6D2" style={{ marginBottom: 14, flex: 1 }}>
              {e.yesterday.text}
            </T>
          </View>
          <T variant="title" color="#FFFFFF" style={{ fontSize: 19, lineHeight: 25 }}>
            {e.sentence}
          </T>
          <T variant="small" color="#D5E6EC" style={{ marginTop: 6 }}>
            {readinessWords(e.score === null ? null : e.score / 100)}
          </T>
        </Deep>
      </Rise>

      {e.rows.length ? (
        <Rise i={1}>
          <SectionTitle color={color}>What moved it</SectionTitle>
          <Card testID="why-steps">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T variant="bodyStrong">Everyone starts at</T>
              <T variant="stat" style={{ fontSize: 20 }}>
                {e.start}
              </T>
            </View>
            {e.rows.map((r, i) => {
              const st = e.steps[i];
              const up = r.delta > 0;
              const col = r.delta === 0 ? c.muted : up ? c.ok : c.warn;
              const a = Math.min(st.from, st.to);
              const b = Math.max(st.from, st.to);
              return (
                <View key={r.key} style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line }} testID={`why-row-${r.key}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={ICON[r.key]} size={16} color={col} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="heading">{r.label}</T>
                      <T variant="caption">
                        {r.value} against {r.against}
                      </T>
                    </View>
                    <T variant="stat" color={col} style={{ fontSize: 22 }}>
                      {r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}
                      {Math.abs(r.delta)}
                    </T>
                  </View>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surface2, marginTop: 10 }}>
                    <View style={{ position: 'absolute', left: pct(a), width: `${((Math.min(HI, b) - Math.max(LO, a)) / (HI - LO)) * 100}%`, minWidth: 3, height: 10, borderRadius: 5, backgroundColor: col }} />
                    <View style={{ position: 'absolute', left: pct(st.to), marginLeft: -1, top: -3, width: 2, height: 16, backgroundColor: c.ink }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <T variant="caption" style={{ fontFamily: FONTS.num }}>
                      {st.from} → {st.to}
                    </T>
                    <T variant="caption">{pointsWords(r.delta)}</T>
                  </View>
                  <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                    {r.text}
                  </T>
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 2, borderTopColor: c.ink }}>
              <T variant="bodyStrong">Readiness {date === today ? 'today' : 'that day'}</T>
              <T variant="stat" color={color}>
                {e.score}
              </T>
            </View>
          </Card>
        </Rise>
      ) : null}

      {worst && worst.delta < 0 ? (
        <Rise i={2}>
          <SectionTitle>What would raise it</SectionTitle>
          <Card onPress={worst.key === 'sleep' ? () => router.push('/experiment') : undefined} testID="why-raise">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Feather name="trending-up" size={18} color={c.ok} style={{ marginTop: 2 }} />
              <T variant="small" style={{ flex: 1 }}>
                {worst.label} took the most ({pointsWords(worst.delta)}). {RAISE[worst.key]}
              </T>
            </View>
          </Card>
        </Rise>
      ) : null}

      {e.missing.length ? (
        <>
          <SectionTitle>{`Not counted ${date === today ? 'today' : 'that day'}`}</SectionTitle>
          <Card padded={false} style={{ paddingHorizontal: 14 }} testID="why-missing">
            {e.missing.map((m, i) => (
              <View key={m.label}>
                {i ? <Divider inset={48} /> : null}
                <Row icon="slash" iconColor={c.muted} title={m.label} subtitle={m.how} onPress={() => router.push(m.route as never)} right={<Feather name="chevron-right" size={17} color={c.muted} />} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <Note text="The whole formula: start at 70; heart rate variability against your 14-day average, up to 15 points either way; resting heart rate, 2.5 points a beat, up to 15; sleep, up to 15; soreness, up to 18 down or 6 up; overnight temperature, up to 8 down. Nothing else goes in. It is a prompt to listen to your body, not a medical measurement." />
    </Screen>
  );
}
