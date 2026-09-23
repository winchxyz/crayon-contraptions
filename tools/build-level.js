/* Build one level from a plan slot: run the recipe with successive seeds,
   search for a solution, then set ink, stars, labels and decorations. */
const G = require('./genlib');
const A = require('./archetypes');
const { F, W, round } = G;

function inkTerms(ink, slack) {
  const cap = Math.ceil((ink * slack + 0.8) * 2) / 2;
  const p3 = round(ink * 1.1 + 0.25, 1), p2 = round(Math.min(cap - 0.1, ink * 1.35 + 0.7), 1);
  return { ink: cap, par: [p3, Math.max(p3 + 0.1, p2)] };
}

/* rough anchor points of everything on the sheet, to keep decorations clear */
function anchors(parts, strokes) {
  const pts = [];
  for (const d of parts) {
    if (d.type === 'nodraw') { for (let x = d.x; x <= d.x + d.w + 0.01; x += 0.5) for (let y = d.y; y <= d.y + d.h + 0.01; y += 0.5) pts.push([x, y]); }
    else if (d.type === 'boss') { for (let x = d.x - d.w / 2 - 0.5; x <= d.x + d.w / 2 + 0.5; x += 0.5) for (let y = d.y - d.h - 1.2; y <= d.y; y += 0.5) pts.push([x, y]); }
    else if (d.type === 'dispenser' && d.kind === 'tube') { for (const ox of d.xs || [0]) for (let y = 0; y <= d.y; y += 0.5) pts.push([d.x + ox, y]); }
    else if (d.type === 'block' || d.type === 'lava') { for (let x = d.x; x <= d.x + d.w; x += 0.5) pts.push([x, d.y]); pts.push([d.x + d.w, d.y]); }
    else if (d.type === 'plank' || d.type === 'gate') { pts.push([d.x1, d.y1], [d.x2, d.y2], [(d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2]); }
    else if (d.type === 'dominoes') pts.push([d.x, d.y - 0.8], [d.x + d.n * (d.gap || 0.45), d.y - 0.8]);
    else if (d.type === 'dispenser') pts.push([d.x || d.x1, d.y], [d.x2 || d.x, d.y]);
    else if (d.type === 'conveyor') pts.push([d.x1, d.y], [d.x2, d.y]);
    else if (d.x != null) pts.push([d.x, d.y != null ? d.y : 4]);
    if (d.type === 'bell' && d.hang) for (let y = 0; y < d.y; y += 0.6) pts.push([d.x, y]);
  }
  for (const s of strokes) for (const p of G.geom.resample(s.pts, 0.5)) pts.push(p);
  return pts;
}
function clear(pts, x, y, r) { return pts.every(p => Math.hypot(p[0] - x, p[1] - y) > r); }

function decorate(level, R) {
  const pts = anchors(level.parts, level.solution);
  const out = [];
  if (!level.live && R.chance(0.6)) {
    for (const [x, y] of [[14.6, 1.3], [1.4, 1.3], [13.2, 1.1]]) if (clear(pts, x, y, 1.6)) { out.push({ type: 'deco', kind: 'sun', x, y }); pts.push([x, y]); break; }
  }
  for (let i = 0; i < 6 && out.length < 3; i++) {
    const x = R.f(2, 14), y = R.f(0.9, 2.2);
    if (clear(pts, x, y, 1.7)) { out.push({ type: 'deco', kind: 'cloud', x: round(x, 2), y: round(y, 2), s: round(R.f(0.6, 1), 2) }); pts.push([x, y]); }
  }
  return out;
}

function placeYou(level, you) {
  for (const y of you || []) {
    const st = level.solution[y.stroke];
    if (!st) continue;
    const P = st.pts, mid = P[Math.floor(P.length / 2)];
    let x = mid[0] + (y.dx || 0.25), yy = mid[1] - (y.dy || 0.55);
    x = Math.min(15.5, Math.max(0.5, x)); yy = Math.min(8.2, Math.max(0.5, yy));
    level.parts.push({ type: 'label', x: round(x, 2), y: round(yy, 2), text: y.text, you: true });
  }
}

function build(slot, seeds) {
  const recipe = A[slot.arch];
  if (!recipe) throw new Error('no recipe ' + slot.arch);
  const errs = {};
  for (let k = 0; k < (seeds || 40); k++) {
    const seed = (slot.seed || slot.n * 101) + k * 7919;
    const R = G.rng(seed);
    let made;
    try { made = recipe(R, slot); } catch (e) { if (e.reject) { errs[e.message] = (errs[e.message] || 0) + 1; continue; } throw e; }
    const mirror = slot.mirror != null ? slot.mirror : R.chance(0.5);
    const level = Object.assign({ crayons: slot.crayons }, made.level);
    if (mirror) level.parts = level.parts.map(G.mirrorPart);
    const flip = f => mirror ? (Rr, ch) => f(Rr, ch).map(G.mirrorStroke) : f;
    let res;
    if (made.stages) res = G.staged(level, made.stages.map(st => Object.assign({}, st, { cand: flip(st.cand) })), { seed, minRob: made.minRob });
    else res = G.search(level, flip(made.cand), { seed, tries: made.tries || slot.tries, minRob: made.minRob });
    if (res.err) { errs[res.err] = (errs[res.err] || 0) + 1; continue; }
    level.solution = res.strokes;
    const slack = made.slack || slot.slack || (slot.boss ? 1.25 : 2.0 - (slot.diff || 0) * 0.55);
    if (level.live) {
      // the live ink meter must pay for the known answer, with a little room
      const need = G.meterNeed(res.strokes, level.live.regen || 1);
      level.live.ink = Math.max(level.live.ink || 0, Math.ceil((need * 1.2 + 0.6) * 2) / 2);
      level.ink = level.live.ink;
      if (!(level.goal && level.goal.need)) level.par = [round(res.ink * 1.15 + 0.5, 1), round(res.ink * 1.5 + 1, 1)];
    } else Object.assign(level, inkTerms(res.ink, slack));
    placeYou(level, made.you);
    level.parts.push(...decorate(level, R));
    return { level, seed, rob: res.rob, ink: round(res.ink, 2), errs };
  }
  return { err: errs };
}

module.exports = { build, inkTerms };
