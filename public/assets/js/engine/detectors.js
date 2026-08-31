/**
 * Detector library.
 *
 * Each detector is a plain object:
 *   id        stable identifier, used in settings and in the vault
 *   label     human name shown in the findings list
 *   group     UI grouping
 *   priority  overlap resolution — higher wins when two detectors claim the
 *             same span (a credit card beats a phone number beats a bare digit run)
 *   risk      'critical' | 'high' | 'medium' | 'low' — drives the risk score
 *   default   whether it is on out of the box
 *   scan(text) -> [{ start, end, value, confidence }]
 *
 * Confidence is 1.0 for checksum-verified or structurally unmistakable values,
 * and lower where the detector is relying on shape or context alone. The UI
 * shows anything below 1.0 as "review me".
 */

import * as V from './validators.js';
import {
  GIVEN_NAMES, SURNAMES, HONORIFICS, NAME_SUFFIXES, STOPWORDS, ORG_SUFFIXES, CONTEXT_HINTS,
} from './lexicon.js';

/* ------------------------------------------------------------------ helpers */

/** Lowercased slice of text ending at `index`, for context sniffing. */
function before(text, index, window = 48) {
  return text.slice(Math.max(0, index - window), index).toLowerCase();
}

function after(text, index, window = 48) {
  return text.slice(index, Math.min(text.length, index + window)).toLowerCase();
}

const hintCache = new Map();

/**
 * Context hints must match as whole words. A plain substring test finds "ip"
 * inside "shipped" and "dns" inside "kidnaps", which is how a build number
 * becomes an IP address.
 */
function hintRe(hints) {
  const key = hints.join('');
  let re = hintCache.get(key);
  if (!re) {
    const body = hints
      .map((h) => h.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter(Boolean)
      .join('|');
    re = new RegExp(`(?:^|[^a-z0-9])(?:${body})(?![a-z0-9])`, 'i');
    hintCache.set(key, re);
  }
  return re;
}

/** True when any hint word appears as a whole word within `window` chars before `index`. */
function hintBefore(text, index, hints, window = 48) {
  return hintRe(hints).test(before(text, index, window));
}

/** Collect matches from a regex, optionally narrowing to a capture group. */
function collect(text, re, { group = 0, confidence = 1, validate, transform } = {}) {
  const out = [];
  for (const m of text.matchAll(re)) {
    let start;
    let end;
    let value;
    if (group === 0) {
      start = m.index;
      end = m.index + m[0].length;
      value = m[0];
    } else {
      if (m[group] === undefined) continue;
      const idx = m.indices && m.indices[group];
      if (!idx) continue;
      [start, end] = idx;
      value = m[group];
    }
    if (transform) {
      const t = transform({ text, match: m, start, end, value });
      if (!t) continue;
      ({ start, end, value } = { start, end, value, ...t });
    }
    if (validate && !validate(value, m, text, start)) continue;
    if (end > start) out.push({ start, end, value, confidence });
  }
  return out;
}

/** Trim trailing punctuation that a regex greedily swallowed from a URL. */
function trimTrailing(value, start) {
  let v = value;
  while (v.length && /[.,;:!?'"»)\]}]/.test(v[v.length - 1])) {
    // keep a closing paren if it balances one inside the match
    const ch = v[v.length - 1];
    if (ch === ')' && (v.match(/\(/g) || []).length > (v.match(/\)/g) || []).length - 1) break;
    v = v.slice(0, -1);
  }
  return { start, end: start + v.length, value: v };
}

/* --------------------------------------------------------------- detectors */

export const DETECTORS = [
  /* ---------------------------------------------------------- credentials */
  {
    id: 'private_key',
    label: 'Private key block',
    group: 'Credentials',
    priority: 100,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY(?: BLOCK)?-----/g,
    ),
  },
  {
    id: 'api_key',
    label: 'API key / access token',
    group: 'Credentials',
    priority: 96,
    risk: 'critical',
    default: true,
    scan: (t) => {
      const patterns = [
        /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ABIA|ACCA)[0-9A-Z]{16}\b/g, // AWS key id
        /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,                                     // GitHub token
        /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g,
        /\bxox[baprse]-[A-Za-z0-9-]{10,}\b/g,                                     // Slack
        /\b[sr]k_(?:live|test)_[A-Za-z0-9]{10,}\b/g,                              // Stripe
        /\bwhsec_[A-Za-z0-9]{24,}\b/g,
        /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,                                         // Anthropic
        /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g,                          // OpenAI
        /\bAIza[0-9A-Za-z_-]{35}\b/g,                                             // Google
        /\bya29\.[0-9A-Za-z_-]{20,}\b/g,
        /\b(?:AC|SK)[0-9a-fA-F]{32}\b/g,                                          // Twilio
        /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,                        // SendGrid
        /\bnpm_[A-Za-z0-9]{36}\b/g,
        /\bkey-[0-9a-f]{32}\b/g,                                                  // Mailgun
        /\bglpat-[A-Za-z0-9_-]{20,}\b/g,                                          // GitLab
        /\bdop_v1_[a-f0-9]{64}\b/g,                                               // DigitalOcean
        /\bshpat_[a-fA-F0-9]{32}\b/g,                                             // Shopify
        /\bEAACEdEose0cBA[0-9A-Za-z]+\b/g,                                        // Facebook
        /\bfigd_[A-Za-z0-9_-]{40,}\b/g,                                           // Figma
        /\bhf_[A-Za-z0-9]{34,}\b/g,                                               // Hugging Face
        /\brk_(?:live|test)_[A-Za-z0-9]{10,}\b/g,
      ];
      const out = [];
      for (const re of patterns) out.push(...collect(t, re));
      return out;
    },
  },
  {
    id: 'jwt',
    label: 'JSON Web Token',
    group: 'Credentials',
    priority: 94,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g),
  },
  {
    id: 'secret_assignment',
    label: 'Secret in assignment',
    group: 'Credentials',
    priority: 92,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /(?:\b|_)(?:api[_-]?key|apikey|api[_-]?secret|secret[_-]?key|secret|token|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|pwd|passphrase|private[_-]?key|credential)\b["'\]]?\s*(?:[:=]|=>)\s*["'`]?([^\s"'`,;)\]}]{6,200})/gdi,
      {
        group: 1,
        confidence: 0.9,
        validate: (v) => {
          if (/^(?:true|false|null|none|undefined|nil|xxx+|\*+|\.{3,})$/i.test(v)) return false;
          // Interpolations and angle-bracket placeholders reference a secret,
          // they are not one. The closing brace may fall outside the capture.
          if (/^[<${%]/.test(v)) return false;
          // Prose that follows the word "password" in a sentence, not a secret.
          if (/^(?:your|my|the|some|example|placeholder|changeme|redacted|hidden|required|reset|expired|invalid|incorrect|correct|missing|empty|blank|unknown|protected|enabled|disabled|optional|rotated|revoked|pending|unchanged)$/i.test(v)) return false;
          if (/^\[[A-Z_]+_\d+\]$/.test(v)) return false; // already a token
          return v.length >= 6;
        },
      },
    ),
  },
  {
    id: 'bearer',
    label: 'Bearer / Basic credential',
    group: 'Credentials',
    priority: 92,
    risk: 'critical',
    default: true,
    scan: (t) => [
      ...collect(t, /\b(?:Bearer|Token)\s+([A-Za-z0-9._~+/=-]{16,})/gd, { group: 1 }),
      ...collect(t, /\bBasic\s+([A-Za-z0-9+/=]{16,})/gd, { group: 1 }),
      ...collect(t, /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:([^\s:@/]{3,})@/gd, { group: 1 }),
    ],
  },
  {
    id: 'connection_string',
    label: 'Database connection string',
    group: 'Credentials',
    priority: 91,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis(?:s)?|amqps?|mssql|sqlserver|clickhouse|cassandra):\/\/[^\s<>"'`]+/g,
      { transform: ({ value, start }) => trimTrailing(value, start) },
    ),
  },
  {
    id: 'url_with_secret',
    label: 'URL containing a secret',
    group: 'Credentials',
    priority: 90,
    risk: 'high',
    default: true,
    scan: (t) => collect(
      t,
      /\bhttps?:\/\/[^\s<>"'`]*[?&](?:token|key|api_?key|access_?token|auth|password|secret|sig|signature|session|code)=[^\s&<>"'`]+[^\s<>"'`]*/gi,
      { transform: ({ value, start }) => trimTrailing(value, start) },
    ),
  },

  /* ------------------------------------------------------------- financial */
  {
    id: 'credit_card',
    label: 'Payment card number',
    group: 'Financial',
    priority: 86,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /(?<![\d.-])(?:\d[ -]?){12,18}\d(?![\d-])/g, {
      validate: (v) => {
        const d = v.replace(/[^0-9]/g, '');
        if (d.length < 13 || d.length > 19) return false;
        if (!/^[2-6]/.test(d)) return false;
        if (/^(\d)\1+$/.test(d)) return false;
        return V.luhn(d);
      },
    }),
  },
  {
    id: 'iban',
    label: 'IBAN',
    group: 'Financial',
    priority: 85,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /\b[A-Z]{2}\d{2}[ ]?(?:[A-Z0-9]{4}[ ]?){2,7}[A-Z0-9]{1,4}\b/g, {
      validate: (v) => V.iban(v),
    }),
  },
  {
    id: 'swift_bic',
    label: 'SWIFT / BIC code',
    group: 'Financial',
    priority: 78,
    risk: 'high',
    default: true,
    scan: (t) => collect(t, /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, {
      confidence: 0.7,
      validate: (v, m, text, start) => hintBefore(text, start, ['swift', 'bic', 'bank code', 'wire']),
    }),
  },
  {
    id: 'routing_number',
    label: 'ABA routing number',
    group: 'Financial',
    priority: 77,
    risk: 'high',
    default: true,
    scan: (t) => collect(t, /\b\d{9}\b/g, {
      validate: (v, m, text, start) => V.routing(v)
        && hintBefore(text, start, ['routing', 'aba', 'rtn', 'transit', 'wire', 'ach']),
    }),
  },
  {
    id: 'bank_account',
    label: 'Bank account number',
    group: 'Financial',
    priority: 76,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /\b\d{7,17}\b/g, {
      confidence: 0.75,
      validate: (v, m, text, start) => hintBefore(text, start, CONTEXT_HINTS.ACCOUNT, 32),
    }),
  },
  {
    id: 'crypto_wallet',
    label: 'Crypto wallet address',
    group: 'Financial',
    priority: 80,
    risk: 'high',
    default: true,
    scan: (t) => [
      ...collect(t, /\b0x[a-fA-F0-9]{40}\b/g),
      ...collect(t, /\bbc1[ac-hj-np-z02-9]{11,71}\b/g),
      ...collect(t, /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, {
        confidence: 0.75,
        validate: (v) => V.base58(v) && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v),
      }),
      ...collect(t, /\b(?:4[0-9AB][0-9a-zA-Z]{93})\b/g), // Monero
    ],
  },

  /* ----------------------------------------------------- government / health */
  {
    id: 'ssn',
    label: 'US Social Security number',
    group: 'Government ID',
    priority: 84,
    risk: 'critical',
    default: true,
    scan: (t) => [
      ...collect(t, /\b\d{3}-\d{2}-\d{4}\b/g, { validate: (v) => V.ssn(v) }),
      ...collect(t, /\b\d{3}\s\d{2}\s\d{4}\b/g, { validate: (v) => V.ssn(v) }),
      ...collect(t, /\b\d{9}\b/g, {
        confidence: 0.85,
        validate: (v, m, text, start) => V.ssn(v)
          && hintBefore(text, start, ['ssn', 'social security', 'soc sec', 's.s.n', 'ss#'], 40),
      }),
    ],
  },
  {
    id: 'nino',
    label: 'UK National Insurance number',
    group: 'Government ID',
    priority: 83,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]?\b/g, {
      validate: (v) => V.nino(v),
      confidence: 0.9,
    }),
  },
  {
    id: 'sin',
    label: 'Canadian SIN',
    group: 'Government ID',
    priority: 83,
    risk: 'critical',
    default: true,
    scan: (t) => collect(t, /\b\d{3}[ -]\d{3}[ -]\d{3}\b/g, { validate: (v) => V.sin(v) }),
  },
  {
    id: 'tfn_abn',
    label: 'Australian TFN / ABN',
    group: 'Government ID',
    priority: 83,
    risk: 'critical',
    default: true,
    scan: (t) => [
      ...collect(t, /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g, { validate: (v) => V.abn(v) }),
      ...collect(t, /\b\d{3}\s?\d{3}\s?\d{3}\b/g, {
        confidence: 0.8,
        validate: (v, m, text, start) => V.tfn(v) && hintBefore(text, start, ['tfn', 'tax file']),
      }),
    ],
  },
  {
    id: 'nhs_number',
    label: 'NHS number',
    group: 'Health',
    priority: 83,
    risk: 'critical',
    default: true,
    // A 3-3-4 digit group is also the shape of a North American phone number,
    // and one in eleven of those passes the NHS mod-11 check by chance. Requiring
    // a health-context word keeps the label honest; anything missed here is still
    // caught (and still redacted) by the phone detector.
    scan: (t) => collect(t, /\b\d{3}[ -]?\d{3}[ -]?\d{4}\b/g, {
      validate: (v, m, text, start) => V.nhs(v)
        && hintBefore(text, start, ['nhs', 'patient', 'health', 'hospital', 'gp', 'surgery'], 40),
    }),
  },
  {
    id: 'npi',
    label: 'US NPI (provider ID)',
    group: 'Health',
    priority: 79,
    risk: 'high',
    default: true,
    scan: (t) => collect(t, /\b[12]\d{9}\b/g, {
      confidence: 0.85,
      validate: (v, m, text, start) => V.npi(v)
        && hintBefore(text, start, ['npi', 'provider', 'clinician', 'physician'], 40),
    }),
  },
  {
    id: 'mrn',
    label: 'Medical record number',
    group: 'Health',
    priority: 74,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:mrn|medical record (?:number|no\.?|#)|patient (?:id|number|no\.?|#)|chart (?:number|no\.?|#))\s*[:#=-]?\s*([A-Z0-9][A-Z0-9-]{3,19})\b/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'passport',
    label: 'Passport number',
    group: 'Government ID',
    priority: 74,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\bpassport\s*(?:no\.?|number|#)?\s*[:#=-]?\s*([A-Z0-9]{6,9})\b/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'driver_license',
    label: "Driver's licence number",
    group: 'Government ID',
    priority: 74,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:driver'?s? licen[cs]e|driving licen[cs]e|\bdl)\s*(?:no\.?|number|#)?\s*[:#=-]?\s*([A-Z0-9][A-Z0-9-]{4,17})\b/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'tax_id',
    label: 'Tax ID (EIN / VAT / UTR)',
    group: 'Government ID',
    priority: 74,
    risk: 'high',
    default: true,
    scan: (t) => [
      ...collect(t, /\b\d{2}-\d{7}\b/g, {
        confidence: 0.85,
        validate: (v, m, text, start) => hintBefore(text, start, ['ein', 'employer id', 'federal tax', 'fein', 'tax id']),
      }),
      ...collect(t, /\b(?:GB|DE|FR|IT|ES|NL|BE|PL|SE|DK|IE|AT|PT|FI|CZ|RO|GR|HU)[ ]?\d{8,12}\b/g, {
        confidence: 0.8,
        validate: (v, m, text, start) => hintBefore(text, start, ['vat', 'tax']),
      }),
      ...collect(t, /\b(?:utr|unique taxpayer reference)\s*[:#=-]?\s*(\d{10})\b/gdi, { group: 1 }),
    ],
  },
  {
    id: 'record_id',
    label: 'Policy / claim / employee ID',
    group: 'Identifiers',
    priority: 72,
    risk: 'high',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:policy|claim|member|subscriber|employee|staff|badge|case|reference|customer|client|account holder|ticket|matter|file)\s*(?:id|no\.?|number|#|ref)?\s*[:#=-]?\s*([A-Z0-9][A-Z0-9-]{3,19})\b/gdi,
      {
        group: 1,
        confidence: 0.9,
        // The identifier word is optional so "Claim 88213" is caught, which means
        // the captured value must carry a digit or "Customer Service" becomes an ID.
        validate: (v) => /\d/.test(v),
      },
    ),
  },
  {
    id: 'card_expiry',
    label: 'Card expiry date',
    group: 'Financial',
    priority: 75,
    risk: 'high',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:exp(?:iry|ires?|iration)?|valid\s*thru|good\s*thru)\.?\s*(?:date)?\s*[:#=-]?\s*(\d{1,2}\s*[/\-]\s*\d{2,4})\b/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'cvv',
    label: 'Card security code',
    group: 'Financial',
    priority: 75,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:cvv2?|cvc2?|cv2|csc|(?:card\s*)?(?:security|verification)\s*(?:code|value))\s*[:#=-]?\s*(\d{3,4})\b/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'vin',
    label: 'Vehicle VIN',
    group: 'Identifiers',
    priority: 79,
    risk: 'medium',
    default: true,
    scan: (t) => collect(t, /\b[A-HJ-NPR-Z0-9]{17}\b/g, { validate: (v) => V.vin(v) }),
  },

  /* --------------------------------------------------------------- contact */
  {
    id: 'email',
    label: 'Email address',
    group: 'Contact',
    priority: 82,
    risk: 'high',
    default: true,
    scan: (t) => collect(
      t,
      /[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}/g,
      { validate: (v) => !v.endsWith('.') && v.length <= 254 },
    ),
  },
  {
    id: 'phone',
    label: 'Phone number',
    group: 'Contact',
    priority: 70,
    risk: 'high',
    default: true,
    scan: (t) => {
      const out = [];
      // International, explicit country code.
      out.push(...collect(t, /(?<![\w.])\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d{1,4}(?:[\s.-]?\d{2,4}){1,4}(?![\w])/g, {
        validate: (v) => v.replace(/\D/g, '').length >= 8 && v.replace(/\D/g, '').length <= 15,
      }));
      // North American, separated or parenthesised.
      out.push(...collect(t, /(?<![\w.-])(?:\(([2-9]\d{2})\)|([2-9]\d{2}))[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})(?![\d-])/g, {
        validate: (v) => /[\s.()-]/.test(v),
      }));
      // UK style: 0xxxx xxxxxx / 0xx xxxx xxxx
      out.push(...collect(t, /(?<![\w.])0\d{2,4}[\s-]\d{3,4}[\s-]?\d{3,4}(?![\w])/g, {
        confidence: 0.85,
        validate: (v) => {
          const d = v.replace(/\D/g, '');
          return d.length >= 10 && d.length <= 11;
        },
      }));
      // Bare 10-11 digits, only with an explicit label.
      out.push(...collect(t, /(?<![\w.])\d{10,11}(?![\w])/g, {
        confidence: 0.7,
        validate: (v, m, text, start) => hintBefore(text, start, ['phone', 'tel', 'mobile', 'cell', 'fax', 'contact number', 'call'], 28),
      }));
      return out;
    },
  },
  {
    id: 'address',
    label: 'Street address',
    group: 'Contact',
    priority: 60,
    risk: 'high',
    default: true,
    scan: (t) => collect(
      t,
      /\b\d{1,6}(?:[-–]\d{1,6})?\s+(?:[A-Z][A-Za-z.'-]+\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter|Trail|Trl|Parkway|Pkwy|Highway|Hwy|Way|Square|Sq|Close|Crescent|Cres|Gardens|Gdns|Row|Walk|Mews)\b\.?(?:\s*(?:#|Apt\.?|Apartment|Suite|Ste\.?|Unit|Floor|Fl\.?|Room|Rm\.?)\s*[A-Za-z0-9-]+)?/g,
      { confidence: 0.9 },
    ),
  },
  {
    id: 'postal_code',
    label: 'Postal code',
    group: 'Contact',
    priority: 50,
    risk: 'medium',
    default: true,
    scan: (t) => [
      // UK postcode — distinctive enough to stand alone.
      ...collect(t, /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/g, { confidence: 0.9 }),
      // Canadian postal code.
      ...collect(t, /\b[ABCEGHJ-NPRSTVXY]\d[A-Z][ -]?\d[A-Z]\d\b/g, { confidence: 0.9 }),
      // US ZIP, only when labelled or ZIP+4.
      ...collect(t, /\b\d{5}-\d{4}\b/g, { confidence: 0.85 }),
      ...collect(t, /\b\d{5}\b/g, {
        confidence: 0.7,
        validate: (v, m, text, start) => hintBefore(text, start, ['zip', 'postal', 'post code', 'postcode'], 24),
      }),
    ],
  },
  {
    id: 'coordinates',
    label: 'GPS coordinates',
    group: 'Contact',
    priority: 65,
    risk: 'high',
    default: true,
    scan: (t) => collect(t, /(?<![\w.])[-+]?(?:[1-8]?\d(?:\.\d{4,12})|90(?:\.0+)?)\s*,\s*[-+]?(?:(?:1[0-7]\d|[1-9]?\d)(?:\.\d{4,12})|180(?:\.0+)?)(?![\w.])/g),
  },
  {
    id: 'social_handle',
    label: 'Social handle',
    group: 'Contact',
    priority: 40,
    risk: 'medium',
    default: true,
    scan: (t) => collect(t, /(?<![\w@/.])@([A-Za-z][A-Za-z0-9_.]{2,29})(?![\w@.])/gd, {
      group: 1,
      confidence: 0.8,
      validate: (v) => !STOPWORDS.has(v.toLowerCase()),
    }),
  },

  /* ------------------------------------------------------------ networking */
  {
    id: 'ip_address',
    label: 'IP address',
    group: 'Network',
    priority: 75,
    risk: 'medium',
    default: true,
    scan: (t) => [
      // The trailing guard rejects a fifth octet but tolerates a sentence-ending
      // period, so "the box is at 10.42.7.13." is still caught.
      ...collect(t, /(?<![\w.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\w])(?!\.\d)/g, {
        confidence: 0.95,
        validate: (v, m, text, start) => {
          if (v === '0.0.0.0' || v === '255.255.255.255') return false;
          // "v1.2.3.4" / "version 1.2.3.4" are release numbers, not hosts.
          const ctx = before(text, start, 12);
          if (/\bv$/.test(ctx) || /version\s*$/.test(ctx)) return false;
          const parts = v.split('.').map(Number);
          if (parts.every((n) => n <= 20) && !hintBefore(text, start, ['ip', 'host', 'addr', 'server', 'gateway', 'dns', 'ping'], 32)) return false;
          return true;
        },
      }),
      ...collect(t, /(?<![\w:])(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}(?![\w:])/g),
      ...collect(t, /(?<![\w:])(?:[0-9A-Fa-f]{1,4}:){1,7}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6})?(?![\w:])/g, {
        confidence: 0.85,
        validate: (v) => v.includes('::') && v.replace(/[^:]/g, '').length >= 2 && /[0-9A-Fa-f]/.test(v),
      }),
    ],
  },
  {
    id: 'mac_address',
    label: 'MAC address',
    group: 'Network',
    priority: 75,
    risk: 'medium',
    default: true,
    scan: (t) => collect(t, /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g),
  },
  {
    id: 'url',
    label: 'Web address (any URL)',
    group: 'Network',
    priority: 68,
    risk: 'low',
    default: false,
    scan: (t) => collect(t, /\bhttps?:\/\/[^\s<>"'`]+/g, {
      transform: ({ value, start }) => trimTrailing(value, start),
    }),
  },
  {
    id: 'hostname',
    label: 'Internal hostname',
    group: 'Network',
    priority: 45,
    risk: 'medium',
    default: false,
    scan: (t) => collect(t, /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:internal|local|corp|lan|intranet|test|dev|staging|prod)\b/gi),
  },

  /* --------------------------------------------------------------- people */
  {
    id: 'person_name',
    label: 'Person name',
    group: 'People',
    priority: 42,
    risk: 'high',
    default: true,
    scan: scanPersonNames,
  },
  {
    id: 'org_name',
    label: 'Organisation name',
    group: 'People',
    priority: 41,
    risk: 'medium',
    default: false,
    scan: (t) => {
      // Longest first, so "Inc." wins over "Inc" and the period stays with the name.
      const suffixes = [...ORG_SUFFIXES]
        .sort((a, b) => b.length - a.length)
        .map((s) => s.replace(/\./g, '\\.'))
        .join('|');
      const re = new RegExp(
        `\\b(?:[A-Z][A-Za-z0-9&'’-]*\\.?\\s+){1,4}(?:${suffixes})(?![A-Za-z])`,
        'g',
      );
      return collect(t, re, { confidence: 0.85 });
    },
  },
  {
    id: 'date_of_birth',
    label: 'Date of birth',
    group: 'People',
    priority: 64,
    risk: 'critical',
    default: true,
    scan: (t) => collect(
      t,
      /\b(?:d\.?o\.?b\.?|date of birth|birth ?date|birthday|born(?: on)?)\s*[:=-]?\s*((?:\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})|(?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* ,? ?\d{4})|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}))/gdi,
      { group: 1 },
    ),
  },
  {
    id: 'date',
    label: 'Any date',
    group: 'People',
    priority: 30,
    risk: 'low',
    default: false,
    scan: (t) => [
      ...collect(t, /\b\d{4}-\d{2}-\d{2}\b/g, {
        validate: (v) => {
          const [y, m, d] = v.split('-').map(Number);
          return V.validDate(y, m, d);
        },
      }),
      ...collect(t, /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g),
    ],
  },
];

export const DETECTOR_BY_ID = new Map(DETECTORS.map((d) => [d.id, d]));

export const DEFAULT_ENABLED = DETECTORS.filter((d) => d.default).map((d) => d.id);

/* ------------------------------------------------------- person name logic */

const PARTICLES = new Set(['de', 'del', 'della', 'der', 'den', 'di', 'da', 'do', 'dos', 'du',
  'van', 'von', 'la', 'le', 'el', 'al', 'bin', 'ibn', 'ter', 'ten', 'op', 'st']);

/**
 * A label that introduces a name. The colon is mandatory for the short words —
 * "to", "from", "client" — because without it every "send the report to Accounts
 * Payable" in the language becomes a person. The "…by" forms are unambiguous
 * enough to stand without one.
 */
const LABEL_RE = /(?:\b(?:name|full name|first name|last name|contact|attn|attention|from|to|cc|bcc|signed|signature|author|owner|manager|patient|client|customer|employee|applicant|candidate|witness|guardian|beneficiary|recipient|sender)\s*:\s*$)|(?:\b(?:prepared|reviewed|approved|submitted|requested|signed|written|authored|filed|completed)\s+by\s*:?\s*$)|(?:\b(?:attn|attention)\.?\s*:?\s*$)/i;

const SIGNOFF_RE = /\b(?:regards|sincerely|best|cheers|thanks|thank you|yours(?: truly| sincerely| faithfully)?|respectfully|warmly|kind regards|best regards|all the best)\s*,?\s*\n+\s*$/i;

/**
 * Tokenise into capitalised runs and decide which are people.
 *
 * Two passes. The first finds names with hard evidence — an honorific, a
 * gazetteer surname, a "Name:" label, a signature block. The second propagates:
 * once "Sarah Whitfield" is known to be a person, a bare "Whitfield" later in
 * the same document is one too, and gets its own linked token so re-hydration
 * stays byte-exact.
 */
export function scanPersonNames(text, opts = {}) {
  const aggressive = !!opts.aggressiveNames;
  const runs = capitalisedRuns(text);

  /* ---- pass 1: score every capitalised run ---- */
  const candidates = [];
  for (const run of runs) {
    // An honorific is evidence about the name, not part of it. Leaving "Dr." in
    // the text keeps the sentence readable and keeps the token to just the name.
    let words = run.words;
    let leadingHonorific = false;
    while (words.length > 1 && HONORIFICS.has(words[0].text.replace(/\.$/, '').toLowerCase())) {
      words = words.slice(1);
      leadingHonorific = true;
    }
    if (!words.length) continue;
    if (words.length === 1 && HONORIFICS.has(words[0].text.replace(/\.$/, '').toLowerCase())) continue;
    const runStart = words[0].start;
    const runEnd = words[words.length - 1].end;

    const lows = words.map((w) => w.text.toLowerCase());
    const firstLow = lows[0];
    const lastLow = lows[lows.length - 1];

    // Runs made entirely of stopwords or acronyms are headings, not people.
    if (words.every((w) => STOPWORDS.has(w.text.toLowerCase()) || /^[A-Z0-9]{1,5}\.?$/.test(w.text))) continue;

    const preceding = text.slice(Math.max(0, runStart - 64), runStart);
    const hasLabel = LABEL_RE.test(preceding);
    const hasSignoff = SIGNOFF_RE.test(preceding);
    const honorificMatch = /(?:^|[\s(])([A-Za-z]{2,12})\.?\s*$/.exec(preceding);
    const hasHonorific = leadingHonorific
      || !!(honorificMatch && HONORIFICS.has(honorificMatch[1].toLowerCase()));

    const givenFirst = GIVEN_NAMES.has(firstLow) && !STOPWORDS.has(firstLow);
    const surnameLast = SURNAMES.has(lastLow) && !STOPWORDS.has(lastLow);
    const givenOnly = GIVEN_NAMES.has(firstLow) && !SURNAMES.has(firstLow);
    const surnameOnly = SURNAMES.has(firstLow) && !GIVEN_NAMES.has(firstLow);

    let confidence = 0;
    let first = '';
    let last = '';
    let part = 'full';

    if (words.length >= 2) {
      if (givenFirst && surnameLast) confidence = 1;
      else if (hasHonorific) confidence = 0.97;
      else if (givenFirst || surnameLast) confidence = 0.92;
      else if (hasLabel || hasSignoff) confidence = 0.88;
      else if (aggressive) confidence = 0.6;
      first = words[0].text;
      last = words[words.length - 1].text;
    } else {
      const word = words[0].text;
      // A lone capitalised token needs supporting evidence, and which half of a
      // name it is decides which token suffix it gets.
      if (givenOnly) part = 'first';
      else if (surnameOnly) part = 'last';
      else part = hasHonorific ? 'last' : 'first';

      if (hasHonorific) confidence = 0.95;
      else if (hasLabel || hasSignoff) confidence = 0.85;
      else if (givenOnly) confidence = aggressive ? 0.8 : 0.7;
      else if (surnameOnly && aggressive) confidence = 0.6;

      if (part === 'first') first = word; else last = word;
    }

    if (!confidence) continue;
    if (confidence < 0.8 && !aggressive) continue;
    candidates.push({
      start: runStart, end: runEnd, value: text.slice(runStart, runEnd),
      confidence, first, last, part,
    });
  }

  /* ---- pass 2: build entities, full names first so singles can attach ---- */
  const entities = [];
  const findEntity = (first, last) => {
    const f = (first || '').toLowerCase();
    const l = (last || '').toLowerCase();
    if (f && l) return entities.find((e) => e.first === f && e.last === l);
    if (f) return entities.find((e) => e.first === f);
    if (l) return entities.find((e) => e.last === l);
    return undefined;
  };
  const attach = (c) => {
    let e = findEntity(c.first, c.last);
    if (!e) {
      e = {
        id: entities.length + 1,
        first: (c.first || '').toLowerCase(),
        last: (c.last || '').toLowerCase(),
        firstText: c.first || '',
        lastText: c.last || '',
      };
      entities.push(e);
    } else {
      // Fill in the half we did not know yet.
      if (!e.first && c.first) { e.first = c.first.toLowerCase(); e.firstText = c.first; }
      if (!e.last && c.last) { e.last = c.last.toLowerCase(); e.lastText = c.last; }
    }
    c.entity = e.id;
  };

  for (const c of candidates) if (c.part === 'full') attach(c);
  for (const c of candidates) if (c.part !== 'full') attach(c);

  /* ---- pass 3: propagate known name parts to bare mentions ---- */
  const confirmed = candidates.map(({ first, last, ...c }) => c);
  const extra = [];
  const overlapsConfirmed = (s, en) => confirmed.some((c) => s < c.end && en > c.start);
  for (const e of entities) {
    for (const [part, word] of [['first', e.firstText], ['last', e.lastText]]) {
      if (!word || word.length < 3) continue;
      if (STOPWORDS.has(word.toLowerCase())) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}'’-])${escapeRe(word)}(?![\\p{L}\\p{N}'’-])`, 'gu');
      for (const m of text.matchAll(re)) {
        const s = m.index;
        const en = s + m[0].length;
        if (overlapsConfirmed(s, en)) continue;
        if (extra.some((x) => s < x.end && en > x.start)) continue;
        extra.push({ start: s, end: en, value: m[0], confidence: 0.9, entity: e.id, part });
      }
    }
  }

  return [...confirmed, ...extra].sort((a, b) => a.start - b.start);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find maximal runs of capitalised words, allowing lowercase nobiliary
 * particles ("van der Berg") and trailing suffixes ("Jr.").
 */
function capitalisedRuns(text) {
  const wordRe = /[\p{Lu}][\p{L}'’-]*\.?|[\p{Ll}][\p{Ll}'’]*/gu;
  const tokens = [];
  for (const m of text.matchAll(wordRe)) {
    let word = m[0];
    let end = m.index + word.length;
    if (word.endsWith('.')) {
      // A trailing period belongs to the name only when it marks an initial
      // ("J."), an honorific ("Dr.") or a suffix ("Jr."). Otherwise it ends the
      // sentence, and swallowing it would corrupt the text on re-hydration.
      const bare = word.slice(0, -1);
      const low = bare.toLowerCase();
      if (!(bare.length === 1 || HONORIFICS.has(low) || NAME_SUFFIXES.has(low))) {
        word = bare;
        end -= 1;
      }
    }
    tokens.push({ text: word, start: m.index, end });
  }

  const runs = [];
  let current = null;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const isUpper = /^\p{Lu}/u.test(tok.text);
    const isParticle = PARTICLES.has(tok.text.toLowerCase());
    // Only plain spaces may sit between the words of one name. Anything else —
    // a bracket, a comma, a newline — ends the run, so "Michael Okonkwo (DOB"
    // cannot be swallowed whole.
    const gap = current ? text.slice(current.end, tok.start) : null;
    const gapOk = current && gap.length <= 2 && /^[ \u00A0]*$/.test(gap);

    if (isUpper) {
      if (current && gapOk) {
        current.words.push(tok);
        current.end = tok.end;
      } else {
        current = { start: tok.start, end: tok.end, words: [tok] };
        runs.push(current);
      }
    } else if (isParticle && current && gapOk && i + 1 < tokens.length && /^\p{Lu}/u.test(tokens[i + 1].text)) {
      current.words.push(tok);
      current.end = tok.end;
    } else if (current && gapOk && NAME_SUFFIXES.has(tok.text.replace('.', '').toLowerCase())) {
      current.words.push(tok);
      current.end = tok.end;
    } else {
      current = null;
    }
  }

  // A run longer than 5 words is a heading or a title, not a person.
  return runs
    .filter((r) => r.words.length <= 5)
    .map((r) => {
      // Trim a leading token that is a sentence-initial stopword ("The Smith report").
      while (r.words.length > 1 && STOPWORDS.has(r.words[0].text.toLowerCase())) {
        r.words.shift();
        r.start = r.words[0].start;
      }
      while (r.words.length > 1 && STOPWORDS.has(r.words[r.words.length - 1].text.toLowerCase())) {
        r.words.pop();
        r.end = r.words[r.words.length - 1].end;
      }
      return r;
    })
    .filter((r) => r.words.length >= 1);
}
