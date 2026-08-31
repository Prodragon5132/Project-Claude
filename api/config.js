/**
 * Public runtime configuration.
 *
 * Lets the operator switch checkout on from the Vercel dashboard without a
 * redeploy. Only values that are safe to show a visitor are exposed here — the
 * provider API tokens stay in the environment and are read exclusively by
 * /api/license.
 */

export default function handler(req, res) {
  res.setHeader('cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('content-type', 'application/json; charset=utf-8');

  res.status(200).end(JSON.stringify({
    checkout: {
      personal: process.env.CHECKOUT_PERSONAL || '',
      team: process.env.CHECKOUT_TEAM || '',
      business: process.env.CHECKOUT_BUSINESS || '',
    },
    licensing: {
      provider: (process.env.LICENSE_PROVIDER || 'none').toLowerCase(),
    },
    contactEmail: process.env.CONTACT_EMAIL || '',
  }));
}
