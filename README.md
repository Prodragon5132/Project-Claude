# SafePaste

**Live: https://safepaste-alpha.vercel.app**

Strip personal and confidential data out of text before you paste it into an AI,
then put the real values back into the answer. Everything runs in the browser —
the document is never uploaded, and the page is served with a Content Security
Policy that stops it contacting any server at all.

```
Our client Michael Okonkwo (DOB 14/03/1979,      Our client [PERSON_1] (DOB [DATE_OF_BIRTH_1],
NHS No 943 476 5919) called about his card  →    NHS No [NHS_1]) called about his card
5555 5555 5555 4444, exp 04/27.                  [CREDIT_CARD_1], exp [CARD_EXPIRY_1].
```

Paste the model's reply back in and every token becomes the real value again,
byte for byte.

---

## Getting money out of it

Checkout is not connected yet. **[docs/GO-LIVE.md](docs/GO-LIVE.md)** is the
fifteen-minute path from here to taking payments; the launch copy is in
**[docs/MARKETING.md](docs/MARKETING.md)**.

---

## How it is put together

No dependencies, no build step, no framework. Vercel serves `public/` verbatim
and runs the two files in `api/` as functions.

```
public/assets/js/engine/    the redaction engine, plain ES modules
  validators.js             checksum gates — Luhn, IBAN mod-97, NHS mod-11, ABA, VIN, NPI, SIN, ABN, NINO
  lexicon.js                name gazetteers and the stoplist of capitalised words that are not people
  detectors.js              41 detectors: credentials, financial, government ID, health, contact, network, people
  fake.js                   deterministic pseudonyms, drawn only from reserved ranges
  redact.js                 overlap resolution, entity linking, custom rules, CSV columns, re-hydration
public/assets/js/app.js     the workbench UI
public/                     landing page, app, privacy, terms, security, refunds
api/license.js              licence verification against Gumroad, Lemon Squeezy or Polar
api/config.js               public runtime config, read from environment variables
```

### Two design decisions worth knowing

**Checksums, not just patterns.** A sixteen-digit number is only a card if it
passes Luhn; nine digits are only a Social Security number if they obey the SSA
allocation rules. A redactor that flags everything gets switched off after it
mangles someone's third document, so precision is treated as a correctness
property, not a nice-to-have. There is a false-positive corpus in the test suite
made of ordinary business prose that must come back untouched.

**Round trips are byte-exact.** Redact, send it somewhere, paste the reply back,
get your own words returned exactly. This is tested across both replacement
modes, all four token styles, unicode, CSV, markdown and a 150 KB document. A
single dropped character here would be a bug report.

---

## Working on it

```
npm test                       109 unit tests
node tools/check.js            links, imports, manifest icons, cached paths, claim consistency
node tools/serve.mjs 4321      local server that mirrors the production routing and headers
node tools/e2e.mjs             44 browser checks against a running server
node tools/try.js [file]       print a redaction to the terminal for eyeballing
node tools/shots.mjs           screenshot the site
node tools/make-images.mjs     regenerate the icons and social card
node tools/build-pages.mjs     regenerate the text pages from their shared shell
node tools/set-site-url.mjs U  point canonical links, OG tags and the sitemap at a new domain
```

`e2e.mjs`, `shots.mjs` and `make-images.mjs` need Chromium and
`npm i --no-save playwright-core`; nothing else has any dependency at all.

The engine is a pure function of its input — no network, no storage, no clock
beyond a timestamp on the vault — which is what makes the privacy claim
auditable rather than a promise.

---

## Licence

Not open source. All rights reserved.
