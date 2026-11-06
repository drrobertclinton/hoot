/* Native shell integration. Runs only inside the iOS/Android app; does nothing in a normal browser. */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;

  var CFG = window.__NATIVE_CFG__ || {};
  var platform = C.getPlatform();
  function plugin(name) {
    try { return (C.Plugins && C.Plugins[name]) || C.registerPlugin(name); } catch (e) { return null; }
  }
  var Share = plugin('Share');
  var Browser = plugin('Browser');
  var App = plugin('App');
  var StatusBar = plugin('StatusBar');
  var SplashScreen = plugin('SplashScreen');
  var Filesystem = plugin('Filesystem');
  var NativePrint = plugin('NativePrint');

  window.__IS_NATIVE = true;
  document.documentElement.classList.add('native-app', 'native-' + platform);

  /* 1. Service worker: the app bundle already holds every file, so caching is not needed.
        Stub registration so stale caches can never mask an app update. */
  try {
    if ('serviceWorker' in navigator) {
      try { navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {}); } catch (e) {}
    }
    var swStub = {
      register: function () { return new Promise(function () {}); },
      getRegistrations: function () { return Promise.resolve([]); },
      getRegistration: function () { return Promise.resolve(undefined); },
      addEventListener: function () {}, removeEventListener: function () {},
      controller: null, ready: new Promise(function () {})
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: function () { return swStub; } });
  } catch (e) {}

  /* 2. Status bar + splash */
  function hexLum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0;
    var n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  var bar = CFG.statusBar || '#000000';
  try {
    if (StatusBar) {
      StatusBar.setStyle({ style: hexLum(bar) > 0.6 ? 'LIGHT' : 'DARK' }).catch(function () {});
      if (platform === 'android') StatusBar.setBackgroundColor({ color: bar }).catch(function () {});
    }
  } catch (e) {}
  function hideSplash() { try { SplashScreen && SplashScreen.hide({ fadeOutDuration: 250 }).catch(function () {}); } catch (e) {} }
  if (document.readyState === 'complete') setTimeout(hideSplash, 150);
  else window.addEventListener('load', function () { setTimeout(hideSplash, 150); });
  setTimeout(hideSplash, 4000);

  /* 3. Files: write a Blob to the cache folder and return its native URI */
  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { var s = String(fr.result); res(s.slice(s.indexOf(',') + 1)); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }
  function safeName(n) { return String(n || 'file').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'file'; }
  function writeTemp(blob, name) {
    return blobToBase64(blob).then(function (data) {
      return Filesystem.writeFile({ path: safeName(name), data: data, directory: 'CACHE', recursive: true });
    }).then(function (r) { return r.uri; });
  }
  function shareFiles(files, title, text) {
    return Promise.all(files.map(function (f) { return writeTemp(f, f.name); })).then(function (uris) {
      return Share.share({ files: uris, title: title || undefined, text: text || undefined, dialogTitle: title || undefined });
    });
  }
  function isCancel(e) { return /cancel/i.test(String((e && (e.message || e.errorMessage)) || e)); }
  function abortErr() { try { return new DOMException('Share canceled', 'AbortError'); } catch (e) { var x = new Error('Share canceled'); x.name = 'AbortError'; return x; } }

  /* 4. Native share sheet in place of the web share API */
  try {
    navigator.canShare = function () { return true; };
    navigator.share = function (data) {
      data = data || {};
      var p;
      if (data.files && data.files.length) p = shareFiles(Array.prototype.slice.call(data.files), data.title, data.text);
      else p = Share.share({ title: data.title || undefined, text: data.text || undefined, url: data.url || undefined, dialogTitle: data.title || undefined });
      return p.then(function () {}, function (e) { throw isCancel(e) ? abortErr() : e; });
    };
  } catch (e) {}

  /* 5. Downloads (<a download>) become a share sheet, which includes Save to Files */
  function handleDownload(a) {
    var href = a.href, name = a.getAttribute('download') || 'download';
    fetch(href).then(function (r) { return r.blob(); }).then(function (blob) {
      return shareFiles([new File([blob], name, { type: blob.type || 'application/octet-stream' })], name);
    }).catch(function (e) { if (!isCancel(e)) console.warn('save failed', e); });
  }

  /* 6. External links open in the system browser view; mail/phone links go to the system */
  function isExternal(url) {
    try { var u = new URL(url, location.href); return /^https?:$/.test(u.protocol) && u.origin !== location.origin; } catch (e) { return false; }
  }
  function isSystemScheme(url) { return /^(mailto|tel|sms|maps):/i.test(url || ''); }
  function openExternal(url) {
    if (isSystemScheme(url)) { window.location.href = url; return; }
    if (Browser) Browser.open({ url: url, presentationStyle: 'popover' }).catch(function () { window.location.href = url; });
    else window.location.href = url;
  }
  function routeAnchor(a, ev) {
    if (!a || !a.getAttribute) return false;
    var raw = a.getAttribute('href'); if (!raw) return false;
    if (a.hasAttribute('download') && /^(blob|data):/i.test(a.href)) { ev && ev.preventDefault(); handleDownload(a); return true; }
    if (isExternal(a.href) || isSystemScheme(raw)) { ev && ev.preventDefault(); openExternal(a.href); return true; }
    if (a.target === '_blank') { /* same-app page: stay inside the app */
      ev && ev.preventDefault();
      var u = new URL(a.href, location.href);
      if (u.pathname === location.pathname) location.hash = u.hash; else location.href = u.href;
      return true;
    }
    return false;
  }
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented) return;
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (a) routeAnchor(a, ev);
  }, false);
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.isConnected && routeAnchor(this, null)) return;
    return origClick.apply(this, arguments);
  };
  var origOpen = window.open;
  window.open = function (url) {
    if (url && (isExternal(url) || isSystemScheme(url))) { openExternal(new URL(url, location.href).href); return null; }
    if (url) { var u = new URL(url, location.href); if (u.pathname === location.pathname) location.hash = u.hash; else location.href = u.href; return null; }
    return origOpen ? origOpen.apply(window, arguments) : null;
  };

  /* 7. Printing through the system print dialog (also offers Save as PDF) */
  if (NativePrint) {
    window.print = function () { NativePrint.print({ name: document.title || CFG.name || 'Print' }).catch(function (e) { console.warn('print failed', e); }); };
  }

  /* 8. Secondary pages (privacy, support) get a back control so they are never a dead end */
  if (!/\/(index\.html)?$/.test(location.pathname)) {
    var addBack = function () {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = '‹ Back'; b.setAttribute('aria-label', 'Back to the app');
      b.style.cssText = 'position:sticky;top:0;z-index:9999;display:block;margin:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;width:100%;text-align:left;font:600 17px -apple-system,system-ui,sans-serif;border:0;background:' + (CFG.statusBar || '#222') + ';color:' + (hexLum(CFG.statusBar) > 0.6 ? '#111' : '#fff') + ';';
      b.onclick = function () { if (history.length > 1) history.back(); else location.href = 'index.html'; };
      document.body.insertBefore(b, document.body.firstChild);
    };
    if (document.body) addBack(); else document.addEventListener('DOMContentLoaded', addBack);
    /* The app is already installed: drop "How do I install / Add to Home Screen" help */
    var dropInstallHelp = function () {
      var heads = document.querySelectorAll('h2, h3, h4, summary');
      for (var i = 0; i < heads.length; i++) {
        var hd = heads[i];
        if (!/\binstall\b/i.test(hd.textContent || '') || !/^\s*how\b/i.test(hd.textContent || '')) continue;
        if (hd.tagName === 'SUMMARY' && hd.parentNode && hd.parentNode.tagName === 'DETAILS') { hd.parentNode.remove(); continue; }
        var n = hd.nextElementSibling;
        while (n && !/^(H1|H2|H3|H4|DETAILS|SECTION)$/.test(n.tagName) && !(n.querySelector && n.querySelector('a[href*="privacy"]'))) { var nx = n.nextElementSibling; n.remove(); n = nx; }
        hd.remove();
      }
    };
    if (document.readyState !== 'loading') dropInstallHelp(); else document.addEventListener('DOMContentLoaded', dropInstallHelp);
  }
  /* Never offer a browser install prompt inside the app */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); e.stopImmediatePropagation(); }, true);

  /* 9. Android back button: close an open sheet/dialog first, then go back, then leave the app */
  if (App) {
    App.addListener('backButton', function (ev) {
      var dlg = document.querySelector('dialog[open]');
      if (dlg) { try { dlg.close(); } catch (e) {} return; }
      var mo = new MutationObserver(function () {});
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      var esc = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
      (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', esc));
      var changed = mo.takeRecords().length > 0; mo.disconnect();
      if (changed) return;
      var h = location.hash, atHome = !h || h === '#' || h === '#/' || h === '#/home' || h === '#home';
      var onIndex = /\/(index\.html)?$/.test(location.pathname);
      if (!onIndex) { history.length > 1 ? history.back() : (location.href = 'index.html'); return; }
      if (!atHome) { if (ev && ev.canGoBack) history.back(); else location.hash = '#/'; return; }
      App.minimizeApp().catch(function () { App.exitApp(); });
    });
  }
})();
