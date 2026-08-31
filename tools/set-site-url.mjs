/**
 * Point the site at a different public URL.
 *
 * Canonical links, Open Graph image URLs and the sitemap all have to be
 * absolute, so the domain is baked into several files. This rewrites every one
 * of them and records the new value, so moving to a custom domain later — which
 * is the first thing worth doing if the product sells — is one command rather
 * than a hunt through the source.
 *
 *   node tools/set-site-url.mjs https://safepaste.io
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = join(root, 'site.json');

const next = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(next)) {
  console.error('Usage: node tools/set-site-url.mjs https://example.com');
  process.exit(1);
}

const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { url: '' };
const previous = (state.url || '').replace(/\/+$/, '');

const TARGETS = [
  'public/index.html',
  'public/app.html',
  'public/privacy.html',
  'public/terms.html',
  'public/security.html',
  'public/refunds.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'docs/GO-LIVE.md',
  'docs/MARKETING.md',
  'README.md',
];

let changed = 0;
for (const relative of TARGETS) {
  const file = join(root, relative);
  if (!existsSync(file)) continue;
  const before = readFileSync(file, 'utf8');
  // Replace the recorded previous URL, and any *.vercel.app origin, so the
  // script also works the first time when nothing has been recorded yet.
  let after = previous ? before.split(previous).join(next) : before;
  after = after.replace(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app/gi, next);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
    console.log(`updated ${relative}`);
  }
}

writeFileSync(stateFile, `${JSON.stringify({ url: next }, null, 2)}\n`);
console.log(`\nSite URL is now ${next} (${changed} file${changed === 1 ? '' : 's'} changed).`);
console.log('Commit and push; Vercel redeploys on push.');
