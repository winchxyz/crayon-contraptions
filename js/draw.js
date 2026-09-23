/* Crayon Contraptions — how every part looks. Sheet px = metres x 100.
   stat(g, p): drawn once per boil frame into the cached background.
   live(g, p, sim): drawn every frame. */
(function (root) {
  'use strict';
  const CC = root.CC;
  const { PAL, shapes } = CC;
  const S = 100;
  const FLOOR = CC.K.FLOOR_Y * S;
  const SKETCH = '"Cabin Sketch", "Patrick Hand", cursive';
  const DOMINO_COLS = [PAL.red, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.purple];
  const BOOK_COLS = [PAL.blue, PAL.red, PAL.green, PAL.purple, PAL.orange, PAL.yellow, PAL.pink];

  function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function withBody(g, b, fn) {
    const c = g.ctx, q = b.getPosition();
    c.save(); c.translate(q.x * S, q.y * S); c.rotate(b.getAngle()); fn(c); c.restore();
  }
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const dot = (g, x, y, w, col) => g.cr.line([[x, y]], { w, color: col || PAL.graphite, wob: 0 });

  /* ---------- sheet: one kind of paper per world ---------- */
  const PAPERS = {
    graph: { bg: '#FFFDF7', tooth: 0.07 },
    ruled: { bg: '#FFFEF9', tooth: 0.06 },
    dots: { bg: '#FFFCF4', tooth: 0.07 },
    sky: { bg: '#EAF4FB', tooth: 0.06 },
    kraft: { bg: '#E0C39A', tooth: 0.16 },
    legal: { bg: '#FFF6C6', tooth: 0.07 },
    pink: { bg: '#FBE2E8', tooth: 0.1 },
    blueprint: { bg: '#E3ECF6', tooth: 0.06 },
    newsprint: { bg: '#ECEAE3', tooth: 0.09 },
    party: { bg: '#FFF8EE', tooth: 0.06 }
  };
  function paper(g, kind) {
    const c = g.ctx, P = PAPERS[kind] || PAPERS.graph;
    c.fillStyle = P.bg; c.fillRect(0, 0, 1600, 900);
    c.save(); c.globalAlpha = P.tooth; c.fillStyle = g.cr.pat('#6E5A3E', 2); c.fillRect(0, 0, 1600, 900); c.restore();
    c.save();
    const lines = (col, fn) => { c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); fn(); c.stroke(); };
    switch (kind || 'graph') {
      case 'graph':
        lines('rgba(84, 138, 204, 0.2)', () => {
          for (let x = 50; x < 1600; x += 50) { c.moveTo(x, 0); c.lineTo(x, FLOOR); }
          for (let y = 50; y < FLOOR; y += 50) { c.moveTo(0, y); c.lineTo(1600, y); }
        });
        break;
      case 'ruled': case 'legal':
        lines(kind === 'legal' ? 'rgba(90, 130, 190, 0.3)' : 'rgba(84, 138, 204, 0.28)', () => { for (let y = 70; y < FLOOR; y += 40) { c.moveTo(0, y); c.lineTo(1600, y); } });
        lines('rgba(226, 59, 52, 0.4)', () => { c.moveTo(112, 0); c.lineTo(112, FLOOR); if (kind === 'legal') { c.moveTo(118, 0); c.lineTo(118, FLOOR); } });
        if (kind === 'ruled') { c.fillStyle = 'rgba(160, 150, 130, 0.25)'; for (const y of [150, 450, 750]) { c.beginPath(); c.arc(40, y, 14, 0, 7); c.fill(); } }
        break;
      case 'dots':
        c.fillStyle = 'rgba(84, 120, 170, 0.32)';
        for (let x = 40; x < 1600; x += 40) for (let y = 40; y < FLOOR; y += 40) { c.beginPath(); c.arc(x, y, 1.7, 0, 7); c.fill(); }
        break;
      case 'blueprint':
        lines('rgba(60, 100, 170, 0.18)', () => { for (let x = 25; x < 1600; x += 25) { c.moveTo(x, 0); c.lineTo(x, FLOOR); } for (let y = 25; y < FLOOR; y += 25) { c.moveTo(0, y); c.lineTo(1600, y); } });
        lines('rgba(60, 100, 170, 0.32)', () => { for (let x = 100; x < 1600; x += 100) { c.moveTo(x, 0); c.lineTo(x, FLOOR); } for (let y = 100; y < FLOOR; y += 100) { c.moveTo(0, y); c.lineTo(1600, y); } });
        break;
      case 'newsprint': {
        // faint columns of pretend text, like drawing on yesterday's paper
        const r = rng(7);
        c.fillStyle = 'rgba(60, 55, 50, 0.08)';
        for (let col = 0; col < 5; col++) for (let y = 40; y < FLOOR - 20; y += 14) {
          if (r() < 0.06) { y += 20; continue; }
          const x0 = 30 + col * 314, w = 280 - (r() < 0.15 ? r() * 140 : 0);
          c.fillRect(x0, y, w, 5);
        }
        c.fillStyle = 'rgba(60, 55, 50, 0.1)'; c.fillRect(30, 18, 1540, 4);
        break;
      }
      case 'party': {
        const r = rng(11), cols = ['#E23B34', '#2E6BD6', '#F6C421', '#3FA34D', '#7A4FC0', '#F28DB2'];
        c.globalAlpha = 0.22;
        for (let i = 0; i < 160; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(r() * 1600, r() * FLOOR, 2 + r() * 4, 0, 7); c.fill(); }
        break;
      }
      case 'sky': {
        const grd = c.createLinearGradient(0, 0, 0, FLOOR);
        grd.addColorStop(0, 'rgba(120, 180, 230, 0.18)'); grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        c.fillStyle = grd; c.fillRect(0, 0, 1600, FLOOR);
        break;
      }
    }
    c.restore();
  }
  function floor(g) {
    const cr = g.cr;
    cr.fill(c => { c.beginPath(); c.rect(0, FLOOR, 1600, 900 - FLOOR); }, [0, FLOOR, 1600, 30], { color: PAL.tan, angle: 0.04, gap: 6, seed: 3 });
    for (let x = 90; x < 1600; x += 190) cr.line([[x, FLOOR + 4], [x + 2, 898]], { color: PAL.brown, w: 2, alpha: 0.6, seed: x });
    cr.line([[0, FLOOR + 1], [800, FLOOR], [1600, FLOOR + 1]], { color: PAL.darkbrown, w: 4.5, seed: 1 });
  }

  /* ---------- material helpers ---------- */
  function woodPlank(g, x, y, w, h, seed, col, edge) {
    const cr = g.cr;
    cr.shape(shapes.rect(x, y, w, h), { fill: col || PAL.wood, stroke: edge || PAL.darkbrown, w: 3.2, angle: 0.1, gap: 5, seed });
    if (h > 12) {
      for (let i = 1; i <= 2; i++) {
        const yy = y + h * i / 3;
        cr.line([[x + w * 0.1, yy], [x + w * 0.45, yy + (i % 2 ? 1.5 : -1.5)], [x + w * 0.85, yy]], { color: PAL.darkbrown, w: 1.4, alpha: 0.45, seed: seed + i * 7 });
      }
    }
    if (w > 40) { dot(g, x + 7, y + h / 2, 4.2); dot(g, x + w - 7, y + h / 2, 4.2); }
  }
  function books(g, x, y, w, h, seed) {
    const r = rng(seed + 5), cr = g.cr;
    let yy = y + h, i = 0;
    while (yy > y + 1) {
      let bh = 28 + r() * 18;
      if (yy - bh < y + 18) bh = yy - y;
      const inL = r() * 9, inR = r() * 9, col = BOOK_COLS[(i + seed) % BOOK_COLS.length];
      const bx = x + inL, bw = w - inL - inR, by = yy - bh;
      cr.shape(shapes.rect(bx, by, bw, bh), { fill: col, stroke: PAL.graphite, w: 2.6, angle: 0.02, gap: 4.8, seed: seed + i * 13 });
      cr.line([[bx + bw * 0.1, by + 4], [bx + bw * 0.1, yy - 4]], { color: PAL.paper, w: 2.4, alpha: 0.8, seed: i });
      cr.line([[bx + bw * 0.9, by + 4], [bx + bw * 0.9, yy - 4]], { color: PAL.paper, w: 2.4, alpha: 0.8, seed: i + 1 });
      if (bh > 24) cr.line([[bx + bw * 0.3, by + bh / 2], [bx + bw * 0.62, by + bh / 2 + 1]], { color: PAL.paper, w: 3, alpha: 0.85, seed: i + 2 });
      yy = by; i++;
    }
  }
  function cardboard(g, x, y, w, h, text, seed) {
    const cr = g.cr;
    cr.shape(shapes.rect(x, y, w, h), { fill: PAL.card, stroke: PAL.cardDark, w: 3.4, angle: -0.25, gap: 6, seed });
    cr.line([[x + 4, y + 20], [x + w - 4, y + 21]], { color: PAL.cardDark, w: 2, alpha: 0.7, seed: seed + 1 });
    const tx = x + w / 2 - 22;
    cr.fill(c => { c.beginPath(); c.rect(tx, y + 2, 44, Math.min(62, h - 4)); }, [tx, y, 44, 62], { color: '#EBD29C', angle: 1.5, gap: 5, alpha: 0.9, seed: seed + 2 });
    if (text) {
      const size = Math.max(22, Math.min(58, w / (text.length * 0.62), h * 0.3));
      cr.text(text, x + w / 2, y + h * 0.56, { size, font: SKETCH, weight: 700, color: PAL.cardDark, align: 'center', rot: -0.03 });
    }
    // this-side-up arrows
    const ax = x + 18, ay = y + h - 20;
    if (h > 90 && w > 120) for (const dx of [0, 14]) {
      cr.line([[ax + dx, ay], [ax + dx, ay - 22]], { color: PAL.cardDark, w: 2.2, seed: dx });
      cr.line([[ax + dx - 5, ay - 16], [ax + dx, ay - 23], [ax + dx + 5, ay - 16]], { color: PAL.cardDark, w: 2.2, seed: dx + 1 });
    }
  }
  function star(cx, cy, r, n) {
    const out = [];
    for (let i = 0; i < (n || 5) * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / (n || 5), rr = i % 2 ? r * 0.45 : r; out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return out;
  }

  const R = {};

  R.plank = {
    stat(g, p) {
      withBody(g, p.bodies[0], () => {
        const L = p.g.L * S, t = p.g.t * S;
        if (p.def.style === 'metal') g.cr.shape(shapes.rect(-L / 2, -t / 2, L, t), { fill: PAL.silver, stroke: PAL.graphite, w: 3, seed: 4 });
        else woodPlank(g, -L / 2, -t / 2, L, t, (p.def.x1 * 7) | 0);
      });
    }
  };

  R.block = {
    stat(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, w = d.w * S, h = d.h * S, seed = (d.x * 13 + d.y * 7) | 0;
      if (d.style === 'books') books(g, x, y, w, h, seed);
      else if (d.style === 'box') cardboard(g, x, y, w, h, d.text, seed);
      else woodPlank(g, x, y, w, h, seed);
    }
  };

  /* ---------- balls ---------- */
  function ballArt(g, style, r, seed) {
    const cr = g.cr;
    switch (style) {
      case 'tennis':
        cr.shape(shapes.circle(0, 0, r), { fill: PAL.lime, stroke: '#7B8A1C', w: 3, gap: 4, seed });
        cr.line(shapes.arc(-r * 1.08, 0, r * 0.78, -0.95, 0.95, 10), { color: PAL.paper, w: 3.2, seed: seed + 1 });
        cr.line(shapes.arc(r * 1.08, 0, r * 0.78, Math.PI - 0.95, Math.PI + 0.95, 10), { color: PAL.paper, w: 3.2, seed: seed + 2 });
        break;
      case 'marble': {
        cr.shape(shapes.circle(0, 0, r), { fill: PAL.sky, stroke: PAL.navy, w: 2.8, gap: 3.6, seed });
        const sp = [];
        for (let i = 0; i < 14; i++) { const a = i * 0.55, rr = r * (0.12 + i * 0.05); sp.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        cr.line(sp, { color: PAL.navy, w: 2.6, seed: seed + 3 });
        break;
      }
      case 'bowling':
        cr.shape(shapes.circle(0, 0, r), { fill: PAL.plum, stroke: PAL.black, w: 3.2, gap: 3.4, density: 1, seed, cross: true });
        for (const [hx, hy] of [[-0.3, -0.42], [0.08, -0.55], [-0.05, -0.18]]) cr.line([[hx * r, hy * r]], { w: r * 0.24, color: PAL.black, wob: 0 });
        break;
      case 'beach': {
        const cols = [PAL.red, null, PAL.blue, PAL.yellow, null, PAL.green];
        for (let i = 0; i < 6; i++) {
          const a0 = i * Math.PI / 3, a1 = a0 + Math.PI / 3;
          if (cols[i]) {
            const pts = [[0, 0]].concat(shapes.arc(0, 0, r, a0, a1, 6));
            cr.fill(c => { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, a0, a1); c.closePath(); }, CC.bbox(pts), { color: cols[i], gap: 5, angle: a0 + 0.5, seed: seed + i });
          }
          cr.line([[0, 0], [Math.cos(a0) * r, Math.sin(a0) * r]], { color: PAL.graphite, w: 2, seed: seed + i + 9 });
        }
        cr.line(shapes.circle(0, 0, r), { color: PAL.graphite, w: 3, closed: true, seed: seed + 20 });
        cr.shape(shapes.circle(0, 0, r * 0.14, 10), { fill: PAL.paper, stroke: PAL.graphite, w: 2, seed: seed + 21 });
        break;
      }
      case 'steel':
        cr.shape(shapes.circle(0, 0, r), { fill: PAL.silver, stroke: '#4A4A55', w: 3, gap: 3.6, seed, cross: true });
        cr.line([[-r * 0.45, -r * 0.1], [r * 0.45, -r * 0.1]], { color: '#6E6E78', w: 2.2, seed: seed + 1 });
        cr.line([[-r * 0.35, r * 0.3], [r * 0.35, r * 0.3]], { color: '#6E6E78', w: 2.2, seed: seed + 2 });
        break;
      case 'egg': {
        const pts = [];
        for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, s = Math.sin(a); pts.push([Math.cos(a) * r * 0.9, s * r * (s < 0 ? 1.18 : 0.95)]); }
        cr.shape(pts, { fill: '#FFF6E2', stroke: '#B8A07A', w: 2.6, gap: 4, seed, wash: 0.6 });
        for (const [hx, hy] of [[-0.3, -0.35], [0.25, 0.1], [-0.1, 0.4], [0.35, -0.5]]) cr.line([[hx * r, hy * r]], { w: 3, color: '#C9A87A', wob: 0 });
        break;
      }
      case 'meatball': {
        const pts = [];
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = r * (1 + 0.08 * Math.sin(a * 5 + 1.3)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        cr.shape(pts, { fill: '#8C4A26', stroke: PAL.darkbrown, w: 3, gap: 3.8, seed, cross: true });
        for (const [hx, hy, col] of [[-0.35, -0.2, PAL.darkbrown], [0.3, 0.25, PAL.darkbrown], [0.1, -0.45, PAL.green], [-0.2, 0.4, PAL.green]]) cr.line([[hx * r, hy * r]], { w: 4, color: col, wob: 0 });
        break;
      }
      default: // rubber
        cr.shape(shapes.circle(0, 0, r), { fill: PAL.red, stroke: PAL.darkred, w: 3.2, gap: 4.4, seed });
        cr.shape(star(0, 0, r * 0.5), { fill: PAL.yellow, stroke: PAL.gold, w: 2, gap: 3, seed: seed + 4, wob: 0.5 });
    }
  }
  R.ball = {
    live(g, p) {
      if (p.st.gone) return;
      const b = p.bodies[0], r = p.r * S, q = b.getPosition(), st = p.def.style || 'rubber';
      if (p.st.held) {
        // a little wooden peg holds the ball until its signal
        const px = q.x * S + r + 5, py = q.y * S + r * 0.45;
        g.cr.shape(shapes.rect(px - 4, py - 16, 8, 26), { fill: PAL.tan, stroke: PAL.darkbrown, w: 2.2, seed: 3 });
        dot(g, px, py - 16, 9, PAL.red);
      }
      withBody(g, b, () => ballArt(g, st, r, (p.def.x * 10) | 0));
      if (st !== 'bowling' && st !== 'meatball' && st !== 'egg') g.cr.line(shapes.arc(q.x * S, q.y * S, r * 0.64, 3.5, 4.5, 6), { color: PAL.paper, w: Math.max(2.5, r * 0.14), alpha: 0.85, seed: 2 });
    }
  };

  R.crate = {
    live(g, p) {
      const d = p.def;
      withBody(g, p.bodies[0], () => {
        const w = d.w * S, h = d.h * S;
        g.cr.shape(shapes.rect(-w / 2, -h / 2, w, h), { fill: PAL.yellow, stroke: PAL.darkbrown, w: 3, seed: 8 });
        g.cr.text(d.letter || 'A', 0, 2, { size: h * 0.7, font: SKETCH, weight: 700, color: PAL.red, align: 'center' });
      });
    }
  };

  R.dominoes = {
    live(g, p) {
      const w = p.w * S, h = p.h * S;
      p.bodies.forEach((b, i) => withBody(g, b, () => {
        g.cr.shape(shapes.rect(-w / 2, -h / 2, w, h), { fill: DOMINO_COLS[i % DOMINO_COLS.length], stroke: PAL.graphite, w: 2.8, gap: 4.2, angle: 1.2, seed: i * 5 });
        g.cr.line([[-w / 2 + 3, 0], [w / 2 - 3, 0]], { color: PAL.graphite, w: 2, seed: i });
        dot(g, 0, -h / 4, 5, PAL.paper); dot(g, 0, h / 4, 5, PAL.paper);
      }));
    }
  };

  R.seesaw = {
    stat(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, by = p.baseY * S;
      g.cr.shape([[x - 34, by], [x + 34, by], [x, y + 2]], { fill: PAL.green, stroke: PAL.darkgreen, w: 3.2, gap: 5, seed: 6 });
    },
    live(g, p) {
      const L = p.len * S, t = p.t * S;
      withBody(g, p.bodies[0], () => {
        woodPlank(g, -L / 2, -t / 2, L, t, 12, PAL.orange, PAL.darkbrown);
        for (const s of p.def.lips || []) g.cr.shape(shapes.rect(s * (L / 2 - 5) - 5, -t / 2 - 20, 10, 20), { fill: PAL.orange, stroke: PAL.darkbrown, w: 2.4, seed: 9 });
        g.cr.shape(shapes.circle(0, t / 2, 6, 10), { fill: PAL.silver, stroke: PAL.graphite, w: 2, seed: 3 });
      });
    }
  };

  R.pusher = {
    stat(g, p) {
      const d = p.def, dir = p.dir, mx = (d.x - dir * 0.36) * S, my = d.y * S;
      woodPlank(g, mx - 10, my - 26, 20, 52, 5, PAL.tan);
      dot(g, mx, my - 16, 4); dot(g, mx, my + 16, 4);
    },
    live(g, p) {
      const d = p.def, dir = p.dir, gl = p.bodies[0].getPosition();
      const x0 = (d.x - dir * 0.26) * S, x1 = (gl.x - dir * 0.17) * S, y = gl.y * S;
      const zz = [];
      for (let i = 0; i <= 8; i++) zz.push([x0 + (x1 - x0) * i / 8, y + (i === 0 || i === 8 ? 0 : (i % 2 ? -9 : 9))]);
      g.cr.line(zz, { color: PAL.gray, w: 3, seed: 2, wob: 0.4 });
      const c = g.ctx;
      c.save(); c.translate(gl.x * S, y); c.scale(dir, 1);
      g.cr.shape(shapes.rrect(-17, -16, 34, 32, 10), { fill: PAL.red, stroke: PAL.darkred, w: 3, gap: 4, seed: 4 });
      g.cr.shape(shapes.circle(-2, -16, 7, 10), { fill: PAL.red, stroke: PAL.darkred, w: 2.4, seed: 5 });
      g.cr.shape(shapes.rect(-25, -11, 9, 22), { fill: PAL.paper, stroke: PAL.graphite, w: 2.2, seed: 6, wash: 0 });
      g.cr.line([[-21, -10], [-21, 10]], { color: PAL.blue, w: 2.4, seed: 1 });
      c.restore();
    }
  };

  R.gate = {
    live(g, p, sim) {
      const d = p.def, gg = p.g;
      const e = p.st.open ? clamp01((sim.t - p.st.openT) / 0.32) : 0;
      const swing = (1 - Math.pow(1 - e, 3)) * (Math.PI / 2 + 0.12 * Math.sin(e * Math.PI)) * (d.x2 >= d.x1 ? 1 : -1);
      const c = g.ctx, hx = d.x1 * S, hy = d.y1 * S;
      c.save();
      c.translate(hx, hy); c.rotate(swing); c.translate(-hx, -hy);
      c.save(); c.translate(gg.cx * S, gg.cy * S); c.rotate(gg.a);
      const L = gg.L * S, t = gg.t * S;
      woodPlank(g, -L / 2, -t / 2, L, t, 21, PAL.tan);
      g.cr.line([[-L / 2 + 8, -t / 2 + 3], [L / 2 - 8, t / 2 - 3]], { color: PAL.darkbrown, w: 2.2, seed: 3 });
      c.restore();
      c.restore();
      g.cr.shape(shapes.circle(hx, hy + 6, 7, 10), { fill: PAL.silver, stroke: PAL.graphite, w: 2.4, seed: 8 });
    }
  };

  R.button = {
    stat(g, p) {
      withBody(g, p.bodies[0], () => {
        const w = (p.def.w || 0.7) * S;
        g.cr.shape(shapes.rect(-w / 2, -10, w, 10), { fill: PAL.gray, stroke: PAL.graphite, w: 2.6, seed: 4 });
      });
    },
    live(g, p, sim) {
      withBody(g, p.bodies[0], () => {
        const w = (p.def.w || 0.7) * S;
        const k = p.st.pressed ? Math.max(0.35, 1 - (sim.t - p.st.pressT) * 8) : 1;
        const ry = 16 * k, rx = w / 2 - 9;
        const pts = shapes.arc(0, -10, rx, Math.PI, Math.PI * 2, 12).map(([x, y]) => [x, -10 + (y + 10) * ry / rx]);
        g.cr.shape(pts, { fill: PAL.red, stroke: PAL.darkred, w: 2.8, gap: 4, seed: 7 });
      });
    }
  };

  function bellPts(s) {
    const L = [[-0.1, 0.1], [-0.16, 0.16], [-0.2, 0.28], [-0.23, 0.42], [-0.29, 0.53], [-0.38, 0.62]];
    return L.map(([x, y]) => [x * s, y * s]).concat(L.slice().reverse().map(([x, y]) => [-x * s, y * s]));
  }
  R.bell = {
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, s = (p.size || 1) * S, c = g.ctx;
      if (d.hang) {
        g.cr.line([[x, 8], [x + 1, y]], { color: PAL.graphite, w: 2, seed: 4 });
        g.cr.shape(shapes.circle(x, 10, 8, 10), { fill: PAL.red, stroke: PAL.darkred, w: 2, seed: 2 });
      }
      let ang = 0;
      if (p.st.ringT != null) { const k = sim.t - p.st.ringT; ang = (p.st.ringAmp || 0.6) * 0.45 * Math.sin(k * 17) * Math.exp(-k * 1.7); }
      c.save(); c.translate(x, y); c.rotate(ang);
      g.cr.line(shapes.circle(0, 0.06 * s, 0.05 * s, 8), { color: PAL.gold, w: 3, closed: true, seed: 5 });
      g.cr.shape(bellPts(s), { fill: PAL.yellow, stroke: PAL.gold, w: 3.4, gap: 4.5, angle: 1.4, seed: 7 });
      g.cr.line([[-0.36 * s, 0.6 * s], [0, 0.63 * s], [0.36 * s, 0.6 * s]], { color: PAL.gold, w: 3, seed: 8 });
      g.cr.line([[-0.1 * s, 0.24 * s], [-0.15 * s, 0.46 * s]], { color: PAL.paper, w: 4, alpha: 0.9, seed: 9 });
      dot(g, 0, 0.66 * s, 0.1 * s, PAL.darkbrown);
      c.restore();
    }
  };

  R.cup = {
    stat(g, p) { if (!p.def.move) cupArt(g, p, p.def.x * S, p.def.y * S); },
    live(g, p, sim) {
      const d = p.def;
      if (d.move) { const q = p.bodies[0].getPosition(); cupArt(g, p, q.x * S, q.y * S); }
      if (p.st.gotT != null && sim.t - p.st.gotT < 0.6) {
        const q = p.bodies[0].getPosition(), k = (sim.t - p.st.gotT) / 0.6;
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.35, r0 = 20 + k * 50;
          g.cr.line([[q.x * S + Math.cos(a) * r0, (q.y - p.h) * S + Math.sin(a) * r0], [q.x * S + Math.cos(a) * (r0 + 16), (q.y - p.h) * S + Math.sin(a) * (r0 + 16)]], { color: PAL.gold, w: 4, alpha: 1 - k, seed: i });
        }
      }
    }
  };
  function cupArt(g, p, x, y) {
    {
      const d = p.def, w = p.w * S, h = p.h * S, cr = g.cr;
      if (d.move) {
        for (const sx of [-w / 2 + 16, w / 2 - 16]) { cr.shape(shapes.circle(x + sx, y + 2, 9, 10), { fill: PAL.gray, stroke: PAL.graphite, w: 2.2, seed: 3 }); }
      }
      if (d.style === 'nest') {
        cr.shape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 14, y], [x - w / 2 + 14, y]], { fill: '#B9854E', stroke: PAL.darkbrown, w: 3, gap: 5, angle: 0.5, seed: 21, cross: true });
        const r = rng(5);
        for (let i = 0; i < 14; i++) { const yy = y - h + r() * h, x0 = x - w / 2 + r() * w * 0.5; cr.line([[x0, yy], [x0 + w * 0.5, yy + (r() - 0.5) * 12]], { color: i % 2 ? PAL.darkbrown : '#D9A566', w: 2.4, seed: i, alpha: 0.9 }); }
        if (d.back) { const bh = (d.back === 'left' ? p.hl : p.hr) * S, bx = d.back === 'left' ? x - w / 2 : x + w / 2 - 10; woodPlank(g, bx, y - bh, 10, bh, 31, PAL.tan); }
        return;
      }
      if (d.back) {
        const bh = (d.back === 'left' ? p.hl : p.hr) * S, bx = d.back === 'left' ? x - w / 2 : x + w / 2 - 10;
        woodPlank(g, bx, y - bh, 10, bh, 31, PAL.tan);
      }
      if (d.style === 'bucket') {
        cr.shape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 8, y], [x - w / 2 + 8, y]], { fill: PAL.silver, stroke: PAL.graphite, w: 3.2, gap: 5, angle: 1.3, seed: 12 });
        cr.line([[x - w / 2 + 3, y - h * 0.62], [x + w / 2 - 3, y - h * 0.62]], { color: PAL.gray, w: 2.4, seed: 1 });
        cr.line([[x - w / 2 + 6, y - h * 0.25], [x + w / 2 - 6, y - h * 0.25]], { color: PAL.gray, w: 2.4, seed: 2 });
        cr.line(shapes.arc(x, y - h, w / 2 - 4, Math.PI + 0.25, Math.PI * 2 - 0.25, 12), { color: PAL.graphite, w: 2.4, seed: 3 });
      } else if (d.style === 'bowl') {
        cr.shape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 12, y - 6], [x + w / 2 - 22, y], [x - w / 2 + 22, y], [x - w / 2 + 12, y - 6]], { fill: PAL.red, stroke: PAL.darkred, w: 3, gap: 4.5, seed: 14 });
        // fish doodle
        const fx = x, fy = y - h * 0.45;
        cr.line(shapes.ellipse(fx, fy, 11, 6, 12), { color: PAL.paper, w: 2.2, closed: true, seed: 3 });
        cr.line([[fx + 10, fy], [fx + 18, fy - 6], [fx + 18, fy + 6], [fx + 10, fy]], { color: PAL.paper, w: 2.2, seed: 4 });
      } else {
        // woven basket: tan body, vertical ribs, wavy weave rows, fat rim
        const body = [[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 - 4, y - 10], [x + w / 2 - 14, y], [x - w / 2 + 14, y], [x - w / 2 + 4, y - 10]];
        cr.shape(body, { fill: '#E2B26E', stroke: PAL.darkbrown, w: 3, gap: 6, angle: 0.2, seed: 16 });
        const ribs = Math.max(4, Math.round(w / 18));
        for (let i = 1; i < ribs; i++) { const rx = x - w / 2 + w * i / ribs; cr.line([[rx, y - h + 6], [rx + 1, y - 3]], { color: PAL.brown, w: 2, alpha: 0.75, seed: i }); }
        for (let yy = y - h + 16; yy < y - 6; yy += 13) {
          const row = [];
          for (let xx = x - w / 2 + 4; xx <= x + w / 2 - 4; xx += 9) row.push([xx, yy + ((xx / 9) % 2 < 1 ? -2.5 : 2.5)]);
          cr.line(row, { color: PAL.darkbrown, w: 2.2, alpha: 0.8, seed: yy | 0, wob: 0.3 });
        }
        cr.shape(shapes.rrect(x - w / 2 - 5, y - h - 6, w + 10, 12, 6), { fill: PAL.brown, stroke: PAL.darkbrown, w: 2.6, gap: 4, seed: 5 });
      }
    }
  }

  R.balloon = {
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, r = p.r * S, cr = g.cr;
      const tie = d.tie ? [d.tie[0] * S, d.tie[1] * S] : [x, y + r * 3];
      cr.shape(shapes.rect(tie[0] - 14, tie[1] - 22, 28, 22), { fill: PAL.blue, stroke: PAL.navy, w: 2.4, seed: 5 });
      if (!p.st.popped) {
        const sway = Math.sin(g.t * 1.4) * 3;
        const kx = x + sway, ky = y + r * 1.1;
        const str = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10; str.push([kx + (tie[0] - kx) * u + Math.sin(u * 9 + g.t) * 5 * (1 - u), ky + (tie[1] - 22 - ky) * u]); }
        cr.line(str, { color: PAL.graphite, w: 1.8, seed: 3 });
        cr.shape(shapes.ellipse(x + sway, y, r * 0.95, r * 1.1, 26), { fill: PAL.red, stroke: PAL.darkred, w: 3, gap: 4.6, seed: 9 });
        cr.shape([[kx - 6, ky + 8], [kx + 6, ky + 8], [kx, ky - 2]], { fill: PAL.red, stroke: PAL.darkred, w: 2, seed: 2 });
        cr.line(shapes.arc(x + sway - r * 0.28, y - r * 0.3, r * 0.45, 3.4, 4.4, 6), { color: PAL.paper, w: 5, alpha: 0.9, seed: 4 });
      } else {
        const k = sim.t - p.st.popT;
        const limp = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8; limp.push([tie[0] + Math.sin(u * 7) * 6, tie[1] - 22 - 60 * (1 - u) * Math.max(0.2, 1 - k)]); }
        cr.line(limp, { color: PAL.graphite, w: 1.8, seed: 6 });
        if (k < 0.7) {
          const a = 1 - k / 0.7;
          for (let i = 0; i < 10; i++) {
            const ang = i / 10 * Math.PI * 2, r0 = r * (0.4 + k * 1.6), r1 = r0 + 22;
            cr.line([[x + Math.cos(ang) * r0, y + Math.sin(ang) * r0], [x + Math.cos(ang) * r1, y + Math.sin(ang) * r1]], { color: i % 2 ? PAL.red : PAL.orange, w: 4, alpha: a, seed: i });
          }
        }
      }
    }
  };

  R.lamp = {
    live(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr, on = !!p.st.on;
      if (on) {
        cr.fill(c => { c.beginPath(); c.moveTo(x - 58, y - 128); c.lineTo(x - 18, y - 118); c.lineTo(x + 70, y - 4); c.lineTo(x - 150, y - 4); c.closePath(); }, [x - 150, y - 128, 220, 124], { color: PAL.yellow, gap: 7, alpha: 0.55, angle: 1.2, seed: 3 });
        for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.35; cr.line([[x - 40 + Math.cos(a) * 26, y - 128 + Math.sin(a) * 26], [x - 40 + Math.cos(a) * 42, y - 128 + Math.sin(a) * 42]], { color: PAL.gold, w: 3, seed: i }); }
      }
      cr.shape(shapes.ellipse(x, y - 6, 30, 7, 16), { fill: PAL.green, stroke: PAL.darkgreen, w: 2.6, seed: 4 });
      cr.line([[x, y - 10], [x + 18, y - 80], [x - 22, y - 118]], { color: PAL.darkgreen, w: 5, seed: 5 });
      dot(g, x + 18, y - 80, 9, PAL.darkgreen);
      cr.shape([[x - 22, y - 134], [x - 2, y - 118], [x - 38, y - 90], [x - 62, y - 112]], { fill: PAL.green, stroke: PAL.darkgreen, w: 2.8, gap: 4.5, seed: 6 });
      cr.shape(shapes.circle(x - 46, y - 101, 9, 10), { fill: on ? PAL.yellow : PAL.silver, stroke: on ? PAL.gold : PAL.gray, w: 2.2, seed: 7 });
    }
  };

  R.fan = {
    stat(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S;
      if (p.dv[0]) {
        g.cr.line([[x, y + 30], [x, CC.K.FLOOR_Y * S - 4]], { color: PAL.graphite, w: 5, seed: 2 });
        g.cr.shape(shapes.ellipse(x, CC.K.FLOOR_Y * S - 6, 26, 6, 12), { fill: PAL.gray, stroke: PAL.graphite, w: 2.4, seed: 3 });
      }
    },
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr, on = !!p.st.on;
      const spin = on ? Math.pow(Math.min(1, (sim.t - (p.st.onT || 0)) / 0.8), 2) : 0;
      const ang = on ? (sim.t - (p.st.onT || 0)) * 22 * spin : 0.3;
      if (on) {
        const R2 = p.region;
        for (let i = 0; i < 6; i++) {
          const along = ((g.t * 1.1 + i * 0.37) % 1);
          const span = p.dv[0] ? (R2.x1 - R2.x0) : (R2.y1 - R2.y0);
          const alpha = Math.sin(along * Math.PI) * 0.7;
          const wv = [];
          for (let k = 0; k <= 6; k++) {
            const s = along * span * S + k * 11;
            const lat = (i + 0.5) / 6 * (p.dv[0] ? (R2.y1 - R2.y0) : (R2.x1 - R2.x0)) * S + Math.sin(k * 1.3 + i) * 4;
            wv.push(p.dv[0] ? [(p.dv[0] > 0 ? R2.x0 * S + s : R2.x1 * S - s), R2.y0 * S + lat] : [R2.x0 * S + lat, (p.dv[1] > 0 ? R2.y0 * S + s : R2.y1 * S - s)]);
          }
          cr.line(wv, { color: PAL.sky, w: 3, alpha, seed: i });
        }
      }
      cr.shape(shapes.circle(x, y, 42, 20), { fill: PAL.paper, stroke: PAL.graphite, w: 3.2, seed: 5, wash: 0.2 });
      for (let i = 0; i < 3; i++) {
        const a = ang + i * Math.PI * 2 / 3;
        const bx = x + Math.cos(a) * 19, by = y + Math.sin(a) * 19;
        cr.shape(shapes.ellipse(0, 0, 17, 8, 12).map(([px, py]) => [bx + px * Math.cos(a) - py * Math.sin(a), by + px * Math.sin(a) + py * Math.cos(a)]), { fill: PAL.blue, stroke: PAL.navy, w: 2, gap: 3.5, seed: 6 + i });
      }
      dot(g, x, y, 10, PAL.graphite);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; cr.line([[x + Math.cos(a) * 12, y + Math.sin(a) * 12], [x + Math.cos(a) * 41, y + Math.sin(a) * 41]], { color: PAL.gray, w: 1.4, alpha: 0.7, seed: i }); }
    }
  };

  R.trampoline = {
    live(g, p, sim) {
      const w = p.w * S, cr = g.cr;
      const k = p.st.bounceT != null ? Math.exp(-(sim.t - p.st.bounceT) * 14) : 0;
      const dip = 9 * k;
      const b = p.bodies[0], q = b.getPosition(), a = b.getAngle(), ca = Math.cos(a), sa = Math.sin(a);
      const floorY = p.def.y * S;
      for (const sx of [-1, 1]) {
        const lx = sx * (w / 2 - 10), ly = -42;
        const X = q.x * S + lx * ca - ly * sa, Y = q.y * S + lx * sa + ly * ca;
        cr.line([[X, Y], [X - sx * 5, floorY]], { color: PAL.graphite, w: 4, seed: sx + 3 });
        cr.line([[X - sx * 5 - 10, floorY - 1], [X - sx * 5 + 10, floorY - 1]], { color: PAL.graphite, w: 4, seed: sx + 5 });
      }
      withBody(g, b, () => {
        for (let i = 0; i < 6; i++) {
          const x = -w / 2 + 14 + i * (w - 28) / 5;
          cr.line([[x, -50 + dip], [x - 4, -43], [x + 4, -38], [x, -34]], { color: PAL.gray, w: 1.8, seed: i });
        }
        cr.shape([[-w / 2, -50], [0, -50 + dip * 1.4], [w / 2, -50], [w / 2, -40], [0, -40 + dip * 1.4], [-w / 2, -40]], { fill: PAL.blue, stroke: PAL.navy, w: 2.8, gap: 4, seed: 7 });
      });
    }
  };

  R.conveyor = {
    live(g, p) {
      const d = p.def, x0 = d.x1 * S, x1 = d.x2 * S, y = d.y * S, h = 32, cr = g.cr;
      cr.shape(shapes.rrect(x0, y, x1 - x0, h, 16), { fill: PAL.silver, stroke: PAL.graphite, w: 3.4, gap: 6, seed: 4, wash: 0.2 });
      const ph = (p.st.phase || 0) * S;
      const n = Math.max(2, Math.round((x1 - x0) / 90));
      for (let i = 0; i <= n; i++) {
        const cx = x0 + 16 + (x1 - x0 - 32) * i / n, cy = y + h / 2, a = ph / 11;
        cr.line(shapes.circle(cx, cy, 11, 10), { color: PAL.graphite, w: 2.2, closed: true, seed: i });
        cr.line([[cx - Math.cos(a) * 9, cy - Math.sin(a) * 9], [cx + Math.cos(a) * 9, cy + Math.sin(a) * 9]], { color: PAL.graphite, w: 2, seed: i + 7 });
      }
      for (let s = ((ph % 34) + 34) % 34; s < x1 - x0 - 20; s += 34) cr.line([[x0 + 10 + s, y + 2], [x0 + 22 + s, y + 2]], { color: PAL.graphite, w: 3, seed: s | 0 });
    }
  };

  R.car = {
    live(g, p, sim) {
      const [ch, w1, w2] = p.bodies, dir = p.dir, cr = g.cr;
      withBody(g, ch, c => {
        c.scale(dir, 1);
        cr.line([[50, -8], [50, -72]], { color: PAL.graphite, w: 3, seed: 2 });
        cr.shape([[50, -72], [80, -64], [50, -56]], { fill: PAL.yellow, stroke: PAL.gold, w: 2.2, seed: 3 });
        cr.shape([[-24, -14], [-14, -42], [18, -42], [30, -14]], { fill: PAL.red, stroke: PAL.darkred, w: 3, gap: 4.5, seed: 4 });
        cr.shape([[-14, -16], [-8, -36], [6, -36], [6, -16]], { fill: PAL.sky, stroke: PAL.darkred, w: 2, seed: 5, gap: 3.5 });
        cr.shape([[11, -16], [11, -36], [15, -36], [23, -16]], { fill: PAL.sky, stroke: PAL.darkred, w: 2, seed: 6, gap: 3.5 });
        cr.shape(shapes.rrect(-46, -16, 92, 30, 9), { fill: PAL.red, stroke: PAL.darkred, w: 3, gap: 4.5, seed: 7 });
        dot(g, 41, -6, 9, PAL.yellow);
        const turn = p.st.go && !p.st.spent ? Math.cos(sim.t * 9) : 1;
        c.save(); c.translate(-50, -14); c.scale(turn, 1);
        cr.line([[0, 0], [-12, 0]], { color: PAL.gray, w: 3, seed: 1 });
        cr.line(shapes.circle(-17, -5, 5, 8), { color: PAL.gray, w: 2.6, closed: true, seed: 2 });
        cr.line(shapes.circle(-17, 5, 5, 8), { color: PAL.gray, w: 2.6, closed: true, seed: 3 });
        c.restore();
      });
      for (const wb of [w1, w2]) withBody(g, wb, () => {
        const r = p.r * S;
        cr.shape(shapes.circle(0, 0, r, 14), { fill: PAL.black, stroke: PAL.black, w: 3, gap: 3.4, seed: 9 });
        cr.shape(shapes.circle(0, 0, r * 0.42, 10), { fill: PAL.silver, stroke: PAL.gray, w: 2, seed: 10 });
        cr.line([[-r * 0.4, 0], [r * 0.4, 0]], { color: PAL.gray, w: 2, seed: 11 });
      });
    }
  };

  R.cannon = {
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr, c = g.ctx;
      const rec = p.st.fireT != null ? 12 * Math.exp(-(sim.t - p.st.fireT) * 7) : 0;
      c.save(); c.translate(p.pivot[0] * S, p.pivot[1] * S); c.rotate(p.ang); c.translate(-rec, 0);
      cr.shape(shapes.rrect(-26, -17, 104, 34, 12), { fill: PAL.black, stroke: PAL.black, w: 3, gap: 3.5, seed: 4 });
      cr.shape(shapes.rect(70, -21, 12, 42), { fill: PAL.gray, stroke: PAL.black, w: 2.4, seed: 5 });
      cr.line([[-22, -14], [-32, -30], [-26, -38]], { color: PAL.brown, w: 2.4, seed: 6 });
      if (p.st.fireT == null) dot(g, -26, -39, 7, PAL.orange);
      c.restore();
      cr.shape([[x - 42, y - 40], [x + 42, y - 40], [x + 36, y], [x - 36, y]], { fill: PAL.wood, stroke: PAL.darkbrown, w: 3, gap: 5, seed: 7 });
      for (const sx of [-26, 26]) {
        cr.shape(shapes.circle(x + sx, y - 14, 15, 12), { fill: PAL.tan, stroke: PAL.darkbrown, w: 2.6, seed: 8 + sx });
        dot(g, x + sx, y - 14, 6, PAL.darkbrown);
      }
    }
  };

  R.cat = {
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr, awake = sim.won;
      const breathe = Math.sin(g.t * 2) * 1.5;
      // tail
      cr.line([[x - 58, y - 16], [x - 82, y - 30], [x - 84, y - 58], [x - 70, y - 70 + (awake ? Math.sin(g.t * 8) * 6 : 0)]], { color: PAL.orange, w: 12, seed: 3 });
      cr.shape(shapes.ellipse(x, y - 30 - breathe / 2, 64, 30 + breathe, 22), { fill: PAL.orange, stroke: '#B45A10', w: 3.2, gap: 5, seed: 4 });
      for (let i = 0; i < 3; i++) cr.line([[x - 30 + i * 22, y - 56], [x - 24 + i * 22, y - 38], [x - 30 + i * 22, y - 22]], { color: '#B45A10', w: 3, seed: 5 + i });
      const hx = x + 52, hy = awake ? y - 78 : y - 46;
      cr.shape([[hx - 24, hy - 14], [hx - 18, hy - 42], [hx - 4, hy - 22]], { fill: PAL.orange, stroke: '#B45A10', w: 2.6, seed: 8 });
      cr.shape([[hx + 4, hy - 22], [hx + 18, hy - 42], [hx + 24, hy - 14]], { fill: PAL.orange, stroke: '#B45A10', w: 2.6, seed: 9 });
      cr.shape(shapes.circle(hx, hy, 28, 18), { fill: PAL.orange, stroke: '#B45A10', w: 3, gap: 5, seed: 10 });
      if (awake) {
        dot(g, hx - 10, hy - 4, 9, PAL.graphite); dot(g, hx + 10, hy - 4, 9, PAL.graphite);
        dot(g, hx - 8, hy - 6, 3, PAL.paper); dot(g, hx + 12, hy - 6, 3, PAL.paper);
        cr.line([[hx - 7, hy + 9], [hx, hy + 14], [hx + 7, hy + 9]], { color: PAL.graphite, w: 2.4, seed: 11 });
        const hy2 = hy - 50 - ((g.t * 30) % 40);
        cr.text('♥', hx + 30, hy2, { size: 34, color: PAL.pink, align: 'center' });
      } else {
        cr.line(shapes.arc(hx - 10, hy - 2, 6, 0.2, Math.PI - 0.2, 5), { color: PAL.graphite, w: 2.4, seed: 12 });
        cr.line(shapes.arc(hx + 10, hy - 2, 6, 0.2, Math.PI - 0.2, 5), { color: PAL.graphite, w: 2.4, seed: 13 });
        for (let i = 0; i < 3; i++) {
          const u = ((g.t * 0.5 + i / 3) % 1);
          const c = g.ctx, sc = 0.55 + u * 0.55;
          c.save(); c.translate(hx + 6 - u * 22, hy - 38 - u * 64); c.scale(sc, sc);
          cr.text('z', 0, 0, { size: 32, color: PAL.blue, alpha: Math.sin(u * Math.PI), font: SKETCH, weight: 700 });
          c.restore();
        }
      }
      for (const s of [-1, 1]) cr.line([[hx + s * 14, hy + 6], [hx + s * 34, hy + 2 + (s > 0 ? 0 : 1)]], { color: PAL.graphite, w: 1.4, seed: s + 20 });
    }
  };

  R.nodraw = {
    stat(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, w = d.w * S, h = d.h * S, cr = g.cr;
      cr.fill(c => { c.beginPath(); c.rect(x, y, w, h); }, [x, y, w, h], { color: PAL.red, gap: 16, angle: -0.8, alpha: 0.2, wash: 0.05, density: 0.6, seed: (x + y) | 0 });
      const edge = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
      for (let i = 0; i < 4; i++) {
        const a = edge[i], b = edge[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.floor(L / 26));
        for (let k = 0; k < n; k++) {
          const u0 = k / n, u1 = u0 + 0.55 / n;
          cr.line([[a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0], [a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1]], { color: PAL.red, w: 2.6, alpha: 0.75, seed: i * 31 + k, over: false });
        }
      }
      const ix = x + 24, iy = y + 24;
      cr.line(shapes.circle(ix, iy, 13, 12), { color: PAL.red, w: 3, closed: true, seed: 3 });
      cr.line([[ix - 9, iy + 9], [ix + 9, iy - 9]], { color: PAL.red, w: 3, seed: 4 });
    }
  };

  R.note = {
    stat(g, p) {
      const d = p.def;
      g.cr.text(d.text, d.x * S, d.y * S, { size: d.size || 30, rot: d.rot || 0, color: PAL.graphite });
    }
  };

  R.arrow = {
    stat(g, p) {
      const P = p.def.pts.map(([x, y]) => [x * S, y * S]);
      g.cr.line(P, { color: PAL.graphite, w: 3, seed: 7 });
      const a = P[P.length - 1], b = P[P.length - 2], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      g.cr.line([[a[0] - Math.cos(ang - 0.5) * 16, a[1] - Math.sin(ang - 0.5) * 16], a, [a[0] - Math.cos(ang + 0.5) * 16, a[1] - Math.sin(ang + 0.5) * 16]], { color: PAL.graphite, w: 3, seed: 8 });
    }
  };

  R.wire = {
    stat(g, p) {
      const [x0, y0] = p.def.from.map(v => v * S), [x1, y1] = p.def.to.map(v => v * S);
      const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 40;
      const pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1]); }
      for (let i = 0; i < 24; i += 2) g.cr.line([pts[i], pts[i + 1]], { color: PAL.gray, w: 2.2, alpha: 0.8, seed: i, over: false });
      dot(g, x0, y0, 7, PAL.gray); dot(g, x1, y1, 7, PAL.gray);
    }
  };

  R.deco = {
    stat(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, s = d.s || 1, cr = g.cr;
      if (d.kind === 'sun') {
        cr.shape(shapes.circle(x, y, 44 * s, 18), { fill: PAL.yellow, stroke: PAL.orange, w: 3.4, gap: 5, seed: 3 });
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.2; cr.line([[x + Math.cos(a) * 58 * s, y + Math.sin(a) * 58 * s], [x + Math.cos(a) * 80 * s, y + Math.sin(a) * 80 * s]], { color: PAL.orange, w: 3.4, seed: i }); }
      } else if (d.kind === 'cloud') {
        const blobs = [[-50, 8, 30], [-18, -10, 38], [24, -4, 34], [56, 10, 26], [4, 16, 30]];
        for (const [bx, by, br] of blobs) cr.fill(c => { c.beginPath(); c.arc(x + bx * s, y + by * s, br * s, 0, Math.PI * 2); }, [x + (bx - br) * s, y + (by - br) * s, br * 2 * s, br * 2 * s], { color: PAL.sky, gap: 7, alpha: 0.35, wash: 0.1, seed: bx });
        // scalloped outline: a row of bumps over a flat-ish bottom
        const out = [];
        const bumps = [[-56, 6, 26], [-22, -14, 34], [18, -20, 36], [54, 0, 28]];
        for (const [bx, by, br] of bumps) for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI; out.push([x + (bx + Math.cos(a) * br) * s, y + (by + Math.sin(a) * br) * s]); }
        out.push([x + 80 * s, y + 24 * s], [x - 80 * s, y + 26 * s]);
        cr.line(out, { color: PAL.sky, w: 3.2, seed: 5, closed: true });
      }
    }
  };

  /* ---------- live-level parts ---------- */
  R.dispenser = {
    live(g, p, sim) {
      const d = p.def, cr = g.cr, c = g.ctx;
      const since = p.st.dropT != null ? sim.t - p.st.dropT : 9;
      const left = Math.max(0, (d.count || 0) - (p.st.n || 0));
      if (d.kind === 'hen') {
        const hx = (p.st.hx != null ? p.st.hx : d.x1) * S, hy = d.y * S, face = p.st.face || 1;
        const bob = sim.running ? Math.abs(Math.sin(sim.t * 7)) * 3 : 0;
        c.save(); c.translate(hx, hy - bob); c.scale(face, 1);
        cr.line([[-8, -2], [-10, 6]], { color: PAL.orange, w: 3, seed: 1 }); cr.line([[6, -2], [8, 6]], { color: PAL.orange, w: 3, seed: 2 });
        cr.shape(shapes.ellipse(0, -26, 30, 22, 18), { fill: PAL.paper, stroke: PAL.graphite, w: 3, gap: 5, seed: 3, wash: 0.8 });
        cr.shape([[-28, -34], [-44, -44], [-36, -26]], { fill: PAL.paper, stroke: PAL.graphite, w: 2.6, seed: 4, wash: 0.8 });
        cr.shape(shapes.circle(22, -50, 14, 12), { fill: PAL.paper, stroke: PAL.graphite, w: 3, seed: 5, wash: 0.8 });
        cr.shape([[16, -62], [20, -74], [26, -64], [30, -72], [32, -60]], { fill: PAL.red, stroke: PAL.darkred, w: 2.2, seed: 6 });
        cr.shape([[34, -52], [46, -48], [34, -44]], { fill: PAL.orange, stroke: '#B45A10', w: 2, seed: 7 });
        dot(g, 26, -53, 5, PAL.graphite);
        cr.line([[-10, -26], [4, -20], [12, -30]], { color: PAL.graphite, w: 2, seed: 8, alpha: 0.6 });
        c.restore();
        if (since < 0.5) cr.text('cluck!', hx + 30, hy - 90, { size: 26, color: PAL.graphite, font: SKETCH, weight: 700 });
        return;
      }
      if (d.kind === 'cannon') {
        const a = (d.angle != null ? d.angle : -45) * Math.PI / 180, rec = since < 1 ? 12 * Math.exp(-since * 7) : 0;
        const x = d.x * S, y = d.y * S;
        c.save(); c.translate(x, y - 50); c.rotate(a); c.translate(-rec, 0);
        cr.shape(shapes.rrect(-26, -17, 104, 34, 12), { fill: PAL.black, stroke: PAL.black, w: 3, gap: 3.5, seed: 4 });
        cr.shape(shapes.rect(70, -21, 12, 42), { fill: PAL.gray, stroke: PAL.black, w: 2.4, seed: 5 });
        c.restore();
        cr.shape([[x - 42, y - 40], [x + 42, y - 40], [x + 36, y], [x - 36, y]], { fill: PAL.wood, stroke: PAL.darkbrown, w: 3, gap: 5, seed: 7 });
        for (const sx of [-26, 26]) { cr.shape(shapes.circle(x + sx, y - 14, 15, 12), { fill: PAL.tan, stroke: PAL.darkbrown, w: 2.6, seed: 8 + sx }); dot(g, x + sx, y - 14, 6, PAL.darkbrown); }
        cr.text('x' + left, x, y - 104, { size: 24, color: PAL.graphite, align: 'center', font: SKETCH, weight: 700 });
        return;
      }
      // pipe from the top of the sheet; one mouth per drop spot
      const xs = d.xs || [0];
      const uniq = [...new Set(xs)];
      uniq.forEach((ox, i) => {
        const x = (d.x + ox) * S, y = d.y * S - 26;
        cr.shape(shapes.rect(x - 22, -10, 44, y + 10), { fill: PAL.silver, stroke: PAL.graphite, w: 3, gap: 6, angle: 1.5, seed: 11 + i });
        cr.shape(shapes.rect(x - 30, y - 6, 60, 16), { fill: PAL.gray, stroke: PAL.graphite, w: 3, gap: 4, seed: 13 + i });
        cr.line([[x - 8, 10], [x - 8, y - 10]], { color: PAL.paper, w: 3, alpha: 0.7, seed: 15 + i });
        if (since < 0.35 && Math.abs(((p.st.n - 1) % xs.length + xs.length) % xs.length - xs.indexOf(ox)) < 0.5) {
          for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + (k - 2) * 0.4; cr.line([[x + Math.cos(a) * 18, y + 14 + Math.sin(a) * 8], [x + Math.cos(a) * 30, y + 14 + Math.sin(a) * 22]], { color: PAL.gray, w: 2.4, alpha: 1 - since / 0.35, seed: k }); }
        }
      });
      cr.text('x' + left, (d.x + uniq[0]) * S + 38, d.y * S - 20, { size: 24, color: PAL.graphite, font: SKETCH, weight: 700 });
    }
  };

  R.lava = {
    live(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, w = d.w * S, cr = g.cr, t = g.t;
      const top = d.floor ? FLOOR - 12 : y;
      const bottom = d.floor ? 900 : y + d.h * S;
      cr.fill(c => { c.beginPath(); c.rect(x, top, w, bottom - top); }, [x, top, w, bottom - top], { color: PAL.orange, gap: 5, angle: 0.1, seed: 3, wash: 0.5 });
      cr.fill(c => { c.beginPath(); c.rect(x, top + 10, w, bottom - top - 10); }, [x, top, w, bottom - top], { color: PAL.red, gap: 7, angle: -0.3, seed: 4, alpha: 0.6, wash: 0 });
      const n = Math.max(3, Math.round(w / 55));
      for (let i = 0; i < n; i++) {
        const fx = x + (i + 0.5) * w / n, hgt = 12 + 9 * Math.sin(t * 5 + i * 1.7);
        cr.shape([[fx - 14, top + 4], [fx - 4, top - hgt * 0.6], [fx, top - hgt], [fx + 5, top - hgt * 0.5], [fx + 14, top + 4]], { fill: i % 2 ? PAL.yellow : PAL.orange, stroke: PAL.red, w: 2, gap: 3, seed: i });
      }
    }
  };

  R.star = {
    live(g, p, sim) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr;
      if (p.st.got) {
        const k = sim.t - p.st.gotT;
        if (k > 0.7) return;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r0 = 10 + k * 70; cr.line([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + 14), y + Math.sin(a) * (r0 + 14)]], { color: PAL.gold, w: 4, alpha: 1 - k / 0.7, seed: i }); }
        return;
      }
      const c = g.ctx;
      c.save(); c.translate(x, y); c.rotate(Math.sin(g.t * 1.5 + d.x) * 0.25);
      const s = 1 + 0.08 * Math.sin(g.t * 4 + d.y);
      c.scale(s, s);
      cr.shape(star(0, 0, 30), { fill: PAL.yellow, stroke: PAL.gold, w: 3, gap: 4, seed: 9 });
      c.restore();
    }
  };

  R.flag = {
    live(g, p) {
      const d = p.def, x = d.x * S, y = d.y * S, cr = g.cr, t = g.t;
      cr.line([[x, y], [x, y - 150]], { color: PAL.graphite, w: 4, seed: 2 });
      const pts = [];
      for (let i = 0; i <= 6; i++) pts.push([x + i * 12, y - 148 + Math.sin(t * 5 + i) * 4]);
      for (let i = 6; i >= 0; i--) pts.push([x + i * 12, y - 108 + Math.sin(t * 5 + i) * 4]);
      cr.shape(pts, { fill: PAL.paper, stroke: PAL.graphite, w: 2.6, seed: 3, wash: 0.9 });
      for (let r = 0; r < 2; r++) for (let cc = 0; cc < 3; cc++) {
        const x0 = x + cc * 24 + (r % 2) * 12, y0 = y - 148 + r * 20 + Math.sin(t * 5 + cc * 2) * 4;
        g.ctx.save(); g.ctx.fillStyle = cr.pat(PAL.graphite, 0); g.ctx.fillRect(x0, y0, 12, 20); g.ctx.restore();
      }
    }
  };

  /* ---------- bosses ---------- */
  function face(g, x, y, s, o) {
    const cr = g.cr;
    if (o.dead) {
      for (const ex of [-1, 1]) { cr.line([[x + ex * 16 * s - 7, y - 7], [x + ex * 16 * s + 7, y + 7]], { color: PAL.graphite, w: 3.4, seed: ex }); cr.line([[x + ex * 16 * s + 7, y - 7], [x + ex * 16 * s - 7, y + 7]], { color: PAL.graphite, w: 3.4, seed: ex + 3 }); }
      cr.line(shapes.arc(x, y + 30 * s, 12 * s, Math.PI + 0.3, Math.PI * 2 - 0.3, 8), { color: PAL.graphite, w: 3, seed: 5 });
      return;
    }
    if (o.hurt) {
      for (const ex of [-1, 1]) cr.line([[x + ex * 22 * s, y - 6], [x + ex * 10 * s, y], [x + ex * 22 * s, y + 6]], { color: PAL.graphite, w: 3.4, seed: ex + 7 });
      cr.shape(shapes.ellipse(x, y + 26 * s, 12 * s, 9 * s, 12), { fill: PAL.darkred, stroke: PAL.graphite, w: 2.6, seed: 8 });
      return;
    }
    for (const ex of [-1, 1]) {
      cr.shape(shapes.circle(x + ex * 16 * s, y, 11 * s, 12), { fill: PAL.paper, stroke: PAL.graphite, w: 2.6, seed: ex + 9, wash: 0.9 });
      dot(g, x + ex * 16 * s + (o.look || 0) * 3, y + 2, 9 * s, PAL.graphite);
      cr.line([[x + ex * 30 * s, y - 20 * s], [x + ex * 6 * s, y - 13 * s]], { color: PAL.graphite, w: 4, seed: ex + 11 });
    }
    const m = o.mouth || 'grin', my = y + 26 * s;
    if (m === 'none') return;
    if (m === 'teeth') {
      cr.shape([[x - 24 * s, my - 6], [x + 24 * s, my - 6], [x + 18 * s, my + 12], [x - 18 * s, my + 12]], { fill: PAL.darkred, stroke: PAL.graphite, w: 2.6, seed: 12 });
      for (let i = -2; i <= 2; i++) cr.shape([[x + i * 9 * s - 4, my - 6], [x + i * 9 * s + 4, my - 6], [x + i * 9 * s, my + 2]], { fill: PAL.paper, stroke: PAL.graphite, w: 1.6, seed: 13 + i, wash: 0.9 });
    } else cr.line([[x - 20 * s, my], [x - 8 * s, my + 6], [x + 8 * s, my + 2], [x + 20 * s, my + 8]], { color: PAL.graphite, w: 3.4, seed: 14 });
  }
  function hearts(g, x, y, hp, max) {
    for (let i = 0; i < max; i++) {
      const hx = x + (i - (max - 1) / 2) * 30, pts = [];
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push([hx + 16 * Math.pow(Math.sin(a), 3) * 0.7, y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.7]); }
      if (i < hp) g.cr.shape(pts, { fill: PAL.red, stroke: PAL.darkred, w: 2.4, gap: 3.5, seed: i });
      else g.cr.line(pts, { color: PAL.gray, w: 2.4, closed: true, seed: i, alpha: 0.7 });
    }
  }
  const BOSS_ART = {
    grumbox(g, w, h, o) {
      const cr = g.cr;
      cr.shape([[-w / 2 - 10, -h / 2], [-w / 2 - 30, -h / 2 - 34], [-w / 2 + 30, -h / 2 - 8]], { fill: PAL.card, stroke: PAL.cardDark, w: 3, seed: 1 });
      cr.shape([[w / 2 + 10, -h / 2], [w / 2 + 30, -h / 2 - 34], [w / 2 - 30, -h / 2 - 8]], { fill: PAL.card, stroke: PAL.cardDark, w: 3, seed: 2 });
      cr.shape(shapes.rect(-w / 2, -h / 2, w, h), { fill: PAL.card, stroke: PAL.cardDark, w: 3.6, gap: 6, angle: -0.3, seed: 3 });
      cr.fill(c => { c.beginPath(); c.rect(-22, -h / 2, 44, 70); }, [-22, -h / 2, 44, 70], { color: '#EBD29C', gap: 5, angle: 1.5, seed: 4 });
      face(g, 0, -h * 0.12, 1.5, Object.assign({ mouth: 'teeth' }, o));
    },
    knight(g, w, h, o) {
      const cr = g.cr;
      cr.shape([[-12, -h / 2 - 4], [-4, -h / 2 - 60], [14, -h / 2 - 50], [8, -h / 2 - 4]], { fill: PAL.red, stroke: PAL.darkred, w: 2.6, seed: 1 });
      cr.shape(shapes.rrect(-w / 2, -h / 2, w, h * 0.42, 24), { fill: PAL.silver, stroke: PAL.graphite, w: 3.4, gap: 4, seed: 2, cross: true });
      cr.shape(shapes.rect(-w / 2 + 6, -h / 2 + h * 0.4, w - 12, h * 0.6), { fill: PAL.silver, stroke: PAL.graphite, w: 3.4, gap: 5, seed: 3 });
      cr.shape(shapes.rect(-w / 2 + 14, -h / 2 + h * 0.16, w - 28, 14), { fill: PAL.black, stroke: PAL.black, w: 2, seed: 4 });
      if (!o.dead) { dot(g, -12, -h / 2 + h * 0.16 + 7, 7, o.hurt ? PAL.red : PAL.yellow); dot(g, 12, -h / 2 + h * 0.16 + 7, 7, o.hurt ? PAL.red : PAL.yellow); }
      else face(g, 0, -h / 2 + h * 0.2, 1, o);
      cr.shape([[-w / 2 - 26, -10], [-w / 2 + 8, -20], [-w / 2 + 8, 40], [-w / 2 - 10, 60], [-w / 2 - 26, 30]], { fill: PAL.blue, stroke: PAL.navy, w: 3, seed: 5 });
      cr.line([[w / 2 - 4, 10], [w / 2 + 30, -60]], { color: PAL.gray, w: 6, seed: 6 });
    },
    jelly(g, w, h, o) {
      const cr = g.cr, pts = [];
      for (let i = 0; i < 26; i++) { const a = Math.PI + i / 25 * Math.PI, wob = Math.sin(g.t * 6 + i) * 3; pts.push([Math.cos(a) * (w / 2 + wob), h / 2 + Math.sin(a) * h + wob]); }
      pts.push([w / 2, h / 2], [w / 4, h / 2 + 6], [0, h / 2 - 2], [-w / 4, h / 2 + 6]);
      cr.shape(pts, { fill: PAL.lime, stroke: PAL.darkgreen, w: 3.4, gap: 5, seed: 1 });
      cr.line(shapes.arc(-w * 0.2, -h * 0.1, w * 0.18, 3.6, 4.6, 6), { color: PAL.paper, w: 5, alpha: 0.9, seed: 2 });
      face(g, 0, 0, 1.3, Object.assign({ mouth: 'grin' }, o));
    },
    cloud(g, w, h, o) {
      const cr = g.cr;
      if (!o.dead) cr.shape([[10, h / 2], [-10, h / 2 + 40], [8, h / 2 + 40], [-12, h / 2 + 80], [22, h / 2 + 30], [4, h / 2 + 30], [18, h / 2]], { fill: PAL.yellow, stroke: PAL.gold, w: 2.4, seed: 5 });
      for (const [bx, by, br] of [[-w * 0.32, 4, h * 0.42], [-w * 0.05, -h * 0.2, h * 0.55], [w * 0.28, -2, h * 0.45], [w * 0.05, h * 0.18, h * 0.4]]) cr.shape(shapes.circle(bx, by, br, 16), { fill: '#9AA3B5', stroke: '#4F5668', w: 3, gap: 5, seed: bx | 0 });
      face(g, 0, 0, 1.2, Object.assign({ mouth: 'grin' }, o));
    },
    eater(g, w, h, o) {
      const cr = g.cr, chomp = o.chomp ? Math.abs(Math.sin(g.t * 20)) : 0.25 + 0.2 * Math.sin(g.t * 3);
      cr.shape(shapes.rrect(-w / 2, -h / 2, w, h, 26), { fill: PAL.pink, stroke: '#9A3A63', w: 3.4, gap: 5, seed: 1 });
      cr.shape(shapes.rect(-w / 2, h / 2 - 22, w, 22), { fill: '#D6CFC0', stroke: '#9A3A63', w: 2.6, seed: 2 });
      const mh = 14 + chomp * 40;
      if (!o.dead) {
        cr.shape(shapes.ellipse(0, 18, w * 0.34, mh / 2, 16), { fill: PAL.darkred, stroke: PAL.graphite, w: 3, seed: 3 });
        for (let i = -2; i <= 2; i++) cr.shape([[i * 16 - 6, 18 - mh / 2], [i * 16 + 6, 18 - mh / 2], [i * 16, 18 - mh / 2 + 10]], { fill: PAL.paper, stroke: PAL.graphite, w: 1.6, seed: 4 + i, wash: 0.9 });
      }
      face(g, 0, -h * 0.2, 1.1, Object.assign({ mouth: 'none' }, o));
    },
    clock(g, w, h, o) {
      const cr = g.cr, R0 = Math.min(w, h) * 0.46;
      for (const sx of [-1, 1]) cr.shape(shapes.arc(sx * R0 * 0.62, -R0 * 0.95, R0 * 0.36, Math.PI, Math.PI * 2, 10).concat([[sx * R0 * 0.62 + R0 * 0.36, -R0 * 0.95]]), { fill: PAL.gold, stroke: '#8A5A0A', w: 2.8, seed: sx + 2 });
      for (const sx of [-1, 1]) cr.line([[sx * R0 * 0.5, R0 * 0.8], [sx * R0 * 0.7, h / 2]], { color: PAL.graphite, w: 5, seed: sx });
      cr.shape(shapes.circle(0, 0, R0, 22), { fill: PAL.red, stroke: PAL.darkred, w: 3.6, gap: 5, seed: 4 });
      cr.shape(shapes.circle(0, 0, R0 * 0.78, 20), { fill: PAL.paper, stroke: PAL.graphite, w: 2.6, seed: 5, wash: 0.9 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; dot(g, Math.cos(a) * R0 * 0.66, Math.sin(a) * R0 * 0.66, 4, PAL.graphite); }
      face(g, 0, -4, 1, Object.assign({ mouth: 'teeth' }, o));
    },
    snail(g, w, h, o) {
      const cr = g.cr;
      cr.shape([[-w / 2, h / 2], [w / 2 + 10, h / 2], [w / 2 + 20, h / 2 - 30], [w / 2 - 10, h / 2 - 34], [-w / 2 + 10, h / 2 - 20]], { fill: PAL.lime, stroke: PAL.darkgreen, w: 3, seed: 1 });
      const sp = [];
      for (let i = 0; i < 40; i++) { const a = i * 0.42, r = 6 + i * 1.35; sp.push([-10 + Math.cos(a) * r, -h * 0.08 + Math.sin(a) * r]); }
      cr.shape(shapes.circle(-10, -h * 0.08, h * 0.52, 22), { fill: PAL.orange, stroke: '#9A4A0A', w: 3.4, gap: 5, seed: 2 });
      cr.line(sp, { color: '#9A4A0A', w: 3, seed: 3 });
      for (const ex of [0, 18]) { cr.line([[w / 2 + ex - 6, h / 2 - 30], [w / 2 + ex, h / 2 - 70]], { color: PAL.darkgreen, w: 4, seed: ex }); cr.shape(shapes.circle(w / 2 + ex, h / 2 - 76, 9, 10), { fill: PAL.paper, stroke: PAL.graphite, w: 2.2, seed: ex + 5, wash: 0.9 }); if (!o.dead) dot(g, w / 2 + ex + 2, h / 2 - 76, 7, PAL.graphite); }
      cr.shape(shapes.rect(w / 2 - 14, h / 2 - 84, 50, 10), { fill: PAL.blue, stroke: PAL.navy, w: 2.2, seed: 9 });
      for (let i = 0; i < 3; i++) cr.line([[-w / 2 - 20 - i * 16, h / 2 - 10 - i * 12], [-w / 2 - 50 - i * 16, h / 2 - 10 - i * 12]], { color: PAL.gray, w: 2.6, seed: i, alpha: 0.7 });
    },
    robot(g, w, h, o) {
      const cr = g.cr;
      cr.line([[0, -h / 2], [0, -h / 2 - 34]], { color: PAL.graphite, w: 3, seed: 1 });
      dot(g, 0, -h / 2 - 38, 14, Math.sin(g.t * 6) > 0 ? PAL.red : PAL.orange);
      cr.shape(shapes.rrect(-w / 2, -h / 2, w, h * 0.45, 12), { fill: PAL.silver, stroke: PAL.graphite, w: 3.4, gap: 4, seed: 2, cross: true });
      cr.shape(shapes.rect(-w / 2 + 12, -h / 2 + 14, w - 24, h * 0.45 - 28), { fill: '#1F3F3A', stroke: PAL.graphite, w: 2.4, seed: 3, density: 1 });
      if (o.dead) face(g, 0, -h / 2 + h * 0.2, 0.9, o);
      else for (const ex of [-1, 1]) dot(g, ex * 18, -h / 2 + h * 0.18, o.hurt ? 6 : 14, o.hurt ? PAL.red : PAL.lime);
      cr.shape(shapes.rect(-w / 2 + 8, -h / 2 + h * 0.47, w - 16, h * 0.53), { fill: PAL.gray, stroke: PAL.graphite, w: 3.4, gap: 5, seed: 4 });
      for (const sx of [-1, 1]) cr.shape([[sx * (w / 2 + 4), -10], [sx * (w / 2 + 34), 10], [sx * (w / 2 + 34), 40], [sx * (w / 2 + 20), 40], [sx * (w / 2 + 20), 24], [sx * (w / 2 + 4), 14]], { fill: PAL.red, stroke: PAL.darkred, w: 2.6, seed: sx + 6 });
    },
    king(g, w, h, o) {
      const cr = g.cr;
      cr.shape([[-w / 2, h / 2], [-w / 2 + 12, -h * 0.05], [w / 2 - 12, -h * 0.05], [w / 2, h / 2]], { fill: PAL.purple, stroke: PAL.plum, w: 3.4, gap: 5, seed: 1 });
      cr.line([[-w / 2 + 4, h / 2 - 10], [w / 2 - 4, h / 2 - 10]], { color: PAL.paper, w: 8, seed: 2 });
      cr.shape(shapes.circle(0, -h * 0.24, w * 0.32, 18), { fill: '#F2C9A0', stroke: '#9A6A3A', w: 3, gap: 5, seed: 3 });
      cr.shape([[-w * 0.3, -h * 0.4], [-w * 0.3, -h / 2 - 30], [-w * 0.15, -h / 2 - 8], [0, -h / 2 - 36], [w * 0.15, -h / 2 - 8], [w * 0.3, -h / 2 - 30], [w * 0.3, -h * 0.4]], { fill: PAL.yellow, stroke: PAL.gold, w: 3, seed: 4 });
      cr.line([[-18, -h * 0.13], [-4, -h * 0.17], [4, -h * 0.17], [18, -h * 0.13]], { color: PAL.darkbrown, w: 6, seed: 5 });
      face(g, 0, -h * 0.26, 0.8, Object.assign({ mouth: 'none' }, o));
      cr.line([[w / 2 - 6, 0], [w / 2 + 26, -70]], { color: PAL.gold, w: 5, seed: 6 });
      cr.shape(star(w / 2 + 28, -78, 14), { fill: PAL.yellow, stroke: PAL.gold, w: 2, seed: 7 });
    },
    dragon(g, w, h, o) {
      const cr = g.cr;
      cr.shape([[-w * 0.1, -h * 0.1], [-w * 0.9, -h * 0.55], [-w * 0.55, -h * 0.05], [-w * 0.95, h * 0.05], [-w * 0.2, h * 0.2]], { fill: '#6FB86F', stroke: PAL.darkgreen, w: 3, gap: 6, seed: 1 });
      cr.shape(shapes.ellipse(w * 0.05, h * 0.18, w * 0.42, h * 0.34, 20), { fill: PAL.green, stroke: PAL.darkgreen, w: 3.6, gap: 5, seed: 2 });
      cr.shape(shapes.ellipse(-w * 0.05, -h * 0.26, w * 0.44, h * 0.26, 20), { fill: PAL.green, stroke: PAL.darkgreen, w: 3.6, gap: 5, seed: 3 });
      for (const sx of [-1, 1]) cr.shape([[sx * w * 0.18, -h * 0.44], [sx * w * 0.3, -h * 0.7], [sx * w * 0.34, -h * 0.42]], { fill: PAL.yellow, stroke: PAL.gold, w: 2.4, seed: sx + 4 });
      for (let i = 0; i < 4; i++) cr.shape([[-w * 0.3 + i * w * 0.18, h * 0.5], [-w * 0.22 + i * w * 0.18, h * 0.36], [-w * 0.14 + i * w * 0.18, h * 0.5]], { fill: PAL.orange, stroke: '#9A4A0A', w: 2, seed: i + 8 });
      face(g, w * 0.02, -h * 0.3, 1.1, Object.assign({ mouth: 'teeth' }, o));
      if (!o.dead && Math.sin(g.t * 1.3) > 0.4) for (let i = 0; i < 4; i++) cr.shape(shapes.circle(-w * 0.55 - i * 26, -h * 0.18 + Math.sin(g.t * 9 + i) * 6, 12 + i * 4, 10), { fill: i % 2 ? PAL.yellow : PAL.orange, stroke: PAL.red, w: 2, seed: i + 12 });
    }
  };
  R.boss = {
    live(g, p, sim) {
      const d = p.def, b = p.bodies[0], q = b.getPosition(), c = g.ctx;
      const hurt = p.st.hitT != null && sim.t - p.st.hitT < 0.5;
      const dead = !!p.st.dead;
      const w = d.w * S, h = d.h * S;
      c.save();
      c.translate(q.x * S, q.y * S);
      if (dead) { const k = Math.min(1, (sim.t - p.st.deadT) / 0.6); c.rotate((d.flip ? 1 : -1) * k * 0.35); c.globalAlpha *= 1 - k * 0.35; }
      else if (hurt) c.translate(Math.sin(sim.t * 60) * 5, 0);
      else c.translate(0, Math.sin(g.t * 2.2) * 3);
      if (d.flip) c.scale(-1, 1);
      (BOSS_ART[d.look] || BOSS_ART.grumbox)(g, w, h, { hurt, dead, chomp: p.st.chompT != null && sim.t - p.st.chompT < 0.4 });
      c.restore();
      if (!dead) hearts(g, q.x * S, (q.y - d.h / 2) * S - 70, p.st.hp, d.hp || 3);
    }
  };

  /* ---------- labels, strokes, hints, effects ---------- */
  function labelPos(p) {
    const d = p.def;
    if (d.lx != null) return [d.lx, d.ly];
    switch (p.type) {
      case 'ball': return [d.x - p.r - 0.22, d.y - p.r - 0.22];
      case 'pusher': return [d.x - p.dir * 0.36, d.y - 0.62];
      case 'dominoes': return [d.x + (d.n - 1) * (d.gap || 0.45) / 2, d.y - p.h - 0.38];
      case 'seesaw': return [d.x + 0.62, d.y + 0.4];
      case 'gate': return [(d.x1 + d.x2) / 2, d.y1 + 0.5];
      case 'button': return d.angle ? [d.x - 0.7, d.y - 0.55] : [d.x - (d.w || 0.7) / 2 - 0.3, d.y - 0.3];
      case 'bell': return [d.x + 0.55 * (p.size || 1), d.y + 0.25];
      case 'cup': return [d.x - p.w / 2 - 0.32, d.y - p.h - 0.15];
      case 'car': return [d.x - 0.2, d.y - 1.25];
      case 'cannon': return [d.x + 0.2, d.y - 1.35];
      case 'fan': return [d.x + 0.2, d.y - 0.78];
      case 'balloon': return [d.x + p.r + 0.3, d.y - p.r];
      case 'lamp': return [d.x + 0.45, d.y - 1.45];
      case 'trampoline': return [d.x + p.w / 2 + 0.25, d.y - 0.65];
      case 'conveyor': return [d.x1 + 0.35, d.y + 0.72];
      case 'dispenser': return d.kind === 'hen' ? [d.x1 - 0.6, d.y - 0.5] : d.kind === 'cannon' ? [d.x + 0.3, d.y - 1.5] : [d.x - 0.6, d.y + 0.2];
      case 'boss': return [d.x - d.w / 2 - 0.4, d.y - d.h - 0.3];
      case 'star': return [d.x + 0.55, d.y - 0.45];
      case 'flag': return [d.x + 1.0, d.y - 1.6];
      default: return [d.x != null ? d.x : 0, (d.y != null ? d.y : 0) - 0.5];
    }
  }
  function letter(g, x, y, text, you, alpha) {
    const cr = g.cr, col = you ? PAL.blue : PAL.graphite;
    cr.line(shapes.circle(x, y, 17, 12), { color: col, w: 2.4, closed: true, seed: text.charCodeAt(0), alpha });
    cr.text(text, x, y + 1, { size: 24, font: SKETCH, weight: 700, color: col, align: 'center', alpha });
    if (you) cr.text('you', x + 22, y + 16, { size: 20, color: PAL.blue, alpha });
  }
  function labels(g, sim, alpha) {
    if (alpha <= 0) return;
    for (const p of sim.parts) {
      if (p.type === 'label') { letter(g, p.def.x * S, p.def.y * S, p.def.text, !!p.def.you, alpha); continue; }
      if (!p.def.label) continue;
      const [x, y] = labelPos(p);
      letter(g, x * S, y * S, p.def.label, false, alpha);
    }
  }

  /* The seven crayons: colour, width and a small mark that says what they do. */
  const INK = {
    solid: { col: PAL.blue, w: 7.5 },
    loose: { col: PAL.orange, w: 13 },
    bouncy: { col: PAL.green, w: 9, hi: '#B6E3A8' },
    floaty: { col: PAL.yellow, w: 14, hi: '#FFF1B0', edge: PAL.gold },
    hinge: { col: PAL.purple, w: 11 },
    zoom: { col: PAL.red, w: 8 },
    magnet: { col: '#3A3844', w: 9 }
  };
  function strokeArt(g, st, color, alpha, seed, t) {
    const P = st.pts.map(([x, y]) => [x * S, y * S]);
    const ink = INK[st.kind] || INK.solid, cr = g.cr;
    const col = color || ink.col;
    if (CC.geom.isDot(st.pts)) {
      const r = CC.CRAYONS[st.kind] && CC.CRAYONS[st.kind].dyn ? 13 : 7;
      cr.shape(shapes.circle(P[0][0], P[0][1], r, 10), { fill: col, stroke: ink.edge || col, w: 2.4, seed, gap: 3, fillAlpha: alpha });
      return;
    }
    if (ink.edge) cr.line(P, { color: ink.edge, w: ink.w + 4, seed: seed + 1, alpha: alpha * 0.8, wob: 1.2 });
    cr.line(P, { color: col, w: ink.w, seed, alpha, wob: ink.w > 10 ? 1.2 : 0.9 });
    if (ink.hi) cr.line(P, { color: ink.hi, w: 2.2, seed: seed + 2, alpha: alpha * 0.9, wob: 0.6 });
    if (st.kind === 'zoom') {
      // chevrons that march the way the line pushes
      const L = CC.geom.len(st.pts) * S, ph = ((t || 0) * 60) % 34;
      for (let s = 12 + ph; s < L - 8; s += 34) {
        const [x, y, a] = along(P, s);
        const ca = Math.cos(a), sa = Math.sin(a);
        cr.line([[x - ca * 7 - sa * 8, y - sa * 7 + ca * 8], [x + ca * 3, y + sa * 3], [x - ca * 7 + sa * 8, y - sa * 7 - ca * 8]], { color: PAL.yellow, w: 3, alpha, seed: s | 0, wob: 0 });
      }
    }
    if (st.kind === 'magnet') {
      const L = CC.geom.len(st.pts) * S;
      for (let s = 10; s < L; s += 26) { const [x, y, a] = along(P, s); const ca = Math.cos(a), sa = Math.sin(a); cr.line([[x - sa * 7, y + ca * 7], [x + sa * 7, y - ca * 7]], { color: (s / 26 | 0) % 2 ? PAL.red : PAL.silver, w: 3, alpha, seed: s | 0, wob: 0 }); }
    }
    if (st.kind === 'bouncy') {
      const L = CC.geom.len(st.pts) * S;
      for (let s = 16; s < L - 8; s += 30) { const [x, y, a] = along(P, s); const ca = Math.cos(a), sa = Math.sin(a); cr.line(shapes.arc(x + sa * 9, y - ca * 9, 5, a + Math.PI, a + Math.PI * 2, 5), { color: PAL.darkgreen, w: 2, alpha: alpha * 0.9, seed: s | 0, wob: 0 }); }
    }
  }
  function along(P, s) {
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= L || i === P.length - 1) { const u = Math.min(1, s / (L || 1)); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
      s -= L;
    }
    return [P[0][0], P[0][1], 0];
  }
  function pin(g, x, y) {
    g.cr.shape(shapes.circle(x, y, 9, 10), { fill: PAL.red, stroke: PAL.darkred, w: 2.4, seed: 4 });
    dot(g, x - 3, y - 3, 4, PAL.paper);
  }
  function strokes(g, sim, hover, fade) {
    for (const rec of sim.strokes) {
      const st = rec.stroke, dyn = !rec.body.isStatic();
      const seed = (st.pts[0][0] * 31 + st.pts[0][1] * 17) | 0;
      let alpha = 1;
      if (fade) { const left = fade - (sim.t - rec.born); if (left < 1.4) alpha = Math.max(0.1, left / 1.4) * (0.75 + 0.25 * Math.sin(sim.t * 30)); }
      if (dyn) withBody(g, rec.body, () => strokeArt(g, st, null, alpha, seed, g.t));
      else strokeArt(g, st, null, alpha, seed, g.t);
      if (rec.pin) { const q = rec.pin.getPosition(); pin(g, q.x * S, q.y * S); }
      if (hover === st) {
        g.ctx.save(); g.ctx.setLineDash([6, 6]);
        const b = rec.body.getPosition();
        g.ctx.translate(b.x * S, b.y * S); g.ctx.rotate(rec.body.getAngle());
        g.ctx.strokeStyle = PAL.red; g.ctx.lineWidth = 2; g.ctx.lineJoin = 'round';
        g.ctx.beginPath(); st.pts.forEach(([x, y], i) => i ? g.ctx.lineTo(x * S, y * S) : g.ctx.moveTo(x * S, y * S));
        if (st.pts.length === 1) g.ctx.arc(st.pts[0][0] * S, st.pts[0][1] * S, 16, 0, 7);
        g.ctx.stroke(); g.ctx.restore();
      }
    }
  }

  function ghost(g, sols, alpha) {
    const c = g.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.setLineDash([10, 9]); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of sols) {
      c.strokeStyle = (INK[s.kind] || INK.solid).col;
      c.lineWidth = 5;
      c.beginPath(); s.pts.forEach(([x, y], i) => i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S)); c.stroke();
      if (s.kind === 'hinge') { c.setLineDash([]); c.fillStyle = PAL.red; c.beginPath(); c.arc(s.pts[0][0] * S, s.pts[0][1] * S, 7, 0, 7); c.fill(); c.setLineDash([10, 9]); }
      if (s.at != null) {
        const p = s.pts[0];
        c.setLineDash([]); c.fillStyle = PAL.graphite; c.font = '22px "Patrick Hand", cursive';
        c.fillText(s.at.toFixed(1) + 's', p[0] * S + 6, p[1] * S - 10);
        c.setLineDash([10, 9]);
      }
    }
    c.restore();
  }

  CC.Draw = { S, R, INK, paper, floor, labels, strokes, strokeArt, ghost, letter, woodPlank, SKETCH, star, pin };
})(window);
