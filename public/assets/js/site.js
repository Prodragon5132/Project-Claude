/**
 * Marketing-page behaviour.
 *
 * Two jobs: point the buy buttons at whatever checkout the operator has
 * connected, and fill in the support address where one is configured. Both
 * come from /api/config so they can be switched on from the Vercel dashboard
 * without a redeploy.
 */

import { loadConfig, checkoutUrl, checkoutReady, getConfig } from './config.js';

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

function toast(message) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

loadConfig().then(() => {
  const ready = checkoutReady();

  for (const btn of document.querySelectorAll('[data-buy]')) {
    const plan = btn.dataset.buy;
    const url = checkoutUrl(plan);
    if (url) {
      btn.href = url;
      btn.rel = 'noopener';
      btn.target = '_blank';
    } else {
      // No checkout connected yet. Send people to the tool rather than to a
      // dead link, and say plainly why.
      btn.href = '/app';
      btn.addEventListener('click', () => {
        toast('Checkout is being connected. Everything on the free plan works now.');
      });
    }
  }

  const note = document.getElementById('buy-note');
  if (note && !ready) {
    note.textContent = 'Card checkout is being connected. The free plan is fully working today — open the tool and try it.';
  }

  const email = getConfig().contactEmail;
  for (const slot of document.querySelectorAll('[data-contact-email]')) {
    if (email) {
      const a = document.createElement('a');
      a.href = `mailto:${email}`;
      a.textContent = email;
      slot.textContent = '';
      slot.appendChild(a);
    } else {
      slot.textContent = 'the address on your receipt';
    }
  }
});
