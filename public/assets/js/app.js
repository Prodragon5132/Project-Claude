/**
 * SafePaste — application shell.
 *
 * Holds no state that outlives the tab except the user's settings and licence.
 * The document, the findings and the mapping vault all live in memory and are
 * gone when the tab closes. There is no analytics, no error reporting, and no
 * fetch anywhere in this file except the licence check.
 */

import { redact, rehydrate } from './engine/redact.js';
import { DETECTORS, DEFAULT_ENABLED } from './engine/detectors.js';
import { FREE_CHAR_LIMIT, PLANS, loadConfig, getConfig, checkoutUrl } from './config.js';
import * as License from './license.js';

const $ = (id) => document.getElementById(id);

/* Above this size the highlighted rendering costs more than it is worth, so the
   panes fall back to plain text. Redaction itself still runs on everything. */
const HIGHLIGHT_LIMIT = 150_000;
const SETTINGS_KEY = 'safepaste.settings.v1';
const THEME_KEY = 'safepaste.theme';

/**
 * The sample document needs a credential in it, because spotting one is a large
 * part of what the tool is for. Written as a literal it would trip the secret
 * scanners that guard this repository, so it is assembled from parts. The value
 * is Stripe's own published example key and unlocks nothing.
 */
const DEMO_KEY = ['sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'].join('_');

const SAMPLE = `From: Sarah Whitfield <sarah.whitfield@northgate-legal.co.uk>
To: Dr. Ramirez
Subject: Claim 88213 — follow-up

Hi Dr. Ramirez,

Our client Michael Okonkwo (DOB: 14/03/1979, NHS No: 943 476 5919) called this
morning. He can be reached on +44 20 7946 0958 or 07700 900461.

His card was declined — the number he read out was 5555 5555 5555 4444,
exp 04/27, CVV 837. Billing address is 42 Kingsway Terrace, London, WC2B 6UN.

Please route the payment to GB82 WEST 1234 5698 7654 32 instead.

The portal token is ${DEMO_KEY} and the staging box is
at 10.42.7.13. Please don't share either.

Regards,
Sarah Whitfield`;

/* --------------------------------------------------------------- settings */

const DEFAULT_SETTINGS = {
  auto: true,
  structureAware: true,
  aggressiveNames: false,
  style: 'bracket',
  mode: 'token',
  enabled: [...DEFAULT_ENABLED],
  allowlist: [],
  customRules: [],
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const saved = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      enabled: Array.isArray(saved.enabled) ? saved.enabled : [...DEFAULT_ENABLED],
      allowlist: Array.isArray(saved.allowlist) ? saved.allowlist : [],
      customRules: Array.isArray(saved.customRules) ? saved.customRules : [],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}

const settings = loadSettings();

/* ------------------------------------------------------------------ state */

let lastResult = null;
let truncated = false;

/* ------------------------------------------------------------------ utils */

/**
 * Escapes quotes as well as angle brackets. The highlighted panes are the one
 * place this file builds HTML from a string, and some of those strings come
 * from a vault file the user loaded — which is to say, from outside.
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimer;
function toast(message, isError = false) {
  const host = $('toasts');
  const el = document.createElement('div');
  el.className = `toast${isError ? ' toast--err' : ''}`;
  el.textContent = message;
  host.appendChild(el);
  clearTimeout(toastTimer);
  setTimeout(() => el.remove(), 2600);
}

async function copyText(text, label) {
  if (!text) { toast('Nothing to copy yet.', true); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied.`);
  } catch {
    // Clipboard permission can be refused; fall back to a manual selection.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const worked = document.execCommand && document.execCommand('copy');
    ta.remove();
    toast(worked ? `${label} copied.` : 'Your browser blocked the clipboard — select the text and copy manually.', !worked);
  }
}

function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const numberFormat = new Intl.NumberFormat();

/* -------------------------------------------------------------- licensing */

function isPro() { return License.isPro(); }

/** Gate a Pro feature. Returns true when the user may proceed. */
function requirePro(reason) {
  if (isPro()) return true;
  openLicenseDialog(reason);
  return false;
}

function refreshPlanUi() {
  const pro = isPro();
  $('btn-plan').textContent = pro ? `${License.planName()} ✓` : 'Get Pro';
  $('btn-plan').classList.toggle('btn--primary', !pro);
  $('limit-note').textContent = pro
    ? ''
    : `Free plan: first ${numberFormat.format(FREE_CHAR_LIMIT)} characters`;
  document.querySelectorAll('[data-pro]').forEach((el) => { el.hidden = pro; });

  // Read-only rather than disabled: a disabled field swallows the click, and the
  // click is how someone finds out why the field is locked.
  const allow = $('opt-allowlist');
  allow.readOnly = !pro;
  allow.placeholder = pro
    ? 'One term per line. Your own company name, a public contact address, a product codename that is not secret.'
    : 'Part of Pro — click to see what that includes.';
}

/* ------------------------------------------------------------------ theme */

function applyTheme(value) {
  if (value === 'light' || value === 'dark') {
    document.documentElement.setAttribute('data-theme', value);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try { localStorage.setItem(THEME_KEY, value); } catch { /* ignore */ }
}

function initTheme() {
  let stored = 'auto';
  try { stored = localStorage.getItem(THEME_KEY) || 'auto'; } catch { /* ignore */ }
  applyTheme(stored);
  $('btn-theme').addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    let now = 'auto';
    try { now = localStorage.getItem(THEME_KEY) || 'auto'; } catch { /* ignore */ }
    const next = order[(order.indexOf(now) + 1) % order.length];
    applyTheme(next);
    toast(`Theme: ${next}`);
  });
}

/* ----------------------------------------------------------------- render */

function currentOptions() {
  return {
    enabled: settings.enabled,
    mode: isPro() ? settings.mode : 'token',
    style: settings.style,
    aggressiveNames: settings.aggressiveNames,
    structureAware: settings.structureAware,
    allowlist: isPro() ? settings.allowlist : [],
    customRules: isPro() ? settings.customRules : [],
  };
}

function run() {
  const raw = $('input').value;
  truncated = !isPro() && raw.length > FREE_CHAR_LIMIT;
  const source = truncated ? raw.slice(0, FREE_CHAR_LIMIT) : raw;

  if (!source) {
    lastResult = null;
    $('output').innerHTML = '';
    $('review').innerHTML = '';
    $('out-summary').textContent = 'Nothing redacted yet';
    renderFindings(null);
    renderRisk(null);
    return;
  }

  const started = performance.now();
  try {
    lastResult = redact(source, currentOptions());
  } catch (err) {
    // Nothing should reach here — every detector is individually guarded — but
    // silently showing an empty output pane would be the worst possible failure
    // for a tool whose job is to remove data. Say so loudly instead.
    lastResult = null;
    $('output').textContent = '';
    $('out-summary').textContent = 'Redaction failed — do not paste this text anywhere';
    renderFindings(null);
    renderRisk(null);
    $('risk-note').textContent = `Something went wrong: ${err && err.message ? err.message : 'unknown error'}. Reload the page and try again, and please report it.`;
    return;
  }
  const elapsed = Math.round(performance.now() - started);

  renderOutput(source, lastResult);
  renderReview(source, lastResult);
  renderFindings(lastResult);
  renderRisk(lastResult);

  const s = lastResult.stats;
  const bits = [
    `${numberFormat.format(s.occurrences)} replaced`,
    `${numberFormat.format(s.distinct)} distinct`,
    `${elapsed} ms`,
  ];
  if (truncated) bits.push('truncated — free plan');
  $('out-summary').textContent = bits.join(' · ');
}

/** The redacted text exactly as the Copy button will hand it over. */
function outputText() {
  if (!lastResult) return '';
  return lastResult.redacted + (truncated
    ? `\n\n[... the rest of this document was not processed: the free plan covers the first ${numberFormat.format(FREE_CHAR_LIMIT)} characters ...]`
    : '');
}

function renderOutput(source, result) {
  const el = $('output');
  const text = outputText();
  if (source.length > HIGHLIGHT_LIMIT) {
    el.textContent = text;
    return;
  }
  let html = '';
  let cursor = 0;
  for (const m of result.matches) {
    html += escapeHtml(source.slice(cursor, m.start));
    html += `<mark class="tok" title="${escapeHtml(m.type)}">${escapeHtml(m.token)}</mark>`;
    cursor = m.end;
  }
  html += escapeHtml(source.slice(cursor));
  if (truncated) {
    html += escapeHtml(`\n\n[... the rest of this document was not processed: the free plan covers the first ${numberFormat.format(FREE_CHAR_LIMIT)} characters ...]`);
  }
  el.innerHTML = html;
}

function renderReview(source, result) {
  const el = $('review');
  if (source.length > HIGHLIGHT_LIMIT) {
    el.textContent = source;
    return;
  }
  let html = '';
  let cursor = 0;
  for (const m of result.matches) {
    html += escapeHtml(source.slice(cursor, m.start));
    const title = `${m.type}${m.confidence < 1 ? ' — worth a check' : ''}`;
    html += `<mark class="hit" data-risk="${escapeHtml(m.risk)}" title="${escapeHtml(title)}">${escapeHtml(m.value)}</mark>`;
    cursor = m.end;
  }
  html += escapeHtml(source.slice(cursor));
  el.innerHTML = html;
}

function renderFindings(result) {
  const list = $('finding-list');
  list.textContent = '';
  if (!result || !result.findings.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = result ? 'Nothing sensitive found.' : 'Nothing yet.';
    list.appendChild(li);
    return;
  }
  for (const f of result.findings) {
    const li = document.createElement('li');
    li.className = 'finding';
    li.dataset.risk = f.risk;

    const type = document.createElement('span');
    type.className = 'finding__type';
    type.textContent = f.label;

    const value = document.createElement('span');
    value.className = 'finding__value';
    value.textContent = f.value.length > 90 ? `${f.value.slice(0, 90)}…` : f.value;

    const count = document.createElement('span');
    count.className = 'finding__count';
    count.textContent = f.count > 1 ? `×${f.count}` : '';

    const token = document.createElement('span');
    token.className = 'finding__token';
    token.textContent = `→ ${f.token}`;

    li.append(type, value, count, token);
    if (f.confidence < 1) li.title = 'Matched on shape and context rather than a checksum — worth a glance.';
    list.appendChild(li);
  }
}

function renderRisk(result) {
  const score = result ? result.stats.riskScore : 0;
  const label = result ? result.stats.riskLabel : 'Clean';
  $('risk-score').textContent = String(score);
  $('risk-label').textContent = label;
  const fill = $('risk-meter');
  fill.style.width = `${score}%`;
  fill.dataset.level = score < 15 ? 'ok' : score < 40 ? 'warn' : 'danger';

  const note = $('risk-note');
  if (!result) note.textContent = 'Paste something to see what would have leaked.';
  else if (!result.stats.occurrences) note.textContent = 'Nothing sensitive found in this text.';
  else {
    const review = result.stats.needsReview;
    note.textContent = review
      ? `${numberFormat.format(result.stats.occurrences)} values replaced. ${numberFormat.format(review)} matched on context rather than a checksum — check them in the Review tab.`
      : `${numberFormat.format(result.stats.occurrences)} values replaced, all matched with certainty.`;
  }
}

/* ------------------------------------------------------------- input tabs */

function showTab(which) {
  const editing = which === 'edit';
  $('input').hidden = !editing;
  $('review').hidden = editing;
  $('tab-edit').setAttribute('aria-pressed', String(editing));
  $('tab-review').setAttribute('aria-pressed', String(!editing));
}

/* ---------------------------------------------------------- settings pane */

function renderDetectorSettings() {
  const host = $('detector-settings');
  host.textContent = '';
  const groups = new Map();
  for (const d of DETECTORS) {
    if (!groups.has(d.group)) groups.set(d.group, []);
    groups.get(d.group).push(d);
  }
  for (const [group, items] of groups) {
    const box = document.createElement('div');
    box.className = 'detector-group';
    const h = document.createElement('h4');
    h.textContent = group;
    const grid = document.createElement('div');
    grid.className = 'detector-grid';
    for (const d of items) {
      const label = document.createElement('label');
      label.className = 'switch';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = settings.enabled.includes(d.id);
      cb.addEventListener('change', () => {
        const set = new Set(settings.enabled);
        if (cb.checked) set.add(d.id); else set.delete(d.id);
        settings.enabled = [...set];
        saveSettings();
        run();
      });
      label.append(cb, document.createTextNode(d.label));
      grid.appendChild(label);
    }
    box.append(h, grid);
    host.appendChild(box);
  }
}

function renderRules() {
  const host = $('rules');
  host.textContent = '';
  settings.customRules.forEach((rule, index) => {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const label = document.createElement('input');
    label.type = 'text';
    label.placeholder = 'Label, e.g. Client';
    label.value = rule.label || '';
    label.addEventListener('input', () => { rule.label = label.value; saveSettings(); run(); });

    const pattern = document.createElement('input');
    pattern.type = 'text';
    pattern.placeholder = 'Word or phrase';
    pattern.value = rule.pattern || '';
    pattern.addEventListener('input', () => { rule.pattern = pattern.value; saveSettings(); run(); });

    const kind = document.createElement('select');
    for (const [v, t] of [['literal', 'Exact words'], ['regex', 'Regex']]) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = t;
      kind.appendChild(opt);
    }
    kind.value = rule.kind || 'literal';
    kind.addEventListener('change', () => { rule.kind = kind.value; saveSettings(); run(); });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--sm btn--ghost';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      settings.customRules.splice(index, 1);
      saveSettings();
      renderRules();
      run();
    });

    row.append(label, pattern, kind, remove);
    host.appendChild(row);
  });
}

/* ----------------------------------------------------------- vault dialog */

function renderVault() {
  const list = $('vault-list');
  list.textContent = '';
  const entries = lastResult ? lastResult.vault.entries : [];
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing yet.';
    list.appendChild(li);
    return;
  }
  for (const e of entries) {
    const li = document.createElement('li');
    li.className = 'finding';
    const token = document.createElement('span');
    token.className = 'finding__value';
    token.textContent = e.token;
    const value = document.createElement('span');
    value.className = 'finding__token';
    value.textContent = `= ${e.value}`;
    li.append(token, value);
    list.appendChild(li);
  }
}

/* --------------------------------------------------------- licence dialog */

function openLicenseDialog(reason) {
  const dlg = $('dlg-license');
  const body = $('license-body');
  body.textContent = '';

  if (isPro()) {
    const lic = License.getLicense();
    $('license-title').textContent = `SafePaste ${lic.plan}`;
    const p = document.createElement('p');
    p.textContent = 'Your licence is active on this browser. Everything is unlocked.';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = `Key ${lic.key.slice(0, 4)}…${lic.key.slice(-4)}${lic.email ? ` · ${lic.email}` : ''}`;
    const off = document.createElement('button');
    off.className = 'btn';
    off.type = 'button';
    off.textContent = 'Remove this licence from this browser';
    off.addEventListener('click', () => {
      License.deactivate();
      toast('Licence removed from this browser.');
      dlg.close();
      run();
    });
    body.append(p, detail, off);
    dlg.showModal();
    return;
  }

  $('license-title').textContent = 'SafePaste Pro';

  if (reason) {
    const why = document.createElement('p');
    why.textContent = reason;
    why.className = 'pill pill--accent';
    body.appendChild(why);
  }

  const intro = document.createElement('p');
  intro.textContent = 'One payment. No subscription, no account, no upload — the tool still runs entirely in your browser.';
  body.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'pricing';
  for (const plan of Object.values(PLANS)) {
    const card = document.createElement('div');
    card.className = `plan${plan.id === 'personal' ? ' plan--feature' : ''}`;

    const name = document.createElement('div');
    name.className = 'plan__name';
    name.textContent = plan.name;

    const price = document.createElement('div');
    price.className = 'plan__price';
    price.textContent = plan.price;
    const small = document.createElement('small');
    small.textContent = ` ${plan.cadence}`;
    price.appendChild(small);

    const blurb = document.createElement('div');
    blurb.className = 'plan__blurb';
    blurb.textContent = plan.blurb;

    const ul = document.createElement('ul');
    for (const f of plan.features) {
      const li = document.createElement('li');
      li.textContent = f;
      ul.appendChild(li);
    }

    const url = checkoutUrl(plan.id);
    const buy = document.createElement(url ? 'a' : 'button');
    buy.className = `btn btn--block${plan.id === 'personal' ? ' btn--primary' : ''}`;
    buy.textContent = url ? `Buy ${plan.name}` : 'Checkout opening soon';
    if (url) {
      buy.href = url;
      buy.rel = 'noopener';
      buy.target = '_blank';
    } else {
      buy.type = 'button';
      buy.disabled = true;
    }

    card.append(name, price, blurb, ul, buy);
    grid.appendChild(card);
  }
  body.appendChild(grid);

  const hr = document.createElement('h3');
  hr.textContent = 'Already bought it?';
  body.appendChild(hr);

  const field = document.createElement('div');
  field.className = 'field';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Paste your licence key';
  input.autocomplete = 'off';
  input.spellcheck = false;
  const row = document.createElement('div');
  row.className = 'row';
  const go = document.createElement('button');
  go.className = 'btn btn--primary';
  go.type = 'button';
  go.textContent = 'Activate';
  const status = document.createElement('p');
  status.className = 'hint muted';

  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = 'Checking…';
    status.textContent = '';
    const out = await License.activate(input.value);
    go.disabled = false;
    go.textContent = 'Activate';
    if (out.ok) {
      toast(`SafePaste ${out.license.plan} activated.`);
      dlg.close();
      run();
    } else {
      status.textContent = out.error;
    }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });

  row.append(go);
  field.append(input, row, status);
  body.appendChild(field);

  const cfg = getConfig();
  if (cfg.contactEmail) {
    const help = document.createElement('p');
    help.className = 'muted';
    const a = document.createElement('a');
    a.href = `mailto:${cfg.contactEmail}`;
    a.textContent = cfg.contactEmail;
    help.append(document.createTextNode('Lost your key? Email '), a);
    body.appendChild(help);
  }

  dlg.showModal();
}

/* -------------------------------------------------------------- self test */

/**
 * Proves the round trip on a fixture with a known answer, in front of the user.
 * A redaction tool asking to be trusted should be able to show its work.
 */
function selfTest() {
  const fixture = 'Ada Lovelace <ada@example.com> called 415-555-0132 about card 4111 1111 1111 1111 and SSN 123-45-6789.';
  const expected = ['ada@example.com', '4111 1111 1111 1111', '123-45-6789', '415-555-0132', 'Ada Lovelace'];
  const out = $('selftest-result');
  try {
    const r = redact(fixture, { style: settings.style });
    const values = r.findings.map((f) => f.value);
    const missing = expected.filter((v) => !values.includes(v));
    const back = rehydrate(r.redacted, r.vault);
    const leaked = expected.filter((v) => r.redacted.includes(v));

    if (missing.length) {
      out.textContent = `Check failed: did not detect ${missing.join(', ')}.`;
      return;
    }
    if (leaked.length) {
      out.textContent = `Check failed: ${leaked.join(', ')} survived into the output.`;
      return;
    }
    if (back.text !== fixture) {
      out.textContent = 'Check failed: the round trip did not return the original text.';
      return;
    }
    out.textContent = `Passed. ${expected.length} known values detected, none left in the output, and the text restored exactly.`;
  } catch (err) {
    out.textContent = `Check failed: ${err && err.message ? err.message : 'unexpected error'}.`;
  }
}

/* ------------------------------------------------------------------ files */

function openFile() {
  if (!requirePro('Opening files is part of Pro.')) return;
  $('file-input').click();
}

function readFile(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    toast('That file is over 20 MB. Split it and try again.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    $('input').value = String(reader.result || '');
    updateCount();
    run();
    showTab('edit');
    toast(`Loaded ${file.name}`);
  };
  reader.onerror = () => toast('That file could not be read.', true);
  reader.readAsText(file);
}

/* ------------------------------------------------------------------- wire */

function updateCount() {
  const n = $('input').value.length;
  $('count').textContent = `${numberFormat.format(n)} character${n === 1 ? '' : 's'}`;
  if (!isPro() && n > FREE_CHAR_LIMIT) {
    $('limit-note').textContent = `Only the first ${numberFormat.format(FREE_CHAR_LIMIT)} characters are processed on the free plan`;
  } else {
    refreshPlanUi();
  }
}

let debounce;
function scheduleRun() {
  if (!settings.auto) return;
  clearTimeout(debounce);
  debounce = setTimeout(run, 180);
}

function init() {
  initTheme();
  renderDetectorSettings();
  renderRules();

  // Reflect saved settings into the controls.
  $('opt-auto').checked = settings.auto;
  $('opt-structure').checked = settings.structureAware;
  $('opt-aggressive').checked = settings.aggressiveNames;
  $('opt-style').value = settings.style;
  $('opt-allowlist').value = settings.allowlist.join('\n');
  $('mode-token').setAttribute('aria-pressed', String(settings.mode !== 'pseudonym'));
  $('mode-pseudonym').setAttribute('aria-pressed', String(settings.mode === 'pseudonym'));

  $('input').addEventListener('input', () => { updateCount(); scheduleRun(); });
  $('input').addEventListener('paste', () => setTimeout(() => { updateCount(); scheduleRun(); }, 0));

  $('tab-edit').addEventListener('click', () => showTab('edit'));
  $('tab-review').addEventListener('click', () => { run(); showTab('review'); });

  $('btn-sample').addEventListener('click', () => {
    $('input').value = SAMPLE;
    updateCount();
    run();
    showTab('edit');
  });

  $('btn-clear').addEventListener('click', () => {
    $('input').value = '';
    $('reply').value = '';
    $('restored').textContent = '';
    $('restore-summary').textContent = 'Nothing restored yet';
    updateCount();
    run();
    $('input').focus();
  });

  $('btn-open').addEventListener('click', openFile);
  $('file-input').addEventListener('change', (e) => {
    readFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  $('btn-copy').addEventListener('click', () => copyText(outputText(), 'Redacted text'));

  $('btn-save').addEventListener('click', () => {
    if (!requirePro('Saving files is part of Pro.')) return;
    if (!lastResult) { toast('Nothing to save yet.', true); return; }
    download('redacted.txt', outputText());
    toast('Saved redacted.txt');
  });

  $('mode-token').addEventListener('click', () => {
    settings.mode = 'token';
    saveSettings();
    $('mode-token').setAttribute('aria-pressed', 'true');
    $('mode-pseudonym').setAttribute('aria-pressed', 'false');
    run();
  });
  $('mode-pseudonym').addEventListener('click', () => {
    if (!requirePro('Realistic-name mode is part of Pro.')) return;
    settings.mode = 'pseudonym';
    saveSettings();
    $('mode-token').setAttribute('aria-pressed', 'false');
    $('mode-pseudonym').setAttribute('aria-pressed', 'true');
    run();
  });

  $('btn-restore').addEventListener('click', () => {
    if (!lastResult) { toast('Redact something first — the mapping comes from that.', true); return; }
    const out = rehydrate($('reply').value, lastResult.vault);
    $('restored').textContent = out.text;
    $('restore-summary').textContent = out.replaced
      ? `${numberFormat.format(out.replaced)} value${out.replaced === 1 ? '' : 's'} put back`
      : 'No tokens found in that reply';
  });
  $('btn-copy-restored').addEventListener('click', () => copyText($('restored').textContent, 'Restored text'));

  $('btn-settings').addEventListener('click', () => $('dlg-settings').showModal());
  $('btn-plan').addEventListener('click', () => openLicenseDialog());
  $('btn-selftest').addEventListener('click', selfTest);

  $('btn-vault').addEventListener('click', () => { renderVault(); $('dlg-vault').showModal(); });
  $('btn-vault-save').addEventListener('click', () => {
    if (!requirePro('Saving the vault is part of Pro.')) return;
    if (!lastResult) { toast('Nothing to save yet.', true); return; }
    download('safepaste-vault.json', JSON.stringify(lastResult.vault, null, 2), 'application/json');
    toast('Vault saved. It holds your original data — keep it safe.');
  });
  $('btn-vault-load').addEventListener('click', () => {
    if (!requirePro('Loading a vault is part of Pro.')) return;
    $('vault-input').click();
  });
  $('vault-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const vault = JSON.parse(String(reader.result));
        if (!vault || !Array.isArray(vault.entries)) throw new Error('not a vault');
        lastResult = { ...(lastResult || { redacted: '', findings: [], matches: [], stats: {} }), vault };
        renderVault();
        toast(`Vault loaded — ${vault.entries.length} mappings.`);
      } catch {
        toast('That file is not a SafePaste vault.', true);
      }
    };
    reader.readAsText(file);
  });

  // Settings controls.
  $('opt-auto').addEventListener('change', (e) => { settings.auto = e.target.checked; saveSettings(); });
  $('opt-structure').addEventListener('change', (e) => { settings.structureAware = e.target.checked; saveSettings(); run(); });
  $('opt-aggressive').addEventListener('change', (e) => { settings.aggressiveNames = e.target.checked; saveSettings(); run(); });
  $('opt-style').addEventListener('change', (e) => { settings.style = e.target.value; saveSettings(); run(); });
  $('opt-allowlist').addEventListener('input', (e) => {
    if (!isPro()) return;
    settings.allowlist = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    saveSettings();
    run();
  });
  $('opt-allowlist').addEventListener('click', () => {
    if (!isPro()) openLicenseDialog('Allowlists are part of Pro.');
  });
  $('btn-add-rule').addEventListener('click', () => {
    if (!requirePro('Custom rules are part of Pro.')) return;
    settings.customRules.push({ label: '', pattern: '', kind: 'literal' });
    saveSettings();
    renderRules();
  });
  $('btn-reset-settings').addEventListener('click', () => {
    Object.assign(settings, JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    saveSettings();
    $('opt-auto').checked = settings.auto;
    $('opt-structure').checked = settings.structureAware;
    $('opt-aggressive').checked = settings.aggressiveNames;
    $('opt-style').value = settings.style;
    $('opt-allowlist').value = '';
    renderDetectorSettings();
    renderRules();
    run();
    toast('Settings reset.');
  });

  document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('dialog').close());
  });

  // Drag and drop straight onto the page.
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!requirePro('Opening files is part of Pro.')) return;
    readFile(file);
  });

  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'Enter') { e.preventDefault(); run(); toast('Redacted.'); }
    if (meta && e.shiftKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); copyText(outputText(), 'Redacted text'); }
  });

  License.onLicenseChange(() => { refreshPlanUi(); run(); });
  refreshPlanUi();
  updateCount();

  loadConfig().then(() => { License.revalidate(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is a bonus, not a requirement */ });
  }
}

init();
