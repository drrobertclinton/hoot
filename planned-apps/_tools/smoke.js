// usage: node smoke.js <url> <outprefix> [hash1,hash2..]
const { chromium } = require('playwright');
(async () => {
  const [url, out, hashes='' ] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:390,height:844}});
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(url); await p.waitForTimeout(600);
  await p.screenshot({path: out + '-home.png', fullPage: true});
  for (const h of hashes.split(',').filter(Boolean)) { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(400); await p.screenshot({path: `${out}-${h.replace(/\W/g,'_')}.png`, fullPage: true}); }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
