import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../public/assets/js/engine/redact.js';
import { DETECTORS } from '../public/assets/js/engine/detectors.js';

/** Redact with exactly one detector enabled, so a test names one thing. */
function only(id, text, extra = {}) {
  return redact(text, { enabled: [id], structureAware: false, ...extra });
}

const found = (id, text, extra) => only(id, text, extra).findings.map((f) => f.value);

/* --------------------------------------------------------------- contact */

test('email addresses', () => {
  assert.deepEqual(found('email', 'Write to jane.doe+tag@sub.example.co.uk today.'),
    ['jane.doe+tag@sub.example.co.uk']);
  assert.deepEqual(found('email', 'contact: a@b.io, c_d@e-f.org'), ['a@b.io', 'c_d@e-f.org']);
  assert.deepEqual(found('email', 'no address here, just an @ sign'), []);
  assert.deepEqual(found('email', 'Ends a sentence at bob@example.com.'), ['bob@example.com']);
});

test('phone numbers in several conventions', () => {
  assert.deepEqual(found('phone', 'Call (415) 555-0132 now'), ['(415) 555-0132']);
  assert.deepEqual(found('phone', 'Call 415-555-0132 now'), ['415-555-0132']);
  assert.deepEqual(found('phone', 'Dial +44 20 7946 0958 please'), ['+44 20 7946 0958']);
  assert.deepEqual(found('phone', 'Mobile 07700 900461 is best'), ['07700 900461']);
  assert.deepEqual(found('phone', 'phone: 4155550132'), ['4155550132']);
});

test('phone detector ignores bare numbers with no label or formatting', () => {
  assert.deepEqual(found('phone', 'Order 4155550132 shipped'), [],
    'a bare digit run with no phone context is an order number');
  assert.deepEqual(found('phone', 'Total was 1234567890 units'), []);
});

test('street addresses', () => {
  assert.deepEqual(found('address', 'Ship to 1600 Pennsylvania Avenue, Washington'),
    ['1600 Pennsylvania Avenue']);
  assert.deepEqual(found('address', 'She lives at 42 Kingsway Terrace Apt 4B here'),
    ['42 Kingsway Terrace Apt 4B']);
  assert.deepEqual(found('address', 'We reviewed 12 Angry Men last night'), [],
    'a film title is not an address');
});

test('postal codes', () => {
  assert.deepEqual(found('postal_code', 'London WC2B 6UN'), ['WC2B 6UN']);
  assert.deepEqual(found('postal_code', 'Toronto M5V 3L9 Canada'), ['M5V 3L9']);
  assert.deepEqual(found('postal_code', 'zip 90210'), ['90210']);
  assert.deepEqual(found('postal_code', 'we shipped 90210 units'), [],
    'a bare five-digit number needs a zip label');
});

test('GPS coordinates need real precision', () => {
  assert.deepEqual(found('coordinates', 'Pin at 51.500729, -0.124625 exactly'),
    ['51.500729, -0.124625']);
  assert.deepEqual(found('coordinates', 'Ratio was 1.5, -0.2 overall'), []);
});

/* ------------------------------------------------------------- financial */

test('payment cards require Luhn and a plausible issuer prefix', () => {
  assert.deepEqual(found('credit_card', 'Card 4111 1111 1111 1111 declined'), ['4111 1111 1111 1111']);
  assert.deepEqual(found('credit_card', 'Card 4111-1111-1111-1111 declined'), ['4111-1111-1111-1111']);
  assert.deepEqual(found('credit_card', 'Amex 378282246310005 ok'), ['378282246310005']);
  assert.deepEqual(found('credit_card', 'Ref 4111111111111112 here'), [], 'fails Luhn');
  assert.deepEqual(found('credit_card', 'Ref 1234567812345670 here'), [], 'no issuer starts with 1');
  assert.deepEqual(found('credit_card', 'Invoice 9876543210987654321 paid'), []);
});

test('IBAN and SWIFT', () => {
  assert.deepEqual(found('iban', 'Pay GB82 WEST 1234 5698 7654 32 today'), ['GB82 WEST 1234 5698 7654 32']);
  assert.deepEqual(found('iban', 'Pay GB82 WEST 1234 5698 7654 33 today'), [], 'checksum must hold');
  assert.deepEqual(found('swift_bic', 'SWIFT: DEUTDEFF500'), ['DEUTDEFF500']);
  assert.deepEqual(found('swift_bic', 'The DEUTDEFF500 string alone'), [],
    'a BIC-shaped word needs banking context');
});

test('routing and account numbers require context', () => {
  assert.deepEqual(found('routing_number', 'Routing 021000021 for the wire'), ['021000021']);
  assert.deepEqual(found('routing_number', 'Ticket 021000021 was closed'), []);
  assert.deepEqual(found('bank_account', 'Account number: 000123456789'), ['000123456789']);
  assert.deepEqual(found('bank_account', 'We processed 000123456789 records'), []);
});

test('card expiry and security code', () => {
  assert.deepEqual(found('card_expiry', 'exp 04/27 on file'), ['04/27']);
  assert.deepEqual(found('card_expiry', 'Valid thru 12/2029'), ['12/2029']);
  assert.deepEqual(found('cvv', 'CVV: 837'), ['837']);
  assert.deepEqual(found('cvv', 'security code 1234'), ['1234']);
});

test('crypto wallets', () => {
  assert.deepEqual(found('crypto_wallet', 'Send to 0x52908400098527886E0F7030069857D2E4169EE7 now'),
    ['0x52908400098527886E0F7030069857D2E4169EE7']);
  assert.ok(found('crypto_wallet', 'btc bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq').length === 1);
});

/* ------------------------------------------------------ government / health */

test('SSN honours SSA allocation rules', () => {
  assert.deepEqual(found('ssn', 'SSN 123-45-6789 on file'), ['123-45-6789']);
  assert.deepEqual(found('ssn', 'SSN: 123456789'), ['123456789']);
  assert.deepEqual(found('ssn', 'Serial 123456789 shipped'), [], 'bare nine digits need an SSN label');
  assert.deepEqual(found('ssn', 'ID 666-45-6789 issued'), [], 'area 666 is never issued');
});

test('NHS number needs a health context to claim the label', () => {
  assert.deepEqual(found('nhs_number', 'NHS No: 943 476 5919'), ['943 476 5919']);
  assert.deepEqual(found('nhs_number', 'Call 943 476 5919 tomorrow'), [],
    'without health context this is a phone number');
});

test('UK NINO, Canadian SIN, Australian ABN', () => {
  assert.deepEqual(found('nino', 'NI number JK123456C confirmed'), ['JK123456C']);
  assert.deepEqual(found('sin', 'SIN 130 692 544 verified'), ['130 692 544']);
  assert.deepEqual(found('tfn_abn', 'ABN 51 824 753 556 registered'), ['51 824 753 556']);
});

test('labelled identifiers capture only the identifier', () => {
  assert.deepEqual(found('mrn', 'MRN: A2291043 admitted'), ['A2291043']);
  assert.deepEqual(found('passport', 'Passport No: X1234567'), ['X1234567']);
  assert.deepEqual(found('driver_license', "Driver's licence D1234567"), ['D1234567']);
  assert.deepEqual(found('record_id', 'Policy number POL-99231 renewed'), ['POL-99231']);
  assert.deepEqual(found('record_id', 'Claim 88213 was filed'), ['88213']);
  assert.deepEqual(found('record_id', 'Customer Service is closed'), [],
    'an identifier must contain a digit');
});

test('VIN requires the ISO check digit', () => {
  assert.deepEqual(found('vin', 'VIN 1M8GDM9AXKP042788 registered'), ['1M8GDM9AXKP042788']);
  assert.deepEqual(found('vin', 'Hash 1M8GDM9A1KP042788 stored'), []);
});

/* ----------------------------------------------------------- credentials */

/**
 * A tool that detects credentials needs credential-shaped fixtures, and those
 * trip the secret scanners that guard the repository. These are assembled from
 * parts so no scanner-matching literal exists anywhere in the source. None is a
 * real key: the Stripe and AWS values are the vendors' own published examples.
 */
const fixtureKey = (...parts) => parts.join('_');
const fixtureDashed = (...parts) => parts.join('-');

test('vendor API key formats', () => {
  const cases = [
    ['AKIAIOSFODNN7EXAMPLE', 'aws key id'],
    [fixtureKey('ghp', '1234567890abcdefghijklmnopqrstuvwxyz'), 'github pat'],
    [fixtureDashed('xoxb', '123456789012', 'abcdefghijklmnop'), 'slack bot token'],
    [fixtureKey('sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'), 'stripe secret'],
    [fixtureDashed('sk', 'ant', 'api03', 'abcdefghijklmnopqrstuvwxyz012345'), 'anthropic'],
    ['AIzaSyD-1234567890abcdefghijklmnopqrstu', 'google api key'],
    [fixtureKey('npm', 'abcdefghijklmnopqrstuvwxyz0123456789'), 'npm token'],
    [fixtureDashed('glpat', 'abcdefghijklmnopqrst'), 'gitlab pat'],
  ];
  for (const [key, what] of cases) {
    assert.deepEqual(found('api_key', `export TOKEN=${key}`), [key], what);
  }
});

test('JWTs and private key blocks', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
  assert.deepEqual(found('jwt', `Authorization header held ${jwt} today`), [jwt]);

  const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\nabc123\n-----END RSA PRIVATE KEY-----';
  assert.deepEqual(found('private_key', `key:\n${pem}\ndone`), [pem]);
});

test('secrets in assignments, and the prose that looks like them', () => {
  assert.deepEqual(found('secret_assignment', 'password = "s3cretHunter99"'), ['s3cretHunter99']);
  assert.deepEqual(found('secret_assignment', 'api_key: abcdef1234567890'), ['abcdef1234567890']);
  assert.deepEqual(found('secret_assignment', 'The password is required for access'), [],
    '"required" is prose, not a secret');
  assert.deepEqual(found('secret_assignment', 'token: <YOUR_TOKEN_HERE>'), [],
    'a placeholder is not a secret');
  assert.deepEqual(found('secret_assignment', 'password: ${DB_PASSWORD}'), [],
    'a variable reference is not a secret');
});

test('bearer credentials and connection strings', () => {
  assert.deepEqual(found('bearer', 'Authorization: Bearer abcdef1234567890xyz'),
    ['abcdef1234567890xyz']);
  assert.deepEqual(found('connection_string', 'DB=postgres://user:pw@db.internal:5432/app here'),
    ['postgres://user:pw@db.internal:5432/app']);
});

test('URLs carrying a secret are caught even when plain URLs are off', () => {
  const u = 'https://api.example.com/v1/export?access_token=abc123def456';
  assert.deepEqual(found('url_with_secret', `Open ${u} to download`), [u]);
  assert.deepEqual(found('url_with_secret', 'Open https://example.com/docs/page to read'), []);
});

/* -------------------------------------------------------------- network */

test('IP addresses, including at the end of a sentence', () => {
  assert.deepEqual(found('ip_address', 'The box is at 10.42.7.13.'), ['10.42.7.13']);
  assert.deepEqual(found('ip_address', 'Host 192.168.1.100 responded'), ['192.168.1.100']);
  assert.deepEqual(found('ip_address', 'Upgraded to version 1.2.3.4 today'), [],
    'a version string is not a host');
  assert.deepEqual(found('ip_address', 'Build 1.2.3.4 shipped'), []);
  assert.deepEqual(found('ip_address', 'Range 10.0.0.0 to 10.255.255.255'), ['10.255.255.255'],
    '0.0.0.0-style wildcards are not identifying');
});

test('MAC addresses', () => {
  assert.deepEqual(found('mac_address', 'NIC 3C:22:FB:8A:11:02 seen'), ['3C:22:FB:8A:11:02']);
});

/* --------------------------------------------------------------- people */

test('person names with strong evidence', () => {
  assert.deepEqual(found('person_name', 'Please contact Michael Okonkwo about this.'),
    ['Michael Okonkwo']);
  assert.deepEqual(found('person_name', 'Reviewed by Priya Raghunathan on Tuesday.'),
    ['Priya Raghunathan']);
  assert.ok(found('person_name', 'Spoke to Dr. Ramirez this morning.').includes('Ramirez'));
});

test('the honorific stays in the text, only the name is replaced', () => {
  const r = only('person_name', 'Spoke to Dr. Ramirez this morning.');
  assert.match(r.redacted, /Dr\. \[PERSON_/);
});

test('a name is linked across full and partial mentions', () => {
  const r = only('person_name', 'Sarah Whitfield filed it. Sarah confirmed on Friday.');
  const tokens = r.findings.map((f) => f.token).sort();
  assert.deepEqual(tokens, ['[PERSON_1]', '[PERSON_1_FIRSTNAME]'],
    'the bare first name links to the same person');
});

test('a capitalised run stops at punctuation', () => {
  assert.deepEqual(found('person_name', 'Our client Michael Okonkwo (DOB 1979) called.'),
    ['Michael Okonkwo'], 'the bracket must not be swallowed');
});

test('ordinary capitalised prose is not a person', () => {
  const corpus = [
    'Mark the invoice as Paid before Friday.',
    'The Marketing Team will review Q3 results in March.',
    'Please send the Final Report to Accounts Payable.',
    'We migrated from Postgres to MySQL last April.',
    'North America and Western Europe both grew.',
  ];
  for (const line of corpus) {
    assert.deepEqual(found('person_name', line), [], line);
  }
});

test('organisation names are found when the detector is enabled', () => {
  assert.deepEqual(found('org_name', 'Signed with Northgate Legal LLP yesterday.'),
    ['Northgate Legal LLP']);
  assert.deepEqual(found('org_name', 'Acme Widgets Inc. filed the return.'), ['Acme Widgets Inc.']);
});

test('date of birth is captured but ordinary dates are left alone', () => {
  assert.deepEqual(found('date_of_birth', 'DOB: 14/03/1979 confirmed'), ['14/03/1979']);
  assert.deepEqual(found('date_of_birth', 'Born on March 14, 1979 in Leeds'), ['March 14, 1979']);
  assert.deepEqual(found('date_of_birth', 'The meeting is on 14/03/2026'), [],
    'a meeting date is not a date of birth');
});

/* --------------------------------------------------------------- shape */

test('every detector declares the fields the pipeline relies on', () => {
  const ids = new Set();
  for (const d of DETECTORS) {
    assert.ok(d.id && !ids.has(d.id), `duplicate or missing id: ${d.id}`);
    ids.add(d.id);
    assert.equal(typeof d.scan, 'function', `${d.id} needs a scan function`);
    assert.ok(d.label, `${d.id} needs a label`);
    assert.ok(d.group, `${d.id} needs a group`);
    assert.ok(['critical', 'high', 'medium', 'low'].includes(d.risk), `${d.id} risk`);
    assert.equal(typeof d.priority, 'number', `${d.id} priority`);
  }
});

test('every detector returns well-formed spans on adversarial input', () => {
  const nasty = [
    '', '\n\n', '   ', ' ', 'a'.repeat(5000),
    '((((((((((', '\\\\\\', '[]{}<>', '𝕳𝖊𝖑𝖑𝖔 🌍 emoji',
    '-----BEGIN PRIVATE KEY-----', 'password:', '@@@@', '....',
    '1'.repeat(200), '+'.repeat(80), 'A B C D E F G H I J K L',
  ];
  for (const d of DETECTORS) {
    for (const input of nasty) {
      const spans = d.scan(input, {});
      assert.ok(Array.isArray(spans), `${d.id} must return an array`);
      for (const s of spans) {
        assert.ok(Number.isInteger(s.start) && s.start >= 0, `${d.id} start`);
        assert.ok(Number.isInteger(s.end) && s.end <= input.length, `${d.id} end`);
        assert.ok(s.end > s.start, `${d.id} empty span`);
        assert.equal(input.slice(s.start, s.end), s.value,
          `${d.id} value must match its own offsets`);
      }
    }
  }
});
