// Vilasi Music: in-app purchase settings, in one file.
//
// PRICES ARE A PROPOSAL FOR ROBERT TO APPROVE. Inside the iOS and Android apps, the prices, trial and
// launch-offer terms on the plans screen are always read from the App Store / Google Play at runtime, so the
// real numbers are whatever is set in App Store Connect and Play Console. The numbers below are the catalog:
// they are shown only in the web preview and in LAUNCH.md.
//
// Market check (November 2026, US list prices; see RESEARCH.md): Simply Piano $17.90/mo or $169.90/yr;
// Yousician one instrument $19.99/mo or $119.99/yr, all instruments $29.99/mo or $139.99-179.99/yr;
// Fender Play about $9.99-19.99/mo or $89.99-149.99/yr; flowkey $19.99/mo or $119.88/yr; Skoove $29.99/mo or
// $149.99/yr; Trala $19.99/mo or $119.99/yr. Proposal: undercut on price while covering every instrument plus
// a full theory course: $12.99 a month or $79.99 a year, a 7-day free trial on the yearly plan, and a launch
// offer of $49.99 for the first year.
//
// API keys: paste the public SDK keys from RevenueCat (Project settings > API keys).
// Leave them empty and purchases stay switched off ("not available in this build").

export const REVENUECAT_IOS_KEY = '';      // starts with appl_
export const REVENUECAT_ANDROID_KEY = '';  // starts with goog_

// Launch (introductory) offer on the YEARLY plan: create it in App Store Connect > Subscription Prices >
// Introductory Offers (Pay up front, 1 year, $49.99) and in Play Console as a "Developer determined" offer on
// the yearly base plan. Set enabled: false once the launch window closes; the banner then disappears.
export const LAUNCH_OFFER = {
  enabled: true,
  label: 'Launch offer',
  fine: 'Introductory price for new subscribers, for a limited time at launch.',
};

export const PRO_ENTITLEMENT = 'lessons_pro';

const SITE_LEGAL = { terms: 'terms.html', privacy: 'privacy.html' };

export const BILLING = {
  appKey: 'musiclessons',
  appName: 'Vilasi Music',
  bundleId: 'com.vilasi.musiclessons',
  REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY,
  launchOffer: LAUNCH_OFFER,
  products: [
    {
      id: 'com.vilasi.musiclessons.pro.monthly',
      type: 'auto_renewable_subscription',
      price_usd: 12.99,
      period: 'P1M',
      entitlement: 'lessons_pro',
      subscription_group: 'musiclessons.membership',
    },
    {
      id: 'com.vilasi.musiclessons.pro.annual',
      type: 'auto_renewable_subscription',
      price_usd: 79.99,
      period: 'P1Y',
      entitlement: 'lessons_pro',
      subscription_group: 'musiclessons.membership',
      // Proposed launch offer: first year at $49.99, then $79.99 a year.
      intro: { price_usd: 49.99, periods: 1, unit: 'year' },
    },
    {
      id: 'com.vilasi.musiclessons.pro.lifetime',
      type: 'non_consumable',
      price_usd: 199.99,
      entitlement: 'lessons_pro',
      title: 'Pro for life',
    },
  ],
  // Higher plans include lower ones. Vilasi Pass and the Performer Bundle both unlock Pro.
  grants: {
    vilasi_pass: ['vilasi_performer_bundle'],
    vilasi_performer_bundle: ['lessons_pro'],
  },
  limits: {},
  paywall: {
    theme: { accent: 'var(--accent)', 'on-accent': '#fff', surface: 'var(--bg-1)', raise: 'var(--bg-2)', ink: 'var(--ink)', muted: 'var(--ink-2)', line: 'var(--line)', font: 'var(--sans)', display: 'var(--display)' },
    title: 'Learn every instrument, properly',
    defaultTier: 'pro',
    tiers: [
      { id: 'pro', name: 'Vilasi Music Pro', entitlement: 'lessons_pro', monthly: 'com.vilasi.musiclessons.pro.monthly', annual: 'com.vilasi.musiclessons.pro.annual',
        features: ['Every lesson on all 10 instruments and voice', 'The full music theory and ear-training course', 'The whole song library with backing band', 'Unlimited flashcard review and sight-reading', 'Teacher and parent practice reports'] },
      { id: 'performer', name: 'Performer Bundle', entitlement: 'vilasi_performer_bundle', hidden: true, features: [] },
    ],
    oneTimeTitle: 'Prefer to pay once?',
    oneTime: [
      { id: 'lifetime', product: 'com.vilasi.musiclessons.pro.lifetime', entitlement: 'lessons_pro', name: 'Pro for life', text: 'Everything in Pro, for good, with one payment.' },
    ],
    free: ['The first unit of every instrument course', 'The first two units of music theory', 'Five songs with backing band', 'Metronome, tuner and drone', 'Practice log, streaks and achievements'],
    legal: SITE_LEGAL,
    previewNote: 'This is a preview of the plans in the Vilasi Music app for iPhone, iPad and Android. Plans are bought in the app; nothing can be bought on the web.',
  },
};
