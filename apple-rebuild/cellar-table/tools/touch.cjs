const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html')); await p.tap('[data-act=gateYes]'); await p.waitForTimeout(300);
  const c = await ctx.newCDPSession(p);
  const box = async sel => { const b = await p.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const a = await box('.slot[data-r="0"][data-c="0"]'), b = await box('.slot[data-r="3"][data-c="2"]');
  const T = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await T('touchStart', a.x, a.y); await p.waitForTimeout(550);
  for (let i = 1; i <= 8; i++) { await T('touchMove', a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8); await p.waitForTimeout(30); }
  await T('touchEnd'); await p.waitForTimeout(400);
  console.log('touch drag moved:', await p.locator('.slot.has[data-r="3"][data-c="2"]').count() === 1, 'sheet open:', await p.isVisible('#sheet.show'));
  await p.tap('.slot.has >> nth=1'); await p.waitForTimeout(400); console.log('tap opens sheet:', await p.isVisible('#sheet.show'));
  await p.tap('#sheet .x'); await p.waitForTimeout(300);
  // drawer swipe up
  const h = await box('#drawerHandle'); await T('touchStart', h.x, h.y); for (let i = 1; i <= 6; i++) { await T('touchMove', h.x, h.y - i * 40); await p.waitForTimeout(20); } await T('touchEnd'); await p.waitForTimeout(500);
  console.log('drawer swiped open:', await p.isVisible('#drawer.open'));
  await p.tap('[data-tool=pairing]'); await p.waitForTimeout(500);
  await T('touchStart', 300, 200); for (let i = 1; i <= 6; i++) { await T('touchMove', 300 - i * 30, 200); await p.waitForTimeout(20); } await T('touchEnd'); await p.waitForTimeout(1100);
  console.log('wheel swipe ->', await p.textContent('.dish h3'), '| errors:', errs.length);
  await br.close();
})();
