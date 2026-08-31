/**
 * Generate the text pages from a shared shell.
 *
 * The site has no build step by design — Vercel serves `public/` verbatim — so
 * the output of this script is committed. Run it after editing the copy below
 * and commit what changes. Keeping the header and footer in one place is worth
 * more than the purity of hand-written files, given there are five of them.
 *
 *   node tools/build-pages.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MARK = `<svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true" fill="none">
        <path d="M16 2.6 4.9 7.2v8.5c0 6.9 4.6 12.9 11.1 14.8 6.5-1.9 11.1-7.9 11.1-14.8V7.2L16 2.6Z" fill="currentColor" opacity=".12"/>
        <path d="M16 2.6 4.9 7.2v8.5c0 6.9 4.6 12.9 11.1 14.8 6.5-1.9 11.1-7.9 11.1-14.8V7.2L16 2.6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M11.4 16.2h9.2M11.4 12.1h9.2M11.4 20.3h5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;

const page = ({ slug, title, description, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — SafePaste</title>
<meta name="description" content="${description}">
<link rel="canonical" href="/${slug}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<meta name="theme-color" content="#3448d0">
<link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
<header class="topbar">
  <div class="topbar__inner">
    <a class="brand" href="/">
      ${MARK}
      SafePaste
    </a>
    <nav>
      <a href="/app">The tool</a>
      <a href="/#pricing">Pricing</a>
    </nav>
  </div>
</header>

<main class="prose">
${body.trim()}
</main>

<footer class="site">
  <div class="wrap">
    <span>© <span id="year">2026</span> SafePaste</span>
    <nav>
      <a href="/app">The tool</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/security">Security</a>
      <a href="/refunds">Refunds</a>
    </nav>
  </div>
</footer>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script type="module" src="/assets/js/site.js"></script>
</body>
</html>
`;

const CONTACT = '<span data-contact-email>the address on your receipt</span>';

const PAGES = [
  {
    slug: 'terms',
    title: 'Terms',
    description: 'The terms you agree to when you use or buy SafePaste. Short, and in plain English.',
    body: `
<h1>Terms</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  These are the terms for using SafePaste. They are deliberately short. If
  something here seems unfair, write to ${CONTACT} and say so.
</p>

<h2>What you are buying</h2>
<p>
  A perpetual licence to use SafePaste, including future updates to version 1.
  There is no subscription and no recurring charge. A licence key unlocks the
  Pro features in your browser.
</p>
<ul>
  <li><strong>Personal</strong> — one person, on as many of their own machines as they like.</li>
  <li><strong>Team</strong> — up to ten named people in one organisation.</li>
  <li><strong>Business</strong> — everyone in one organisation, with the right to host the tool on your own infrastructure.</li>
</ul>
<p>
  You may not resell the licence key, publish it, or distribute it outside the
  organisation it was bought for.
</p>

<h2>What you are responsible for</h2>
<p>
  Reading the output before you use it. SafePaste is a tool that helps you find
  and remove sensitive data; it is not a guarantee that every piece of sensitive
  data in a document has been found. Language is open-ended, and no automated
  system catches everything. The Review tab exists so you can check its work,
  and you should.
</p>
<p>
  You are also responsible for complying with whatever rules govern your own
  data — your employer's policy, your professional obligations, GDPR, HIPAA,
  or anything else. SafePaste is one control among several. It is not legal
  advice and it is not a compliance certification.
</p>

<h2>What we promise</h2>
<ul>
  <li>Your text is never transmitted anywhere by this tool.</li>
  <li>The tool does what the site says it does.</li>
  <li>If it does not work for you, you get a refund — see <a href="/refunds">Refunds</a>.</li>
</ul>

<h2>Warranty and liability</h2>
<p>
  SafePaste is provided as-is. To the fullest extent the law allows, we exclude
  implied warranties of merchantability and fitness for a particular purpose.
  Our total liability to you for any claim arising out of your use of SafePaste
  is limited to the amount you paid for it.
</p>
<p>
  Nothing in these terms limits liability for death or personal injury caused by
  negligence, for fraud, or for anything else that cannot lawfully be limited.
  If you are a consumer, your statutory rights are unaffected.
</p>

<h2>Ending it</h2>
<p>
  You can stop using SafePaste at any time. We may terminate a licence that has
  been shared publicly or resold, and will refund the unused portion if we do.
</p>

<h2>Changes</h2>
<p>
  We may update these terms for new versions of the product. The terms you
  agreed to when you bought your licence continue to apply to that licence.
</p>

<h2>Law</h2>
<p>
  These terms are governed by the law of England and Wales, and the courts of
  England and Wales have non-exclusive jurisdiction. If you are a consumer
  resident elsewhere, you keep the protection of your local mandatory law.
</p>

<h2>Contact</h2>
<p>${CONTACT}</p>
`,
  },

  {
    slug: 'security',
    title: 'Security',
    description: 'How SafePaste is built, what it can and cannot reach, and what to check before you trust it.',
    body: `
<h1>Security</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  This page is written for whoever has to approve SafePaste before your team can
  use it. It describes the architecture honestly, including its limits.
</p>

<h2>Architecture</h2>
<p>
  SafePaste is a static web page. There is no application server, no database,
  and no processing pipeline. Detection, redaction and restoration are plain
  JavaScript executing in the visitor's browser. The only server-side code in
  the whole product is two endpoints: one that returns public configuration, and
  one that asks the payment provider whether a licence key is valid.
</p>

<h2>Data flow</h2>
<table>
  <tr><th>Data</th><th>Where it goes</th></tr>
  <tr><td>The document you paste</td><td>Nowhere. It stays in the tab's memory.</td></tr>
  <tr><td>Detected values and the mapping vault</td><td>Nowhere. Tab memory only, discarded on close.</td></tr>
  <tr><td>Settings, theme, licence key</td><td><code>localStorage</code> on your own device.</td></tr>
  <tr><td>Licence key, at activation only</td><td>Our <code>/api/license</code> endpoint, then the payment provider.</td></tr>
</table>

<h2>Controls you can verify yourself</h2>
<ul>
  <li>
    <strong>Content Security Policy.</strong> Every page is served with
    <code>connect-src 'self'</code>, <code>script-src 'self'</code>,
    <code>object-src 'none'</code>, <code>frame-ancestors 'none'</code> and
    <code>base-uri 'none'</code>. The browser blocks any attempt by the page to
    contact another host. Check the response headers.
  </li>
  <li>
    <strong>No third-party code.</strong> There are no dependencies, no CDN
    scripts, no fonts loaded from another origin, no analytics and no tag
    manager. Every byte of JavaScript is served from this domain. Check the
    Network tab.
  </li>
  <li>
    <strong>No cookies.</strong> The site sets none.
  </li>
  <li>
    <strong>Offline operation.</strong> Load the page once, disconnect the
    network, and keep working. A tool that functions with the network cable out
    is a tool that is not sending anything anywhere.
  </li>
</ul>

<h2>Detection accuracy</h2>
<p>
  Identifiers with a checksum are validated rather than pattern-matched: payment
  cards against Luhn, IBANs against ISO 7064 mod-97, NHS numbers against mod-11,
  routing numbers against the ABA weighting, VINs against the ISO 3779 check
  digit, and so on. This is what keeps false positives low enough that people
  keep the tool switched on.
</p>
<p>
  Person names, street addresses and unlabelled identifiers have no checksum.
  They are found using gazetteers and context, and each match carries a
  confidence value. Anything below certainty is flagged for review in the
  interface. <strong>SafePaste will not catch everything.</strong> A name absent
  from the gazetteer and unaccompanied by any supporting context can be missed,
  as can an identifier in a format the detectors do not know. Read the Review
  tab before you copy.
</p>

<h2>Threat model</h2>
<p>SafePaste protects against:</p>
<ul>
  <li>Sensitive data reaching a third-party AI service through copy and paste.</li>
  <li>That data being retained, logged or used for training by that service.</li>
  <li>Accidental disclosure of credentials pasted alongside a stack trace or log.</li>
</ul>
<p>SafePaste does not protect against:</p>
<ul>
  <li>A compromised browser, extension or operating system on the machine running it.</li>
  <li>A user who copies the original text instead of the redacted text.</li>
  <li>Re-identification from context that contains no explicit identifier — "the CFO who resigned in March" names a person without naming them.</li>
  <li>Anything at all once you have pasted the redacted text somewhere; what that service does with it is between you and them.</li>
</ul>

<h2>Reporting a problem</h2>
<p>
  If you find a way to make SafePaste leak data, mis-restore a document, or
  transmit anything it should not, write to ${CONTACT} with steps to reproduce.
  We will confirm receipt, fix it, and credit you if you would like to be
  credited. Please do not test against anyone else's data.
</p>

<h2>For your review paperwork</h2>
<p>
  Business licence holders can request written confirmation of the data-flow
  statements on this page, on letterhead, for attaching to a DPIA or vendor
  assessment.
</p>
`,
  },

  {
    slug: 'refunds',
    title: 'Refunds',
    description: 'A 30-day, no-argument refund policy for SafePaste licences.',
    body: `
<h1>Refunds</h1>
<p class="updated">Last updated 31 August 2026</p>

<h2>The policy</h2>
<p>
  <strong>Thirty days, no argument.</strong> If SafePaste is not right for you,
  email ${CONTACT} within thirty days of your purchase and ask for a refund. You
  will get one. You do not have to explain why, fill in a form, or answer a
  survey first.
</p>

<h2>How to ask</h2>
<p>
  One email with the address you bought under, or your order number, is enough.
  Refunds are issued through the payment provider back to the original payment
  method. Their processing normally takes five to ten working days to appear on
  a statement, which is out of our hands.
</p>

<h2>Why it is this simple</h2>
<p>
  There is a free tier that runs every detector, so you can find out whether the
  tool works on your documents before paying anything. By the time you buy, you
  should already know. If you were wrong, that is a bad fit rather than a
  dispute, and arguing about it would waste both our time.
</p>

<h2>The one limit</h2>
<p>
  Refunds apply to the licence, not to volume. If you buy a Business licence,
  deploy it across an organisation, and ask for a refund on day twenty-nine
  while continuing to use it, we will ask you to stop using it. That is the
  whole of the small print.
</p>

<h2>After thirty days</h2>
<p>
  Write anyway. If something is genuinely broken we would rather fix it or
  refund you than have you stuck with software that does not work. The thirty
  days is a promise, not a wall.
</p>
`,
  },
];

for (const p of PAGES) {
  const file = join(outDir, `${p.slug}.html`);
  writeFileSync(file, page(p));
  console.log(`wrote public/${p.slug}.html`);
}
