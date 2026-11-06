// Billing and paywall for this app. Import { billing, paywall } wherever a feature is gated.
import { createBilling } from './vilasi/billing.js';
import { installPaywall } from './vilasi/paywall.js';
import { BILLING } from './billing-config.js';

export const billing = createBilling(BILLING);
export const paywall = installPaywall(billing);
billing.init();
