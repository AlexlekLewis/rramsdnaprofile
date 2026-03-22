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
http.createServer((req, res) => {
  let p = path.join(dir, req.url.split('?')[0]);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dir, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(4173, () => console.log('SPA server ready on http://localhost:4173'));
