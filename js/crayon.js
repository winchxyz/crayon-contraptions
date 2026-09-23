/* Crayon Contraptions — crayon rendering. Wax on paper: every stroke and fill
   is textured by a shared paper-tooth map, so colour catches on the grain and
   the paper shows through. Drawing space is 1600 x 900 "sheet px". */
(function (root) {
  'use strict';
  const CC = root.CC || (root.CC = {});

  const PAL = {
    paper: '#FFFDF7', graphite: '#2F2B36', red: '#E23B34', darkred: '#9E2420', orange: '#F58A1F',
    yellow: '#F6C421', gold: '#E0A21A', green: '#3FA34D', darkgreen: '#236B31', lime: '#B9D63A',
    blue: '#2E6BD6', navy: '#1F3F8C', sky: '#79C6F2', purple: '#7A4FC0', plum: '#46336F',
    pink: '#F28DB2', brown: '#8B5A2E', darkbrown: '#5A3717', tan: '#D8A266', wood: '#C98B4A',
    card: '#D6A86E', cardDark: '#8E5F2E', gray: '#8D8893', silver: '#B9B6BD', black: '#2A2630', white: '#FFFFFF'
  };

  /* ---- paper tooth: one grain map shared by every colour ---- */
  const TEX = 192;
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function valueNoise(size, cell, r) {
    const gw = Math.ceil(size / cell) + 1, g = new Float32Array(gw * gw);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const gx = ix % (gw - 1), gy = iy % (gw - 1), gx1 = (gx + 1) % (gw - 1), gy1 = (gy + 1) % (gw - 1);
      const a = g[gy * gw + gx], b = g[gy * gw + gx1], c = g[gy1 * gw + gx], d = g[gy1 * gw + gx1];
      out[y * size + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
    return out;
  }
  function makeTooth(seed) {
    const r = rng(seed);
    const fine = new Float32Array(TEX * TEX); for (let i = 0; i < fine.length; i++) fine[i] = r();
    const mid = valueNoise(TEX, 6, r), big = valueNoise(TEX, 24, r);
    const t = new Float32Array(TEX * TEX);
    for (let i = 0; i < t.length; i++) t[i] = fine[i] * 0.45 + mid[i] * 0.35 + big[i] * 0.2;
    return t;
  }
  const TEETH = [makeTooth(11), makeTooth(29), makeTooth(47)];

  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const texCache = new Map();
  function texture(color, v) {
    const key = color + '|' + v;
    let c = texCache.get(key);
    if (c) return c;
    c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(TEX, TEX) : Object.assign(document.createElement('canvas'), { width: TEX, height: TEX });
    const g = c.getContext('2d'), img = g.createImageData(TEX, TEX), d = img.data;
    const [R, G, B] = hexRgb(color), tooth = TEETH[v % 3];
    const lo = v === 2 ? 0.3 : 0.36, hi = v === 2 ? 0.62 : 0.58;
    for (let i = 0; i < TEX * TEX; i++) {
      const n = tooth[i];
      let a = (n - lo) / (hi - lo); a = a < 0 ? 0 : a > 1 ? 1 : a; a = a * a * (3 - 2 * a);
      const shade = 0.9 + 0.2 * tooth[(i * 7 + 13) % (TEX * TEX)];
      d[i * 4] = Math.min(255, R * shade); d[i * 4 + 1] = Math.min(255, G * shade); d[i * 4 + 2] = Math.min(255, B * shade);
      d[i * 4 + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    texCache.set(key, c);
    return c;
  }

  /* ---- the Crayon painter bound to one 2D context ---- */
  class Crayon {
    constructor(ctx) {
      this.ctx = ctx;
      this.boil = 0;       // 0..2, changes a few times a second
      this.pats = new Map();
      this.grain = 1.25;   // sheet px per texel
    }
    pat(color, v) {
      const key = color + '|' + (v || 0);
      let p = this.pats.get(key);
      if (!p) {
        p = this.ctx.createPattern(texture(color, v || 0), 'repeat');
        if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(this.grain));
        this.pats.set(key, p);
      }
      return p;
    }

    /* Hand wobble: densify, then push points sideways with a smooth
       seed-dependent wave. */
    wobble(pts, seed, amp, closed) {
      const out = [];
      const n = pts.length;
      const list = closed ? pts.concat([pts[0]]) : pts;
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i], b = list[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const k = Math.max(1, Math.ceil(L / 14));
        for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
      }
      out.push(list[list.length - 1].slice());
      if (!amp || n < 2) return out;
      const ph = (seed * 12.9898 + this.boil * 78.233) % 6.283;
      let s = 0;
      const res = [];
      for (let i = 0; i < out.length; i++) {
        const p = out[i], q = out[Math.min(out.length - 1, i + 1)], o = out[Math.max(0, i - 1)];
        if (i) s += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]);
        let tx = q[0] - o[0], ty = q[1] - o[1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const off = amp * (Math.sin(s * 0.045 + ph) * 0.65 + Math.sin(s * 0.13 + ph * 2.3) * 0.35);
        res.push([p[0] - ty * off, p[1] + tx * off]);
      }
      return res;
    }

    _path(P) {
      const c = this.ctx;
      c.beginPath();
      c.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]);
    }

    /* A crayon line through pts. */
    line(pts, o) {
      if (!pts || !pts.length) return;
      const c = this.ctx, w = o.w || 5, col = o.color || PAL.graphite, alpha = o.alpha == null ? 1 : o.alpha;
      let P = pts;
      if (pts.length === 1) P = [pts[0], [pts[0][0] + 0.01, pts[0][1]]];
      if (!o.closed && o.over !== false && P.length > 1) {
        // a little overshoot at each end, like a hand that did not stop in time
        const a = P[0], b = P[1], y = P[P.length - 1], z = P[P.length - 2];
        const la = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, lz = Math.hypot(y[0] - z[0], y[1] - z[1]) || 1;
        const e = w * 0.35;
        P = [[a[0] - (b[0] - a[0]) / la * e, a[1] - (b[1] - a[1]) / la * e]].concat(P.slice(1, -1), [[y[0] + (y[0] - z[0]) / lz * e, y[1] + (y[1] - z[1]) / lz * e]]);
        if (pts.length === 2) P.splice(1, 0, [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]);
      }
      let W = this.wobble(P, o.seed || 0, o.wob == null ? Math.min(1.6, w * 0.22) : o.wob, !!o.closed);
      if (o.closed && W.length > 3) {
        // loop past the start and drift off, the way a closed crayon shape ends
        const extra = W.slice(1, Math.min(W.length, 4)).map(p => [p[0] + 1.2, p[1] - 1]);
        W = W.concat(extra);
      }
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha *= alpha;
      c.strokeStyle = this.pat(col, 0); c.lineWidth = w;
      this._path(W); c.stroke();
      c.globalAlpha *= 0.7;
      c.strokeStyle = this.pat(col, 1); c.lineWidth = w * 0.62;
      c.translate(0.7, -0.5);
      this._path(W); c.stroke();
      c.restore();
    }

    /* Scribble-fill a region. path(ctx) must build a clean path; box is
       [x, y, w, h] around it. */
    fill(path, box, o) {
      const c = this.ctx, col = o.color, gap = o.gap || 5.5, ang = o.angle == null ? -0.6 : o.angle;
      c.save();
      c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      path(c);
      if (o.wash !== 0) {
        c.save(); c.globalAlpha *= o.wash == null ? 0.35 : o.wash; c.fillStyle = this.pat(col, 2); c.fill(); c.restore();
      }
      c.clip();
      const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2, R = Math.hypot(box[2], box[3]) / 2 + gap;
      c.translate(cx, cy); c.rotate(ang);
      const seed = (o.seed || 0) + this.boil * 3.1;
      const P = [];
      let k = 0;
      for (let y = -R; y <= R; y += gap, k++) {
        const j = Math.sin(seed + k * 1.7) * gap * 0.35;
        P.push([k % 2 ? R + j : -R - j, y + j * 0.3]);
      }
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = this.pat(col, 0); c.lineWidth = gap * 1.25;
      c.globalAlpha *= o.density == null ? 0.85 : o.density;
      this._path(P); c.stroke();
      if (o.cross) {
        c.rotate(0.35);
        c.globalAlpha *= 0.55;
        c.strokeStyle = this.pat(col, 1);
        this._path(P); c.stroke();
      }
      c.restore();
    }

    /* Filled + outlined shape from a point list (closed). */
    shape(pts, o) {
      const box = bbox(pts);
      if (o.fill) this.fill(ctx => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }, box,
        { color: o.fill, gap: o.gap, angle: o.angle, seed: o.seed, alpha: o.fillAlpha, wash: o.wash, density: o.density, cross: o.cross });
      if (o.stroke !== false) this.line(pts, { color: o.stroke || PAL.graphite, w: o.w || 3.5, seed: (o.seed || 0) + 5, closed: true, wob: o.wob });
    }

    /* Pattern-filled text is slow to rasterise, so every string is drawn
       once into a sprite (per size, colour and boil frame) and blitted. */
    text(str, x, y, o) {
      const c = this.ctx, spr = sprite(str, o, this.boil, this.res || 1);
      c.save();
      c.translate(x, y);
      if (o.rot) c.rotate(o.rot);
      c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      c.drawImage(spr.cv, -spr.ax, -spr.ay, spr.w, spr.h);
      c.restore();
    }
  }

  const sprites = new Map();
  let measure = null;
  function sprite(str, o, boil, res) {
    const size = o.size || 28, font = `${o.weight || 400} ${size}px ${o.font || '"Patrick Hand", "Comic Sans MS", cursive'}`;
    const r = Math.round(res * 20) / 20 || 1;
    const key = [str, font, o.color, o.align, o.base, o.halo, boil, r].join('|');
    let s = sprites.get(key);
    if (s) return s;
    if (!measure) measure = document.createElement('canvas').getContext('2d');
    measure.font = font;
    const pad = Math.ceil((o.halo || 0) / 2 + 4);
    const tw = Math.ceil(measure.measureText(str).width), th = Math.ceil(size * 1.35);
    const w = tw + pad * 2, h = th + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * r)); cv.height = Math.max(1, Math.ceil(h * r));
    const g = cv.getContext('2d');
    g.scale(r, r);
    const cr = new Crayon(g);
    cr.boil = boil;
    const align = o.align || 'left', base = o.base || 'middle';
    const ax = align === 'center' ? w / 2 : align === 'right' ? w - pad : pad;
    const ay = base === 'middle' ? h / 2 : base === 'top' ? pad : base === 'bottom' ? h - pad : pad + size;
    g.font = font; g.textAlign = align; g.textBaseline = base;
    if (o.halo) { g.lineJoin = 'round'; g.lineWidth = o.halo; g.strokeStyle = cr.pat(PAL.paper, 2); g.strokeText(str, ax, ay); }
    g.fillStyle = cr.pat(o.color || PAL.graphite, 0);
    g.fillText(str, ax, ay);
    g.globalAlpha = 0.75;
    g.fillStyle = cr.pat(o.color || PAL.graphite, 1);
    g.fillText(str, ax + 0.8, ay - 0.6);
    s = { cv, w, h, ax, ay };
    if (sprites.size > 400) sprites.clear();
    sprites.set(key, s);
    return s;
  }
  function clearSprites() { sprites.clear(); }

  function bbox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return [x0, y0, x1 - x0, y1 - y0];
  }
  const shapes = {
    rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; },
    circle(cx, cy, r, n) { const k = n || Math.max(12, Math.round(r / 3)), out = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; },
    ellipse(cx, cy, rx, ry, n) { const k = n || 28, out = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; },
    arc(cx, cy, r, a0, a1, n) { const k = n || 12, out = []; for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; },
    rrect(x, y, w, h, r) {
      const out = [], q = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + i / 4 * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
      q(x + w - r, y + r, -Math.PI / 2); q(x + w - r, y + h - r, 0); q(x + r, y + h - r, Math.PI / 2); q(x + r, y + r, Math.PI);
      return out;
    }
  };

  CC.PAL = PAL;
  CC.Crayon = Crayon;
  CC.clearSprites = clearSprites;
  CC.shapes = shapes;
  CC.bbox = bbox;
})(window);
