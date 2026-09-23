/* Loads planck + the sim (and optionally more scripts) into a Node vm context. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

module.exports = function load(extra) {
  const ctx = { console, Math, Date, setTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const run = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  run('vendor/planck-1.4.2.js');
  run('js/sim.js');
  const files = extra === false ? [] : extra === undefined || extra === true ? ['js/levels.js'] : [].concat(extra);
  for (const f of files) run(f);
  return ctx.CC;
};
