/**
 * The redaction pipeline.
 *
 * scan -> allowlist -> overlap resolution -> token assignment -> splice
 *
 * Everything here is pure and synchronous. No network, no storage, no clock
 * beyond an optional timestamp on the vault. That is deliberate: the whole
 * product promise is that a document handed to `redact()` never leaves the
 * function, and a pure function is the cheapest way to make that auditable.
 */

import { DETECTORS, DETECTOR_BY_ID, DEFAULT_ENABLED } from './detectors.js';
import { createFaker } from './fake.js';

export const VAULT_VERSION = 1;

/** Detector ids whose token label differs from a plain uppercase of the id. */
const TOKEN_NAME_OVERRIDES = {
  person_name: 'PERSON',
  org_name: 'ORG',
  nhs_number: 'NHS',
  routing_number: 'ROUTING',
  secret_assignment: 'SECRET',
  bearer: 'CREDENTIAL',
  driver_license: 'DRIVER_LICENCE',
  tfn_abn: 'TAX_ID_AU',
  swift_bic: 'SWIFT',
  crypto_wallet: 'CRYPTO',
};

export function tokenName(detectorId) {
  return TOKEN_NAME_OVERRIDES[detectorId] || detectorId.toUpperCase();
}

const STYLES = {
  bracket: (body) => `[${body}]`,
  curly: (body) => `{{${body}}}`,
  angle: (body) => `<${body}>`,
  bare: (body) => body,
};

const RISK_WEIGHT = { critical: 12, high: 7, medium: 3, low: 1 };

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ----------------------------------------------------------------- options */

export function normalizeOptions(options = {}) {
  const enabled = new Set(options.enabled || DEFAULT_ENABLED);
  return {
    enabled,
    mode: options.mode === 'pseudonym' ? 'pseudonym' : 'token',
    style: STYLES[options.style] ? options.style : 'bracket',
    aggressiveNames: !!options.aggressiveNames,
    structureAware: options.structureAware !== false,
    allowlist: (options.allowlist || []).map((s) => String(s).trim()).filter(Boolean),
    customRules: options.customRules || [],
    seedVault: options.seedVault || null,
    salt: options.salt || '',
    minConfidence: typeof options.minConfidence === 'number' ? options.minConfidence : 0,
  };
}

/* ------------------------------------------------------------ custom rules */

/**
 * User-defined rules. A rule is `{ label, pattern, kind }` where kind is
 * 'literal' (case-insensitive, whole-word) or 'regex'. Custom rules outrank
 * every built-in detector, because a user who typed "Project Kingfisher" into
 * the rules box means it.
 */
function scanCustomRules(text, opts) {
  const out = [];
  for (const rule of opts.customRules) {
    const raw = String(rule.pattern ?? rule.value ?? '').trim();
    if (!raw) continue;
    const type = sanitizeLabel(rule.label || 'CUSTOM');
    let re;
    try {
      re = rule.kind === 'regex'
        ? new RegExp(raw, rule.flags && rule.flags.includes('i') ? 'gi' : 'g')
        : new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(raw)}(?![\\p{L}\\p{N}_])`, 'giu');
    } catch {
      continue; // an invalid user regex must never break a redaction
    }
    for (const m of text.matchAll(re)) {
      if (!m[0]) continue;
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        confidence: 1,
        detector: `custom:${type}`,
        priority: 120,
        risk: rule.risk || 'high',
        type,
        custom: true,
      });
    }
  }
  return out;
}

function sanitizeLabel(label) {
  const s = String(label).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'CUSTOM';
}

/* -------------------------------------------------- structure-aware passes */

/**
 * Column headings that name a direct identifier.
 *
 * Deliberately limited to identifiers. A free-text column — "notes", "comments",
 * "diagnosis" — is left to the ordinary detectors, which still scrub the names
 * and numbers inside it. Blanking those columns wholesale would hand the model
 * an empty document, which is the failure mode that makes people stop using a
 * redaction tool.
 */
const PII_COLUMN_RE = /^\s*"?\s*(?:(?:first|last|full|given|family|sur)[_\s-]?name|name|e-?mail|email[_\s-]?address|phone|telephone|mobile|cell|fax|address|street|address[_\s-]?line[_\s-]?\d?|city|postcode|post[_\s-]?code|zip|zipcode|ssn|social[_\s-]?security|sin|nino|dob|date[_\s-]?of[_\s-]?birth|birth[_\s-]?date|passport|licence|license|account[_\s-]?(?:no|number)|iban|card[_\s-]?(?:no|number)|cvv|patient[_\s-]?(?:id|name)?|mrn)\s*"?\s*$/i;

/**
 * Column-aware CSV/TSV redaction. A column headed "Email" is redacted whole,
 * even for rows whose value the regex detectors would miss (blanks, typos,
 * "n/a — ask Dave"). Without this, one malformed row leaks.
 */
function scanDelimited(text) {
  const nl = text.indexOf('\n');
  if (nl < 0 || nl > 4000) return [];
  const header = text.slice(0, nl);
  const delim = pickDelimiter(header);
  if (!delim) return [];

  const headerCells = splitRow(header, delim);
  if (headerCells.length < 2) return [];
  const flagged = new Map();
  headerCells.forEach((cell, i) => {
    if (PII_COLUMN_RE.test(cell.value)) flagged.set(i, sanitizeLabel(cell.value.replace(/"/g, '')));
  });
  if (!flagged.size) return [];

  const out = [];
  let offset = nl + 1;
  const rest = text.slice(offset);
  for (const line of rest.split('\n')) {
    if (line.trim()) {
      const cells = splitRow(line, delim);
      for (const [idx, label] of flagged) {
        const cell = cells[idx];
        if (!cell) continue;
        const value = cell.value.replace(/^"|"$/g, '').trim();
        if (!value || value === '-' || /^(?:n\/?a|null|none|unknown)$/i.test(value)) continue;
        const lead = cell.value.indexOf(value);
        const start = offset + cell.start + (lead < 0 ? 0 : lead);
        out.push({
          start,
          end: start + value.length,
          value,
          confidence: 0.95,
          detector: 'csv_column',
          priority: 110,
          risk: 'high',
          type: label,
        });
      }
    }
    offset += line.length + 1;
  }
  return out;
}

function pickDelimiter(header) {
  const counts = [[',', (header.match(/,/g) || []).length], ['\t', (header.match(/\t/g) || []).length],
    [';', (header.match(/;/g) || []).length]];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] >= 1 ? counts[0][0] : null;
}

/** Minimal RFC 4180 row splitter that reports each cell's offset. */
function splitRow(line, delim) {
  const cells = [];
  let i = 0;
  let start = 0;
  let quoted = false;
  while (i <= line.length) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') i++;
        else quoted = false;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delim || i === line.length) {
      cells.push({ value: line.slice(start, i), start });
      start = i + 1;
    }
    i++;
  }
  return cells;
}

/* -------------------------------------------------- overlap resolution */

/** Keeps a start-sorted list of accepted spans and rejects anything overlapping. */
class SpanSet {
  constructor() { this.spans = []; }

  tryAdd(span) {
    const { spans } = this;
    let lo = 0;
    let hi = spans.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (spans[mid].start < span.start) lo = mid + 1;
      else hi = mid;
    }
    const prev = spans[lo - 1];
    const next = spans[lo];
    if (prev && prev.end > span.start) return false;
    if (next && span.end > next.start) return false;
    spans.splice(lo, 0, span);
    return true;
  }
}

export function resolveOverlaps(matches) {
  const ranked = [...matches].sort((a, b) => (b.priority - a.priority)
    || ((b.end - b.start) - (a.end - a.start))
    || (b.confidence - a.confidence)
    || (a.start - b.start));
  const set = new SpanSet();
  for (const m of ranked) set.tryAdd(m);
  return set.spans;
}

/* ------------------------------------------------------------------ redact */

/**
 * @returns {{
 *   redacted: string, vault: object, findings: Array, matches: Array, stats: object
 * }}
 */
export function redact(text, options = {}) {
  const opts = normalizeOptions(options);
  const source = String(text ?? '');

  let matches = [];
  for (const d of DETECTORS) {
    if (!opts.enabled.has(d.id)) continue;
    let found;
    try {
      found = d.scan(source, opts) || [];
    } catch (err) {
      // A single bad detector must never take the whole redaction down.
      found = [];
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`detector ${d.id} failed`, err);
      }
    }
    for (const m of found) {
      matches.push({
        ...m,
        detector: d.id,
        priority: d.priority,
        risk: d.risk,
        type: tokenName(d.id),
      });
    }
  }
  matches.push(...scanCustomRules(source, opts));
  if (opts.structureAware) matches.push(...scanDelimited(source));

  matches = matches.filter((m) => m.confidence >= opts.minConfidence);
  matches = applyAllowlist(matches, opts.allowlist);

  const accepted = resolveOverlaps(matches);

  /* ---- token assignment ---- */
  const bySurface = new Map();          // "TYPE\u0000value" -> entry
  const typeCounters = new Map();       // TYPE -> next index
  const entityNumbers = new Map();      // detector entity id -> display number
  const style = STYLES[opts.style];
  const faker = opts.mode === 'pseudonym'
    ? createFaker({ salt: opts.salt, sourceText: source })
    : null;

  // Seed from a previous vault so a multi-file batch keeps stable identities.
  if (opts.seedVault && Array.isArray(opts.seedVault.entries)) {
    for (const e of opts.seedVault.entries) {
      bySurface.set(`${e.type}\u0000${e.value}`, { ...e, count: 0, seeded: true });
      const n = /_(\d+)(?:_|$)/.exec(e.token);
      if (n) {
        const idx = Number(n[1]);
        typeCounters.set(e.type, Math.max(typeCounters.get(e.type) || 0, idx));
      }
    }
  }

  // In pseudonym mode an address should belong to the person it names, so
  // "sarah.whitfield@..." becomes "tatum.havercroft@example.com" rather than an
  // unrelated stranger's. Built up front because the address can appear in the
  // document before the person's name does.
  const entityByNamePart = new Map();
  if (faker) {
    for (const m of accepted) {
      if (m.type !== 'PERSON' || m.entity == null) continue;
      for (const part of m.value.split(/[^\p{L}]+/u)) {
        if (part.length >= 3) entityByNamePart.set(part.toLowerCase(), m.entity);
      }
    }
  }

  /**
   * A token body is unusable if another entry already claims it, or if the
   * document itself already contains that exact string — a template that reads
   * "use [PERSON_1] as a placeholder" must not collide with a real person.
   */
  const bodyTaken = (body) => {
    for (const e of bySurface.values()) if (e.body === body) return true;
    return source.includes(style(body));
  };

  /** The person an address or handle names, when the document mentions them. */
  const relatedEntity = (m) => {
    if (m.entity != null) return m.entity;
    if (!faker || (m.type !== 'EMAIL' && m.type !== 'SOCIAL_HANDLE')) return undefined;
    const local = String(m.value).split('@')[0].toLowerCase();
    for (const [part, id] of entityByNamePart) {
      if (local.includes(part)) return id;
    }
    return undefined;
  };

  for (const m of accepted) {
    const key = `${m.type}\u0000${m.value}`;
    let entry = bySurface.get(key);
    if (!entry) {
      let body;
      if (m.type === 'PERSON' && m.entity != null) {
        if (!entityNumbers.has(m.entity)) entityNumbers.set(m.entity, entityNumbers.size + 1);
        const n = entityNumbers.get(m.entity);
        const suffix = m.part === 'first' ? '_FIRSTNAME' : m.part === 'last' ? '_LASTNAME' : '';
        body = `PERSON_${n}${suffix}`;
        // Disambiguate against another entity, or against text already in the
        // document that happens to look like one of our tokens.
        let bump = 1;
        while (bodyTaken(body)) body = `PERSON_${n}${suffix}_${++bump}`;
      } else {
        let n = typeCounters.get(m.type) || 0;
        do { n += 1; body = `${m.type}_${n}`; } while (bodyTaken(body));
        typeCounters.set(m.type, n);
      }
      const replacement = faker
        ? faker(m.type, m.value, { entity: relatedEntity(m), part: m.part })
        : style(body);
      entry = {
        token: replacement,
        body,
        value: m.value,
        type: m.type,
        detector: m.detector,
        risk: m.risk,
        confidence: m.confidence,
        count: 0,
      };
      bySurface.set(key, entry);
    }
    entry.count++;
    entry.confidence = Math.max(entry.confidence, m.confidence);
    m.token = entry.token;
    m.body = entry.body;
  }

  /* ---- splice ---- */
  let out = '';
  let cursor = 0;
  for (const m of accepted) {
    out += source.slice(cursor, m.start);
    out += m.token;
    cursor = m.end;
  }
  out += source.slice(cursor);

  const entries = [...bySurface.values()].filter((e) => e.count > 0 || e.seeded);
  const vault = {
    version: VAULT_VERSION,
    mode: opts.mode,
    style: opts.style,
    createdAt: new Date().toISOString(),
    entries: entries.map(({ seeded, ...e }) => e),
  };

  return {
    redacted: out,
    vault,
    findings: buildFindings(entries),
    matches: accepted,
    stats: buildStats(accepted, entries, source),
  };
}

/**
 * Allowlisting clears a match when the term equals it, or appears inside it as
 * a whole word. The substring rule is what people expect: putting "Acme" on the
 * list should also stop "Acme Corp" being redacted.
 */
function applyAllowlist(matches, allowlist) {
  if (!allowlist.length) return matches;
  const exact = new Set(allowlist.map((s) => s.toLowerCase()));
  const wordRes = allowlist
    .filter((a) => a.length >= 3)
    .map((a) => {
      try {
        return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(a)}(?![\\p{L}\\p{N}_])`, 'iu');
      } catch { return null; }
    })
    .filter(Boolean);
  return matches.filter((m) => {
    const v = m.value.toLowerCase();
    if (exact.has(v)) return false;
    return !wordRes.some((re) => re.test(m.value));
  });
}

function buildFindings(entries) {
  return [...entries]
    .filter((e) => e.count > 0)
    .sort((a, b) => (RISK_WEIGHT[b.risk] || 0) - (RISK_WEIGHT[a.risk] || 0)
      || b.count - a.count
      || a.type.localeCompare(b.type))
    .map((e) => ({
      type: e.type,
      label: DETECTOR_BY_ID.get(e.detector)?.label || e.type.replace(/_/g, ' '),
      group: DETECTOR_BY_ID.get(e.detector)?.group || 'Custom',
      token: e.token,
      value: e.value,
      count: e.count,
      risk: e.risk,
      confidence: e.confidence,
    }));
}

function buildStats(accepted, entries, source) {
  const byType = {};
  let weighted = 0;
  for (const m of accepted) {
    byType[m.type] = (byType[m.type] || 0) + 1;
    weighted += RISK_WEIGHT[m.risk] || 1;
  }
  const score = Math.min(100, Math.round(weighted));
  return {
    occurrences: accepted.length,
    distinct: entries.filter((e) => e.count > 0).length,
    byType,
    characters: source.length,
    riskScore: score,
    riskLabel: score === 0 ? 'Clean' : score < 15 ? 'Low' : score < 40 ? 'Moderate' : score < 70 ? 'High' : 'Severe',
    needsReview: accepted.filter((m) => m.confidence < 1).length,
  };
}

/* --------------------------------------------------------------- rehydrate */

/** Bracket pair for each token style, used to build the re-hydration pattern. */
const STYLE_WRAPPERS = {
  bracket: ['\\[\\s*', '\\s*\\]'],
  curly: ['\\{\\{\\s*', '\\s*\\}\\}'],
  angle: ['<\\s*', '\\s*>'],
  bare: null,
};

/**
 * Put the real values back.
 *
 * Models reformat, so matching is case-insensitive and accepts the token with
 * or without the brackets we added — `[PERSON_1]`, `**[person_1]**`, or a bare
 * `PERSON_1` in a bullet list all restore.
 *
 * What it must never do is consume a bracket that belonged to the document. In
 * bare style, `<EMAIL_1>` is the user's own angle brackets around our token, and
 * an over-eager pattern that swallowed them would hand back a corrupted email
 * header. So only the style's own wrapper is ever eaten, and only as a matched
 * pair; anything else falls through to the bare-body branch.
 */
export function rehydrate(text, vault) {
  const source = String(text ?? '');
  if (!vault || !Array.isArray(vault.entries) || !vault.entries.length) {
    return { text: source, replaced: 0, restored: [], missing: [] };
  }

  const entries = [...vault.entries].sort((a, b) => {
    const av = vault.mode === 'pseudonym' ? a.token : (a.body || a.token);
    const bv = vault.mode === 'pseudonym' ? b.token : (b.body || b.token);
    return String(bv).length - String(av).length;
  });

  let out = source;
  let replaced = 0;
  const restored = [];
  const missing = [];

  for (const e of entries) {
    let re;
    if (vault.mode === 'pseudonym') {
      re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(e.token)}(?![\\p{L}\\p{N}_])`, 'gu');
    } else {
      const body = escapeRe(e.body || stripWrappers(e.token));
      const wrap = STYLE_WRAPPERS[vault.style] ?? STYLE_WRAPPERS.bracket;
      const alternatives = wrap ? [`${wrap[0]}${body}${wrap[1]}`, body] : [body];
      re = new RegExp(
        `(?<![A-Za-z0-9_])(?:${alternatives.join('|')})(?![A-Za-z0-9_])`,
        'gi',
      );
    }
    let hits = 0;
    out = out.replace(re, () => { hits++; return e.value; });
    if (hits) {
      replaced += hits;
      restored.push({ token: e.token, value: e.value, type: e.type, count: hits });
    } else {
      missing.push({ token: e.token, type: e.type });
    }
  }

  return { text: out, replaced, restored, missing };
}

function stripWrappers(token) {
  return String(token).replace(/^[[{<(]+|[\]}>)]+$/g, '').replace(/^\{|\}$/g, '');
}

/** Round-trip check used by the UI's self-test and by the test suite. */
export function verifyRoundTrip(original, options = {}) {
  const r = redact(original, options);
  const back = rehydrate(r.redacted, r.vault);
  return { ok: back.text === original, redacted: r.redacted, restored: back.text, result: r, back };
}

export { DETECTORS, DEFAULT_ENABLED };
