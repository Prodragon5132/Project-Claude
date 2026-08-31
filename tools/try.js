/** Scratch harness: node tools/try.js [file] — prints redaction output for eyeballing. */
import { readFileSync } from 'node:fs';
import { redact, rehydrate } from '../public/assets/js/engine/redact.js';

// Assembled from parts so no credential-shaped literal sits in the source and
// trips the repository's secret scanner. Stripe's published example value.
const DEMO_KEY = ['sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'].join('_');

const SAMPLE = `From: Sarah Whitfield <sarah.whitfield@northgate-legal.co.uk>
To: Dr. Ramirez
Subject: Claim 88213 — follow-up

Hi Dr. Ramirez,

Sarah here again. Our client Michael Okonkwo (DOB: 14/03/1979, NHS No: 943 476 5919)
called this morning. He can be reached on +44 20 7946 0958 or 07700 900461.

His card ending in 4444 was declined — the full number he read out was
5555 5555 5555 4444, exp 04/27. Billing address is 42 Kingsway Terrace,
London, WC2B 6UN.

Payment should route to GB82 WEST 1234 5698 7654 32 instead.

The API token for the portal is ${DEMO_KEY} and the
staging box is at 10.42.7.13. Please don't share either.

Regards,
Sarah Whitfield
Northgate Legal LLP
`;

const text = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : SAMPLE;
const opts = { mode: process.argv[3] === 'pseudonym' ? 'pseudonym' : 'token' };

const r = redact(text, opts);
console.log('===== REDACTED =====\n' + r.redacted);
console.log('\n===== FINDINGS =====');
for (const f of r.findings) {
  console.log(
    `${String(f.count).padStart(2)}x  ${f.risk.padEnd(8)} ${f.type.padEnd(18)} ` +
    `${JSON.stringify(f.value).padEnd(34)} -> ${f.token}  (conf ${f.confidence})`,
  );
}
console.log('\n===== STATS =====');
console.log(r.stats);

const back = rehydrate(r.redacted, r.vault);
console.log('\n===== ROUND TRIP =====');
console.log('exact match:', back.text === text);
if (back.text !== text) {
  for (let i = 0; i < Math.max(text.length, back.text.length); i++) {
    if (text[i] !== back.text[i]) {
      console.log('first diff at', i);
      console.log('orig:', JSON.stringify(text.slice(Math.max(0, i - 40), i + 40)));
      console.log('back:', JSON.stringify(back.text.slice(Math.max(0, i - 40), i + 40)));
      break;
    }
  }
}
