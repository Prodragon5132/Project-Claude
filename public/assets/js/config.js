/**
 * Product configuration.
 *
 * Everything an operator needs to change to take payments lives here or in the
 * matching Vercel environment variables. `/api/config` overrides these defaults
 * at runtime, so checkout links can be switched on from the Vercel dashboard
 * without touching code or redeploying.
 *
 * See docs/GO-LIVE.md for the ten-minute setup.
 */

export const PRODUCT = {
  name: 'SafePaste',
  tagline: 'Strip personal data out of anything before you paste it into an AI.',
  version: '1.0.0',
};

/** Free-plan limit. Generous enough to be genuinely useful, small enough that
 *  real work documents need Pro. */
export const FREE_CHAR_LIMIT = 5000;

export const PLANS = {
  personal: {
    id: 'personal',
    name: 'Personal',
    price: '$39',
    cadence: 'one-time',
    blurb: 'For one person. Yours forever, including updates.',
    features: [
      'Unlimited document size',
      'Open and save files (txt, md, csv, json, log, more)',
      'Realistic-name mode for natural model output',
      'Custom rules and allowlists, saved as profiles',
      'Save and reload the mapping vault',
      'Works fully offline once loaded',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    price: '$149',
    cadence: 'one-time',
    blurb: 'Up to 10 people. One licence key, share it internally.',
    features: [
      'Everything in Personal',
      '10 seats on one key',
      'Shared rule profiles you can export and hand round',
      'Consistent tokens across a whole batch of files',
      'Priority email support',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: '$499',
    cadence: 'one-time',
    blurb: 'Unlimited seats across one organisation.',
    features: [
      'Everything in Team',
      'Unlimited seats, one organisation',
      'Self-host the whole tool on your own domain',
      'Written confirmation that no data leaves the browser, for your DPIA',
      'Named contact for security review questions',
    ],
  },
};

/**
 * Runtime configuration, overridden by /api/config where present.
 *  checkout.<plan>  the hosted checkout URL for that plan
 *  licensing.provider  'gumroad' | 'lemonsqueezy' | 'polar' | 'none'
 *  contactEmail  shown on the support page when set
 */
const DEFAULTS = {
  checkout: { personal: '', team: '', business: '' },
  licensing: { provider: 'none' },
  contactEmail: '',
};

let runtime = { ...DEFAULTS };
let loaded = null;

/** Fetch runtime config once. Falls back to defaults if the endpoint is absent
 *  (for example when the site is served as plain static files). */
export function loadConfig() {
  if (loaded) return loaded;
  loaded = fetch('/api/config', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json && typeof json === 'object') {
        runtime = {
          checkout: { ...DEFAULTS.checkout, ...(json.checkout || {}) },
          licensing: { ...DEFAULTS.licensing, ...(json.licensing || {}) },
          contactEmail: json.contactEmail || DEFAULTS.contactEmail,
        };
      }
      return runtime;
    })
    .catch(() => runtime);
  return loaded;
}

export function getConfig() {
  return runtime;
}

/** The checkout URL for a plan, or '' when the operator has not connected one. */
export function checkoutUrl(planId) {
  return (runtime.checkout && runtime.checkout[planId]) || '';
}

export function checkoutReady() {
  return Object.values(runtime.checkout || {}).some(Boolean);
}
