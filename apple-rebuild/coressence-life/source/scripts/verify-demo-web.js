// Checks the investor web demo (dist-demo) in headless Chromium at phone size: every wearables and monitoring
// screen loads with demo data, the simulated Bluetooth strap streams, and there are no page errors.
// 1) node scripts/build-demo-web.js   2) node scripts/serve-web.js dist-demo 8239
// 3) CHROMIUM_PATH=/opt/pw-browsers/chromium PLAYWRIGHT_CORE=<path to playwright> node scripts/verify-demo-web.js http://localhost:8239
// Env: SHOT_DIR (default screenshots/wearables), SHOT_W 390, SHOT_H 844, SHOT_DPR 3, SHOT_CLOCK.
const path = require('path');
const fs = require('fs');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright'));
}

const BASE = (process.argv[2] || 'http://localhost:8239').replace(/\/+$/, '');
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', 'screenshots', 'wearables');
const VW = Number(process.env.SHOT_W || 390);
const VH = Number(process.env.SHOT_H || 844);
const DPR = Number(process.env.SHOT_DPR || 3);
const CLOCK = process.env.SHOT_CLOCK || '';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`);
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  if (CLOCK)
    await context.addInitScript((iso) => {
      const offset = new Date(iso).getTime() - Date.now();
      const RealDate = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...a) {
          if (a.length === 0) super(RealDate.now() + offset);
          else super(...a);
        }
        static now() {
          return RealDate.now() + offset;
        }
      };
    }, CLOCK);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  const tid = (id) => page.getByTestId(id).filter({ visible: true });
  const vt = (t) => page.getByText(t).filter({ visible: true });
  const shot = async (name, fullPage = false) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, name), fullPage });
    console.log('  saved', name);
  };
  // Open the root first (that sets the demo's base path), then deep links; serve-web.js sends unknown paths to index.html.
  const nav = async (route, waitId) => {
    await page.goto(BASE + route);
    await tid(waitId).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
  };
  const scrollTo = async (id) => {
    await tid(id).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  };

  await page.goto(BASE + '/');
  await tid('today').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  ok('demo opens on Today with the demo profile', await vt('Demo profile').count());

  await nav('/devices', 'devices');
  ok('connected devices lists brands', (await tid('dev-oura').count()) && (await tid('dev-garmin').count()) && (await tid('dev-dexcom').count()));
  ok('demo shows Oura, WHOOP, Garmin, Withings, Dexcom and Apple Health connected', (await page.getByText('Connected', { exact: true }).filter({ visible: true }).count()) >= 6);
  await shot('w01-connected-devices.png');
  await scrollTo('dev-polar');
  await shot('w02-connected-devices-direct.png');
  await tid('dev-oura').click();
  await tid('device').first().waitFor();
  await page.waitForTimeout(500);
  ok('device detail shows what Oura supplies now', await tid('dev-supplied').count());
  await shot('w03-device-oura.png');
  await nav('/devices/garmin', 'device');
  ok('Garmin detail shows the approval note', await vt(/Garmin must approve Coressence/).count());
  await shot('w04-device-garmin.png');

  await nav('/monitor', 'monitor');
  for (const k of ['readiness', 'sleep', 'load', 'glucose', 'bp', 'body', 'cycle', 'rhythm', 'voice']) ok(`monitor card: ${k}`, await tid(`mon-${k}`).count());
  ok('monitor flags the blood pressure average for the clinician', await tid('monitor-attention').count());
  await shot('w05-monitor.png');
  await scrollTo('mon-rhythm');
  await shot('w06-monitor-more.png');

  const details = [
    ['readiness', 'w07-readiness.png', 'vendor-scores'],
    ['sleep', 'w08-sleep-stages.png', 'hypnogram'],
    ['load', 'w09-strain-load.png', 'load-bars'],
    ['glucose', 'w10-glucose.png', 'glucose-chart'],
    ['bp', 'w11-blood-pressure.png', 'bp-chart'],
    ['body', 'w12-body-composition.png', 'mon-detail-body'],
    ['cycle', 'w13-cycle.png', 'cycle-state'],
    ['rhythm', 'w14-heart-rhythm.png', 'rhythm-list'],
  ];
  for (const [id, file, check] of details) {
    await nav(`/monitor/${id}`, `mon-detail-${id}`);
    ok(`${id} detail renders with data`, await tid(check).count());
    await shot(file);
  }
  await nav('/monitor/sleep', 'mon-detail-sleep');
  await scrollTo('sleep-consistency');
  await shot('w08b-sleep-consistency.png');
  await nav('/monitor/glucose', 'mon-detail-glucose');
  await scrollTo('glucose-stats');
  await shot('w10b-glucose-time-in-range.png');
  await nav('/monitor/load', 'mon-detail-load');
  await scrollTo('device-workouts');
  await shot('w09b-workout-zones.png');
  await nav('/monitor/bp', 'mon-detail-bp');
  await scrollTo('bp-list');
  await shot('w11b-bp-readings.png');

  await nav('/move-live', 'live-hr');
  await tid('hr-dev-sim-h10').first().waitFor({ timeout: 5000 });
  await shot('w15-live-hr-pair.png');
  await tid('hr-dev-sim-h10').click();
  await tid('hr-live').first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(15000);
  const bpm = Number((await tid('hr-bpm').first().textContent()) || 0);
  ok('simulated strap streams heart rate', bpm > 60 && bpm < 200, String(bpm));
  await shot('w16-live-hr-zones.png');
  await tid('hr-save').scrollIntoViewIfNeeded();
  await tid('hr-save').click();
  ok('live session saves to Move', await tid('hr-saved').first().waitFor({ timeout: 5000 }).then(() => true, () => false));

  await nav('/measure', 'measure');
  ok('measure names its sources', await tid('measure-sources').count());
  await shot('w17-measure-sources.png');
  await nav('/sleep', 'sleep');
  ok('sleep links to stages', await tid('sleep-stages-link').count());
  await nav('/toolkit', 'more');
  await scrollTo('mod-devices');
  await shot('w18-all-modules.png');

  const relevant = errors.filter((e) => !/favicon|DevTools|preventAutoHide|keep awake|Wake Lock|wakeLock|NotAllowedError|notifications/i.test(e));
  ok('no page errors', relevant.length === 0, relevant.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(OUT, 'verify-results.json'), JSON.stringify({ viewport: `${VW}x${VH}`, results, errors }, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
