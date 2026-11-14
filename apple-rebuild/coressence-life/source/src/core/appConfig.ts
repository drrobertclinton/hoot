// App-level switches and service settings. Everything here works without any outside account.

/**
 * Investor demo tools (Settings > Investor demo): "Load demo data" and "Preview Coressence+".
 * Set to false for the public App Store / Google Play release.
 */
export const DEMO_TOOLS = false;

/**
 * Store release switches (Nov 2026 first release). The app ships free until RevenueCat keys and store products exist.
 * PURCHASES_LIVE false: no paywall anywhere, all tracking history and routines are open, and the courses show their
 * free part only (the paid modules are hidden, not given away). Set true with the RevenueCat keys in billing/config.ts.
 * STOREFRONTS_LIVE false: the lab panel ordering card is hidden. MD and Shop are always shown: MD says where visits
 * are available today, and Shop is a gear guide until SHOP.storeUrl is set.
 */
export const PURCHASES_LIVE = false;
export const STOREFRONTS_LIVE = false;

/**
 * Investor web demo build (scripts/build-demo-web.js sets EXPO_PUBLIC_INVESTOR_DEMO=1): the app opens straight
 * into the demo profile with Coressence+ preview on. Never set for store builds.
 */
export const INVESTOR_DEMO = process.env.EXPO_PUBLIC_INVESTOR_DEMO === '1';

export const SUPPORT_EMAIL = 'support@vilasi.co';
export const PUBLISHER = 'Vilasi, Inc.';

/**
 * Coressence MD (telehealth). A separate clinical service from Dr. Clinton's medical practice.
 * statesLive: where a patient can be located for a visit today. Add states as licensure is in place.
 * bookingUrl: when an online booking page exists, put its https URL here; the MD screen then shows "Book a visit".
 * Until then the screen offers a visit request by email (no medical details asked for).
 */
export const MD = {
  practiceName: '',
  bookingUrl: '',
  statesLive: ['North Carolina'],
  requestEmail: 'support@vilasi.co',
};

/**
 * Coressence Shop. storeUrl empty: the Shop screen is a gear guide (what to look for, no links, nothing to buy).
 * When the store is live, put its https URL here and the screen adds "Open Coressence Shop" (opens in the browser).
 */
export const SHOP = {
  storeUrl: '',
};

/** Where to get the printed or e-book editions. Empty: the Resources page offers only "Read in the app". */
export const BOOK_LINKS: Record<'live' | 'perform', string> = { live: '', perform: '' };
/** Coressence Health Library store links by key (lifestyle, nutrition, kitchen, recovery, mind, zinc). Empty until published. */
export const LIBRARY_LINKS: Record<string, string> = {};

/**
 * Coressence Connect, the companion service in services/connect that holds vendor sign-in tokens and webhooks for
 * Oura, WHOOP, Garmin, Google Health (Fitbit and Pixel Watch), Withings, Polar and Dexcom. Leave serviceUrl empty
 * until it is deployed: Apple Health, Health Connect and Bluetooth straps work without it, and the Connected
 * devices screen says which brands are waiting. Each brand goes live on its own once the service has that
 * vendor's approved credentials (the service reports which ones it has).
 */
export const CONNECT = {
  serviceUrl: '',
  /** App link the service returns to after a vendor sign-in. */
  returnUrl: 'coressence://devices',
  /**
   * Optional one-integration path through an aggregator instead of the direct connections. Off by default.
   * Set to 'terra', 'junction' or 'rook' only after signing that vendor's contract and adding its keys to the service.
   */
  aggregator: null as null | 'terra' | 'junction' | 'rook',
};
