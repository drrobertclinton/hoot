#!/usr/bin/env node
// Pulls the four-week course text out of the participant books so the app's course modules can be refreshed
// whenever the books change. No dependencies.
//
//   node scripts/extract-course.js [path/to/"01 Participant Books"]
//
// Default book folder: ../../../01 Participant Books (the layout on Robert's Mac:
// "Coressence Life/App/source/coressence" -> "Coressence Life/01 Participant Books").
// Writes src/modules/education/course/live.generated.json and perform.generated.json. Every extracted piece
// keeps the book heading and line it came from (`src`), so a module's text can be traced back to the book.
// Do not edit the generated files by hand; edit the book and run this again. Hand-written choices (knowledge
// check options, which plan field a decision fills, next actions) live in src/modules/education/course/modules.ts.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const booksDir = path.resolve(process.argv[2] || path.join(root, '..', '..', '..', '01 Participant Books'));
const outDir = path.join(root, 'src', 'modules', 'education', 'course');

const TRACKS = [
  { key: 'live', folder: 'Live', title: 'Live at Your Peak' },
  { key: 'perform', folder: 'Perform', title: 'Perform at Your Peak' },
];

/** Split a Markdown file into headings with their body lines. */
function sections(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let cur = { level: 0, title: '', line: 1, body: [] };
  lines.forEach((text, i) => {
    const m = /^(#{1,6})\s+(.*)$/.exec(text);
    if (m) {
      out.push(cur);
      cur = { level: m[1].length, title: m[2].trim(), line: i + 1, body: [] };
    } else cur.body.push(text);
  });
  out.push(cur);
  return out;
}

/** Paragraphs: blank-line separated, single newlines joined with a space. */
function paras(body) {
  const out = [];
  let buf = [];
  const push = () => {
    const p = buf.join(' ').replace(/\s+/g, ' ').trim();
    if (p) out.push(p);
    buf = [];
  };
  for (const l of body) {
    if (!l.trim()) push();
    else buf.push(l.trim());
  }
  push();
  return out;
}
const lines = (body) => body.map((l) => l.trim()).filter(Boolean);
const isPlaceholder = (p) => /^\[(Personal )?writing space\]$/i.test(p) || /^_{5,}$/.test(p);

function extract(track) {
  const file = `${track.folder} - Full Course Book.md`;
  const md = fs.readFileSync(path.join(booksDir, track.folder, file), 'utf8');
  const secs = sections(md);
  const src = (s) => ({ file, heading: s.title, line: s.line });
  const out = {
    track: track.key,
    title: track.title,
    generatedFrom: file,
    generatedAt: new Date().toISOString().slice(0, 10),
    disclaimer: null,
    chapters: [],
    weeks: [],
    topics: [],
    labs: [],
    worksheets: [],
    knowledgeCheck: [],
    cases: [],
    planExample: null,
    finalExplanation: null,
  };
  let week = null;
  let topic = null;
  let inPartTwo = false;
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const t = s.title;
    let m;
    if (s.level === 1) {
      topic = null;
      if (/^Part Two/.test(t)) inPartTwo = true;
      if (/^Part Three/.test(t)) {
        inPartTwo = false;
        week = null;
      }
    }
    if (s.level === 1 && /^Important Medical and Educational Disclaimer/.test(t)) {
      const ps = paras(s.body);
      out.disclaimer = { src: src(s), body: ps.filter((p) => !/^Biblical reflections/.test(p)), faith: ps.filter((p) => /^Biblical reflections/.test(p)) };
    } else if (s.level === 1 && (m = /^Chapter (\d+): (.+)$/.exec(t))) {
      out.chapters.push({ number: Number(m[1]), title: m[2], src: src(s) });
    } else if (s.level === 1 && inPartTwo && (m = /^Week (\d+) — (.+)$/.exec(t))) {
      week = { number: Number(m[1]), title: m[2], intro: paras(s.body), homework: [], faith: null, review: [], src: src(s) };
      out.weeks.push(week);
    } else if (s.level === 2 && week && (m = /^Topic (\d+) — (.+)$/.exec(t))) {
      const ps = paras(s.body);
      topic = {
        number: Number(m[1]),
        week: week.number,
        title: m[2],
        src: src(s),
        reading: ps.filter((p) => !/^Application:/.test(p)),
        application: (ps.find((p) => /^Application:/.test(p)) || '').replace(/^Application:\s*/, ''),
        subsections: [],
        example: null,
        prompts: [],
      };
      out.topics.push(topic);
    } else if (s.level === 3 && topic) {
      const ps = paras(s.body);
      if (/^Worked example/.test(t)) {
        topic.example = { src: src(s), body: ps.filter((p) => !/^Discuss:/.test(p)), discuss: (ps.find((p) => /^Discuss:/.test(p)) || '').replace(/^Discuss:\s*/, '') };
      } else topic.subsections.push({ heading: t, body: ps, src: src(s) });
    } else if (s.level === 2 && week && (m = /^Make Topic (\d+) your own$/.exec(t))) {
      const tp = out.topics.find((x) => x.number === Number(m[1]));
      if (tp) tp.prompts = paras(s.body).filter((p) => !isPlaceholder(p)).map((p) => ({ label: p, src: src(s) }));
      topic = null;
    } else if (s.level === 2 && week && (m = /^Performer practice lab — (.+)$/.exec(t))) {
      topic = null;
      // A lab can carry the author's "From My Own Experience" note and a Faith & Reflection callout; split them out.
      const body = [];
      const note = [];
      const faith = [];
      let mode = 'body';
      let faithHeading = '';
      for (const l of s.body) {
        if (/^From My Own Experience/.test(l.trim())) {
          mode = 'note';
          continue;
        }
        const fm = /^Faith & Reflection(?: — (.+))?$/.exec(l.trim());
        if (fm) {
          mode = 'faith';
          faithHeading = fm[1] || '';
          continue;
        }
        (mode === 'body' ? body : mode === 'note' ? note : faith).push(l);
      }
      const ps = paras(body);
      out.labs.push({
        number: out.labs.length + 1,
        week: week.number,
        title: m[1],
        src: src(s),
        reading: ps,
        submission: ps.find((p) => /submission is/.test(p)) || '',
        authorNote: paras(note),
        faith: faith.length ? { ref: faithHeading, body: paras(faith) } : null,
      });
    } else if (s.level === 2 && week && (m = /^Faith & Reflection(?: — (.+))?$/.exec(t))) {
      topic = null;
      week.faith = { ref: m[1] || '', body: paras(s.body), src: src(s) };
    } else if (s.level === 2 && week && /^Weekly homework and discussion$/.test(t)) {
      topic = null;
      week.homework = paras(s.body).filter((p) => !/^Use the following worksheets in this book/.test(p));
      week.homeworkSrc = src(s);
    } else if (s.level === 2 && week && (m = /^Week (\d+) review and discussion notes$/.test(t))) {
      topic = null;
      week.review = paras(s.body).filter((p) => !isPlaceholder(p));
    } else if (s.level === 2 && (m = /^Worksheet (\d+) — (.+)$/.exec(t))) {
      topic = null;
      const ls = lines(s.body);
      out.worksheets.push({
        number: Number(m[1]),
        week: week ? week.number : null,
        title: m[2],
        src: src(s),
        fields: ls.filter((l) => /:$/.test(l)).map((l) => l.replace(/:$/, '')),
        notes: paras(s.body).filter((p) => !/:$/.test(p)),
      });
    } else if (s.level === 2 && /^Knowledge check$/.test(t)) {
      const qs = lines(s.body).map((l) => /^(\d+)\.\s+(.*)$/.exec(l)).filter(Boolean);
      const ans = secs[i + 1] && /^Answers and explanations$/.test(secs[i + 1].title) ? lines(secs[i + 1].body).map((l) => /^(\d+)\.\s+(.*)$/.exec(l)).filter(Boolean) : [];
      out.knowledgeCheck = qs.map((q) => ({ number: Number(q[1]), question: q[2], answer: (ans.find((a) => a[1] === q[1]) || [])[2] || '', src: src(s) }));
    } else if (s.level === 2 && (m = /^Case (\d+) — (.+)$/.exec(t))) {
      out.cases.push({ number: Number(m[1]), title: m[2], body: paras(s.body), src: src(s) });
    } else if (s.level === 1 && /^Completed plan example/.test(t)) {
      const ps = paras(s.body);
      out.planExample = {
        title: t,
        intro: ps.filter((p) => !/^[A-Z][A-Za-z0-9 ]{1,30}: /.test(p)),
        parts: ps.filter((p) => /^[A-Z][A-Za-z0-9 ]{1,30}: /.test(p)).map((p) => ({ label: p.slice(0, p.indexOf(':')), text: p.slice(p.indexOf(':') + 1).trim() })),
        src: src(s),
      };
    } else if (s.level === 2 && /^My final explanation$/.test(t)) {
      out.finalExplanation = { prompts: paras(s.body).filter((p) => !isPlaceholder(p)).map((p) => p.replace(/:$/, '')), src: src(s) };
    }
  }
  return out;
}

function check(c) {
  const problems = [];
  if (c.topics.length !== 12) problems.push(`expected 12 topics, found ${c.topics.length}`);
  if (c.weeks.length !== 4) problems.push(`expected 4 weeks, found ${c.weeks.length}`);
  const ws = c.worksheets.map((w) => w.number).sort((a, b) => a - b).join(',');
  if (ws !== '1,2,3,4,5,6,7,8,9,10') problems.push(`expected worksheets 1-10, found ${ws}`);
  for (const t of c.topics) {
    if (!t.reading.length) problems.push(`topic ${t.number}: no reading`);
    if (!t.example) problems.push(`topic ${t.number}: no worked example`);
    if (t.prompts.length < 2) problems.push(`topic ${t.number}: fewer than 2 prompts`);
  }
  if (c.track === 'perform' && c.labs.length !== 4) problems.push(`expected 4 performer labs, found ${c.labs.length}`);
  if (c.knowledgeCheck.length < 8 || c.knowledgeCheck.some((k) => !k.answer)) problems.push('knowledge check incomplete');
  if (!c.disclaimer) problems.push('no disclaimer');
  return problems;
}

let failed = false;
for (const t of TRACKS) {
  const c = extract(t);
  const problems = check(c);
  if (problems.length) {
    failed = true;
    console.error(`${t.title}:\n  ` + problems.join('\n  '));
  }
  const file = path.join(outDir, `${t.key}.generated.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(c, null, 1) + '\n');
  console.log(`${t.title}: ${c.topics.length} topics, ${c.weeks.length} weeks, ${c.worksheets.length} worksheets, ${c.labs.length} labs, ${c.knowledgeCheck.length} knowledge-check items, ${c.cases.length} cases -> ${path.relative(root, file)}`);
}
if (failed) process.exit(1);
