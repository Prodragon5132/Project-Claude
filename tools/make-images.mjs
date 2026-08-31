/**
 * Render the PNG icons and the social card.
 *
 * Uses the Chromium that is already on this machine, so the artwork is defined
 * as HTML/CSS next to the rest of the design system rather than as a binary
 * blob nobody can edit. Output is committed; playwright-core is not a runtime
 * dependency of the site.
 *
 *   node tools/make-images.mjs
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets', 'img');
mkdirSync(outDir, { recursive: true });

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const SHIELD = `
  <svg viewBox="0 0 32 32" fill="none">
    <path d="M16 4.4 6.8 8.2v7c0 5.7 3.8 10.6 9.2 12.3 5.4-1.7 9.2-6.6 9.2-12.3v-7L16 4.4Z"
          fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M11.9 14.1h8.2M11.9 11h8.2M11.9 17.2h4.7"
          stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
  </svg>`;

const iconHtml = (size) => `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:${size}px;height:${size}px;}
  .icon{width:${size}px;height:${size}px;background:#3448d0;border-radius:${Math.round(size * 0.21)}px;
        display:flex;align-items:center;justify-content:center;color:#fff;}
  svg{width:${Math.round(size * 0.68)}px;height:${Math.round(size * 0.68)}px;}
</style>
<div class="icon">${SHIELD}</div>`;

const ogHtml = `<!doctype html><meta charset="utf-8">
<style>
  @font-face{font-family:x;src:local("DejaVu Sans")}
  html,body{margin:0;width:1200px;height:630px;}
  body{
    font-family:-apple-system,"Segoe UI",Roboto,"DejaVu Sans",Arial,sans-serif;
    background:#0a0d16;
    background-image:radial-gradient(900px 460px at 78% -12%, #23306b 0%, transparent 62%);
    color:#e8ebf5;display:flex;flex-direction:column;justify-content:center;
    padding:0 74px;box-sizing:border-box;
  }
  .brand{display:flex;align-items:center;gap:14px;color:#8092ff;font-weight:700;font-size:30px;letter-spacing:-.4px;}
  .brand svg{width:40px;height:40px;}
  h1{font-size:66px;line-height:1.06;letter-spacing:-2.6px;margin:30px 0 0;max-width:16.5ch;font-weight:680;}
  p{font-size:29px;line-height:1.42;color:#b8c0d6;margin:24px 0 0;max-width:30ch;}
  .strip{display:flex;gap:11px;margin-top:40px;flex-wrap:wrap;}
  .chip{border:1px solid #313a58;background:#131829;color:#c8cfe4;
        padding:9px 17px;border-radius:999px;font-size:20px;font-weight:500;}
  .chip b{color:#4ad19b;font-weight:600;}
</style>
<div class="brand">${SHIELD}SafePaste</div>
<h1>Redact it before you paste it into an AI.</h1>
<p>Names, card numbers, health IDs and API keys — stripped in your browser, put back when the answer comes home.</p>
<div class="strip">
  <span class="chip"><b>0</b> bytes uploaded</span>
  <span class="chip">41 detectors</span>
  <span class="chip">Reversible</span>
  <span class="chip">Works offline</span>
</div>`;

const browser = await chromium.launch({ executablePath: EXECUTABLE });

async function shoot(html, width, height, file) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(join(outDir, file), buf);
  await page.close();
  console.log(`${file}  ${width}x${height}  ${(buf.length / 1024).toFixed(1)} KB`);
}

for (const size of [180, 192, 512]) {
  await shoot(iconHtml(size), size, size, `icon-${size}.png`);
}
await shoot(ogHtml, 1200, 630, 'og.png');

await browser.close();
