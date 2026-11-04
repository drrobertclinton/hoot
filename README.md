# Hoot

Hoot Tutor teaches every course from kindergarten through calculus, plus AP,
ACT, SAT, PSAT and state end-of-year tests, one step at a time, and helps with
homework from a photo. Kids can also photograph their review pages (or add
PDFs / Word docs) and Hoot makes flashcards and a practice test. Teachers can make a class, upload study guides,
and give students a class code.

Claude is called only from the server, with the key in an environment variable.
The browser can only ask for fixed jobs (named course, unit and mode) and never sends its own prompt.

## Kinboard and Snapdeck

- **Kinboard** (`/kinboard.html`): the family board. This week's plans, chores with points for each kid, and rewards kids ask for and a grown-up approves with a PIN. Everything stays on the device, so it fits a family tablet or kitchen screen. Sharing one board across several phones will need a server later.
- **Snapdeck** (`/snapdeck.html`): the photo-to-flashcards study deck maker on its own, without the tutor and Kinboard cards.

## What's where

- `public/index.html` – the kids' app (sets and scores stay in the browser), with the grown-up agreement screen.
- `public/tutor.html` – the course tutor: pick a course and unit, Learn / Practice / Homework / Mastery check. Grown-up PIN sets the answer setting and state.
- `public/curriculum.mjs` – every course and unit, shared by the page and the server.
- `lib/tutor.mjs` – the tutor's teaching rules, answer settings, safety rules, the mastery check, the course-wide quick check, and reading a teacher's report to find weak units. State tests are named for all 50 states and DC.
- `public/teacher.html` – teachers make a class and share study guides.
- `public/privacy.html` – privacy notice.
- `public/maker.js`, `public/style.css` – shared by the pages.
- `lib/study.mjs` – prompts and the Claude call (`claude-opus-5-5`, automatic refusal fallback), input limits, rate limit.
- `lib/classes.mjs`, `lib/store.mjs` – teacher classes, stored in Upstash Redis. Only finished study sets are stored, never uploaded pages or student data.
- `lib/routes.mjs` – the two endpoints, used by `api/*.mjs` (Vercel) and `server.mjs` (plain Node).

## Settings

| Variable | Needed | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Key from console.anthropic.com. Never put it in the page. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | yes, for classes | Set automatically when you connect an Upstash Redis database in Vercel's Storage tab. |
| `STUDY_MODEL` | no | Defaults to `claude-opus-5-5`. |
| `STUDY_REQUESTS_PER_HOUR` | no | Per-visitor limit on page reads, default 120. |
| `TUTOR_REQUESTS_PER_HOUR` | no | Per-visitor limit on tutor messages, default 300. |

## Deploy on Vercel

1. Import this repo at vercel.com/new (framework preset: Other) and deploy.
2. Storage → Create Database → Upstash Redis (free) → connect it to the project.
3. Settings → Environment Variables → add `ANTHROPIC_API_KEY`, then redeploy.
4. Settings → Domains to add a domain.

## Run locally

```
npm install
ANTHROPIC_API_KEY=... npm start   # http://localhost:3000, classes kept in memory
```

## Before marketing to schools

The privacy notice and grown-up screen are a first version written to collect no
personal information from children. Have a lawyer review them against COPPA
(and FERPA if schools sign up) before a wide launch.
