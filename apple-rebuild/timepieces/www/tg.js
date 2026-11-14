/* Vilasi Timepieces — timegrapher signal engine.
   Feed it mono audio samples; it finds tick onsets, locks to a beat rate,
   and reports rate (s/day) and beat error (ms). No audio ever leaves the device or is stored. */
'use strict';
var TG_BPH = [18000, 21600, 28800, 36000];
function TGEngine(sampleRate) {
  this.sr = sampleRate;
  this.n = 0;               // samples seen
  this.env = 0;             // fast envelope
  this.noise = 0;           // slow noise floor
  this.peak = 0;            // typical tick peak
  this.lastOn = -1e9;
  this.refr = Math.round(sampleRate * 0.068);
  this.aEnv = 1 - Math.exp(-1 / (sampleRate * 0.00025));
  this.aNoise = 1 - Math.exp(-1 / (sampleRate * 0.4));
  this.trk = 0; this.trkMax = 0;
  this.ticks = [];          // onset times (s)
  this.lvl = new Float32Array(600); this.lvlI = 0; this.lvlAcc = 0; this.lvlN = 0; this.lvlStep = Math.round(sampleRate / 300);
  this.res = null;
}
TGEngine.prototype.feed = function (buf) {
  var env = this.env, noise = this.noise, aE = this.aEnv, aN = this.aNoise, n = this.n, a, thr, i, len = buf.length;
  for (i = 0; i < len; i++, n++) {
    a = buf[i]; if (a < 0) a = -a;
    env += (a - env) * aE;
    if (this.trk > 0) {
      if (env > this.trkMax) this.trkMax = env;
      if (--this.trk === 0) this.peak = this.peak ? this.peak * 0.8 + this.trkMax * 0.2 : this.trkMax;
    } else {
      noise += (env - noise) * aN;
    }
    if (n - this.lastOn > this.refr) {
      thr = noise * 4; if (this.peak * 0.3 > thr) thr = this.peak * 0.3; if (thr < 0.0015) thr = 0.0015;
      if (env > thr) {
        this.lastOn = n; this.ticks.push(n / this.sr);
        this.trk = Math.round(this.sr * 0.02); this.trkMax = env;
      }
    }
    if (env > this.lvlAcc) this.lvlAcc = env;
    if (++this.lvlN >= this.lvlStep) { this.lvl[this.lvlI] = this.lvlAcc; this.lvlI = (this.lvlI + 1) % this.lvl.length; this.lvlAcc = 0; this.lvlN = 0; }
  }
  /* let the peak estimate fall if ticks stop, so a moved phone re-locks */
  if (n - this.lastOn > this.sr * 1.5) this.peak *= 0.9;
  this.env = env; this.noise = noise; this.n = n;
  if (this.ticks.length > 3000) this.ticks.splice(0, 1000);
};
TGEngine.prototype.now = function () { return this.n / this.sr; };
function tgMedian(a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
/* Analyse the last `win` seconds. Returns null until something periodic is found. */
TGEngine.prototype.analyse = function (win) {
  var now = this.now(), t = this.ticks.filter(function (x) { return x > now - (win || 40); });
  if (t.length < 8) { this.res = null; return null; }
  var d = [], i;
  for (i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  var med = tgMedian(d.slice(-40)), best = null, bd = 1;
  TG_BPH.forEach(function (b) { var T = 3600 / b, e = Math.abs(Math.log(med / T)); if (e < bd) { bd = e; best = b; } });
  if (!best || bd > 0.06) { this.res = null; return null; }
  var T = 3600 / best, acc = null, start;
  for (start = 0; start < Math.min(6, t.length - 8); start++) {
    var pts = [{ n: 0, t: t[start] }], ref = t[start], nn = 0, rej = 0;
    for (i = start + 1; i < t.length; i++) {
      var k = (t[i] - ref) / T, rk = Math.round(k);
      if (rk >= 1 && Math.abs(k - rk) < 0.2 && rk < 12) { nn += rk; ref = t[i]; pts.push({ n: nn, t: t[i] }); }
      else if (rk >= 12) { pts = [{ n: 0, t: t[i] }]; ref = t[i]; nn = 0; }
      else rej++;
    }
    if (pts.length >= 8 && pts.length >= (t.length - start) * 0.5) { acc = pts; break; }
  }
  if (!acc) { this.res = null; return null; }
  /* least squares t = a + b*n */
  var N = acc.length, sn = 0, st = 0, snn = 0, snt = 0, n0 = acc[0].n, t0 = acc[0].t;
  for (i = 0; i < N; i++) { var x = acc[i].n - n0, y = acc[i].t - t0; sn += x; st += y; snn += x * x; snt += x * y; }
  var den = N * snn - sn * sn; if (!den) { this.res = null; return null; }
  var b = (N * snt - sn * st) / den, a = (st - b * sn) / N;
  var ev = [], od = [];
  for (i = 0; i < N; i++) { var r = (acc[i].t - t0) - (a + b * (acc[i].n - n0)); acc[i].r = r; (acc[i].n % 2 ? od : ev).push(r); }
  var beat = (ev.length > 2 && od.length > 2) ? Math.abs(tgMedian(ev) - tgMedian(od)) * 1000 : 0;
  var span = acc[N - 1].t - acc[0].t;
  this.res = { bph: best, T: T, period: b, rate: (T / b - 1) * 86400, beat: beat, span: span, count: N, pts: acc, snr: this.noise > 0 ? this.peak / this.noise : 0 };
  return this.res;
};

/* Practice signal: synthesises a movement so the tool can be tried without a watch or microphone. */
function TGSim(sampleRate, bph, rate, beatMs) {
  this.sr = sampleRate; this.T = 3600 / bph / (1 + rate / 86400); this.be = beatMs / 1000;
  this.k = 0; this.next = 0.05; this.n = 0; this.active = [];
}
TGSim.prototype.make = function (len) {
  var out = new Float32Array(len), i, j, sr = this.sr;
  for (i = 0; i < len; i++, this.n++) {
    var tt = this.n / sr, v = (Math.random() - 0.5) * 0.004;
    if (tt >= this.next) {
      var s0 = this.n;
      this.active.push({ s: s0, a: 0.05 }, { s: s0 + Math.round(sr * 0.004), a: 0.16 }, { s: s0 + Math.round(sr * 0.0105), a: 0.3 });
      this.k++; this.next = 0.05 + this.k * this.T + (this.k % 2 ? this.be : 0) + (Math.random() - 0.5) * 0.00006;
    }
    for (j = this.active.length - 1; j >= 0; j--) {
      var p = this.active[j], dt = (this.n - p.s) / sr;
      if (dt < 0) continue;
      if (dt > 0.006) { this.active.splice(j, 1); continue; }
      v += p.a * Math.exp(-dt / 0.0009) * (Math.random() * 2 - 1);
    }
    out[i] = v;
  }
  return out;
};
