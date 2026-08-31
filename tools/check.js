/**
 * Static integrity check.
 *
 * Catches the class of mistake that unit tests never see and that only shows up
 * as a 404 in production: a stylesheet path with a typo, an icon referenced in
 * the manifest that was never generated, a nav link to a page that does not
 * exist, a module importing a file that has been renamed.
 *
 *   node tools/check.js
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

let problems = 0;
const fail = (msg) => { problems++; console.log(`  FAIL  ${msg}`); };
const ok = (msg) => console.log(`  ok    ${msg}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(publicDir);
const rel = (f) => `/${relative(publicDir, f).split('\\').join('/')}`;
const served = new Set(files.map(rel));

/** cleanUrls: /terms is served by /terms.html */
function resolves(path) {
  const clean = path.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return served.has('/index.html');
  if (served.has(clean)) return true;
  if (served.has(`${clean}.html`)) return true;
  if (served.has(`${clean}/index.html`)) return true;
  return false;
}

/* ---------------------------------------------------- html link integrity */

console.log('\nHTML references resolve');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(ref)) continue;
    if (!ref.startsWith('/')) { fail(`${rel(file)} → ${ref} is not absolute`); continue; }
    if (!resolves(ref)) fail(`${rel(file)} → ${ref} does not exist`);
  }
  // Exactly one <h1> per page.
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${rel(file)} has ${h1s} <h1> elements, expected 1`);
  // The strict CSP forbids inline style and script.
  if (/<style[\s>]/.test(html)) fail(`${rel(file)} contains an inline <style> block, which the CSP blocks`);
  if (/\sstyle="/.test(html)) fail(`${rel(file)} contains a style attribute, which the CSP blocks`);
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) {
    fail(`${rel(file)} contains an inline <script>, which the CSP blocks`);
  }
  // Attributes that are not real (a typo that silently does nothing).
  const attrs = [...html.matchAll(/\s([a-z-]+)(?==")/g)].map((m) => m[1]);
  const known = new Set(['href', 'src', 'rel', 'type', 'class', 'id', 'name', 'content', 'lang',
    'charset', 'property', 'width', 'height', 'viewbox', 'fill', 'stroke', 'opacity', 'd',
    'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'x', 'y', 'rx', 'aria-hidden',
    'aria-label', 'aria-labelledby', 'aria-pressed', 'aria-live', 'placeholder', 'accept',
    'value', 'method', 'role', 'title', 'spellcheck', 'autocomplete', 'rows', 'for',
    'data-placeholder', 'data-buy', 'data-risk', 'data-close-dialog', 'data-pro',
    'data-contact-email', 'target', 'colspan', 'rowspan', 'stroke-miterlimit', 'xmlns']);
  for (const a of new Set(attrs)) {
    if (!known.has(a) && !a.startsWith('data-')) fail(`${rel(file)} has an unrecognised attribute "${a}="`);
  }
}
if (!problems) ok(`${htmlFiles.length} HTML files, all references resolve`);

/* ------------------------------------------------------- module integrity */

console.log('\nJavaScript modules resolve');
const before = problems;
const jsFiles = files.filter((f) => f.endsWith('.js'));
for (const file of jsFiles) {
  const src = readFileSync(file, 'utf8');
  const imports = [...src.matchAll(/from\s+'([^']+)'|import\s*\(\s*'([^']+)'/g)]
    .map((m) => m[1] || m[2]);
  for (const spec of imports) {
    const target = spec.startsWith('/')
      ? join(publicDir, spec)
      : resolve(dirname(file), spec);
    if (!existsSync(target)) fail(`${rel(file)} imports ${spec}, which does not exist`);
  }
}
if (problems === before) ok(`${jsFiles.length} modules, all imports resolve`);

/* ------------------------------------------------------ manifest and meta */

console.log('\nManifest and metadata');
const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) {
  if (!served.has(icon.src)) fail(`manifest references ${icon.src}, which does not exist`);
}
if (!resolves(manifest.start_url)) fail(`manifest start_url ${manifest.start_url} does not resolve`);

const sitemap = readFileSync(join(publicDir, 'sitemap.xml'), 'utf8');
for (const loc of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
  const path = new URL(loc).pathname;
  if (!resolves(path)) fail(`sitemap lists ${path}, which does not exist`);
}

const index = readFileSync(join(publicDir, 'index.html'), 'utf8');
for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card']) {
  if (!index.includes(tag)) fail(`index.html is missing ${tag}`);
}
ok('manifest icons, sitemap entries and social tags all present');

/* ------------------------------------------------------- service worker */

console.log('\nService worker shell');
const sw = readFileSync(join(publicDir, 'sw.js'), 'utf8');
const shell = [...sw.matchAll(/'(\/[^']*)'/g)].map((m) => m[1])
  .filter((p) => p !== '/' && !p.startsWith('/api'));
for (const path of new Set(shell)) {
  if (!resolves(path)) fail(`sw.js caches ${path}, which does not exist`);
}
ok(`${new Set(shell).size} cached paths all exist`);

/* ------------------------------------------------------------- consistency */

console.log('\nClaims match the code');
const detectorSrc = readFileSync(join(publicDir, 'assets/js/engine/detectors.js'), 'utf8');
const detectorCount = (detectorSrc.match(/^\s{4}id: '/gm) || []).length;
for (const [file, html] of htmlFiles.map((f) => [f, readFileSync(f, 'utf8')])) {
  for (const m of html.matchAll(/(\d+)\s+detectors/g)) {
    if (Number(m[1]) !== detectorCount) {
      fail(`${rel(file)} claims ${m[1]} detectors but the engine defines ${detectorCount}`);
    }
  }
}
ok(`the engine defines ${detectorCount} detectors and every page agrees`);

console.log('');
console.log(problems === 0 ? 'Integrity check passed.' : `${problems} problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
