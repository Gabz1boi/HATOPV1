import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let target = path.join(root, pathname.replace(/^\/+/, ''));
    if (!target.startsWith(root)) throw new Error('Invalid path');
    try { if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html'); }
    catch {
      const publicTarget = path.join(root, 'public', pathname.replace(/^\/+/, ''));
      try { target = (await stat(publicTarget)).isFile() ? publicTarget : target; } catch {}
      try { await stat(target); } catch { if (!path.extname(target)) target = path.join(root, 'index.html'); }
    }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, '0.0.0.0', () => console.log(`HATOP running at http://localhost:${port}`));
