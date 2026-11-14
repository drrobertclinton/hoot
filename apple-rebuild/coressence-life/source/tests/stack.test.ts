import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EMPTY, byTime, listedTwice, monthsBetween, questions, summaryText, upsert, remove, markReviewed, type StackItem } from '../src/modules/stack/model';

const it = (o: Partial<StackItem>): StackItem => ({ id: o.name ?? 'x', name: 'X', kind: 'supplement', amount: '', times: [], why: '', by: '', started: null, paused: false, note: '', ...o });

test('stack: empty list asks nothing', () => {
  assert.deepEqual(questions(EMPTY, '2026-11-14'), []);
  assert.deepEqual(byTime(EMPTY), []);
});

test('stack: groups by time, unset last, paused left out', () => {
  let s = upsert(EMPTY, it({ id: 'a', name: 'Magnesium', times: ['bedtime'] }));
  s = upsert(s, it({ id: 'b', name: 'Vitamin D', times: ['morning'] }));
  s = upsert(s, it({ id: 'c', name: 'Fish oil' }));
  s = upsert(s, it({ id: 'd', name: 'Old thing', times: ['morning'], paused: true }));
  assert.deepEqual(byTime(s).map((g) => [g.key, g.items.map((i) => i.name)]), [['morning', ['Vitamin D']], ['bedtime', ['Magnesium']], ['unset', ['Fish oil']]]);
});

test('stack: listed twice ignores case and spacing', () => {
  let s = upsert(EMPTY, it({ id: 'a', name: 'Vitamin D' }));
  s = upsert(s, it({ id: 'b', name: ' vitamin  d ' }));
  s = upsert(s, it({ id: 'c', name: 'Zinc' }));
  assert.deepEqual(listedTwice(s), ['Vitamin D']);
  assert.ok(questions(s, '2026-11-14').some((q) => q.includes('more than once')));
});

test('stack: questions are questions, and review date matters', () => {
  let s = upsert(EMPTY, it({ id: 'a', name: 'Lisinopril', kind: 'medicine', why: 'blood pressure', by: 'Dr. A' }));
  s = upsert(s, it({ id: 'b', name: 'Ashwagandha', why: 'stress' }));
  const q = questions(s, '2026-11-14');
  assert.ok(q.every((x) => x.endsWith('?')));
  assert.ok(q.some((x) => x.includes('on my own')));
  assert.ok(q.some((x) => x.includes('review this whole list')));
  const r = markReviewed(s, '2026-11-14', 'Pharmacist');
  assert.ok(!questions(r, '2026-12-01').some((x) => x.includes('review')));
  assert.ok(questions(r, '2027-06-01').some((x) => x.includes('review it again')));
  assert.equal(monthsBetween('2026-11-14', '2027-05-13'), 5);
  assert.equal(monthsBetween('2026-11-14', '2027-05-14'), 6);
});

test('stack: summary lists by kind and never gives advice', () => {
  let s = upsert(EMPTY, it({ id: 'a', name: 'Lisinopril', kind: 'medicine', amount: '10 mg tablet', times: ['morning'], why: 'blood pressure' }));
  s = upsert(s, it({ id: 'b', name: 'Creatine', amount: '5 g', times: ['morning'] }));
  const t = summaryText(s, 'Sam', '2026-11-14');
  assert.ok(t.includes('MEDICINES') && t.includes('SUPPLEMENTS'));
  assert.ok(t.includes('- Lisinopril, 10 mg tablet (morning)'));
  assert.ok(!/should|avoid|do not take/i.test(t.replace(/Should any be spaced.*\?/, '')));
  assert.equal(remove(s, 'a').items.length, 1);
});
