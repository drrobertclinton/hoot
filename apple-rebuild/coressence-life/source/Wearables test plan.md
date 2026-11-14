# Coressence Life: Wearables Test Plan

Prepared for Robert Clinton, MD (Vilasi, Inc.), October 23, 2026. Nothing has been bought or signed up for. Vendor requirements below were checked on each vendor's developer pages on this date; links are at the end.

## How the pieces fit

| Path | What it covers | Works now? |
|---|---|---|
| Apple Health (iPhone) | Apple Watch, plus every brand that writes to Apple Health | Yes, in a development build |
| Health Connect (Android) | Pixel Watch, Fitbit, Samsung Galaxy Watch and Ring, plus brands that write to Health Connect | Yes, in a development build |
| Bluetooth strap | Live heart rate and zones in Move | Yes, in a development build (Android 12 or newer) |
| Direct connections (Coressence Connect) | Oura, WHOOP, Garmin, Google Health (Fitbit, Pixel Watch), Withings, Polar, Dexcom | After Coressence Connect is hosted and each company issues keys |
| Investor web demo | Every screen, with sample data from six devices | Yes, now |

Start with the phone paths: most devices already reach Coressence through Apple Health or Health Connect, so testing can begin the day the devices arrive, before any company approves anything.

## Devices to buy (one per brand)

| # | Device | Why | Paid membership needed? |
|---|---|---|---|
| 1 | iPhone (any recent model you already have) + **Apple Watch Series** (current model, not SE) | HealthKit path; ECG, irregular rhythm notifications, wrist temperature, VO2 max and cardio recovery need a Series or Ultra watch, not SE | No |
| 2 | **Android phone** with Android 14 or newer (a Pixel or Samsung Galaxy) | Health Connect path (built into Android 14+) | No |
| 3 | **Samsung Galaxy Watch** (current model) | Samsung through Health Connect | No |
| 4 | **Oura Ring** (current generation) | Oura API and Oura's Apple Health / Health Connect copies | **Yes: Oura Membership.** Oura says Gen3 and newer owners without an active membership lose API access |
| 5 | **WHOOP** band | WHOOP API (recovery, strain, sleep, workouts with zones) | **Yes: WHOOP is sold as a membership** (third-party roundups list plans at about $199 to $359 a year; confirm at checkout) |
| 6 | **Garmin Forerunner** (or any current Garmin watch) | Garmin API once approved; Apple Health / Health Connect meanwhile | No |
| 7 | **Fitbit Charge** (or a Pixel Watch, which covers this too) | Google Health API | No (Fitbit Premium is not required for the API) |
| 8 | **Withings scale** (Body Smart or Body+) and **Withings BPM Connect** cuff | Withings API: weight, body fat, lean mass, blood pressure | **Possibly: Withings+.** Withings says accounts created after October 12, 2026 need Withings+ for partner data on its free developer plan |
| 9 | **Polar H10** chest strap | Bluetooth live heart rate in Move, and Polar AccessLink (sessions recorded with the Polar Flow app) | No |
| 10 | **Dexcom Stelo** glucose biosensor (over the counter; one box) | Dexcom API path and Dexcom's Apple Health / Health Connect copies | No membership; each sensor lasts about 15 days |

Optional extras only if you want them: a Garmin HRM strap or Wahoo TICKR (a second Bluetooth strap brand), a Polar watch (richer AccessLink data than the H10 alone).

## What to test on each

Install a development build first (`eas build --profile development` for iOS and Android). In the app, open All > Devices.

**Apple Watch + iPhone (Apple Health)**
1. Connect Apple Health; approve every type on the permission sheet. Wording to check: "reads… and is never used for advertising".
2. Measure: steps, distance, exercise minutes, active and resting energy, resting and walking heart rate, HRV (shown as SDNN), breathing rate, blood oxygen, VO2 max, sound level and cardio recovery appear within a day of wear.
3. Monitor > Sleep stages: last night's hypnogram (deep, light, REM, awake) and a consistency score after five nights.
4. Monitor > Readiness: after two nights, temperature change appears.
5. Record an ECG on the watch; Monitor > Heart rhythm records lists it with the exact classification the watch gave.
6. Do a 20-minute workout on the watch; Monitor > Strain and load shows it with zone bars.
7. Turn on Cycle Tracking in the Health app (or log a test day); Monitor > Cycle appears.
8. Disconnect, then check Measure falls back cleanly.

**Android phone + Samsung Galaxy Watch (Health Connect)**
1. In Samsung Health, turn on sharing to Health Connect. Connect Health Connect in Coressence; approve all types.
2. Tap the privacy-policy link on Health Connect's permission screen: Coressence's Privacy screen must open (Google requires this).
3. Check steps, sleep stages, heart rate, HRV (shown as RMSSD), blood oxygen, skin temperature, body composition and blood pressure (where the watch supports them).
4. Connected devices > Samsung shows "Connected through Health Connect"; numbers are labeled as from Samsung.

**Oura Ring**
1. Phone path first: let the Oura app share to Apple Health / Health Connect; sleep appears from Oura.
2. Direct path (after keys): Connect Oura, sign in on Oura's page, return to the app. Sleep stages, readiness, temperature deviation and SpO2 appear from Oura, and Oura's Apple Health copy is ignored (no double sleep).
3. Let the membership lapse in a test account (if you can) and confirm the app shows the sync error, not wrong data.

**WHOOP**
1. Connect WHOOP; WHOOP recovery and day strain appear under Monitor > Readiness and Strain and load ("as WHOOP reports it").
2. A WHOOP-recorded workout shows zone bars; if Apple Watch recorded the same session, only one appears.
3. Wearing Oura and WHOOP together: sleep comes from Oura (higher priority), recovery from WHOOP.

**Garmin**
1. Phone path: Garmin Connect shares to Apple Health / Health Connect; a run shows in Monitor > Strain and load.
2. Direct path (after approval): connect, then sync a run on the watch; the push reaches Coressence Connect and appears on next sync with Garmin's own numbers; the Apple Health copy of the same run is dropped.
3. Disconnect: Garmin's user registration is removed.

**Fitbit Charge or Pixel Watch (Google Health API)**
1. Phone path: Health Connect shows Fitbit data on Android.
2. Direct path (after Google's verification): steps, sleep stages, resting heart rate and HRV from Fitbit.

**Withings scale and BPM Connect**
1. Weigh in; weight, body fat and lean mass appear in Monitor > Body composition.
2. Take two blood pressure readings a minute apart; both appear in Monitor > Blood pressure, de-duplicated against the Apple Health copy.
3. Enter clinician targets (for example 130/80) and confirm the 7-day average note. Enter a test reading of 185/121 by hand and confirm the 180/120 safety message appears.

**Polar H10**
1. Move > Live heart rate: the strap appears, connects, and shows bpm, zone and time in each zone. Save; the session appears in Move history with zone bars.
2. Walk away from the phone to drop the connection; the app says so and keeps the session.
3. Set your own maximum heart rate and confirm zone boundaries change.
4. Direct path (after keys): record with Polar Flow, then confirm the exercise and Nightly Recharge sync.

**Dexcom Stelo**
1. Phone path: let the Stelo app share to Apple Health / Health Connect where it offers that; readings appear in Monitor > Glucose.
2. Direct path (Dexcom approval needed for Stelo): connect Dexcom; readings arrive about an hour late in the US, and the screen says so.
3. Set a glucose range (for example 70–140) and confirm time in range changes. No screen suggests a treatment.

**Everything together (one week)**: wear Apple Watch, Oura and WHOOP, use the Withings devices and Stelo. Each Measure number names its source, nothing is counted twice, and Monitor shows every card.

## Developer programs Robert must apply to

| Program | What it unlocks | Approval | Sign-up |
|---|---|---|---|
| Apple Developer Program (Vilasi, Inc.) | HealthKit capability for `com.coressence.life` | Existing enrollment; enable HealthKit on the app ID | https://developer.apple.com/account |
| Google Play Console, Health apps declaration | Health Connect read permissions in a released app | Google reviews the declaration | https://play.google.com/console |
| Oura developer portal | Oura API | About 10 users until Oura approves the app | https://developer.ouraring.com/ |
| WHOOP Developer Dashboard | WHOOP API | Sandbox 10 members; request Build (100), then higher tiers | https://developer-dashboard.whoop.com |
| **Garmin Connect Developer Program** (Starter) | Garmin Health and Activity APIs | **Garmin approval required**; commercial use carries a license fee | https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/ |
| Google Health API | Fitbit and Pixel Watch data | Google's privacy and security review (all scopes are restricted) | https://developers.google.com/health/get-started and https://developers.google.com/health/app-verification |
| Withings developer account | Withings API | Free plan 10 users until Withings reviews the app | https://developer.withings.com/ |
| Polar AccessLink | Polar API | Client created by any Polar Flow user | https://admin.polaraccesslink.com/ |
| **Dexcom Developer Program** | Dexcom G7, G6 and Stelo data | **Dexcom approval required**: limited key for 5 users, then partner review and data license | https://developer.dexcom.com/ |
| Samsung Health Data SDK (optional, later) | Extra Samsung items such as irregular rhythm notifications | Samsung partner approval before release | https://developer.samsung.com/SHealth/business-partner/m48wvqi1mt9w2w4c |

Note on Fitbit: Google turns off the old Fitbit Web API this autumn (Google's pages give October 30 and November 2, 2026), so Coressence connects to Fitbit only through the new Google Health API.

## What it costs

- Devices above, plus memberships: **Oura Membership** (required), **WHOOP membership** (required), **Withings+** (may be required for new Withings accounts).
- Hosting for Coressence Connect: a small Node server with HTTPS and a database, a modest monthly fee at most hosts.
- **Garmin license fee** for commercial use (Garmin sets it after approval).
- Apple Developer Program and Google Play Console fees you already pay.
- Optional aggregator instead of direct connections: Terra from $499 a month, Junction from $300 a month, ROOK from $399 a month (published prices; details in `services/connect/README.md`). Not needed to launch.

## Order of work

1. Build development versions and test the phone paths with Apple Watch, Galaxy Watch, H10 and the Withings devices (no approvals needed).
2. Apply to Garmin and Dexcom first; they take the longest.
3. Register Oura, WHOOP, Withings and Polar clients (self-serve) and host Coressence Connect; set `CONNECT.serviceUrl` in the app.
4. Start Google's verification for the Google Health API.
5. Request higher user limits from Oura, WHOOP and Withings once the beta has real users.

## Sources

Oura: https://partnersupport.ouraring.com/hc/en-us/articles/20949682312211-The-Oura-API · WHOOP: https://developer.whoop.com/docs/developing/app-approval · Garmin: https://developer.garmin.com/gc-developer-program/overview/ and https://developer.garmin.com/gc-developer-program/health-api/ · Google Health API: https://developers.google.com/health/about and https://dev.fitbit.com/build/reference/web-api/ · Withings: https://static.withings.com/content/api/plans/plans.html · Polar: https://www.polar.com/accesslink-api/ · Dexcom: https://developer.dexcom.com/docs/ and https://developer.dexcom.com/docs/dexcomv3/endpoint-overview · Samsung: https://developer.samsung.com/health/data/process.html · Health Connect data types: https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types · Apple App Review Guidelines 1.4.1 and 5.1.3: https://developer.apple.com/app-store/review/guidelines/ · WHOOP membership prices (third-party roundup): https://trackervs.com/pricing/whoop-pricing/
