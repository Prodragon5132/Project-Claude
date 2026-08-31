/**
 * Local server that mimics the production routing closely enough to test
 * against: static files from public/ with cleanUrls, the same security headers
 * from vercel.json, and /api/* dispatched to the serverless handlers.
 *
 *   node tools/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const port = Number(process.argv[2] || 4321);

const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Apply every vercel.json header rule whose source matches this path. */
function applyHeaders(res, pathname) {
  for (const rule of vercel.headers || []) {
    const pattern = `^${rule.source.replace(/\(\.\*\)/g, '.*').replace(/\//g, '\\/')}$`;
    let matches;
    try { matches = new RegExp(pattern).test(pathname); } catch { matches = false; }
    if (matches) for (const h of rule.headers) res.setHeader(h.key, h.value);
  }
}

async function tryFiles(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/')
    ? [join(clean, 'index.html')]
    : [clean, `${clean}.html`, join(clean, 'index.html')];
  for (const c of candidates) {
    const file = join(publicDir, c);
    if (!file.startsWith(publicDir)) continue;
    try {
      const s = await stat(file);
      if (s.isFile()) return file;
    } catch { /* next candidate */ }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  applyHeaders(res, url.pathname);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9_-]/gi, '');
    try {
      const mod = await import(pathToFileURL(join(root, 'api', `${name}.js`)).href);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      req.body = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
      res.status = (code) => { res.statusCode = code; return res; };
      await mod.default(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(err && err.message) }));
    }
    return;
  }

  const file = await tryFiles(url.pathname);
  if (!file) {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(await readFile(file));
});

server.listen(port, () => console.log(`http://localhost:${port}`));
