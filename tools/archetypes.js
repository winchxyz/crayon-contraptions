/* Crayon Contraptions — level recipes. Each recipe lays out a machine with
   seeded variation and proposes drawings (cand) or drawing stages for the
   search in genlib. Throwing 'reject' asks the generator for another seed.
   Layouts are built left-to-right; the generator may mirror them. */
const G = require('./genlib');
const { F, W, letters, round, pusherStart, heldStart, trapStart, basket, NOUN, radius, run } = G;
const A = {};
const reject = why => { const e = new Error(why); e.reject = true; throw e; };

/* zig-zag scribble blob: rows of back-and-forth strokes */
function blob(cx, top, w, rows, gap) {
  const pts = [];
  for (let i = 0; i < rows; i++) {
    const y = top + i * (gap || 0.2);
    if (i % 2) pts.push([cx + w / 2, y], [cx - w / 2, y + 0.05]);
    else pts.push([cx - w / 2, y], [cx + w / 2, y + 0.05]);
  }
  return pts;
}
A.blob = blob;
const seg = (a, b) => [a, b];
function withMid(R, p0, p1, lift) {
  if (!R.chance(0.55)) return [p0, p1];
  const u = R.f(0.3, 0.7);
  return [p0, [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - R.f(-0.2, lift || 1)], p1];
}

/* ===================== World 1: blue crayon ===================== */

/* Roll off a shelf, down your ramp, into a basket. */
A.ramp = (R, s) => {
  const L = letters(), d = s.diff;
  const style = R.pick(['rubber', 'tennis', 'marble']);
  const y = R.f(1.4, 3.0), x0 = R.f(2.4, 4.0);
  const st = R.chance(0.5) ? pusherStart(L, { y, x0, style }) : heldStart(L, { y, x0, style, drop: R.f(0.6, 1.1) });
  const C = L();
  const gx = R.f(10.6, 14.4), gy = R.chance(0.3) ? F : R.f(5.0, 7.6);
  const goal = basket(L, { x: gx, y: gy, w: R.f(1.25, 1.6), h: 0.75, back: 'right', backH: 1.6 });
  const parts = [...st.parts, ...goal.parts];
  if (d > 0.35) {
    const wy = R.f(Math.max(4.2, y + 1.2), 6.4);
    parts.push({ type: 'block', x: R.f(6.2, 8.8), y: wy, w: R.f(0.5, 0.9), h: F - wy, style: R.pick(['box', 'books', 'wood']), text: 'BLOCKS' });
  }
  if (d > 0.6) parts.push({ type: 'nodraw', x: R.f(6.5, 8.5), y: R.f(y + 1.0, y + 2.2), w: R.f(1.0, 1.8), h: R.f(0.8, 1.6) });
  return {
    level: { verb: 'Swish!', story: `${st.text}, which rolls down your ramp (${C}) into ${goal.text}.`, tip: 'Start the ramp under the shelf and end it above the basket.', parts },
    cand: R2 => [{ kind: 'solid', pts: withMid(R2, [x0 + R2.f(0.05, 1.4), y + R2.f(0.35, 1.9)], [goal.rim[0] + R2.f(-0.8, 0.35), goal.rim[1] - R2.f(0.05, 0.7)], 1.2) }],
    you: [{ text: C, stroke: 0 }]
  };
};

/* A trapdoor drops a ball straight down; catch it and roll it far away. */
A.drop = (R, s) => {
  const L = letters(), d = s.diff;
  const style = R.pick(['bowling', 'rubber', 'marble']);
  const tx = R.f(2.3, 5.0), ty = R.f(1.2, 2.4);
  const st = trapStart(L, { x: tx, y: ty, style });
  const C = L();
  const gx = R.f(10.8, 14.5), gy = R.chance(0.45) ? F : R.f(6.0, 7.8);
  const goal = basket(L, { x: gx, y: gy, w: R.f(1.3, 1.6), h: 0.8, back: 'right', backH: 1.5, style: R.pick(['basket', 'bucket']) });
  const parts = [...st.parts, ...goal.parts];
  if (d > 0.3) parts.push({ type: 'nodraw', x: round(tx - 1.2), y: round(F - R.f(1.2, 2.2)), w: 2.4, h: 3 });
  if (d > 0.55) { const wy = R.f(5.8, 7.2); parts.push({ type: 'block', x: R.f(7.6, 9.2), y: wy, w: 0.6, h: F - wy, style: 'wood' }); }
  return {
    level: { verb: 'Swish!', story: `${st.text}. Catch it with your line (${C}) and send it all the way to ${goal.text}.`, tip: 'The ball falls straight down. Put a slope under it.', parts },
    cand: R2 => [{ kind: 'solid', pts: withMid(R2, [tx - R2.f(0.1, 1.0), ty + R2.f(1.2, 4.2)], [goal.rim[0] + R2.f(-0.8, 0.3), goal.rim[1] - R2.f(0.05, 0.8)], 1.0) }],
    you: [{ text: C, stroke: 0 }]
  };
};

/* Ramp into a domino run that rings a bell. */
A.dominoRamp = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'tennis', 'marble']);
  const y = R.f(1.4, 2.5), x0 = R.f(2.8, 4.0);
  const st = pusherStart(L, { y, x0, style });
  const C = L(), D = L(), E = L();
  const n = R.i(5, 8), gap = 0.45, platY = R.f(4.8, 6.4), px1 = R.f(6.2, 7.8);
  const dx = px1 + 0.55, lastX = dx + (n - 1) * gap;
  if (lastX + 1.1 > 15.7) reject('dominoes run off the sheet');
  const parts = [...st.parts,
    { type: 'plank', x1: round(px1), y1: round(platY), x2: round(Math.min(15.7, lastX + 1.2)), y2: round(platY), t: 0.2 },
    { type: 'dominoes', x: round(dx), y: round(platY), n, gap, h: 0.8, label: D },
    { type: 'bell', x: round(lastX + 0.66), y: round(platY - 1.2), size: 0.8, hang: true, label: E }];
  if (s.diff > 0.5) parts.push({ type: 'nodraw', x: round(px1 - 1.6), y: round(platY + 0.3), w: 2.4, h: round(F - platY - 0.3) });
  return {
    level: { verb: 'Ding!', story: `${st.text} down your ramp (${C}) into the dominoes (${D}). The last one rings the bell (${E}).`, tip: 'Hit the first domino near its top.', parts },
    cand: R2 => [{ kind: 'solid', pts: withMid(R2, [x0 + R2.f(0.05, 1.2), y + R2.f(0.35, 1.5)], [px1 + R2.f(-0.5, 0.35), platY - R2.f(0.2, 0.65)], 0.6) }],
    you: [{ text: C, stroke: 0 }]
  };
};

/* A wind-up car needs a bridge. */
A.bridge = (R, s) => {
  const L = letters(), d = s.diff, kind = s.kind || 'solid';
  const topY = R.f(5.6, 7.0), pitL = R.f(4.2, 6.2), pitW = R.f(2.0, 2.6 + d * 1.2), pitR = pitL + pitW;
  const rTop = topY + R.f(0, 0.3);
  const A1 = L(), B = L(), Cc = L();
  const parts = [
    { type: 'block', x: 0, y: round(topY), w: round(pitL), h: round(F - topY), style: 'box', text: 'TOYS' },
    { type: 'block', x: round(pitR), y: round(rTop), w: round(W - pitR), h: round(F - rTop), style: 'box', text: R.pick(['FRAGILE', 'BOOKS', 'SNACKS']) },
    { type: 'nodraw', x: round(pitL + 0.1), y: round(topY + 0.7), w: round(pitW - 0.2), h: round(F - topY - 0.7) },
    { type: 'car', x: 1.6, y: round(topY), dir: 1, speed: 2.2, when: 'start', label: A1 }
  ];
  let goalText;
  if (R.chance(0.5)) { parts.push({ type: 'flag', x: 14.9, y: round(rTop), label: Cc }); goalText = `reaches the finish flag (${Cc})`; }
  else {
    const n = 5, x = round(Math.max(pitR + 1.2, 11)), lastX = x + (n - 1) * 0.42;
    parts.push({ type: 'dominoes', x, y: round(rTop), n, gap: 0.42, h: 0.8, label: Cc });
    const E = L();
    parts.push({ type: 'bell', x: round(lastX + 0.66), y: round(rTop - 1.2), size: 0.8, hang: true, label: E });
    goalText = `knocks the dominoes (${Cc}) into the bell (${E})`;
  }
  const hinge = kind === 'hinge';
  return {
    level: {
      verb: hinge ? 'Clunk!' : 'Vroom!', parts,
      story: hinge ? `Your purple drawbridge (${B}) falls across the gap so the wind-up car (${A1}) ${goalText}.` : `The wind-up car (${A1}) crosses your bridge (${B}) and ${goalText}.`,
      tip: hinge ? 'A purple line swings from where you start it. Stand it up at the edge and let it fall over the gap.' : 'Draw a bridge from box to box.'
    },
    cand: hinge
      ? R2 => { const px = pitL - R2.f(0.12, 0.3), py = topY - R2.f(0.14, 0.3), len = pitW + R2.f(0.3, 0.9), lean = R2.f(0.05, 0.35); return [{ kind: 'hinge', pts: [[px, py], [px + Math.sin(lean) * len, py - Math.cos(lean) * len]] }]; }
      : R2 => [{ kind, pts: [[pitL - R2.f(0, 0.3), topY - R2.f(0.01, 0.1)], [pitR + R2.f(0, 0.3), rTop - R2.f(0.01, 0.1)]] }],
    you: [{ text: B, stroke: 0 }]
  };
};

/* A cannon lobs a ball; catch it and deliver it. */
A.catchFlyer = (R, s) => {
  const L = letters(), kind = s.kind || 'solid';
  const style = R.pick(['meatball', 'rubber', 'tennis']);
  const cx = R.f(1.2, 2.6), ang = -R.f(38, 70), sp = R.f(7.5, 10.5);
  const A1 = L(), B = L(), C = L();
  const parts = [{ type: 'cannon', x: round(cx), y: F, angle: round(ang, 1), speed: round(sp, 2), when: 'start', ball: { style }, label: A1 }];
  const probe = run({ parts }, []);
  const ball = probe.parts.find(p => p.type === 'ball');
  if (!ball) reject('no shot');
  // flight path
  const path = [];
  const s2 = new G.Sim({ parts }, []); s2.quiet = true; s2.start();
  while (s2.t < 4) { s2.step(); const b = s2.parts.find(p => p.type === 'ball'); if (b && !b.st.gone) { const q = b.bodies[0].getPosition(); path.push([q.x, q.y]); if (q.y > F - 0.4) break; } }
  const apex = path.reduce((a, p) => p[1] < a[1] ? p : a, [0, 99]);
  if (apex[1] > 5.5 || apex[1] < 0.8) reject('flat or ceiling shot');
  const land = path[path.length - 1];
  if (land[0] > 15) reject('shot too long');
  const D = L();
  const gx = R.f(Math.max(land[0] + 1.5, 9), 14.5);
  if (gx > 14.6) reject('no room');
  const goal = basket(L, { x: gx, y: R.f(5.6, 7.6), w: 1.3, h: 0.9, back: 'right', backH: 1.8, style: 'bucket' });
  parts.push(...goal.parts);
  const desc = path.filter(p => p[0] > apex[0] && p[1] < F - 1.2);
  if (desc.length < 5) reject('short descent');
  return {
    level: { verb: 'Swish!', story: `The cannon (${A1}) fires the ${NOUN[style]} (${B}). Your crayon (${C}) catches it and steers it into ${goal.text}.`, tip: 'Press GO once to watch where the shot lands.', parts },
    cand: R2 => {
      const p = desc[Math.floor(R2.f(0, 0.8) * desc.length)];
      const p0 = [p[0] - R2.f(0.2, 1.0), p[1] + R2.f(0.3, 0.8)];
      return [{ kind, pts: withMid(R2, p0, [goal.rim[0] + R2.f(-0.5, 0.3), goal.rim[1] - R2.f(0.05, 0.6)], 0.4) }];
    },
    you: [{ text: C, stroke: 0 }]
  };
};

/* ===================== World 2: orange crayon ===================== */

/* Drop a heavy blob on a seesaw to fling a ball at the goal. */
A.heavySeesaw = (R, s) => {
  const L = letters();
  const px = R.f(6.2, 9.8), py = F - 0.75, len = R.f(3.0, 3.6), a = -0.3, t = 0.14;
  const hi = R.pick([-0.1, -0.04, 0.04]);
  const style = R.pick(['tennis', 'rubber', 'tennis']);
  const r = radius(style), sL = -(len / 2 - 0.31);
  const bxy = [px + Math.cos(a) * sL + Math.sin(a) * (t + r), py + Math.sin(a) * sL - Math.cos(a) * (t + r)];
  const upEnd = [px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2];
  const A1 = L(), B = L(), C = L(), D = L();
  const parts = [
    { type: 'seesaw', x: round(px), y: round(py), len: round(len), t, angle: a, limit: [-0.3, hi], lips: [-1], label: B },
    { type: 'ball', style, x: round(bxy[0]), y: round(bxy[1]), label: C }
  ];
  // where does a decent blob send the ball?
  const ref = [{ kind: 'loose', pts: blob(upEnd[0] - 0.3, upEnd[1] - 2.6, 0.9, 3) }];
  const s2 = new G.Sim({ parts }, ref); s2.quiet = true; s2.start();
  let apex = [0, 99];
  const bb = s2.parts[1].bodies[0];
  while (s2.t < 3) { s2.step(); const q = bb.getPosition(); if (q.y < apex[1]) apex = [q.x, q.y]; }
  if (apex[1] > bxy[1] - 1.8) reject('weak launch');
  const kindGoal = R.pick(['bell', 'balloon', 'bell']);
  const gy = apex[1] + R.f(-0.4, 0.5);
  if (kindGoal === 'bell') parts.push({ type: 'bell', x: round(apex[0]), y: round(Math.max(0.6, gy - 0.45)), size: 0.85, hang: true, label: D });
  else parts.push({ type: 'balloon', x: round(apex[0]), y: round(Math.max(0.8, gy)), r: 0.42, label: D });
  parts.push({ type: 'nodraw', x: round(Math.max(0.15, bxy[0] - 2.2)), y: 0.15, w: round(px - 0.15 - Math.max(0.15, bxy[0] - 2.2)), h: round(F - 0.15) });
  return {
    level: {
      verb: kindGoal === 'bell' ? 'Ding!' : 'Pop!',
      story: `Your orange scribble (${A1}) drops on the seesaw (${B}) and flings the ${NOUN[style]} (${C}) up to ${kindGoal === 'bell' ? 'ring the bell' : 'pop the balloon'} (${D}).`,
      tip: 'Heavier blobs, dropped from higher, fling harder.', parts
    },
    cand: R2 => [{ kind: 'loose', pts: blob(upEnd[0] + R2.f(-0.7, 0.15), upEnd[1] - R2.f(1.2, 4.2), R2.f(0.6, 1.2), R2.i(2, 4)) }],
    you: [{ text: A1, stroke: 0 }]
  };
};

/* Knock a resting ball off a ledge with a falling blob; it rolls down a
   slide into the goal. */
A.heavyKnock = (R, s) => {
  const L = letters();
  const sy = R.f(3.2, 5.2), sx1 = R.f(1.5, 3.5), sx2 = sx1 + R.f(2.2, 3.4);
  const style = R.pick(['rubber', 'tennis', 'marble', 'bowling']), r = radius(style);
  const bx = sx2 - r - R.f(0.12, 0.35);
  const A1 = L(), B = L();
  const rx1 = sx2 + 0.35, ry1 = sy + R.f(0.9, 1.3), rx2 = rx1 + R.f(3.2, 4.8), ry2 = ry1 + R.f(0.9, 1.6);
  const parts = [
    { type: 'plank', x1: round(sx1), y1: round(sy), x2: round(sx2), y2: round(sy), t: 0.22 },
    { type: 'ball', style, x: round(bx), y: round(sy - r), label: B },
    { type: 'plank', x1: round(rx1), y1: round(ry1), x2: round(rx2), y2: round(ry2), t: 0.18 }
  ];
  const goal = basket(L, { x: round(Math.min(14.7, rx2 + 1.2)), y: round(Math.min(F, ry2 + 1.0)), w: 1.4, h: 0.8, back: 'right', backH: 1.6 });
  if (goal.rim[0] + 1.4 > 15.9) reject('no room');
  parts.push(...goal.parts);
  if (s.diff > 0.45) parts.push({ type: 'nodraw', x: round(bx - 0.35), y: 0.15, w: round(sx2 + 0.3 - (bx - 0.35)), h: round(sy - 1.1) });
  return {
    level: { verb: 'Swish!', story: `Your heavy scribble (${A1}) bumps the ${NOUN[style]} (${B}) off the ledge, down the slide and into ${goal.text}.`, tip: 'Drop the blob a little behind the ball so it shoves it forward.', parts },
    cand: R2 => [{ kind: 'loose', pts: blob(bx - R2.f(0.2, 1.1), sy - r * 2 - R2.f(0.5, 3.0), R2.f(0.5, 1.1), R2.i(2, 4)) }],
    you: [{ text: A1, stroke: 0 }]
  };
};

/* Slide a heavy blob down a chute onto a button tucked under a no-crayon column. */
A.heavyPress = (R, s) => {
  const L = letters();
  const bx = R.f(4.5, 8.5), sy = R.f(5.6, 7.4);
  const A1 = L(), B = L();
  const parts = [
    { type: 'plank', x1: round(bx - 0.9), y1: round(sy), x2: round(bx + 0.9), y2: round(sy), t: 0.2 },
    { type: 'button', x: round(bx), y: round(sy), w: 0.7, fires: 'g1', label: B },
    { type: 'nodraw', x: round(bx - 0.85), y: 0.15, w: 1.7, h: round(sy - 0.75) },
    { type: 'plank', x1: round(bx + 3.4), y1: round(sy - 2.3), x2: round(bx + 0.95), y2: round(sy - 0.6), t: 0.18 }
  ];
  // what the button does
  const C = L();
  let story;
  if (R.chance(0.5)) {
    parts.push({ type: 'lamp', id: 'g1', x: round(Math.min(15.2, bx + 4.8)), y: F, when: 'g1', label: C });
    parts.push({ type: 'wire', from: [round(bx + 0.3), round(sy - 0.05)], to: [round(Math.min(15.2, bx + 4.8) - 0.3), F - 0.1] });
    story = `Your heavy scribble (${A1}) slides down the chute onto the button (${B}) and the lamp (${C}) lights up.`;
  } else {
    const cx = round(Math.min(13.6, bx + 4.6));
    const cannon = { type: 'cannon', x: cx, y: F, angle: round(-R.f(62, 80), 1), speed: round(R.f(8.5, 9.8), 2), when: 'g1', ball: { style: 'meatball' } };
    const shot = new G.Sim({ parts: [Object.assign({}, cannon, { when: 'start' })] }, []); shot.quiet = true; shot.start();
    let top = [0, 99];
    while (shot.t < 3) { shot.step(); const b = shot.parts.find(p => p.type === 'ball'); if (b) { const q = b.bodies[0].getPosition(); if (q.y < top[1]) top = [q.x, q.y]; } }
    if (top[0] > 15.3) reject('balloon off the sheet');
    parts.push(cannon);
    parts.push({ type: 'balloon', x: round(top[0]), y: round(top[1] + 0.2), r: 0.45, tie: [round(Math.min(15.6, top[0] + 0.9)), F], label: C });
    parts.push({ type: 'wire', from: [round(bx + 0.3), round(sy - 0.05)], to: [round(cx - 0.3), F - 0.4] });
    story = `Your heavy scribble (${A1}) slides down the chute onto the button (${B}); the cannon fires and pops the balloon (${C}).`;
  }
  return {
    level: { verb: 'Click!', story, tip: 'You cannot draw above the button. Use the chute.', parts },
    cand: R2 => [{ kind: 'loose', pts: blob(bx + 3.1 + R2.f(-0.9, 0.3), sy - 2.7 - R2.f(0.3, 2.3), R2.f(0.5, 1.0), R2.i(2, 3)) }],
    you: [{ text: A1, stroke: 0 }]
  };
};

/* Path of the first ball part while the machine runs. */
function pathOf(parts, strokes, T, level) {
  const s = new G.Sim(Object.assign({ parts }, level || {}), strokes || []); s.quiet = true; s.start();
  const path = [];
  while (s.t < (T || 4) && !s.won && !s.stalled) {
    s.step();
    const b = s.parts.find(p => p.type === 'ball' && !p.st.gone);
    if (b && Math.round(s.t * 120) % 3 === 0) { const q = b.bodies[0].getPosition(); path.push([q.x, q.y, s.t]); }
  }
  return path;
}
A.pathOf = pathOf;
const lineAt = (cx, cy, len, ang) => [[cx - Math.cos(ang) * len / 2, cy - Math.sin(ang) * len / 2], [cx + Math.cos(ang) * len / 2, cy + Math.sin(ang) * len / 2]];
const pickGoal = (R, L, x, y, opts) => {
  const k = opts && opts.kinds ? R.pick(opts.kinds) : R.pick(['basket', 'bell', 'balloon']);
  const D = L();
  if (k === 'bell') return { k, parts: [{ type: 'bell', x: round(x), y: round(y - 0.6), size: 0.85, hang: true, label: D }], text: `the bell (${D})`, verb: 'Ding!' };
  if (k === 'balloon') return { k, parts: [{ type: 'balloon', x: round(x), y: round(y), r: 0.45, tie: [round(x + 0.3), F], label: D }], text: `the balloon (${D})`, verb: 'Pop!' };
  const b = basket(() => D, { x: round(x), y: round(Math.min(F, y + 0.6)), w: 1.4, h: 0.8, back: opts && opts.back || 'right', backH: 1.7 });
  return { k, parts: b.parts, text: b.text, verb: 'Swish!', rim: b.rim };
};

/* ===================== World 3: green bouncy crayon ===================== */

/* Bounce a dropped ball over a wall. */
A.bounceOver = (R, s) => {
  const L = letters(), kind = 'bouncy';
  const style = R.pick(['rubber', 'tennis', 'marble']);
  const tx = R.f(1.8, 3.8), ty = R.f(1.0, 2.2);
  const st = trapStart(L, { x: tx, y: ty, style });
  const C = L();
  const wx = R.f(6.0, 8.2), ww = R.f(0.5, 0.9), wy = R.f(ty + 2.2, 5.6);
  const parts = [...st.parts, { type: 'block', x: round(wx), y: round(wy), w: round(ww), h: round(F - wy), style: R.pick(['box', 'books']), text: 'WALL' }];
  const gx = R.f(Math.max(wx + ww + 2, 10.5), 14.5);
  const goal = pickGoal(R, L, gx, R.f(wy - 0.3, 7.2), { kinds: ['basket', 'basket', 'bell', 'balloon'] });
  parts.push(...goal.parts);
  if (s.diff > 0.4) parts.push({ type: 'nodraw', x: round(wx - 0.4), y: 0.15, w: round(ww + 0.8), h: round(wy - 0.3) });
  if (s.diff > 0.65) parts.push({ type: 'nodraw', x: round(tx + 1.2), y: round(ty + 1.2), w: round(Math.max(0.6, wx - tx - 2.0)), h: round(F - ty - 1.3) });
  return {
    level: { verb: goal.verb, story: `${st.text}. Your green bouncy line (${C}) springs it over the wall to ${goal.k === 'basket' ? 'land in ' : 'hit '}${goal.text}.`, tip: 'Green lines bounce. Tilt one under the drop to aim the bounce.', parts },
    cand: R2 => [{ kind, pts: lineAt(tx + R2.f(-0.2, 0.9), ty + R2.f(2.2, 6.8), R2.f(0.7, 1.6), R2.f(0.1, 0.75)) }],
    you: [{ text: C, stroke: 0 }], tries: 110
  };
};

/* The ball rolls the wrong way; a bouncy wall sends it back under the shelf. */
A.bounceBack = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'tennis']);
  const y = R.f(2.6, 4.6), x0 = R.f(5.2, 7.4);
  const st = pusherStart(L, { y, x0, style, speed: R.f(3, 4) });
  const C = L();
  const gx = R.f(1.6, x0 - 1.2);
  const goal = basket(L, { x: round(gx), y: F, w: 1.5, h: 0.8, back: 'left', backH: 1.4 });
  const parts = [...st.parts, ...goal.parts];
  if (s.diff > 0.5) parts.push({ type: 'nodraw', x: round(x0 + 3.4), y: 0.15, w: round(W - x0 - 3.55), h: round(F - 0.3) });
  return {
    level: { verb: 'Swish!', story: `${st.text} the wrong way! Your bouncy wall (${C}) bats it back into ${goal.text} under the shelf.`, tip: 'A tilted bouncy line works like a bat.', parts },
    cand: R2 => [{ kind: 'bouncy', pts: lineAt(x0 + R2.f(0.7, 2.8), y + R2.f(0.2, 2.8), R2.f(1.0, 2.2), Math.PI / 2 + R2.f(-0.55, 0.25)) }],
    you: [{ text: C, stroke: 0 }], tries: 110
  };
};

/* Ramp down, bounce up onto a high shelf. */
A.bounceMix = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'tennis']);
  const y = R.f(1.4, 2.4), x0 = R.f(2.6, 3.6);
  const st = pusherStart(L, { y, x0, style });
  const C = L(), D = L();
  const sx = R.f(10.5, 12), sy = R.f(y + 1.2, y + 2.4);
  const parts = [...st.parts, { type: 'block', x: round(sx), y: round(sy), w: round(W - sx), h: round(F - sy), style: 'box', text: 'SHELF' }];
  const goal = basket(L, { x: round(R.f(sx + 1.5, 14.6)), y: round(sy), w: 1.3, h: 0.7, back: 'right', backH: 1.4 });
  parts.push(...goal.parts);
  parts.push({ type: 'nodraw', x: round(x0 + 2.4), y: 0.15, w: round(sx - x0 - 2.5), h: round(sy + 0.6) });
  return {
    level: { verb: 'Swish!', story: `${st.text} down your blue ramp (${C}) onto your bouncy pad (${D}), which springs it up the shelf into ${goal.text}.`, tip: 'Blue to roll, green to bounce.', parts },
    cand: R2 => {
      const p1 = [x0 + R2.f(1.2, 2.4), sy + R2.f(1.0, 2.4)];
      const ramp = { kind: 'solid', pts: [[x0 + R2.f(0.05, 0.8), y + R2.f(0.4, 1.2)], p1] };
      const pad = { kind: 'bouncy', pts: lineAt(p1[0] + R2.f(0.8, 3.2), Math.min(8.4, p1[1] + R2.f(0.3, 1.8)), R2.f(0.8, 1.6), R2.f(-0.9, -0.1)) };
      return [ramp, pad];
    },
    you: [{ text: C, stroke: 0 }, { text: D, stroke: 1 }], tries: 220, minRob: 2
  };
};

/* ===================== World 4: yellow floaty crayon ===================== */

/* A button under a shelf, pressed from below by something that floats. */
A.floatyButton = (R, s) => {
  const L = letters(), d = s.diff;
  const sy = R.f(1.8, 3.4), bx = R.f(5.5, 10.5), sx1 = bx - R.f(1.2, 2.2), sx2 = bx + R.f(1.2, 2.2);
  const A1 = L(), B = L();
  const parts = [
    { type: 'plank', x1: round(sx1), y1: round(sy), x2: round(sx2), y2: round(sy), t: 0.2 },
    { type: 'button', x: round(bx), y: round(sy + 0.2), w: 0.7, angle: Math.PI, fires: 'g1', label: B }
  ];
  let story, verb;
  const C = L();
  const what = s.what || R.pick(['lamp', 'trap', 'cannon']);
  if (what === 'cannon') {
    const cx = round(bx < 8 ? R.f(8.8, 11) : R.f(5, 7.2)), dir = bx < 8 ? 1 : -1;
    const cannon = { type: 'cannon', x: cx, y: F, angle: dir > 0 ? round(-R.f(60, 78), 1) : round(-180 + R.f(60, 78), 1), speed: round(R.f(8.5, 9.8), 2), when: 'g1', ball: { style: 'tennis' }, label: C };
    const path = pathOf([Object.assign({}, cannon, { when: 'start' })], [], 3);
    const top = path.reduce((a, p) => p[1] < a[1] ? p : a, [0, 99]);
    if (top[0] < 0.8 || top[0] > 15.2 || top[1] < 0.6) reject('shot off the sheet');
    const D = L();
    parts.push(cannon, { type: 'balloon', x: round(top[0]), y: round(top[1] + 0.15), r: 0.45, tie: [round(top[0] + dir * 0.8), F], label: D });
    parts.push({ type: 'wire', from: [round(bx), round(sy)], to: [round(cx - dir * 0.3), F - 0.3] });
    story = `Your yellow floaty (${A1}) rises into the button (${B}); the cannon (${C}) fires and pops the balloon (${D}).`; verb = 'Pop!';
  } else if (what === 'lamp') {
    parts.push({ type: 'lamp', x: round(bx < 8 ? 14.2 : 1.8), y: F, when: 'g1', label: C });
    parts.push({ type: 'wire', from: [round(bx), round(sy)], to: [round(bx < 8 ? 13.9 : 2.1), F - 0.1] });
    story = `Your yellow floaty (${A1}) rises into the button (${B}) and the lamp (${C}) switches on.`; verb = 'Click!';
  } else {
    // a bowling ball waits on a trapdoor at the shelf end, above a slide into a basket
    const right = bx < 8;
    const gxT = right ? sx2 + 0.6 : sx1 - 0.6;
    parts.push({ type: 'plank', x1: round(right ? sx2 + 1.2 : sx1 - 1.2), y1: round(sy), x2: round(right ? sx2 + 2.4 : sx1 - 2.4), y2: round(sy), t: 0.2 });
    parts.push({ type: 'gate', x1: round(right ? sx2 + 1.2 : sx1 - 1.2), y1: round(sy), x2: round(right ? sx2 : sx1), y2: round(sy), t: 0.16, when: 'g1', label: C });
    parts.push({ type: 'ball', style: 'bowling', x: round(gxT), y: round(sy - 0.34) });
    const rs = right ? 1 : -1, ry = sy + 1.5;
    parts.push({ type: 'plank', x1: round(gxT - rs * 0.9), y1: round(ry), x2: round(gxT + rs * 2.6), y2: round(ry + 1.3), t: 0.18 });
    const goal = basket(L, { x: round(gxT + rs * 3.6), y: round(Math.min(F, ry + 2.4)), w: 1.3, h: 0.8, back: right ? 'right' : 'left', backH: 1.4, accept: 'bowling' });
    if (goal.rim[0] < 0.2 || goal.rim[0] + 1.3 > 15.8) reject('goal off sheet');
    parts.push(...goal.parts);
    story = `Your yellow floaty (${A1}) rises into the button (${B}), the trapdoor (${C}) opens and the bowling ball rolls into ${goal.text}.`; verb = 'Swish!';
  }
  // harder: no crayons straight under the button; a slanted guide leads there instead
  let gx0 = bx;
  if (d > 0.35) {
    const side = R.chance(0.5) ? -1 : 1;
    parts.push({ type: 'nodraw', x: round(bx - 0.7), y: round(sy + 0.7), w: 1.4, h: round(F - sy - 0.75) });
    const gy = sy + R.f(1.2, 2.0);
    parts.push({ type: 'plank', x1: round(bx + side * 0.45), y1: round(sy + 0.75), x2: round(bx + side * 3.0), y2: round(gy), t: 0.16 });
    gx0 = bx + side * R.f(1.6, 2.6);
  }
  return {
    level: { verb, story, tip: 'Yellow scribbles float up when you press GO. Slanted things above them steer them.', parts },
    cand: R2 => [{ kind: 'floaty', pts: blob(gx0 + R2.f(-0.5, 0.5), R2.f(sy + 2.2, 8.0), R2.f(0.5, 1.1), R2.i(2, 3)) }],
    you: [{ text: A1, stroke: 0 }]
  };
};

/* Steer a floaty up to a balloon hidden in a ceiling pocket. */
A.floatyBalloon = (R, s) => {
  const L = letters();
  const bx = R.f(7, 13), by = R.f(0.9, 1.4);
  const A1 = L(), B = L(), C = L();
  const pw = 1.5;
  const parts = [
    { type: 'block', x: round(bx - pw / 2 - 0.4), y: 0, w: 0.4, h: round(by + 0.9), style: 'wood' },
    { type: 'block', x: round(bx + pw / 2), y: 0, w: 0.4, h: round(by + 0.9), style: 'wood' },
    { type: 'balloon', x: round(bx), y: round(by), r: 0.42, tie: [round(bx), 0.05], label: C },
    { type: 'nodraw', x: round(bx - 0.9), y: round(by + 1.3), w: 1.8, h: round(F - by - 1.35) }
  ];
  const side = R.chance(0.5) ? -1 : 1;
  return {
    level: { verb: 'Pop!', story: `Your floaty (${A1}) drifts up, your blue ceiling (${B}) steers it, and it pops the balloon (${C}).`, tip: 'Floaties slide along the underside of blue lines.', parts },
    cand: R2 => {
      const fx = bx + side * R2.f(1.4, 3.4), fy = by + R2.f(2.6, 6.5);
      const g0 = [fx + side * R2.f(0.4, 1.4), by + R2.f(1.4, 2.4)];
      const g1 = [bx + side * R2.f(0.35, 0.7), by + R2.f(1.0, 1.25)];
      return [{ kind: 'floaty', pts: blob(fx, fy, R2.f(0.4, 0.8), 2) }, { kind: 'solid', pts: [g0, g1] }];
    },
    you: [{ text: A1, stroke: 0 }, { text: B, stroke: 1 }], tries: 220, minRob: 2
  };
};

/* ===================== World 6: purple hinge crayon ===================== */

/* Swing a pinned arm to whack a ball off a ledge. */
A.hingeHammer = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'tennis', 'bowling', 'marble']), r = radius(style);
  const sy = R.f(3.4, 5.6), sx1 = R.f(2.5, 5.5), sx2 = sx1 + R.f(1.6, 2.6);
  const bx = sx2 - r - 0.1;
  const A1 = L(), B = L();
  const parts = [
    { type: 'plank', x1: round(sx1), y1: round(sy), x2: round(sx2), y2: round(sy), t: 0.22 },
    { type: 'ball', style, x: round(bx), y: round(sy - r), label: B }
  ];
  const goal = pickGoal(R, L, R.f(sx2 + 3.0, 14.3), R.f(sy + 1.0, 7.8), { kinds: ['basket', 'basket', 'bell'], back: 'right' });
  parts.push(...goal.parts);
  if (s.diff > 0.6) parts.push({ type: 'nodraw', x: round(sx2 + 1.0), y: round(sy + 0.4), w: 1.2, h: round(F - sy - 0.5) });
  return {
    level: { verb: goal.verb, story: `Your purple arm (${A1}) swings down and whacks the ${NOUN[style]} (${B}) toward ${goal.text}.`, tip: 'A purple line hangs from the spot where you start it. Start high, draw sideways, let it swing.', parts },
    cand: R2 => {
      // pin nearly above the ball: the bottom of the swing strikes it just above the shelf
      const pin = [bx + R2.f(-0.4, 0.25), sy - r - R2.f(0.8, 2.4)];
      const reach = (sy - r - pin[1]) + R2.f(-0.05, 0.2);
      const ang = Math.PI + R2.f(-0.4, 0.35);
      return [{ kind: 'hinge', pts: [pin, [pin[0] + Math.cos(ang) * reach, pin[1] + Math.sin(ang) * reach]] }];
    },
    you: [{ text: A1, stroke: 0 }], tries: 110
  };
};

/* A pendulum you pin rings a bell at the bottom of its swing. */
A.hingeBell = (R, s) => {
  const L = letters();
  const bx = R.f(5, 11), by = R.f(4.2, 6.2);
  const A1 = L(), B = L();
  const parts = [
    { type: 'block', x: round(bx - 0.6), y: round(by + 1.1), w: 1.2, h: round(F - by - 1.1), style: 'books' },
    { type: 'bell', x: round(bx), y: round(by), size: 0.9, label: B },
    { type: 'plank', x1: round(bx - 0.5), y1: round(by), x2: round(bx + 0.5), y2: round(by), t: 0.12, style: 'metal' },
    { type: 'nodraw', x: round(bx - 1.2), y: round(by - 1.6), w: 2.4, h: round(F - by + 1.5) }
  ];
  return {
    level: { verb: 'Ding!', story: `Your purple pendulum (${A1}) swings down and rings the bell (${B}).`, tip: 'Pin it high and to the side. Gravity does the rest.', parts },
    cand: R2 => {
      const side = R2.chance(0.5) ? -1 : 1;
      const pin = [bx + side * R2.f(1.4, 3.2), by - R2.f(1.8, 3.8)];
      const reach = Math.hypot(bx - pin[0], by + 0.4 - pin[1]) + R2.f(-0.1, 0.4);
      const ang = side > 0 ? R2.f(-0.3, 0.3) : Math.PI + R2.f(-0.3, 0.3);
      return [{ kind: 'hinge', pts: [pin, [pin[0] + Math.cos(ang) * reach, pin[1] + Math.sin(ang) * reach]] }];
    },
    you: [{ text: A1, stroke: 0 }], tries: 110
  };
};

/* A pendulum knocks the first domino; the run rings a bell. */
A.hingeDomino = (R, s) => {
  const L = letters();
  const n = R.i(5, 8), gap = 0.45, platY = R.f(4.6, 7.2), dx = R.f(3.5, 6.0), lastX = dx + (n - 1) * gap;
  const A1 = L(), B = L(), C = L();
  const parts = [
    { type: 'plank', x1: round(dx - 1.0), y1: round(platY), x2: round(lastX + 1.3), y2: round(platY), t: 0.2 },
    { type: 'dominoes', x: round(dx), y: round(platY), n, gap, h: 0.8, label: B },
    { type: 'bell', x: round(lastX + 0.66), y: round(platY - 1.2), size: 0.8, hang: true, label: C },
    { type: 'nodraw', x: round(dx - 0.25), y: round(platY - 1.4), w: round(lastX - dx + 1.4), h: 1.15 }
  ];
  if (lastX + 1.6 > 15.8) reject('too long');
  return {
    level: { verb: 'Ding!', story: `Your purple pendulum (${A1}) swings into the first domino (${B}); the last one rings the bell (${C}).`, tip: 'Pin it above and behind the first domino.', parts },
    cand: R2 => {
      const pin = [dx - R2.f(0.3, 1.6), platY - R2.f(1.8, 3.6)];
      const reach = Math.hypot(dx - pin[0], platY - 0.55 - pin[1]) + R2.f(-0.15, 0.25);
      const ang = Math.PI + R2.f(-0.4, 0.3);
      return [{ kind: 'hinge', pts: [pin, [pin[0] + Math.cos(ang) * reach, pin[1] + Math.sin(ang) * reach]] }];
    },
    you: [{ text: A1, stroke: 0 }], tries: 110
  };
};

/* ===================== World 7: red zoom crayon ===================== */

/* Boost a dropped ball uphill into a high basket. */
A.zoomUphill = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'bowling', 'marble', 'tennis']);
  const tx = R.f(1.8, 4.2), ty = R.f(2.2, 4.0);
  const st = trapStart(L, { x: tx, y: ty, style });
  const C = L();
  const sx = R.f(9.5, 12), sy = R.f(ty - 0.6, ty + 1.2);
  const parts = [...st.parts, { type: 'block', x: round(sx), y: round(sy), w: round(W - sx), h: round(F - sy), style: 'box', text: 'UP HERE' }];
  const goal = basket(L, { x: round(R.f(sx + 1.4, 14.7)), y: round(sy), w: 1.3, h: 0.75, back: 'right', backH: 1.5 });
  parts.push(...goal.parts);
  if (s.diff > 0.45) parts.push({ type: 'nodraw', x: round(tx + 1.4), y: 0.15, w: round(sx - tx - 1.6), h: round(sy - 1.2) });
  return {
    level: { verb: 'Zoom!', story: `${st.text} onto your red line (${C}), which rockets it uphill into ${goal.text}.`, tip: 'Red lines push things the way you drew them. Draw from the bottom up.', parts },
    cand: R2 => {
      const p0 = [tx - R2.f(0.4, 1.0), R2.f(Math.max(ty + 2.5, 7.4), 8.55)];
      const p1 = [p0[0] + R2.f(2.0, 4.0), Math.min(8.6, p0[1] + R2.f(-0.3, 0.2))];
      const p2 = [sx - R2.f(0.05, 0.6), sy - R2.f(0.05, 0.5)];
      return [{ kind: 'zoom', pts: [p0, p1, p2] }];
    },
    you: [{ text: C, stroke: 0 }], tries: 110
  };
};

/* A car too slow to jump the gap until a red line speeds it up. */
A.zoomJump = (R, s) => {
  const L = letters();
  const topY = R.f(5.4, 6.6), pitL = R.f(6.5, 8.5), pitW = R.f(3.0, 4.2), pitR = pitL + pitW;
  const A1 = L(), B = L(), C = L();
  const parts = [
    { type: 'block', x: 0, y: round(topY), w: round(pitL), h: round(F - topY), style: 'box', text: 'START' },
    { type: 'block', x: round(pitR), y: round(topY + 0.3), w: round(W - pitR), h: round(F - topY - 0.3), style: 'box', text: 'FINISH' },
    { type: 'nodraw', x: round(pitL + 0.05), y: 0.15, w: round(pitW - 0.1), h: round(F - 0.3) },
    { type: 'car', x: 1.4, y: round(topY), dir: 1, speed: 1.6, when: 'start', label: A1 },
    { type: 'flag', x: round(Math.min(15.2, pitR + 2.2)), y: round(topY + 0.3), label: C }
  ];
  return {
    level: { verb: 'Vroom!', story: `The wind-up car (${A1}) hits your red boost (${B}), flies over the gap and reaches the flag (${C}).`, tip: 'Draw the boost toward the gap. A little kick up at the end helps.', parts },
    cand: R2 => {
      const x0 = R2.f(2.4, 4.5), y = topY - 0.05;
      const kick = R2.f(0, 0.35);
      return [{ kind: 'zoom', pts: [[x0, y], [pitL - R2.f(0.5, 1.2), y], [pitL - 0.1, y - kick]] }];
    },
    you: [{ text: B, stroke: 0 }], tries: 110
  };
};

/* The ball must climb over a wall and drop into a basket behind it. */
A.zoomOver = (R, s) => {
  const L = letters();
  const style = R.pick(['rubber', 'tennis', 'marble']);
  const y = R.f(4.6, 6.0), x0 = R.f(3.0, 4.5);
  const st = pusherStart(L, { y, x0, style, speed: 2.5 });
  const C = L();
  const wx = R.f(7.5, 9.5), wy = R.f(y - 2.2, y - 1.0);
  const parts = [...st.parts, { type: 'block', x: round(wx), y: round(wy), w: 0.7, h: round(F - wy), style: 'books' }];
  const goal = basket(L, { x: round(R.f(wx + 2.4, 14.4)), y: F, w: 1.5, h: 0.8, back: 'right', backH: 1.5 });
  parts.push(...goal.parts);
  return {
    level: { verb: 'Zoom!', story: `${st.text}; your red line (${C}) boosts it up and over the wall into ${goal.text}.`, tip: 'Aim the red line up the face of the wall.', parts },
    cand: R2 => {
      const p0 = [x0 + R2.f(0.1, 1.0), y + R2.f(0.2, 0.9)];
      const p1 = [wx - R2.f(0.3, 1.2), Math.min(8.5, p0[1] + R2.f(-0.2, 0.8))];
      const p2 = [wx - R2.f(0.05, 0.3), wy - R2.f(0.1, 0.8)];
      return [{ kind: 'zoom', pts: [p0, p1, p2] }];
    },
    you: [{ text: C, stroke: 0 }], tries: 110
  };
};

/* ===================== World 8: black magnet crayon ===================== */

/* A steel ball flies past the basket; a magnet pulls it in. */
A.magnetBasket = (R, s) => {
  const L = letters();
  const cx = R.f(1.2, 2.4), ang = -R.f(40, 62), sp = R.f(8.5, 11);
  const A1 = L(), B = L(), C = L();
  const parts = [{ type: 'cannon', x: round(cx), y: F, angle: round(ang, 1), speed: round(sp, 2), when: 'start', ball: { style: 'steel' }, label: A1 }];
  const path = pathOf(parts, [], 4);
  const apex = path.reduce((a, p) => p[1] < a[1] ? p : a, [0, 99]);
  if (apex[1] < 1.0 || apex[1] > 5) reject('bad shot');
  const gx = apex[0] + R.f(-1.5, 1.5), gy = R.f(Math.max(apex[1] + 2.0, 5.2), 7.8);
  if (gx < 5 || gx > 14.5) reject('goal off');
  const goal = basket(L, { x: round(gx), y: round(gy), w: 1.3, h: 0.8, back: R.pick(['left', 'right']), backH: 1.2, style: 'bucket', accept: 'steel' });
  parts.push(...goal.parts);
  const land = path.find(p => p[1] > gy - 0.2 && p[0] > apex[0]);
  if (land && Math.abs(land[0] - gx) < 1.4) reject('lands in anyway');
  parts.push({ type: 'nodraw', x: round(gx - 1.5), y: 0.15, w: 3.0, h: round(gy - 1.6) });
  return {
    level: { verb: 'Clank!', story: `The cannon (${A1}) fires a steel ball (${B}) right past ${goal.text}. Your black magnet (${C}) pulls it in.`, tip: 'Black lines pull steel from a distance. Draw one below or behind the target.', parts },
    cand: R2 => [{ kind: 'magnet', pts: lineAt(gx + R2.f(-1.0, 1.0), gy + R2.f(-0.3, 0.6) , R2.f(0.5, 1.6), R2.f(-0.4, 0.4)) }],
    you: [{ text: C, stroke: 0 }], tries: 110
  };
};

/* Pull a rolling steel ball sideways around a wall. */
A.magnetCurve = (R, s) => {
  const L = letters();
  const y = R.f(1.6, 3.2), x0 = R.f(3.2, 5.0);
  const st = pusherStart(L, { y, x0, style: 'steel', speed: R.f(2.5, 3.5) });
  const C = L();
  const wx = x0 + R.f(0.6, 1.6);
  const parts = [...st.parts, { type: 'block', x: round(wx), y: round(y + 0.6), w: 0.6, h: round(F - y - 0.6), style: 'wood' }];
  const goal = basket(L, { x: round(R.f(wx + 2.4, 13.5)), y: F, w: 1.5, h: 0.8, back: 'right', backH: 1.4, accept: 'steel' });
  parts.push(...goal.parts);
  parts.push({ type: 'plank', x1: round(wx - 0.1), y1: round(y - 1.0), x2: round(wx + 3.2), y2: round(y - 1.0), t: 0.2 });
  return {
    level: { verb: 'Clank!', story: `${st.text} toward the wall. Your magnet (${C}) yanks it over the top and it drops into ${goal.text}.`, tip: 'Steel balls curve toward black lines.', parts },
    cand: R2 => [{ kind: 'magnet', pts: lineAt(wx + R2.f(1.2, 4.5), y + R2.f(-0.6, 2.0), R2.f(0.6, 1.8), R2.f(-1.5, 1.5)) }],
    you: [{ text: C, stroke: 0 }], tries: 130
  };
};

/* ===================== live levels: draw while it runs ===================== */
const spawnT = (d, i) => (d.first != null ? d.first : 0.5) + i * (d.every || 2.5);
const henX = (d, t) => { const span = d.x2 - d.x1, u = (t * (d.speed || 1) / span) % 2; return d.x1 + span * (u < 1 ? u : 2 - u); };
const liveNote = 'It starts on its own. Draw while it runs! Lines fade, and your crayon refills.';

/* Balls rain from a pipe; draw lines in time to steer them into the basket. */
A.liveRain = (R, s) => {
  const L = letters(), kinds = s.kinds || ['solid'];
  const n = s.of || 5, need = s.need || 3, style = R.pick(['rubber', 'tennis', 'marble']);
  const baseX = R.f(1.6, 4.5);
  const xs = [0, round(R.f(1.5, 3.8)), round(R.f(0.6, 2.4))].slice(0, R.i(1, 3));
  const A1 = L(), C = L();
  const disp = { type: 'dispenser', kind: 'tube', x: round(baseX), y: 0.75, every: round(R.f(2.3, 3.0), 2), count: n, first: 1, xs, style, label: A1 };
  const far = baseX + Math.max(...xs);
  const goal = basket(() => C, { x: round(Math.min(14.6, far + R.f(3.2, 5.5))), y: round(R.f(4.6, 6.6)), w: 1.5, h: 0.8, back: 'right', backH: 1.6 });
  const parts = [disp, ...goal.parts];
  if (s.diff > 0.4) { const px = R.f(7, 9.5), py = R.f(4, 6.5); parts.push({ type: 'block', x: round(px), y: round(py), w: 0.6, h: round(F - py), style: 'books' }); }
  if (s.diff > 0.6) parts.push({ type: 'nodraw', x: round(R.f(5.5, 8)), y: round(R.f(1.5, 3)), w: round(R.f(1, 2)), h: round(R.f(1, 2)) });
  const level = {
    verb: 'Swish!', parts, goal: { need, of: n },
    live: { lava: true, fade: round(R.f(5, 7), 1), ink: 4, regen: 1.2, time: round(spawnT(disp, n) + 9, 1) },
    story: `The pipe (${A1}) drops ${n} balls. The floor is lava! Catch at least ${need} in ${goal.text}.`, tip: liveNote
  };
  const stages = [];
  for (let i = 0; i < n; i++) {
    const t = spawnT(disp, i), x = baseX + xs[i % xs.length];
    stages.push({
      tries: 60, optional: i >= need, until: t + 6, ok: sm => sm.delivered >= i + 1,
      cand: R2 => [{ kind: R2.pick(kinds), at: Math.max(0, t - R2.f(0.3, 1.8)), pts: withMid(R2, [x - R2.f(0.1, 0.8), 0.75 + R2.f(1.2, 4.0)], [goal.rim[0] + R2.f(-0.7, 0.3), goal.rim[1] - R2.f(0.05, 0.6)], 0.8) }]
    });
  }
  return { level, stages, you: [] };
};

/* A wind-up car races over lava pits; draw each bridge just in time. */
A.liveCar = (R, s) => {
  const L = letters(), kinds = s.kinds || ['solid'];
  const topY = R.f(5.8, 7.0), speed = round(R.f(1.8, 2.4), 2);
  let x = R.f(3.4, 4.6);
  const boxes = [[0, x]], pits = [];
  const k = s.pits || R.i(2, 3);
  for (let j = 0; j < k; j++) { const pw = R.f(1.5, 2.5); pits.push([x, x + pw]); x += pw; const bw = R.f(1.2, 2.4); boxes.push([x, x + bw]); x += bw; }
  if (x > 15.6) reject('course too long');
  boxes[boxes.length - 1][1] = W;
  const A1 = L(), B = L();
  const labels = ['GO', 'HOP', 'SKIP', 'JUMP', 'HOME'];
  const parts = boxes.map(([a, b], i) => ({ type: 'block', x: round(a), y: round(topY), w: round(b - a), h: round(F - topY), style: 'box', text: labels[Math.min(i, labels.length - 1)] }));
  parts.push({ type: 'car', x: 1.4, y: round(topY), dir: 1, speed, run: 60, when: 'start', label: A1 });
  parts.push({ type: 'flag', x: round(Math.min(15.3, boxes[boxes.length - 1][0] + 1)), y: round(topY), label: B });
  const level = {
    verb: 'Vroom!', parts,
    live: { lava: true, fade: round(R.f(3.6, 5), 1), ink: 3, regen: 1.3, time: 30 },
    story: `The wind-up car (${A1}) will not stop! Bridge every lava pit before it gets there and reach the flag (${B}).`, tip: liveNote
  };
  const stages = pits.map(([a, b]) => {
    const tArrive = Math.max(0, (a - 1.4 - 0.6) / speed);
    return {
      tries: 50, until: tArrive + (b - a + 2) / speed + 1.5,
      ok: sm => sm.won || sm.parts.find(p => p.type === 'car').bodies[0].getPosition().x > b + 0.8,
      cand: R2 => [{ kind: R2.pick(kinds), at: Math.max(0, tArrive - R2.f(0.4, 1.8)), pts: [[a - R2.f(0, 0.25), topY - R2.f(0.02, 0.1)], [b + R2.f(0, 0.25), topY - R2.f(0.02, 0.1)]] }]
    };
  });
  return { level, stages, you: [] };
};

/* A hen walks the rail laying eggs. Catch them gently into the nest. */
A.liveHen = (R, s) => {
  const L = letters(), kinds = s.kinds || ['solid'];
  const x1 = R.f(1.4, 3.5), x2 = x1 + R.f(4, 6.5), hy = 1.0;
  const n = s.of || 5, need = s.need || 3;
  const A1 = L(), C = L();
  const hen = { type: 'dispenser', kind: 'hen', x1: round(x1), x2: round(x2), y: hy, speed: round(R.f(0.8, 1.3), 2), every: round(R.f(2.6, 3.3), 2), count: n, first: 1.2, style: 'egg', label: A1 };
  const nx = x2 + R.f(1.4, 3.2);
  if (nx > 14.7) reject('no room for the nest');
  const goal = basket(() => C, { x: round(nx), y: round(R.f(5.6, 7.6)), w: 1.5, h: 0.6, back: 'right', backH: 1.4, style: 'nest', accept: 'egg' });
  const parts = [{ type: 'plank', x1: round(x1 - 0.6), y1: hy, x2: round(x2 + 0.6), y2: hy, t: 0.1, style: 'metal' }, hen, ...goal.parts];
  const level = {
    verb: 'Cluck!', parts, goal: { need, of: n },
    live: { lava: true, fade: round(R.f(5.5, 7), 1), ink: 4, regen: 1.2, time: round(spawnT(hen, n) + 9, 1) },
    story: `The hen (${A1}) lays ${n} eggs. Eggs crack if they fall too far! Roll at least ${need} gently into ${goal.text}.`, tip: 'Catch each egg close under the hen, then let it roll downhill.'
  };
  const stages = [];
  for (let i = 0; i < n; i++) {
    const t = spawnT(hen, i), x = henX(hen, t);
    stages.push({
      tries: 60, optional: i >= need, until: t + 7, ok: sm => sm.delivered >= i + 1,
      cand: R2 => [{ kind: R2.pick(kinds), at: Math.max(0, t - R2.f(0.4, 1.5)), pts: withMid(R2, [x - R2.f(0.2, 0.9), hy + R2.f(1.05, 1.7)], [goal.rim[0] + R2.f(-0.5, 0.2), goal.rim[1] - R2.f(0.05, 0.4)], 0.4) }]
    });
  }
  return { level, stages, you: [] };
};

/* Bounce a ball through three stars before it drops into the lava.
   Designed backwards: a known drawing first, stars along its path after. */
A.liveStars = (R, s) => {
  const L = letters(), kinds = s.kinds || ['bouncy', 'solid'];
  const bx = R.f(2, 6), A1 = L();
  const disp = { type: 'dispenser', kind: 'tube', x: round(bx), y: 0.75, every: 4, count: 1, first: 1.2, style: R.pick(['rubber', 'tennis']), label: A1 };
  const base = { parts: [disp], live: { lava: true, fade: 7, ink: 4, regen: 1.2, time: 16 } };
  const emptyPath = pathOf([disp], [], 6, { live: base.live });
  for (let attempt = 0; attempt < 30; attempt++) {
    const strokes = [];
    const k = R.i(1, 2);
    let cx = bx + R.f(-0.3, 0.8), cy = R.f(3.8, 6.6);
    for (let j = 0; j < k; j++) {
      const kind = R.pick(kinds);
      strokes.push(G.handify({ kind, at: round(R.f(0.1, 1.0), 2), pts: lineAt(cx, cy, R.f(1.0, 2.4), kind === 'bouncy' ? R.f(-0.1, 0.7) : R.f(0.15, 0.5)) }));
      cx += R.f(3, 5.5); cy = R.f(4.5, 7.5);
      if (cx > 14.5) break;
    }
    const path = pathOf([disp], strokes, 7, { live: base.live });
    const t0 = 1.6;
    const cands = path.filter(p => p[2] > t0 && p[0] > 0.8 && p[0] < 15.2 && p[1] > 0.8 && p[1] < 7.8 &&
      strokes.every(st => G.geom.nearest(p, st.pts)[2] > 0.75) && emptyPath.every(e => Math.hypot(e[0] - p[0], e[1] - p[1]) > 0.8));
    const stars = [];
    for (const p of cands) if (stars.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1.7)) stars.push(p);
    if (stars.length < 3) continue;
    const pick3 = [stars[0], stars[Math.floor(stars.length / 2)], stars[stars.length - 1]];
    const parts = [disp, ...pick3.map((p, i) => ({ type: 'star', x: round(p[0], 2), y: round(p[1], 2), label: i === 0 ? L() : undefined }))];
    const level = {
      verb: 'Twinkle!', parts, goal: { stars: 3 }, live: base.live,
      story: `One ball drops from the pipe (${A1}). Bounce it through all three stars before it lands in the lava.`, tip: 'Green lines bounce, blue lines roll. Draw fast!'
    };
    return { level, cand: () => strokes, tries: 1, you: [] };
  }
  reject('no star path');
};

/* A basket slides back and forth; time your ramps. */
A.liveMoving = (R, s) => {
  const L = letters(), kinds = s.kinds || ['solid'];
  const n = s.of || 5, need = s.need || 3;
  const A1 = L(), C = L();
  const disp = { type: 'dispenser', kind: 'tube', x: round(R.f(2, 5)), y: 0.75, every: round(R.f(2.4, 3.2), 2), count: n, first: 1, xs: [0], style: R.pick(['rubber', 'marble']), label: A1 };
  const cx = Math.min(12.6, disp.x + R.f(5.5, 7.5)), cy = R.f(5.8, 7.2), dx = R.f(2.2, 3.4);
  const parts = [disp,
    { type: 'plank', x1: round(cx - dx / 2 - 1.1), y1: round(cy), x2: round(Math.min(15.9, cx + dx / 2 + 1.1)), y2: round(cy), t: 0.18, style: 'metal' },
    { type: 'cup', x: round(cx), y: round(cy), w: 1.4, h: 0.7, style: 'bucket', move: { dx: round(dx, 2), period: round(R.f(3.5, 5.5), 2) }, label: C }];
  const level = {
    verb: 'Swish!', parts, goal: { need, of: n },
    live: { lava: true, fade: round(R.f(6, 8), 1), ink: 4, regen: 1.2, time: round(spawnT(disp, n) + 9, 1) },
    story: `The pipe (${A1}) drops ${n} balls and the bucket (${C}) will not sit still. Catch at least ${need}.`, tip: 'Watch the bucket, then aim.'
  };
  const stages = [];
  for (let i = 0; i < n; i++) {
    const t = spawnT(disp, i), x = disp.x;
    stages.push({
      tries: 70, optional: i >= need, until: t + 6, ok: sm => sm.delivered >= i + 1,
      cand: R2 => [{ kind: R2.pick(kinds), at: Math.max(0, t - R2.f(0.3, 1.8)), pts: [[x - R2.f(0.1, 0.8), R2.f(2, 4.5)], [cx + R2.f(-dx / 2 - 0.8, dx / 2 - 0.4), cy - R2.f(0.9, 1.6)]] }]
    });
  }
  return { level, stages, you: [] };
};

/* ===================== bosses ===================== */
function bossStages(n, hp0, mk, opt) {
  const st = [];
  for (let i = 0; i < n; i++) st.push(Object.assign({ tries: 140, ok: sm => sm.won || sm.parts.find(p => p.type === 'boss').st.hp <= hp0 - (i + 1), cand: mk(i) }, opt ? opt(i) : {}));
  return st;
}

/* Grumbox: balls fall from two pipes; ramp them over the wall into the box monster. */
A.boss1 = (R, s) => {
  const L = letters();
  const x0 = R.f(1.6, 2.8), xs = [0, round(R.f(2.2, 3.4))];
  const disp = { type: 'dispenser', kind: 'tube', x: round(x0), y: 0.75, every: 2.4, count: 5, first: 0.6, xs, style: 'rubber', label: L() };
  const bx = R.f(12.4, 13.6);
  const boss = { type: 'boss', look: 'grumbox', name: 'Grumbox', x: round(bx), y: F, w: 1.9, h: 2.1, hp: 4, label: L() };
  const wx = R.f(9.4, 10.2), wy = R.f(6.6, 7.2);
  const parts = [disp, boss,
    { type: 'block', x: round(wx), y: round(wy), w: 0.6, h: round(F - wy), style: 'books' },
    { type: 'nodraw', x: round(wx - 0.3), y: 0.15, w: round(W - wx - 0.15), h: round(wy - 0.9) },
    { type: 'nodraw', x: round(x0 + xs[1] + 1.4), y: round(F - 2.2), w: round(wx - x0 - xs[1] - 1.8), h: 2.2 }];
  const level = {
    verb: 'KO!', parts, boss: 'Grumbox',
    story: `BOSS! Grumbox (${boss.label}) guards the playroom. Five balls fall from the pipes (${disp.label}); hit Grumbox four times.`,
    tip: 'Two pipes, two drop spots. One line may not reach both.'
  };
  return {
    level, slack: 1.15, minRob: 2,
    stages: bossStages(4, 4, i => R2 => {
      const x = x0 + xs[i % 2];
      return [{ kind: 'solid', pts: withMid(R2, [x - R2.f(0.1, 0.8), 0.75 + R2.f(1.4, 4.2)], [wx - R2.f(0.4, 1.8), wy - R2.f(0.5, 1.6)], 0.8) }];
    }),
    you: []
  };
};

/* Sir Tipsy: slide heavy blobs down the chute to knock the knight silly. */
A.boss2 = (R, s) => {
  const L = letters();
  const cy1 = R.f(2.2, 3.0), cy2 = cy1 + R.f(2.6, 3.4), cx2 = R.f(8.6, 9.6);
  const kx = cx2 + R.f(2.0, 2.8), ky = F;
  const boss = { type: 'boss', look: 'knight', name: 'Sir Tipsy', x: round(kx), y: ky, w: 1.3, h: 2.4, hp: 3, minHit: 1.6, label: L() };
  const parts = [boss,
    { type: 'plank', x1: 0.6, y1: round(cy1), x2: round(cx2), y2: round(cy2), t: 0.2, friction: 0.04, style: 'metal' },
    { type: 'nodraw', x: round(cx2 - 3.2), y: 0.15, w: round(W - cx2 + 3.05), h: round(F - 0.3) }];
  const level = {
    verb: 'KO!', parts, boss: 'Sir Tipsy',
    story: `BOSS! Sir Tipsy (${boss.label}) stands firm. Slide heavy scribbles down the chute and knock him over three times.`,
    tip: 'Each blob counts once. Space them out along the chute.'
  };
  const slope = (cy2 - cy1) / (cx2 - 0.6);
  return {
    level, slack: 1.25, minRob: 2,
    stages: bossStages(3, 3, i => R2 => {
      const x = R2.f(1.0, cx2 - 3.6), yTop = cy1 + (x - 0.6) * slope;
      return [{ kind: 'loose', pts: blob(x, yTop - R2.f(0.6, 1.8), R2.f(0.5, 0.9), R2.i(2, 3)) }];
    }),
    you: []
  };
};

/* Boingo: a jelly monster on a high ledge. Bounce balls up to it. */
A.boss3 = (R, s) => {
  const L = letters();
  const x0 = R.f(1.6, 3), xs = [0, round(R.f(1.4, 2.6))];
  const disp = { type: 'dispenser', kind: 'tube', x: round(x0), y: 0.75, every: 2.6, count: 5, first: 0.6, xs, style: 'rubber', label: L() };
  const lx = x0 + xs[1] + R.f(4.2, 5.4), ly = R.f(3.8, 4.8);
  const boss = { type: 'boss', look: 'jelly', name: 'Boingo', x: round((lx + W) / 2), y: round(ly), w: 1.7, h: 1.6, hp: 4, label: L() };
  const parts = [disp, boss,
    { type: 'block', x: round(lx), y: round(ly), w: round(W - lx), h: round(F - ly), style: 'box', text: 'LEDGE' },
    { type: 'nodraw', x: round(x0 + xs[1] + 1.8), y: 0.15, w: round(lx - x0 - xs[1] - 2.0), h: round(ly + 1.2) }];
  const level = {
    verb: 'KO!', parts, boss: 'Boingo',
    story: `BOSS! Boingo (${boss.label}) wobbles on the high ledge. Bounce four of the five balls from the pipes (${disp.label}) up into it.`,
    tip: 'Green lines give the height back. Blue lines can aim.'
  };
  return {
    level, slack: 1.15, minRob: 2,
    stages: bossStages(4, 4, i => R2 => {
      const x = x0 + xs[i % 2];
      return [{ kind: 'bouncy', pts: lineAt(x + R2.f(-0.2, 1.2), R2.f(5.0, 8.3), R2.f(0.8, 1.8), R2.f(0.25, 0.8)) }];
    }),
    you: []
  };
};

/* Nimbus: a storm cloud drifts along the ceiling. Float yellow scribbles up into it. */
A.boss4 = (R, s) => {
  const L = letters();
  const cx = R.f(6.5, 9.5), cy = R.f(1.4, 1.9);
  const boss = { type: 'boss', look: 'cloud', name: 'Nimbus', x: round(cx), y: round(cy + 0.6), w: 2.0, h: 1.2, hp: 4, minHit: 0.6, move: { dx: round(R.f(3, 5), 2), period: round(R.f(5, 7), 2) }, label: L() };
  const parts = [boss,
    { type: 'nodraw', x: round(cx - 3.2), y: round(cy + 1.0), w: 6.4, h: round(F - cy - 1.05) },
    { type: 'plank', x1: round(cx - 5.6), y1: round(cy + 2.4), x2: round(cx - 3.3), y2: round(cy + 1.4), t: 0.16 },
    { type: 'plank', x1: round(cx + 3.3), y1: round(cy + 1.4), x2: round(cx + 5.6), y2: round(cy + 2.4), t: 0.16 }];
  const level = {
    verb: 'KO!', parts, boss: 'Nimbus',
    story: `BOSS! Nimbus (${boss.label}) rains on the parade. Float four yellow scribbles up into it. It will not sit still.`,
    tip: 'The slanted boards steer floaties inward. Launch them at different times by starting them higher or lower.'
  };
  return {
    level, slack: 1.3, minRob: 2,
    stages: bossStages(4, 4, i => R2 => {
      const side = i % 2 ? 1 : -1;
      return [{ kind: 'floaty', pts: blob(cx + side * R2.f(3.6, 5.4), R2.f(cy + 2.8, 8.2), R2.f(0.4, 0.8), 2) }];
    }),
    you: []
  };
};

/* The Scribble Eater (live): it gobbles your lines as it patrols. Knock it with the falling balls. */
A.boss5 = (R, s) => {
  const L = letters();
  const x0 = R.f(1.6, 3.2);
  const disp = { type: 'dispenser', kind: 'tube', x: round(x0), y: 0.75, every: 2.6, count: 6, first: 1.2, xs: [0, round(R.f(1.4, 2.4))], style: 'rubber', label: L() };
  const ex = R.f(9.5, 11.5), ey = R.f(5.2, 6.4);
  const boss = { type: 'boss', look: 'eater', name: 'The Scribble Eater', x: round(ex), y: round(ey), w: 1.5, h: 1.5, hp: 4, eats: true, move: { dx: round(R.f(2.5, 4), 2), period: round(R.f(4.5, 6), 2) }, label: L() };
  const parts = [disp, boss];
  const level = {
    verb: 'KO!', parts, boss: 'The Scribble Eater', live: { lava: true, fade: 6, ink: 4, regen: 1.4, time: round(spawnT(disp, 6) + 8, 1) },
    story: `BOSS! The Scribble Eater (${boss.label}) chews up any line it touches. Steer four of the six falling balls into it before the lava gets them.`,
    tip: 'Draw right before each ball drops, and keep your lines out of its reach.'
  };
  return {
    level, minRob: 1,
    stages: bossStages(4, 4, i => R2 => {
      const t = spawnT(disp, i), x = x0 + disp.xs[i % 2];
      return [{ kind: 'solid', at: Math.max(0, t - R2.f(0.2, 1.2)), pts: [[x - R2.f(0.1, 0.8), 0.75 + R2.f(1.0, 3.0)], [ex + R2.f(-3.5, -1.2), ey - R2.f(-0.6, 1.2)]] }];
    }, i => ({ until: spawnT(disp, i + 2) + 1, tries: 120 })),
    you: []
  };
};

/* Tick-Tock: swing purple hammers to knock three balls into the clock monster. */
A.boss6 = (R, s) => {
  const L = letters();
  const mx = R.f(7.2, 8.8);
  const boss = { type: 'boss', look: 'clock', name: 'Tick-Tock', x: round(mx), y: F, w: 1.8, h: 2.2, hp: 3, hitBy: 'ball', label: L() };
  const parts = [boss];
  const shelves = [];
  const specs = [[R.f(3.6, 4.4), R.f(3.0, 4.0), 1], [R.f(11.8, 12.6), R.f(2.8, 3.8), -1], [R.f(4.6, 5.2), R.f(5.6, 6.4), 1]];
  for (const [sx, sy, dir] of specs) {
    const x1 = dir > 0 ? sx - 1.8 : sx, x2 = dir > 0 ? sx : sx + 1.8;
    parts.push({ type: 'plank', x1: round(x1), y1: round(sy), x2: round(x2), y2: round(sy), t: 0.2 });
    const bxx = dir > 0 ? x2 - 0.3 : x1 + 0.3;
    parts.push({ type: 'ball', style: 'rubber', x: round(bxx), y: round(sy - 0.24) });
    // a slide from under the shelf edge down toward the monster
    const ex = dir > 0 ? x2 + 0.3 : x1 - 0.3, tx = mx - dir * 1.25;
    parts.push({ type: 'plank', x1: round(ex), y1: round(sy + 1.0), x2: round(tx), y2: round(Math.max(sy + 1.6, F - 1.6)), t: 0.16 });
    shelves.push([bxx, sy - 0.24, dir]);
  }
  parts.push({ type: 'nodraw', x: round(mx - 1.6), y: 0.15, w: 3.2, h: round(F - 0.3) });
  const level = {
    verb: 'KO!', parts, boss: 'Tick-Tock',
    story: `BOSS! Tick-Tock (${boss.label}) is always on time. Swing purple hammers to knock all three bowling balls off their shelves and into it.`,
    tip: 'Pin each hammer behind and above its ball.'
  };
  return {
    level, slack: 1.25, minRob: 2,
    stages: bossStages(3, 3, i => R2 => {
      const [bxx, byy, dir] = shelves[i];
      const pin = [bxx + dir * R2.f(-0.35, 0.25), byy - R2.f(0.9, 2.2)];
      const reach = (byy - pin[1]) + R2.f(-0.05, 0.2);
      const ang = dir > 0 ? Math.PI + R2.f(-0.35, 0.35) : R2.f(-0.35, 0.35);
      return [{ kind: 'hinge', pts: [pin, [pin[0] + Math.cos(ang) * reach, pin[1] + Math.sin(ang) * reach]] }];
    }),
    you: []
  };
};

/* Turbo Snail: boost rolling balls up to the snail on the high shelf. */
A.boss7 = (R, s) => {
  const L = letters();
  const disp = { type: 'dispenser', kind: 'tube', x: round(R.f(1.2, 2.2)), y: round(R.f(5.2, 6.2)), every: 2.6, count: 5, first: 0.6, xs: [0], style: 'rubber', label: L() };
  const sx = R.f(10.4, 11.6), sy = R.f(3.2, 4.2);
  const boss = { type: 'boss', look: 'snail', name: 'Turbo Snail', x: round((sx + W) / 2 + 0.3), y: round(sy), w: 1.8, h: 1.3, hp: 4, move: { dx: 1.6, period: 6 }, label: L() };
  const parts = [disp, boss,
    { type: 'block', x: round(sx), y: round(sy), w: round(W - sx), h: round(F - sy), style: 'box', text: 'SHELL CITY' },
    { type: 'nodraw', x: round(sx - 3.0), y: 0.15, w: 2.8, h: round(sy - 1.2) }];
  const level = {
    verb: 'KO!', parts, boss: 'Turbo Snail',
    story: `BOSS! Turbo Snail (${boss.label}) sits high above and keeps moving. Rocket four of the five balls from the pipe (${disp.label}) into it.`,
    tip: 'Red lines push the way you draw them.'
  };
  return {
    level, slack: 1.15, minRob: 2,
    stages: bossStages(4, 4, () => R2 => {
      const p0 = [disp.x - R2.f(0.3, 0.9), R2.f(7.4, 8.55)];
      const p1 = [p0[0] + R2.f(2.5, 5.5), R2.f(7.8, 8.6)];
      return [{ kind: 'zoom', pts: [p0, p1, [sx - R2.f(0.05, 0.6), sy - R2.f(0.05, 0.6)]] }];
    }),
    you: []
  };
};

/* Magneto: steel shots fly over the wall. Bend them into the robot. */
A.boss8 = (R, s) => {
  const L = letters();
  const disp = { type: 'dispenser', kind: 'cannon', x: round(R.f(1.4, 2.4)), y: F, angle: round(-R.f(50, 60), 1), speed: round(R.f(9.5, 11), 2), every: 2.4, count: 5, first: 0.8, style: 'steel', label: L() };
  const path = pathOf([Object.assign({}, disp, { count: 1 })], [], 4);
  const apex = path.reduce((a, p) => p[1] < a[1] ? p : a, [0, 99]);
  const rx = Math.min(14.4, apex[0] + R.f(2.4, 3.6));
  const boss = { type: 'boss', look: 'robot', name: 'Magneto', x: round(rx), y: F, w: 1.6, h: 2.3, hp: 4, hitBy: 'ball', minHit: 0.8, label: L() };
  const wx = rx - 1.8;
  const land = path.find(p => p[1] > F - 2.4 && p[0] > apex[0]);
  if (land && land[0] > wx - 0.3 && land[0] < rx + 1.2) reject('hits without help');
  const parts = [disp, boss,
    { type: 'block', x: round(wx), y: round(F - 3.0), w: 0.5, h: 3.0, style: 'wood' },
    { type: 'nodraw', x: round(wx - 2.4), y: 0.15, w: 2.2, h: round(F - 0.3) }];
  const level = {
    verb: 'KO!', parts, boss: 'Magneto',
    story: `BOSS! Magneto (${boss.label}) hides behind a wall. Bend four of the five steel shots from the cannon (${disp.label}) into it with magnets.`,
    tip: 'A magnet behind the robot pulls shots down onto it.'
  };
  return {
    level, slack: 1.2, minRob: 2,
    stages: bossStages(4, 4, () => R2 => [{ kind: 'magnet', pts: lineAt(rx + R2.f(-0.6, 1.5), R2.f(3.5, 7.8), R2.f(0.6, 1.8), R2.f(-1.6, 1.6)) }]),
    you: []
  };
};

/* The Chaos King (live): two pipes, lava, a pacing king. Mixed crayons. */
A.boss9 = (R, s) => {
  const L = letters(), kinds = ['solid', 'bouncy', 'zoom'];
  const d1 = { type: 'dispenser', kind: 'tube', x: round(R.f(1.6, 3.0)), y: 0.75, every: 3.2, count: 4, first: 1.2, style: 'rubber', label: L() };
  const d2 = { type: 'dispenser', kind: 'tube', x: round(R.f(5.2, 6.6)), y: 0.75, every: 3.2, count: 3, first: 2.8, style: 'tennis' };
  const kx = R.f(11.5, 13.2), ky = R.f(6.6, 7.6);
  const boss = { type: 'boss', look: 'king', name: 'The Chaos King', x: round(kx), y: round(ky), w: 1.6, h: 2.0, hp: 4, hitBy: 'ball', move: { dx: 2.2, period: 5 }, label: L() };
  const parts = [d1, d2, boss, { type: 'plank', x1: round(kx - 2.6), y1: round(ky), x2: 15.9, y2: round(ky), t: 0.2, style: 'metal' }];
  const level = {
    verb: 'KO!', parts, boss: 'The Chaos King', live: { lava: true, fade: 6, ink: 5, regen: 1.5, time: 30 },
    story: `BOSS! The Chaos King (${boss.label}) paces his balcony while two pipes pour balls. Hit him four times. Any crayon goes!`,
    tip: 'Switch crayons on the fly: keys 1 to 7.'
  };
  const drops = [];
  for (let i = 0; i < 4; i++) drops.push([spawnT(d1, i), d1.x]);
  for (let i = 0; i < 3; i++) drops.push([spawnT(d2, i), d2.x]);
  drops.sort((a, b) => a[0] - b[0]);
  return {
    level, minRob: 1,
    stages: bossStages(4, 4, i => R2 => {
      const [t, x] = drops[i];
      return [{ kind: R2.pick(kinds), at: Math.max(0, t - R2.f(0.2, 1.2)), pts: [[x - R2.f(0.1, 0.8), 0.75 + R2.f(1.2, 3.5)], [kx + R2.f(-3.4, -1.4), ky - R2.f(0.8, 2.2)]] }];
    }, i => ({ until: drops[Math.min(drops.length - 1, i + 2)][0] + 1.5, tries: 140 })),
    you: []
  };
};

/* The Crayon Dragon (live finale): it rises and falls, eats lines, and takes five hits. */
A.boss10 = (R, s) => {
  const L = letters(), kinds = ['solid', 'bouncy', 'zoom'];
  const d1 = { type: 'dispenser', kind: 'tube', x: round(R.f(1.6, 2.8)), y: 0.75, every: 2.8, count: 5, first: 1.2, style: 'rubber', label: L() };
  const d2 = { type: 'dispenser', kind: 'cannon', x: round(R.f(1.4, 2.2)), y: F, angle: round(-R.f(55, 65), 1), speed: round(R.f(8, 9), 2), every: 3.6, count: 3, first: 2.5, style: 'tennis' };
  const dx = R.f(12.4, 13.4), dy = R.f(5.6, 6.4);
  const boss = { type: 'boss', look: 'dragon', name: 'The Crayon Dragon', x: round(dx), y: round(dy), w: 2.2, h: 2.4, hp: 5, eats: true, hitBy: 'ball', move: { dy: 2.2, period: 6 }, label: L() };
  const parts = [d1, d2, boss];
  const level = {
    verb: 'VICTORY!', parts, boss: 'The Crayon Dragon', live: { lava: true, fade: 6, ink: 5, regen: 1.6, time: 34 },
    story: `FINAL BOSS! The Crayon Dragon (${boss.label}) eats crayon for breakfast. Pipe (${d1.label}) and cannon fire balls; land five hits to win the whole box of crayons.`,
    tip: 'Everything you have learned, all at once. Keep your lines out of its mouth.'
  };
  const drops = [];
  for (let i = 0; i < 5; i++) drops.push([spawnT(d1, i), 'tube']);
  for (let i = 0; i < 3; i++) drops.push([spawnT(d2, i), 'cannon']);
  drops.sort((a, b) => a[0] - b[0]);
  return {
    level, minRob: 1,
    stages: bossStages(5, 5, i => R2 => {
      const [t, from] = drops[i];
      if (from === 'tube') return [{ kind: R2.pick(kinds), at: Math.max(0, t - R2.f(0.2, 1.2)), pts: [[d1.x - R2.f(0.1, 0.8), 0.75 + R2.f(1.2, 3.5)], [dx + R2.f(-4.5, -1.8), R2.f(3.5, 7.2)]] }];
      return [{ kind: R2.pick(kinds), at: Math.max(0, t + R2.f(-0.5, 0.6)), pts: lineAt(R2.f(5, 10), R2.f(2, 7), R2.f(1, 2.4), R2.f(-0.8, 0.8)) }];
    }, i => ({ until: drops[Math.min(drops.length - 1, i + 2)][0] + 1.5, tries: 160 })),
    you: []
  };
};

module.exports = A;
