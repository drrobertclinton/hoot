// Instrument picker, course path maps (instruments and theory) and the flashcard review.
import { INSTRUMENTS, THEORY, byId } from '../content/instruments.js';
import { COURSES, lessonsOf } from '../content/courses.js';
import { state, update, lessonRec, cards } from '../state.js';
import { queue, isMastered } from '../core/srs.js';
import { runDrill, DRILL_TITLES } from '../drills.js';
import { hasPro, paywall, FREE } from '../gates.js';
import { icon, instIcon } from '../icons.js';
import { esc } from '../util.js';
import { addPractice } from '../state.js';

export function nextUp(instId) {
  const all = lessonsOf(instId); return all.find((l) => !lessonRec(l.id)?.done) || all[all.length - 1];
}
export function courseProgress(instId) {
  const all = lessonsOf(instId); const done = all.filter((l) => lessonRec(l.id)?.done).length;
  return { done, total: all.length, pct: all.length ? Math.round(100 * done / all.length) : 0 };
}

export function instrumentsView(root) {
  const cur = state().profile.instrument;
  root.innerHTML = `<div class="page"><header class="page-head"><h1>Choose an instrument</h1><p class="lead">Switch any time. Your progress on each instrument is kept.</p></header>
  <div class="inst-grid">${[...INSTRUMENTS, THEORY].map((i) => { const p = courseProgress(i.id); return `
    <button class="inst-card${i.id === cur ? ' cur' : ''}" data-i="${i.id}" style="--ic:${i.color}"><span class="inst-art">${instIcon(i.id)}</span>
      <span class="inst-txt"><b>${esc(i.name)}</b><small>${esc(i.blurb)}</small><span class="mini-prog"><i style="width:${p.pct}%"></i></span><em>${p.total} lessons${p.done ? ` · ${p.done} done` : ''}</em></span></button>`; }).join('')}</div></div>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const id = b.dataset.i;
    if (id !== 'theory') update((S) => { S.profile.instrument = id; });
    location.hash = id === 'theory' ? '#/theory' : '#/learn';
  });
}

export function courseView(root, instId) {
  const inst = byId(instId); if (!inst) { location.hash = '#/instruments'; return; }
  const units = COURSES[instId]; const p = courseProgress(instId); const nx = nextUp(instId);
  const pro = hasPro();
  root.innerHTML = `<div class="page course" style="--ic:${inst.color}">
    <header class="course-hero"><span class="inst-art lg">${instIcon(instId)}</span><div><p class="eyebrow">${instId === 'theory' ? 'Course' : 'Instrument course'}</p><h1>${esc(inst.name)}</h1><p class="muted">${esc(inst.blurb)}</p>
      <div class="hero-prog"><div class="mini-prog lg"><i style="width:${p.pct}%"></i></div><span>${p.done} of ${p.total} lessons</span></div></div>
      ${instId !== 'theory' ? '<a class="btn ghost sm switch" href="#/instruments">Switch</a>' : ''}</header>
    ${nx ? `<a class="continue-card" href="#/lesson/${nx.id}"><span class="cc-ic">${icon('play')}</span><span><small>${lessonRec(nx.id)?.done ? 'Practice again' : 'Up next'}</small><b>${esc(nx.title)}</b><em>${esc(nx.sub)}</em></span></a>` : ''}
    ${instId === 'theory' ? `<div class="theory-tools"><a class="tool-tile" href="#/review">${icon('cards')}<span><b>Review</b><small>${dueCount()} cards due</small></span></a><a class="tool-tile" href="#/ear">${icon('ear')}<span><b>Ear gym</b><small>Quick drills</small></span></a></div>` : ''}
    ${units.map((u, ui) => `<section class="unit"><div class="unit-head"><span class="unit-n">${ui + 1}</span><h2>${esc(u.title)}</h2>${ui === 0 || (instId === 'theory' && ui === 1) ? '<span class="free-pill">Free</span>' : pro ? '' : paywall.badgeHTML('Pro')}</div>
      <ol class="path">${u.lessons.map((l, li) => { const r = lessonRec(l.id); const locked = !l.free && !pro; const isNext = nx && nx.id === l.id;
        return `<li class="node${r?.done ? ' done' : ''}${isNext ? ' next' : ''}${locked ? ' locked' : ''}" style="--x:${[0, 1, 2, 1][li % 4]}"><a href="#/lesson/${l.id}"><span class="bubble">${r?.done ? icon('check') : locked ? icon('lock') : `<b>${li + 1}</b>`}</span><span class="ntxt"><b>${esc(l.title)}</b><small>${esc(l.sub)}</small>${r?.done ? `<span class="stars sm">${[1, 2, 3].map((k) => `<span class="${k <= r.stars ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>` : `<em>${l.xp} XP</em>`}</span></a></li>`; }).join('')}</ol></section>`).join('')}
  </div>`;
}
export const dueCount = () => queue(cards(), { newMax: 0, max: 999 }).length;

export function reviewView(root) {
  const due = queue(cards(), { max: hasPro() ? 30 : FREE.reviewPerDay, newMax: 0 });
  const total = cards().length; const mastered = cards().filter(isMastered).length;
  if (!due.length) {
    root.innerHTML = `<div class="page narrow"><a class="back" href="#/theory">${icon('back')}<span>Theory</span></a><header class="page-head"><h1>Review</h1></header>
      <div class="empty"><span class="empty-ic">${icon('cards')}</span><h2>${total ? 'All caught up' : 'No cards yet'}</h2><p class="muted">${total ? `You have ${total} cards, ${mastered} mastered. New reviews appear as cards come due.` : 'Cards are added as you answer theory and ear questions. Each one comes back just before you would forget it.'}</p><a class="btn primary" href="#/theory">Go to the theory course</a></div></div>`;
    return;
  }
  root.innerHTML = `<div class="page narrow"><a class="back" href="#/theory">${icon('back')}<span>Theory</span></a><header class="page-head"><h1>Review</h1><p class="muted">${due.length} due · ${mastered} of ${total} mastered</p></header><div data-r="d"></div></div>`;
  const t0 = performance.now();
  const h = runDrill(root.querySelector('[data-r="d"]'), { kind: 'mixed' }, { title: 'Spaced review', questions: due.map((c) => ({ kind: c.kind, p: c.p, item: c.item })), onDone: (r) => {
    addPractice({ inst: 'theory', kind: 'review', title: `Review (${due.length} cards)`, secs: (performance.now() - t0) / 1000, xp: due.length * 2, score: r.accuracy });
    root.querySelector('[data-r="d"]').innerHTML = `<div class="complete"><h2>Review done</h2><p class="lead">${r.accuracy}% correct · +${due.length * 2} XP</p><a class="btn primary" href="#/theory">Back to theory</a></div>`;
  } });
  return () => h.destroy();
}

const EAR = [
  { kind: 'higherLower', title: 'Higher or lower' }, { kind: 'intervalEar', title: 'Intervals', pool: [2, 3, 4, 5, 7, 9, 12] }, { kind: 'chordEar', title: 'Major or minor', pool: ['maj', 'min'] },
  { kind: 'chordEar', title: 'Seventh chords', pool: ['maj7', 'dom7', 'min7'], pro: true }, { kind: 'scaleQualityEar', title: 'Scales', pro: true }, { kind: 'cadenceEar', title: 'Cadences', pro: true },
  { kind: 'dictation', title: 'Melodic dictation', len: 4, pool: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], pro: true }, { kind: 'rhythmEcho', title: 'Rhythm echo', pro: true },
];
export function earView(root, which) {
  if (which != null) {
    const d = EAR[Number(which)]; if (!d) { location.hash = '#/ear'; return; }
    if (d.pro && !hasPro()) { root.innerHTML = `<div class="page narrow"><a class="back" href="#/ear">${icon('back')}<span>Ear gym</span></a>${paywall.lockHTML({ title: d.title, text: 'This ear drill is part of Pro.', focus: 'pro' })}</div>`; return; }
    root.innerHTML = `<div class="page narrow"><a class="back" href="#/ear">${icon('back')}<span>Ear gym</span></a><div data-r="d"></div></div>`;
    const t0 = performance.now();
    const h = runDrill(root.querySelector('[data-r="d"]'), { ...d, count: 10 }, { onDone: (r) => { addPractice({ inst: 'theory', kind: 'drill', title: `Ear gym: ${d.title}`, secs: (performance.now() - t0) / 1000, xp: 15, score: r.accuracy }); root.querySelector('[data-r="d"]').innerHTML = `<div class="complete"><h2>${r.accuracy}%</h2><p class="lead">${d.title}</p><div class="row"><a class="btn ghost" href="#/ear">More drills</a><a class="btn primary" href="#/ear/${which}?again=${Date.now()}">Again</a></div></div>`; } });
    return () => h.destroy();
  }
  root.innerHTML = `<div class="page"><a class="back" href="#/theory">${icon('back')}<span>Theory</span></a><header class="page-head"><h1>Ear gym</h1><p class="lead">Ten quick questions at a time. Headphones help.</p></header>
    <div class="tile-grid">${EAR.map((d, i) => `<a class="tool-tile" href="#/ear/${i}">${icon('ear')}<span><b>${esc(d.title)}</b><small>${d.pro && !hasPro() ? 'Pro' : '10 questions'}</small></span></a>`).join('')}</div></div>`;
}
