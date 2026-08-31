/**
 * Screenshot the site so the design can actually be looked at.
 *   node tools/shots.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:4321';
const OUT = process.argv[3] || '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function shoot(path, file, { dark = false, full = false, width = 1440, height = 950, prep } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (prep) await prep(page);
  await page.screenshot({ path: join(OUT, file), fullPage: full });
  await ctx.close();
  console.log(join(OUT, file));
}

await shoot('/', 'landing-top.png');
await shoot('/', 'landing-full.png', { full: true });
await shoot('/', 'landing-dark.png', { dark: true });
await shoot('/app', 'app-light.png', {
  prep: async (p) => { await p.click('#btn-sample'); await p.waitForTimeout(600); },
});
await shoot('/app', 'app-dark.png', {
  dark: true,
  prep: async (p) => { await p.click('#btn-sample'); await p.waitForTimeout(600); },
});
await shoot('/app', 'app-mobile.png', {
  width: 420, height: 900, full: true,
  prep: async (p) => { await p.click('#btn-sample'); await p.waitForTimeout(600); },
});
await shoot('/security', 'security.png', { full: true });

await browser.close();
