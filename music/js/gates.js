// Free-tier limits and Pro features, in one place.
import { billing, paywall } from './paid.js';
import { PRO_ENTITLEMENT } from './billing-config.js';

export { billing, paywall };
export const hasPro = () => billing.has(PRO_ENTITLEMENT);
export const proPill = () => paywall.badgeHTML('Pro');
export const FREE = { songs: 5, reviewPerDay: 20 };
