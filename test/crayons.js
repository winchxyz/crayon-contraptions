/* Behaviour checks for the new crayons and parts. */
const CC = require('./load')(false);
const { Sim, geom } = CC;
const F = 8.7;
const pos = b => { const p = b.getPosition(); return `(${p.x.toFixed(2)},${p.y.toFixed(2)})`; };
function run(level, strokes, T, every, watch) {
  const s = new Sim(level, strokes || []);
  s.quiet = true; s.start();
  const out = [];
  while (s.t < T && !s.won && !s.stalled) { s.step(); if (watch && Math.round(s.t * 120) % Math.round(every * 120) === 0) out.push(watch(s)); }
  return { s, out };
}
const ball = s => s.parts.find(p => p.type === 'ball');

// bouncy: drop a rubber ball on a flat green line
let r = run({ parts: [{ type: 'ball', style: 'rubber', x: 3, y: 2 }] }, [{ kind: 'bouncy', pts: [[2, 6], [4, 6]] }], 3, 0.25, s => pos(ball(s).bodies[0]));
console.log('bouncy:', r.out.join(' '));

// floaty rising alone and lifting a tennis ball resting on it
r = run({ parts: [{ type: 'ball', style: 'tennis', x: 5, y: 6.6 }] }, [{ kind: 'floaty', pts: [[4.4, 7], [5.6, 7], [4.4, 7.2], [5.6, 7.2]] }], 3, 0.5,
  s => 'blob' + pos(s.strokes[0].body) + ' ball' + pos(ball(s).bodies[0]));
console.log('floaty lift tennis:', r.out.join(' '));
r = run({ parts: [{ type: 'ball', style: 'bowling', x: 5, y: 6.5 }] }, [{ kind: 'floaty', pts: [[4.4, 7], [5.6, 7], [4.4, 7.2], [5.6, 7.2]] }], 2, 0.5,
  s => 'ball' + pos(ball(s).bodies[0]));
console.log('floaty vs bowling:', r.out.join(' '));

// hinge: horizontal arm pinned at left swings down and whacks a ball on a shelf
r = run({ parts: [{ type: 'plank', x1: 4, y1: 5, x2: 7, y2: 5 }, { type: 'ball', style: 'rubber', x: 6.3, y: 4.76 }] },
  [{ kind: 'hinge', pts: [[4.6, 2.5], [6.9, 2.5]] }], 3, 0.25, s => 'arm' + s.strokes[0].body.getAngle().toFixed(2) + ' ball' + pos(ball(s).bodies[0]));
console.log('hinge hammer:', r.out.join(' '));

// zoom: ball on the floor, red line rising to the right
r = run({ parts: [{ type: 'ball', style: 'rubber', x: 2, y: F - 0.3 }] }, [{ kind: 'zoom', pts: [[1.5, 8.62], [4, 8.3], [7, 6.5]] }], 3, 0.25, s => pos(ball(s).bodies[0]));
console.log('zoom uphill:', r.out.join(' '));

// magnet: steel ball rolls off a shelf; magnet to the right
r = run({ parts: [{ type: 'plank', x1: 1, y1: 3, x2: 4, y2: 3 }, { type: 'ball', style: 'steel', x: 2, y: 2.8, v: [2.5, 0] }] }, [{ kind: 'magnet', pts: [[7, 4], [7, 6]] }], 3, 0.25, s => pos(ball(s).bodies[0]));
console.log('magnet pull:', r.out.join(' '));

// dispenser + lava + counting cup
r = run({ goal: { need: 2, of: 3 }, live: { lava: true, time: 30 }, parts: [
  { type: 'dispenser', x: 3, y: 1, every: 1.5, count: 3, xs: [0, 0, 4] },
  { type: 'cup', x: 6, y: 7, w: 1.4, h: 0.8 },
  { type: 'block', x: 5.2, y: 7, w: 1.6, h: F - 7 }
] }, [{ kind: 'solid', pts: [[2.4, 3], [5.6, 6.2]] }], 20, 1, s => `d${s.delivered} l${s.lost}`);
console.log('dispenser/count:', r.out.join(' '), 'won', r.s.won, 'fail', r.s.failReason);

// boss takes hits
r = run({ parts: [{ type: 'dispenser', x: 3, y: 1, every: 1, count: 4 }, { type: 'boss', x: 8, y: F, w: 1.6, h: 1.8, hp: 3 }] },
  [{ kind: 'solid', pts: [[2.4, 3], [6.8, 6.5]] }], 15, 1, s => 'hp' + s.parts[1].st.hp);
console.log('boss:', r.out.join(' '), 'won', r.s.won);

// egg splat from a high drop vs gentle ramp
r = run({ goal: { need: 1, of: 1 }, parts: [{ type: 'ball', style: 'egg', x: 5, y: 1 }] }, [], 3, 0.5, s => `l${s.lost}`);
console.log('egg drop:', r.out.join(' '));

// erase split
console.log('eraseSplit:', JSON.stringify(geom.eraseSplit([[0, 0], [4, 0]], [2, 0], 0.3).map(p => p.map(q => q.map(v => +v.toFixed(2))))));
