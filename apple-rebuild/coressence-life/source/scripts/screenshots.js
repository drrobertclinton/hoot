// End-to-end walk-through of the web build at phone size, saving screenshots of every module with the
// investor demo profile on, and checking the main flows work.
// 1) npx expo export --platform web   2) node scripts/serve-web.js dist 8237
// 3) PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/screenshots.js http://localhost:8237
// Env: SHOT_DIR, SHOT_W, SHOT_H, SHOT_DPR, PLAYWRIGHT_CORE (path to playwright if installed globally)
const path = require('path');
const fs = require('fs');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright'));
}

const BASE = process.argv[2] || 'http://localhost:8237';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', 'screenshots');
const VW = Number(process.env.SHOT_W || 430);
const VH = Number(process.env.SHOT_H || 932);
const DPR = Number(process.env.SHOT_DPR || 3);
const CLOCK = process.env.SHOT_CLOCK || '2026-10-18T10:30:00';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await context.addInitScript((iso) => {
    const fixed = new Date(iso).getTime();
    const RealDate = Date;
    const offset = fixed - RealDate.now();
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
  // Stand-in for the App Store / Google Play (RevenueCat), so the Coressence+ purchase flow can be exercised.
  const ts = require('typescript');
  const cfgSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'billing', 'config.ts'), 'utf8');
  const cfgMod = { exports: {} };
  new Function('exports', 'module', ts.transpileModule(cfgSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(cfgMod.exports, cfgMod);
  await context.addInitScript({ path: path.join(__dirname, 'mockPurchases.js') });
  await context.addInitScript((catalog) => {
    window.__PURCHASES_MOCK__ = window.__makePurchasesMock(catalog, { persistKey: '__store_account' });
  }, cfgMod.exports.CATALOG);

  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  const vt = (...a) => page.getByText(...a).filter({ visible: true });
  const tid = (id) => page.getByTestId(id).filter({ visible: true });
  const shot = async (name, fullPage = false) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, name), fullPage });
    console.log('  saved', name);
  };
  const go = async (route, waitId) => {
    await page.goto(BASE + route);
    if (waitId) await tid(waitId).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
  };
  const scrollTo = async (text) => {
    await vt(text).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
  };

  // ---- Onboarding
  await go('/', 'onboarding');
  ok('onboarding shows', await vt('Live and perform at your peak').count());
  await shot('01-onboarding.png');

  // ---- Demo profile
  await tid('ob-demo').click();
  await tid('today').waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  ok('today shows demo badge', await vt('Demo profile').count());
  ok('peak cycle loop renders', await tid('peak-cycle').count());
  ok('today has coach notes', (await page.locator('[data-testid^="note-"]').count()) >= 1);
  await shot('02-today.png');
  await scrollTo('Biggest signal this week');
  await shot('02b-today-plan.png');
  await scrollTo('Log something');
  await shot('02c-today-streaks.png');

  // ---- Coressence+ paywall (free account), then subscribe through the store stand-in
  await go('/plus', 'plus');
  ok('paywall shows trial and annual price', await vt(/14-day free trial, then \$119\.99 per year/).count());
  ok('paywall shows monthly price', await vt(/\$14\.99 \/ month/).count());
  ok('paywall has Restore, Terms and Privacy', (await tid('restore').count()) && (await vt('Terms of Use').count()) && (await vt('Privacy Policy').count()));
  await shot('03-coressence-plus.png');
  await tid('subscribe').click();
  await vt(/Coressence\+ is active/).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  ok('subscribing unlocks All-Access', await vt(/Coressence\+ is active/).count());

  // ---- Faith content on (Restore), off by default
  await go('/settings', 'settings');
  await scrollTo('Faith content');
  await tid('faith-toggle').click();
  await page.waitForTimeout(300);

  // ---- Modules
  await go('/measure', 'measure');
  ok('measure shows demo data and trends', (await vt('Demo data').count()) && (await tid('measure-chart').count()));
  await shot('04-measure.png');

  await go('/track', 'track');
  ok('track shows habits and trend', (await vt('Morning daylight').count()) && (await tid('track-chart').count()));
  await shot('05-track.png');
  await scrollTo('Patterns');
  ok('track patterns (premium)', await tid('track-patterns').count());
  await shot('05b-track-patterns.png');

  await go('/checkin', 'checkin');
  await tid('ci-energy-4').click();
  await shot('06-checkin.png');
  await tid('ci-save').click();
  await page.waitForTimeout(400);

  await go('/move', 'move');
  ok('move shows routines', await vt('Pilates core basics').count());
  await shot('07-move.png');
  await go('/routine/pilates-core', 'routine');
  await tid('routine-start').click();
  await page.waitForTimeout(2600);
  ok('routine timer runs', !/^1:00$/.test((await tid('routine-countdown').textContent()) || ''));
  await shot('08-routine-player.png');

  await go('/fuel', 'fuel');
  ok('fuel shows water ring and meals', (await vt('Water today').count()) && (await vt('Meals today').count()));
  await tid('water-add').click();
  await shot('09-fuel.png');
  await scrollTo('Eating window (optional)');
  await shot('09b-fuel-window.png');

  await go('/sleep', 'sleep');
  ok('sleep shows nights and advice', (await page.locator('[data-testid^="night-"]').count()) >= 3 && (await vt(/worth raising with a clinician/).count()));
  await shot('10-sleep.png');
  await scrollTo('Sleep sound check');
  await shot('10b-sleep-sound.png');
  await page.locator('[data-testid^="night-"]').first().click();
  await tid('night').waitFor();
  ok('night interpretation shown', (await tid('night-interpretation').count()) && (await vt(/not a sleep test/).count()));
  await shot('11-sleep-night.png');

  await go('/recover', 'recover');
  ok('recover shows readiness', await vt('readiness').count());
  await shot('12-recover.png');

  await go('/restore', 'restore');
  ok('restore shows Scripture when faith is on', await tid('scripture').count());
  await shot('13-restore.png');
  await go('/breathe', 'breathe');
  await tid('breathe-start').click();
  await page.waitForTimeout(2200);
  await shot('14-breathe.png');

  await go('/rehearse', 'rehearse');
  ok('rehearse shows warmups and voice log', (await vt('Vocal warmup').count()) && (await tid('voice-form').count()));
  await shot('15-rehearse.png');
  await scrollTo('Voice load');
  await shot('15b-rehearse-voice.png');

  await go('/coach', 'coach');
  ok('coach shows cycle', await vt(/Step \d of 7/).count());
  await shot('16-coach.png');
  await go('/review', 'review');
  ok('weekly review numbers', await vt('Sleep per night').count());
  await shot('17-weekly-review.png');

  await go('/plan', 'plan');
  ok('plan summary shown', await tid('plan-summary').count());
  await shot('18-plan.png');
  await go('/plan-builder', 'builder');
  await tid('b-next').click();
  await tid('b-next').click();
  await shot('19-plan-builder.png');

  await go('/learn', 'learn');
  ok('learn lists lessons', (await vt('The peak cycle').count()) && (await vt('Voice load and the performance week').count()));
  await shot('20-learn.png');
  await go('/lesson/l5', 'lesson');
  await shot('21-lesson.png');
  await tid('lesson-next').click();
  await tid('lesson-next').click();
  await tid('opt-1').click();
  ok('knowledge check feedback', await vt('That’s right.').count());
  await shot('22-lesson-check.png');

  await go('/labs', 'labs');
  ok('labs list results', await vt('LDL cholesterol').count());
  await shot('23-labs.png');
  await go('/labs/ldl', 'lab-test');
  await shot('24-lab-trend.png');

  await go('/md', 'md');
  ok('MD is clearly separate', await vt('A separate medical service').count());
  await shot('25-md.png');
  await go('/shop', 'shop');
  ok('shop has affiliate disclosure', await vt(/Affiliate disclosure/).count());
  await shot('26-shop.png');
  await go('/toolkit', 'more');
  await shot('27-all-modules.png');

  await go('/settings', 'settings');
  await scrollTo('Investor demo');
  await shot('28-settings-demo.png');
  await go('/privacy', 'privacy');
  await shot('29-privacy.png');

  // ---- Dark mode
  await go('/settings', 'settings');
  await scrollTo('Appearance');
  await tid('appearance-dark').click();
  await go('/', 'today');
  await shot('30-today-dark.png');
  await go('/sleep', 'sleep');
  await shot('31-sleep-dark.png');
  await go('/settings', 'settings');
  await scrollTo('Appearance');
  await tid('appearance-system').click();

  // ---- Clean empty state (demo off)
  await scrollTo('Investor demo');
  await tid('demo-toggle').click();
  await page.waitForTimeout(400);
  await go('/', 'today');
  ok('empty state when demo is off', await vt('Start at step one').count());
  await shot('32-today-empty.png');
  await go('/measure', 'measure');
  ok('measure empty state', await vt('Nothing measured yet').count());
  await shot('33-measure-empty.png');

  // ---- Own data persists, demo stays separate
  await go('/', 'today');
  await tid('quick-water').click();
  await page.waitForTimeout(800);
  await page.reload();
  await tid('today').waitFor();
  await page.waitForTimeout(600);
  ok('own data saved and reloaded', await vt(/0\.25 L/).count());

  const relevant = errors.filter((e) => !/favicon|DevTools|preventAutoHide|keep awake|Wake Lock|wakeLock|NotAllowedError|notifications/i.test(e));
  ok('no page errors', relevant.length === 0, relevant.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(OUT, 'test-results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
