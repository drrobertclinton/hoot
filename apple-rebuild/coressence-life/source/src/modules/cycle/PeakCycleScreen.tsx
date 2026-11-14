// This week: the Peak Cycle. One loop for the week (assess, plan, do, measure, review, adjust, keep what works),
// this week's course module, today's one to three actions, and the single biggest signal in the person's data.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Deep, LoopMap, Paper, Rise } from '@core/art';
import { Spark } from '@core/charts';
import { DEMO_TOOLS } from '@core/appConfig';
import { usePremium } from '@core/billing/billing';
import { addDays, clock, dayKey, greeting, lastDays, longDate, shortDate, weekStart } from '@core/dates';
import { round } from '@core/stats';
import { useSettings } from '@core/settings';
import { FONTS, RADIUS, moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, IconButton, Progress, SectionTitle, T, type IconName } from '@core/ui';
import { setDemo } from '../../demo/demo';
import { DEMO_NAME } from '../../demo/generate';
import { useLessonAccess } from '../education/access';
import { coursesFor } from '../education/catalog';
import { BOOKS, COURSE_TITLE, courseSequence } from '../education/course/modules';
import { seedLessonsForTrack } from '../education/lessons';
import { useEdu } from '../education/state';
import { evaluate, fmtMetric, kept, metricValue, METRICS } from '../experiment/model';
import { toggleDone, useExperiment } from '../experiment/state';
import { addWater } from '../fuel/state';
import { GLASS_ML } from '../fuel/model';
import { coachNotes, cycleFor, readinessInput } from '../life/today';
import { useSlices } from '../life/state';
import { countdownWords, lastShow, nextShow, PHASE_COPY, showPhase, voiceBudget } from '../performer/model';
import { itemsOn, kindIcon } from '../plan/model';
import { toggleItem } from '../plan/state';
import { explainReadiness } from '../recover/explain';
import { KEEP, STEPS, biggestSignal, stepFor, todayActions, weekDays, weekModule } from './model';

export default function PeakCycleScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = useSlices();
  const goals = useSettings((x) => x.goals);
  const name = useSettings((x) => x.name);
  const demo = useSettings((x) => x.demo);
  const track = useSettings((x) => x.track);
  const premium = usePremium();
  const edu = useEdu();
  const xp = useExperiment();
  const canOpen = useLessonAccess();
  const today = dayKey();
  const now = new Date();

  const at = stepFor(cycleFor(s, today));
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked ?? at.index;
  const step = STEPS[shown];
  const week = weekDays(s, today);
  const empty = !Object.keys(s.track.checkins).length && !s.move.workouts.length && !s.plan.versions.length;

  const mod = weekModule(
    edu,
    coursesFor(track).map((course) => ({ course, lessons: courseSequence(course).filter(canOpen) })),
    seedLessonsForTrack(track).filter(canOpen),
  );
  const bookWeek = mod?.course && mod.week ? BOOKS[mod.course].weeks.find((w) => w.number === mod.week) : null;

  const ev = xp.current ? evaluate(xp.current, metricValue(s, xp.current.metric), today) : null;
  const checkedIn = !!s.track.checkins[today];
  const actions = todayActions({
    items: itemsOn(s.plan.items, today),
    experiment: xp.current && today <= addDays(xp.current.start, xp.current.days - 1) ? { title: xp.current.title, doneToday: !!xp.current.done[today] } : null,
    checkedIn,
    module: mod ? { id: mod.lesson.id, title: mod.lesson.kind === 'module' ? `Module ${mod.lesson.number}: ${mod.lesson.title}` : mod.lesson.title } : null,
  });
  const openCount = actions.filter((a) => !a.done).length;

  const signal = biggestSignal(s, today);
  const why = explainReadiness({ ...readinessInput(s, goals, today), sleepGoal: goals.sleepHours }, readinessInput(s, goals, addDays(today, -1)));
  const note = coachNotes(s, goals, premium, today)[0];

  const show = nextShow(s.plan.items, today, now.getHours() * 60 + now.getMinutes());
  const phase = showPhase(show, lastShow(s.plan.items, today), today);
  const performer = track !== 'live' || !!show;
  const budget = voiceBudget(s.rehearse, phase, today);
  const keptList = kept(xp);
  const toneColor = (t: 'good' | 'warn' | 'info') => (t === 'good' ? c.ok : t === 'warn' ? c.warn : c.accent);

  const act = (a: (typeof actions)[number]) => {
    if (a.kind === 'plan') toggleItem(a.id);
    else if (a.kind === 'experiment') toggleDone(today);
    else if (a.kind === 'checkin') router.push('/checkin');
    else router.push(`/lesson/${a.lessonId}`);
  };
  const actionIcon = (a: (typeof actions)[number]): IconName => (a.kind === 'plan' ? (kindIcon(a.item.kind) as IconName) : a.kind === 'experiment' ? 'git-branch' : a.kind === 'checkin' ? 'edit-3' : 'book-open');

  return (
    <View testID="today" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 128, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image source={c.dark ? require('../../../assets/brand/wordmark-white.png') : require('../../../assets/brand/wordmark-navy.png')} style={{ width: 150, height: 26 }} resizeMode="contain" accessibilityLabel="Coressence" />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {demo ? <Badge text="Demo profile" color={c.teal} /> : null}
            <IconButton icon="grid" label="All of Coressence" onPress={() => router.push('/coressence')} testID="open-coressence-home" />
            <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} testID="open-settings" />
          </View>
        </View>
        <T variant="label" style={{ marginTop: 14 }}>
          {longDate(today)} · week of {shortDate(weekStart(today))}
        </T>
        <T variant="display" style={{ marginTop: 4 }}>
          {greeting()}
          {demo ? `, ${DEMO_NAME}` : name ? `, ${name}` : ''}
        </T>

        {/* ------------------------------------------------ the loop */}
        <Rise i={0} style={{ marginTop: 16 }}>
          <Deep padded={false} testID="peak-cycle">
            <View style={{ paddingHorizontal: 18, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T variant="label" color="#A9C6D2">
                Your Peak Cycle
              </T>
              {at.keeping ? <Badge text={KEEP.label} color="#9FE3DC" /> : null}
            </View>
            <LoopMap stations={STEPS} current={at.index} selected={shown} onSelect={(i) => setPicked(i === at.index ? null : i)}>
              <T variant="label" color={c.foam} style={{ fontSize: 10 }}>
                Step {step.n} of {STEPS.length}
                {shown === at.index ? ' · now' : ''}
              </T>
              <T variant="title" color="#FFFFFF" style={{ textAlign: 'center', marginTop: 2, fontSize: 21, lineHeight: 25 }} testID="cycle-ask">
                {step.ask}
              </T>
              <View accessible accessibilityLabel={`This week: ${week.filter((d) => d.logged).length} of 7 days logged`} style={{ flexDirection: 'row', gap: 5, marginTop: 9 }}>
                {week.map((d) => (
                  <View key={d.date} style={{ alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 17, height: 17, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: d.logged ? '#3BC4BD' : 'transparent', borderWidth: d.logged ? 0 : 1.5, borderColor: d.today ? '#FFFFFF' : '#5F8799', borderStyle: d.future ? 'dashed' : 'solid' }}>
                      {d.logged ? <Feather name="check" size={11} color={c.deep} /> : null}
                    </View>
                    <T variant="caption" color={d.today ? '#FFFFFF' : '#8FB0BE'} style={{ fontSize: 9.5, lineHeight: 11, fontFamily: d.today ? FONTS.semibold : FONTS.medium }}>
                      {d.letter}
                    </T>
                  </View>
                ))}
              </View>
            </LoopMap>
            <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
              <T variant="small" color="#D5E6EC">
                {shown === at.index && at.keeping ? KEEP.text : step.text}
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <Button label={step.action} icon="arrow-right" kind="teal" compact onPress={() => router.push(step.route as never)} testID="today-cycle" style={{ flex: 1 }} />
                <IconButton icon="map" label="The whole method" color="#D5E6EC" onPress={() => router.push('/coach')} testID="open-coach" style={{ backgroundColor: '#FFFFFF1A', borderRadius: RADIUS.button }} />
              </View>
            </View>
          </Deep>
        </Rise>

        {empty ? (
          <Rise i={1}>
            <Card style={{ marginTop: 14 }}>
              <T variant="heading">Start at step one</T>
              <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                The loop fills in as you go. A 20-second check-in today, last night’s sleep, or Apple Health or Health Connect in Devices is enough to begin.
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <Button label="Connect a device" icon="link" kind="secondary" compact onPress={() => router.push('/measure')} />
                {DEMO_TOOLS ? <Button label="Load demo data" icon="play-circle" kind="ghost" compact onPress={() => setDemo(true)} testID="load-demo" /> : null}
              </View>
            </Card>
          </Rise>
        ) : null}

        {/* ------------------------------------------------ this week's module */}
        {mod ? (
          <Rise i={1}>
            <SectionTitle color={c.sand}>{mod.course ? `This week in ${COURSE_TITLE[mod.course]}` : 'This week’s lesson'}</SectionTitle>
            <Paper onPress={() => router.push(`/lesson/${mod.lesson.id}`)} testID="today-lesson">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <T variant="figure" color={c.sand} style={{ fontSize: 46, lineHeight: 48, minWidth: 40 }}>
                  {mod.lesson.number}
                </T>
                <View style={{ flex: 1 }}>
                  <T variant="label" color={c.sand}>
                    {mod.lesson.kind === 'lab' ? 'Practice lab' : mod.lesson.kind === 'module' ? 'Module' : 'Lesson'}
                    {mod.week ? ` · Week ${mod.week}` : ''} · {mod.lesson.minutes} min
                  </T>
                  <T variant="title" style={{ marginTop: 2 }}>
                    {mod.lesson.title}
                  </T>
                  {bookWeek ? (
                    <T variant="quote" color={c.inkSoft} style={{ marginTop: 2, fontSize: 15, lineHeight: 21 }}>
                      {bookWeek.title}
                    </T>
                  ) : null}
                </View>
                <Feather name="arrow-up-right" size={20} color={c.sand} />
              </View>
              <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }} numberOfLines={3}>
                {mod.lesson.purpose}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Progress value={mod.total ? mod.completed / mod.total : 0} color={c.sand} height={5} />
                </View>
                <T variant="caption">
                  {mod.completed} of {mod.total} done
                </T>
              </View>
            </Paper>
          </Rise>
        ) : null}

        {/* ------------------------------------------------ today's actions */}
        <Rise i={2}>
          <SectionTitle right={<T variant="caption" color={c.accent} onPress={() => router.push('/plan')}>Whole week</T>}>{actions.length ? `Today · ${openCount ? `${openCount} to do` : 'all done'}` : 'Today'}</SectionTitle>
          <Card padded={false} testID="today-actions">
            {actions.length ? (
              actions.map((a, i) => (
                <Pressable key={a.id} testID={`today-item-${i}`} accessibilityRole={a.kind === 'plan' || a.kind === 'experiment' ? 'checkbox' : 'button'} accessibilityState={{ checked: a.done }} accessibilityLabel={a.title} onPress={() => act(a)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: a.done ? c.okSoft : c.surface2 }}>
                    {a.done ? <Feather name="check" size={16} color={c.ok} /> : <T variant="caption" color={c.inkSoft} style={{ fontFamily: FONTS.num, fontSize: 13 }}>{i + 1}</T>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong" style={a.done ? { textDecorationLine: 'line-through', color: c.muted } : undefined}>
                      {a.title}
                    </T>
                    <T variant="caption">{a.kind === 'plan' ? (a.time ? `${clock(a.time)} · from your plan` : 'From your plan') : a.kind === 'experiment' ? 'This week’s experiment' : a.kind === 'checkin' ? 'Step 1: assess' : 'This week’s module'}</T>
                  </View>
                  <Feather name={actionIcon(a)} size={16} color={c.muted} />
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 16 }}>
                <T variant="small" color={c.muted}>
                  Nothing left for today. Build your plan to give each day its one to three actions.
                </T>
                <Button label="Build my plan" kind="ghost" compact icon="edit" onPress={() => router.push('/plan-builder')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
              </View>
            )}
          </Card>
        </Rise>

        {/* ------------------------------------------------ biggest signal + why */}
        {signal || why.score !== null ? (
          <Rise i={3}>
            <SectionTitle right={<T variant="caption" color={c.accent} onPress={() => router.push('/monitor')}>All signals</T>}>Biggest signal this week</SectionTitle>
            {signal ? (
              <Card onPress={() => router.push(signal.route as never)} testID="today-signal">
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <T variant="label" color={toneColor(signal.tone)}>
                      {signal.label}
                    </T>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 2 }}>
                      <T variant="figure">{fmtMetric({ ...METRICS[signal.key], unit: '' }, signal.recent)}</T>
                      <T variant="caption" style={{ marginBottom: 10 }}>
                        {signal.unit.trim()} · usual {round(signal.usual, signal.dp).toLocaleString('en-US')}
                      </T>
                    </View>
                  </View>
                  <Spark values={signal.series} color={toneColor(signal.tone)} width={104} height={44} />
                </View>
                <T variant="heading" style={{ marginTop: 8 }}>
                  {signal.headline}
                </T>
                <T variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                  {signal.text}
                </T>
              </Card>
            ) : null}
            {why.score !== null ? (
              <Card style={{ marginTop: 10 }} onPress={() => router.push('/why')} testID="today-why">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ alignItems: 'center', minWidth: 52 }}>
                    <T variant="stat" color={moduleColor(c, 'recover')}>
                      {why.score}
                    </T>
                    <T variant="caption" style={{ fontSize: 10.5 }}>
                      readiness
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="heading">Why this number</T>
                    <T variant="small" color={c.inkSoft}>
                      {why.biggest ? `${why.biggest.label} moved it most (${why.biggest.delta > 0 ? '+' : '−'}${Math.abs(why.biggest.delta)}). ${why.yesterday.change ? why.yesterday.text : ''}` : why.sentence}
                    </T>
                  </View>
                  <Feather name="chevron-right" size={18} color={c.muted} />
                </View>
              </Card>
            ) : null}
          </Rise>
        ) : null}

        {/* ------------------------------------------------ weekly experiment */}
        <Rise i={4}>
          <SectionTitle color={c.sand}>Weekly experiment</SectionTitle>
          {xp.current && ev ? (
            <Paper onPress={() => router.push('/experiment')} testID="today-experiment">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <T variant="label" color={c.sand}>
                  {ev.finished ? 'Week complete' : `Day ${ev.day} of ${xp.current.days}`}
                  {xp.current.module ? ` · Module ${xp.current.module}` : ''}
                </T>
                {ev.verdict ? <Badge text={ev.status === 'final' ? `Verdict: ${ev.verdict}` : `Early read: ${ev.verdict}`} color={ev.verdict === 'keep' ? c.ok : ev.verdict === 'drop' ? c.danger : c.warn} /> : null}
              </View>
              <T variant="title" style={{ marginTop: 4 }}>
                {xp.current.title}
              </T>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {ev.afterDays.map((d) => (
                  <View key={d.date} style={{ flex: 1, height: 8, borderRadius: 3, backgroundColor: d.done ? c.sand : d.date > today ? 'transparent' : c.paperLine, borderWidth: d.date > today ? 1 : 0, borderColor: c.paperLine }} />
                ))}
              </View>
              <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
                {ev.before !== null && ev.after !== null ? `${METRICS[xp.current.metric].label}: ${fmtMetric(METRICS[xp.current.metric], ev.before)} before, ${fmtMetric(METRICS[xp.current.metric], ev.after)} so far.` : ev.reason}
              </T>
            </Paper>
          ) : (
            <Paper onPress={() => router.push('/experiment')} testID="today-experiment">
              <T variant="title">Pick one change to test</T>
              <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                Choose one change from the course, do it for a week, and the app compares your own numbers before and after. You get a plain verdict: keep, adjust or drop.
              </T>
              <Button label="Choose this week’s experiment" icon="git-branch" compact color={c.sand} style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/experiment')} />
            </Paper>
          )}
          {keptList.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }} testID="today-kept">
              <T variant="caption">Keeping:</T>
              {keptList.slice(0, 3).map((k) => (
                <View key={k.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.okSoft, borderRadius: RADIUS.chip, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Feather name="anchor" size={11} color={c.ok} />
                  <T variant="caption" color={c.ok}>
                    {k.title}
                  </T>
                </View>
              ))}
            </View>
          ) : null}
        </Rise>

        {/* ------------------------------------------------ performer day */}
        {performer ? (
          <Rise i={5}>
            <SectionTitle color={moduleColor(c, 'performer')}>Performer Day</SectionTitle>
            <Card onPress={() => router.push('/performer')} testID="today-performer">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <T variant="label" color={moduleColor(c, 'performer')}>
                    {PHASE_COPY[phase].label}
                  </T>
                  <T variant="title" style={{ marginTop: 2 }}>
                    {show ? `${show.item.title} · ${countdownWords(show).toLowerCase()}` : 'Add your next show'}
                  </T>
                  <T variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                    Voice budget today: {budget.left >= 0 ? `${budget.left} h left of ${budget.budget} h` : `over by ${Math.abs(budget.left)} h`}
                  </T>
                </View>
                <Feather name="chevron-right" size={18} color={c.muted} />
              </View>
              <View style={{ marginTop: 10 }}>
                <Progress value={budget.budget ? Math.min(1, budget.used / budget.budget) : 0} color={budget.status === 'over' ? c.danger : budget.status === 'near' ? c.warn : moduleColor(c, 'performer')} height={6} />
              </View>
            </Card>
          </Rise>
        ) : null}

        {/* ------------------------------------------------ log */}
        <SectionTitle>Log something</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { label: `${GLASS_ML} ml water`, icon: 'droplet' as const, color: c.pillar.fuel, on: () => addWater(today, GLASS_ML), id: 'quick-water' },
            { label: 'Meal', icon: 'coffee' as const, color: c.pillar.fuel, on: () => router.push({ pathname: '/fuel', params: { add: 'meal' } }), id: 'quick-meal' },
            { label: 'Workout', icon: 'activity' as const, color: c.pillar.move, on: () => router.push({ pathname: '/move', params: { add: '1' } }), id: 'quick-move' },
            { label: 'Sleep', icon: 'moon' as const, color: c.pillar.sleep, on: () => router.push({ pathname: '/sleep', params: { add: '1' } }), id: 'quick-sleep' },
            { label: 'Breathe', icon: 'wind' as const, color: c.pillar.restore, on: () => router.push('/breathe'), id: 'quick-breathe' },
            { label: 'Voice', icon: 'mic' as const, color: moduleColor(c, 'rehearse'), on: () => router.push('/rehearse'), id: 'quick-voice' },
          ].map((q) => (
            <Pressable key={q.id} testID={q.id} accessibilityRole="button" accessibilityLabel={`Log ${q.label}`} onPress={q.on} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.surface, borderRadius: RADIUS.chip, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, height: 42, opacity: pressed ? 0.7 : 1 })}>
              <Feather name={q.icon} size={16} color={q.color} />
              <T variant="caption" color={c.ink}>
                {q.label}
              </T>
            </Pressable>
          ))}
        </ScrollView>

        {note ? (
          <Card style={{ marginTop: 14 }} onPress={note.route ? () => router.push(note.route as never) : undefined} testID={`note-${note.id}`}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Feather name={note.tone === 'warn' ? 'alert-circle' : note.tone === 'good' ? 'award' : 'info'} size={18} color={toneColor(note.tone)} style={{ marginTop: 2 }} />
              <T variant="small" style={{ flex: 1 }}>
                {note.text}
              </T>
            </View>
          </Card>
        ) : null}

        <Card style={{ marginTop: 10 }} onPress={() => router.push('/review')} testID="today-review">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="refresh-ccw" size={18} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T variant="heading">Weekly review</T>
              <T variant="small" color={c.muted}>
                {lastDays(7, today).filter((d) => s.track.checkins[d]).length} of 7 days logged · compare with the week before
              </T>
            </View>
            <Feather name="chevron-right" size={18} color={c.muted} />
          </View>
        </Card>
        <T variant="caption" style={{ textAlign: 'center', marginTop: 24 }}>
          General education, not medical advice.
        </T>
      </ScrollView>
    </View>
  );
}
