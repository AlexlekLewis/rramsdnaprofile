// Simple SPA-aware static file server for Playwright E2E tests.
// Serves the Vite build output from /dist, falling back to index.html for SPA routes.
// Usage: node serve-spa.cjs (started automatically by Playwright via webServer config)
const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'dist');
const mime = {
  '.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
};
// Handler is wrapped so per-request errors (client disconnect, file race) don't
// crash the entire process — that flake left the test runner with ECONNREFUSED
// for every subsequent spec under sustained Playwright load.
const server = http.createServer((req, res) => {
  try {
    let p = path.join(dir, req.url.split('?')[0]);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
    const stream = fs.createReadStream(p);
    stream.on('error', () => { try { res.end(); } catch {} });
    res.on('error', () => { try { stream.destroy(); } catch {} });
    stream.pipe(res);
  } catch (e) {
    try { res.writeHead(500); res.end('server error'); } catch {}
  }
});
server.on('clientError', (_e, sock) => { try { sock.destroy(); } catch {} });
process.on('uncaughtException', (e) => console.error('serve-spa uncaught:', e.message));
server.listen(4173, () => console.log('SPA server ready on http://localhost:4173'));
