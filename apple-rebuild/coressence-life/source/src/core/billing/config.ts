// Coressence Life billing configuration.
//
// 1. RevenueCat keys: replace the placeholders with the PUBLIC SDK keys from RevenueCat > Project > API keys
//    (iOS keys start with appl_, Google Play keys with goog_). Until then every free feature works and the
//    Coressence+ screen says purchases are not set up in this build.
// 2. Prices are never set here. The Coressence+ screen always shows the price, period and trial the App Store
//    or Google Play returns. The US prices below are shown only in the web preview, and come from
//    "Vilasi App Pricing and Revenue Plan" (Coressence family pricing, October 2026):
//      Coressence+ All-Access  $14.99 a month or $119.99 a year, 14-day trial
//      All-Access Family       $19.99 a month or $159.99 a year (up to 6 people with Family Sharing), 14-day trial
//      Course track            $49.99 each (one-time), $79.99 both; lesson 1 free
// 3. RevenueCat setup: one project, entitlement "coressence_all_access" on every All-Access product, and
//    course entitlements on the one-time course products. Put the subscriptions in one subscription group.

export const REVENUECAT_IOS_KEY = 'REVENUECAT_IOS_KEY';
export const REVENUECAT_ANDROID_KEY = 'REVENUECAT_ANDROID_KEY';

export const ENT_ALL_ACCESS = 'coressence_all_access';
export const ENT_COURSE_LIVE = 'coressence_course_live';
export const ENT_COURSE_PERFORM = 'coressence_course_perform';

export const ALL_MONTHLY = 'com.coressence.life.allaccess.monthly';
export const ALL_ANNUAL = 'com.coressence.life.allaccess.annual';
export const FAMILY_MONTHLY = 'com.coressence.life.allaccess.family.monthly';
export const FAMILY_ANNUAL = 'com.coressence.life.allaccess.family.annual';
export const COURSE_LIVE = 'com.coressence.life.course.live';
export const COURSE_PERFORM = 'com.coressence.life.course.perform';
export const COURSE_BOTH = 'com.coressence.life.course.both';

export type CatalogProduct = {
  product_id: string;
  type: 'auto_renewable_subscription' | 'non_consumable';
  price_usd: number;
  period?: string;
  entitlements: string[];
  subscription_group?: string;
  free_trial_days?: number;
  family_shareable?: boolean;
};

export const CATALOG: CatalogProduct[] = [
  { product_id: ALL_MONTHLY, type: 'auto_renewable_subscription', period: 'P1M', price_usd: 14.99, entitlements: [ENT_ALL_ACCESS], subscription_group: 'coressence.allaccess', free_trial_days: 14 },
  { product_id: ALL_ANNUAL, type: 'auto_renewable_subscription', period: 'P1Y', price_usd: 119.99, entitlements: [ENT_ALL_ACCESS], subscription_group: 'coressence.allaccess', free_trial_days: 14 },
  { product_id: FAMILY_MONTHLY, type: 'auto_renewable_subscription', period: 'P1M', price_usd: 19.99, entitlements: [ENT_ALL_ACCESS], subscription_group: 'coressence.allaccess', free_trial_days: 14, family_shareable: true },
  { product_id: FAMILY_ANNUAL, type: 'auto_renewable_subscription', period: 'P1Y', price_usd: 159.99, entitlements: [ENT_ALL_ACCESS], subscription_group: 'coressence.allaccess', free_trial_days: 14, family_shareable: true },
  { product_id: COURSE_LIVE, type: 'non_consumable', price_usd: 49.99, entitlements: [ENT_COURSE_LIVE] },
  { product_id: COURSE_PERFORM, type: 'non_consumable', price_usd: 49.99, entitlements: [ENT_COURSE_PERFORM] },
  { product_id: COURSE_BOTH, type: 'non_consumable', price_usd: 79.99, entitlements: [ENT_COURSE_LIVE, ENT_COURSE_PERFORM] },
];

/** Free plan rules (pricing plan: "7 days of history in every premium app"). */
export const FREE = {
  historyDays: 7,
  // Lesson 1, Module 1 of each course track and its companion Worksheet 1.
  freeLessons: ['l1', 'live-m1', 'perform-m1', 'live-ws1', 'perform-ws1'],
};

export const LEGAL = {
  terms: 'https://vilasi.co/apps/coressence-life/terms/',
  privacy: 'https://vilasi.co/apps/coressence-life/privacy/',
  appPage: 'https://vilasi.co/apps/',
  support: 'https://vilasi.co/apps/coressence-life/support/',
  supportEmail: 'support@vilasi.co',
};

export function isPlaceholderKey(k: string) {
  return !/^(appl|goog|amzn)_[A-Za-z0-9]{6,}$/.test(k);
}
