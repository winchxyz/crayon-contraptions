/* Re-proves every level in js/levels.js: the stored answer (timed strokes
   included) must win, and an empty sheet must not. node test/verify.js */
const CC = require('./load')();
const { Sim, LEVELS, WORLDS } = CC;

function run(level, strokes) {
  const s = new Sim(level, strokes.filter(x => x.at == null));
  s.quiet = true; s.start();
  const timed = strokes.filter(x => x.at != null).sort((a, b) => a.at - b.at);
  const lim = level.live ? (level.live.time || 45) + 1 : 34;
  while (s.t < lim && !s.won && !s.stalled) {
    while (timed.length && timed[0].at <= s.t) s.addStroke(timed.shift());
    s.step();
  }
  return s;
}

let bad = 0;
const t0 = Date.now();
for (const lv of LEVELS) {
  const sol = lv.solution.map(s => s.pts.length > 2 || s.at != null ? s : Object.assign({}, s, { pts: CC.geom.prepare(CC.geom.resample(s.pts, 0.2)) }));
  const a = run(lv, sol), e = run(lv, []);
  const ok = a.won && !e.won;
  if (!ok) bad++;
  const tag = lv.bossLevel ? 'BOSS' : lv.live ? 'live' : '    ';
  console.log(`${String(lv.n).padStart(3)} ${tag} ${lv.name.padEnd(22)} ${ok ? 'ok  ' : 'FAIL'} answer=${a.won ? 'win' : 'no (' + a.failReason + ')'} t=${a.t.toFixed(1)} empty=${e.won ? 'WINS' : 'fails'}`);
}
console.log(`${LEVELS.length - bad}/${LEVELS.length} proven in ${((Date.now() - t0) / 1000).toFixed(0)}s across ${WORLDS.length} worlds`);
process.exitCode = bad ? 1 : 0;
