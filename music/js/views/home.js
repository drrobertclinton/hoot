// Today: greeting, streak, daily goal, continue card, today's plan and quick tools.
import { byId } from '../content/instruments.js';
import { state, levelOf, levelTitle, streakAlive, minutesToday, lessonRec, dayKey } from '../state.js';
import { nextUp, courseProgress, dueCount } from './learn.js';
import { SONGS } from '../content/songs.js';
import { hasPro } from '../gates.js';
import { icon, instIcon } from '../icons.js';
import { esc } from '../util.js';

export function homeView(root) {
  const S = state(); const inst = byId(S.profile.instrument) || byId('piano');
  const L = levelOf(); const streak = streakAlive(); const mins = minutesToday(); const goal = S.profile.goal || 15;
  const pct = Math.min(1, mins / goal); const nx = nextUp(inst.id); const cp = courseProgress(inst.id);
  const tnx = nextUp('theory'); const due = dueCount();
  const hr = new Date().getHours(); const hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const planDay = S.plan.days.includes(new Date().getDay());
  const song = SONGS.find((s) => (s.free || hasPro()) && !(S.songs[s.id]?.best >= 3)) || SONGS[0];
  const week = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = dayKey(d); const m = (S.days[k] || {}).mins || 0; return { k, m, lab: d.toLocaleDateString(undefined, { weekday: 'narrow' }), today: i === 6 }; });
  root.innerHTML = `<div class="page home">
    <header class="home-head"><div><p class="eyebrow">${hello}${S.profile.name ? ', ' + esc(S.profile.name) : ''}</p><h1>Let's make music.</h1></div>
      <a class="lvl-badge" href="#/me" aria-label="Level ${L.level}"><span class="lb-n">${L.level}</span><span class="lb-t"><b>${levelTitle(L.level)}</b><small>${L.into} / ${L.need} XP</small><span class="mini-prog"><i style="width:${L.pct}%"></i></span></span></a></header>
    <section class="stat-row">
      <div class="stat streak${streak ? ' on' : ''}"><span class="st-ic">${icon('flame')}</span><b>${streak}</b><small>day streak</small></div>
      <div class="stat goal"><svg viewBox="0 0 44 44" class="ring"><circle cx="22" cy="22" r="18" class="bg"/><circle cx="22" cy="22" r="18" class="fg" style="stroke-dasharray:${(pct * 113.1).toFixed(1)} 113.1"/></svg><b>${Math.round(mins)}<small>/${goal}</small></b><small>minutes today</small></div>
      <div class="stat xp"><span class="st-ic">${icon('bolt')}</span><b>${S.xp}</b><small>total XP</small></div>
    </section>
    <a class="hero-card" href="#/lesson/${nx.id}" style="--ic:${inst.color}"><span class="inst-art">${instIcon(inst.id)}</span>
      <span class="hc-txt"><small>${esc(inst.name)} · ${cp.done}/${cp.total} lessons</small><b>${esc(nx.title)}</b><em>${esc(nx.sub)}</em><span class="mini-prog"><i style="width:${cp.pct}%"></i></span></span><span class="hc-go">${icon('play')}</span></a>
    <section class="sect"><div class="sect-head"><h2>${planDay ? "Today's plan" : 'Bonus practice'}</h2><a class="link" href="#/plan">Edit plan</a></div>
      <ol class="todo">
        <li><a href="#/tools/metronome"><span class="ti">${icon('metronome')}</span><span><b>Warm up</b><small>${inst.family === 'winds' || inst.family === 'voice' ? 'Long tones and a slow scale' : inst.family === 'strings' ? 'Open strings and a slow scale' : 'Five-finger patterns, slowly'} with the metronome</small></span></a></li>
        <li class="${lessonRec(nx.id)?.done ? 'done' : ''}"><a href="#/lesson/${nx.id}"><span class="ti">${icon('learn')}</span><span><b>${esc(nx.title)}</b><small>Your next ${esc(inst.short.toLowerCase())} lesson</small></span></a></li>
        <li><a href="#/song/${song.id}"><span class="ti">${icon('songs')}</span><span><b>${esc(song.title)}</b><small>Play along with the band</small></span></a></li>
        <li><a href="${due ? '#/review' : `#/lesson/${tnx.id}`}"><span class="ti">${icon(due ? 'cards' : 'theory')}</span><span><b>${due ? `Review ${due} card${due === 1 ? '' : 's'}` : esc(tnx.title)}</b><small>${due ? 'Spaced repetition keeps theory fresh' : 'Music theory'}</small></span></a></li>
      </ol></section>
    <section class="sect"><div class="sect-head"><h2>This week</h2><a class="link" href="#/log">Practice log</a></div>
      <div class="week">${week.map((d) => `<div class="wd${d.today ? ' today' : ''}"><span class="wbar"><i style="height:${Math.min(100, (d.m / goal) * 100)}%"></i></span><small>${d.lab}</small></div>`).join('')}</div></section>
    <section class="sect"><div class="sect-head"><h2>Quick tools</h2></div>
      <div class="tile-grid quick"><a class="tool-tile" href="#/tools/tuner">${icon('tuner')}<span><b>Tuner</b></span></a><a class="tool-tile" href="#/tools/metronome">${icon('metronome')}<span><b>Metronome</b></span></a><a class="tool-tile" href="#/ear">${icon('ear')}<span><b>Ear gym</b></span></a><a class="tool-tile" href="#/instruments">${icon('sliders')}<span><b>Instruments</b></span></a></div></section>
  </div>`;
}
