/* Crayon Contraptions — build: inline js/*.js into one page.
   node build.js  ->  dist/crayon-contraptions.html  (artifact fragment)
                  ->  docs/index.html                 (GitHub Pages, full document)
   planck stays on jsdelivr; everything else ships inline. */
const fs = require('fs');
const path = require('path');
const root = __dirname;

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="(js\/[\w-]+\.js)"><\/script>/g, (m, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  if (/<\/script/i.test(code)) throw new Error(src + ' contains a closing script tag');
  return `<script>/* ${src} */\n${code}</script>`;
});
if (/src="js\//.test(html)) throw new Error('a local script was not inlined');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'crayon-contraptions.html');
fs.writeFileSync(out, html);
console.log(`${out}  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);

// GitHub Pages wants a whole document: same page plus the head the artifact
// host would otherwise supply.
const title = (html.match(/<title>[^<]*<\/title>/) || [''])[0];
const desc = 'A Rube Goldberg puzzle game in crayon: 100 levels, seven crayons with their own physics, live levels and a boss every tenth level.';
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M4 28 L8 17 L24 1 L31 8 L15 24 Z' fill='%23E23B34' stroke='%238E1F1A' stroke-width='1.5'/%3E%3Cpath d='M4 28 L8 17 L15 24 Z' fill='%23F4DDB0' stroke='%238E1F1A' stroke-width='1.5'/%3E%3C/svg%3E";
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${title}
<meta name="description" content="${desc}">
<meta property="og:title" content="Crayon Contraptions">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="https://winchxyz.github.io/crayon-contraptions/preview.jpg">
<meta name="theme-color" content="#C49A6C">
<link rel="icon" href="${icon}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
`;
if (!html.includes('<div class="app"')) throw new Error('page body marker missing');
const page = head + html.replace(title, '').replace('<div class="app"', '</head>\n<body>\n<div class="app"') + '\n</body>\n</html>\n';
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
const pageOut = path.join(root, 'docs', 'index.html');
fs.writeFileSync(pageOut, page);
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');
console.log(`${pageOut}  ${(Buffer.byteLength(page) / 1024).toFixed(1)} KB`);
