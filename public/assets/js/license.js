/**
 * Licensing.
 *
 * A licence key is verified once against the payment provider (through our own
 * /api/license endpoint, so the provider's API token never reaches the browser)
 * and the result is cached in localStorage. Verification is re-checked in the
 * background on load, but a stale cache never blocks work: if the network is
 * down, or the user is offline on a plane, an already-activated licence keeps
 * working. That is deliberate — this is a tool people reach for precisely when
 * they cannot send data anywhere.
 */

const STORE_KEY = 'safepaste.license.v1';
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // a week

/** localStorage throws in some privacy modes; never let that break the app. */
function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(value) {
  try {
    if (value === null) localStorage.removeItem(STORE_KEY);
    else localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    /* private mode — the licence lasts for this session only */
  }
}

let current = readStore();
const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try { fn(current); } catch { /* a bad listener must not break the rest */ }
  }
}

export function onLicenseChange(fn) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function getLicense() {
  return current;
}

export function isPro() {
  return !!(current && current.valid);
}

export function planName() {
  return current && current.valid ? (current.plan || 'Pro') : 'Free';
}

/**
 * Verify a key with the server and store the result.
 * @returns {Promise<{ok: boolean, error?: string, license?: object}>}
 */
export async function activate(key) {
  const trimmed = String(key || '').trim();
  if (!trimmed) return { ok: false, error: 'Enter your licence key.' };
  if (trimmed.length < 8) return { ok: false, error: 'That key looks too short.' };

  let res;
  try {
    res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: trimmed }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the licence server. Check your connection and try again.' };
  }

  let body = null;
  try { body = await res.json(); } catch { /* fall through to the generic message */ }

  if (!res.ok || !body) {
    return { ok: false, error: (body && body.error) || 'The licence server returned an error. Try again in a moment.' };
  }
  if (!body.valid) {
    return { ok: false, error: body.error || 'That key was not recognised.' };
  }

  current = {
    valid: true,
    key: trimmed,
    plan: body.plan || 'Pro',
    email: body.email || '',
    seats: body.seats || null,
    activatedAt: new Date().toISOString(),
    checkedAt: Date.now(),
  };
  writeStore(current);
  emit();
  return { ok: true, license: current };
}

export function deactivate() {
  current = null;
  writeStore(null);
  emit();
}

/**
 * Quietly re-verify a stored licence if it has not been checked in a while.
 * Any failure that is not an explicit "this key is invalid" is ignored, so a
 * flaky network or an offline machine never revokes access.
 */
export async function revalidate() {
  if (!current || !current.valid) return;
  if (current.checkedAt && Date.now() - current.checkedAt < RECHECK_AFTER_MS) return;

  try {
    const res = await fetch('/api/license', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: current.key, silent: true }),
    });
    if (!res.ok) return;
    const body = await res.json();
    if (body && body.valid === false && body.definitive === true) {
      deactivate();
      return;
    }
    if (body && body.valid) {
      current = { ...current, plan: body.plan || current.plan, checkedAt: Date.now() };
      writeStore(current);
      emit();
    }
  } catch {
    /* offline is not a licensing failure */
  }
}
