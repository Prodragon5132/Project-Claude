import test from 'node:test';
import assert from 'node:assert/strict';
import { redact, rehydrate, verifyRoundTrip } from '../public/assets/js/engine/redact.js';
import { DETECTORS } from '../public/assets/js/engine/detectors.js';

/**
 * Round-trip fidelity is the product's core contract: redact, send the text
 * somewhere, paste the reply back, and get your own words returned exactly.
 * A single dropped character here is a bug report.
 */

const DOCS = {
  email: `From: Sarah Whitfield <sarah.whitfield@northgate-legal.co.uk>
To: Dr. Ramirez
Subject: Claim 88213

Our client Michael Okonkwo (DOB: 14/03/1979, NHS No: 943 476 5919) called.
Reach him on +44 20 7946 0958. Card 5555 5555 5555 4444 exp 04/27 was declined.
Route payment to GB82 WEST 1234 5698 7654 32 instead.

Regards,
Sarah Whitfield`,

  ticket: `Ticket #4417 — password reset loop

Customer: Priya Raghunathan (priya.raghunathan@example.org, +1 415-555-0132)
Account: 000123456789
Last seen from 203.0.113.44 at 09:12 UTC.

The bearer token in their session was Bearer abcdef1234567890xyzQ and the
webhook secret is whsec_abcdefghijklmnopqrstuvwxyz012345.`,

  csv: `name,email,phone,notes
Ada Lovelace,ada@example.com,415-555-0100,first entry
Grace Hopper,grace@example.com,415-555-0101,second entry
,,,blank row
"Katherine, J.",kj@example.com,,quoted comma`,

  markdown: `# Incident report

**Reporter:** Devon Ashcombe
**Contact:** devon@example.net

## Timeline
- 09:00 — alert fired on 10.42.7.13
- 09:05 — paged Dr. Ramirez
- 09:30 — resolved

> The customer (SSN 123-45-6789) asked for a callback on (415) 555-0132.`,

  unicode: `Café notes — Renée Müller wrote from renee.muller@example.de.
Emoji survive too: 🌍 ✅ 🔐
Ideographs: 東京都渋谷区
Combining marks: é vs é`,

  edges: `Empty-ish line follows.


Trailing spaces here:
Tabs:\tone\ttwo
Windows line ends handled: done.
A lone token-looking thing: [PERSON_9] should survive as literal text.`,

  repeated: `Sarah Whitfield emailed Sarah Whitfield about Sarah Whitfield.
Sarah also called Sarah. sarah.whitfield@example.com twice:
sarah.whitfield@example.com`,
};

for (const [name, doc] of Object.entries(DOCS)) {
  test(`round trip is byte-exact: ${name} (token mode)`, () => {
    const { ok, restored } = verifyRoundTrip(doc);
    assert.ok(ok, `mismatch:\n---want---\n${doc}\n---got---\n${restored}`);
  });

  test(`round trip is byte-exact: ${name} (pseudonym mode)`, () => {
    const { ok, restored } = verifyRoundTrip(doc, { mode: 'pseudonym' });
    assert.ok(ok, `mismatch:\n---want---\n${doc}\n---got---\n${restored}`);
  });
}

for (const style of ['bracket', 'curly', 'angle', 'bare']) {
  test(`round trip is byte-exact with the ${style} token style`, () => {
    for (const doc of Object.values(DOCS)) {
      const { ok } = verifyRoundTrip(doc, { style });
      assert.ok(ok, `${style} failed on a document`);
    }
  });
}

test('round trip holds with every detector switched on', () => {
  const all = DETECTORS.map((d) => d.id);
  for (const [name, doc] of Object.entries(DOCS)) {
    const { ok } = verifyRoundTrip(doc, { enabled: all, aggressiveNames: true });
    assert.ok(ok, `all-detectors round trip failed on ${name}`);
  }
});

test('re-hydration tolerates the formatting a model adds', () => {
  const source = 'Contact Michael Okonkwo at m.okonkwo@example.com or 415-555-0132.';
  const { vault } = redact(source);

  const replies = [
    'I will email **[EMAIL_1]** and call [PHONE_1].',
    'Reach out to `[PERSON_1]` first.',
    '- [PERSON_1]\n- [EMAIL_1]\n- [PHONE_1]',
    'Lowercased by the model: [person_1] and [email_1].',
    'Bare, no brackets: PERSON_1 said so.',
  ];
  for (const reply of replies) {
    const out = rehydrate(reply, vault);
    assert.ok(out.replaced > 0, `nothing restored in: ${reply}`);
    assert.ok(!/\[?(?:PERSON|EMAIL|PHONE)_\d/i.test(out.text),
      `token survived re-hydration in: ${out.text}`);
  }
});

test('PERSON_1 is not matched inside PERSON_10', () => {
  // Force a document with more than ten distinct people.
  const names = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson',
    'Dorothy Vaughan', 'Mary Jackson', 'Margaret Hamilton', 'Barbara Liskov',
    'Frances Allen', 'Shafi Goldwasser', 'Radia Perlman', 'Karen Uhlenbeck'];
  const doc = names.map((n) => `Contact: ${n}`).join('\n');
  const r = redact(doc);
  assert.ok(r.findings.length >= 11, 'expected at least eleven people');

  const back = rehydrate(r.redacted, r.vault);
  assert.equal(back.text, doc);
});

test('literal text that looks like a token survives redaction unchanged', () => {
  const doc = 'The template uses [PERSON_1] as a placeholder. Do not touch it.';
  const r = redact(doc);
  assert.equal(r.redacted, doc, 'nothing to redact here');
});

test('re-hydration reports tokens the reply dropped', () => {
  const source = 'Call Michael Okonkwo on 415-555-0132 or email m@example.com.';
  const { vault } = redact(source);
  const out = rehydrate('Only [PHONE_1] came back.', vault);
  assert.equal(out.restored.length, 1);
  assert.ok(out.missing.length >= 1, 'the untouched tokens are reported as missing');
});

test('an empty or absent vault is a no-op rather than a crash', () => {
  assert.equal(rehydrate('hello', null).text, 'hello');
  assert.equal(rehydrate('hello', { entries: [] }).text, 'hello');
  assert.equal(rehydrate('', { entries: [{ token: '[X_1]', body: 'X_1', value: 'y' }] }).text, '');
});

test('a seeded vault keeps identities stable across documents', () => {
  const doc1 = 'Michael Okonkwo called about invoice 1.';
  const doc2 = 'Michael Okonkwo called again about invoice 2.';

  const first = redact(doc1);
  const second = redact(doc2, { seedVault: first.vault });

  const t1 = first.findings.find((f) => f.type === 'PERSON').token;
  const t2 = second.findings.find((f) => f.type === 'PERSON').token;
  assert.equal(t1, t2, 'the same person keeps the same token in the next file');
  assert.equal(rehydrate(second.redacted, second.vault).text, doc2);
});

test('very large documents round trip and stay fast', () => {
  const block = `Ada Lovelace <ada@example.com> called 415-555-0132 about card 4111 1111 1111 1111.
Ordinary filler prose that must survive untouched, repeated many times over.
`;
  const doc = block.repeat(800); // ~150 KB
  const started = Date.now();
  const { ok } = verifyRoundTrip(doc);
  const elapsed = Date.now() - started;
  assert.ok(ok, 'large document must round trip exactly');
  assert.ok(elapsed < 20000, `redaction took ${elapsed}ms, which is too slow`);
});
