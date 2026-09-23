/* Crayon Contraptions — physics simulation. No DOM here, so Node can run it
   headless (test/solve.js, tools/gen.js). World units are metres, y points
   down, the sheet is 16 x 9 m and the floor top sits at FLOOR_Y. */
(function (root) {
  'use strict';
  const CC = root.CC || (root.CC = {});
  const pl = root.planck;
  const { World, Vec2, Box, Circle, Polygon, Chain, RevoluteJoint } = pl;

  const DT = 1 / 120;
  const W = 16, H = 9, FLOOR_Y = 8.7;
  const SOLID_R = 0.035;   // half thickness of a blue line
  const LOOSE_T = 0.13;    // thickness of an orange line
  const MIN_SEG = 0.11;    // resample spacing for strokes
  const DOT_LEN = 0.14;    // shorter than this is a dot (peg / pebble)

  /* Seven crayons, seven kinds of physics. */
  const CRAYONS = {
    solid:  { stat: true, r: 0.035, friction: 0.55, restitution: 0.05 },
    bouncy: { stat: true, r: 0.045, friction: 0.3, restitution: 1.0 },
    zoom:   { stat: true, r: 0.04, friction: 0.8, restitution: 0.02, accel: 30, max: 8 },
    magnet: { stat: true, r: 0.045, friction: 0.5, restitution: 0.05, pull: 60, reach: 3.2, ex: 1.5 },
    loose:  { dyn: true, t: 0.13, density: 2, friction: 0.6, restitution: 0.05 },
    floaty: { dyn: true, t: 0.16, density: 0.9, friction: 0.08, restitution: 0.2, gravity: -1, damp: 2.2 },
    hinge:  { dyn: true, t: 0.12, density: 1.6, friction: 0.5, restitution: 0.05, pin: true }
  };

  const BALLS = {
    rubber:   { r: 0.24, density: 1.0, friction: 0.6, restitution: 0.4 },
    tennis:   { r: 0.2, density: 0.6, friction: 0.7, restitution: 0.55 },
    marble:   { r: 0.17, density: 3.0, friction: 0.3, restitution: 0.2 },
    bowling:  { r: 0.34, density: 5.0, friction: 0.4, restitution: 0.02 },
    beach:    { r: 0.5, density: 0.06, friction: 0.5, restitution: 0.5 },
    meatball: { r: 0.21, density: 1.6, friction: 0.8, restitution: 0.08 },
    steel:    { r: 0.2, density: 4.0, friction: 0.35, restitution: 0.25, metal: true },
    egg:      { r: 0.19, density: 1.1, friction: 0.8, restitution: 0.05, fragile: 6.2 }
  };

  /* ---------- geometry helpers (shared with the UI and the generator) ---------- */
  const geom = {
    len(pts) {
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return L;
    },
    segDist(p, a, b) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      let t = L2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    },
    nearest(p, pts) {
      let best = Infinity, bx = pts[0][0], by = pts[0][1];
      if (pts.length === 1) return [bx, by, Math.hypot(p[0] - bx, p[1] - by)];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
        let t = L2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const x = a[0] + t * dx, y = a[1] + t * dy, d = Math.hypot(p[0] - x, p[1] - y);
        if (d < best) { best = d; bx = x; by = y; }
      }
      return [bx, by, best];
    },
    simplify(pts, eps) {
      if (pts.length < 3) return pts.slice();
      let dmax = 0, idx = 0;
      const a = pts[0], b = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i++) {
        const d = geom.segDist(pts[i], a, b);
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (dmax <= eps) return [a, b];
      const l = geom.simplify(pts.slice(0, idx + 1), eps), r = geom.simplify(pts.slice(idx), eps);
      return l.slice(0, -1).concat(r);
    },
    resample(pts, step) {
      if (pts.length < 2) return pts.map(p => p.slice());
      const out = [pts[0].slice()];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
        for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
      }
      return out;
    },
    /* Clean a raw pointer path into physics-ready points. */
    prepare(raw) {
      if (!raw.length) return [];
      const out = [raw[0].slice()];
      for (let i = 1; i < raw.length; i++) {
        const p = raw[i], q = out[out.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_SEG) out.push(p.slice());
      }
      const last = raw[raw.length - 1], q = out[out.length - 1];
      if (Math.hypot(last[0] - q[0], last[1] - q[1]) > 0.04) out.push(last.slice());
      const s = geom.simplify(out, 0.015);
      const clean = [s[0]];
      for (let i = 1; i < s.length; i++) {
        const c = clean[clean.length - 1];
        if (Math.hypot(s[i][0] - c[0], s[i][1] - c[1]) > 0.03) clean.push(s[i]);
      }
      return clean;
    },
    isDot(pts) { return pts.length < 2 || geom.len(pts) < DOT_LEN; },
    inkOf(stroke) { return geom.isDot(stroke.pts) ? 0.3 : geom.len(stroke.pts); },
    /* Rub out the part of a line inside circle (c, r). Returns null when the
       eraser missed, otherwise the surviving pieces (maybe none). */
    eraseSplit(pts, c, r) {
      if (geom.isDot(pts)) return Math.hypot(pts[0][0] - c[0], pts[0][1] - c[1]) < r + 0.08 ? [] : null;
      if (geom.nearest(c, pts)[2] >= r) return null;
      const dense = geom.resample(pts, 0.03);
      const runs = [];
      let cur = [];
      for (const p of dense) {
        if (Math.hypot(p[0] - c[0], p[1] - c[1]) < r) { if (cur.length) runs.push(cur); cur = []; }
        else cur.push(p);
      }
      if (cur.length) runs.push(cur);
      return runs.map(run => geom.prepare(run)).filter(run => run.length >= 2 && geom.len(run) >= 0.12);
    }
  };

  /* ---------- sim ---------- */
  function ud(part, role, extra) { return Object.assign({ part, role }, extra || {}); }
  const MOVER_PARTS = new Set(['ball', 'boss', 'cup']);

  class Sim {
    constructor(level, strokes) {
      this.level = level;
      this.goal = level.goal || null;
      this.live = level.live || null;
      this.world = new World({ gravity: Vec2(0, 10) });
      this.t = 0;
      this.running = false;
      this.won = false; this.wonT = 0; this.wonPart = null;
      this.stalled = false; this.failReason = null; this.quietT = 0; this.busy = 0;
      this.delivered = 0; this.lost = 0; this.starsGot = 0; this.spawned = 0;
      this.parts = [];
      this.strokes = [];
      this.magnets = [];
      this.events = [];
      this.queue = [];
      this.quiet = false;
      this._bounds();
      for (const d of level.parts || []) this.addPart(d);
      if (this.live && this.live.lava) this.addPart({ type: 'lava', x: 0, y: FLOOR_Y - 0.1, w: W, h: 0.1, floor: true });
      for (const s of strokes || []) this.addStroke(s);
      this.world.on('begin-contact', c => this._touch(c, 1));
      this.world.on('end-contact', c => this._touch(c, -1));
      this.world.on('pre-solve', c => this._preSolve(c));
      this.world.on('post-solve', (c, imp) => this._postSolve(c, imp));
    }

    _bounds() {
      const b = this.world.createBody({ type: 'static' });
      const u = { part: null, role: 'solid', mat: 'floor' };
      b.createFixture(new Box(W / 2 + 1, 0.5, Vec2(W / 2, FLOOR_Y + 0.5), 0), { friction: 0.6, userData: u });
      b.createFixture(new Box(0.5, 12, Vec2(-0.5, -2), 0), { friction: 0.3, userData: u });
      b.createFixture(new Box(0.5, 12, Vec2(W + 0.5, -2), 0), { friction: 0.3, userData: u });
      b.createFixture(new Box(W / 2 + 1, 0.5, Vec2(W / 2, -0.5), 0), { friction: 0.3, userData: { part: null, role: 'solid', mat: 'ceiling' } });
      this.boundsBody = b;
    }

    addPart(d) {
      const T = PARTS[d.type];
      if (!T) throw new Error('unknown part ' + d.type);
      const p = { def: d, type: d.type, id: d.id || null, st: {}, bodies: [], joints: [], when: d.when || d.hold || T.when || null };
      if (T.build) T.build(this, p, d);
      this.parts.push(p);
      return p;
    }

    addStroke(s) {
      const pts = s.pts, kind = CRAYONS[s.kind] ? s.kind : 'solid', C = CRAYONS[kind];
      const u = { part: null, role: 'solid', mat: kind, stroke: s, crayon: kind };
      const dot = geom.isDot(pts);
      let body, pin = null;
      if (C.stat) {
        body = this.world.createBody({ type: 'static', position: Vec2(0, 0) });
        if (dot) body.createFixture(new Circle(Vec2(pts[0][0], pts[0][1]), 0.07), { friction: C.friction, restitution: C.restitution, userData: u });
        else {
          const ch = new Chain(pts.map(p => Vec2(p[0], p[1])), false);
          ch.m_radius = C.r;
          body.createFixture(ch, { friction: C.friction, restitution: C.restitution, userData: u });
        }
        if (kind === 'zoom' && !dot) {
          u.dirs = [];
          for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy) || 1; u.dirs.push([dx / L, dy / L]); }
        }
      } else {
        body = this.world.createBody({ type: 'dynamic', position: Vec2(0, 0), angularDamping: C.damp || 0.05, linearDamping: C.damp || 0 });
        const fd = { density: C.density, friction: C.friction, restitution: C.restitution, userData: u };
        if (dot) body.createFixture(new Circle(Vec2(pts[0][0], pts[0][1]), 0.13), fd);
        else for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          body.createFixture(new Box(L / 2 + C.t * 0.45, C.t / 2, Vec2((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), ang), fd);
        }
        if (C.gravity) body.setGravityScale(C.gravity);
        if (C.pin) {
          pin = this.world.createBody({ type: 'static', position: Vec2(pts[0][0], pts[0][1]) });
          this.world.createJoint(new RevoluteJoint({}, pin, body, Vec2(pts[0][0], pts[0][1])));
        }
      }
      const rec = { stroke: s, body, pin, kind, born: this.t };
      if (kind === 'magnet') this.magnets.push(rec);
      this.strokes.push(rec);
      if (this.running) this.emit('drawn', { kind });
      return rec;
    }

    removeStroke(rec) {
      const i = this.strokes.indexOf(rec);
      if (i < 0) return;
      this.strokes.splice(i, 1);
      const m = this.magnets.indexOf(rec);
      if (m >= 0) this.magnets.splice(m, 1);
      this.later(() => { this.world.destroyBody(rec.body); if (rec.pin) this.world.destroyBody(rec.pin); });
      rec.gone = true;
    }

    /* Where a stroke's points sit right now (dynamic lines move). */
    strokeWorldPts(rec) {
      const b = rec.body, P = rec.stroke.pts;
      if (b.isStatic()) return P;
      return P.map(([x, y]) => { const w = b.getWorldPoint(Vec2(x, y)); return [w.x, w.y]; });
    }

    later(fn) { if (this.world.isLocked()) this.queue.push(fn); else fn(); }
    emit(name, data) { if (!this.quiet) this.events.push(Object.assign({ name, t: this.t }, data || {})); }

    start() {
      if (this.running) return;
      this.running = true;
      this.fire('start', null);
    }

    fire(id, src) {
      if (id === 'win') { this.win(src); return; }
      for (const p of this.parts) {
        if (p.when === id && !p.st.triggered) {
          p.st.triggered = true;
          p.st.trigT = this.t;
          const T = PARTS[p.type];
          if (T.trigger) T.trigger(this, p, src);
        }
      }
    }

    win(p) {
      if (this.won || this.stalled) return;
      this.won = true; this.wonT = this.t; this.wonPart = p;
      this.emit('win', { part: p });
    }
    fail(reason) {
      if (this.won || this.stalled) return;
      this.stalled = true; this.failReason = reason || 'stopped';
      this.emit('stalled', { reason: this.failReason });
    }
    /* A ball leaves play for good: into lava, or smashed. */
    lose(body, why) {
      if (body.__gone) return;
      body.__gone = true;
      const q = body.getPosition();
      this.lost++;
      this.emit(why || 'lost', { x: q.x, y: q.y });
      if (body.__part) body.__part.st.gone = true;
      this.later(() => this.world.destroyBody(body));
      const g = this.goal;
      if (g && g.need && this.lost > g.of - g.need) this.fail('lost');
    }
    deliver(body, cup) {
      if (body.__gone) return;
      body.__gone = true;
      const q = body.getPosition();
      this.delivered++;
      this.emit('deliver', { x: q.x, y: q.y, n: this.delivered });
      if (body.__part) body.__part.st.gone = true;
      this.later(() => this.world.destroyBody(body));
      const g = this.goal;
      if (g && g.need && this.delivered + this.lost >= g.of) { if (this.delivered >= g.need) this.win(cup); else this.fail('lost'); }
    }

    step() {
      if (!this.running) return;
      this.busy = 0;
      if (this.live && this.live.fade) {
        for (const rec of this.strokes.slice()) if (this.t - rec.born > this.live.fade) { this.removeStroke(rec); this.emit('fade', {}); }
      }
      this._forces();
      for (const p of this.parts) { const T = PARTS[p.type]; if (T.update) T.update(this, p, DT); }
      this.world.step(DT, 8, 3);
      this.t += DT;
      while (this.queue.length) this.queue.shift()();
      let moving = this.busy > 0;
      if (!moving) {
        for (let b = this.world.getBodyList(); b; b = b.getNext()) {
          if (!b.isDynamic() || !b.isAwake() || !b.isActive()) continue;
          const v = b.getLinearVelocity();
          if (v.x * v.x + v.y * v.y > 0.012 || Math.abs(b.getAngularVelocity()) > 0.25) { moving = true; break; }
        }
      }
      this.quietT = moving ? 0 : this.quietT + DT;
      if (this.won || this.stalled) return;
      const lim = this.live ? (this.live.time || 45) : 32;
      const quietLim = this.live ? 3.5 : 1.5;
      if (this.t > lim) { this.fail(this.live ? 'time' : 'stopped'); return; }
      if (this.t > 1.2 && this.quietT > quietLim) {
        const g = this.goal;
        if (g && g.need && this.delivered >= g.need) this.win(null);
        else this.fail(g && g.need ? 'stuck' : 'stopped');
      }
    }

    /* Crayon forces: red lines push along the way they were drawn, black
       lines pull steel. */
    _forces() {
      const Z = CRAYONS.zoom, M = CRAYONS.magnet;
      for (let b = this.world.getBodyList(); b; b = b.getNext()) {
        if (!b.isDynamic() || !b.isActive()) continue;
        for (let ce = b.getContactList(); ce; ce = ce.next) {
          const c = ce.contact;
          if (!c.isTouching()) continue;
          let f = c.getFixtureA(), idx = c.getChildIndexA();
          if (f.getBody() === b) { f = c.getFixtureB(); idx = c.getChildIndexB(); }
          const u = f.getUserData();
          if (!u || !u.dirs) continue;
          const dir = u.dirs[Math.min(idx, u.dirs.length - 1)], v = b.getLinearVelocity(), m = b.getMass();
          if (b.__car) { b.__car.st.turboT = this.t; b.__car.st.turboDir = dir[0] >= 0 ? 1 : -1; }
          if (v.x * dir[0] + v.y * dir[1] < Z.max) b.applyForceToCenter(Vec2(dir[0] * Z.accel * m, dir[1] * Z.accel * m), true);
          break;
        }
        if (b.__metal && this.magnets.length) {
          const c = b.getWorldCenter(), p = [c.x, c.y];
          for (const rec of this.magnets) {
            const [nx, ny, d] = geom.nearest(p, rec.stroke.pts);
            if (d >= M.reach || d < 0.02) continue;
            const k = M.pull * b.getMass() * Math.pow(1 - d / M.reach, M.ex || 2) / d;
            b.applyForceToCenter(Vec2((nx - c.x) * k, (ny - c.y) * k), true);
          }
        }
      }
    }

    /* Why a point cannot take this crayon right now (null when it can). */
    blocked(q, kind) {
      if (q[0] < 0.06 || q[0] > W - 0.06 || q[1] < 0.06 || q[1] > FLOOR_Y - 0.02) return 'Stay on the paper';
      for (const p of this.parts) {
        if (p.type !== 'nodraw') continue;
        const d = p.def;
        if (q[0] >= d.x && q[0] <= d.x + d.w && q[1] >= d.y && q[1] <= d.y + d.h) return 'No crayons in the red zone';
      }
      const C = CRAYONS[kind] || CRAYONS.solid, dyn = !!C.dyn, m = dyn ? 0.09 : 0.05;
      for (let b = this.world.getBodyList(); b; b = b.getNext()) {
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
          if (f.isSensor()) continue;
          const u = f.getUserData() || {};
          if (u.stroke) continue;
          const mover = !b.isStatic() || (u.part && MOVER_PARTS.has(u.part.type) && u.part.type !== 'cup');
          if (!dyn && !mover) continue;
          for (let i = 0; i < 9; i++) {
            const ox = i ? Math.cos(i * Math.PI / 4) * m : 0, oy = i ? Math.sin(i * Math.PI / 4) * m : 0;
            if (f.testPoint(Vec2(q[0] + ox, q[1] + oy))) return dyn ? 'This crayon needs empty space' : 'That spot is taken by a moving part';
          }
        }
      }
      for (const rec of this.strokes) {
        const rc = CRAYONS[rec.kind];
        if (!dyn && !rc.dyn) continue;
        const reach = (rc.dyn ? rc.t / 2 : rc.r) + (dyn ? C.t / 2 : C.r) + 0.02;
        const P = this.strokeWorldPts(rec);
        if (P.length === 1 || geom.isDot(rec.stroke.pts)) { if (Math.hypot(q[0] - P[0][0], q[1] - P[0][1]) < reach + 0.1) return 'Too close to another crayon line'; continue; }
        for (let i = 1; i < P.length; i++) if (geom.segDist(q, P[i - 1], P[i]) < reach) return 'Too close to another crayon line';
      }
      return null;
    }

    /* Run headless until win / fail / timeout; timed strokes (s.at) are
       drawn when the clock reaches them. */
    runHeadless(timed, maxT) {
      this.quiet = true;
      this.start();
      const lim = maxT || 60;
      const later = (timed || []).slice().sort((a, b) => a.at - b.at);
      while (this.t < lim && !this.won && !this.stalled) {
        while (later.length && later[0].at <= this.t) this.addStroke(later.shift());
        this.step();
      }
      return { won: this.won, t: +this.t.toFixed(2), stalled: this.stalled, reason: this.failReason, delivered: this.delivered, lost: this.lost };
    }

    _touch(c, sign) {
      const fa = c.getFixtureA(), fb = c.getFixtureB();
      const ua = fa.getUserData(), ub = fb.getUserData();
      if (ua && ua.onTouch) ua.onTouch(this, fb, sign, c);
      if (ub && ub.onTouch) ub.onTouch(this, fa, sign, c);
    }

    _preSolve(c) {
      const ua = c.getFixtureA().getUserData(), ub = c.getFixtureB().getUserData();
      if (ua && ua.belt && ua.part.st.on) c.setTangentSpeed(-ua.part.def.speed);
      else if (ub && ub.belt && ub.part.st.on) c.setTangentSpeed(ub.part.def.speed);
    }

    _postSolve(c, imp) {
      const n = imp.normalImpulses[0] || 0;
      if (n < 0.02) return;
      const fa = c.getFixtureA(), fb = c.getFixtureB();
      const ba = fa.getBody(), bb = fb.getBody();
      const ma = ba.isDynamic() ? ba.getMass() : 1e9, mb = bb.isDynamic() ? bb.getMass() : 1e9;
      if (ba.__fragile && n / ma > ba.__fragile) this.lose(ba, 'splat');
      if (bb.__fragile && n / mb > bb.__fragile) this.lose(bb, 'splat');
      if (this.quiet) return;
      const dv = n / Math.min(ma, mb);
      if (dv < 0.7) return;
      const ua = fa.getUserData() || {}, ub = fb.getUserData() || {};
      const lead = ba.isDynamic() && ma <= mb ? ba : bb;
      const now = this.t;
      if (lead.__lastHit && now - lead.__lastHit < 0.07) return;
      lead.__lastHit = now;
      const wm = c.getWorldManifold(null);
      const pt = wm && wm.points && wm.points[0];
      this.emit('hit', { a: ua.mat, b: ub.mat, dv, x: pt ? pt.x : 0, y: pt ? pt.y : 0 });
    }
  }

  /* ---------- parts ---------- */
  function isMover(f) { const b = f.getBody(); return b.isDynamic(); }
  function statBody(sim, x, y, a) { return sim.world.createBody({ type: 'static', position: Vec2(x || 0, y || 0), angle: a || 0 }); }
  /* Sine sway for moving parts: {dx, dy, period, phase}. */
  function sway(sim, p, b) {
    const m = p.def.move;
    if (!m) return;
    const w = Math.PI * 2 / (m.period || 4), ph = (m.phase || 0) * Math.PI * 2, k = Math.cos(sim.t * w + ph) * w;
    b.setLinearVelocity(Vec2((m.dx || 0) / 2 * k, (m.dy || 0) / 2 * k));
  }

  /* Plank described by its top surface; thickness grows downward. */
  function plankGeo(d) {
    let x1 = d.x1, y1 = d.y1, x2 = d.x2, y2 = d.y2;
    if (x2 < x1) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
    const t = d.t || 0.2, L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    const nx = -Math.sin(a), ny = Math.cos(a);
    return { L, t, a, cx: (x1 + x2) / 2 + nx * t / 2, cy: (y1 + y2) / 2 + ny * t / 2 };
  }

  const PARTS = {};

  PARTS.plank = {
    build(sim, p, d) {
      const g = plankGeo(d);
      const b = statBody(sim, g.cx, g.cy, g.a);
      b.createFixture(new Box(g.L / 2, g.t / 2), { friction: d.friction != null ? d.friction : 0.5, restitution: 0.05, userData: ud(p, 'solid', { mat: d.style === 'metal' ? 'metal' : 'wood' }) });
      p.bodies.push(b); p.g = g;
    }
  };

  PARTS.block = {
    build(sim, p, d) {
      const b = statBody(sim, d.x + d.w / 2, d.y + d.h / 2, 0);
      b.createFixture(new Box(d.w / 2, d.h / 2), { friction: 0.55, restitution: 0.05, userData: ud(p, 'solid', { mat: 'wood' }) });
      p.bodies.push(b);
    }
  };

  PARTS.ball = {
    build(sim, p, d) {
      const s = BALLS[d.style || 'rubber'];
      const r = d.r || s.r;
      const b = sim.world.createBody({ type: d.hold ? 'static' : 'dynamic', position: Vec2(d.x, d.y), angle: d.angle || 0, bullet: true, angularDamping: 0.4, linearDamping: 0.01 });
      b.createFixture(new Circle(r), {
        density: d.density != null ? d.density : s.density, friction: s.friction,
        restitution: d.restitution != null ? d.restitution : s.restitution,
        userData: ud(p, 'solid', { mat: s.metal ? 'metal' : 'ball', ball: d.style || 'rubber' })
      });
      if (d.v) b.setLinearVelocity(Vec2(d.v[0], d.v[1]));
      if (s.metal) b.__metal = true;
      if (s.fragile) b.__fragile = s.fragile;
      b.__part = p;
      p.r = r; p.bodies.push(b); p.st.held = !!d.hold;
    },
    trigger(sim, p) {
      if (!p.def.hold) return;
      sim.later(() => { const b = p.bodies[0]; b.setType('dynamic'); b.setAwake(true); p.st.held = false; });
      sim.emit('release', { x: p.def.x, y: p.def.y });
    },
    /* Rolling resistance on the floor only, so a ball that missed comes to
       rest instead of rolling for half a minute. Ramps stay untouched. */
    update(sim, p) {
      if (p.def.style === 'beach' || p.st.gone) return;
      const b = p.bodies[0];
      if (!b.isDynamic()) return;
      for (let ce = b.getContactList(); ce; ce = ce.next) {
        if (!ce.contact.isTouching()) continue;
        if (ce.other === sim.boundsBody) {
          b.setAngularVelocity(b.getAngularVelocity() * 0.985);
          const v = b.getLinearVelocity();
          b.setLinearVelocity(Vec2(v.x * 0.995, v.y));
          return;
        }
      }
    }
  };

  PARTS.crate = {
    build(sim, p, d) {
      const b = sim.world.createBody({ type: 'dynamic', position: Vec2(d.x, d.y), angle: d.angle || 0 });
      b.createFixture(new Box(d.w / 2, d.h / 2), { density: d.density || 0.8, friction: 0.6, restitution: 0.05, userData: ud(p, 'solid', { mat: 'wood' }) });
      p.bodies.push(b);
    }
  };

  PARTS.dominoes = {
    build(sim, p, d) {
      const w = d.w || 0.14, h = d.h || 0.8, gap = d.gap || 0.45;
      for (let i = 0; i < d.n; i++) {
        const b = sim.world.createBody({ type: 'dynamic', position: Vec2(d.x + i * gap, d.y - h / 2) });
        b.createFixture(new Box(w / 2, h / 2), { density: d.density || 1.5, friction: 0.45, restitution: 0.02, userData: ud(p, 'solid', { mat: 'domino' }) });
        p.bodies.push(b);
      }
      p.w = w; p.h = h;
    }
  };

  /* Seesaw: static triangle whose apex is the pivot (x, y); plank bottom sits on it. */
  PARTS.seesaw = {
    build(sim, p, d) {
      const len = d.len || 3, t = d.t || 0.14;
      const lim = Array.isArray(d.limit) ? d.limit : [-(d.limit || 0.3), d.limit || 0.3];
      const by = d.baseY != null ? d.baseY : FLOOR_Y;
      const base = statBody(sim, 0, 0, 0);
      base.createFixture(new Polygon([Vec2(d.x - 0.34, by), Vec2(d.x + 0.34, by), Vec2(d.x, d.y + 0.02)]), { friction: 0.6, userData: ud(p, 'solid', { mat: 'wood' }) });
      const a = d.angle || 0;
      const cx = d.x + Math.sin(a) * t / 2, cy = d.y - Math.cos(a) * t / 2;
      const plank = sim.world.createBody({ type: 'dynamic', position: Vec2(cx, cy), angle: a });
      const pu = ud(p, 'solid', { mat: 'wood' });
      plank.createFixture(new Box(len / 2, t / 2), { density: d.density || 1, friction: 0.7, userData: pu });
      for (const s of d.lips || []) {
        plank.createFixture(new Box(0.05, 0.1, Vec2(s * (len / 2 - 0.05), -t / 2 - 0.1), 0), { density: d.density || 1, friction: 0.7, userData: pu });
      }
      const j = sim.world.createJoint(new RevoluteJoint({ enableLimit: true, lowerAngle: lim[0], upperAngle: lim[1], referenceAngle: 0 }, base, plank, Vec2(d.x, d.y)));
      p.bodies.push(plank, base); p.joints.push(j); p.len = len; p.t = t; p.baseY = by;
    }
  };

  PARTS.pusher = {
    build(sim, p, d) {
      const dir = d.dir || 1;
      const mount = statBody(sim, d.x - dir * 0.36, d.y, 0);
      mount.createFixture(new Box(0.1, 0.26), { userData: ud(p, 'solid', { mat: 'wood' }) });
      const g = sim.world.createBody({ type: 'kinematic', position: Vec2(d.x, d.y) });
      g.createFixture(new Box(0.17, 0.16), { friction: 0.3, userData: ud(p, 'solid', { mat: 'glove' }) });
      p.bodies.push(g, mount); p.dir = dir; p.home = d.x; p.st.phase = 'rest';
    },
    trigger(sim, p) { p.st.phase = 'out'; sim.emit('boing', { x: p.def.x, y: p.def.y }); },
    update(sim, p) {
      const g = p.bodies[0], d = p.def, reach = d.reach || 0.8, sp = d.speed || 3;
      const off = (g.getPosition().x - p.home) * p.dir;
      const ph = p.st.phase;
      if (ph === 'out') {
        sim.busy++;
        if (off >= reach) { g.setLinearVelocity(Vec2(0, 0)); p.st.phase = 'hold'; p.st.t0 = sim.t; }
        else g.setLinearVelocity(Vec2(p.dir * sp, 0));
      } else if (ph === 'hold') {
        sim.busy++;
        if (sim.t - p.st.t0 > 0.5) p.st.phase = 'back';
      } else if (ph === 'back') {
        sim.busy++;
        if (off <= 0.005) { g.setLinearVelocity(Vec2(0, 0)); p.st.phase = 'done'; }
        else g.setLinearVelocity(Vec2(-p.dir * Math.min(1.2, off * 8 + 0.1), 0));
      }
    }
  };

  /* Trapdoor: a plank whose (x1, y1) end is the hinge. */
  PARTS.gate = {
    build(sim, p, d) { PARTS.plank.build(sim, p, d); },
    trigger(sim, p) {
      sim.later(() => p.bodies[0].setActive(false));
      p.st.open = true; p.st.openT = sim.t;
      sim.emit('creak', { x: p.def.x1, y: p.def.y1 });
    }
  };

  /* Button: origin on the mounting surface; angle 0 = pad faces up. */
  PARTS.button = {
    build(sim, p, d) {
      const w = d.w || 0.7;
      const b = statBody(sim, d.x, d.y, d.angle || 0);
      b.createFixture(new Box(w / 2, 0.05, Vec2(0, -0.05), 0), { userData: ud(p, 'solid', { mat: 'metal' }) });
      // the pad reaches a little past the base so a slow roller still presses it
      b.createFixture(new Box(w / 2 + 0.03, 0.16, Vec2(0, -0.26), 0), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (s > 0 && !p.st.pressed && isMover(other)) {
              p.st.pressed = true; p.st.pressT = sim2.t;
              sim2.emit('click', { x: d.x, y: d.y });
              for (const id of [].concat(d.fires || [])) sim2.fire(id, p);
            }
          }
        })
      });
      p.bodies.push(b);
    }
  };

  function ring(sim, p, other) {
    const b = other.getBody();
    if (!b.isDynamic()) return;
    const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y) + Math.abs(b.getAngularVelocity()) * 0.1;
    if (sim.t - (p.st.ringT || -9) < 0.15 || sp < 0.15) return;
    p.st.ringT = sim.t; p.st.ringAmp = Math.min(1, 0.35 + sp / 4);
    sim.emit('ding', { x: p.def.x, y: p.def.y, vol: p.st.ringAmp });
    if (p.def.goal !== false) sim.win(p);
  }

  /* Bell: origin is the hang point; the bell hangs below it. */
  PARTS.bell = {
    build(sim, p, d) {
      const s = d.size || 1;
      const b = statBody(sim, d.x, d.y, 0);
      const V = [[-0.14, 0.12], [0.14, 0.12], [0.36, 0.62], [-0.36, 0.62]].map(v => Vec2(v[0] * s, v[1] * s));
      b.createFixture(new Polygon(V), { restitution: 0.3, friction: 0.3, userData: ud(p, 'solid', { mat: 'metal', onTouch(sim2, other, sg) { if (sg > 0) ring(sim2, p, other); } }) });
      p.bodies.push(b); p.size = s;
    }
  };

  /* Cup / basket / bowl / nest: origin at the bottom centre. Classic levels
     win when a matching ball rests inside; counting levels collect balls. */
  PARTS.cup = {
    build(sim, p, d) {
      const w = d.w || 1.3, h = d.h || 0.8, th = 0.1;
      const hl = d.back === 'left' ? (d.backH || 1.6) : h, hr = d.back === 'right' ? (d.backH || 1.6) : h;
      const b = sim.world.createBody({ type: d.move ? 'kinematic' : 'static', position: Vec2(d.x, d.y) });
      const u = ud(p, 'solid', { mat: 'wood' });
      b.createFixture(new Box(w / 2, th / 2, Vec2(0, -th / 2), 0), { friction: 0.8, userData: u });
      b.createFixture(new Box(th / 2, hl / 2, Vec2(-w / 2 + th / 2, -hl / 2), 0), { friction: 0.5, userData: u });
      b.createFixture(new Box(th / 2, hr / 2, Vec2(w / 2 - th / 2, -hr / 2), 0), { friction: 0.5, userData: u });
      const inside = p.st.inside = new Map();
      b.createFixture(new Box(w / 2 - th - 0.03, h * 0.42, Vec2(0, -th - h * 0.42), 0), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (!isMover(other)) return;
            const ou = other.getUserData() || {};
            const acc = d.accept || 'ball';
            if (acc !== 'any' && (acc === 'ball' ? !ou.ball : ou.ball !== acc)) return;
            const bb = other.getBody();
            const rec = inside.get(bb) || { n: 0, t0: sim2.t };
            rec.n += s;
            if (rec.n > 0) inside.set(bb, rec); else inside.delete(bb);
          }
        })
      });
      p.bodies.push(b); p.w = w; p.h = h; p.hl = hl; p.hr = hr;
    },
    update(sim, p) {
      if (p.def.move) sway(sim, p, p.bodies[0]);
      const counting = sim.goal && sim.goal.need;
      for (const [bb, rec] of p.st.inside) {
        if (sim.t - rec.t0 <= (counting ? 0.25 : 0.35)) continue;
        if (counting) { p.st.inside.delete(bb); p.st.gotT = sim.t; sim.deliver(bb, p); }
        else if (!p.st.done) { p.st.done = true; sim.emit('swish', { x: p.def.x, y: p.def.y }); sim.win(p); }
      }
    }
  };

  PARTS.balloon = {
    build(sim, p, d) {
      const r = d.r || 0.45;
      const b = statBody(sim, d.x, d.y, 0);
      b.createFixture(new Circle(r), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (s > 0 && !p.st.popped && isMover(other)) {
              p.st.popped = true; p.st.popT = sim2.t;
              sim2.emit('pop', { x: d.x, y: d.y });
              sim2.later(() => b.setActive(false));
              if (d.goal !== false) sim2.win(p);
              for (const id of [].concat(d.fires || [])) sim2.fire(id, p);
            }
          }
        })
      });
      p.bodies.push(b); p.r = r;
    }
  };

  /* Lamp: sits on a surface at (x, y); switches on when triggered. */
  PARTS.lamp = {
    build(sim, p, d) {
      const b = statBody(sim, d.x, d.y, 0);
      b.createFixture(new Box(0.3, 0.06, Vec2(0, -0.06), 0), { userData: ud(p, 'solid', { mat: 'metal' }) });
      p.bodies.push(b);
    },
    trigger(sim, p) {
      p.st.on = true; p.st.onT = sim.t;
      sim.emit('lamp', { x: p.def.x, y: p.def.y });
      if (p.def.goal !== false) sim.win(p);
    }
  };

  /* Fan: housing centred at (x, y); blows along dir ('right' | 'left' | 'up'). */
  const DIRS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  PARTS.fan = {
    build(sim, p, d) {
      const dv = DIRS[d.dir || 'right'];
      const b = statBody(sim, d.x, d.y, 0);
      const hw = dv[0] ? 0.18 : 0.45, hh = dv[0] ? 0.45 : 0.18;
      b.createFixture(new Box(hw, hh), { userData: ud(p, 'solid', { mat: 'metal' }) });
      p.bodies.push(b); p.dv = dv; p.st.on = !!d.on;
      const reach = d.reach || 5, wid = d.width || 1.2;
      const x0 = d.x + dv[0] * 0.2, y0 = d.y + dv[1] * 0.2;
      p.region = dv[0]
        ? { x0: Math.min(x0, x0 + dv[0] * reach), x1: Math.max(x0, x0 + dv[0] * reach), y0: d.y - wid / 2, y1: d.y + wid / 2 }
        : { x0: d.x - wid / 2, x1: d.x + wid / 2, y0: Math.min(y0, y0 + dv[1] * reach), y1: Math.max(y0, y0 + dv[1] * reach) };
    },
    trigger(sim, p) { p.st.on = true; p.st.onT = sim.t; sim.emit('whir', { x: p.def.x, y: p.def.y }); },
    update(sim, p) {
      if (!p.st.on) return;
      const R = p.region, d = p.def, reach = d.reach || 5, power = d.power || 6;
      for (let b = sim.world.getBodyList(); b; b = b.getNext()) {
        if (!b.isDynamic() || !b.isActive()) continue;
        const c = b.getWorldCenter();
        if (c.x < R.x0 || c.x > R.x1 || c.y < R.y0 || c.y > R.y1) continue;
        if (b.__sail == null) b.__sail = sailOf(b, p.dv);
        const dist = Math.abs(p.dv[0] ? c.x - d.x : c.y - d.y);
        const f = power * b.__sail * (1 - 0.55 * dist / reach);
        b.applyForceToCenter(Vec2(p.dv[0] * f, p.dv[1] * f), true);
      }
    }
  };
  function sailOf(b, dv) {
    let lo = Infinity, hi = -Infinity;
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
      const s = f.getShape();
      if (s.getType() === 'circle') {
        const c = s.m_p, r = s.m_radius, v = dv[0] ? c.y : c.x;
        lo = Math.min(lo, v - r); hi = Math.max(hi, v + r);
      } else if (s.m_vertices) {
        for (const v of s.m_vertices) { const q = dv[0] ? v.y : v.x; lo = Math.min(lo, q); hi = Math.max(hi, q); }
      }
    }
    return Math.max(0.1, hi - lo);
  }

  PARTS.trampoline = {
    build(sim, p, d) {
      const w = d.w || 1.4;
      const b = statBody(sim, d.x, d.y, d.angle || 0);
      b.createFixture(new Box(w / 2, 0.08, Vec2(0, -0.42), 0), {
        restitution: d.bounce || 0.92, friction: 0.15,
        userData: ud(p, 'solid', { mat: 'mat', onTouch(sim2, other, s) { if (s > 0 && isMover(other)) { p.st.bounceT = sim2.t; sim2.emit('boing', { x: d.x, y: d.y }); } } })
      });
      b.createFixture(new Box(0.06, 0.2, Vec2(-w / 2 + 0.08, -0.2), 0), { userData: ud(p, 'solid', { mat: 'metal' }) });
      b.createFixture(new Box(0.06, 0.2, Vec2(w / 2 - 0.08, -0.2), 0), { userData: ud(p, 'solid', { mat: 'metal' }) });
      p.bodies.push(b); p.w = w;
    }
  };

  /* Conveyor: top surface y from x1 to x2; speed in m/s (+ = rightward). */
  PARTS.conveyor = {
    build(sim, p, d) {
      const hw = (d.x2 - d.x1) / 2;
      const b = statBody(sim, (d.x1 + d.x2) / 2, d.y + 0.16, 0);
      b.createFixture(new Box(hw, 0.16), { friction: 0.9, userData: ud(p, 'solid', { mat: 'belt', belt: true }) });
      p.bodies.push(b); p.st.on = !p.def.when; p.st.phase = 0;
    },
    trigger(sim, p) { p.st.on = true; sim.emit('whir', { x: p.def.x1, y: p.def.y }); },
    update(sim, p, dt) { if (p.st.on) { p.st.phase += p.def.speed * dt; sim.busy += p.def.busy ? 1 : 0; } }
  };

  /* Wind-up car sitting on a surface at (x, y). */
  PARTS.car = {
    build(sim, p, d) {
      const r = 0.2, dir = d.dir || 1;
      const chassis = sim.world.createBody({ type: 'dynamic', position: Vec2(d.x, d.y - r - 0.13) });
      chassis.createFixture(new Box(0.46, 0.14), { density: 1.2, friction: 0.4, userData: ud(p, 'solid', { mat: 'car' }) });
      // flag post up front: it meets tall things above their middle
      chassis.createFixture(new Box(0.035, 0.3, Vec2(dir * 0.5, -0.4), 0), { density: 0.3, friction: 0.3, userData: ud(p, 'solid', { mat: 'car' }) });
      const wheels = [-0.3, 0.3].map(ox => {
        const w = sim.world.createBody({ type: 'dynamic', position: Vec2(d.x + ox, d.y - r) });
        w.createFixture(new Circle(r), { density: 1.4, friction: 1.4, restitution: 0.05, userData: ud(p, 'solid', { mat: 'car' }) });
        const j = sim.world.createJoint(new RevoluteJoint({ enableMotor: false, maxMotorTorque: d.torque || 12, motorSpeed: 0 }, chassis, w, w.getPosition()));
        p.joints.push(j);
        return w;
      });
      if (d.metal) for (const b of [chassis, ...wheels]) b.__metal = true;
      for (const b of [chassis, ...wheels]) b.__car = p;
      p.bodies.push(chassis, ...wheels); p.r = r; p.dir = dir;
    },
    trigger(sim, p) {
      for (const j of p.joints) { j.enableMotor(true); j.setMotorSpeed(p.dir * (p.def.speed || 2) / p.r); }
      for (const b of p.bodies) b.setAwake(true);
      p.st.go = true;
      sim.emit('windup', { x: p.def.x, y: p.def.y });
    },
    update(sim, p) {
      if (!p.st.go || p.st.spent) return;
      if (sim.t - p.st.trigT > (p.def.run || 9)) {
        p.st.spent = true;
        for (const j of p.joints) { j.setMotorSpeed(0); j.setMaxMotorTorque(0.05); }
        return;
      }
      // a red line under the wheels winds the car up into turbo for a moment
      const turbo = p.st.turboT != null && sim.t - p.st.turboT < 0.35;
      const sp = turbo ? Math.max(p.def.speed || 2, 8) * p.st.turboDir : p.dir * (p.def.speed || 2);
      if (turbo !== !!p.st.turbo) { p.st.turbo = turbo; if (turbo) sim.emit('turbo', { x: p.bodies[0].getPosition().x, y: p.bodies[0].getPosition().y }); }
      for (const j of p.joints) j.setMotorSpeed(sp / p.r);
    }
  };

  /* Cannon: carriage on a surface at (x, y); barrel pivot above it. */
  PARTS.cannon = {
    build(sim, p, d) {
      const b = statBody(sim, d.x, d.y, 0);
      b.createFixture(new Box(0.42, 0.2, Vec2(0, -0.2), 0), { userData: ud(p, 'solid', { mat: 'wood' }) });
      p.bodies.push(b);
      p.pivot = [d.x, d.y - 0.5];
      p.ang = (d.angle != null ? d.angle : -45) * Math.PI / 180;
    },
    trigger(sim, p) {
      const d = p.def, a = p.ang, ca = Math.cos(a), sa = Math.sin(a);
      const mx = p.pivot[0] + ca * 0.75, my = p.pivot[1] + sa * 0.75, sp = d.speed || 8;
      p.st.fireT = sim.t;
      sim.later(() => {
        const bp = sim.addPart(Object.assign({ type: 'ball', style: 'meatball', x: mx, y: my, v: [ca * sp, sa * sp], spawned: true }, d.ball || {}));
        bp.st.spawnT = sim.t;
      });
      sim.emit('boom', { x: mx, y: my });
    }
  };

  /* Dispenser: drops a ball every `every` seconds, `count` times. kind
     'tube' hangs from the top; kind 'hen' walks between x1 and x2 laying eggs. */
  PARTS.dispenser = {
    when: 'start',
    build(sim, p, d) {
      p.st.n = 0; p.st.next = d.first != null ? d.first : 0.5; p.st.hx = d.kind === 'hen' ? d.x1 : d.x; p.st.face = 1;
      if (d.kind === 'cannon') {
        const b = statBody(sim, d.x, d.y, 0);
        b.createFixture(new Box(0.42, 0.2, Vec2(0, -0.2), 0), { userData: ud(p, 'solid', { mat: 'wood' }) });
        p.bodies.push(b);
      }
    },
    trigger(sim, p) { p.st.on = true; p.st.t0 = sim.t; },
    update(sim, p) {
      const d = p.def;
      if (!p.st.on) return;
      const k = sim.t - p.st.t0;
      if (d.kind === 'hen') {
        const span = d.x2 - d.x1, u = (k * (d.speed || 1) / span) % 2;
        p.st.hx = d.x1 + span * (u < 1 ? u : 2 - u);
        p.st.face = u < 1 ? 1 : -1;
      }
      if (p.st.n >= d.count) return;
      sim.busy++;
      if (k < p.st.next) return;
      const xs = d.xs || [0], n = p.st.n;
      let x = d.kind === 'hen' ? p.st.hx : d.x + xs[n % xs.length];
      let y = d.kind === 'hen' ? d.y + 0.38 : d.y, v = d.v;
      if (d.kind === 'cannon') {
        const a = (d.angle != null ? d.angle : -45) * Math.PI / 180, sp = d.speed || 8;
        x = d.x + Math.cos(a) * 0.75; y = d.y - 0.5 + Math.sin(a) * 0.75; v = [Math.cos(a) * sp, Math.sin(a) * sp];
      }
      p.st.n++; p.st.next += d.every || 2.5; p.st.dropT = sim.t;
      sim.spawned++;
      sim.later(() => sim.addPart({ type: 'ball', style: d.style || (d.kind === 'hen' ? 'egg' : 'rubber'), x, y, v, spawned: true }));
      sim.emit(d.kind === 'hen' ? 'cluck' : d.kind === 'cannon' ? 'boom' : 'plop', { x, y });
    }
  };

  /* Lava: any ball that touches it is lost; a car that touches it is done for. */
  PARTS.lava = {
    build(sim, p, d) {
      const b = statBody(sim, d.x + d.w / 2, d.y + d.h / 2, 0);
      b.createFixture(new Box(d.w / 2, d.h / 2), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (s <= 0 || !isMover(other)) return;
            const ou = other.getUserData() || {};
            if (ou.ball) sim2.lose(other.getBody(), ou.ball === 'egg' ? 'splat' : 'sizzle');
            else if (ou.part && ou.part.type === 'car') { sim2.emit('sizzle', { x: other.getBody().getPosition().x, y: d.y }); sim2.fail('car'); }
          }
        })
      });
      p.bodies.push(b);
    }
  };

  /* Star: a ball that passes through collects it. */
  PARTS.star = {
    build(sim, p, d) {
      const b = statBody(sim, d.x, d.y, 0);
      b.createFixture(new Circle(0.3), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (s <= 0 || p.st.got || !isMover(other) || !(other.getUserData() || {}).ball) return;
            p.st.got = true; p.st.gotT = sim2.t; sim2.starsGot++;
            sim2.emit('star', { x: d.x, y: d.y, n: sim2.starsGot });
            const g = sim2.goal;
            if (g && g.stars && sim2.starsGot >= g.stars) sim2.win(p);
          }
        })
      });
      p.bodies.push(b);
    }
  };

  /* Finish flag: the car (or any ball) that reaches it wins. */
  PARTS.flag = {
    build(sim, p, d) {
      const b = statBody(sim, d.x, d.y - 0.7, 0);
      b.createFixture(new Box(0.12, 0.7), {
        isSensor: true,
        userData: ud(p, 'sensor', {
          onTouch(sim2, other, s) {
            if (s <= 0 || !isMover(other)) return;
            const ou = other.getUserData() || {};
            if (ou.ball || (ou.part && ou.part.type === 'car')) { p.st.gotT = sim2.t; sim2.emit('flag', { x: d.x, y: d.y }); sim2.win(p); }
          }
        })
      });
      p.bodies.push(b);
    }
  };

  /* Boss: a crayon monster with hit points. Every ball that smacks it hard
     enough costs it a heart. It may sway, and the scribble eater gobbles
     any crayon line it touches. Origin: bottom centre. */
  PARTS.boss = {
    build(sim, p, d) {
      const b = sim.world.createBody({ type: d.move ? 'kinematic' : 'static', position: Vec2(d.x, d.y - d.h / 2) });
      b.createFixture(new Box(d.w / 2, d.h / 2), {
        restitution: 0.45, friction: 0.3,
        userData: ud(p, 'solid', {
          mat: 'boss',
          onTouch(sim2, other, s) {
            if (s <= 0 || p.st.dead) return;
            const ob = other.getBody();
            if (!ob.isDynamic()) return;
            const ou = other.getUserData() || {};
            if (d.hitBy === 'ball' && !ou.ball) return;
            const v = ob.getLinearVelocity(), bv = b.getLinearVelocity();
            const sp = Math.hypot(v.x - bv.x, v.y - bv.y);
            if (sp < (d.minHit || 1.1) || p.st.hitBy.has(ob) || sim2.t - (p.st.hitT || -9) < 0.25) return;
            p.st.hitBy.add(ob);
            p.st.hp--; p.st.hitT = sim2.t;
            const q = b.getPosition();
            sim2.emit('ouch', { x: q.x, y: q.y - d.h / 2, hp: p.st.hp });
            if (p.st.hp <= 0) { p.st.dead = true; p.st.deadT = sim2.t; sim2.emit('defeat', { x: q.x, y: q.y }); sim2.win(p); }
          }
        })
      });
      p.bodies.push(b);
      p.st.hp = d.hp || 3; p.st.hitBy = new Set();
    },
    update(sim, p) {
      const d = p.def, b = p.bodies[0];
      if (p.st.dead) { if (d.move) b.setLinearVelocity(Vec2(0, 0)); return; }
      if (d.move) sway(sim, p, b);
      if (d.eats) {
        const q = b.getPosition(), c = [q.x, q.y], reach = Math.max(d.w, d.h) / 2 + 0.12;
        for (const rec of sim.strokes.slice()) {
          if (geom.nearest(c, sim.strokeWorldPts(rec))[2] < reach) { sim.removeStroke(rec); p.st.chompT = sim.t; sim.emit('chomp', { x: q.x, y: q.y }); }
        }
      }
    }
  };

  // Decorations and zones: no physics.
  for (const k of ['nodraw', 'note', 'deco', 'cat', 'arrow', 'wire', 'label']) PARTS[k] = {};

  CC.Sim = Sim;
  CC.geom = geom;
  CC.PARTS = PARTS;
  CC.BALLS = BALLS;
  CC.CRAYONS = CRAYONS;
  CC.K = { DT, W, H, FLOOR_Y, SOLID_R, LOOSE_T, plankGeo };
})(typeof window !== 'undefined' ? window : globalThis);
