/* Crayon Contraptions — level generator core: seeded randomness, headless
   runs, drawing validity, solution search, robustness, mirroring. */
const load = require('../test/load');
const CC = load(['tools/hand.js']);
const { Sim, geom, BALLS } = CC;
const F = 8.7, W = 16;

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  return {
    r, f: (a, b) => a + (b - a) * r(), i: (a, b) => Math.floor(a + (b - a + 1) * r()),
    pick: arr => arr[Math.floor(r() * arr.length)], chance: p => r() < p
  };
}
function letters() { let i = 0; const f = () => String.fromCharCode(65 + i++); f.peek = () => String.fromCharCode(65 + i); return f; }
const round = (v, k = 3) => +v.toFixed(k);

/* A stroke the way a hand would leave it: dense then cleaned. */
function handify(st) {
  const out = Object.assign({}, st);
  if (st.pts.length > 1) out.pts = geom.prepare(geom.resample(st.pts, 0.12));
  out.pts = out.pts.map(p => [round(p[0]), round(p[1])]);
  if (out.at != null) out.at = round(out.at, 2);
  return out;
}
const inkOf = strokes => strokes.reduce((a, s) => a + geom.inkOf(s), 0);

function run(level, strokes, until) {
  const s = new Sim(level, strokes.filter(x => x.at == null));
  s.quiet = true;
  s.start();
  const timed = strokes.filter(x => x.at != null).sort((a, b) => a.at - b.at);
  const lim = level.live ? (level.live.time || 45) + 1 : 34;
  while (s.t < lim && !s.won && !s.stalled && (until == null || s.t < until)) {
    while (timed.length && timed[0].at <= s.t) s.addStroke(timed.shift());
    s.step();
  }
  return s;
}

/* Every point of every stroke must be drawable. Timed strokes are only
   held to the paper edges and the red zones (parts move under them). */
function valid(level, strokes) {
  const s = new Sim(level, []);
  for (const st of strokes) {
    const pts = geom.isDot(st.pts) ? [st.pts[0]] : geom.resample(st.pts, 0.07);
    for (const q of pts) {
      const why = s.blocked(q, st.kind);
      if (why && (st.at == null || /paper|red zone/.test(why))) return false;
    }
    if (st.at == null) s.addStroke(st);
  }
  return true;
}

function nudge(strokes, dx, dy, ang, dt) {
  return strokes.map(st => {
    const n = st.pts.length, c = st.pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]);
    const pts = st.pts.map(([x, y]) => {
      const X = x - c[0], Y = y - c[1];
      return [c[0] + X * Math.cos(ang) - Y * Math.sin(ang) + dx, c[1] + X * Math.sin(ang) + Y * Math.cos(ang) + dy];
    });
    const o = Object.assign({}, st, { pts });
    if (st.at != null) o.at = Math.max(0, st.at + dt);
    return o;
  });
}
const NUDGES = [[0.14, 0, 0, 0.15], [-0.14, 0, 0, -0.15], [0, 0.11, 0, 0.1], [0, -0.11, 0, -0.1], [0, 0, 0.035, 0], [0, 0, -0.035, 0]];
function robustness(level, strokes) {
  let ok = 0;
  for (const [dx, dy, a, dt] of NUDGES) if (run(level, nudge(strokes, dx, dy, a, dt)).won) ok++;
  return ok;
}

/* One-shot search: cand(R) proposes a whole drawing. */
function search(level, cand, opt) {
  const R = rng(opt.seed * 7 + 1);
  if (run(level, []).won) return { err: 'empty sheet wins' };
  let best = null, wins = 0, tried = 0;
  for (let i = 0; i < (opt.tries || 70); i++) {
    const strokes = cand(R).map(handify);
    if (!valid(level, strokes)) continue;
    tried++;
    if (!run(level, strokes).won) continue;
    wins++;
    const rob = robustness(level, strokes), ink = inkOf(strokes);
    const score = rob - ink * 0.03;
    if (!best || score > best.score) best = { strokes, rob, ink, score };
    if (rob >= 6 || (wins >= 5 && best.rob >= 4)) break;
  }
  if (!best) return { err: `no solution (${tried} valid tries)` };
  if (best.rob < (opt.minRob == null ? 3 : opt.minRob)) return { err: 'fragile ' + best.rob };
  return best;
}

/* Staged search: each stage adds strokes until its own check passes. */
function staged(level, stages, opt) {
  const R = rng(opt.seed * 13 + 5);
  if (run(level, []).won) return { err: 'empty sheet wins' };
  let chosen = [];
  for (let k = 0; k < stages.length; k++) {
    const st = stages[k];
    let found = null;
    // maybe the lines already drawn handle this stage too
    if (st.skipFirst !== false && k > 0 && st.ok(run(level, chosen, st.until))) found = [];
    for (let i = 0; !found && i < (st.tries || 50); i++) {
      const add = st.cand(R, chosen).map(handify);
      const all = chosen.concat(add);
      if (!valid(level, all)) continue;
      const s = run(level, all, st.until);
      if (st.ok(s)) { found = add; break; }
    }
    if (!found) { if (st.optional) continue; return { err: `stage ${k + 1} unsolved` }; }
    chosen = chosen.concat(found);
  }
  if (!run(level, chosen).won) return { err: 'stages pass but the level does not' };
  const rob = robustness(level, chosen);
  if (rob < (opt.minRob == null ? 2 : opt.minRob)) return { err: 'fragile ' + rob };
  return { strokes: chosen, rob, ink: inkOf(chosen) };
}

/* ---------- mirroring (build left-to-right, flip for variety) ---------- */
function mirrorPart(d) {
  const m = JSON.parse(JSON.stringify(d)), X = x => round(W - x);
  switch (d.type) {
    case 'block': case 'nodraw': case 'lava': m.x = round(W - d.x - d.w); break;
    case 'plank': case 'gate': m.x1 = X(d.x1); m.x2 = X(d.x2); break;
    case 'conveyor': m.x1 = X(d.x2); m.x2 = X(d.x1); m.speed = -d.speed; break;
    case 'dominoes': m.x = round(W - (d.x + (d.n - 1) * (d.gap || 0.45))); break;
    case 'arrow': m.pts = d.pts.map(([x, y]) => [X(x), y]); break;
    case 'wire': m.from = [X(d.from[0]), d.from[1]]; m.to = [X(d.to[0]), d.to[1]]; break;
    default: if (d.x != null) m.x = X(d.x);
  }
  if (d.type === 'pusher' || d.type === 'car') m.dir = -(d.dir || 1);
  if (d.type === 'seesaw') { m.angle = -(d.angle || 0); if (Array.isArray(d.limit)) m.limit = [-d.limit[1], -d.limit[0]]; if (d.lips) m.lips = d.lips.map(s => -s); }
  if (d.type === 'button' || d.type === 'trampoline') m.angle = -(d.angle || 0);
  if (d.type === 'cup' && d.back) m.back = d.back === 'left' ? 'right' : 'left';
  if (d.type === 'cannon') m.angle = -180 - (d.angle != null ? d.angle : -45);
  if (d.type === 'fan') m.dir = { right: 'left', left: 'right' }[d.dir] || d.dir;
  if (d.v) m.v = [-d.v[0], d.v[1]];
  if (d.xs) m.xs = d.xs.map(v => -v);
  if (d.type === 'dispenser' && d.kind === 'hen') { m.x1 = X(d.x2); m.x2 = X(d.x1); }
  if (d.tie) m.tie = [X(d.tie[0]), d.tie[1]];
  if (d.move && d.move.dx) m.move = Object.assign({}, d.move, { dx: -d.move.dx });
  if (d.type === 'cat' || d.type === 'lamp' || d.type === 'boss') m.flip = !d.flip;
  if (d.lx != null) m.lx = X(d.lx);
  return m;
}
const mirrorStroke = st => Object.assign({}, st, { pts: st.pts.map(([x, y]) => [round(W - x), y]) });

/* ---------- common pieces ---------- */
const NOUN = { rubber: 'ball', tennis: 'tennis ball', marble: 'marble', bowling: 'bowling ball', beach: 'beach ball', meatball: 'meatball', steel: 'steel ball', egg: 'egg' };
const radius = st => BALLS[st].r;

/* Shelf with a boxing glove and a ball, on the left; the ball leaves the
   shelf end at (x0, y) moving right. */
function pusherStart(L, o) {
  const st = o.style || 'rubber', r = radius(st), A = L(), B = L();
  return {
    parts: [
      { type: 'plank', x1: 0.2, y1: o.y, x2: o.x0, y2: o.y, t: 0.22 },
      { type: 'pusher', x: 0.75, y: round(o.y - 0.18), dir: 1, reach: 0.7, speed: o.speed || 3, when: 'start', label: A },
      { type: 'ball', style: st, x: 1.3, y: round(o.y - r), label: B }
    ],
    exit: [o.x0, o.y], text: `The boxing glove (${A}) punches the ${NOUN[st]} (${B})`, style: st
  };
}
/* Slope from the left wall down to (x0, y) with a ball pegged at the top. */
function heldStart(L, o) {
  const st = o.style || 'rubber', r = radius(st), y0 = o.y - (o.drop || 0.9), B = L();
  const a = Math.atan2(o.y - y0, o.x0 - 0.1), bx = 0.75, ly = y0 + (bx - 0.1) * Math.tan(a);
  return {
    parts: [
      { type: 'plank', x1: 0.1, y1: round(y0), x2: o.x0, y2: o.y, t: 0.2 },
      { type: 'ball', style: st, x: round(bx + Math.sin(a) * r), y: round(ly - Math.cos(a) * r), hold: 'start', label: B }
    ],
    exit: [o.x0, o.y], text: `The peg lets go of the ${NOUN[st]} (${B})`, style: st
  };
}
/* A ball on a trapdoor that opens at GO. */
function trapStart(L, o) {
  const st = o.style || 'bowling', r = radius(st), A = L(), B = L();
  return {
    parts: [
      { type: 'plank', x1: round(o.x - 1.9), y1: o.y, x2: round(o.x - 0.55), y2: o.y, t: 0.2 },
      { type: 'gate', x1: round(o.x + 0.55), y1: o.y, x2: round(o.x - 0.55), y2: o.y, t: 0.16, when: o.when || 'start', label: A },
      { type: 'ball', style: st, x: o.x, y: round(o.y - r), label: B }
    ],
    drop: [o.x, o.y], text: `The trapdoor (${A}) drops the ${NOUN[st]} (${B})`, style: st
  };
}
/* Goal container. With a pedestal of books or a box under it when raised. */
function basket(L, o) {
  const w = o.w || 1.4, h = o.h || 0.8, parts = [], D = L();
  if (o.y < F - 0.05) parts.push({ type: 'block', x: round(o.x - w / 2 - 0.35), y: o.y, w: round(w + 0.7), h: round(F - o.y), style: o.stand || 'books', text: o.text });
  parts.push({ type: 'cup', x: o.x, y: o.y, w, h, style: o.style || 'basket', accept: o.accept, back: o.back, backH: o.backH, label: D });
  const noun = { basket: 'basket', bucket: 'bucket', bowl: 'bowl', nest: 'nest' }[o.style || 'basket'];
  return { parts, rim: [o.x - w / 2, o.y - h], w, h, text: `the ${noun} (${D})`, letter: D };
}

/* Can the live ink meter pay for these timed strokes? Returns the smallest
   meter size that works with this regen rate. */
function meterNeed(strokes, regen) {
  const timed = strokes.filter(s => s.at != null).sort((a, b) => a.at - b.at);
  let lo = 0.5, hi = 40;
  const ok = cap => {
    let m = cap, t = 0;
    for (const s of timed) { m = Math.min(cap, m + regen * (s.at - t)); t = s.at; m -= geom.inkOf(s); if (m < -1e-6) return false; }
    return true;
  };
  if (!ok(hi)) return hi;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  return hi;
}

module.exports = { CC, Sim, geom, BALLS, F, W, rng, meterNeed, letters, round, handify, inkOf, run, valid, search, staged, robustness, nudge, mirrorPart, mirrorStroke, NOUN, radius, pusherStart, heldStart, trapStart, basket };
