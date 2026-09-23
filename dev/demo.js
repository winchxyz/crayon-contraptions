/* Crayon Contraptions — demo video recorder. Runs on the dev server page:
     const s = document.createElement('script'); s.src = '/dev/demo.js'; document.head.appendChild(s);
     DEMO.run()                 // records every scene
     DEMO.status                // { frame, scene, done, error }
   The game is frozen and driven on a virtual 30 fps clock, so every frame is
   exact no matter how slowly the browser renders. Frames land in
   shots/dm_NNNN.jpg; node tools/make-demo.js turns them into the MP4 and GIF. */
(function () {
  'use strict';
  const D = window.CCDBG, CC = window.CC;
  const FPS = 30, WIDTH = 1280, SKETCH = CC.Draw.SKETCH;
  const real = performance.now.bind(performance);
  const status = { frame: 0, scene: '', done: false, error: null };
  let vt = 0, n = 0;

  /* ---------- drawing helpers (sheet coordinates, 1600 x 900) ---------- */
  function g() { const x = D.gfx(); x.ctx.setTransform(x.k, 0, 0, x.k, 0, 0); x.cr.boil = Math.floor(vt / 150) % 3; return x; }
  function crayonIcon(cr, ctx, x, y, kind, ang, len) {
    const col = CC.Draw.INK[kind] ? CC.Draw.INK[kind].col : CC.PAL.blue, L = len || 120, h = L * 0.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    cr.shape([[0, 0], [h * 1.1, -h / 2], [h * 1.1, h / 2]], { fill: '#F2D7A8', stroke: CC.PAL.graphite, w: 2.2, seed: 1 });
    cr.shape([[0, 0], [h * 0.45, -h * 0.2], [h * 0.45, h * 0.2]], { fill: col, stroke: col, w: 1.6, seed: 2 });
    cr.shape([[h * 1.1, -h / 2], [L, -h / 2], [L, h / 2], [h * 1.1, h / 2]], { fill: col, stroke: CC.PAL.graphite, w: 2.4, gap: 4, seed: 3 });
    cr.shape([[L * 0.35, -h / 2], [L * 0.75, -h / 2], [L * 0.75, h / 2], [L * 0.35, h / 2]], { fill: CC.PAL.paper, stroke: CC.PAL.graphite, w: 1.8, seed: 4, wash: 0.8 });
    ctx.restore();
  }
  function caption(text, age, kind, bottom) {
    const { ctx, cr } = g();
    const size = 48;
    ctx.font = `700 ${size}px ${SKETCH}`;
    const tw = ctx.measureText(text).width, iw = kind ? 150 : 0;
    const w = tw + iw + 70, h = 84, x = 800 - w / 2, y = bottom ? 900 - 84 - 40 : 26;
    const s = Math.min(1, 0.55 + age * 5), a = Math.min(1, age * 6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(800, y + h / 2); ctx.scale(s, s); ctx.rotate(-0.012); ctx.translate(-800, -(y + h / 2));
    ctx.shadowColor = 'rgba(58, 38, 22, 0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    cr.line([[x + 4, y + 3], [x + w - 3, y + 5], [x + w - 5, y + h - 3], [x + 3, y + h - 5]], { color: CC.PAL.graphite, w: 2.6, closed: true, seed: 9 });
    if (kind) crayonIcon(cr, ctx, x + 32, y + h / 2 + 2, kind, 0, 118);
    cr.text(text, x + 35 + iw + tw / 2, y + h / 2 + 2, { size, font: SKETCH, weight: 700, color: '#1E1B24', align: 'center' });
    ctx.restore();
  }
  function card(lines, t) {
    const { ctx, cr } = g();
    CC.Draw.paper({ ctx, cr, t: vt / 1000 }, 'graph');
    CC.Draw.floor({ ctx, cr, t: vt / 1000 });
    for (const L of lines) {
      const age = t - (L.at || 0);
      if (age < 0) continue;
      const s = Math.min(1, 0.4 + age * 4.5), a = Math.min(1, age * 5);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(L.x, L.y); ctx.scale(s, s); ctx.rotate(L.rot || 0);
      if (L.crayon) crayonIcon(cr, ctx, 0, 0, L.crayon, L.ang || 0, 150);
      else cr.text(L.text, 0, 0, { size: L.size, font: L.font || SKETCH, weight: L.weight || 700, color: L.color || CC.PAL.graphite, align: 'center', halo: L.halo });
      ctx.restore();
    }
  }

  /* ---------- the clock and the capture ---------- */
  async function frame(fn, noGame) {
    vt += 1000 / FPS;
    if (!noGame) D.render(vt);
    if (fn) fn();
    await D.capture('dm_' + String(n).padStart(4, '0'), 0.92);
    n++; status.frame = n;
  }
  function load(li) {
    D.loadLevel(li);
    document.getElementById('overlay').hidden = true;
    D.size(WIDTH);
  }
  const dense = (pts, step) => CC.geom.resample(pts, step || 0.08);
  function partial(pts, u) { const k = Math.max(2, Math.round(pts.length * u)); return pts.slice(0, k); }

  /* ---------- scenes ---------- */
  async function titleScene() {
    status.scene = 'title';
    const kinds = ['solid', 'loose', 'bouncy', 'floaty', 'hinge', 'zoom', 'magnet'];
    const lines = [
      { text: 'Crayon', x: 760, y: 190, size: 150, color: '#8E1F1A', rot: -0.05, at: 0.1 },
      { text: 'Contraptions', x: 820, y: 350, size: 150, color: '#1D3F8A', rot: 0.02, at: 0.35 },
      { text: 'a Rube Goldberg puzzle you draw', x: 800, y: 480, size: 48, font: '"Patrick Hand", cursive', weight: 400, at: 0.8 }
    ];
    kinds.forEach((k, i) => lines.push({ crayon: k, x: 290 + i * 170, y: 650 + (i % 2) * 14, ang: -0.35 + (i % 3) * 0.12, at: 1.2 + i * 0.12 }));
    for (let f = 0; f < 105; f++) await frame(() => card(lines, f / FPS), true);
  }

  async function firstScribble() {
    status.scene = 'first scribble';
    load(0);
    D.clear();
    const sol = CC.LEVELS[0].solution[0].pts;
    const path = dense([sol[0], [(sol[0][0] + sol[1][0]) / 2, (sol[0][1] + sol[1][1]) / 2 + 0.06], sol[1]]);
    for (let f = 0; f < 12; f++) await frame(() => caption('Draw the missing part', f / FPS));
    for (let f = 0; f <= 40; f++) {
      const p = partial(path, f / 40);
      D.setDrawing('solid', p);
      const tip = p[p.length - 1];
      await frame(() => { caption('Draw the missing part', (12 + f) / FPS); const { ctx, cr } = g(); crayonIcon(cr, ctx, tip[0] * 100, tip[1] * 100, 'solid', -0.75, 120); });
    }
    D.drawStroke('solid', path);
    for (let f = 0; f < 14; f++) await frame(() => caption('...then press GO', f / FPS));
    D.go();
    for (let f = 0; f < 150; f++) { D.tick(1 / FPS); await frame(() => caption('...then press GO', (14 + f) / FPS)); }
  }

  async function runSolved(li, secs, text, kind, skip) {
    status.scene = CC.LEVELS[li].name;
    load(li);
    D.solve();
    D.go();
    if (skip) D.tick(skip);
    const total = Math.round(secs * FPS);
    for (let f = 0; f < total; f++) { D.tick(1 / FPS); await frame(() => caption(text, f / FPS, kind)); }
  }

  /* live levels: the known answer is fed in on time; each line is shown being
     drawn in the half second before it lands */
  async function runLive(li, from, secs, text, bottom) {
    status.scene = CC.LEVELS[li].name;
    load(li);
    D.playLive();
    const sim = D.st.sim;
    if (from) D.tick(from);
    const sols = CC.LEVELS[li].solution.filter(s => s.at != null).map(s => Object.assign({}, s, { dpts: dense(s.pts) }));
    const total = Math.round(secs * FPS);
    for (let f = 0; f < total; f++) {
      D.tick(1 / FPS);
      const t = sim.t;
      const drawing = sols.find(s => t >= s.at - 0.45 && t < s.at);
      let tip = null;
      if (drawing) { const p = partial(drawing.dpts, (t - (drawing.at - 0.45)) / 0.45); D.setDrawing(drawing.kind, p); tip = [p[p.length - 1], drawing.kind]; }
      else D.setDrawing(null);
      await frame(() => {
        caption(text, f / FPS, null, bottom);
        if (tip) { const { ctx, cr } = g(); crayonIcon(cr, ctx, tip[0][0] * 100, tip[0][1] * 100, tip[1], -0.75, 120); }
      });
    }
    D.setDrawing(null);
  }

  async function endScene() {
    status.scene = 'end';
    const lines = [
      { text: 'Crayon Contraptions', x: 800, y: 250, size: 120, color: '#1D3F8A', rot: -0.03, at: 0.1 },
      { text: '100 levels  ·  7 crayons  ·  10 bosses', x: 800, y: 400, size: 58, color: '#8E1F1A', at: 0.5 },
      { text: 'play free in your browser', x: 800, y: 530, size: 46, font: '"Patrick Hand", cursive', weight: 400, at: 0.9 },
      { text: 'winchxyz.github.io/crayon-contraptions', x: 800, y: 612, size: 54, color: '#2F2B36', at: 1.1 }
    ];
    for (let f = 0; f < 120; f++) await frame(() => card(lines, f / FPS), true);
  }

  async function run() {
    try {
      await document.fonts.ready;
      CC.clearSprites();
      D.freeze(true);
      D.size(WIDTH);
      D.setTool('solid');
      vt = real(); performance.now = () => vt;
      n = 0;
      await titleScene();
      await firstScribble();
      await runSolved(18, 7.7, 'Every part sets off the next');
      await runSolved(10, 2.9, 'Orange crayon falls', 'loose');
      await runSolved(22, 3.7, 'Green crayon bounces', 'bouncy');
      await runSolved(32, 2.9, 'Yellow crayon floats', 'floaty');
      await runSolved(50, 3.2, 'Purple crayon swings', 'hinge');
      await runSolved(61, 4.3, 'Red crayon zooms', 'zoom');
      await runSolved(70, 2.6, 'Black crayon is a magnet', 'magnet');
      await runLive(42, 1.2, 7.2, 'Some levels won’t wait for you', true);
      await runSolved(59, 3.9, 'Every tenth level: a boss');
      await runLive(99, 5.2, 5.8, 'All the way to the Crayon Dragon');
      await endScene();
      status.done = true;
    } catch (e) {
      status.error = String(e && e.stack || e);
    } finally {
      performance.now = real;
      D.freeze(false);
    }
  }

  /* re-shoot only the title card (frames 0..104) */
  async function title() {
    await document.fonts.ready;
    D.freeze(true); D.size(WIDTH);
    vt = real(); performance.now = () => vt; n = 0;
    try { await titleScene(); } finally { performance.now = real; D.freeze(false); }
  }

  window.DEMO = { run, title, status };
})();
