import test from 'node:test';
import assert from 'node:assert/strict';
import {
  redact, rehydrate, resolveOverlaps, normalizeOptions, tokenName,
} from '../public/assets/js/engine/redact.js';

/* ------------------------------------------------------- overlap resolution */

test('the higher-priority detector wins an overlapping span', () => {
  const spans = [
    { start: 0, end: 10, priority: 50, confidence: 1, tag: 'low' },
    { start: 2, end: 8, priority: 90, confidence: 1, tag: 'high' },
  ];
  assert.deepEqual(resolveOverlaps(spans).map((s) => s.tag), ['high']);
});

test('at equal priority the longer span wins', () => {
  const spans = [
    { start: 0, end: 4, priority: 50, confidence: 1, tag: 'short' },
    { start: 0, end: 9, priority: 50, confidence: 1, tag: 'long' },
  ];
  assert.deepEqual(resolveOverlaps(spans).map((s) => s.tag), ['long']);
});

test('non-overlapping spans all survive and come back start-sorted', () => {
  const spans = [
    { start: 20, end: 25, priority: 10, confidence: 1, tag: 'c' },
    { start: 0, end: 5, priority: 90, confidence: 1, tag: 'a' },
    { start: 10, end: 15, priority: 50, confidence: 1, tag: 'b' },
  ];
  assert.deepEqual(resolveOverlaps(spans).map((s) => s.tag), ['a', 'b', 'c']);
});

test('a credit card beats the phone number hiding inside it', () => {
  const r = redact('Card 4111 1111 1111 1111 on file');
  assert.deepEqual(r.findings.map((f) => f.type), ['CREDIT_CARD']);
});

test('an email beats the person name inside its local part', () => {
  const r = redact('Write to michael.okonkwo@example.com now');
  assert.deepEqual(r.findings.map((f) => f.type), ['EMAIL']);
  assert.equal(r.findings[0].value, 'michael.okonkwo@example.com');
});

/* ---------------------------------------------------------------- allowlist */

test('an allowlisted term is left in place', () => {
  const doc = 'Contact: Ada Lovelace and Grace Hopper.';
  const r = redact(doc, { allowlist: ['Ada Lovelace'] });
  assert.ok(r.redacted.includes('Ada Lovelace'));
  assert.ok(!r.redacted.includes('Grace Hopper'));
});

test('allowlisting matches whole words inside a longer finding', () => {
  const doc = 'Signed with Northgate Legal LLP yesterday.';
  const on = redact(doc, { enabled: ['org_name'] });
  assert.equal(on.findings.length, 1);

  const off = redact(doc, { enabled: ['org_name'], allowlist: ['Northgate'] });
  assert.equal(off.findings.length, 0, 'the allowlisted word clears the whole match');
});

test('allowlisting is case-insensitive', () => {
  const r = redact('Contact: Ada Lovelace.', { allowlist: ['ada lovelace'] });
  assert.equal(r.findings.length, 0);
});

test('an allowlist entry that matches nothing is harmless', () => {
  const doc = 'Contact: Ada Lovelace.';
  const a = redact(doc);
  const b = redact(doc, { allowlist: ['Nobody At All', '', '   '] });
  assert.equal(a.redacted, b.redacted);
});

/* ------------------------------------------------------------- custom rules */

test('a literal custom rule redacts and round trips', () => {
  const doc = 'Project Kingfisher ships in Q3. Kingfisher is confidential.';
  const r = redact(doc, {
    customRules: [{ label: 'Codename', pattern: 'Kingfisher', kind: 'literal' }],
  });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].type, 'CODENAME');
  assert.equal(r.findings[0].count, 2);
  assert.ok(!r.redacted.includes('Kingfisher'));
  assert.equal(rehydrate(r.redacted, r.vault).text, doc);
});

test('a custom rule matches whole words only', () => {
  const r = redact('Kingfisherman is a different word.', {
    customRules: [{ label: 'Codename', pattern: 'Kingfisher', kind: 'literal' }],
  });
  assert.equal(r.findings.length, 0);
});

test('a regex custom rule works', () => {
  const r = redact('Refs: ACME-1234 and ACME-9999.', {
    customRules: [{ label: 'Jira', pattern: 'ACME-\\d{4}', kind: 'regex' }],
  });
  assert.deepEqual(r.findings.map((f) => f.value).sort(), ['ACME-1234', 'ACME-9999']);
});

test('an invalid custom regex is skipped, not thrown', () => {
  const doc = 'Nothing special here at all.';
  const r = redact(doc, { customRules: [{ label: 'Bad', pattern: '([unclosed', kind: 'regex' }] });
  assert.equal(r.redacted, doc);
});

test('custom rules outrank built-in detectors', () => {
  const r = redact('Mail ada@example.com now.', {
    customRules: [{ label: 'Domain', pattern: 'ada@example\\.com', kind: 'regex' }],
  });
  assert.deepEqual(r.findings.map((f) => f.type), ['DOMAIN']);
});

/* -------------------------------------------------------- structure-aware */

test('a PII-named CSV column is redacted whole, including odd rows', () => {
  const csv = [
    'id,full name,email,notes',
    '1,Ada Lovelace,ada@example.com,fine',
    '2,not a real name at all,broken-not-an-email,fine',
    '3,,,fine',
  ].join('\n');

  const r = redact(csv);
  assert.ok(!r.redacted.includes('not a real name at all'),
    'a value the name detector would miss is still redacted by column');
  assert.ok(!r.redacted.includes('broken-not-an-email'));
  assert.ok(r.redacted.includes('fine'), 'the notes column is untouched');
  assert.equal(rehydrate(r.redacted, r.vault).text, csv);
});

test('column redaction can be switched off', () => {
  const csv = 'id,full name\n1,not a real name at all';
  const r = redact(csv, { structureAware: false });
  assert.ok(r.redacted.includes('not a real name at all'));
});

test('a CSV with no PII columns is untouched', () => {
  const csv = 'sku,qty,price\nA-1,4,19.99\nB-2,7,24.50';
  const r = redact(csv);
  assert.equal(r.redacted, csv);
});

test('quoted CSV cells containing the delimiter are handled', () => {
  const csv = 'name,notes\n"Lovelace, Ada","says hello, twice"';
  const r = redact(csv);
  assert.ok(r.redacted.includes('says hello, twice'), 'the notes cell survives');
  assert.equal(rehydrate(r.redacted, r.vault).text, csv);
});

/* ------------------------------------------------------------------ options */

test('normalizeOptions falls back safely on nonsense input', () => {
  const o = normalizeOptions({ mode: 'nonsense', style: 'nope', allowlist: null });
  assert.equal(o.mode, 'token');
  assert.equal(o.style, 'bracket');
  assert.deepEqual(o.allowlist, []);
  assert.ok(o.enabled.size > 0);
});

test('minConfidence drops the detectors that were only guessing', () => {
  const doc = 'Billing address is 42 Kingsway Terrace, London.';
  assert.ok(redact(doc).findings.length > 0);
  assert.equal(redact(doc, { minConfidence: 1 }).findings.length, 0,
    'the address detector reports 0.9 and is filtered out');
});

test('disabling a detector really disables it', () => {
  const doc = 'Mail ada@example.com now.';
  assert.equal(redact(doc, { enabled: [] }).findings.length, 0);
  assert.equal(redact(doc, { enabled: [] }).redacted, doc);
});

test('token names are stable and readable', () => {
  assert.equal(tokenName('person_name'), 'PERSON');
  assert.equal(tokenName('email'), 'EMAIL');
  assert.equal(tokenName('nhs_number'), 'NHS');
  assert.equal(tokenName('something_new'), 'SOMETHING_NEW');
});

/* -------------------------------------------------------------------- stats */

test('stats summarise what was found', () => {
  const r = redact('SSN 123-45-6789 and mail ada@example.com and 415-555-0132.');
  assert.equal(r.stats.occurrences, 3);
  assert.equal(r.stats.distinct, 3);
  assert.equal(r.stats.byType.SSN, 1);
  // critical (12) + high (7) + high (7) = 26
  assert.equal(r.stats.riskScore, 26);
  assert.equal(r.stats.riskLabel, 'Moderate');
  assert.equal(r.stats.characters, 58);
});

test('a clean document reports a clean score', () => {
  const r = redact('Nothing sensitive in this sentence.');
  assert.equal(r.stats.occurrences, 0);
  assert.equal(r.stats.riskScore, 0);
  assert.equal(r.stats.riskLabel, 'Clean');
  assert.deepEqual(r.findings, []);
});

test('repeated values are counted once but replaced everywhere', () => {
  const r = redact('Mail ada@example.com, then ada@example.com again.');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].count, 2);
  assert.equal((r.redacted.match(/\[EMAIL_1\]/g) || []).length, 2);
});

/* --------------------------------------------------------------- robustness */

test('non-string input does not throw', () => {
  for (const input of [null, undefined, 12345, {}, []]) {
    const r = redact(input);
    assert.equal(typeof r.redacted, 'string');
    assert.ok(Array.isArray(r.findings));
  }
});

test('the vault is JSON-serialisable and survives a round trip through JSON', () => {
  const doc = 'Call Ada Lovelace on 415-555-0132.';
  const r = redact(doc);
  const revived = JSON.parse(JSON.stringify(r.vault));
  assert.equal(rehydrate(r.redacted, revived).text, doc);
});

test('a vault records the mode and style it was made with', () => {
  const a = redact('Mail ada@example.com', { mode: 'pseudonym', style: 'curly' });
  assert.equal(a.vault.mode, 'pseudonym');
  assert.equal(a.vault.style, 'curly');
  assert.equal(a.vault.version, 1);
});
