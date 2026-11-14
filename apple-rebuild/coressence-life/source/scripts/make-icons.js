// Renders the app icon, Android adaptive icon layers, splash marks and favicon from the
// Coressence B wave logo (assets/brand/*.png, cut from Coressence_Logo_B_Concept.png).
// Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/make-icons.js
// Needs Playwright or playwright-core (set PLAYWRIGHT_CORE to its path if installed globally).
const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright'));
}

const A = path.join(__dirname, '..', 'assets');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(A, 'brand', f)).toString('base64');
const NAVY = '#0B2A3C';
const DEEP = '#0E4A6B';
const TEAL = '#14A3A0';

const gradient = `linear-gradient(145deg, ${DEEP} 0%, #0F6E8C 55%, ${TEAL} 100%)`;

// Each entry: file, size, background, html for the content.
const jobs = [
  { file: 'icon.png', size: 1024, bg: gradient, img: 'wave-white.png', w: 0.56 },
  { file: 'android-icon-foreground.png', size: 1024, bg: 'transparent', img: 'wave-white.png', w: 0.4 },
  { file: 'android-icon-background.png', size: 1024, bg: gradient },
  { file: 'android-icon-monochrome.png', size: 1024, bg: 'transparent', img: 'wave-white.png', w: 0.4 },
  { file: 'splash-icon.png', size: 1024, bg: 'transparent', img: 'logo-navy.png', w: 0.94 },
  { file: 'splash-icon-dark.png', size: 1024, bg: 'transparent', img: 'logo-white.png', w: 0.94 },
  { file: 'notification-icon.png', size: 96, bg: 'transparent', img: 'wave-white.png', w: 0.8 },
  { file: 'favicon.png', size: 48, bg: gradient, img: 'wave-white.png', w: 0.62 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
    const inner = j.img ? `<img src="${b64(j.img)}" style="width:${Math.round(j.w * j.size)}px;height:auto;display:block"/>` : '';
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><div style="width:${j.size}px;height:${j.size}px;background:${j.bg};display:flex;align-items:center;justify-content:center">${inner}</div></body></html>`,
    );
    await page.screenshot({ path: path.join(A, j.file), omitBackground: j.bg === 'transparent' });
    await page.close();
    console.log('wrote', j.file);
  }
  await browser.close();
})();
