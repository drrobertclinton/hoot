// Performer Day: the countdown to the next show, today's voice-load budget, the warmups, and the performance-day
// sequence from Perform at Your Peak, for singers, actors and speakers.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Deep, Paper, Rise } from '@core/art';
import { addDays, clock, dayKey, fmtHm, longDate } from '@core/dates';
import { routineMinutes } from '@core/routine';
import { FONTS, RADIUS, moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Field, Note, Progress, Screen, SectionTitle, Stepper, T } from '@core/ui';
import { useLessonAccess } from '../education/access';
import { BOOKS } from '../education/course/modules';
import { addItem, usePlan } from '../plan/state';
import { useRehearse } from '../rehearse/state';
import { WARMUPS } from '../rehearse/warmups';
import { PHASE_COPY, WHEN_LABEL, checklistState, countdownWords, lastShow, nextShow, showPhase, voiceBudget, type CheckWhen } from './model';
import { addVoiceUse, saveShowNote, tick, usePerformer } from './state';

const LAB = BOOKS.perform.labs.find((l) => l.number === 4);
const LAB_LINE = LAB?.reading.join(' ').match(/Write the sequence[^.]*\.\s*[^.]*\.\s*Distinguish[^.]*\./)?.[0] ?? '';

export function PerformerScreen() {
  const c = useTheme();
  const plan = usePlan();
  const voice = useRehearse();
  const p = usePerformer();
  const canOpen = useLessonAccess();
  const color = moduleColor(c, 'performer');
  const today = dayKey();
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30000); // keep the countdown current
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const show = nextShow(plan.items, today, now.getHours() * 60 + now.getMinutes());
  const phase = showPhase(show, lastShow(plan.items, today), today);
  const budget = voiceBudget(voice, phase, today);
  // The sequence belongs to the show day; until then it is a rehearsal of the routine for the next show.
  const date = show ? show.item.date : today;
  const list = checklistState({ checks: p.checks ?? {}, notes: p.notes ?? {} }, date, !!voice.voice[date]?.warmedUp);
  const saved = p.notes?.[date];
  const [note, setNote] = useState(saved ?? { success: '', issue: '', question: '' });
  const [noteSaved, setNoteSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [inDays, setInDays] = useState(7);
  const [time, setTime] = useState(19 * 60 + 30);
  const count = show ? countdownWords(show) : null;
  const big = show && show.days >= 2 ? String(show.days) : count;
  const barColor = budget.status === 'over' ? c.danger : budget.status === 'near' ? c.warn : color;

  return (
    <Screen title="Performer Day" subtitle="For singers, actors and speakers" color={color} accentBar testID="performer">
      <Rise>
        <Deep testID="pf-countdown">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T variant="label" color={c.foam}>
              {PHASE_COPY[phase].label}
            </T>
            <Feather name="star" size={16} color={c.foam} />
          </View>
          {show ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
                <T variant="figure" color="#FFFFFF" style={show.days >= 2 ? { fontSize: 84, lineHeight: 84 } : { fontSize: 46, lineHeight: 52 }}>
                  {big}
                </T>
                {show.days >= 2 ? (
                  <T variant="title" color="#D5E6EC" style={{ marginBottom: 12 }}>
                    days to go
                  </T>
                ) : null}
              </View>
              <T variant="title" color="#FFFFFF" style={{ marginTop: 2 }}>
                {show.item.title}
              </T>
              <T variant="small" color="#A9C6D2">
                {longDate(show.item.date)}
                {show.item.time ? ` · ${clock(show.item.time)}` : ''}
              </T>
            </>
          ) : (
            <T variant="display" color="#FFFFFF" style={{ marginTop: 6 }}>
              No show on the calendar
            </T>
          )}
          <T variant="small" color="#D5E6EC" style={{ marginTop: 10 }}>
            {PHASE_COPY[phase].text}
          </T>
          {adding ? null : <Button label={show ? 'Add another show' : 'Add my next show'} icon="plus" kind="teal" compact style={{ marginTop: 14, alignSelf: 'flex-start' }} onPress={() => setAdding(true)} testID="pf-add" />}
        </Deep>
      </Rise>
      {adding ? (
        <Card style={{ marginTop: 12 }}>
          <Field label="What is it?" value={title} onChangeText={setTitle} placeholder="Opening night, audition, keynote" testID="pf-title" />
          <View style={{ marginTop: 12 }}>
            <Stepper label="When" value={inDays} onChange={setInDays} min={0} max={180} display={inDays === 0 ? 'Today' : inDays === 1 ? 'Tomorrow' : longDate(addDays(today, inDays))} testID="pf-days" />
          </View>
          <View style={{ marginTop: 12 }}>
            <Stepper label="Call or curtain time" value={time} onChange={setTime} step={15} min={0} max={1425} display={clock(fmtHm(time))} testID="pf-time" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button
              label="Add to calendar"
              icon="check"
              compact
              disabled={!title.trim()}
              testID="pf-save"
              onPress={() => {
                addItem({ date: addDays(today, inDays), time: fmtHm(time), title: title.trim(), kind: 'performance', remind: true });
                setTitle('');
                setAdding(false);
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : null}

      <Rise i={1}>
        <SectionTitle color={color}>Voice-load budget · today</SectionTitle>
        <Card testID="pf-budget">
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <T variant="figure" color={budget.status === 'over' ? c.danger : c.ink}>
              {Math.abs(budget.left)}
            </T>
            <View style={{ marginBottom: 9, flex: 1 }}>
              <T variant="heading">{budget.left < 0 ? 'hours over' : 'hours left'}</T>
              <T variant="caption">
                {budget.used} h used of {budget.budget} h off-stage
              </T>
            </View>
            <Badge text={budget.status === 'over' ? 'Over' : budget.status === 'near' ? 'Nearly spent' : 'Open'} color={barColor} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Progress value={Math.min(1, budget.used / budget.budget)} color={barColor} height={10} />
          </View>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
            {budget.text}
          </T>
          <T variant="caption" style={{ marginTop: 14 }}>
            Log voice use as it happens
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {[
              { l: '+15 min', h: 0.25 },
              { l: '+30 min', h: 0.5 },
              { l: '+1 h', h: 1 },
              { l: '−15 min', h: -0.25 },
            ].map((x) => (
              <Chip key={x.l} label={x.l} icon={x.h > 0 ? 'mic' : undefined} onPress={() => addVoiceUse(x.h, today)} testID={`pf-voice-${x.h}`} />
            ))}
          </View>
          <T variant="label" style={{ marginTop: 18 }}>
            Why this budget
          </T>
          {budget.parts.map((b, i) => (
            <View key={b.label} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, marginTop: i ? 0 : 4 }}>
              <T variant="stat" color={b.hours < 0 ? c.warn : c.ink} style={{ fontSize: 17, lineHeight: 22, minWidth: 62 }}>
                {b.hours > 0 ? (i ? '+' : '') : '−'}
                {Math.abs(b.hours)} h
              </T>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" style={{ fontSize: 14.5, lineHeight: 20 }}>
                  {b.label}
                </T>
                <T variant="caption">{b.text}</T>
              </View>
            </View>
          ))}
          <Button label="Full voice log" kind="ghost" compact icon="mic" style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => router.push('/rehearse')} />
        </Card>
        <Note text="A planning guide worked out from your own voice log, not a medical limit. Hoarseness that lasts, pain, or a sudden change in your voice is a reason to see a clinician, ideally a laryngologist." />
      </Rise>

      <Rise i={2}>
        <SectionTitle color={color}>Warmups</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {WARMUPS.map((w) => (
            <Card key={w.id} style={{ width: '47%', flexGrow: 1, padding: 14 }} onPress={() => router.push(`/routine/${w.id}`)} testID={`pf-warm-${w.id}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Feather name={w.id === 'stage-physical' ? 'user' : w.id === 'voice-cooldown' ? 'moon' : 'mic'} size={18} color={color} />
                <T variant="caption" style={{ fontFamily: FONTS.num }}>
                  {routineMinutes(w)} min
                </T>
              </View>
              <T variant="heading" style={{ marginTop: 8 }}>
                {w.title}
              </T>
              <T variant="caption" numberOfLines={2}>
                {w.summary}
              </T>
            </Card>
          ))}
        </View>
      </Rise>

      <Rise i={3}>
        <SectionTitle color={c.sand} right={<T variant="caption">{list.essentialsDone} of {list.essentialsTotal} essentials</T>}>{show ? `Sequence for ${show.item.title}` : 'Performance-day sequence'}</SectionTitle>
        <Paper testID="pf-checklist">
          {(['ahead', 'before', 'after'] as CheckWhen[]).map((w, wi) => (
            <View key={w} style={{ marginTop: wi ? 14 : 0 }}>
              <T variant="label" color={c.sand}>
                {WHEN_LABEL[w]}
              </T>
              {list.items
                .filter((x) => x.when === w)
                .map((x) => (
                  <Pressable key={x.id} testID={`pf-check-${x.id}`} accessibilityRole="checkbox" accessibilityState={{ checked: x.done }} accessibilityLabel={`${x.label}${x.essential ? ', essential' : ', optional'}`} onPress={() => tick(date, x.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ width: 24, height: 24, borderRadius: 7, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: x.done ? c.ok : 'transparent', borderWidth: x.done ? 0 : 1.5, borderColor: x.essential ? c.sand : c.muted, borderStyle: x.essential ? 'solid' : 'dashed' }}>
                      {x.done ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong" style={{ fontSize: 15, lineHeight: 21, ...(x.done ? { color: c.muted, textDecorationLine: 'line-through' as const } : {}) }}>
                        {x.label}
                      </T>
                      <T variant="caption">
                        {x.essential ? 'Essential' : 'Optional'} · {x.source}
                      </T>
                    </View>
                    {x.routine ? (
                      <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Start the routine" onPress={() => router.push(`/routine/${x.routine}`)} style={{ width: 34, height: 34, borderRadius: RADIUS.chip, backgroundColor: c.sandSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="play" size={15} color={c.sand} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))}
            </View>
          ))}
          {LAB_LINE ? (
            <T variant="quote" color={c.inkSoft} style={{ marginTop: 14, fontSize: 14.5, lineHeight: 21 }}>
              “{LAB_LINE}”
            </T>
          ) : null}
          <T variant="caption" style={{ marginTop: 6 }}>
            Perform at Your Peak, Week 4, practice lab 4. Solid boxes are essentials; dashed boxes are comforts to drop when the day gets crowded.
          </T>
          {canOpen({ id: 'perform-lab4', track: 'perform' }) ? <Button label="Open the practice lab" kind="ghost" compact icon="book-open" style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/lesson/perform-lab4')} /> : null}
        </Paper>
      </Rise>

      <SectionTitle>After the show</SectionTitle>
      <Card>
        <T variant="small" color={c.inkSoft}>
          Health and practical needs come first. Later, write one success, one specific issue and one question for your coach. No verdict on your talent.
        </T>
        <Field label="One success" value={note.success} onChangeText={(success) => (setNote({ ...note, success }), setNoteSaved(false))} multiline testID="pf-note-success" />
        <Field label="One specific issue" value={note.issue} onChangeText={(issue) => (setNote({ ...note, issue }), setNoteSaved(false))} multiline testID="pf-note-issue" />
        <Field label="One question for my coach" value={note.question} onChangeText={(question) => (setNote({ ...note, question }), setNoteSaved(false))} multiline testID="pf-note-question" />
        <Button
          label={noteSaved ? 'Saved' : 'Save note'}
          icon="check"
          compact
          style={{ marginTop: 14, alignSelf: 'flex-start' }}
          disabled={!note.success.trim() && !note.issue.trim() && !note.question.trim()}
          testID="pf-note-save"
          onPress={() => {
            saveShowNote(date, note);
            setNoteSaved(true);
          }}
        />
      </Card>
      <T variant="caption" style={{ textAlign: 'center', marginTop: 20 }}>
        General education. It does not replace your voice teacher, coach or clinician.
      </T>
    </Screen>
  );
}
