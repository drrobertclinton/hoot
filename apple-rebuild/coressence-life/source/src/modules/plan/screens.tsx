// Plan: the personal plan (built with the course process) and the calendar.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { addDays, clock, dayKey, fmtHm, hm, longDate, parseDay, shortDate, weekStart, weekdayName, weekdayShort } from '@core/dates';
import { notificationsSupported } from '@core/notifications';
import { useSettings, setSettings, getSettings } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Field, Note, Progress, Screen, SectionTitle, Stepper, T, ToggleRow } from '@core/ui';
import { planPrefill } from '../education/model';
import { useEdu } from '../education/state';
import { DASHBOARD_OPTIONS, KINDS, adherence, blankWeek, currentPlan, itemsOn, kindIcon, type ItemKind, type WeekSlot } from './model';
import { addItem, deleteItem, savePlanVersion, toggleItem, usePlan } from './state';

export function PlanScreen() {
  const c = useTheme();
  const s = usePlan();
  const today = dayKey();
  const [sel, setSel] = useState(today);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ItemKind>('move');
  const [time, setTime] = useState(18 * 60);
  const [remind, setRemind] = useState(true);
  const color = moduleColor(c, 'plan');
  const p = currentPlan(s);
  const ws = weekStart(sel);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const items = itemsOn(s.items, sel);
  const adh = adherence(s.items, weekStart(today), today);

  return (
    <Screen title="Plan" subtitle="Your personal plan and calendar" color={color} accentBar testID="plan">
      {p ? (
        <Card testID="plan-summary">
          <T variant="label" color={color}>
            My plan · since {shortDate(p.created)}
          </T>
          <T variant="title" style={{ marginTop: 4 }}>
            {p.outcome}
          </T>
          <View style={{ marginTop: 10, gap: 8 }}>
            {[
              ['target', 'Action', p.action],
              ['alert-triangle', 'Constraint', p.constraint],
              ['shield', 'Minimum plan', p.minimum],
              ['git-branch', 'Decision rule', p.ruleIf ? `If ${p.ruleIf}, then ${p.ruleThen}.` : ''],
              ['refresh-ccw', 'Review', `${weekdayName(p.reviewDay)}s at ${clock(p.reviewTime)}`],
            ]
              .filter((x) => x[2])
              .map(([icon, label, text]) => (
                <View key={label} style={{ flexDirection: 'row', gap: 10 }}>
                  <Feather name={icon as never} size={15} color={c.muted} style={{ marginTop: 3 }} />
                  <T variant="small" style={{ flex: 1 }}>
                    <T variant="small" style={{ fontWeight: '600' }}>
                      {label}:{' '}
                    </T>
                    {text}
                  </T>
                </View>
              ))}
          </View>
          {adh.total ? (
            <View style={{ marginTop: 14 }}>
              <T variant="caption">
                This week: {adh.done} of {adh.total} planned sessions done
              </T>
              <View style={{ marginTop: 6 }}>
                <Progress value={adh.done / adh.total} color={color} />
              </View>
            </View>
          ) : null}
          <Button label="Revise my plan" icon="edit" kind="secondary" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => router.push('/plan-builder')} testID="plan-revise" />
        </Card>
      ) : (
        <Card testID="plan-empty">
          <T variant="title">Build your personal plan</T>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
            Five short steps from the course: your outcome and one action, what you will watch, an ordinary week, a minimum plan for hard weeks, and a decision rule with a review day.
          </T>
          <Button label="Start" icon="arrow-right" style={{ marginTop: 14 }} onPress={() => router.push('/plan-builder')} testID="plan-start" color={color} />
        </Card>
      )}

      <SectionTitle
        right={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Chip small icon="chevron-left" label="" onPress={() => setSel(addDays(sel, -7))} />
            <Chip small label="Today" onPress={() => setSel(today)} />
            <Chip small icon="chevron-right" label="" onPress={() => setSel(addDays(sel, 7))} />
          </View>
        }
      >
        {`Week of ${shortDate(ws)}`}
      </SectionTitle>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {days.map((d) => {
          const on = d === sel;
          const n = itemsOn(s.items, d);
          return (
            <Pressable key={d} testID={`day-${d}`} onPress={() => setSel(d)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: on ? color : c.surface, borderWidth: 1, borderColor: d === today && !on ? color : c.line }}>
              <T variant="caption" color={on ? '#FFFFFF' : c.muted}>
                {weekdayShort(d)}
              </T>
              <T variant="heading" color={on ? '#FFFFFF' : c.ink}>
                {parseDay(d).getDate()}
              </T>
              <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 2 }}>
                {n.slice(0, 3).map((it) => (
                  <View key={it.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? '#FFFFFF' : it.done ? c.ok : color }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <T variant="heading" style={{ marginTop: 16 }}>
        {longDate(sel)}
      </T>
      <Card padded={false} style={{ marginTop: 8 }}>
        {items.length ? (
          items.map((it, i) => (
            <Pressable key={it.id} onPress={() => toggleItem(it.id)} onLongPress={() => deleteItem(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: it.done }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Feather name={it.done ? 'check-circle' : 'circle'} size={20} color={it.done ? c.ok : c.muted} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" style={it.done ? { textDecorationLine: 'line-through', color: c.muted } : undefined}>
                  {it.title}
                </T>
                <T variant="caption">
                  {it.time ? clock(it.time) : 'Any time'} · {KINDS.find((k) => k.key === it.kind)?.label}
                  {it.remind ? ' · reminder' : ''}
                </T>
              </View>
              <Feather name={kindIcon(it.kind) as never} size={16} color={c.muted} />
            </Pressable>
          ))
        ) : (
          <T variant="small" color={c.muted} style={{ padding: 16 }}>
            Nothing on this day.
          </T>
        )}
      </Card>
      {adding ? (
        <Card style={{ marginTop: 12 }} testID="item-form">
          <Field label="What" value={title} onChangeText={setTitle} placeholder="Rehearsal, strength session, doctor visit…" testID="item-title" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {KINDS.map((k) => (
              <Chip key={k.key} small icon={k.icon as never} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} color={color} />
            ))}
          </View>
          <Stepper label="Time" display={clock(fmtHm(time))} value={time} step={15} min={-9999} max={9999} onChange={(v) => setTime((v + 1440) % 1440)} />
          <ToggleRow title="Remind me" subtitle={notificationsSupported ? 'A notification before it starts' : 'Reminders work in the phone app'} value={remind} onChange={setRemind} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Button
              label="Add"
              icon="plus"
              compact
              disabled={!title.trim()}
              testID="item-save"
              onPress={() => {
                addItem({ date: sel, time: fmtHm(time), title: title.trim(), kind, remind });
                if (remind && !getSettings().reminders.plan.on) setSettings({ reminders: { ...getSettings().reminders, plan: { ...getSettings().reminders.plan, on: true } } });
                setTitle('');
                setAdding(false);
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : (
        <Button label="Add to this day" icon="plus" kind="secondary" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => setAdding(true)} testID="item-add" />
      )}
      <T variant="caption" style={{ marginTop: 8 }}>
        Tap to mark done. Long-press to remove.
      </T>
    </Screen>
  );
}

const STEPS = ['Purpose', 'Watch', 'Ordinary week', 'Minimum plan', 'Rule and review'];

export function PlanBuilderScreen() {
  const c = useTheme();
  const s = usePlan();
  const edu = useEdu();
  const goals = useSettings((x) => x.goals);
  const color = moduleColor(c, 'plan');
  const cur = currentPlan(s);
  const pre = planPrefill(edu, cur?.created);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    outcome: pre.outcome || cur?.outcome || '',
    why: pre.why || cur?.why || '',
    action: pre.action || cur?.action || '',
    constraint: pre.constraint || cur?.constraint || '',
    minimum: pre.minimum || cur?.minimum || '',
    ruleIf: pre.ruleIf || cur?.ruleIf || '',
    ruleThen: pre.ruleThen || cur?.ruleThen || '',
  });
  const preDash = (pre.dashboard || '').split(',').filter((k) => DASHBOARD_OPTIONS.some((o) => o.key === k));
  const [dash, setDash] = useState<string[]>(preDash.length ? preDash : cur?.dashboard ?? ['sleepH', 'energy']);
  const [observe, setObserve] = useState(pre.observeDays ? (Number(pre.observeDays) === 7 ? 7 : 14) : cur?.observeDays ?? 14);
  const [week, setWeek] = useState<WeekSlot[][]>(cur?.week ?? blankWeek());
  const [dayIdx, setDayIdx] = useState(0);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotKind, setSlotKind] = useState<ItemKind>('move');
  const [slotTime, setSlotTime] = useState(7 * 60);
  const [reviewDay, setReviewDay] = useState(cur?.reviewDay ?? 0);
  const [reviewTime, setReviewTime] = useState(cur ? hm(cur.reviewTime) : 18 * 60);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sessions = week.flat().filter((x) => x.kind === 'move').length;

  const save = () => {
    const today = dayKey();
    savePlanVersion({ ...f, created: today, start: today, dashboard: dash, observeDays: observe, week, reviewDay, reviewTime: fmtHm(reviewTime) });
    const r = getSettings().reminders;
    setSettings({ reminders: { ...r, review: { on: true, weekday: reviewDay, time: fmtHm(reviewTime) }, plan: { ...r.plan, on: true } } });
    router.replace('/plan');
  };

  return (
    <Screen title={cur ? 'Revise my plan' : 'Build my plan'} subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} color={color} accentBar testID="builder">
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
        {STEPS.map((x, i) => (
          <View key={x} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? color : c.surface2 }} />
        ))}
      </View>
      {step === 0 ? (
        <Card>
          <T variant="small" color={c.inkSoft}>
            Choose one outcome that matters to you, one action you control, and the constraint you are working around.{Object.keys(pre).length ? ' Your latest course decisions are filled in.' : ''}
          </T>
          <Field label="The outcome I want" value={f.outcome} onChangeText={set('outcome')} placeholder="More energy in the evenings" testID="b-outcome" />
          <Field label="Why it matters to me" value={f.why} onChangeText={set('why')} multiline placeholder="So I can enjoy time with my family after work" />
          <Field label="My one action" value={f.action} onChangeText={set('action')} placeholder="A 20-minute walk at lunch on workdays" testID="b-action" />
          <Field label="My main constraint" value={f.constraint} onChangeText={set('constraint')} placeholder="Meetings run over" />
        </Card>
      ) : null}
      {step === 1 ? (
        <Card>
          <T variant="small" color={c.inkSoft}>
            Pick two or three things to watch. A small dashboard you keep up beats a big one you abandon.
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {DASHBOARD_OPTIONS.map((o) => (
              <Chip key={o.key} small label={o.label} selected={dash.includes(o.key)} onPress={() => setDash(dash.includes(o.key) ? dash.filter((x) => x !== o.key) : [...dash, o.key])} color={color} />
            ))}
          </View>
          <T variant="caption" style={{ marginTop: 14 }}>
            Watch for
          </T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {[7, 14].map((d) => (
              <Chip key={d} small label={`${d} days`} selected={observe === d} onPress={() => setObserve(d)} />
            ))}
          </View>
        </Card>
      ) : null}
      {step === 2 ? (
        <Card>
          <T variant="small" color={c.inkSoft}>
            Place sessions in a normal week, with times. Aim toward {goals.weeklyMoveMinutes} minutes of movement and {goals.strengthDays} strength days, starting where you are.
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
            {DAYS.map((d, i) => (
              <Chip key={d} small label={`${d}${week[i].length ? ` · ${week[i].length}` : ''}`} selected={dayIdx === i} onPress={() => setDayIdx(i)} color={color} testID={`b-day-${i}`} />
            ))}
          </ScrollView>
          {week[dayIdx].map((slot, k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Feather name={kindIcon(slot.kind) as never} size={16} color={color} />
              <T variant="body" style={{ flex: 1 }}>
                {slot.title} {slot.time ? `· ${clock(slot.time)}` : ''}
              </T>
              <Pressable onPress={() => setWeek(week.map((w, i) => (i === dayIdx ? w.filter((_, j) => j !== k) : w)))} hitSlop={8}>
                <Feather name="x" size={18} color={c.muted} />
              </Pressable>
            </View>
          ))}
          <Field label={`Add to ${DAYS[dayIdx]}`} value={slotTitle} onChangeText={setSlotTitle} placeholder="Strength session" testID="b-slot" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {KINDS.filter((k) => ['move', 'rehearsal', 'performance', 'restore', 'lesson'].includes(k.key)).map((k) => (
              <Chip key={k.key} small label={k.label} selected={slotKind === k.key} onPress={() => setSlotKind(k.key)} />
            ))}
          </View>
          <Stepper label="Time" display={clock(fmtHm(slotTime))} value={slotTime} step={15} min={-9999} max={9999} onChange={(v) => setSlotTime((v + 1440) % 1440)} />
          <Button
            label="Add"
            icon="plus"
            compact
            kind="secondary"
            disabled={!slotTitle.trim()}
            style={{ alignSelf: 'flex-start', marginTop: 6 }}
            testID="b-slot-add"
            onPress={() => {
              setWeek(week.map((w, i) => (i === dayIdx ? [...w, { kind: slotKind, title: slotTitle.trim(), time: fmtHm(slotTime) }] : w)));
              setSlotTitle('');
            }}
          />
          <T variant="caption" style={{ marginTop: 10 }}>
            {sessions} movement session{sessions === 1 ? '' : 's'} planned this week
          </T>
        </Card>
      ) : null}
      {step === 3 ? (
        <Card>
          <T variant="small" color={c.inkSoft}>
            The smallest version of your plan that still counts on a disrupted week: illness, travel, tech week.
          </T>
          <Field label="My minimum plan" value={f.minimum} onChangeText={set('minimum')} multiline placeholder="Two 10-minute strength sessions and my wake time" testID="b-minimum" />
        </Card>
      ) : null}
      {step === 4 ? (
        <Card>
          <T variant="small" color={c.inkSoft}>
            Decide now what you will do when the numbers say something, and when you will look.
          </T>
          <Field label="If…" value={f.ruleIf} onChangeText={set('ruleIf')} placeholder="my energy averages below 3 for a week" />
          <Field label="Then I will…" value={f.ruleThen} onChangeText={set('ruleThen')} placeholder="switch to my minimum plan and keep my bedtime" />
          <T variant="caption" style={{ marginTop: 14 }}>
            Weekly review day
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <Chip key={d} small label={weekdayName(d).slice(0, 3)} selected={reviewDay === d} onPress={() => setReviewDay(d)} color={color} />
            ))}
          </View>
          <Stepper label="Review time" display={clock(fmtHm(reviewTime))} value={reviewTime} step={15} min={-9999} max={9999} onChange={(v) => setReviewTime((v + 1440) % 1440)} />
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {step > 0 ? <Button label="Back" kind="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
        {step < STEPS.length - 1 ? (
          <Button label="Next" icon="arrow-right" onPress={() => setStep(step + 1)} style={{ flex: 1 }} disabled={step === 0 && !f.outcome.trim()} testID="b-next" color={color} />
        ) : (
          <Button label="Save my plan" icon="check" onPress={save} style={{ flex: 1 }} testID="b-save" color={color} />
        )}
      </View>
      <Note text="Saving creates a dated version of your plan and fills the next four weeks of your calendar. Earlier versions are kept so past weeks still make sense." />
    </Screen>
  );
}
