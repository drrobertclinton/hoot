// Screenshots and a smoke check of the 1.2 screens (Peak Cycle home, Weekly Experiment, Performer Day, Why this
// number, Toolkit, Course) from the web demo build, at phone size.
// 1) node scripts/build-demo-web.js   2) node scripts/shots-peak.js [outDir]
// Starts its own static server on a free port. Env: SHOT_DPR (2), SHOT_CLOCK (ISO time to pin "now").
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'screenshots'));
const PORT = Number(process.env.SHOT_PORT || 8241);
const BASE = `http://localhost:${PORT}`;
const CLOCK = process.env.SHOT_CLOCK || '';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const ok = (name, cond) => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
};

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve-web.js'), path.join(__dirname, '..', 'dist-demo'), String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(process.env.SHOT_DPR || 2), isMobile: true, hasTouch: true });
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
    // `tall` is the viewport height for a whole-screen capture (the app scrolls inside its own view, not the page).
    const shot = async (name, tall = 0) => {
      if (tall) await page.setViewportSize({ width: 390, height: tall });
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, name) });
      if (tall) await page.setViewportSize({ width: 390, height: 844 });
      console.log('  saved', name);
    };
    const nav = async (route, waitId) => {
      await page.goto(BASE + route);
      await tid(waitId).first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(700);
    };

    await nav('/', 'today');
    ok('home is the Peak Cycle loop, not a ring dashboard', (await tid('peak-cycle').count()) && !(await page.getByTestId('today-rings').count()));
    ok('six steps on the loop', (await page.locator('[data-testid^="step-"]').count()) === 6);
    ok('floating dock replaces the tab bar', (await tid('dock').count()) && (await tid('tab-today').count()) && (await tid('tab-learn').count()) && (await tid('tab-more').count()));
    ok('this week’s module, actions, signal, experiment and performer cards', (await tid('today-lesson').count()) && (await tid('today-actions').count()) && (await tid('today-signal').count()) && (await tid('today-experiment').count()) && (await tid('today-performer').count()));
    await shot('01-peak-cycle-home.png');
    await tid('step-review').click();
    ok('tapping a station explains that step', (await tid('cycle-ask').innerText()).includes('What did I learn'));
    await tid('step-review').click();
    await tid('today-signal').scrollIntoViewIfNeeded();
    await shot('02-peak-cycle-signal.png');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('03-peak-cycle-home-full.png', 2300);

    await nav('/experiment', 'experiment');
    ok('experiment shows before/after and a verdict', (await tid('xp-chart').count()) && (await tid('xp-verdict').count()));
    ok('demo verdict is "Keep it"', (await tid('xp-headline').innerText()).trim() === 'Keep it');
    await shot('04-weekly-experiment.png');
    await tid('xp-verdict').scrollIntoViewIfNeeded();
    await shot('05-weekly-experiment-verdict.png');
    await shot('06-weekly-experiment-full.png', 2300);
    await tid('xp-keep').click();
    await tid('xp-t-bed-earlier').first().waitFor({ timeout: 5000 });
    ok('keeping closes the experiment and offers the next one', (await tid('xp-history').count()) === 1);
    await shot('07-weekly-experiment-pick.png');
    await tid('xp-t-breathe-evening').click();
    await tid('xp-start').click();
    await tid('xp-running').first().waitFor({ timeout: 5000 });
    await tid('xp-day-0').click();
    ok('a new experiment starts and a day can be marked done', (await tid('xp-headline').innerText()).includes('Not enough data'));

    await nav('/performer', 'performer');
    ok('performer day: countdown, budget and checklist', (await tid('pf-countdown').count()) && (await tid('pf-budget').count()) && (await tid('pf-checklist').count()));
    await shot('08-performer-day.png');
    const before = await tid('pf-budget').innerText();
    await tid('pf-voice-0.5').click();
    await page.waitForTimeout(300);
    ok('logging voice use spends the budget', (await tid('pf-budget').innerText()) !== before);
    await tid('pf-check-water').click();
    await tid('pf-checklist').scrollIntoViewIfNeeded();
    await shot('09-performer-day-sequence.png');
    await shot('10-performer-day-full.png', 3900);

    await nav('/why', 'why');
    ok('why this number: score, steps and formula', (await tid('why-score').count()) && (await tid('why-steps').count()) && (await page.locator('[data-testid^="why-row-"]').count()) >= 3);
    await shot('11-why-this-number.png');
    await shot('12-why-this-number-full.png', 2500);

    await nav('/', 'today');
    await tid('tab-more').click();
    await tid('more').first().waitFor({ timeout: 10000 });
    ok('toolkit files every module under a step', (await tid('sig-experiment').count()) && (await tid('mod-sleep').count()) && (await tid('mod-labs').count()) && (await tid('mod-rehearse').count()));
    await shot('13-toolkit.png');
    await tid('tab-learn').click();
    await tid('learn').first().waitFor({ timeout: 10000 });
    await shot('14-course.png');
    for (const [route, id] of [['/plan', 'plan'], ['/track', 'track'], ['/coach', 'coach'], ['/recover', 'recover'], ['/rehearse', 'rehearse'], ['/sleep', 'sleep'], ['/fuel', 'fuel'], ['/labs', 'labs'], ['/monitor', 'monitor'], ['/measure', 'measure'], ['/move', 'move'], ['/restore', 'restore'], ['/review', 'review'], ['/plan-builder', 'builder'], ['/settings', 'settings']]) {
      try {
        await nav(route, id);
        ok(`existing screen still opens: ${route}`, true);
      } catch {
        ok(`existing screen still opens: ${route}`, false);
      }
    }
    await nav('/recover', 'recover');
    await shot('15-recover-tide-gauge.png');
  } catch (e) {
    errors.push('script: ' + e.message);
  } finally {
    await browser.close();
    server.kill();
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed; ${errors.length} page errors`);
  errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  process.exit(failed.length || errors.length ? 1 : 0);
})();
