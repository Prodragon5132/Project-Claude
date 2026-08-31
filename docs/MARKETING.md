# Launch and marketing

Everything here is written and ready to post. It has to go out under your own
name: Hacker News, Reddit and LinkedIn all react badly to posts that are
obviously not from a person, and a launch that gets flagged as astroturf is
worse than no launch.

Site: **https://safepaste-alpha.vercel.app**

---

## The positioning, in one paragraph

Every organisation has told its staff not to paste customer data into ChatGPT.
Every organisation's staff have then discovered that the work they most want
help with *is* the customer data. SafePaste resolves that: it strips the
identifiers out locally, gives you something safe to paste, and puts the real
values back into the answer. The buyer is not a curious individual — it is
someone whose job is affected by that rule: a solicitor, a practice manager, an
HR lead, a claims handler, a consultant under an NDA.

Sell the *permission*, not the regex. What people are buying is the ability to
use the tool their employer told them not to.

---

## Order of operations

Do not fire everything at once. Each of these teaches you something you should
fix before the next.

1. **Day 1 — the niche subreddits.** Small, specific, forgiving. You will learn
   what people ask before you face a bigger audience.
2. **Day 2–3 — LinkedIn.** Where the actual buyers are, especially legal,
   healthcare admin and compliance.
3. **Day 4 — Hacker News.** Only after the first two have shaken out the obvious
   objections. Post on a weekday morning, US Eastern.
4. **Week 2 — Product Hunt**, once you have a handful of real users to say
   something.
5. **Ongoing — the SEO pages** below. Slowest, and eventually the largest source.

---

## Hacker News

Title (HN dislikes hype and punctuation; this is deliberately flat):

```
Show HN: SafePaste – redact PII locally before pasting into an LLM
```

First comment, posted by you immediately after submitting:

```
I built this because every "don't put customer data in ChatGPT" policy I've
seen runs into the same wall: the work people want help with is the customer
data.

It's a static page — the detection and redaction run in your browser, and
there's no server to send anything to. The CSP is connect-src 'self', so the
browser itself refuses to let the page contact another host. Open the network
tab and you'll see the page load and then nothing.

The part I spent most of the time on was false positives. A redactor that
flags everything gets switched off after it mangles your third document, so
anything with a checksum is verified rather than pattern-matched: Luhn for
cards, mod-97 for IBANs, mod-11 for NHS numbers, the ABA weighting for routing
numbers, the ISO 3779 check digit for VINs. Names are the hard case and have no
checksum — there's a gazetteer plus context rules, and every match carries a
confidence value so the ones that were guesses are flagged for review.

Tokens are reversible. You paste the model's reply back in and the real values
return byte-for-byte, so the draft email it wrote has your customer's actual
name in it and you never sent that name anywhere.

Free up to 5k characters, $39 once for the rest. Happy to answer anything about
the detection logic — it's the interesting part.
```

**Answer these honestly when they come up, because they will:**

- *"This is just regexes."* Partly, yes — and the interesting half is the
  validation and overlap resolution that stops the regexes from being useless.
  Say so. Don't oversell it as ML.
- *"An LLM could do this better."* For names in unusual formats, probably. But
  running the redaction through an LLM means sending the document to an LLM,
  which is the thing being avoided. Local is the whole point.
- *"Re-identification is still possible."* Correct, and the security page says
  so. "The CFO who resigned in March" names someone without naming them.
  SafePaste removes identifiers; it does not anonymise.
- *"Why not open source?"* You can say the engine is readable in the page source
  and that you may open it later. Do not claim it is open source — it is not.

---

## Reddit

Read each subreddit's self-promotion rules first; several require you to be an
established participant. If you have no history, spend a few days commenting
before you post anything of your own.

**Best fits:** r/LawFirm, r/Lawyertalk, r/paralegal, r/healthIT, r/medicalcoding,
r/humanresources, r/msp, r/sysadmin, r/privacy, r/ChatGPTPro, r/SideProject.

Template — adapt per subreddit, and lead with the problem, never the product:

```
Title: Made a thing that strips client data out of text before it goes into ChatGPT

Our firm's policy is no client information in AI tools. Which is fine until you
have a forty-page bundle you want summarised and no way to do it.

So I built a page that finds the names, dates of birth, account numbers, NHS
numbers and so on, swaps each one for a placeholder, and then swaps them back
when you paste the answer in. It runs entirely in the browser — nothing is
uploaded, which is the only version of this that's any use for us.

Free for anything up to 5,000 characters, which covers most of what I do.
Link in the comments if that's allowed here — happy to just describe it
otherwise.
```

---

## LinkedIn

This is where the buyers are. Post as yourself, not a company page.

```
Every compliance team I've spoken to this year has written some version of the
same rule: don't put client data into AI tools.

Every one of them has the same problem with it. The work people most want help
with is the client data. So the rule gets followed carefully for a month, and
then quietly stops being followed at all.

I've spent the last while building the thing that resolves it. You paste a
document, it strips out the names, dates of birth, account numbers, medical
record numbers and API keys, and hands you a version that's safe to paste
anywhere. Then when the answer comes back, you paste it in and your real data
goes back where it belongs.

It runs entirely in the browser. Nothing is uploaded — not the document, not
the mapping. The page is served with a policy that stops it contacting any
server at all, which you can verify yourself in about ten seconds.

Free for anything up to 5,000 characters: [link]

If you own an AI policy that people are quietly ignoring, I'd genuinely like to
hear what your version of this problem looks like.
```

Post between 8 and 10am on a Tuesday, Wednesday or Thursday. Reply to every
comment within the first hour — that is what decides how far it travels.

---

## X / Twitter

```
Your company says: don't paste customer data into ChatGPT.
Your job says: summarise this customer complaint.

SafePaste strips the names, card numbers and health IDs out first, then puts
them back into the answer.

Runs in your browser. Nothing uploaded. Free to try.
[link]
```

Follow-up in the thread:

```
The hard part wasn't finding the data. It was not finding data that isn't there.

A redactor that flags every capitalised word gets turned off after it mangles
your third document. So: Luhn for cards, mod-97 for IBANs, mod-11 for NHS
numbers, and a gazetteer plus context for names — with a confidence score on
every match so you know which ones were guesses.
```

---

## Product Hunt

- **Tagline:** Redact personal data before you paste it into an AI
- **Description:** SafePaste strips names, emails, card numbers, health IDs and
  API keys out of any text, gives you something safe to paste into ChatGPT or
  Claude, and puts the real values back into the answer. It runs entirely in
  your browser — nothing is uploaded, and the page cannot contact any server.
- **Gallery:** the OG image, plus screenshots of the app in light and dark. Take
  them with `node tools/shots.mjs https://safepaste-alpha.vercel.app`.
- **First comment:** the Hacker News comment above, lightly warmed up.

Launch on a Tuesday or Wednesday, 12:01am Pacific.

---

## Cold outreach that is not spam

Twenty well-chosen emails will do more than a thousand scraped ones, and the
second kind will get your domain blocked.

Target: small law firms, dental and GP practice managers, independent insurance
brokers, boutique consultancies. People who have the problem and no in-house
security team to build around it.

```
Subject: the ChatGPT policy problem

Hi [name],

Quick question — does [firm] have a rule about putting client information into
ChatGPT, and does anyone actually follow it?

I ask because I've built a small tool for exactly that gap. It strips client
names, dates of birth and reference numbers out of a document before you paste
it, then puts them back into whatever comes out. It runs in the browser, so
nothing is uploaded anywhere.

It's free to try and takes about fifteen seconds: [link]

Not asking for a call. If it's useful you'll know within a minute, and if it
isn't you can ignore this.

[your name]
```

Send them one at a time, from your own address, with the recipient's actual name
in it. Do not use a bulk sender.

---

## SEO: the slow part that eventually wins

Six pages are already written and live at `/guides`. Each targets a search with
buying intent and answers it properly, with SafePaste as the obvious next step
rather than the subject.

| Page | Search intent it answers |
|---|---|
| `/guides/chatgpt-customer-data` | "can I put customer data in chatgpt" |
| `/guides/redact-pii-before-ai` | "how to remove PII before using AI" |
| `/guides/what-counts-as-pii` | "what counts as PII" |
| `/guides/gdpr-and-ai-tools` | "is chatgpt gdpr compliant" |
| `/guides/hipaa-and-ai-assistants` | "hipaa chatgpt patient notes" |
| `/guides/ai-use-policy-template` | "AI use policy template" |

The policy template is the one to push hardest. It is a thing people bookmark
and forward to a colleague, which is how a page acquires the links that make the
other five rank.

To add more, edit `tools/build-pages.mjs` (or `tools/guides-extra.mjs`) and run
`node tools/build-pages.mjs`. The sitemap regenerates from the same list, so it
can never drift. Then `node tools/check.js` to confirm every link resolves.

This is the slow channel. Expect nothing for two months and a compounding
trickle after that. It is also the only one that does not need you to post
anything.

---

## What to watch

You have no analytics, deliberately — the privacy claim would be worthless
otherwise. Judge the launch on:

- **Sales.** The only number that matters.
- **Provider dashboard views vs purchases.** A high view count with no sales
  means the price or the pitch is wrong, not the product.
- **What people ask.** Every repeated question is either a missing FAQ entry or
  a missing feature.
- **Refund requests.** One or two is normal. A pattern is a signal.

If nobody buys at $39, the answer is unlikely to be a lower price. It is more
likely that the page is not reaching people who have the problem. Go back to the
niche communities before you touch the pricing.

---

## Things not to do

- Do not claim SafePaste makes anyone GDPR or HIPAA compliant. It does not, the
  FAQ says so, and claiming otherwise is how you acquire a legal problem instead
  of a business.
- Do not buy reviews, upvotes or Product Hunt placement.
- Do not add analytics or a tracking pixel. The privacy claim is the product.
- Do not post the same text to fifteen subreddits in an afternoon.
