/* Vilasi "Share with a friend" button (ASCII only, so any page charset works).
   Home-screen and store apps have no browser Share button, so every app gets its own.
   Use: <script src="https://vilasi.co/js/share-button.js" defer
          data-title="App name" data-text="One line about it"
          data-url="(optional, default: this page)" data-pos="(optional: top-right, top-left, bottom-left)"></script>
   Order: phone share sheet, then Messages, then copy the link. */
(function () {
  if (window.__vilasiShare) return; window.__vilasiShare = 1;
  var me = document.currentScript || document.querySelector('script[src*="share-button.js"]');
  var d = (me && me.dataset) || {};
  function pageUrl() {
    if (d.url) return d.url;
    var c = document.querySelector('link[rel="canonical"]');
    var u = location.origin + location.pathname + location.search;
    return /^https?:/.test(u) ? u : (c && c.href) || u;
  }
  function title() { return d.title || (document.querySelector('meta[property="og:title"]') || {}).content || document.title; }
  function text() { return d.text || ('Check out ' + title() + '!'); }
  function toast(msg) {
    var t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(80px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#16213a;color:#fff;padding:10px 16px;border-radius:12px;font:600 15px system-ui,sans-serif;z-index:2147483647;max-width:90vw;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.3)';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function share() {
    var url = pageUrl(), tx = text(), full = tx + ' ' + url;
    var sms = function () { location.href = 'sms:?&body=' + encodeURIComponent(full); };
    var cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (cap) { cap.share({ title: title(), text: tx, url: url }).catch(function (e) { if (!/cancel/i.test((e && e.message) || '')) sms(); }); return; }
    if (navigator.share) { navigator.share({ title: title(), text: tx, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') sms(); }); return; }
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) { sms(); return; }
    try { navigator.clipboard.writeText(full).then(function () { toast('Link copied. Paste it in a text or email.'); }, function () { window.prompt('Copy this link:', url); }); }
    catch (e) { window.prompt('Copy this link:', url); }
  }
  window.vilasiShare = share;
  function mount() {
    if (document.getElementById('vilasi-share')) return;
    var pos = d.pos || 'bottom-right';
    var v = pos.indexOf('top') === 0 ? 'top:calc(12px + env(safe-area-inset-top))' : 'bottom:calc(16px + env(safe-area-inset-bottom))';
    var h = /left$/.test(pos) ? 'left:calc(14px + env(safe-area-inset-left))' : 'right:calc(14px + env(safe-area-inset-right))';
    var b = document.createElement('button');
    b.id = 'vilasi-share'; b.type = 'button';
    b.setAttribute('aria-label', 'Share ' + title() + ' with a friend');
    b.innerHTML = '<span aria-hidden="true" style="font-size:17px;line-height:1">\uD83D\uDCAC</span><span>Share</span>';
    b.style.cssText = 'position:fixed;' + v + ';' + h + ';z-index:2147483000;display:flex;align-items:center;gap:6px;padding:10px 15px;border:0;border-radius:999px;background:' + (d.bg || '#2459d6') + ';color:' + (d.fg || '#fff') + ';font:700 15px/1 system-ui,-apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.28);cursor:pointer;-webkit-tap-highlight-color:transparent;opacity:.95';
    b.onclick = share;
    // Sit above any bottom tab bar the app already has.
    function lift() {
      if (v.indexOf('bottom') !== 0) return;
      var lifted = 0, x = window.innerWidth - 30, y = window.innerHeight - 3;
      b.style.visibility = 'hidden';
      var els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
      b.style.visibility = '';
      for (var i = 0; i < els.length; i++) {
        var el = els[i], cs;
        while (el && el !== document.body && el !== document.documentElement) {
          cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.position === 'sticky') { lifted = Math.max(lifted, el.getBoundingClientRect().height); break; }
          el = el.parentElement;
        }
      }
      if (lifted > window.innerHeight / 3) lifted = 0;
      b.style.bottom = 'calc(' + (16 + Math.round(lifted)) + 'px + ' + (lifted ? '0px' : 'env(safe-area-inset-bottom)') + ')';
    }
    setTimeout(lift, 300); setTimeout(lift, 1500); window.addEventListener('resize', lift);
    var st = document.createElement('style'); st.textContent = '@media print{#vilasi-share{display:none!important}}';
    document.head.appendChild(st); document.body.appendChild(b);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
