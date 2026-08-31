# Taking payments

The product is built, tested and live at **https://safepaste-alpha.vercel.app**.
The free tier works completely. What is not connected is checkout, and this
document is how you connect it.

**Why you have to do this part.** Opening a payment account means proving who
you are — identity documents, a bank account in your name, a tax declaration,
and accepting a contract as a legal person. Nobody can do that on your behalf,
and you would not want them to. Everything on this side of that line is already
done: the licence keys your provider issues will be verified by the endpoint at
`/api/license`, and the buy buttons will start working the moment you paste
three URLs into Vercel.

Budget fifteen minutes.

---

## 1. Choose where the money comes from

All three options below are **merchants of record**. That matters more than the
fee: they sell to your customer as the legal seller, which means they handle VAT
and US sales tax registration, collection and remittance. You get one payout and
one figure to declare. Without that you would be responsible for tax
registration in every jurisdiction you sell into, which for a $39 product is not
worth contemplating.

| | Fee | Setup | Payout |
|---|---|---|---|
| **Gumroad** | ~10% flat | Fastest — an individual can be selling the same day | Weekly, to a bank account or PayPal |
| **Lemon Squeezy** | ~5% + 50¢ | Slower — wants business details up front | Regular payouts to a bank account |
| **Polar** | ~4% + 40¢ | Middle | Payouts via Stripe Connect |

**Recommendation: start with Gumroad.** The extra five percent is worth far less
than launching a week earlier, and you can migrate later without changing a line
of code — the licence endpoint already speaks all three. If you already have a
registered business and want the lower fee, use Lemon Squeezy.

Fees and payout terms change; check the current figures on their pricing pages
before you commit.

---

## 2. Create the three products

Whichever provider you pick, make three products and **turn on licence keys for
each one**. That checkbox is what makes this work: the key the buyer receives is
what they paste into the app.

| Product name | Price | Description to paste in |
|---|---|---|
| SafePaste Personal | $39 | One person, unlimited document size, file open and save, realistic-name mode, custom rules, offline use. Lifetime licence including updates. |
| SafePaste Team | $149 | Everything in Personal for up to 10 people on one key, shared rule profiles, consistent tokens across a batch of files, priority support. |
| SafePaste Business | $499 | Everything in Team, unlimited seats in one organisation, the right to self-host on your own domain, written data-flow confirmation for your DPIA. |

Cover image: use `public/assets/img/og.png` from this repository. It is already
1200×630, which is what every one of these platforms wants.

### Gumroad specifics

- New product → **Digital product**, price, then in the product settings enable
  **Generate a unique licence key per sale**.
- Under Content, add a short thank-you note with a link to
  https://safepaste-alpha.vercel.app/app and the instruction: *open the app,
  click "Get Pro", paste your licence key, press Activate.*
- You need the **product ID** for each product. It is in the URL of the product
  edit page, or in the API section of the product settings.
- Set your payout method under Settings → Payments before your first sale.

### Lemon Squeezy specifics

- Create a store, then a product per tier, each with a single variant.
- In the variant, enable **Licence keys**.
- You need the **store ID** and each **variant ID**; both appear in the
  dashboard URLs.

### Polar specifics

- Create an organisation and a product per tier with a licence-key benefit.
- You need the **organisation ID**.

---

## 3. Tell the site about it

Go to the Vercel dashboard → the **safepaste** project → **Settings** →
**Environment Variables**. Add these for the **Production** environment.

Every provider needs these three, which are just the checkout links buyers are
sent to:

```
CHECKOUT_PERSONAL   https://yourname.gumroad.com/l/safepaste-personal
CHECKOUT_TEAM       https://yourname.gumroad.com/l/safepaste-team
CHECKOUT_BUSINESS   https://yourname.gumroad.com/l/safepaste-business
CONTACT_EMAIL       the address you want support and refund requests to reach
```

Then the ones that let the app verify a key. **Gumroad:**

```
LICENSE_PROVIDER            gumroad
GUMROAD_PRODUCT_PERSONAL    <product id>
GUMROAD_PRODUCT_TEAM        <product id>
GUMROAD_PRODUCT_BUSINESS    <product id>
```

**Lemon Squeezy:**

```
LICENSE_PROVIDER        lemonsqueezy
LEMONSQUEEZY_STORE_ID   <store id>
LS_VARIANT_PERSONAL     <variant id>
LS_VARIANT_TEAM         <variant id>
LS_VARIANT_BUSINESS     <variant id>
```

**Polar:**

```
LICENSE_PROVIDER        polar
POLAR_ORGANIZATION_ID   <organisation id>
```

There is also `LICENSE_KEYS`, a comma-separated list of `KEY:Plan` pairs, for
keys you issue by hand — someone who paid by invoice, a replacement for a lost
key, a reviewer copy. For example
`LICENSE_KEYS=REVIEWER-4417-XKCD:Business,INVOICE-0001:Team`.

**Environment variables only take effect on a new deployment.** After saving
them, open the Deployments tab and redeploy the latest one, or push any commit.

---

## 4. Check it end to end

1. Open https://safepaste-alpha.vercel.app/#pricing. The buy buttons should now
   go to your checkout rather than showing "Checkout is being connected".
2. Buy your own Personal licence. Use a real card — most providers let you
   refund yourself immediately afterwards, and a test-mode purchase does not
   prove the live path works.
3. Check the email arrives and contains a licence key.
4. Open the app, click **Get Pro**, paste the key, press **Activate**. The
   button should change to "Personal ✓" and realistic-name mode, file open and
   save, custom rules and the vault should all unlock.
5. Refund yourself in the provider's dashboard.

If activation fails, the message in the dialog tells you which stage broke.
"Checkout is not connected yet" means `LICENSE_PROVIDER` did not reach the
function — you probably need to redeploy. "That key was not recognised" means
the product ID does not match the product the key came from.

---

## 5. Getting the money out

- **Gumroad**: Settings → Payments. Add a bank account (or PayPal where a bank
  is not supported). Payouts run weekly once you clear the minimum balance.
- **Lemon Squeezy**: Settings → Payouts. Bank details, then payouts on their
  schedule.
- **Polar**: pays out through Stripe Connect; connect or create a Stripe account.

You will need your tax details on file before the first payout in all three
cases. Because the provider is the merchant of record, what you report is the
income they paid you, not sales tax on individual orders — but the specifics
depend on where you live, so check with whoever does your tax return.

---

## 6. Worth doing next

**A real domain.** `safepaste-alpha.vercel.app` works, but a product asking $499
reads better on its own domain, and the "alpha" is doing you no favours. Buy one
(around $10–15 a year), add it in Vercel → Settings → Domains, then run:

```
node tools/set-site-url.mjs https://yourdomain.com
git commit -am "Point the site at the new domain" && git push
```

That rewrites the canonical links, Open Graph URLs, sitemap and robots file, and
the push redeploys.

If you would rather stay free, you can at least drop the "alpha": rename the
project in Vercel → Settings → General. Vercel will assign
`<new-name>.vercel.app` if it is available. Run the same script afterwards with
the new URL.

**Search Console.** Add the site at
[search.google.com/search-console](https://search.google.com/search-console) and
submit `sitemap.xml`. It is how the SEO content in `docs/MARKETING.md` starts
earning.

---

## What was built for you, and what was not

Done and working:

- The product, tested — 109 unit tests and 44 browser checks, all passing.
- The site, live, with the security headers its privacy claims depend on.
- Licence verification for three providers, and hand-issued keys.
- Checkout links driven by environment variables, so no code change is needed.
- The launch and marketing material in `docs/MARKETING.md`.

Not done, because it requires you personally:

- Creating the payment account. Identity verification, a bank account and
  accepting a contract are yours to do.
- Posting to Hacker News, Reddit, LinkedIn or anywhere else. The copy is
  written; posting under your own name has to be you, and these communities
  react badly to accounts that are obviously not a person.
- Buying a domain, which costs money.

No accounts were created in your name, and nothing was posted anywhere.
