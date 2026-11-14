// Weekly Experiment: pick one change from the course, do it for a week, and read a plain verdict from your own data.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Deep, Paper, Rise } from '@core/art';
import { dayKey, shortDate, weekdayShort } from '@core/dates';
import { useSettings } from '@core/settings';
import { FONTS, RADIUS, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Field, Note, Screen, SectionTitle, T, type IconName } from '@core/ui';
import { useSlices } from '../life/state';
import { METRICS, evaluate, fmtMetric, metricValue, templatesFor, type Evaluation, type Experiment, type ExperimentMetric, type VerdictKey } from './model';
import { cancelExperiment, decide, startExperiment, toggleDone, useExperiment } from './state';

const VERDICT: Record<VerdictKey, { label: string; icon: IconName; text: string }> = {
  keep: { label: 'Keep', icon: 'anchor', text: 'It stays in your week as a habit' },
  adjust: { label: 'Adjust', icon: 'sliders', text: 'Run it again for another week' },
  drop: { label: 'Drop', icon: 'x', text: 'File it and pick something else' },
};
const CUSTOM_METRICS: ExperimentMetric[] = ['sleepH', 'energy', 'stress', 'soreness', 'restingHr', 'hrv', 'steps', 'hoarseness'];

function useVerdictColor() {
  const c = useTheme();
  return (v: VerdictKey | null) => (v === 'keep' ? c.ok : v === 'drop' ? c.danger : v === 'adjust' ? c.warn : c.muted);
}

/** Fourteen days side by side: the week before in grey, the experiment week in sand, with a mark on days it was done. */
function BeforeAfter({ ev, metric }: { ev: Evaluation; metric: ExperimentMetric }) {
  const c = useTheme();
  const m = METRICS[metric];
  const all = [...ev.beforeDays.map((d) => ({ ...d, after: false, done: false })), ...ev.afterDays.map((d) => ({ ...d, after: true }))];
  const vals = all.map((d) => d.value).filter((x): x is number => x !== null);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const pad = (hi - lo || 1) * 0.35;
  const h = (v: number) => 14 + ((v - (lo - pad)) / (hi + pad - (lo - pad))) * 74;
  const line = (v: number | null, color: string, from: number, to: number) => (v === null ? null : <View pointerEvents="none" style={{ position: 'absolute', left: `${from}%`, width: `${to - from}%`, bottom: 18 + h(v), height: 0, borderTopWidth: 1.5, borderColor: color, borderStyle: 'dashed' }} />);
  return (
    <View testID="xp-chart">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { label: 'Week before', v: ev.before, color: c.muted },
          { label: 'This week', v: ev.after, color: c.sand },
        ].map((x) => (
          <View key={x.label} style={{ flex: 1 }}>
            <T variant="label" color={x.color}>
              {x.label}
            </T>
            <T variant="figure" style={{ fontSize: 44, lineHeight: 48 }}>
              {fmtMetric({ ...m, unit: '' }, x.v)}
              <T variant="caption"> {m.format ? '' : m.unit.trim()}</T>
            </T>
          </View>
        ))}
      </View>
      <View style={{ height: 112, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 112 }}>
          {all.map((d, i) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', marginLeft: i === 7 ? 8 : 0 }}>
              {d.after && d.done ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.ok, marginBottom: 3 }} /> : null}
              <View style={{ width: '100%', height: d.value === null ? 3 : h(d.value), borderRadius: 4, backgroundColor: d.value === null ? c.paperLine : d.after ? c.sand : c.muted + '66' }} />
              <T variant="caption" style={{ fontSize: 9.5, lineHeight: 18 }}>
                {weekdayShort(d.date).charAt(0)}
              </T>
            </View>
          ))}
        </View>
        {line(ev.before, c.muted, 0, 49)}
        {line(ev.after, c.sand, 51, 100)}
      </View>
      <T variant="caption">
        {m.label} from {m.source.toLowerCase()}. Dashed lines are the two averages; a green dot marks a day you did it.
      </T>
    </View>
  );
}

function Running({ x }: { x: Experiment }) {
  const c = useTheme();
  const s = useSlices();
  const today = dayKey();
  const ev = evaluate(x, metricValue(s, x.metric), today);
  const vc = useVerdictColor();
  const m = METRICS[x.metric];
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Rise>
        <Deep testID="xp-running">
          <T variant="label" color={c.foam}>
            {ev.finished ? 'Week complete' : `Day ${ev.day} of ${x.days}`}
            {x.module ? ` · from Module ${x.module}: ${x.moduleTitle}` : ''}
          </T>
          <T variant="display" color="#FFFFFF" style={{ marginTop: 6 }}>
            {x.title}
          </T>
          {x.how ? (
            <T variant="small" color="#D5E6EC" style={{ marginTop: 6 }}>
              {x.how}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
            {ev.afterDays.map((d, i) => {
              const future = d.date > today;
              return (
                <Pressable key={d.date} testID={`xp-day-${i}`} disabled={future} accessibilityRole="checkbox" accessibilityState={{ checked: d.done, disabled: future }} accessibilityLabel={`${weekdayShort(d.date)} ${shortDate(d.date)}: ${d.done ? 'done' : 'not done'}`} onPress={() => toggleDone(d.date)} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                  <View style={{ width: '100%', aspectRatio: 1, maxHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: d.done ? '#3BC4BD' : 'transparent', borderWidth: d.done ? 0 : 1.5, borderColor: d.date === today ? '#FFFFFF' : '#5F8799', borderStyle: future ? 'dashed' : 'solid' }}>
                    {d.done ? <Feather name="check" size={18} color={c.deep} /> : null}
                  </View>
                  <T variant="caption" color={d.date === today ? '#FFFFFF' : '#8FB0BE'} style={{ fontSize: 10.5 }}>
                    {weekdayShort(d.date)}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <T variant="caption" color="#A9C6D2" style={{ marginTop: 10 }}>
            Tap a day to mark it done. Done {ev.doneDays} of {ev.elapsed} so far; measured by {m.label.toLowerCase()}.
          </T>
        </Deep>
      </Rise>

      <Rise i={1}>
        <SectionTitle color={c.sand}>Before and after</SectionTitle>
        <Paper>
          <BeforeAfter ev={ev} metric={x.metric} />
        </Paper>
      </Rise>

      <Rise i={2}>
        <SectionTitle color={vc(ev.verdict)}>Verdict</SectionTitle>
        <Card style={{ borderColor: vc(ev.verdict), borderWidth: 1.5 }} testID="xp-verdict">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: vc(ev.verdict) + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={ev.verdict ? VERDICT[ev.verdict].icon : 'clock'} size={22} color={vc(ev.verdict)} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="title" testID="xp-headline">
                {ev.headline}
              </T>
              {ev.status === 'early' ? <T variant="caption">{ev.daysLeft} day{ev.daysLeft === 1 ? '' : 's'} left; this can still change.</T> : null}
            </View>
          </View>
          <T variant="body" style={{ marginTop: 12 }}>
            {ev.reason}
          </T>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
            {ev.next}
          </T>
          <T variant="label" style={{ marginTop: 16 }}>
            Your decision
          </T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {(['keep', 'adjust', 'drop'] as VerdictKey[]).map((k) => {
              const on = ev.verdict === k;
              return (
                <Pressable key={k} testID={`xp-${k}`} accessibilityRole="button" accessibilityLabel={`${VERDICT[k].label}: ${VERDICT[k].text}${on ? ' (suggested)' : ''}`} onPress={() => decide(k, ev)} style={({ pressed }) => ({ flex: 1, borderRadius: RADIUS.button, paddingVertical: 12, alignItems: 'center', gap: 4, backgroundColor: on ? vc(k) : c.surface2, opacity: pressed ? 0.8 : 1 })}>
                  <Feather name={VERDICT[k].icon} size={18} color={on ? '#FFFFFF' : c.inkSoft} />
                  <T variant="caption" color={on ? '#FFFFFF' : c.ink} style={{ fontFamily: FONTS.semibold, fontSize: 14 }}>
                    {VERDICT[k].label}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <T variant="caption" style={{ marginTop: 8 }}>
            {ev.verdict ? `The suggestion is highlighted. ${VERDICT[ev.verdict].text}.` : 'You can decide now, but there is no suggestion until both weeks have three measured days.'} The decision is yours.
          </T>
        </Card>
        <Note text="How the verdict is decided: the 7 days before against the experiment days. Done on fewer than half the days: adjust. The number moved the right way by a meaningful amount: keep. The wrong way: drop. No real move after you did it most days: drop; otherwise adjust. One week of your own data is a hint, not proof." />
      </Rise>
      {confirm ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="Stop without a verdict" kind="danger" compact onPress={cancelExperiment} testID="xp-cancel-yes" />
          <Button label="Keep going" kind="ghost" compact onPress={() => setConfirm(false)} />
        </View>
      ) : (
        <Button label="Stop this experiment" kind="ghost" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => setConfirm(true)} testID="xp-cancel" />
      )}
    </>
  );
}

function Picker() {
  const c = useTheme();
  const track = useSettings((x) => x.track);
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<ExperimentMetric>('energy');
  return (
    <>
      <Rise>
        <Deep>
          <T variant="label" color={c.foam}>
            Plan · do · measure · review, in one week
          </T>
          <T variant="display" color="#FFFFFF" style={{ marginTop: 6 }}>
            One change. One week. Your own numbers.
          </T>
          <T variant="small" color="#D5E6EC" style={{ marginTop: 8 }}>
            Pick one change the course teaches. Mark the days you do it. The app compares the week before with this week and tells you plainly: keep, adjust or drop.
          </T>
        </Deep>
      </Rise>
      <SectionTitle color={c.sand}>From the course</SectionTitle>
      <View style={{ gap: 8 }}>
        {templatesFor(track).map((t) => {
          const on = open === t.id;
          return (
            <Paper key={t.id} onPress={() => setOpen(on ? null : t.id)} testID={`xp-t-${t.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Feather name={t.icon as IconName} size={19} color={c.sand} />
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{t.title}</T>
                  <T variant="caption">
                    Module {t.module}: {t.moduleTitle} · measured by {METRICS[t.metric].label.toLowerCase()}
                  </T>
                </View>
                <Feather name={on ? 'chevron-up' : 'chevron-down'} size={17} color={c.muted} />
              </View>
              {on ? (
                <View style={{ marginTop: 10 }}>
                  <T variant="small" color={c.inkSoft}>
                    {t.how} Your {METRICS[t.metric].label.toLowerCase()} for the last 7 days is the baseline ({METRICS[t.metric].source.toLowerCase()}).
                  </T>
                  <Button label="Start this week" icon="play" compact color={c.sand} style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => startExperiment({ template: t })} testID="xp-start" />
                </View>
              ) : null}
            </Paper>
          );
        })}
      </View>
      <SectionTitle>Or write your own</SectionTitle>
      <Card>
        <Field label="The one change" value={title} onChangeText={setTitle} placeholder="No phone in the bedroom" testID="xp-custom-title" />
        <T variant="caption" style={{ marginTop: 14 }}>
          Measure it by
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {CUSTOM_METRICS.map((k) => (
            <Chip key={k} small label={METRICS[k].label} selected={metric === k} onPress={() => setMetric(k)} color={c.sand} />
          ))}
        </View>
        <Button label="Start my experiment" icon="play" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} disabled={!title.trim()} onPress={() => startExperiment({ title, metric, how: '' })} testID="xp-custom-start" />
      </Card>
    </>
  );
}

export function ExperimentScreen() {
  const c = useTheme();
  const xp = useExperiment();
  const vc = useVerdictColor();
  return (
    <Screen title="Weekly Experiment" subtitle="Keep what works. Drop what does not." color={c.sand} accentBar testID="experiment">
      {xp.current ? <Running x={xp.current} /> : <Picker />}
      {xp.history.length ? (
        <>
          <SectionTitle>Past experiments</SectionTitle>
          <Card padded={false} testID="xp-history">
            {xp.history.map((h, i) => {
              const m = METRICS[h.metric] ?? METRICS.energy;
              const d = h.closed?.decision ?? null;
              return (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong">{h.title}</T>
                    <T variant="caption">
                      {shortDate(h.start)} · {m.label} {fmtMetric(m, h.closed?.before ?? null)} → {fmtMetric(m, h.closed?.after ?? null)} · done {Math.round((h.closed?.adherence ?? 0) * 100)}% of days
                    </T>
                  </View>
                  {d ? <Badge text={VERDICT[d].label} color={vc(d)} /> : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
      <T variant="caption" style={{ textAlign: 'center', marginTop: 20 }} onPress={() => router.push('/coach')}>
        Part of step 6, Adjust: change one thing at a time. General education, not medical advice.
      </T>
    </Screen>
  );
}
