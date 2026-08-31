import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../public/assets/js/engine/redact.js';

/**
 * The corpus that decides whether the tool is usable.
 *
 * A redactor that flags everything is worse than useless: people stop reading
 * the findings list, or worse, paste a mangled document into a model and get
 * nonsense back. Each document here is ordinary working text that a real user
 * would paste, and each must come back untouched.
 */

const CLEAN_DOCS = {
  'release notes': `
Release 4.2.1 — 18 March

Fixed a race in the scheduler that could drop the last item in a batch.
Upgraded from version 1.2.3.4 of the parser to 2.0.0. The Marketing Team
asked for CSV export, which now ships behind a flag.

Known issue: the retry budget resets at midnight UTC rather than on the hour.
`,

  'meeting notes': `
Agenda — Quarterly Review

1. Q3 revenue came in 12% above plan. North America led, Western Europe flat.
2. The Final Report goes to Accounts Payable on Friday.
3. Mark the invoice as Paid once the wire clears.
4. Open question: do we renew the SOC 2 audit in March or April?

Action items were assigned to the Platform Team and the Data Team.
`,

  'technical prose': `
We migrated from Postgres to MySQL last April, then back again in June.
The service listens on port 8080 and health checks hit /healthz every 30s.
Build 1.2.3.4 shipped on Tuesday; build 1.2.3.5 rolled back within the hour.

Set the timeout to 30000 milliseconds. The queue holds up to 100000 messages.
Order 4155550132 was reprocessed twice.
`,

  'policy text': `
This policy applies to all staff. Passwords must be rotated every 90 days.
The password is required for access to the reporting console. If a password
is expired, request a reset through the service desk rather than by email.

Records are retained for 7 years in line with statutory requirements.
`,

  'product copy': `
Northwind ships in three sizes: Small, Medium and Large. Every plan includes
unlimited exports and priority support. Compare Basic against Professional
before you decide. The Enterprise tier adds SSO and audit logs.

Prices start at 29 per seat per month, billed annually.
`,

  'code review comment': `
The helper in utils.js is doing too much. Split the parsing out of the loop,
and return early when the list is empty. Also, the variable named token here
shadows the outer one, which made the stack trace confusing.

Nit: prefer const over let on line 42.
`,

  'legal boilerplate': `
Nothing in this Agreement shall limit either party's liability for fraud.
The Supplier warrants that the Services will be performed with reasonable
skill and care. Clause 12.4 survives termination.

Governing law is the law of England and Wales.
`,
};

for (const [name, doc] of Object.entries(CLEAN_DOCS)) {
  test(`no false positives: ${name}`, () => {
    const r = redact(doc);
    const detail = r.findings.map((f) => `${f.type}=${JSON.stringify(f.value)}`).join(', ');
    assert.equal(r.findings.length, 0, `expected a clean document, got: ${detail}`);
    assert.equal(r.redacted, doc, 'a clean document must come back byte-identical');
    assert.equal(r.stats.riskScore, 0);
    assert.equal(r.stats.riskLabel, 'Clean');
  });
}

test('common English words that appear in the name gazetteer stay put', () => {
  // Every one of these is also a first name somewhere; context has to win.
  const lines = [
    'Please mark the record as complete.',
    'We will bill the client in June.',
    'The grant was approved in May.',
    'Add a summary row at the top.',
    'Frank discussion is welcome.',
    'The art department signed off.',
  ];
  for (const line of lines) {
    const r = redact(line);
    assert.equal(r.redacted, line, `${line} -> ${r.redacted}`);
  }
});

test('numbers that are not identifiers stay put', () => {
  const lines = [
    'We processed 000123456789 records overnight.',
    'The build ran for 1234567890 milliseconds.',
    'Invoice total was 9876543210987654321 cents (a deliberate overflow test).',
    'HTTP 404 and HTTP 500 both spiked.',
    'The array had 90210 entries.',
  ];
  for (const line of lines) {
    const r = redact(line);
    assert.equal(r.redacted, line, `${line} -> ${r.redacted}`);
  }
});

test('a document with real PII is still mostly left alone', () => {
  const doc = `Quarterly summary for the Platform Team.

Revenue rose 12% against plan. The migration from Postgres finished on time.
Our contact for the audit is Priya Raghunathan (priya@example.com).
Everything else in this note is ordinary prose that must survive untouched.`;

  const r = redact(doc);
  const types = new Set(r.findings.map((f) => f.type));
  assert.deepEqual([...types].sort(), ['EMAIL', 'PERSON']);
  assert.ok(r.redacted.includes('Revenue rose 12% against plan.'));
  assert.ok(r.redacted.includes('The migration from Postgres finished on time.'));
  assert.ok(r.redacted.includes('ordinary prose that must survive untouched'));
});
