// Learn: the Live at Your Peak and Perform at Your Peak courses (12 modules each, with the four performer
// practice labs), the ten core worksheets, weekly homework, and the short seed lessons.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PURCHASES_LIVE } from '@core/appConfig';
import { useEntitlements } from '@core/billing/billing';
import { canOpenLesson } from '@core/billing/entitlements';
import { dayKey } from '@core/dates';
import { setSettings, useSettings } from '@core/settings';
import { shareText } from '@core/share';
import { FONTS, moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Field, Note, Progress, Screen, SectionTitle, T } from '@core/ui';
import { Hero } from '../../components/Hero';
import { DASHBOARD_OPTIONS, currentPlan } from '../plan/model';
import { usePlan } from '../plan/state';
import { coursesFor, lesson as getLesson, nextInSequence } from './catalog';
import { BOOKS, COURSE_TITLE, courseSequence, homework, homeworkDef, worksheetDef, worksheets, type Course } from './course/modules';
import { seedLessonsForTrack, type Lesson, type LessonField } from './lessons';
import { completedCount, courseOutputs, displayAnswer, homeworkBrief, homeworkChecklist, planExportText, sheetCopies, type SheetEntry } from './model';
import { completeLesson, deleteWorksheet, passCheck, reopenHomework, reopenWorksheet, saveHomework, saveWorksheet, useEdu } from './state';

const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
const dashLabel = (k: string) => DASHBOARD_OPTIONS.find((o) => o.key === k)?.label ?? k;

function Paragraphs({ text, variant = 'body', color }: { text: string; variant?: 'body' | 'small'; color?: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <T key={i} variant={variant} color={color} style={{ marginTop: i ? 8 : 0 }}>
          {p}
        </T>
      ))}
    </>
  );
}

function FaithCard({ faith }: { faith?: { ref: string; body: string[] } }) {
  const c = useTheme();
  const on = useSettings((s) => s.faith);
  if (!on || !faith) return null;
  return (
    <Card tint={c.surface2} style={{ marginTop: 16 }}>
      <T variant="label" color={c.inkSoft}>
        Faith & Reflection{faith.ref ? ` · ${faith.ref}` : ''}
      </T>
      <Paragraphs text={faith.body.join('\n\n')} variant="small" />
    </Card>
  );
}

function useExportPlan() {
  const edu = useEdu();
  const plan = usePlan();
  const track = useSettings((s) => s.track);
  return () => shareText('My Coressence plan', planExportText(edu, currentPlan(plan), coursesFor(track), dashLabel, dayKey()), `coressence-plan-${dayKey()}.txt`);
}

// ------------------------------------------------------------------ Learn
/** With purchases off, the short lessons are open as well as the free course parts. */
function isOpenInRelease(id: string, track: Lesson['track'], ents: Set<string>, preview: boolean) {
  return canOpenLesson(id, track, ents, preview) || (!PURCHASES_LIVE && /^l\d+$/.test(id));
}

export function LearnScreen() {
  const c = useTheme();
  const edu = useEdu();
  const track = useSettings((s) => s.track);
  const faith = useSettings((s) => s.faith);
  const { ents, preview } = useEntitlements();
  const color = moduleColor(c, 'education');
  const courses = coursesFor(track);
  const [picked, setPicked] = useState<Course>(courses[0]);
  const course: Course = courses.includes(picked) ? picked : courses[0];
  const seq = courseSequence(course);
  const out = courseOutputs(edu, course, seq.map((l) => l.id));
  const book = BOOKS[course];
  const [showDisc, setShowDisc] = useState(false);
  const exportPlan = useExportPlan();
  const seeds = seedLessonsForTrack(track);
  const open = (id: string, t: Lesson['track']) => isOpenInRelease(id, t, ents, preview);
  const goLocked = () => router.push({ pathname: '/plus', params: { reason: 'lessons' } });

  const row = (l: Lesson) => {
    const ok = open(l.id, l.track);
    if (!ok && !PURCHASES_LIVE) return null;
    const complete = !!edu.progress[l.id]?.completed;
    return (
      <Card key={l.id} style={{ marginBottom: 10 }} onPress={() => (ok ? router.push(`/lesson/${l.id}`) : goLocked())} testID={`lesson-${l.id}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: complete ? c.okSoft : color + '1A', alignItems: 'center', justifyContent: 'center' }}>
            {complete ? <Feather name="check" size={19} color={c.ok} /> : l.kind === 'lab' ? <Feather name="mic" size={17} color={color} /> : <T variant="heading" color={color}>{l.number}</T>}
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{l.kind === 'lab' ? `Practice lab ${l.number}: ${l.title}` : l.kind === 'module' ? `Module ${l.number}: ${l.title}` : l.title}</T>
            <T variant="caption">
              {l.kind === 'module' ? `${l.phase.split(' · ')[1]} · ${l.minutes} min · Worksheet ${l.worksheets?.join(', ')}` : `${l.phase} · ${l.minutes} min`}
              {l.kind === 'lesson' && l.track !== 'core' ? ` · ${l.track === 'perform' ? 'Perform' : 'Live'} track` : ''}
            </T>
          </View>
          {ok ? <Feather name="chevron-right" size={18} color={c.muted} /> : <Feather name="lock" size={16} color={c.muted} />}
        </View>
      </Card>
    );
  };

  return (
    <Screen title="Course" subtitle="Coressence Life Series" back={false} color={color} accentBar testID="learn">
      <Hero colors={['#0E3A66', '#1468A0']}>
        <T variant="label" color="#BFD8EE">
          {COURSE_TITLE[course]} · four-week course
        </T>
        {PURCHASES_LIVE ? (
          <>
            <T variant="title" color="#FFFFFF" style={{ marginTop: 4 }} testID="course-outputs">
              {out.done} of {out.total} course outputs saved
            </T>
            <View style={{ marginTop: 10 }}>
              <Progress value={out.done / out.total} color="#5FD3CF" />
            </View>
            <T variant="caption" color="#D6E6F2" style={{ marginTop: 10 }}>
              Progress counts the decisions, worksheets and homework you complete, not streaks.
            </T>
          </>
        ) : (
          <T variant="caption" color="#D6E6F2" style={{ marginTop: 10 }} testID="course-outputs">
            This version includes the first module and worksheet of the course, plus the short lessons below.
          </T>
        )}
      </Hero>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {(['live', 'perform', 'both'] as const).map((t) => (
          <Chip key={t} small label={t === 'live' ? 'Live' : t === 'perform' ? 'Perform' : 'Both tracks'} selected={track === t} onPress={() => setSettings({ track: t })} color={color} testID={`track-${t}`} />
        ))}
      </View>
      {courses.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {courses.map((k) => (
            <Chip key={k} small label={COURSE_TITLE[k]} selected={course === k} onPress={() => setPicked(k)} testID={`course-${k}`} />
          ))}
        </View>
      ) : null}

      {book.disclaimer ? (
        <Card tint={c.accentSoft} style={{ marginTop: 14 }} onPress={() => setShowDisc(!showDisc)} testID="course-disclaimer">
          <T variant="label" color={color}>
            Important medical and educational disclaimer
          </T>
          {showDisc ? (
            <View style={{ marginTop: 6 }}>
              <Paragraphs text={[...book.disclaimer.body, ...(faith ? book.disclaimer.faith : [])].join('\n\n')} variant="small" />
            </View>
          ) : (
            <T variant="small" style={{ marginTop: 4 }}>
              {book.disclaimer.body[0].split('. ').slice(0, 2).join('. ')}. Tap to read it all.
            </T>
          )}
        </Card>
      ) : null}

      {homework(course).map((h) => {
        const items = seq.filter((l) => l.week === h.week);
        const hw = edu.homework?.[h.key];
        const hwOpen = open(h.key, course) && items.every((l) => open(l.id, l.track));
        if (!PURCHASES_LIVE && !items.some((l) => open(l.id, l.track))) return null;
        return (
          <View key={h.key}>
            <SectionTitle>{h.title}</SectionTitle>
            {items.map(row)}
            {PURCHASES_LIVE || hwOpen ? <Card style={{ marginBottom: 10 }} tint={c.surface2} onPress={() => (hwOpen ? router.push(`/homework/${h.key}`) : goLocked())} testID={`homework-${h.week}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Feather name={hw?.status === 'submitted' ? 'check-circle' : 'clipboard'} size={20} color={hw?.status === 'submitted' ? c.ok : color} />
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">Week {h.week} homework</T>
                  <T variant="caption">{hw?.status === 'submitted' ? `Submitted ${fmtTime(hw.submittedAt)} · ${hw.receipt}` : hw ? 'Draft saved' : h.output}</T>
                </View>
                {hwOpen ? <Feather name="chevron-right" size={18} color={c.muted} /> : <Feather name="lock" size={16} color={c.muted} />}
              </View>
            </Card> : null}
          </View>
        );
      })}

      <SectionTitle>Worksheets</SectionTitle>
      {worksheets(course).map((w) => {
        const copies = sheetCopies(edu, w.key);
        const sub = copies.find((x) => x.status === 'submitted');
        const ok = open(w.key, course);
        if (!ok && !PURCHASES_LIVE) return null;
        return (
          <Card key={w.key} style={{ marginBottom: 8 }} onPress={() => (ok ? router.push(`/worksheet/${w.key}`) : goLocked())} testID={`worksheet-${w.number}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T variant="heading" color={color} style={{ width: 26, textAlign: 'center' }}>
                {w.number}
              </T>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{w.title}</T>
                <T variant="caption">{sub ? `Submitted ${fmtTime(sub.submittedAt)}` : copies.length ? `Draft · ${fmtTime(copies[0].updated)}` : 'Not started'}{copies.length > 1 ? ` · ${copies.length} copies` : ''}</T>
              </View>
              {ok ? <Feather name="chevron-right" size={18} color={c.muted} /> : <Feather name="lock" size={16} color={c.muted} />}
            </View>
          </Card>
        );
      })}
      <Button label="Export my current plan" icon="share" kind="secondary" style={{ marginTop: 8 }} onPress={exportPlan} testID="export-plan" />

      <SectionTitle>Short lessons</SectionTitle>
      {seeds.map(row)}
      <Note text={PURCHASES_LIVE ? 'Module 1 and Lesson 1 are free. Every module is included in Coressence+, or buy a course track once. General education, not medical advice.' : 'General education, not medical advice.'} />
      <T variant="caption" style={{ marginTop: 10 }}>
        {completedCount(edu, seeds.map((l) => l.id))} of {seeds.length} short lessons complete. Course text comes from the {COURSE_TITLE[course]} Full Course Book; recorded lessons and captions are not in this release.
      </T>
    </Screen>
  );
}

// ------------------------------------------------------------------ module / lab / lesson
type Stage = 'learn' | 'example' | 'check' | 'apply' | 'done';

function AnswerField({ f, value, onChange, color }: { f: LessonField; value: string; onChange: (v: string) => void; color: string }) {
  const c = useTheme();
  if (f.kind === 'chips' || f.kind === 'choice') {
    const sel = value ? value.split(',') : [];
    return (
      <View style={{ marginTop: 12 }}>
        <T variant="caption" color={c.inkSoft} style={{ marginBottom: 6 }}>
          {f.label}
          {f.required ? ' *' : ''}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(f.options ?? []).map((o) => (
            <Chip
              key={o.key}
              small
              label={o.label}
              color={color}
              selected={sel.includes(o.key)}
              testID={`apply-${f.key}-${o.key.replace(/\s/g, '_')}`}
              onPress={() => onChange(f.kind === 'choice' ? o.key : (sel.includes(o.key) ? sel.filter((x) => x !== o.key) : [...sel, o.key]).join(','))}
            />
          ))}
        </View>
      </View>
    );
  }
  return <Field label={`${f.label}${f.required ? ' *' : ''}`} value={value} onChangeText={onChange} placeholder={f.placeholder} multiline={f.multiline} testID={`apply-${f.key}`} />;
}

export function LessonScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const l = getLesson(String(id));
  const edu = useEdu();
  const { ents, preview } = useEntitlements();
  const color = moduleColor(c, 'education');
  const prog = l ? edu.progress[l.id] : undefined;
  const [stage, setStage] = useState<Stage>('learn');
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(prog?.answers ?? {});
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => {
    setStage('learn');
    setChoice(null);
    setMissing([]);
    setAnswers((l && edu.progress[l.id]?.answers) || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!l)
    return (
      <Screen title="Lesson">
        <T>Lesson not found.</T>
      </Screen>
    );
  if (!isOpenInRelease(l.id, l.track, ents, preview))
    return (
      <Screen title={l.title}>
        <Card>
          <T variant="body">{PURCHASES_LIVE ? `This is part of Coressence+ and the ${l.course ? COURSE_TITLE[l.course] : ''} course track.` : 'This part of the course is not in this version.'}</T>
          {PURCHASES_LIVE ? <Button label="See Coressence+" icon="star" style={{ marginTop: 12 }} onPress={() => router.replace({ pathname: '/plus', params: { reason: 'lessons' } })} /> : null}
        </Card>
      </Screen>
    );
  const stages: Stage[] = l.check ? ['learn', 'example', 'check', 'apply', 'done'] : ['learn', 'apply', 'done'];
  const labels = l.check ? ['Learn', 'Example', 'Check', 'Apply', 'Next'] : ['Learn', 'Practice', 'Next'];
  const si = stages.indexOf(stage);
  const correct = !!l.check && choice === l.check.correct;
  const next = nextInSequence(l.id);
  const title = l.kind === 'module' ? `Module ${l.number}: ${l.title}` : l.kind === 'lab' ? `Practice lab ${l.number}` : l.title;
  const subtitle = l.kind ? `${l.course ? COURSE_TITLE[l.course] : ''} · ${l.phase} · ${l.minutes} min` : `Lesson ${l.number} · ${l.phase} · ${l.minutes} min`;
  const decisionFields = l.apply.fields.filter((f) => !f.reflection);
  const reflectionFields = l.apply.fields.filter((f) => f.reflection);
  const firstSheet = l.course && l.worksheets?.length ? `${l.course}-ws${l.worksheets[0]}` : null;

  const save = () => {
    const miss = l.apply.fields.filter((f) => f.required && !String(answers[f.key] ?? '').trim()).map((f) => f.key);
    if (!l.apply.fields.some((f) => String(answers[f.key] ?? '').trim()) && !miss.length) miss.push(l.apply.fields[0].key);
    setMissing(miss);
    if (miss.length) return;
    completeLesson(l.id, answers);
    setStage('done');
  };

  return (
    <Screen key={stage} title={title} subtitle={subtitle} color={color} accentBar testID="lesson">
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
        {labels.map((x, i) => (
          <View key={x} style={{ flex: 1 }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= si ? color : c.surface2 }} />
            <T variant="caption" color={i === si ? color : c.muted} style={{ marginTop: 4, textAlign: 'center' }}>
              {x}
            </T>
          </View>
        ))}
      </View>

      {stage === 'learn' ? (
        <>
          <Card tint={c.accentSoft}>
            <T variant="label" color={color}>
              Purpose
            </T>
            <T variant="body" style={{ marginTop: 4 }}>
              {l.purpose}
            </T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
              You will leave with: {l.output}
            </T>
          </Card>
          {l.sections.map((s) => (
            <View key={s.heading} style={{ marginTop: 18 }}>
              <T variant="title">{s.heading}</T>
              <View style={{ marginTop: 6 }}>
                <Paragraphs text={s.body} />
              </View>
            </View>
          ))}
          {l.authorNote ? (
            <Card tint={c.surface2} style={{ marginTop: 16 }}>
              <T variant="label" color={c.inkSoft}>
                From my own experience · Robert Clinton, MD
              </T>
              <Paragraphs text={l.authorNote.join('\n\n')} variant="small" />
            </Card>
          ) : null}
          <FaithCard faith={l.faith} />
          <T variant="caption" style={{ marginTop: 16 }}>
            Companion: {l.worksheet}
          </T>
          <Button label={l.check ? 'See an example' : 'Start the practice'} icon="arrow-right" style={{ marginTop: 18 }} onPress={() => setStage(l.check ? 'example' : 'apply')} testID="lesson-next" color={color} />
        </>
      ) : null}

      {stage === 'example' ? (
        <>
          <Card>
            <T variant="title">{l.example.title}</T>
            <View style={{ marginTop: 8 }}>
              <Paragraphs text={l.example.body} />
            </View>
            {l.discuss ? (
              <>
                <T variant="label" color={color} style={{ marginTop: 14 }}>
                  Discuss
                </T>
                <T variant="small" style={{ marginTop: 4 }}>
                  {l.discuss}
                </T>
              </>
            ) : null}
          </Card>
          {l.extraExample ? (
            <Card style={{ marginTop: 12 }} testID="extra-example">
              <T variant="label" color={color}>
                Another fictional example
              </T>
              <T variant="heading" style={{ marginTop: 4 }}>
                {l.extraExample.title}
              </T>
              <View style={{ marginTop: 6 }}>
                <Paragraphs text={l.extraExample.body} variant="small" />
              </View>
            </Card>
          ) : null}
          <Button label="Quick check" icon="arrow-right" style={{ marginTop: 18 }} onPress={() => setStage('check')} testID="lesson-next" color={color} />
        </>
      ) : null}

      {stage === 'check' && l.check ? (
        <>
          <Card>
            <T variant="heading">{l.check.question}</T>
            <View style={{ gap: 8, marginTop: 12 }}>
              {l.check.options.map((o, i) => {
                const picked = choice === i;
                const bg = picked ? (correct ? c.okSoft : c.warnSoft) : c.surface2;
                return (
                  <Pressable key={o} testID={`opt-${i}`} accessibilityRole="radio" accessibilityState={{ checked: picked }} disabled={choice !== null} onPress={() => setChoice(i)} style={{ padding: 14, borderRadius: 14, backgroundColor: bg, borderWidth: 1, borderColor: picked ? (correct ? c.ok : c.warn) : 'transparent', opacity: choice !== null && !picked ? 0.6 : 1 }}>
                    <T variant="body">{o}</T>
                  </Pressable>
                );
              })}
            </View>
            {choice !== null ? (
              <View style={{ marginTop: 12 }} testID="check-feedback">
                <T variant="bodyStrong" color={correct ? c.ok : c.warn}>
                  {correct ? 'That’s right.' : 'Not quite. Here is why, then try again.'}
                </T>
                <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                  {l.check.explanation}
                </T>
                {!correct ? <Button label="Try again" icon="rotate-ccw" kind="secondary" compact style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => setChoice(null)} testID="check-retry" /> : null}
              </View>
            ) : null}
          </Card>
          <Button
            label="Apply it"
            icon="arrow-right"
            style={{ marginTop: 18 }}
            disabled={!correct}
            onPress={() => {
              passCheck(l.id);
              setStage('apply');
            }}
            testID="lesson-next"
            color={color}
          />
        </>
      ) : null}

      {stage === 'apply' ? (
        <>
          <Card>
            <T variant="small" color={c.inkSoft}>
              {l.apply.intro}
            </T>
            {l.apply.note ? (
              <View style={{ marginTop: 10 }}>
                <Note text={l.apply.note} icon="lock" />
              </View>
            ) : null}
            {decisionFields.map((f) => (
              <View key={f.key}>
                <AnswerField f={f} value={answers[f.key] ?? ''} onChange={(v) => setAnswers({ ...answers, [f.key]: v })} color={color} />
                {missing.includes(f.key) ? (
                  <T variant="caption" color={c.warn} style={{ marginTop: 4 }}>
                    Add an answer here so the decision is clear.
                  </T>
                ) : null}
              </View>
            ))}
          </Card>
          {reflectionFields.length ? (
            <Card style={{ marginTop: 12 }}>
              <T variant="label" color={color}>
                Make it your own (optional)
              </T>
              {reflectionFields.map((f) => (
                <AnswerField key={f.key} f={f} value={answers[f.key] ?? ''} onChange={(v) => setAnswers({ ...answers, [f.key]: v })} color={color} />
              ))}
            </Card>
          ) : null}
          <Button label="Save my decision" icon="check" style={{ marginTop: 18 }} onPress={save} testID="lesson-save" color={color} />
          {missing.length ? (
            <T variant="small" color={c.warn} style={{ marginTop: 8 }} testID="apply-missing">
              A few prompts still need an answer. They are marked above.
            </T>
          ) : null}
          <T variant="caption" style={{ marginTop: 8 }}>
            Saved privately on this device. It is not submitted to anyone.
          </T>
        </>
      ) : null}

      {stage === 'done' ? (
        <>
          <Card testID="lesson-done">
            <Feather name="check-circle" size={28} color={c.ok} />
            <T variant="title" style={{ marginTop: 8 }}>
              Decision saved
            </T>
            {l.apply.fields.map((f) =>
              answers[f.key] ? (
                <T key={f.key} variant="small" style={{ marginTop: 6 }}>
                  <T variant="small" style={{ fontFamily: FONTS.semibold }}>
                    {f.label}:{' '}
                  </T>
                  {displayAnswer(f, answers[f.key])}
                </T>
              ) : null,
            )}
            <T variant="label" color={color} style={{ marginTop: 16 }}>
              Next action
            </T>
            <T variant="body" style={{ marginTop: 4 }}>
              {l.next}
            </T>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {l.planBuilder || ['l2', 'l6'].includes(l.id) ? <Button label="Open plan builder" icon="edit" kind="secondary" onPress={() => router.push('/plan-builder')} style={{ flexGrow: 1 }} testID="open-builder" /> : null}
            {firstSheet ? <Button label={`Worksheet ${l.worksheets![0]}`} icon="file-text" kind="secondary" onPress={() => router.push(`/worksheet/${firstSheet}`)} style={{ flexGrow: 1 }} testID="open-worksheet" /> : null}
            {next ? (
              <Button label={next.kind === 'lab' ? 'Practice lab' : next.kind === 'module' ? `Module ${next.number}` : `Lesson ${next.number}`} icon="arrow-right" onPress={() => router.replace(`/lesson/${next.id}`)} style={{ flexGrow: 1 }} color={color} testID="lesson-continue" />
            ) : (
              <Button label="Back to Learn" onPress={() => router.back()} style={{ flexGrow: 1 }} />
            )}
          </View>
        </>
      ) : null}

      <SectionTitle>{l.bookRefs ? 'In the book' : 'Sources'}</SectionTitle>
      {(l.bookRefs ?? []).map((r) => (
        <T key={r.label + r.line} variant="caption" style={{ marginBottom: 4 }}>
          {r.label}
        </T>
      ))}
      {l.sources.map((s) => (
        <T key={s} variant="caption" style={{ marginBottom: 4 }}>
          {s}
        </T>
      ))}
      {l.check && 'from' in l.check && l.check.from ? (
        <T variant="caption" style={{ marginBottom: 4 }}>
          Knowledge check: {l.check.from}
        </T>
      ) : null}
      <Badge text="General education, not medical advice" color={c.muted} />
    </Screen>
  );
}

// ------------------------------------------------------------------ worksheets
function Receipt({ at, code, label }: { at: string | null; code: string | null; label: string }) {
  const c = useTheme();
  if (!at || !code) return null;
  return (
    <Card tint={c.okSoft} style={{ marginTop: 12 }} testID="receipt">
      <T variant="label" color={c.ok}>
        {label}
      </T>
      <T variant="bodyStrong" style={{ marginTop: 4 }}>
        {code}
      </T>
      <T variant="small" style={{ marginTop: 2 }}>
        {fmtTime(at)}
      </T>
      <T variant="caption" style={{ marginTop: 6 }}>
        Kept on this device. Coach review is not connected in this version; use Export to share it with your coach.
      </T>
    </Card>
  );
}

export function WorksheetScreen() {
  const c = useTheme();
  const { id, copy } = useLocalSearchParams<{ id: string; copy?: string }>();
  const def = worksheetDef(String(id));
  const edu = useEdu();
  const { ents, preview } = useEntitlements();
  const color = moduleColor(c, 'education');
  const copies = def ? sheetCopies(edu, def.key) : [];
  const [entryId, setEntryId] = useState<string | null>(copy ? String(copy) : copies[0]?.id ?? null);
  const entry: SheetEntry | undefined = copies.find((x) => x.id === entryId);
  const [values, setValues] = useState<Record<string, string>>(entry?.values ?? {});
  const [msg, setMsg] = useState('');
  if (!def)
    return (
      <Screen title="Worksheet">
        <T>Worksheet not found.</T>
      </Screen>
    );
  if (!isOpenInRelease(def.key, def.course, ents, preview))
    return (
      <Screen title={`Worksheet ${def.number}`}>
        <Card>
          <T variant="body">This worksheet is part of Coressence+ and the {COURSE_TITLE[def.course]} course track.</T>
          {PURCHASES_LIVE ? <Button label="See Coressence+" icon="star" style={{ marginTop: 12 }} onPress={() => router.replace({ pathname: '/plus', params: { reason: 'lessons' } })} /> : null}
        </Card>
      </Screen>
    );
  const locked = entry?.status === 'submitted';
  const filled = Object.values(values).some((v) => v.trim());
  const pick = (e: SheetEntry | null) => {
    setEntryId(e?.id ?? null);
    setValues(e?.values ?? {});
    setMsg('');
  };
  const doSave = (submit: boolean) => {
    const newId = saveWorksheet(def.key, entryId, values, submit);
    setEntryId(newId);
    setMsg(submit ? 'Submitted.' : 'Draft saved. It stays a draft until you submit it.');
  };
  const sheetText = () => [`${COURSE_TITLE[def.course]}: Worksheet ${def.number}: ${def.title}`, entry?.receipt && entry.status === 'submitted' ? `Submitted ${fmtTime(entry.submittedAt)} · receipt ${entry.receipt}` : `Draft · ${dayKey()}`, '', ...def.fields.filter((f) => values[f.key]?.trim()).map((f) => `${f.label}:\n${values[f.key].trim()}\n`)].join('\n');

  return (
    <Screen title={`Worksheet ${def.number}`} subtitle={`${def.title} · ${COURSE_TITLE[def.course]}`} color={color} accentBar testID="worksheet">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Badge text={!entry ? 'New' : locked ? 'Submitted' : 'Draft'} color={locked ? c.ok : !entry ? c.muted : c.warn} />
        {copies.length > 1 || entry ? (
          <>
            {copies.map((e, i) => (
              <Chip key={e.id} small label={`Copy ${copies.length - i} · ${e.updated.slice(5, 10)}`} selected={e.id === entryId} onPress={() => pick(e)} />
            ))}
            <Chip small icon="plus" label="Blank copy" selected={!entry} onPress={() => pick(null)} testID="ws-new-copy" />
          </>
        ) : null}
      </View>
      {def.notes.map((n) => (
        <T key={n} variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
          {n}
        </T>
      ))}
      <Card style={{ marginTop: 12 }}>
        {def.fields.map((f) => (
          <Field key={f.key} label={f.label} value={values[f.key] ?? ''} editable={!locked} multiline onChangeText={(v) => setValues({ ...values, [f.key]: v })} testID={`ws-${f.key}`} style={locked ? { opacity: 0.75 } : undefined} />
        ))}
      </Card>
      {locked ? (
        <Button label="Reopen and edit" icon="edit-2" kind="secondary" style={{ marginTop: 16 }} onPress={() => entry && reopenWorksheet(entry.id)} testID="ws-reopen" />
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="Save draft" icon="save" kind="secondary" disabled={!filled} onPress={() => doSave(false)} style={{ flex: 1 }} testID="ws-draft" />
          <Button label="Submit" icon="send" disabled={!filled} onPress={() => doSave(true)} style={{ flex: 1 }} color={color} testID="ws-submit" />
        </View>
      )}
      {msg ? (
        <T variant="small" color={c.ok} style={{ marginTop: 8 }} testID="ws-msg">
          {msg}
        </T>
      ) : null}
      <T variant="caption" style={{ marginTop: 8 }}>
        A draft is private and can be changed freely. Submitting records the date and a receipt code; you can reopen it later, and the next submission gets a new receipt.
      </T>
      {entry ? <Receipt at={entry.submittedAt} code={entry.receipt} label={locked ? 'Submission receipt' : 'Last submission (now reopened)'} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Button label="Export" icon="share" kind="secondary" disabled={!filled} onPress={() => shareText(`Worksheet ${def.number}`, sheetText(), `coressence-worksheet-${def.number}.txt`)} style={{ flex: 1 }} testID="ws-export" />
        {entry ? (
          <Button
            label="Delete copy"
            icon="trash-2"
            kind="ghost"
            onPress={() => {
              deleteWorksheet(entry.id);
              pick(null);
            }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
      <T variant="caption" style={{ marginTop: 14 }}>
        From the book: {def.src.label} ({def.src.file}). Keep private clinical details in an appropriate clinical channel.
      </T>
    </Screen>
  );
}

// ------------------------------------------------------------------ weekly homework
export function HomeworkScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const h = homeworkDef(String(id));
  const edu = useEdu();
  const plan = usePlan();
  const { ents, preview } = useEntitlements();
  const color = moduleColor(c, 'education');
  const entry = h ? edu.homework?.[h.key] : undefined;
  const [values, setValues] = useState<Record<string, string>>(entry?.values ?? {});
  if (!h)
    return (
      <Screen title="Homework">
        <T>Homework not found.</T>
      </Screen>
    );
  const open = isOpenInRelease(h.key, h.course, ents, preview) && h.modules.every((m) => isOpenInRelease(m, h.course, ents, preview));
  if (!open)
    return (
      <Screen title={`Week ${h.week} homework`}>
        <Card>
          <T variant="body">{PURCHASES_LIVE ? `Homework is part of Coressence+ and the ${COURSE_TITLE[h.course]} course track.` : 'This part of the course is not in this version.'}</T>
          {PURCHASES_LIVE ? <Button label="See Coressence+" icon="star" style={{ marginTop: 12 }} onPress={() => router.replace({ pathname: '/plus', params: { reason: 'lessons' } })} /> : null}
        </Card>
      </Screen>
    );
  const checklist = homeworkChecklist(edu, h, plan.versions.length > 0);
  const ready = checklist.filter((x) => x.done).length;
  const brief = homeworkBrief(edu, h);
  const locked = entry?.status === 'submitted';
  const allDone = checklist.every((x) => x.done);

  return (
    <Screen title={`Week ${h.week} homework`} subtitle={`${h.title.replace(/^Week \d+: /, '')} · ${COURSE_TITLE[h.course]}`} color={color} accentBar testID="homework">
      <Card tint={c.accentSoft}>
        <T variant="label" color={color}>
          What you hand in
        </T>
        <T variant="body" style={{ marginTop: 4 }}>
          {h.output}
        </T>
      </Card>
      {h.instructions.map((p) => (
        <T key={p} variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
          {p}
        </T>
      ))}
      <SectionTitle>{`Outputs (${ready} of ${checklist.length})`}</SectionTitle>
      {checklist.map((x) => (
        <Card key={x.label} style={{ marginBottom: 8 }} onPress={x.route ? () => router.push(x.route as never) : undefined}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Feather name={x.done ? 'check-circle' : 'circle'} size={18} color={x.done ? c.ok : c.muted} />
            <T variant="body" style={{ flex: 1 }}>
              {x.label}
            </T>
            <Feather name="chevron-right" size={16} color={c.muted} />
          </View>
        </Card>
      ))}
      <SectionTitle>Your brief</SectionTitle>
      <Card>
        <T variant="small" testID="homework-brief">
          {brief || 'Your saved module decisions will appear here.'}
        </T>
      </Card>
      <SectionTitle>{`Week ${h.week} review notes`}</SectionTitle>
      <Card>
        {h.fields.map((f) => (
          <Field key={f.key} label={f.label} value={values[f.key] ?? ''} editable={!locked} multiline onChangeText={(v) => setValues({ ...values, [f.key]: v })} testID={`hw-${f.key}`} />
        ))}
      </Card>
      {!allDone && !locked ? <Note tone="warn" text="Some outputs are not finished yet. You can save a draft now and submit when they are ready, or submit what you have." /> : null}
      {locked ? (
        <Button label="Reopen and edit" icon="edit-2" kind="secondary" style={{ marginTop: 16 }} onPress={() => reopenHomework(h.key)} testID="hw-reopen" />
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="Save draft" icon="save" kind="secondary" onPress={() => saveHomework(h.key, values, brief, false)} style={{ flex: 1 }} testID="hw-draft" />
          <Button label="Submit week" icon="send" disabled={!brief && !Object.values(values).some((v) => v.trim())} onPress={() => saveHomework(h.key, values, brief, true)} style={{ flex: 1 }} color={color} testID="hw-submit" />
        </View>
      )}
      {entry ? <Receipt at={entry.submittedAt} code={entry.receipt} label={locked ? 'Homework receipt' : 'Last submission (now reopened)'} /> : null}
      <Button
        label="Export brief as text"
        icon="share"
        kind="secondary"
        style={{ marginTop: 12 }}
        onPress={() => shareText(`Week ${h.week} homework`, [brief, '', ...h.fields.filter((f) => values[f.key]?.trim()).map((f) => `${f.label}:\n${values[f.key].trim()}`)].join('\n'), `coressence-week-${h.week}.txt`)}
      />
      <FaithCard faith={h.faith} />
      <T variant="caption" style={{ marginTop: 14 }}>
        Completion recognizes a demonstrated planning process, not a clinical certification or proof that a health goal has been achieved.
      </T>
    </Screen>
  );
}
