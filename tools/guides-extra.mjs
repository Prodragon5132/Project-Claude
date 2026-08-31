/**
 * The second batch of guides, kept in their own file so build-pages.mjs stays
 * readable. Imported and rendered by the same generator and shell.
 */

export const EXTRA_GUIDES = [
  {
    slug: 'guides/gdpr-and-ai-tools',
    title: 'Is ChatGPT GDPR compliant?',
    description: 'The question is malformed, and the useful version has a clear answer. What GDPR actually requires when you use an AI assistant with personal data, and the controls that satisfy it.',
    body: `
<h1>Is ChatGPT GDPR compliant?</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  This is not legal advice. It is a working explanation of what the question
  means, written for people who have to answer it on a Tuesday afternoon.
</p>

<h2>Why the question does not quite work</h2>

<p>
  GDPR does not certify products. There is no compliant list. Compliance is a
  property of what <em>you</em> do with personal data — your lawful basis, your
  contracts, your security, your retention, your transparency to the people
  whose data it is. A tool can make that easier or harder. It cannot be
  compliant on your behalf.
</p>
<p>
  So "is ChatGPT GDPR compliant" resolves into a more useful question:
  <strong>can I use this assistant with personal data in a way that satisfies my
  obligations?</strong> That has an answer, and it depends almost entirely on
  which tier you are on and what you paste.
</p>

<h2>The four things you actually have to satisfy</h2>

<h3>1. A lawful basis</h3>
<p>
  You need one for every processing purpose. If your basis for holding customer
  data is performance of a contract, sending it to a third party to summarise is
  a new purpose that needs its own justification. Legitimate interests can cover
  it, but only after a balancing test you have actually done and written down —
  not one you assume would pass.
</p>

<h3>2. A processor agreement, before the data moves</h3>
<p>
  Article 28 requires a written contract with anyone processing personal data on
  your behalf, setting out the subject matter, duration, purpose, categories of
  data and the processor's obligations. Business and enterprise tiers of the
  major assistants offer a data processing agreement; consumer tiers generally
  do not. An employee pasting client data into a personal account has created a
  disclosure with no Article 28 contract behind it, which is a straightforward
  problem regardless of how careful the provider is.
</p>

<h3>3. A transfer mechanism</h3>
<p>
  If personal data leaves the UK or EEA, you need a valid mechanism — an
  adequacy decision, standard contractual clauses, or the relevant data privacy
  framework. Enterprise agreements normally address this; consumer terms
  generally leave it to you.
</p>

<h3>4. Data minimisation, which is the one that helps you</h3>
<p>
  Article 5(1)(c) says personal data must be adequate, relevant and limited to
  what is necessary. This is usually read as a constraint. Read the other way it
  is a solution: if the identity is not necessary to the task, sending it is a
  breach of minimisation, and <em>not</em> sending it removes most of the
  problem in one move.
</p>

<h2>What the enterprise tiers change</h2>

<p>A business or enterprise agreement typically gives you:</p>
<ul>
  <li>A data processing agreement, satisfying Article 28.</li>
  <li>A commitment not to train on your inputs by default.</li>
  <li>Defined retention, sometimes configurable.</li>
  <li>A transfer mechanism for international transfers.</li>
  <li>Administrative controls and audit visibility.</li>
</ul>
<p>
  That is a genuine improvement and, if you are going to use these tools with
  personal data at all, it is the necessary foundation. Verify the current terms
  yourself rather than relying on any summary — they change.
</p>
<p>What it does not do:</p>
<ul>
  <li>Satisfy Article 5(1)(c). Minimisation still applies. Having a DPA does not
      make it necessary to send a name.</li>
  <li>Override a confidentiality obligation to a client that predates it.</li>
  <li>Help with special category data, which needs an Article 9 condition on top
      of everything else.</li>
  <li>Cover the staff working outside the sanctioned account.</li>
</ul>

<h2>The control that does most of the work</h2>

<p>
  Strip the identifiers before the text leaves the device. This is not a
  workaround; it is the mechanism the regulation itself points at. If the
  document you send contains no personal data, most of the framework above
  simply does not engage — there is no transfer, no processing by a processor,
  no minimisation question to answer.
</p>
<p>Two conditions have to hold for that to be true, and they are worth stating:</p>
<ul>
  <li><strong>The redaction has to happen locally.</strong> A redaction service
      that uploads your document in order to redact it has performed the transfer
      you were trying to avoid.</li>
  <li><strong>The mapping has to stay with you.</strong> If the placeholder-to-real-value
      mapping is held by a third party, they hold personal data and you are back
      where you started.</li>
</ul>
<p>
  Where the answer has to come back with real names in it — a drafted reply, a
  rewritten letter — the reversal also has to happen on your machine.
  Reversibility is not a convenience here; it is the difference between a
  workable control and one that gets abandoned.
</p>

<h2>What to write in your DPIA</h2>

<p>
  A data protection impact assessment wants specific, verifiable controls.
  "Staff are instructed not to paste personal data" is a policy, and policies do
  not survive contact with deadlines. This is more useful:
</p>
<blockquote>
  Personal identifiers are removed from documents before they are shared with
  the assistant, using client-side software that performs no network
  transmission. The mapping between placeholder and original value is held only
  in the employee's browser session and is discarded when the session ends.
  Employees review the highlighted output before sharing.
</blockquote>
<p>
  That is a control with a mechanism, a boundary and a human check. Whoever
  reviews your DPIA can assess it.
</p>

<h2>Residual risk you should record honestly</h2>

<ul>
  <li>Re-identification from context that contains no identifier.</li>
  <li>Automated detection missing an unusual name or identifier format.</li>
  <li>An employee pasting the original rather than the redacted text.</li>
</ul>
<p>
  None of these is a reason not to do it. All of them are reasons to keep the
  human review step and to write the residual risk down rather than pretending
  it is zero.
</p>

<div class="card cta-card">
  <h2 class="mt-0">Try it on your own document</h2>
  <p>
    SafePaste strips the identifiers out of any text in your browser, hands you a
    version that is safe to paste, and puts the real values back into the answer.
    Nothing is uploaded — the page cannot reach any server but its own.
  </p>
  <p class="mb-0"><a class="btn btn--primary" href="/app">Open SafePaste — free, no sign-up</a></p>
</div>

<h2>Related</h2>
<ul>
  <li><a href="/guides/chatgpt-customer-data">Can you put customer data into ChatGPT?</a></li>
  <li><a href="/guides/what-counts-as-pii">What actually counts as personal data</a></li>
  <li><a href="/security">How SafePaste is built, and what it cannot do</a></li>
</ul>
`,
  },

  {
    slug: 'guides/hipaa-and-ai-assistants',
    title: 'HIPAA and AI assistants: what you can and cannot paste',
    description: 'Why a Business Associate Agreement is the whole question, what the eighteen Safe Harbor identifiers are, and how de-identification lets clinical staff use these tools without one.',
    body: `
<h1>HIPAA and AI assistants: what you can and cannot paste</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  This is not legal advice, and HIPAA is a regime where the details matter. It
  is a practical explanation of the two doors available to a covered entity, and
  why most staff only have access to one of them.
</p>

<h2>The rule in one sentence</h2>

<p>
  A covered entity may not disclose protected health information to a vendor
  without a Business Associate Agreement in place. An AI assistant with no BAA
  is such a vendor. Pasting a patient's information into it is a disclosure, and
  it happens the moment you press the key — not when the model responds, and not
  only if it trains on the data.
</p>

<h2>Door one: get a BAA</h2>

<p>
  Some AI providers will sign a Business Associate Agreement, generally on their
  enterprise or healthcare-specific offerings. If your organisation has one in
  place, has configured the account accordingly, and staff are using that
  account, PHI can flow within the terms of that agreement.
</p>
<p>Three things go wrong with this in practice:</p>
<ul>
  <li>The BAA covers a specific product and configuration. The consumer app
      from the same company is usually not covered.</li>
  <li>Staff who cannot access the sanctioned account use the one they can. This
      is the most common failure and it is invisible until something surfaces.</li>
  <li>The agreement covers the assistant, not everything staff paste into
      everything else.</li>
</ul>

<h2>Door two: de-identify first</h2>

<p>
  De-identified health information is not PHI, and the rule does not apply to
  it. That is the whole basis of this route. HIPAA gives two methods.
</p>

<h3>Expert determination</h3>
<p>
  A qualified statistician determines and documents that the risk of
  re-identification is very small. Rigorous, defensible, and not something
  anyone is going to arrange before summarising a discharge letter.
</p>

<h3>Safe Harbor</h3>
<p>
  Remove eighteen categories of identifier, and have no actual knowledge that
  the remainder could identify the individual. This is the method that is
  actually usable day to day, because it is a checklist.
</p>

<h2>The eighteen Safe Harbor identifiers</h2>

<ol>
  <li>Names.</li>
  <li>All geographic subdivisions smaller than a state, including street
      address, city, county, precinct and ZIP code — with a narrow exception for
      the first three ZIP digits in sufficiently large areas.</li>
  <li>All elements of dates except the year, for dates directly related to the
      individual: birth date, admission date, discharge date, date of death. Ages
      over 89 must be aggregated.</li>
  <li>Telephone numbers.</li>
  <li>Fax numbers.</li>
  <li>Email addresses.</li>
  <li>Social Security numbers.</li>
  <li>Medical record numbers.</li>
  <li>Health plan beneficiary numbers.</li>
  <li>Account numbers.</li>
  <li>Certificate and licence numbers.</li>
  <li>Vehicle identifiers and serial numbers, including licence plates.</li>
  <li>Device identifiers and serial numbers.</li>
  <li>Web URLs.</li>
  <li>IP addresses.</li>
  <li>Biometric identifiers, including finger and voice prints.</li>
  <li>Full-face photographs and comparable images.</li>
  <li>Any other unique identifying number, characteristic or code.</li>
</ol>

<h2>The three that get missed</h2>

<p>
  Names, dates of birth and medical record numbers are rarely forgotten. These
  three are.
</p>

<h3>Dates other than birth dates</h3>
<p>
  Admission, discharge, procedure and death dates are all on the list, and they
  are everywhere in clinical text. Safe Harbor allows the year and nothing more
  precise. "Admitted 14 March 2026" is an identifier; "admitted in 2026" is not.
</p>

<h3>"Any other unique identifying number, characteristic or code"</h3>
<p>
  This catch-all covers the accession numbers, encounter IDs, study numbers and
  internal reference codes that clinical systems generate constantly. If it
  points at one person, it is an identifier.
</p>

<h3>Device identifiers and IP addresses</h3>
<p>
  Ordinary in a support ticket or a system log, and squarely on the list.
</p>

<h2>Where automation helps and where it stops</h2>

<p>
  Fifteen of the eighteen categories are mechanically detectable. Names, dates,
  contact details, national and plan identifiers, account and record numbers,
  device identifiers, URLs and IP addresses can all be found and replaced
  reliably, and doing it by hand across a caseload is exactly the sort of
  careful repetitive work people stop doing well when they are busy.
</p>
<p>
  The last one — "no actual knowledge that the information could identify the
  individual" — is a judgement, and it stays with you. A note saying "the
  patient who was airlifted after the pile-up on the M6 last Tuesday" contains
  no listed identifier and identifies someone to anyone who reads the local
  news. No software will catch that. The point of automating the other
  seventeen is to leave you with attention to spare for the one that needs you.
</p>

<h2>A workable process</h2>

<ol>
  <li>De-identify the text locally, before it leaves the machine.</li>
  <li>Review what was found and what was left, and read the remainder for
      identifying context.</li>
  <li>Use the assistant on the de-identified text.</li>
  <li>Bring the answer back and restore the identifiers locally, so the letter
      or note is complete for the record.</li>
  <li>Keep the mapping out of any third-party system, including your own
      cloud storage, unless it is already covered.</li>
</ol>

<p>
  Step four is the one people skip when they de-identify irreversibly, and it is
  why irreversible redaction gets abandoned: a discharge summary addressed to
  "Patient 1" is not a discharge summary.
</p>

<div class="card cta-card">
  <h2 class="mt-0">Try it on your own document</h2>
  <p>
    SafePaste finds names, dates, MRNs, plan and account numbers, contact details,
    device identifiers and IP addresses, replaces them in your browser, and puts
    them back when the answer returns. Nothing is uploaded.
  </p>
  <p class="mb-0"><a class="btn btn--primary" href="/app">Open SafePaste — free, no sign-up</a></p>
</div>

<h2>Related</h2>
<ul>
  <li><a href="/guides/what-counts-as-pii">What actually counts as personal data</a></li>
  <li><a href="/guides/redact-pii-before-ai">How to remove personal data before using an AI tool</a></li>
</ul>
`,
  },

  {
    slug: 'guides/ai-use-policy-template',
    title: 'An AI use policy people will actually follow',
    description: 'A short, copyable policy template for firms handling confidential client data, plus the reason most AI policies fail: they ban the work instead of enabling it safely.',
    body: `
<h1>An AI use policy people will actually follow</h1>
<p class="updated">Last updated 31 August 2026</p>

<p>
  Most AI policies fail the same way. They say "do not put confidential
  information into AI tools", they are circulated, everyone agrees, and then the
  work arrives and the rule quietly stops applying. Six months later nobody
  knows what is being pasted where.
</p>
<p>
  A policy that forbids something people need to do is not a control. It is a
  record that you were told. Below is a template written the other way round: it
  says what people <em>may</em> do, and under what conditions.
</p>
<p>
  Adapt it — this is a starting point, not legal advice, and your regulator,
  insurer and professional body may all have views.
</p>

<hr>

<h2>[Firm name] — Use of AI assistants</h2>

<p><strong>Effective:</strong> [date] · <strong>Owner:</strong> [name, role] · <strong>Review:</strong> every six months</p>

<h3>1. Why this exists</h3>
<p>
  AI assistants are useful for drafting, summarising, analysis and research. We
  want people to use them. We also hold information about clients that we are
  contractually and professionally obliged to protect. This policy sets out how
  to do both.
</p>

<h3>2. What you may use</h3>
<ul>
  <li><strong>Approved tools:</strong> [list]. These are covered by an agreement
      that meets our data protection requirements.</li>
  <li>Any other AI tool is unapproved. You may use unapproved tools only with
      information that is already public, or that has been de-identified under
      section 4.</li>
</ul>

<h3>3. What must never be shared with any AI tool</h3>
<ul>
  <li>Client names, contact details, and any identifier that points at a person
      or an organisation we act for.</li>
  <li>Financial identifiers: account numbers, card numbers, payment references.</li>
  <li>Health information about an identifiable person.</li>
  <li>Credentials of any kind — passwords, API keys, tokens, connection strings.</li>
  <li>Anything covered by an NDA whose terms do not permit it.</li>
  <li>Anything a colleague has marked as restricted.</li>
</ul>

<h3>4. De-identification: the normal way to work</h3>
<p>
  Most tasks do not need the identity. Summarising a matter, drafting a
  response, comparing clauses and classifying correspondence all work perfectly
  on de-identified text.
</p>
<p>Before sharing a document with any AI tool:</p>
<ol>
  <li>Remove identifiers using [approved redaction tool], which operates on your
      own device and does not transmit the document.</li>
  <li><strong>Review what it found and what it left.</strong> Automated
      detection is not complete. Read the document for anything that identifies
      someone without naming them — a role, an unusual event, a distinctive
      date.</li>
  <li>Use the tool on the de-identified version.</li>
  <li>Restore the real values in the output on your own device before the
      result goes into a file or an email.</li>
</ol>
<p>
  The mapping between placeholders and real values is confidential information.
  Do not email it, do not put it in shared storage, and close the tab when you
  are done.
</p>

<h3>5. You are responsible for the output</h3>
<ul>
  <li>Check every factual claim. These tools state things that are wrong with
      complete confidence, and citations to matters and authorities that do not
      exist are a known and recurring failure.</li>
  <li>Nothing goes to a client, a counterparty or a court without a person who
      is competent to judge it having read it.</li>
  <li>AI-assisted work is your work. The tool does not carry the professional
      obligation; you do.</li>
</ul>

<h3>6. If something goes wrong</h3>
<p>
  If you paste something you should not have, tell [name] the same day. There is
  no disciplinary consequence for reporting it promptly and honestly. There is
  one for concealing it. Early notice is often the difference between a
  contained mistake and a notifiable breach.
</p>

<h3>7. Record keeping</h3>
<p>
  Where AI has materially contributed to work product, note it in the matter
  file: which tool, what it was used for, and that the output was reviewed.
</p>

<hr>

<h2>Why this version works better</h2>

<h3>It gives people a route to yes</h3>
<p>
  The banned list is short and absolute; everything else has a documented way to
  proceed. Nobody has to choose between the rule and the deadline, which is the
  choice that kills every policy of the other kind.
</p>

<h3>The control is mechanical, not aspirational</h3>
<p>
  "Be careful" cannot be audited. "Run it through the redaction tool and review
  the highlights" is a step someone either did or did not do, and it survives a
  busy Friday in a way that good intentions do not.
</p>

<h3>It admits the tool is imperfect</h3>
<p>
  Step 2 of section 4 is the most important line in the policy. Any process that
  implies the software catches everything will eventually be wrong in a way
  nobody was looking for. Making the human check explicit is what makes the rest
  defensible.
</p>

<h3>Reporting is safe</h3>
<p>
  Section 6 exists because the alternative is that people hide mistakes until
  they become incidents. A no-blame same-day report is worth more than any
  amount of preventive text.
</p>

<h2>Before you circulate it</h2>

<ul>
  <li>Name the approved tools specifically. "Approved tools" with no list is not
      a policy.</li>
  <li>Check it against your professional body's guidance and your PI insurer's
      terms.</li>
  <li>Run one session showing the de-identification workflow on a real document.
      Fifteen minutes of demonstration outperforms any amount of circulated
      text.</li>
  <li>Set the review date and keep it. This area is changing fast enough that a
      two-year-old AI policy is describing a different world.</li>
</ul>

<div class="card cta-card">
  <h2 class="mt-0">The tool for section 4</h2>
  <p>
    SafePaste removes identifiers from any text in the browser, shows you every
    match so you can review before you copy, and restores the real values in the
    answer. Nothing is uploaded — the page cannot reach any server but its own,
    which is a claim your IT team can verify in ten seconds.
  </p>
  <p class="mb-0"><a class="btn btn--primary" href="/app">Open SafePaste — free, no sign-up</a></p>
</div>

<h2>Related</h2>
<ul>
  <li><a href="/guides/chatgpt-customer-data">Can you put customer data into ChatGPT?</a></li>
  <li><a href="/guides/gdpr-and-ai-tools">Is ChatGPT GDPR compliant?</a></li>
  <li><a href="/security">How SafePaste is built, and what it cannot do</a></li>
</ul>
`,
  },
];
