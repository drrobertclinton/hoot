/// <reference types="node" />
// Course content pipeline (book Markdown -> generated JSON -> modules) and the module, worksheet and homework flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BOOKS, COURSE_MODULES, PERFORM_LABS, courseSequence, homework, worksheets, worksheetDef } from '../src/modules/education/course/modules';
import { ALL_LESSONS, lesson, lessonsForTrack, nextInSequence } from '../src/modules/education/catalog';
import { EMPTY, courseOutputs, homeworkBrief, homeworkChecklist, planExportText, planPrefill, receiptCode, reopenSheet, saveSheet, sheetCopies, submitHomework, type EduSlice } from '../src/modules/education/model';
import { canOpenLesson } from '../src/core/billing/entitlements';
import * as cfg from '../src/core/billing/config';

const BOOK_DIR = path.resolve(__dirname, '..', '..', '..', '..', '01 Participant Books');

test('generated course files are current with the books (re-run scripts/extract-course.js after a book edit)', { skip: !fs.existsSync(BOOK_DIR) && 'participant books not on this machine' }, () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'course-'));
  const script = path.resolve(__dirname, '..', 'scripts', 'extract-course.js');
  // Run the extractor against a copy of the app layout so the committed files are not touched.
  const fake = path.join(tmp, 'app');
  fs.mkdirSync(path.join(fake, 'scripts'), { recursive: true });
  fs.copyFileSync(script, path.join(fake, 'scripts', 'extract-course.js'));
  execFileSync(process.execPath, [path.join(fake, 'scripts', 'extract-course.js'), BOOK_DIR], { stdio: 'pipe' });
  for (const t of ['live', 'perform']) {
    const strip = (s: string) => s.replace(/"generatedAt": "[^"]*",?/, '');
    const fresh = fs.readFileSync(path.join(fake, 'src', 'modules', 'education', 'course', `${t}.generated.json`), 'utf8');
    const committed = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'modules', 'education', 'course', `${t}.generated.json`), 'utf8');
    assert.equal(strip(fresh), strip(committed), `${t}.generated.json is out of date`);
  }
});

test('extracted books: 12 topics, 4 weeks, worksheets 1-10, knowledge check, and source headings', () => {
  for (const b of Object.values(BOOKS)) {
    assert.equal(b.topics.length, 12, b.title);
    assert.equal(b.weeks.length, 4);
    assert.deepEqual(b.worksheets.map((w) => w.number).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(b.knowledgeCheck.length, 8);
    for (const t of b.topics) {
      assert.match(t.src.heading, new RegExp(`^Topic ${t.number} — `));
      assert.ok(t.src.line > 0 && t.reading.length >= 2 && t.example && t.example.body.length, `topic ${t.number}`);
      assert.match(t.example!.body.join(' '), /fictional/i, `topic ${t.number} example is marked fictional`);
    }
    assert.ok(b.disclaimer && /not a diagnosis/.test(b.disclaimer.body[0]));
    // Faith text is kept apart so the app can hide it.
    assert.ok(b.disclaimer!.faith.length === 1 && !b.disclaimer!.body.some((p) => /Biblical/.test(p)));
    assert.ok(b.weeks.every((w) => w.faith && w.faith.ref && w.homework.length));
  }
  assert.equal(BOOKS.live.labs.length, 0);
  assert.equal(BOOKS.perform.labs.length, 4);
  assert.ok(BOOKS.perform.disclaimer!.body.some((p) => /not a vocal coach/.test(p)));
  // Lab 4's embedded Faith & Reflection is split out of the lab text.
  assert.equal(PERFORM_LABS[3].faith?.ref, 'Proverbs 16:3');
  assert.doesNotMatch(PERFORM_LABS[3].sections[0].body, /Faith & Reflection|Proverbs/);
  assert.ok(PERFORM_LABS[0].authorNote?.length);
});

test('24 modules plus 4 labs, each with the full module pattern', () => {
  assert.equal(COURSE_MODULES.live.length, 12);
  assert.equal(COURSE_MODULES.perform.length, 12);
  assert.equal(PERFORM_LABS.length, 4);
  for (const m of [...COURSE_MODULES.live, ...COURSE_MODULES.perform]) {
    assert.ok(m.purpose && m.output && m.sections.length >= 2, m.id);
    assert.ok(m.example.body.length > 50, m.id);
    assert.ok(m.check && m.check.options.length === 4 && m.check.correct >= 0 && m.check.correct < 4, m.id);
    assert.ok(m.check!.question.length > 10 && m.check!.explanation.length > 20 && m.check!.from, m.id);
    assert.ok(m.apply.fields.some((f) => f.required) && m.apply.fields.some((f) => f.reflection), m.id);
    assert.ok(m.next && m.worksheets?.length && m.bookRefs?.some((r) => /^Part Two, Week/.test(r.label)), m.id);
    assert.ok(m.bookRefs!.some((r) => /^Part One, Chapter/.test(r.label)), `${m.id} links a reference chapter`);
    assert.ok(m.bookRefs!.every((r) => r.line > 0 && r.file.endsWith('.md')), m.id);
  }
  // Same text where the books agree; Perform keeps its own book reference and examples.
  assert.equal(COURSE_MODULES.live[0].sections[0].body, COURSE_MODULES.perform[0].sections[0].body);
  assert.match(COURSE_MODULES.perform[3].extraExample!.title, /performer/);
  assert.match(COURSE_MODULES.live[3].extraExample!.title, /busy adult/);
  assert.match(COURSE_MODULES.perform[10].extraExample!.body, /coach/);
  assert.notEqual(COURSE_MODULES.live[2].check!.question, COURSE_MODULES.perform[2].check!.question);
  // Faith & Reflection rides on the last module of each week only.
  assert.deepEqual(COURSE_MODULES.live.filter((m) => m.faith).map((m) => m.number), [3, 6, 9, 12]);
  // Book disclaimer wording survives; no invented promises.
  const all = JSON.stringify([COURSE_MODULES, PERFORM_LABS]);
  assert.doesNotMatch(all, /\bcure[sd]?\b|guarantee/i);
  for (const l of PERFORM_LABS) {
    assert.equal(l.check, undefined);
    assert.equal(l.apply.fields[0].key, 'labMode');
    assert.ok(l.apply.fields[0].options!.some((o) => /Observation only/.test(o.label)));
    assert.match(l.apply.note!, /does not record, upload or share/);
  }
});

test('sequence: performer labs follow each week of three modules; next-in-sequence and catalog', () => {
  const p = courseSequence('perform').map((l) => l.id);
  assert.deepEqual(p.slice(0, 5), ['perform-m1', 'perform-m2', 'perform-m3', 'perform-lab1', 'perform-m4']);
  assert.equal(p.length, 16);
  assert.equal(courseSequence('live').length, 12);
  assert.equal(nextInSequence('perform-m3')?.id, 'perform-lab1');
  assert.equal(nextInSequence('perform-lab1')?.id, 'perform-m4');
  assert.equal(nextInSequence('live-m12'), undefined);
  assert.equal(nextInSequence('l1')?.id, 'l2');
  assert.equal(new Set(ALL_LESSONS.map((l) => l.id)).size, ALL_LESSONS.length);
  assert.equal(lessonsForTrack('live')[0].id, 'live-m1');
  assert.ok(lessonsForTrack('both').some((l) => l.id === 'perform-lab4') && lessonsForTrack('both').some((l) => l.id === 'l8'));
  assert.ok(!lessonsForTrack('live').some((l) => l.course === 'perform'));
});

test('gating: Module 1 and Worksheet 1 free; course tracks open their own course; All-Access opens both', () => {
  const none = new Set<string>();
  assert.equal(canOpenLesson('live-m1', 'live', none), true);
  assert.equal(canOpenLesson('perform-m1', 'perform', none), true);
  assert.equal(canOpenLesson('live-ws1', 'live', none), true);
  assert.equal(canOpenLesson('live-m2', 'live', none), false);
  assert.equal(canOpenLesson('live-ws4', 'live', none), false);
  assert.equal(canOpenLesson('perform-lab1', 'perform', none), false);
  assert.equal(canOpenLesson('live-m2', 'live', new Set([cfg.ENT_COURSE_LIVE])), true);
  assert.equal(canOpenLesson('perform-m2', 'perform', new Set([cfg.ENT_COURSE_LIVE])), false);
  assert.equal(canOpenLesson('perform-lab2', 'perform', new Set([cfg.ENT_COURSE_PERFORM])), true);
  assert.equal(canOpenLesson('perform-hw3', 'perform', new Set([cfg.ENT_ALL_ACCESS])), true);
  assert.equal(cfg.REVENUECAT_IOS_KEY, 'REVENUECAT_IOS_KEY');
});

test('module decisions feed the plan builder; the latest saved decision wins', () => {
  const s: EduSlice = {
    ...EMPTY,
    progress: {
      'live-m1': { checkPassed: true, completed: '2026-11-01', answers: { outcome: 'Weekend walks', why: 'Family', action: 'Two sessions', constraint: 'Caregiving' } },
      'live-m2': { checkPassed: true, completed: '2026-11-02', answers: { dashboard: 'sleepH,energy', observeDays: '7' } },
      'live-m6': { checkPassed: true, completed: '2026-11-09', answers: { minimum: 'One short session', ruleIf: 'the opening disappears', ruleThen: 'use the shorter version' } },
      'live-m11': { checkPassed: true, completed: '2026-11-23', answers: { outcome: 'Two sessions most weeks', ruleIf: 'sessions stay comfortable', ruleThen: 'add walking time' } },
    },
  };
  const pre = planPrefill(s);
  assert.equal(pre.outcome, 'Two sessions most weeks');
  assert.equal(pre.why, 'Family');
  assert.equal(pre.minimum, 'One short session');
  assert.equal(pre.ruleThen, 'add walking time');
  assert.equal(pre.dashboard, 'sleepH,energy');
  const since = planPrefill(s, '2026-11-10');
  assert.deepEqual(Object.keys(since).sort(), ['outcome', 'ruleIf', 'ruleThen']);
});

test('worksheets: draft vs submit with a dated receipt, reopen keeps the last receipt, copies', () => {
  const def = worksheetDef('live-ws1')!;
  assert.equal(def.fields[0].label, 'The activity or part of life I want to support');
  assert.equal(worksheetDef('perform-ws3')!.fields.length, 7 + 4);
  assert.equal(worksheets('perform').length, 10);
  let s = saveSheet(EMPTY, { id: 'a', sheet: 'live-ws1', values: { f1: 'Walking with family' } }, '2026-11-02T10:00:00.000Z', false);
  assert.equal(s.sheets![0].status, 'draft');
  assert.equal(s.sheets![0].receipt, null);
  // Submitting an empty sheet does nothing.
  assert.equal(saveSheet(EMPTY, { id: 'b', sheet: 'live-ws1', values: { f1: '  ' } }, '2026-11-02T10:00:00.000Z', true).sheets!.length, 0);
  s = saveSheet(s, { id: 'a', sheet: 'live-ws1', values: { f1: 'Walking with family' } }, '2026-11-02T10:05:00.000Z', true);
  const r = s.sheets![0];
  assert.equal(r.status, 'submitted');
  assert.equal(r.submittedAt, '2026-11-02T10:05:00.000Z');
  assert.match(r.receipt!, /^CL-L01-20261102-[0-9A-F]{4}$/);
  assert.equal(r.created, '2026-11-02T10:00:00.000Z');
  s = reopenSheet(s, 'a', '2026-11-03T09:00:00.000Z');
  assert.equal(s.sheets![0].status, 'draft');
  assert.equal(s.sheets![0].receipt, r.receipt);
  s = saveSheet(s, { id: 'a', sheet: 'live-ws1', values: { f1: 'Walking and hiking' } }, '2026-11-03T09:10:00.000Z', true);
  assert.notEqual(s.sheets![0].receipt, r.receipt);
  s = saveSheet(s, { id: 'c', sheet: 'live-ws1', values: { f1: 'Second copy' } }, '2026-11-04T09:00:00.000Z', false);
  assert.equal(sheetCopies(s, 'live-ws1').length, 2);
  assert.equal(sheetCopies(s, 'live-ws1')[0].id, 'c');
  assert.match(receiptCode('perform-hw2', '2026-11-09T18:00:00.000Z'), /^CL-PH02-20261109-/);
});

test('homework: checklist, brief from saved decisions, submit with receipt; outputs count work, not streaks', () => {
  const h = homework('perform')[0];
  assert.deepEqual(h.modules, ['perform-m1', 'perform-m2', 'perform-m3', 'perform-lab1']);
  assert.equal(homework('live')[0].modules.length, 3);
  assert.ok(h.instructions.some((p) => /baseline brief/.test(p)));
  let s: EduSlice = { ...EMPTY, progress: { 'perform-m1': { checkPassed: true, completed: '2026-11-02', answers: { outcome: 'Sustain the run', action: 'Warmup before call' } }, 'perform-lab1': { checkPassed: false, completed: '2026-11-04', answers: { labMode: 'observation', labDemands: 'Teaching and rehearsals' } } } };
  s = saveSheet(s, { id: 'w1', sheet: 'perform-ws1', values: { f1: 'Singing' } }, '2026-11-02T10:00:00.000Z', true);
  const list = homeworkChecklist(s, h, false);
  assert.deepEqual(list.map((x) => x.done), [true, false, false, true, true, false]);
  const brief = homeworkBrief(s, h);
  assert.match(brief, /Module 1: Purpose/);
  assert.match(brief, /My primary outcome for this cycle: Sustain the run/);
  assert.match(brief, /How I am taking part: Observation only/);
  s = submitHomework(s, h.key, { r1: 'Learned to keep it small' }, brief, '2026-11-08T19:00:00.000Z', true);
  assert.match(s.homework![h.key].receipt!, /^CL-PH01-20261108-/);
  const out = courseOutputs(s, 'perform', courseSequence('perform').map((l) => l.id));
  assert.deepEqual(out, { done: 2 + 1 + 1, total: 16 + 10 + 4 });
});

test('plan export text includes the dated plan, Worksheet 10 and the saved decisions', () => {
  let s: EduSlice = { ...EMPTY, progress: { 'live-m6': { checkPassed: true, completed: '2026-11-09', answers: { minimum: 'One short session', ruleIf: 'x', ruleThen: 'y' } } } };
  s = saveSheet(s, { id: 'z', sheet: 'live-ws10', values: { f1: '16 Nov to 15 Dec' } }, '2026-11-23T10:00:00.000Z', true);
  const plan = { created: '2026-11-23', start: '2026-11-23', outcome: 'Weekend walks', why: '', action: 'Two sessions', constraint: '', dashboard: ['sleepH'], observeDays: 14, minimum: 'One short session', ruleIf: 'tired', ruleThen: 'minimum plan', reviewDay: 0, reviewTime: '18:00', week: [[{ title: 'Strength', time: '07:00', kind: 'move' }], [], [], [], [], [], []] };
  const txt = planExportText(s, plan, ['live'], (k) => (k === 'sleepH' ? 'Hours of sleep' : k), '2026-11-23');
  assert.match(txt, /Plan version dated 2026-11-23/);
  assert.match(txt, /Monday: Strength at 07:00/);
  assert.match(txt, /Weekly review: Sunday at 18:00/);
  assert.match(txt, /Worksheet 10: Final 30-day plan \(submitted 2026-11-23, receipt CL-L10-/);
  assert.match(txt, /Plan dates: 16 Nov to 15 Dec/);
  assert.match(txt, /Module 6: Recovery \(saved 2026-11-09\)/);
  assert.match(planExportText(EMPTY, null, ['perform'], String, '2026-11-23'), /No plan saved yet/);
  assert.ok(lesson('live-m6')?.planBuilder);
});
