// First run: welcome, pick an instrument, experience, daily goal.
import { INSTRUMENTS } from '../content/instruments.js';
import { state, update } from '../state.js';
import { icon, instIcon } from '../icons.js';
import { esc } from '../util.js';
import { audio, note } from '../audio/engine.js';

export function onboardingView(root) {
  let step = 0; const pick = { instrument: state().profile.instrument || 'piano', level: 'new', goal: 15 };
  const draw = () => {
    const dots = `<div class="ob-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
    if (step === 0) root.innerHTML = `<div class="ob ob-hero"><div class="ob-art" aria-hidden="true">${['piano', 'guitar', 'violin', 'trumpet', 'altosax', 'voice', 'harp', 'cello'].map((i, k) => `<span style="--k:${k}">${instIcon(i)}</span>`).join('')}</div>
      <h1>Learn music by playing it.</h1><p class="lead">Lessons for piano, guitar, strings, winds, harp and voice, plus a complete theory course. The app listens as you play and tells you how you did.</p>
      ${dots}<button class="btn primary xl" data-a="next">Get started</button><p class="muted small">No account needed. Your progress stays on this device.</p></div>`;
    if (step === 1) root.innerHTML = `<div class="ob"><h1>What do you want to play?</h1><p class="lead">You can add more instruments later.</p>
      <div class="inst-grid compact">${INSTRUMENTS.map((i) => `<button class="inst-card sm${pick.instrument === i.id ? ' cur' : ''}" data-i="${i.id}" style="--ic:${i.color}" aria-pressed="${pick.instrument === i.id}"><span class="inst-art">${instIcon(i.id)}</span><b>${esc(i.short)}</b></button>`).join('')}</div>${dots}<button class="btn primary xl" data-a="next">Continue</button></div>`;
    if (step === 2) root.innerHTML = `<div class="ob"><h1>How much have you played?</h1>
      <div class="choice-list">${[['new', 'Brand new', 'Start from the very first steps.'], ['some', 'A little', 'I know a few notes or chords.'], ['back', 'Coming back', 'I played before and want to restart.'], ['lots', 'Quite a lot', 'I mostly want theory, ear training and songs.']].map(([v, t, d]) => `<button class="choice${pick.level === v ? ' on' : ''}" data-l="${v}" aria-pressed="${pick.level === v}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>${dots}<button class="btn primary xl" data-a="next">Continue</button></div>`;
    if (step === 3) root.innerHTML = `<div class="ob"><h1>Set a daily goal</h1><p class="lead">A little every day builds skill fastest.</p>
      <div class="choice-list">${[[5, 'Casual'], [10, 'Regular'], [15, 'Serious'], [30, 'Intense']].map(([m, t]) => `<button class="choice row${pick.goal === m ? ' on' : ''}" data-g="${m}" aria-pressed="${pick.goal === m}"><b>${m} minutes a day</b><small>${t}</small></button>`).join('')}</div>
      <div class="ob-tip">${icon('headphones')}<p>When a lesson asks to listen, allow the microphone. Wired headphones help the app hear you clearly over the backing band. Where your device supports it, piano players can also connect a MIDI keyboard.</p></div>${dots}<button class="btn primary xl" data-a="finish">Start my first lesson</button></div>`;
  };
  draw();
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.i) { pick.instrument = b.dataset.i; try { note(60, audio().currentTime + 0.02, 0.3, 'bell', null, 0.4); } catch { /* sound optional */ } draw(); }
    if (b.dataset.l) { pick.level = b.dataset.l; draw(); }
    if (b.dataset.g) { pick.goal = Number(b.dataset.g); draw(); }
    if (b.dataset.a === 'next') { step++; draw(); window.scrollTo(0, 0); }
    if (b.dataset.a === 'finish') {
      update((S) => { S.onboarded = true; S.profile.instrument = pick.instrument; S.profile.level = pick.level; S.profile.goal = pick.goal; S.plan.mins = pick.goal; });
      location.hash = pick.level === 'lots' ? '#/theory' : '#/learn';
    }
  });
}
