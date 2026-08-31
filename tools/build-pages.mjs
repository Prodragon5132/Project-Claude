/**
 * Generate the text pages and the sitemap from a shared shell.
 *
 * The site has no build step by design — Vercel serves `public/` verbatim — so
 * the output of this script is committed. Run it after editing the copy below
 * and commit what changes. Keeping the header, footer and metadata in one place
 * is worth more than hand-written files once there are a dozen of them, and it
 * means the sitemap can never drift from the pages that actually exist.
 *
 *   node tools/build-pages.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXTRA_GUIDES } from './guides-extra.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');
const siteFile = join(root, 'site.json');
const SITE = existsSync(siteFile)
  ? JSON.parse(readFileSync(siteFile, 'utf8')).url.replace(/\/+$/, '')
  : '';

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
<link rel="canonical" href="${SITE}/${slug.replace(/\/index$/, '')}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<meta name="theme-color" content="#3448d0">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SafePaste">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${SITE}/${slug.replace(/\/index$/, '')}">
<meta property="og:image" content="${SITE}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${SITE}/assets/img/og.png">
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
      <a href="/#pricing">Pricing</a>
      <a href="/app" class="btn btn--sm btn--primary">Open the tool</a>
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
      <a href="/guides">Guides</a>
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

/** The call to action that closes every guide. */
const CTA = `
<div class="card cta-card">
  <h2 class="mt-0">Try it on your own document</h2>
  <p>
    SafePaste strips the identifiers out of any text in your browser, hands you a
    version that is safe to paste, and puts the real values back into the answer.
    Nothing is uploaded — the page cannot reach any server but its own.
  </p>
  <p class="mb-0"><a class="btn btn--primary" href="/app">Open SafePaste — free, no sign-up</a></p>
</div>
`;

const LEGAL_PAGES = [
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

const GUIDES_BASE = [
  {
    slug: 'guides/chatgpt-customer-data',
    title: 'Can you put customer data into ChatGPT?',
    description: 'A practical answer for people who have been told not to, and still have the work to do: what the risk actually is, what the enterprise plans change, and what to do instead.',
    body: `
<h1>Can you put customer data into ChatGPT?</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  The short answer is: usually not, and the reason is rarely the one people
  give. The longer answer is more useful, because "don't" on its own has never
  stopped anyone with a deadline.
</p>

<h2>What the actual risk is</h2>

<p>
  Most people asked to justify the rule reach for "the AI will train on it".
  That is the weakest version of the argument. On the consumer tiers of most
  assistants your conversations may be used to improve the model unless you turn
  that off, but the business and enterprise tiers generally commit not to train
  on your inputs by default. If training were the only concern, the policy could
  be solved with a subscription upgrade.
</p>

<p>The concerns that survive scrutiny are these.</p>

<h3>You are disclosing to a processor you have not contracted with</h3>
<p>
  If you hold personal data about identifiable people, you are constrained in
  who you may share it with. Under GDPR that means a written processor agreement
  with defined purposes, security obligations and transfer mechanisms. Under
  HIPAA it means a Business Associate Agreement. Pasting a customer's details
  into a consumer account creates a disclosure to a party you have no such
  agreement with. Whether the model trains on it is beside the point; the
  disclosure has already happened.
</p>

<h3>Your own contracts probably forbid it</h3>
<p>
  Professional confidentiality obligations — solicitor to client, clinician to
  patient — and ordinary commercial NDAs are usually broader than data
  protection law. A typical NDA restricts disclosure to named categories of
  people for named purposes. "An AI assistant I found useful" is not one of
  them, and no amount of retention policy fixes that.
</p>

<h3>Retention is not the same as training</h3>
<p>
  Even where training is off, conversations are typically retained for some
  period for abuse monitoring, and may be reviewable by staff for that purpose.
  That is a normal and reasonable thing for a provider to do. It is also a copy
  of your customer's data sitting somewhere you do not control.
</p>

<h3>Somebody will paste the wrong thing</h3>
<p>
  This is the risk that actually materialises. Not a considered decision to
  share a record, but a support engineer pasting a stack trace that happens to
  contain a production API key three lines further down, or a whole log file
  with session tokens in it. Policy does not prevent this; process does.
</p>

<h2>What the enterprise tiers do and do not fix</h2>

<p>
  A business or enterprise agreement with a major provider generally gives you:
  no training on your data by default, a data processing agreement, some control
  over retention, and administrative visibility. That is a genuine and
  meaningful improvement, and if your organisation has the budget it is the
  right first step.
</p>
<p>What it does not give you:</p>
<ul>
  <li>Relief from a client NDA that predates it and does not contemplate it.</li>
  <li>A defence when the disclosure was never authorised in the first place — a
      processor agreement covers processing you have decided to do, not
      processing an employee decided to do.</li>
  <li>Protection against the accidental paste, which is the common case.</li>
  <li>Anything at all for the staff working outside the sanctioned account,
      which in most organisations is most of them.</li>
</ul>
<p>
  Check the current terms of whichever provider you use before relying on any of
  this. Retention windows and training defaults change, and they differ between
  the consumer app, the business tiers and the API.
</p>

<h2>The approach that works</h2>

<p>
  The organisations that have settled this have stopped framing it as a choice
  between the policy and the work. They separate the two questions:
</p>

<ol>
  <li><strong>Does this task need the identity?</strong> Almost never.
      Summarising a complaint, drafting a reply, classifying a ticket,
      extracting the dates from a contract — none of these require knowing that
      the person is called Michael Okonkwo rather than Person 1.</li>
  <li><strong>Does the answer need the identity?</strong> Usually yes. The draft
      reply has to be addressed to a real person.</li>
</ol>

<p>
  Those two facts together describe the solution exactly: remove the identifiers
  before the text leaves your machine, do the work, and put them back into the
  answer. The model does the reasoning, and the identity never leaves.
</p>

<p>
  Removing them properly means more than deleting names. It means dates of
  birth, account numbers, national identifiers, addresses, phone numbers,
  reference numbers, and the credentials that get pasted by accident. And it
  means doing that locally: a redaction service that uploads your document to
  redact it has moved the problem rather than solved it.
</p>

<h2>What to tell your compliance team</h2>

<p>
  A control they can accept looks like this: identifiers are stripped from the
  document before it is shared, the mapping between placeholder and real value
  never leaves the employee's browser, and the redaction can be reviewed by the
  employee before anything is pasted. That is a specific, auditable control you
  can write into a policy and point at in a data protection impact assessment.
</p>
<p>
  It is not a compliance certification, and nobody should sell it to you as one.
  Anyone claiming a tool makes you "GDPR compliant" is describing something that
  does not exist. Compliance is a property of your whole process. This is one
  control within it — but it is the control that turns an unenforceable rule
  into a workable one.
</p>

${CTA}

<h2>Related</h2>
<ul>
  <li><a href="/guides/redact-pii-before-ai">How to remove personal data before using an AI tool</a></li>
  <li><a href="/guides/what-counts-as-pii">What actually counts as personal data</a></li>
  <li><a href="/security">How SafePaste is built, and what it cannot do</a></li>
</ul>
`,
  },

  {
    slug: 'guides/redact-pii-before-ai',
    title: 'How to remove personal data before using an AI tool',
    description: 'The four approaches to redacting a document before you paste it into an assistant, what each one costs you, and why the answer usually has to come back.',
    body: `
<h1>How to remove personal data before using an AI tool</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  There are four ways people do this. Three of them are worse than they look.
</p>

<h2>1. Delete it by hand</h2>

<p>
  Select the name, delete it, type "the customer". Repeat for every date of
  birth, account number and phone number in a forty-page bundle.
</p>

<p>
  This works, in the sense that a bicycle works for crossing a continent. The
  real cost is not the time, it is what it does to the document. Once every
  person is "the customer", a document involving three people becomes unreadable
  and the model's answer becomes useless — it cannot tell you who owes what to
  whom if you have deleted the distinction. And you will miss things. Everyone
  misses things: the reference number in the footer, the email address in a
  quoted reply, the initials in a filename.
</p>

<h2>2. Find and replace</h2>

<p>
  Better, because it is consistent: replace "Michael Okonkwo" with "Person A"
  everywhere at once, and the document keeps its structure.
</p>

<p>
  The problem is that you can only replace what you already know is there. Find
  and replace cannot tell you that page nineteen contains a card number, or that
  the log excerpt someone pasted in has a bearer token in it. It handles the
  data you remembered, which is not the data that gets you into trouble.
</p>

<h2>3. Ask an AI to redact it first</h2>

<p>
  Superficially attractive, and completely circular. To have a model redact your
  document, you have to send the model your document. The unredacted one. You
  have performed the disclosure you were trying to avoid, and added a second
  one.
</p>

<p>
  This is only sound if the model runs locally on your own hardware. If you have
  the machine and the patience to run a capable local model, it is a legitimate
  approach and will handle unusual name formats better than any rule-based
  system. For most people, at most organisations, it is not a realistic answer
  to "I need to summarise this ticket before lunch".
</p>

<h2>4. Reversible local redaction</h2>

<p>
  Replace each identifier with a stable placeholder, keep the mapping on your own
  machine, and reverse it when the answer comes back.
</p>

<p>
  This is the approach that survives contact with real work, for three reasons.
</p>

<h3>The document stays coherent</h3>
<p>
  <code>[PERSON_1] emailed [PERSON_2] about invoice [RECORD_ID_1]</code> is a
  sentence a model can reason about. It knows there are two people, which one
  did the emailing, and that they are different. Deleting the names destroys
  exactly the structure the model needs.
</p>

<h3>The answer comes back whole</h3>
<p>
  This is the part people underestimate until they try it the other way. If you
  redact irreversibly, the model gives you a draft reply addressed to
  <code>[PERSON_1]</code>, and now you are hand-editing it back — which is the
  manual work you were avoiding, at the end instead of the beginning. Reversible
  redaction means the draft comes back addressed to the actual person, and the
  round trip is invisible.
</p>

<h3>You can check its work</h3>
<p>
  A good tool shows you what it found before you copy anything, and marks the
  matches it is not certain about. That matters, because the alternative — a
  black box that promises it caught everything — is one you cannot responsibly
  rely on.
</p>

<h2>What a redaction pass should actually cover</h2>

<p>
  Names and email addresses are the obvious ones and the least likely to be
  missed. The categories that get skipped are the ones that cause the incidents:
</p>

<ul>
  <li><strong>National identifiers</strong> — Social Security numbers, National
      Insurance numbers, NHS numbers, SINs, tax file numbers.</li>
  <li><strong>Financial</strong> — card numbers, IBANs, routing and account
      numbers, expiry dates and security codes.</li>
  <li><strong>Health</strong> — medical record numbers, NHS numbers, provider
      identifiers.</li>
  <li><strong>Reference numbers</strong> — policy, claim, case, employee and
      customer IDs. These are identifiers even when they look like noise.</li>
  <li><strong>Credentials</strong> — API keys, tokens, connection strings,
      private keys. Nobody pastes these on purpose; they arrive attached to logs
      and stack traces.</li>
  <li><strong>Infrastructure</strong> — internal hostnames and IP addresses,
      which describe your network to anyone who reads them.</li>
  <li><strong>Dates of birth</strong>, which combined with a postcode identify
      most people uniquely.</li>
</ul>

<h2>The precision problem</h2>

<p>
  It is easy to build something that redacts everything. It is much harder to
  build something people keep using, and the difference is false positives.
</p>

<p>
  A redactor that turns "Mark the invoice as Paid" into "[PERSON_1] the invoice
  as [PERSON_2]" gets switched off within a week, and then you have no redaction
  at all. Precision is not a nicety here — it is what determines whether the
  control is still in place in a month.
</p>

<p>
  The way to get it is to verify rather than guess wherever the data allows. A
  sixteen-digit number is only a payment card if it passes the Luhn check. Nine
  digits are only a Social Security number if they obey the allocation rules the
  SSA has always followed. An IBAN either passes its mod-97 checksum or it is
  not an IBAN. Names have no checksum, so they need a different treatment:
  gazetteers, supporting context, and an honest confidence score on every match
  so the uncertain ones can be reviewed rather than silently trusted.
</p>

<h2>What none of this fixes</h2>

<p>
  Re-identification from context. "The CFO who resigned in March" contains no
  identifier and names a person to anyone who knows the company. No redaction
  tool will catch that, and you should not choose one that claims it will.
  Read what you are about to send.
</p>

${CTA}

<h2>Related</h2>
<ul>
  <li><a href="/guides/chatgpt-customer-data">Can you put customer data into ChatGPT?</a></li>
  <li><a href="/guides/what-counts-as-pii">What actually counts as personal data</a></li>
</ul>
`,
  },

  {
    slug: 'guides/what-counts-as-pii',
    title: 'What actually counts as personal data',
    description: 'A working checklist of identifiers, including the ones people forget: reference numbers, device identifiers, dates of birth, and the combinations that identify someone without naming them.',
    body: `
<h1>What actually counts as personal data</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  Most people's mental model is "name, address, phone number". That list is not
  wrong, it is about a fifth of the answer, and the missing four fifths are
  where the incidents come from.
</p>

<h2>The definition, briefly</h2>

<p>
  Under GDPR, personal data is any information relating to an identified or
  identifiable living person. The word doing the work is <em>identifiable</em>:
  data that does not name someone still counts if it can single them out, on its
  own or combined with other information reasonably available.
</p>
<p>
  US law is more fragmented. HIPAA's Safe Harbor method lists eighteen specific
  identifier types that must be removed before health data is considered
  de-identified, including all geographic subdivisions smaller than a state, all
  dates more precise than a year, and any other unique identifying number or
  code. State laws such as the CCPA use a broader definition closer to GDPR's.
</p>
<p>
  Whichever regime applies, the practical consequence is the same: treat "can
  this single someone out?" as the test, not "does this contain a name?"
</p>

<h2>Direct identifiers</h2>

<p>These name a person on their own.</p>

<ul>
  <li>Full names, and partial names in context — a first name in a two-person
      thread identifies someone.</li>
  <li>Email addresses, including the ones that look anonymous.</li>
  <li>Phone numbers, mobile and landline.</li>
  <li>Postal addresses, and postcodes on their own in sparse areas.</li>
  <li>National identifiers: Social Security number, National Insurance number,
      NHS number, Social Insurance Number, tax file number, passport number,
      driving licence number.</li>
  <li>Photographs and voice recordings.</li>
</ul>

<h2>The ones people forget</h2>

<p>This is the list worth actually reading.</p>

<h3>Reference numbers</h3>
<p>
  Policy numbers, claim numbers, case numbers, customer IDs, employee numbers,
  medical record numbers, order numbers. They look like noise and they are
  perfect identifiers: unique, stable, and directly linkable to a person by
  anyone with access to the corresponding system. HIPAA's Safe Harbor list
  includes "any other unique identifying number, characteristic, or code" for
  exactly this reason.
</p>

<h3>Dates of birth</h3>
<p>
  A date of birth plus a postcode identifies a large fraction of any population
  uniquely. It is one of the most identifying fields in any record and one of
  the most commonly left in.
</p>

<h3>Device and network identifiers</h3>
<p>
  IP addresses, MAC addresses, device IDs, advertising identifiers, cookie IDs.
  European regulators have consistently treated IP addresses as personal data
  where the holder can link them to a person. In a log file they are also a
  description of your infrastructure.
</p>

<h3>Financial identifiers</h3>
<p>
  Card numbers, bank account and routing numbers, IBANs. Card data carries its
  own separate regime — PCI DSS — with obligations that apply regardless of
  whether the cardholder is identifiable.
</p>

<h3>Employment and education records</h3>
<p>
  Salary, performance reviews, disciplinary records, grievance notes, student
  records. Some of the most sensitive documents in any organisation, and rarely
  covered by an AI policy that was written with customer data in mind.
</p>

<h3>Special category data</h3>
<p>
  GDPR gives extra protection to data revealing racial or ethnic origin,
  political opinions, religious beliefs, trade union membership, genetic and
  biometric data, health, sex life and sexual orientation. These usually cannot
  be processed at all without a specific lawful basis, which makes casually
  pasting them into an assistant a considerably worse problem than pasting a
  name.
</p>

<h3>Free text</h3>
<p>
  The single most under-managed category. Case notes, support ticket bodies,
  complaint descriptions and internal comments contain everything above, plus
  the things nobody would have put in a structured field. Any redaction that
  only handles structured columns and skips the notes has missed the point.
</p>

<h2>Data that identifies without naming</h2>

<p>
  This is where automated tools stop being sufficient and judgement takes over.
</p>

<ul>
  <li>"The CFO who resigned in March."</li>
  <li>"Our only customer in Luxembourg."</li>
  <li>"The patient who came in after the crash on the A38 last Tuesday."</li>
  <li>A combination of job title, employer and approximate age.</li>
</ul>

<p>
  None of these contains an identifier. All of them identify a person to anyone
  with the relevant context. No tool will catch them, and any tool claiming to
  anonymise your documents completely is overselling. Read what you are about to
  send — the tool's job is to make that read fast, not to make it unnecessary.
</p>

<h2>A working checklist</h2>

<p>Before a document leaves your control, has it been checked for:</p>

<ol>
  <li>Names, including partial and possessive forms.</li>
  <li>Email addresses, phone numbers, postal addresses, postcodes.</li>
  <li>Dates of birth and any other precise dates tied to a person.</li>
  <li>National identifiers.</li>
  <li>Financial identifiers.</li>
  <li>Health identifiers.</li>
  <li>Reference numbers of every kind.</li>
  <li>Credentials — keys, tokens, connection strings.</li>
  <li>IP addresses and internal hostnames.</li>
  <li>Free-text fields, read rather than skimmed.</li>
  <li>Descriptions that identify someone without naming them.</li>
</ol>

<p>
  The first ten can be automated, and should be — that is a large amount of
  careful reading to do by hand, and people are bad at it precisely when they
  are busiest. The eleventh is yours.
</p>

${CTA}

<h2>Related</h2>
<ul>
  <li><a href="/guides/chatgpt-customer-data">Can you put customer data into ChatGPT?</a></li>
  <li><a href="/guides/redact-pii-before-ai">How to remove personal data before using an AI tool</a></li>
</ul>
`,
  },
];

const GUIDES = [...GUIDES_BASE, ...EXTRA_GUIDES];

const GUIDE_INDEX = {
  slug: 'guides/index',
  title: 'Guides',
  description: 'Practical writing on using AI assistants with data you are not allowed to share.',
  body: `
<h1>Guides</h1>
<p class="updated">Practical writing on using AI tools with data you are not allowed to share.</p>

${GUIDES.map((g) => `<h2><a href="/${g.slug}">${g.title}</a></h2>\n<p>${g.description}</p>`).join('\n\n')}

${CTA}
`,
};

/* --------------------------------------------------------------------- write */

const ALL = [...LEGAL_PAGES, GUIDE_INDEX, ...GUIDES];

for (const p of ALL) {
  const file = join(outDir, `${p.slug}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(p));
  console.log(`wrote public/${p.slug}.html`);
}

/* The sitemap is generated from the same list, so it can never list a page that
   does not exist or miss one that does. */
const STATIC_ENTRIES = [
  ['', 'weekly', '1.0'],
  ['app', 'weekly', '0.9'],
  ['guides', 'weekly', '0.7'],
  ...GUIDES.map((g) => [g.slug, 'monthly', '0.8']),
  ['security', 'monthly', '0.6'],
  ['privacy', 'monthly', '0.4'],
  ['terms', 'monthly', '0.3'],
  ['refunds', 'monthly', '0.3'],
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ENTRIES.map(([slug, freq, priority]) => `  <url>
    <loc>${SITE}/${slug}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
console.log(`wrote public/sitemap.xml (${STATIC_ENTRIES.length} urls)`);
