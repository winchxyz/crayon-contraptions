/* Crayon Contraptions — tiny static dev server (node dev-server.js [port]).
   index.html is an artifact-style fragment (no doctype/head/body); this wraps
   it the way the artifact host does. POST /__shot saves a canvas capture
   (JSON {name, data: dataURL}) to ./shots. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = Number(process.argv[2]) || 8840;
const shotDir = path.join(root, 'shots');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const SKELETON_HEAD = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  + '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf8}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/__shot')) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const safe = String(name || 'shot').replace(/[^a-z0-9_-]/gi, '_');
        fs.mkdirSync(shotDir, { recursive: true });
        const file = path.join(shotDir, safe + '.jpg');
        fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, file }));
      } catch (e) { res.writeHead(400); res.end(String(e)); }
    });
    return;
  }
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.normalize(path.join(root, url));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    let body = buf;
    if (path.extname(file) === '.html' && !/^\s*<!doctype/i.test(buf.toString('utf8', 0, 64))) body = Buffer.from(SKELETON_HEAD + buf.toString('utf8') + '</body></html>');
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  });
}).listen(port, '127.0.0.1', () => console.log(`Crayon Contraptions -> http://localhost:${port}`));
