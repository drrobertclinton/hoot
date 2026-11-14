const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const shot = n => path.join(root, 'screenshots', n + '.png');

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errs.push('NETWORK ' + r.url()); });
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  const w = ms => p.waitForTimeout(ms);
  await p.addInitScript(() => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#toast{display:none}'; document.head.appendChild(s); }); });
  await p.goto('file://' + path.join(root, 'www/index.html'));
  await w(300);
  ok(await p.isVisible('#gate.show'), 'age gate shown');
  await p.screenshot({ path: shot('00-age-gate') });
  await p.click('[data-act=gateNo]'); await w(100); ok(await p.isVisible('text=Not just yet'), 'under-21 screen');
  await p.click('[data-act=gateBack]'); await p.click('[data-act=gateYes]'); await w(300);
  ok(!(await p.isVisible('#gate.show')), 'gate dismissed');
  ok(await p.locator('.slot').count() === 24 && await p.locator('.slot.has').count() === 12, '4x6 rack with 12 bottles');
  await p.screenshot({ path: shot('01-rack-home') });

  // search lights up
  await p.fill('#q', 'pinot'); await w(300);
  ok(await p.locator('.slot.lit').count() === 2, 'search lights matching slots: ' + await p.locator('.slot.lit').count());
  await p.screenshot({ path: shot('02-search-lit') });
  await p.click('.rchip >> nth=0'); await w(500);
  ok(await p.locator('.slot.pulse').count() === 1, 'find pulses slot');
  await p.screenshot({ path: shot('03-find-pulse') });
  await p.click('[data-act=clearSearch]'); await w(200);

  // drag A1 -> A3 (empty)
  const box = async sel => { const b = await p.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  let a = await box('.slot[data-r="0"][data-c="0"]'), b = await box('.slot[data-r="0"][data-c="2"]');
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await w(500);
  await p.mouse.move((a.x + b.x) / 2, a.y + 30, { steps: 5 }); await p.mouse.move(b.x, b.y, { steps: 5 });
  await p.screenshot({ path: shot('04-drag-move') });
  await p.mouse.up(); await w(400);
  ok(await p.locator('.slot.has[data-r="0"][data-c="2"]').count() === 1 && await p.locator('.slot.has[data-r="0"][data-c="0"]').count() === 0, 'drag moved bottle A1 -> A3');
  ok(!(await p.isVisible('#sheet.show')), 'no sheet after drag');
  // swap A3 with A2
  a = await box('.slot[data-r="0"][data-c="2"]'); b = await box('.slot[data-r="0"][data-c="1"]');
  const idB = await p.getAttribute('.slot[data-r="0"][data-c="1"]', 'data-id');
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await w(500); await p.mouse.move(b.x, b.y, { steps: 6 }); await p.mouse.up(); await w(300);
  ok(await p.getAttribute('.slot[data-r="0"][data-c="2"]', 'data-id') === idB, 'drag swap');

  // bottle sheet
  await p.click('.slot[data-r="0"][data-c="1"]'); await w(500);
  ok(await p.isVisible('#sheet.show .bl h3'), 'bottle sheet');
  await p.screenshot({ path: shot('05-bottle-label') });
  // label photo upload
  const png = path.join(root, 'tools', 'label.png');
  await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const x = c.getContext('2d'); x.fillStyle = '#f4ead6'; x.fillRect(0, 0, 900, 1200); x.fillStyle = '#6e1629'; x.fillRect(60, 60, 780, 1080); x.fillStyle = '#f0b95a'; x.font = 'bold 120px Georgia'; x.textAlign = 'center'; x.fillText('STAG', 450, 520); x.fillText('HOLLOW', 450, 680); window.__png = c.toDataURL('image/png'); });
  fs.writeFileSync(png, Buffer.from((await p.evaluate(() => window.__png)).split(',')[1], 'base64'));
  await p.setInputFiles('#sheet input[capture]', png); await w(800);
  ok(await p.isVisible('#sheet .bl-photo'), 'label photo stored');
  const lab = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('cellartable.v1.state')); const b = s.bottles.find(x => x.label); return b.label.slice(0, 23) + ' len ' + b.label.length; });
  console.log('     label:', lab);
  await p.screenshot({ path: shot('06-label-photo') });
  // edit
  await p.click('[data-act=edit]'); await w(400);
  await p.fill('#bform [name=value]', '120'); await p.click('#bform [data-t=red]');
  await p.screenshot({ path: shot('07-edit-form') });
  await p.click('#bform button[type=submit]'); await w(400);
  // move mode
  await p.click('.slot[data-r="0"][data-c="1"]'); await w(400); await p.click('[data-act=moveStart]'); await w(300);
  ok(await p.isVisible('.banner'), 'move banner'); await p.click('.slot[data-r="3"][data-c="0"]'); await w(300);
  ok(await p.locator('.slot.has[data-r="3"][data-c="0"]').count() === 1, 'tap-to-move');
  // add bottle to empty slot
  await p.click('.slot[data-r="3"][data-c="2"]'); await w(400);
  await p.fill('#bform [name=name]', 'Etna Rosso'); await p.fill('#bform [name=producer]', 'Terre Nere'); await p.fill('#bform [name=grape]', 'Nerello Mascalese'); await p.fill('#bform [name=price]', '28');
  await p.click('#bform button[type=submit]'); await w(400);
  ok(await p.locator('.slot.has').count() === 13, 'bottle added');

  // drawer
  await p.click('#drawerHandle'); await w(500);
  ok(await p.isVisible('#drawer.open'), 'drawer opens');
  await p.screenshot({ path: shot('08-drawer') });
  await p.click('[data-tool=timeline]'); await w(600);
  ok(await p.locator('.tl-row').count() === 13, 'timeline rows');
  await p.screenshot({ path: shot('09-timeline') });
  await p.click('[data-g=past]'); await w(500);
  await p.click('[data-act=rules]'); await w(400);
  await p.fill('[name=b-rose]', '6'); await p.screenshot({ path: shot('10-window-rules') });
  await p.click('#rform button[type=submit]'); await w(400);
  ok(await p.locator('.tl-row.past').count() === 1, 'rule override changes groups: past=' + await p.locator('.tl-row.past').count());
  await p.click('.tl-row >> nth=0'); await w(400); ok(await p.isVisible('#sheet.show'), 'timeline row opens bottle'); await p.click('#sheet .x'); await w(300);
  await p.click('[data-act=pageClose]'); await w(400);

  // pairing
  await p.click('#drawerHandle'); await w(400); await p.click('[data-tool=pairing]'); await w(600);
  ok(await p.locator('#pwSvg .seg').count() === 40, '40 dishes on wheel');
  ok(await p.locator('.own').count() > 0, 'owned matches for ribeye: ' + await p.locator('.own').count());
  await p.screenshot({ path: shot('11-pairing-wheel') });
  await p.click('[data-act=spin]'); await w(3000);
  const d1 = await p.textContent('.dish h3'); ok(d1 && d1 !== '…' && d1 !== 'Grilled ribeye', 'spin lands on ' + d1);
  await p.screenshot({ path: shot('12-pairing-spin') });
  // drag wheel
  await p.mouse.move(300, 200); await p.mouse.down(); await p.mouse.move(120, 200, { steps: 8 }); await p.mouse.up(); await w(1000);
  const d2 = await p.textContent('.dish h3'); ok(d2 !== d1, 'drag rotates to ' + d2);
  await p.click('.pick:has-text("Oysters")'); await w(1000);
  ok(await p.textContent('.dish h3') === 'Oysters', 'pick dish');
  await p.screenshot({ path: shot('13-pairing-pick') });
  await p.click('[data-act=pairLight]'); await w(500);
  ok(await p.locator('.slot.lit').count() >= 1, 'pairing lights rack: ' + await p.locator('.slot.lit').count());
  await p.screenshot({ path: shot('14-pairing-lit-rack') });
  await p.click('[data-act=clearLit]'); await w(200);

  // tasting
  await p.click('.slot.has >> nth=2'); await w(400); const tname = await p.textContent('#sheet .bl h3');
  await p.click('[data-act=taste]'); await w(600);
  await p.click('.dchip >> nth=0'); await p.click('.aw .cat[data-i="5"]'); await w(100); await p.click('.dchip >> nth=3'); await p.click('.aw .ds[data-n="vanilla"]'); await w(200);
  ok(await p.textContent('.aw .hubn') === '3', 'aroma wheel picks 3');
  await p.screenshot({ path: shot('15-aroma-wheel') });
  await p.evaluate(() => { const r = document.querySelector('#scoreRange'); r.value = 93; r.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await p.textContent('#scoreNum') === '93', 'score slider');
  await p.click('[data-m="5"]'); await p.click('[data-act=tStar][data-n="4"]'); await p.click('#scoreWrap [data-m="100"]');
  await p.fill('#tWho', 'Maya and Jon'); await p.fill('#tNotes', 'Silky, long finish. Perfect with the roast.');
  await p.locator('#tNotes').scrollIntoViewIfNeeded(); await p.screenshot({ path: shot('16-tasting-score') });
  await p.click('[data-act=tSave][data-drunk="1"]'); await w(600);
  ok(await p.locator('.jr').count() === 2, 'journal has entry'); ok((await p.textContent('.jr >> nth=0')).includes(tname), 'journal names bottle');
  await p.screenshot({ path: shot('17-journal') });
  await p.click('[data-act=pageClose]'); await w(400);
  ok(await p.locator('.slot.has').count() === 12, 'drunk bottle left rack');

  // stats
  await p.click('#drawerHandle'); await w(400); await p.click('[data-tool=stats]'); await w(600);
  await p.screenshot({ path: shot('18-stats') });
  await p.fill('[data-val] >> nth=3', '99'); await p.keyboard.press('Tab'); await w(300);
  await p.locator('.valrow >> nth=2').scrollIntoViewIfNeeded(); await p.screenshot({ path: shot('19-stats-values') });
  await p.click('[data-act=pageClose]'); await w(400);

  // racks
  await p.click('.racktab.plus'); await w(500);
  await p.click('[data-act=rAdd]'); await w(300); ok(await p.locator('.rk').count() === 2, 'rack added');
  await p.click('.rk >> nth=1 >> [data-f=cols][data-d="1"]'); await w(200);
  await p.click('.rk >> nth=0 >> [data-f=rows][data-d="-1"]'); await w(300);
  await p.screenshot({ path: shot('20-racks') });
  await p.click('.rk >> nth=1 >> [data-act=rShow]'); await w(500);
  ok(await p.locator('.slot').count() === 15, 'second rack 3x5');
  // drag onto rack tab
  await p.click('.racktab >> nth=0'); await w(300);
  a = await box('.slot.has >> nth=0'); b = await box('.racktab >> nth=1');
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await w(500); await p.mouse.move(b.x, b.y, { steps: 8 }); await p.mouse.up(); await w(400);
  await p.click('.racktab >> nth=1'); await w(300); ok(await p.locator('.slot.has').count() === 1, 'drag to other rack tab');
  await p.screenshot({ path: shot('21-second-rack') });
  await p.click('.racktab >> nth=0'); await w(200);

  // settings
  await p.click('#drawerHandle'); await w(400); await p.click('[data-tool=settings]'); await w(500);
  await p.screenshot({ path: shot('22-settings') });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=export]')]);
  ok(dl.suggestedFilename().endsWith('.json'), 'export ' + dl.suggestedFilename());
  const exp = path.join(root, 'tools', 'export.json'); await dl.saveAs(exp);
  await p.click('[data-act=clearSeed]'); await w(200); await p.click('#dlgOk'); await w(300);
  const left = await p.evaluate(() => JSON.parse(localStorage.getItem('cellartable.v1.state')).bottles.length); ok(left === 1, 'seed cleared, user bottle stays: ' + left);
  await p.setInputFiles('#importFile', exp); await w(400); await p.click('#dlgOk'); await w(400);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('cellartable.v1.state')).bottles.length) === 12, 'import restores');
  // reload persistence
  await p.reload(); await w(400); ok(!(await p.isVisible('#gate.show')) && await p.locator('.slot.has').count() >= 10, 'persists across reload');
  await p.click('#drawerHandle'); await w(400); await p.click('[data-tool=settings]'); await w(400);
  await p.click('[data-act=wipe]'); await w(200); await p.click('#dlgOk'); await w(400);
  ok(await p.isVisible('#gate.show'), 'wipe returns to gate'); await p.click('[data-act=gateYes]'); await w(300);
  ok(await p.locator('.slot.has').count() === 0, 'empty after wipe'); await p.screenshot({ path: shot('23-empty-rack') });
  await p.reload(); await w(300); ok(await p.locator('.slot.has').count() === 0, 'still empty after reload');

  // other widths
  for (const [W, H] of [[375, 667], [1024, 768]]) {
    const c2 = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const q = await c2.newPage();
    q.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    await q.goto('file://' + path.join(root, 'www/index.html')); await q.click('[data-act=gateYes]'); await q.waitForTimeout(300);
    const ov = await q.evaluate(() => document.documentElement.scrollWidth > innerWidth); ok(!ov, 'no h-overflow at ' + W);
    await q.screenshot({ path: shot('w' + W + '-home') });
    await q.click('#drawerHandle'); await q.waitForTimeout(400); await q.click('[data-tool=pairing]'); await q.waitForTimeout(500); await q.screenshot({ path: shot('w' + W + '-pairing') });
    await q.click('[data-act=pageClose]'); await q.waitForTimeout(300); await q.click('#drawerHandle'); await q.waitForTimeout(400); await q.click('[data-tool=timeline]'); await q.waitForTimeout(500); await q.screenshot({ path: shot('w' + W + '-timeline') });
    await c2.close();
  }
  console.log(errs.length ? 'CONSOLE/NET ISSUES:\n' + errs.join('\n') : 'console clean, no network requests');
  if (errs.length) process.exitCode = 1;
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
