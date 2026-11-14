// Builds the investor web demo: a static export that opens straight into the demo profile (Coressence+ preview
// on) and runs from any folder on any web server (root or a sub-path such as /demos/coressence/).
//
// Usage: node scripts/build-demo-web.js [outDir]      (default: dist-demo)
//
// How it works: the app is exported with the placeholder base URL "/__CL_BASE__" (app.config.js). Afterwards the
// placeholder is replaced in the bundle with window.__CL_BASE__, which a small script in index.html works out from
// the page address, so every asset and route resolves relative to wherever index.html is served.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist-demo'));
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', CL_DEMO_WEB: '1', EXPO_PUBLIC_INVESTOR_DEMO: '1' },
});

const PH = '/__CL_BASE__';
const jsDir = path.join(out, '_expo', 'static', 'js', 'web');
let replaced = 0;
for (const f of fs.readdirSync(jsDir).filter((x) => x.endsWith('.js'))) {
  const p = path.join(jsDir, f);
  let s = fs.readFileSync(p, 'utf8');
  // "…/__CL_BASE__/x" -> (window.__CL_BASE__)+"/x". The escaped copy inside the embedded app manifest is left alone.
  s = s.replace(/(^|[^\\])"\/__CL_BASE__/g, (_m, pre) => {
    replaced++;
    return `${pre}(window.__CL_BASE__)+"`;
  });
  fs.writeFileSync(p, s);
}

const htmlPath = path.join(out, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const entry = /<script src="\/__CL_BASE__\/(_expo\/static\/js\/web\/[^"]+\.js)" defer><\/script>/.exec(html);
if (!entry) throw new Error('entry script not found in index.html');
const boot = `<script>
(function () {
  var p = location.pathname.replace(/\\/index\\.html$/, '');
  var saved = null;
  try { saved = sessionStorage.getItem('cl-base'); } catch (e) {}
  var base = saved !== null && p.indexOf(saved) === 0 ? saved : p.replace(/\\/+$/, '');
  try { sessionStorage.setItem('cl-base', base); } catch (e) {}
  window.__CL_BASE__ = base;
  var s = document.createElement('script');
  s.src = base + '/${entry[1].replace(/^_expo\//, 'xpo/')}';
  s.defer = true;
  document.body.appendChild(s);
})();
</script>`;
html = html.replace(entry[0], boot).replace(`href="${PH}/favicon.ico"`, 'href="favicon.ico"');
if (html.includes(PH)) throw new Error('placeholder left in index.html');
fs.writeFileSync(htmlPath, html);
// Some hosts reserve folder names that start with "_", so the bundle folder is published as "xpo".
fs.renameSync(path.join(out, '_expo'), path.join(out, 'xpo'));
if (/_expo\//.test(fs.readFileSync(htmlPath, 'utf8'))) throw new Error('index.html still points at _expo/');
console.log(`Investor demo web build ready in ${out} (${replaced} bundle references made relative).`);
