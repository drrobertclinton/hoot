// usage: node mkicons.js <icon.svg> <outdir>   -> icon-192.png, icon-512.png, apple-touch-icon.png
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [svgPath, out] = process.argv.slice(2); const svg = fs.readFileSync(svgPath, 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [n, s] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]) {
    await p.setViewportSize({width:s,height:s});
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg','<svg width="'+s+'" height="'+s+'"')}</body></html>`);
    await p.screenshot({path: path.join(out,n), omitBackground: true});
  }
  await b.close();
})();
