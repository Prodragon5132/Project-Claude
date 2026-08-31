/**
 * End-to-end check in a real browser.
 *
 * Drives the actual UI against a running server and fails loudly on any console
 * error, page error, or CSP violation. The unit tests prove the engine is
 * correct; this proves the thing a customer touches is wired to it.
 *
 *   node tools/serve.mjs 4321 &
 *   node tools/e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:4321';
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let failures = 0;
const problems = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

context.on('page', (page) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console error on ${page.url()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`page error on ${page.url()}: ${err.message}`));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    if (failure && /csp|blocked/i.test(failure.errorText)) {
      problems.push(`blocked request ${req.url()}: ${failure.errorText}`);
    }
  });
});

const page = await context.newPage();

/* ------------------------------------------------------------ every page */

console.log('\nPages load cleanly');
for (const path of ['/', '/app', '/privacy', '/terms', '/security', '/refunds', '/guides',
  '/guides/chatgpt-customer-data', '/guides/redact-pii-before-ai', '/guides/what-counts-as-pii',
  '/guides/gdpr-and-ai-tools', '/guides/hipaa-and-ai-assistants', '/guides/ai-use-policy-template']) {
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  check(`${path} responds 200`, res && res.status() === 200, res && String(res.status()));
  const title = await page.title();
  check(`${path} has a title`, title.length > 5, title);
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  check(`${path} has a heading`, !!h1 && h1.trim().length > 3, h1);
}

/* ------------------------------------------------------------- the tool */

console.log('\nRedaction in the browser');
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });

await page.click('#btn-sample');
await page.waitForTimeout(500);

const output = await page.locator('#output').textContent();
check('output contains tokens', /\[PERSON_1\]/.test(output), output.slice(0, 80));
check('the email is gone', !output.includes('sarah.whitfield@northgate-legal.co.uk'));
check('the card number is gone', !output.includes('5555 5555 5555 4444'));
check('the API key is gone', !output.includes(['sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'].join('_')));
check('the NHS number is gone', !output.includes('943 476 5919'));
check('the IBAN is gone', !output.includes('GB82 WEST 1234 5698 7654 32'));
check('the honorific survives', output.includes('Dr. ['));

const findings = await page.locator('#finding-list .finding').count();
check('findings are listed', findings >= 10, String(findings));

const risk = await page.locator('#risk-score').textContent();
check('a risk score is shown', Number(risk) > 0, risk);

const summary = await page.locator('#out-summary').textContent();
check('the summary reports replacements', /replaced/.test(summary), summary);

/* ------------------------------------------------------------- review tab */

console.log('\nReview tab');
await page.click('#tab-review');
await page.waitForTimeout(200);
const marks = await page.locator('#review mark.hit').count();
check('original text is shown with highlights', marks >= 10, String(marks));
await page.click('#tab-edit');

/* --------------------------------------------------------------- restore */

console.log('\nRestore round trip');
const redacted = await page.locator('#output').textContent();
await page.fill('#reply', `Summary: I will email ${matchToken(redacted, 'EMAIL_1')} and call ${matchToken(redacted, 'PHONE_1')} about **${matchToken(redacted, 'PERSON_1')}**.`);
await page.click('#btn-restore');
await page.waitForTimeout(200);
const restored = await page.locator('#restored').textContent();
check('the email came back', restored.includes('sarah.whitfield@northgate-legal.co.uk'), restored);
check('the person came back', restored.includes('Sarah Whitfield'), restored);
check('no token survived', !/\[?[A-Z]+_\d+\]?/.test(restored.replace(/[^\x20-\x7e]/g, '')), restored);

const restoreSummary = await page.locator('#restore-summary').textContent();
check('restore reports a count', /put back/.test(restoreSummary), restoreSummary);

function matchToken(text, body) {
  const m = new RegExp(`\\[${body}\\]`).exec(text);
  return m ? m[0] : `[${body}]`;
}

/* ------------------------------------------------------------- self test */

console.log('\nBuilt-in self check');
await page.click('#btn-selftest');
await page.waitForTimeout(200);
const selftest = await page.locator('#selftest-result').textContent();
check('self check passes', selftest.startsWith('Passed.'), selftest);

/* ------------------------------------------------------------- free gate */

console.log('\nFree-plan gate');
await page.fill('#input', 'x'.repeat(6000));
await page.waitForTimeout(400);
const gated = await page.locator('#output').textContent();
check('long input is truncated, not leaked', gated.includes('free plan covers the first'), gated.slice(-90));

await page.click('#mode-pseudonym');
await page.waitForTimeout(250);
const licenseOpen = await page.locator('#dlg-license').evaluate((d) => d.open);
check('Pro feature opens the licence dialog', licenseOpen);
const planCards = await page.locator('#dlg-license .plan').count();
check('the dialog shows the plans', planCards === 3, String(planCards));
await page.locator('#dlg-license [data-close-dialog]').click();

/* -------------------------------------------------------------- settings */

console.log('\nSettings');
await page.click('#btn-settings');
await page.waitForTimeout(200);
const detectorBoxes = await page.locator('#detector-settings input[type="checkbox"]').count();
check('every detector has a switch', detectorBoxes >= 40, String(detectorBoxes));
await page.locator('#dlg-settings [data-close-dialog]').first().click();
await page.waitForTimeout(150);
const settingsClosed = await page.locator('#dlg-settings').evaluate((d) => !d.open);
check('the settings dialog closes', settingsClosed);

/* ------------------------------------------------------------ dark theme */

console.log('\nTheme');
await page.click('#btn-theme');
await page.waitForTimeout(120);
await page.click('#btn-theme');
await page.waitForTimeout(120);
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
check('theme toggling sets an explicit theme', theme === 'light' || theme === 'dark', String(theme));

/* -------------------------------------------------------------- headers */

console.log('\nSecurity headers');
const res = await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
const headers = res.headers();
check('CSP restricts connections to self', /connect-src 'self'/.test(headers['content-security-policy'] || ''));
check('CSP blocks inline script', !/unsafe-inline/.test(headers['content-security-policy'] || ''));
check('nosniff is set', headers['x-content-type-options'] === 'nosniff');
check('framing is denied', /DENY/i.test(headers['x-frame-options'] || ''));

/* --------------------------------------------------------------- verdict */

await browser.close();

console.log('');
if (problems.length) {
  failures += problems.length;
  console.log('Browser problems:');
  for (const p of [...new Set(problems)]) console.log(`  ! ${p}`);
  console.log('');
}
console.log(failures === 0 ? 'All browser checks passed.' : `${failures} browser check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
