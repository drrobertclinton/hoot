// Vilasi paywall screen, locked-feature card and membership card. Plain DOM, no framework,
// so it drops into any of the apps. Prices, titles and trial terms come from the store at
// runtime; the catalog prices are only shown in the web preview.
import { periodWord } from './billing.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function installPaywall(billing) {
  const cfg = billing.config;
  const ui = cfg.paywall;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(ui.theme || {})) root.style.setProperty('--vb-' + k, v);

  let toastT;
  function toast(msg) {
    let t = document.getElementById('vb-toast');
    if (!t) { t = document.createElement('div'); t.id = 'vb-toast'; t.className = 'vb-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  const gateOpen = () => { try { return !ui.gate || ui.gate(); } catch { return false; } };
  const hookLive = (name) => !!(name && cfg.services && cfg.services[name] && cfg.services[name].enabled);

  function priceLine(x, sub) {
    if (!x) return '';
    if (!sub) return `${esc(x.priceString)}${ui.oneTimeSuffix ? ' ' + esc(ui.oneTimeSuffix) : ''}`;
    if (x.intro && !x.intro.free) return `${esc(x.intro.priceString)} <span>first ${esc(x.intro.firstText || x.intro.periodText)}</span><span class="vb-then">then ${esc(x.priceString)} / ${esc(periodWord(x.period))}</span>`;
    return `${esc(x.priceString)} <span>/ ${esc(periodWord(x.period))}</span>`;
  }
  // Launch (introductory) offer banner: shown only while the offer is switched on in the config
  // and the store reports an introductory price this person is eligible for.
  function launchHTML(products, tiers) {
    const L = cfg.launchOffer;
    if (!L || !L.enabled) return '';
    for (const t of tiers) {
      for (const [per, pid] of [['monthly', t.monthly], ['annual', t.annual]]) {
        const x = pid && products[pid];
        if (!x || !x.intro || x.intro.free) continue;
        return `<button type="button" class="vb-launch" data-vb="period" data-v="${per}"><span class="vb-launch-k">${esc(L.label || 'Launch offer')}</span>
          <b>${esc(x.intro.priceString)} for your first ${esc(x.intro.firstText || x.intro.periodText)}</b><span class="vb-launch-s">then ${esc(x.priceString)} per ${esc(periodWord(x.period))} · cancel anytime</span>${L.fine ? `<small>${esc(L.fine)}</small>` : ''}</button>`;
      }
    }
    return '';
  }
  function renewLine(x) {
    const per = periodWord(x.period);
    if (x.intro && x.intro.free) return `Free for ${esc(x.intro.periodText)}, then ${esc(x.priceString)} per ${esc(per)}. Renews automatically until you cancel.`;
    if (x.intro) return `${esc(x.intro.priceString)} for the first ${esc(x.intro.firstText || x.intro.periodText)}, then ${esc(x.priceString)} per ${esc(per)}. Renews automatically until you cancel.`;
    return `${esc(x.priceString)} per ${esc(per)}. Renews automatically until you cancel.`;
  }
  function disclosure() {
    if (billing.platform === 'android') {
      return `Payment is charged to your Google Play account when you confirm the purchase. Subscriptions renew automatically at the price and period shown unless you cancel before the renewal date. You can cancel or manage subscriptions in the Play Store app under Payments and subscriptions. If a free trial is offered, you are charged when the trial ends unless you cancel before then.`;
    }
    return `Payment is charged to your Apple Account when you confirm the purchase. A subscription renews automatically unless it is canceled at least 24 hours before the end of the current period, and your account is charged for the renewal within 24 hours before the period ends. You can manage or cancel subscriptions in your Apple Account settings at any time. If a free trial is offered, any unused part of the trial ends when you buy a subscription.`;
  }

  // ---------- paywall ----------
  let openEl = null;
  async function open(opts = {}) {
    if (!gateOpen()) return false;
    if (openEl) close();
    const prevFocus = document.activeElement;
    const scrim = document.createElement('div');
    scrim.className = 'vb-scrim';
    scrim.innerHTML = `<div class="vb-pw" role="dialog" aria-modal="true" aria-labelledby="vb-h"><button type="button" class="vb-x" data-vb="close" aria-label="Close">${CLOSE}</button><div class="vb-body"><p class="vb-loading">Loading plans…</p></div></div>`;
    document.body.appendChild(scrim);
    document.body.classList.add('vb-locked');
    openEl = { scrim, prevFocus, opts };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    openEl.onKey = onKey;
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    scrim.querySelector('.vb-x').focus();

    const products = await billing.loadProducts();
    if (!openEl || openEl.scrim !== scrim) return true;
    const state = { period: 'annual', pick: opts.focus || ui.defaultTier || (ui.tiers[0] && ui.tiers[0].id), busy: false };
    if (opts.focus && ui.oneTime && ui.oneTime.some((o) => o.id === opts.focus)) state.pick = (ui.tiers.find((t) => t.id === ui.defaultTier) || ui.tiers[0] || {}).id;
    const draw = () => { scrim.querySelector('.vb-body').innerHTML = body(products, state, opts); };
    draw();
    scrim.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-vb]'); if (!b || state.busy) return;
      const act = b.dataset.vb;
      if (act === 'close') return close();
      if (act === 'period') { state.period = b.dataset.v; draw(); scrim.querySelector(`[data-vb="period"][data-v="${state.period}"]`)?.focus(); return; }
      if (act === 'pick') { state.pick = b.dataset.v; draw(); scrim.querySelector(`[data-vb="pick"][data-v="${state.pick}"]`)?.focus(); return; }
      if (act === 'restore') { state.busy = true; setStatus('Checking your purchases…'); const r = await billing.restore(); state.busy = false; draw(); setStatus(restoreMsg(r)); return; }
      if (act === 'buy') {
        const id = b.dataset.id; state.busy = true; b.disabled = true; setStatus('Opening the ' + billing.storeName + '…');
        const r = await billing.purchase(id);
        state.busy = false;
        if (r.ok) { draw(); setStatus('Thank you. Your purchase is unlocked.'); toast('Purchase complete. Thank you.'); if (opts.onUnlock) opts.onUnlock(id); setTimeout(() => { if (openEl && openEl.scrim === scrim) close(); }, 1400); return; }
        draw(); setStatus(r.reason === 'cancelled' ? 'Purchase canceled. You have not been charged.' : r.reason === 'unavailable' ? 'This item is not available from the store right now. Please try again later.' : (r.message || 'The purchase did not go through. Please try again.'));
      }
    });
    function setStatus(m) { const s = scrim.querySelector('.vb-status'); if (s) s.textContent = m; }
    return true;
  }
  function restoreMsg(r) {
    if (r.ok) return billing.currentTier() || (r.active && r.active.length) ? 'Your purchases have been restored.' : 'No previous purchases were found for this ' + (billing.platform === 'android' ? 'Google' : 'Apple') + ' account.';
    if (r.reason === 'preview') return 'Restore works in the phone app.';
    if (r.reason === 'unconfigured') return 'In-app purchases are not switched on in this build yet.';
    return r.message || 'Restore did not finish. Please try again.';
  }
  function close() {
    if (!openEl) return;
    document.removeEventListener('keydown', openEl.onKey, true);
    openEl.scrim.remove();
    document.body.classList.remove('vb-locked');
    const f = openEl.prevFocus; openEl = null;
    try { f && f.focus && f.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  function body(products, state, opts) {
    const mode = billing.mode;
    const pass = billing.has('vilasi_pass');
    const tiers = ui.tiers.filter((t) => !t.hidden);
    const hasAnnual = tiers.some((t) => t.annual && products[t.annual]);
    const hasMonthly = tiers.some((t) => t.monthly && products[t.monthly]);
    if (state.period === 'annual' && !hasAnnual) state.period = 'monthly';
    const pidFor = (t) => (state.period === 'annual' ? t.annual : t.monthly) || t.monthly || t.annual;
    const savePct = (() => {
      const t = tiers.find((x) => products[x.monthly] && products[x.annual]);
      if (!t) return 0;
      const m = products[t.monthly].price, a = products[t.annual].price;
      return m > 0 && a > 0 ? Math.round((1 - a / (m * 12)) * 100) : 0;
    })();
    let note = '';
    if (mode === 'preview') note = `<p class="vb-note">${esc(ui.previewNote || `This is a preview of the plans in the ${cfg.appName} app for iPhone and Android. Purchases are made in the app; nothing can be bought on the web yet.`)}</p>`;
    if (mode === 'unconfigured') note = `<p class="vb-note">In-app purchases are not switched on in this build yet, so nothing can be bought here.</p>`;
    const head = `<p class="vb-kicker">${esc(cfg.appName)}</p><h2 id="vb-h">${esc(opts.title || ui.title || 'Choose your plan')}</h2>${opts.reason ? `<p class="vb-reason">${esc(opts.reason)}</p>` : ''}`;
    if (pass) {
      return `${head}<div class="vb-pass"><b>Included with your Vilasi Pass</b><p>Every feature on this screen is already unlocked for you. There is nothing more to buy.</p></div>
        ${oneTimeHTML(products, opts, true)}${footHTML()}`;
    }
    const seg = hasAnnual && hasMonthly ? `<div class="vb-seg" role="group" aria-label="Billing period">
      <button type="button" data-vb="period" data-v="monthly" aria-pressed="${state.period === 'monthly'}">Monthly</button>
      <button type="button" data-vb="period" data-v="annual" aria-pressed="${state.period === 'annual'}">Yearly${savePct > 0 ? ` <small>save ${savePct}%</small>` : ''}</button></div>` : '';
    const cards = tiers.map((t) => {
      const pid = pidFor(t), x = products[pid];
      const owned = billing.has(t.entitlement);
      const sel = state.pick === t.id;
      const perMonth = x && state.period === 'annual' && x.price ? `<span class="vb-per">About $${(x.price / 12).toFixed(2)} a month</span>` : '';
      return `<button type="button" class="vb-tier${sel ? ' on' : ''}${owned ? ' owned' : ''}" data-vb="pick" data-v="${esc(t.id)}" aria-pressed="${sel}">
        <span class="vb-tier-top"><b>${esc(t.name)}</b>${owned ? '<span class="vb-badge">Your plan</span>' : x && x.intro && x.intro.free ? `<span class="vb-badge trial">${esc(x.intro.span)} free trial</span>` : x && x.intro ? `<span class="vb-badge trial">${esc((cfg.launchOffer && cfg.launchOffer.label) || 'Intro price')}</span>` : ''}</span>
        <span class="vb-price">${x ? priceLine(x, true) : '<span class="vb-na">Not available right now</span>'}</span>${perMonth}
        <ul class="vb-feats">${t.features.map((f) => `<li>${CHECK}<span>${esc(f)}</span></li>`).join('')}${(t.comingSoon || []).map((f) => `<li class="soon"><span class="vb-soon">Coming soon</span><span>${esc(f)}</span></li>`).join('')}</ul>
      </button>`;
    }).join('');
    const pick = tiers.find((t) => t.id === state.pick) || tiers[0];
    const px = pick && products[pidFor(pick)];
    const owned = pick && billing.has(pick.entitlement);
    let cta = '';
    if (pick) {
      const disabled = mode !== 'native' || !px || owned;
      const label = owned ? `You have ${pick.name}` : mode === 'preview' ? 'Available in the app' : mode === 'unconfigured' ? 'Not available in this build' : !px ? 'Not available right now' : px.intro && px.intro.free ? `Start ${px.intro.span} free trial` : `Subscribe to ${pick.name}`;
      cta = `<div class="vb-cta"><button type="button" class="vb-buy" data-vb="buy" data-id="${esc(pidFor(pick))}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>
        ${px && !owned ? `<p class="vb-terms-line">${renewLine(px)}</p>` : ''}</div>`;
    }
    const free = ui.free && ui.free.length ? `<details class="vb-free"><summary>What stays free</summary><ul>${ui.free.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>` : '';
    return `${head}${note}${launchHTML(products, tiers)}${seg}<div class="vb-tiers">${cards}</div>${cta}${free}${oneTimeHTML(products, opts, false)}
      <p class="vb-disclose">${disclosure()}</p>${footHTML()}`;
  }

  function oneTimeHTML(products, opts, passView) {
    const items = (ui.oneTime || []).filter((o) => !o.hidden && !(passView && o.includedInPass));
    if (!items.length) return '';
    return `<section class="vb-once"><h3>${esc(ui.oneTimeTitle || 'One-time purchases')}</h3>${items.map((o) => {
      const x = products[o.product];
      const live = !o.service || hookLive(o.service);
      const owned = o.entitlement && billing.has(o.entitlement);
      const focus = opts.focus === o.id ? ' focus' : '';
      let btn;
      if (!live) btn = '<span class="vb-soon big">Coming soon</span>';
      else if (owned) btn = '<span class="vb-badge">Owned</span>';
      else btn = `<button type="button" class="vb-buy small" data-vb="buy" data-id="${esc(o.product)}" ${billing.mode !== 'native' || !x ? 'disabled' : ''}>${billing.mode === 'preview' ? 'In the app' : x ? `Buy ${esc(x.priceString)}` : 'Not available'}</button>`;
      return `<div class="vb-item${focus}"><div><b>${esc(o.name)}</b>${x && live ? `<span class="vb-item-price">${priceLine(x, false)}</span>` : ''}<p>${esc(live ? o.text : (o.soonText || o.text))}</p></div>${btn}</div>`;
    }).join('')}</section>`;
  }

  function footHTML() {
    const L = ui.legal;
    return `<p class="vb-status" role="status" aria-live="polite"></p>
      <div class="vb-foot"><button type="button" class="vb-link" data-vb="restore">Restore Purchases</button><a class="vb-link" href="${esc(L.terms)}">Terms of Use</a><a class="vb-link" href="${esc(L.privacy)}">Privacy Policy</a></div>`;
  }

  // ---------- inline pieces for the app's own screens ----------
  function lockHTML({ title, text, focus = '', cta = 'See plans', compact = false } = {}) {
    return `<div class="vb-lock${compact ? ' compact' : ''}"><span class="vb-lock-ic">${LOCK}</span><div class="vb-lock-text"><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}</div><button type="button" class="vb-lock-btn" data-vb-act="paywall" data-vb-focus="${esc(focus)}">${esc(cta)}</button></div>`;
  }
  const badgeHTML = (label = 'Plus') => `<span class="vb-pill">${LOCK}${esc(label)}</span>`;

  function membershipHTML({ heading = 'Membership', headingTag = 'h2', headingClass = '' } = {}) {
    const tier = billing.currentTier();
    const lines = (ui.credits || []).map((c) => {
      const a = billing.allowance(c.kind);
      return `<li><span>${esc(c.label)}</span><b>${hookLive(c.service) || !c.service ? (c.format ? esc(c.format(a.total)) : `${a.total} ${esc(c.unit)}`) : 'Coming soon'}</b></li>`;
    }).join('') + (ui.oneTime || []).filter((o) => o.entitlement && billing.has(o.entitlement) && !(tier && o.includedInPass && billing.has('vilasi_pass'))).map((o) => `<li><span>${esc(o.name)}</span><b>Owned</b></li>`).join('');
    const status = tier ? `You have <b>${esc(tier.name)}</b>.` : billing.mode === 'preview' ? `You are using the free version. Plans are sold in the ${esc(cfg.appName)} app for iPhone and Android.` : 'You are using the free version.';
    const anySub = !!tier;
    return `<section class="vb-member"><${headingTag} class="${esc(headingClass)}">${esc(heading)}</${headingTag}><p>${status}</p>${lines ? `<ul class="vb-credits">${lines}</ul>` : ''}
      <div class="vb-member-btns"><button type="button" class="vb-buy small" data-vb-act="paywall">${tier ? 'See plans' : 'See plans and prices'}</button><button type="button" class="vb-ghost" data-vb-act="restore">Restore Purchases</button>${anySub && billing.mode === 'native' ? '<button type="button" class="vb-ghost" data-vb-act="manage">Manage subscription</button>' : ''}</div></section>`;
  }

  // One delegated handler serves every screen, whether it is built with innerHTML or DOM nodes.
  document.addEventListener('click', async (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-vb-act]');
    if (!b) return;
    e.preventDefault();
    const act = b.dataset.vbAct;
    if (act === 'paywall') open({ focus: b.dataset.vbFocus || undefined, reason: b.dataset.vbReason || undefined });
    if (act === 'restore') { b.disabled = true; const r = await billing.restore(); b.disabled = false; toast(restoreMsg(r)); }
    if (act === 'manage') {
      const url = billing.managementURL || (billing.platform === 'android' ? `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(cfg.bundleId)}` : 'https://apps.apple.com/account/subscriptions');
      window.location.href = url; // handed to the system (App Store / Play Store)
    }
  });

  /** Run fn if the entitlement is active; otherwise show the paywall. */
  function require(ent, opts, fn) {
    if (billing.has(ent)) { if (fn) fn(); return true; }
    open(opts); return false;
  }

  return { open, close, lockHTML, badgeHTML, membershipHTML, require, toast, isOpen: () => !!openEl };
}
