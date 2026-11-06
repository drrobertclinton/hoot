// Falling-notes view for keyboards: bars drop onto the keys they belong to.
export function fallingNotes(canvas, kb, notes, { secsVisible = 3 } = {}) {
  // notes: [{ midi, t (sec from start), dur (sec), i (event index), finger }]
  const ctx = canvas.getContext('2d');
  let state = {}; let raf = 0; let timeFn = () => 0;
  const css = getComputedStyle(document.documentElement);
  const col = { a: css.getPropertyValue('--accent').trim() || '#5b4cf0', b: css.getPropertyValue('--coral').trim() || '#ff6a4d', ok: css.getPropertyValue('--good').trim() || '#12b5a6', line: css.getPropertyValue('--line').trim() || '#ddd', ink: css.getPropertyValue('--ink').trim() || '#111' };
  function size() {
    const r = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(10, r.width * dpr); canvas.height = Math.max(10, r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    const r = canvas.getBoundingClientRect(); const W = r.width, H = r.height; const scale = W / kb.width;
    ctx.clearRect(0, 0, W, H);
    const now = timeFn(); const pps = H / secsVisible;
    ctx.strokeStyle = col.line; ctx.lineWidth = 1;
    for (let k = 1; k < secsVisible * 2; k++) { const y = H - k * pps / 2; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const n of notes) {
      const p = kb.pos[n.midi]; if (!p) continue;
      const yBot = H - (n.t - now) * pps; const h = Math.max(8, n.dur * pps - 3); const yTop = yBot - h;
      if (yBot < -10 || yTop > H + 4) continue;
      const w = (p.w - 6) * scale; const x = p.x * scale - w / 2;
      const st = state[n.i];
      ctx.fillStyle = st === 'ok' ? col.ok : st === 'bad' ? col.b : n.black ? col.b : col.a;
      ctx.globalAlpha = st === 'ok' ? 0.55 : 1;
      roundRect(ctx, x, yTop, w, h, Math.min(8, w / 2)); ctx.fill();
      if (n.finger && h > 18) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 1; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(n.finger), x + w / 2, yBot - 6); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col.ink; ctx.globalAlpha = 0.18; ctx.fillRect(0, H - 3, W, 3); ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  size(); const ro = new ResizeObserver(size); ro.observe(canvas);
  return {
    start(fn) { timeFn = fn; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); },
    mark(i, st) { state[i] = st; },
    reset() { state = {}; },
    stop() { cancelAnimationFrame(raf); ro.disconnect(); },
  };
}
