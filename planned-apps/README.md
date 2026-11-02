# Planned apps (built Nov 2, 2026)

Installable web apps (PWAs) built from "Vilasi App Specs - every app not yet built" (Oct 18). Each folder is a static site: upload the folder as-is to any host (Votel site path, Vercel, GitHub Pages). Everything runs on the user's device; there is no backend and no account.

| Folder | App | Spec |
|---|---|---|
| `measure/` | Coressence Measure: heart (pulse count, HR zones, Bluetooth strap, recovery test, VO2 estimate), BP/weight/waist logs, 8-test phone-sensor flexibility, "what moved it" tags, weekly habits, printable report | 11, 15, 17, Part 4 Measure split |
| `devotional/` | Who Is in Charge? Daily: 30-day men's devotional, WEB Scripture, journal, evening check-in, calendar reminder | 1 |
| `mybooks/` | My Books: kids' reading buddy, timer and log, on-device page reading (self-hosted Tesseract), tap-a-word meanings, read-aloud practice, chapter checks, badges, grown-up gate | 9 |
| `shared/` | Coressence look (core.css, core.js) used by Measure; Measure expects to live at `/app/measure/` beside `/app/shared/` | |

`devotional-source/` holds the editable day text (`days.src.js`); rebuild `devotional/days.js` with `node _tools/build-dev.js` (needs the `world-english-bible` npm package unpacked at the path in `_tools/verse.js`).
