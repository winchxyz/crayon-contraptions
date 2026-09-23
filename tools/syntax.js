const fs = require('fs');
for (const f of ['js/app.js', 'js/draw.js', 'js/audio.js', 'js/crayon.js', 'js/sim.js', 'js/levels.js']) {
  try { new Function(fs.readFileSync(f, 'utf8')); console.log('ok ', f); } catch (e) { console.log('ERR', f, e.message); }
}
