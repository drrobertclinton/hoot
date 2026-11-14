# Coressence Life

The companion app to the Coressence Life Series courses by Robert Clinton, MD (Live at Your Peak and Perform at Your Peak): one Expo (React Native) app for iPhone, Android and a web preview. The home screen is the weekly **Peak Cycle**, the course method as one loop (assess, plan, do, measure, review, adjust, keep what works). Each module is still a self-contained folder so it can later ship as its own app.

Version 1.2.0 (the redesign after App Review's 4.3(a) rejection of 1.1.0; see `REVIEW-NOTE.md`) replaced the five-score daily dashboard and the five-tab bar with the loop, a floating step dock (This week, Course, Toolkit, check-in), and three signature features: **Weekly Experiment**, **Performer Day** and **Why this number**.

- Bundle id / package: `com.coressence.life`
- Publisher for now: Vilasi, Inc. (move to Coressence, Inc. once it is formed; see "Open decisions")
- Stack: Expo SDK 57, TypeScript, expo-router, RevenueCat, on-device storage. One optional companion service, `services/connect`, only for direct wearable connections (not deployed).

## What the app does

| Module | What works today (all on the device) |
|---|---|
| **Peak Cycle (home)** | The week as a loop map: six steps as stations, where you are now, the week's days logged; this week's course module; today's one to three actions (plan first, then the experiment, check-in and module); the single biggest signal (last 7 days against your own usual, scaled by how much that measure normally varies); readiness with a link to its explanation; quick log; one coach note; weekly review entry. `src/modules/cycle`. |
| **Weekly Experiment** | Pick one change the course teaches (ten templates tied to module numbers, or write your own), mark the days done, and get a keep / adjust / drop verdict from the 7 days before against the experiment week. Rules are in `experiment/model.ts` `evaluate` and shown on screen. "Keep" adds a habit to Track; "adjust" starts another week. History kept. `src/modules/experiment`. |
| **Performer Day** | Countdown to the next `performance` item on the plan calendar (add one from the screen), today's voice-load budget from the voice log (typical day, trimmed for hoarseness, heavy week, show eve/day/after), quick voice-use logging, the four warmups, and the performance-day sequence from Perform at Your Peak practice lab 4 with essentials and optional items, plus the after-show note. `src/modules/performer`. |
| **Why this number** | The readiness score for any of the last 7 days as a step chart from 70: each input's value, what it was compared with, points, and a plain sentence; what was not counted; change since yesterday; the whole formula. `src/modules/recover/explain.ts`, `why.tsx`. |
| **Measure** | Apple Health (HealthKit) and Health Connect behind one provider interface, plus direct vendor connections; 30+ daily metrics (activity, heart, sleep stages, vitals, body, glucose, sound, cardio recovery) with a 14-day personal baseline and the brand each number came from; manual entries (weight, resting HR, blood pressure); 7/30/90-day charts. |
| **Devices** | Connected devices screen: Apple Health, Health Connect, Samsung (through Health Connect), Oura, WHOOP, Garmin, Fitbit and Pixel Watch (Google Health API), Withings, Polar, Dexcom (G7, G6, Stelo) and Bluetooth heart rate straps, each with status, last sync, what it provides, connect/disconnect, and a plain note when the vendor must approve Coressence or the member needs a paid membership. One data model with de-duplication (see "Wearables"). |
| **Monitor** | Readiness (HRV, resting HR, sleep, temperature, with Oura and WHOOP scores shown as reported), sleep stages with a hypnogram and consistency score, strain and training load (acute against chronic), glucose with time in range against the member's chosen range, blood pressure log and trend against clinician-set targets (and the 180/120 safety message), body composition, cycle phase estimates with cycle-aware notes, ECG and rhythm notification history shown as reported, and voice load (Rehearse). Plain words, never a diagnosis. |
| **Track** | 20-second check-in (energy, mood, stress, soreness, focus), habits with streaks, trends, and patterns between sleep or steps and how you feel (Coressence+). |
| **Move** | Live heart rate and zones from any standard Bluetooth strap (simulated on the web), saved with the session; weekly minutes ring against the national guideline target, strength days, log a session, seven guided routines (Pilates, yoga, mobility, strength, balance, desk reset, evening stretch) with a step-by-step timer that logs the session, history. |
| **Fuel** | Water gauge with goal and streak, meals logged by pattern (protein, vegetables or fruit, whole grains, packaged; the default), weekly pattern summary, optional eating-window timer with history and safety note. Optional "add a specific food": Open Food Facts search (debounced, with empty and offline states) and barcode scan (expo-camera on the phone; typed barcode on the web), portion in servings or grams, nutrients shown as estimates for the portion with "Data from Open Food Facts". Label scan is "coming soon" (no on-device OCR in the project). No calorie targets anywhere (the app does not store age). |
| **Sleep** | Nightly log (bed, wake, how rested, awakenings), hours chart, bedtime spread, and the **sleep sound check**: records microphone loudness once a second overnight, finds loud moments by RMS thresholding over the room's own quiet level, classifies rhythmic (snoring-like), pause-then-loud, longer and short sounds, draws a night timeline and writes a plain-language summary. No audio is kept. If loud nights show up on 3 or more of the last 7 recorded nights, it suggests talking to a clinician. |
| **Recover** | Readiness score from HRV and resting heart rate against your own baseline, sleep and soreness, with the parts shown; soreness and recovery actions; readiness trend. |
| **Restore** | Restore minutes ring, guided breathing (calm, box, even pacing), quiet time, gratitude, outdoors, time with people. **Scripture reflection is optional** and only appears when Settings > Faith content is on (off by default, so the app can be white-labeled). Verses are from the World English Bible (public domain), with "the LORD" in place of "Yahweh". |
| **Rehearse / Perform** | Vocal warmup, speaking warmup, physical pre-show warmup, vocal cool-down (guided timers), voice health log (hours of voice use, hoarseness 0–5, vocal rest, warmed up), voice-load charts, advice when hoarseness runs on, upcoming rehearsals and performances, pre-show checklist. |
| **Coach** | The course cycle (assess, plan, execute, measure, review, adjust, maintain) worked out from your data, a "next step" button, rule-based coach notes, weekly review history. **Share with my coach**: three consent switches (Track, Measure, Practice; all off), a preview of the exact JSON, then the share sheet (web: download) as `coressence-share-YYYY-MM-DD.json`. **Open coach feedback**: imports a Coach Portal `coressence-coach-feedback` JSON file, validates it, stores it on the device, shows it as plain text, and can delete it. |
| **Weekly review** | This week against last week for sleep, movement, steps, water, energy, stress, restore, resting heart rate and voice; plan adherence; wins, obstacles, one adjustment, decision rule and next review date. |
| **Plan** | Five-step personal plan builder from the course (purpose, what to watch, ordinary week, minimum plan, decision rule and review day). Saving creates a dated version and fills four weeks of the calendar. Week calendar with items, add/complete/remove, reminders. |
| **Learn** | The full four-week course for each track: 12 modules for Live at Your Peak and 12 for Perform at Your Peak (text pulled from the Full Course Books by `scripts/extract-course.js`), each with purpose and output, reading, fictional worked example (plus a track-specific Part Three example), knowledge check with explanation and retry, decision fields that feed the plan builder, next action and links back to the book section, chapter and worksheet. Perform adds the four performer practice labs (observation-only option; no recordings are made or uploaded). The ten core worksheets as forms (draft vs submit with a dated receipt, reopen, extra copies, text export), weekly homework W1–W4 with a checklist and receipt, plan export as text, Faith & Reflection only when Faith content is on. Progress counts saved outputs, not streaks. Plus the 8 short seed lessons. Module 1, Worksheet 1 and Lesson 1 free. See "COURSE BUILD NOTES.md". |
| **Labs** | Enter results with the range printed on your report, trends per test, plain-language reference notes for 14 common tests. Compares only with the report's own range; no diagnosis. "Order a panel" placeholder. |
| **MD** | Placeholder for telehealth booking, clearly separate from the education path; "let me know" switch; booking link slot in config. |
| **Shop** | Placeholder categories with an affiliate disclosure; no live links. |
| **Coressence+** | Paywall with All-Access monthly/annual, family plan, one-time course tracks, Restore Purchases, renewal disclosure, Terms and Privacy. |
| **Settings** | Name, track, units, goals, reminders, faith content, appearance (light/dark/system), investor demo switches, membership, Restore Purchases, privacy, terms, support, **Delete all my data**. |
| **Onboarding** | Welcome, track choice, privacy and scope note, "Explore with demo data". |

Reminders (daily check-in, water every N hours, bedtime, weekly review, plan items) are local notifications through expo-notifications.

## Wearables

How data reaches Coressence, cheapest first:

1. **Apple Health / Health Connect** (free, on the phone). Apple Watch, and anything that shares to them: Garmin, Oura, WHOOP, Withings, Polar, Fitbit, Samsung, Dexcom, FreeStyle Libre, Omron, Coros, Suunto, Eight Sleep and others. iOS uses `@kingstinct/react-native-healthkit` (full coverage: sleep stages, SDNN and RMSSD, wrist temperature, VO2 max, workouts, ECG classifications, irregular/high/low rhythm notifications, menstrual flow, mindful minutes, sound exposure, cardio recovery). Android uses `react-native-health-connect` with 21 read permissions plus history. Read-only on both.
2. **Direct cloud connections** through `services/connect` (OAuth, tokens and webhooks on the server): Oura, WHOOP, Garmin, Google Health (Fitbit, Pixel Watch), Withings, Polar, Dexcom. Each opens on its own once the vendor approves Coressence and the service has its keys. See `services/connect/README.md`.
3. **Optional aggregator** (Terra, Junction or ROOK) behind the same provider interface, off by default (`CONNECT.aggregator`).
4. **Bluetooth heart rate straps** (standard GATT Heart Rate Service 0x180D / 0x2A37) through `react-native-ble-plx` for live zones in Move. Android 12+; no location permission.

**One data model and de-duplication** (`src/modules/devices/schema.ts`, `merge.ts`): every source arrives as a batch tagged with the path (healthkit, oura…) and the brand that measured it (read from the Apple Health bundle id or Health Connect package name). Rules: hand-entered wins; a copy that came through Apple Health, Health Connect or an aggregator is dropped when that brand's direct API reported the same metric that day; otherwise each metric takes the best brand for it (sleep: Oura, WHOOP, Garmin…; steps: Apple, Garmin…; weight and BP: Withings…; glucose: Dexcom), never summed across brands; overlapping workouts are one (the copy with heart rate zones wins); BP readings within 3 minutes and glucose within 2.5 minutes are one reading.

**Apple rules**: 1.4.1, blood pressure, glucose, blood oxygen and temperature come only from a cuff, a glucose sensor or a wearable, never from the phone's own sensors, and the screens say so. 5.1.3, health data is never used for advertising or shared, and is not stored in iCloud (Apple Health and Health Connect data never leaves the phone; the privacy manifest declares Health and Fitness for app functionality because direct-connection data passes through Coressence Connect).

**Google Play**: complete the Health Connect permissions declaration for the 21 read types in `app.json` (steps, distance, exercise, active calories, basal metabolic rate, heart rate, resting heart rate, HRV, respiratory rate, oxygen saturation, skin temperature, VO2 max, sleep, weight, body fat, lean body mass, blood pressure, blood glucose, menstruation, mindfulness, history). The privacy-policy rationale screen is handled: `plugins/withCoressenceAndroid.js` opens the in-app Privacy screen when Health Connect launches the app for its rationale.

See "Wearables test plan.md" for devices to buy, what to test and the developer programs to apply to.

## Investor demo mode

Settings > Investor demo > **Load demo data** switches to a separate sample profile ("Alex", both tracks) with 60 days of consistent data from six devices (Oura sleep, stages and temperature; Apple Watch activity, workouts with zones and ECG; Garmin runs, rides and training load; WHOOP strain and recovery; Withings scale and blood pressure; Dexcom Stelo glucose every 15 minutes), merged by the real de-duplication rules, plus sleep, device metrics, check-ins, workouts, meals, water, eating windows, restore, voice logs with a busy rehearsal week, six sleep sound checks, a plan, two weekly reviews, lab results and four completed lessons. The person's own data is kept apart and comes back unchanged when demo is switched off. **Preview Coressence+** unlocks premium features in demo mode without a purchase. The demo regenerates for the current date each day.

Before the public release set `DEMO_TOOLS = false` in `src/core/appConfig.ts`; that hides both switches and the demo button on the welcome screen.

### Investor web demo (static files)

`node scripts/build-demo-web.js` writes `dist-demo/`: a static web build that opens straight into the demo profile with the Coressence+ preview on. Tapping a purchase shows a short note that Coressence+ is bought in the phone app. The bundle folder is named `xpo` (not `_expo`) because some hosts reserve names starting with "_". Upload the folder to any web host, at the root or in a sub-folder (for example `/investors/coressence/`), and open its `index.html` folder URL. Asset and route URLs follow wherever `index.html` is served. Open links at that folder, not deep links into the app, unless the host sends unknown paths to `index.html`.

## Free plan and Coressence+

Prices come from "Vilasi App Pricing and Revenue Plan" (Coressence family pricing):

| Product id | Type | US price | Entitlement |
|---|---|---|---|
| `com.coressence.life.allaccess.monthly` | Auto-renewing, 14-day trial | $14.99 / month | `coressence_all_access` |
| `com.coressence.life.allaccess.annual` | Auto-renewing, 14-day trial | $119.99 / year | `coressence_all_access` |
| `com.coressence.life.allaccess.family.monthly` | Auto-renewing, Family Sharing on | $19.99 / month | `coressence_all_access` |
| `com.coressence.life.allaccess.family.annual` | Auto-renewing, Family Sharing on | $159.99 / year | `coressence_all_access` |
| `com.coressence.life.course.live` | Non-consumable | $49.99 | `coressence_course_live` |
| `com.coressence.life.course.perform` | Non-consumable | $49.99 | `coressence_course_perform` |
| `com.coressence.life.course.both` | Non-consumable | $79.99 | both course entitlements |

Put the four subscriptions in one subscription group (`coressence.allaccess`). The app always shows the store's local price and trial; the US prices are only shown on the web preview.

Free: Peak Cycle, Weekly Experiment, Performer Day, Why this number, Track check-ins and habits, Plan, Coach, Labs, MD, Shop, lesson 1, Module 1 and Worksheet 1 of each course track, and the last 7 days of history in Measure, Move, Fuel, Sleep, Recover, Restore and Rehearse. Coressence+: 30/90-day history everywhere, Track patterns, all lessons, two premium routines, every sleep sound check night.

## Code layout (built to split into separate apps)

```
src/
  core/                 shared by every module (would become a @coressence/core package)
    store.ts            on-device store; each module owns one "slice" under its own key; user and demo namespaces
    settings*.ts        settings shape, goals, reminders
    billing/            RevenueCat config, catalog, entitlements, billing store, web mock hook
    ui.tsx charts.tsx   interface kit and SVG charts (tide gauge, bars, lines, night timeline); art.tsx holds the loop map, tide lines and motion
    reminders.ts notifications(.web).ts   local reminders
    dates.ts stats.ts routine.ts gate.tsx appConfig.ts
  modules/<name>/       one folder per module: model.ts (pure logic), state.ts (its slice), screens.tsx
    life/               today.ts combines every module's model into pillar scores, weekly numbers, coach notes (the home screen is modules/cycle)
    measure/providers/  HealthProvider interface; healthkit.ts, healthconnect.ts, normalize.ts (samples -> per-brand batches, pure), aggregate.ts
    devices/            schema.ts (shared data model), merge.ts (de-duplication), zones.ts, catalog.ts, cloud.ts, aggregator.ts, screens.tsx
    monitor/            model.ts (readiness, stages, load, glucose, BP, body, cycle, rhythm; pure) and screens.tsx
    move/hr/            gatt.ts (Heart Rate Measurement parser), ble.ts (native), sim.ts / ble.web.ts (simulated strap); move/live.tsx
    sleep/noise.ts      sleep sound analysis (pure, unit-tested); RecordScreen(.web).tsx does the recording
  demo/                 investor demo profile generator and switch (devices.ts: the multi-device data)
  app/                  expo-router routes (thin files that point at module screens)
  screens/ components/  app-level screens (paywall, settings, privacy, onboarding, all modules) and shared pieces
services/connect/       companion service for direct wearable connections (Fastify; not deployed)
plugins/                Expo config plugin for the Health Connect rationale screen and Bluetooth without location
```

To make a module its own app: create a new Expo app, copy `src/core` and `src/modules/<name>`, point its routes at that module's screens, and give it its own bundle id and RevenueCat entitlement (the pricing plan's single-app premium). Modules depend on `core` and never on the hub; only `life/`, `coach/` and `monitor/` read other modules (`devices/` holds the shared data model that Measure uses).

## Run it

```
npm install
npx expo start            # press w for the web preview; Expo Go works for everything except Apple Health / Health Connect
node scripts/extract-course.js   # re-pull course text after editing the participant books (01 Participant Books)
npm test                  # unit tests (course content and flow, Open Food Facts parsing, coach share, billing, scores, sleep sound analysis, reminders, plan builder, demo data, wearables merge and normalizing, zones, Bluetooth parser, monitor)
(cd services/connect && npm install && npm test)   # companion service tests
npm run typecheck
npx expo export --platform web
node scripts/serve-web.js dist 8237
PLAYWRIGHT_BROWSERS_PATH=... node scripts/screenshots.js http://localhost:8237   # full walk-through + screenshots
node scripts/serve-web.js dist-demo 8239 && node scripts/verify-demo-web.js http://localhost:8239   # wearables and monitor screens at 390x844
node scripts/make-icons.js                                                        # icons and splash from the B wave logo
```

HealthKit, Health Connect, Bluetooth and RevenueCat are native modules, so on a phone use a development build (`eas build --profile development`) rather than Expo Go.

## Keys and settings to fill in

| Where | What |
|---|---|
| `src/core/billing/config.ts` | `REVENUECAT_IOS_KEY` (appl_…) and `REVENUECAT_ANDROID_KEY` (goog_…), the public SDK keys from RevenueCat. Until then the app runs fully on the free plan and the paywall says purchases are not set up. |
| `src/core/appConfig.ts` | `CONNECT.serviceUrl` once services/connect is deployed (empty = direct connections show "coming soon"); `CONNECT.aggregator` (null); `DEMO_TOOLS` (false for release), `MD.bookingUrl` and `MD.practiceName` when telehealth booking opens, `SHOP` affiliate ids. |
| `src/core/billing/config.ts` `LEGAL` | Terms and privacy page URLs (placeholders on the Vilasi CDN), support email support@vilasi.co. |
| `eas.json` | Apple ID email, App Store Connect app id, Apple team id, Google Play service-account JSON path. |
| `app.json` | `owner` (Expo account), and run `eas init` once to add the EAS project id. |

## Build with EAS

```
npm install -g eas-cli
eas login
eas init                                   # once; writes the project id into app.json
eas build --profile development --platform ios      # dev client for testing HealthKit and the sound check
eas build --profile preview --platform android       # installable APK for testers
eas build --profile production --platform all        # store builds
eas submit --platform ios --latest
eas submit --platform android --latest
```

Apple: enable the HealthKit capability for `com.coressence.life` in the Apple Developer portal (EAS syncs it), create the in-app products above, and answer the review notes (health data is read-only and stays on the device; the sound check keeps no audio). The app uses background audio only while a sleep sound check is running.

Google Play: Health Connect needs the Health Connect permissions declaration form in Play Console (read-only, the 21 types listed under "Wearables") and a privacy policy link. Bluetooth is declared with neverForLocation. Microphone use is declared for the sound check.

## Health content

Lessons, lab notes and in-app guidance are general education written conservatively, cite their sources, and never diagnose. Robert should do a clinical read-through before release, as with the course books.

## Ownership

Source code, design and content belong to Vilasi, Inc. (see LICENSE). Open-source components keep their own licenses (THIRD_PARTY_NOTICES.md).

## Open decisions

1. Publisher account: ship under Vilasi, Inc. now, or wait for Coressence, Inc.? (Bundle id is already `com.coressence.life`.)
2. Recover: the pricing plan folds Recover into Restore; this build keeps it as its own module and ring. Keep both, or merge?
3. Vilasi Pass: should it unlock Coressence+ All-Access? Not wired in yet.
4. MD and Labs: name of the clinical partner, states served and booking link (the screens say "coming soon").
5. Release switch: set `DEMO_TOOLS = false` before the public store build.
