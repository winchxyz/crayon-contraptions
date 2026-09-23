/* Try one recipe: node tools/try.js <arch> [diff] [n] [extra JSON]
   Prints the result of building it (seed, robustness, ink, errors). */
const { build } = require('./build-level');
const [arch, diff = '0.3', n = '1', extra = '{}'] = process.argv.slice(2);
const slot = Object.assign({ arch, diff: +diff, n: +n, crayons: ['solid'] }, JSON.parse(extra));
const t0 = Date.now();
const r = build(slot, 12);
if (r.err) console.log('FAILED', JSON.stringify(r.err));
else console.log(`ok seed=${r.seed} rob=${r.rob}/6 ink=${r.ink} cap=${r.level.ink} par=${r.level.par} parts=${r.level.parts.length} errs=${JSON.stringify(r.errs)}`);
console.log(((Date.now() - t0) / 1000).toFixed(1) + 's');
if (process.argv.includes('--json') && !r.err) console.log(JSON.stringify(r.level));
