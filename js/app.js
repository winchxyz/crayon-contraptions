/* Crayon Contraptions — the app: input, loop, screens. */
(function () {
  'use strict';
  const CC = window.CC;
  const { Sim, geom, LEVELS, WORLDS, PAL, Crayon, Draw, Audio } = CC;
  const { DT } = CC.K;
  const S = 100;
  const $ = s => document.querySelector(s);
  const cv = $('#cv'), ctx = cv.getContext('2d'), sheet = $('#sheet');
  const cr = new Crayon(ctx);
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ORDER = ['solid', 'loose', 'bouncy', 'floaty', 'hinge', 'zoom', 'magnet'];
  const TOOLS = {
    solid: ['Blue', 'stays put'], loose: ['Orange', 'heavy, falls at GO'], bouncy: ['Green', 'bouncy'],
    floaty: ['Yellow', 'floats up'], hinge: ['Purple', 'swings from a pin'], zoom: ['Red', 'boosts along'],
    magnet: ['Black', 'magnet for steel'], erase: ['Eraser', 'rubs out a bit']
  };
  const ERASER_R = 0.24;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage is a convenience */ } }
  };

  const st = {
    li: 0, level: null, world: null, tool: 'solid', mode: 'edit', sim: null,
    strokes: {}, hist: {}, drawing: null, erasing: false, pointer: null,
    hintUntil: 0, fx: [], confetti: [], wonShown: false, stalledShown: false, runStart: 0,
    progress: store.get('cc-progress', {}), fails: 0,
    liveInk: 0, liveDrawn: 0, liveRecs: [], countT: 0, eraseSnap: null, eraseChanged: false
  };
  let k = 1, bg = [], acc = 0, last = performance.now(), toastTimer = 0;

  /* ---------- helpers ---------- */
  const live = () => !!(st.level && st.level.live);
  const strokes = () => st.strokes[st.level.id] || (st.strokes[st.level.id] = []);
  const hist = () => st.hist[st.level.id] || (st.hist[st.level.id] = []);
  const inkUsed = () => live() ? st.liveDrawn : strokes().reduce((a, s) => a + geom.inkOf(s), 0);
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const canDraw = () => live() ? ['ready', 'count', 'run'].includes(st.mode) : st.mode === 'edit';
  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 1800);
  }
  function saveStrokes() {
    const out = {};
    for (const id in st.strokes) if (st.strokes[id].length && !(LEVELS.find(l => l.id === id) || {}).live) out[id] = st.strokes[id];
    store.set('cc-strokes', out);
  }
  function starsFor(lv, sim) {
    if (lv.goal && lv.goal.need) {
      const d = sim.delivered, n = lv.goal.need, of = lv.goal.of;
      return d >= of ? 3 : d >= n + Math.ceil((of - n) / 2) ? 2 : 1;
    }
    const used = inkUsed();
    return used <= lv.par[0] + 1e-6 ? 3 : used <= lv.par[1] + 1e-6 ? 2 : 1;
  }
  function totalStars() { return LEVELS.reduce((a, l) => a + (st.progress[l.id] || 0), 0); }
  function syncTotal() { $('#totalStars').innerHTML = `&#9733; ${totalStars()} / ${LEVELS.length * 3}`; }

  /* ---------- sizing & the cached background ---------- */
  function resize() {
    if (st.frozen) return;
    const wrap = $('.sheet-wrap');
    const avail = wrap.clientWidth;
    let w = avail;
    if (window.innerWidth > 980) {
      const top = wrap.getBoundingClientRect().top;
      const maxH = window.innerHeight - Math.max(0, top) - 26;
      w = Math.min(avail, Math.max(520, maxH * 16 / 9));
    }
    sheet.style.width = Math.floor(w) + 'px';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(320, Math.round(w * dpr)), H = Math.round(W * 9 / 16);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W; cv.height = H;
      k = W / 1600;
      cr.res = k;
      cr.pats.clear();
      buildStatic();
    }
  }
  function staticInto(c2, boil, sim, scale, paperKind) {
    const cr2 = new Crayon(c2);
    cr2.boil = boil;
    cr2.res = scale;
    c2.setTransform(scale, 0, 0, scale, 0, 0);
    const g = { ctx: c2, cr: cr2, t: 0 };
    Draw.paper(g, paperKind);
    Draw.floor(g);
    for (const p of sim.parts) { const R = Draw.R[p.type]; if (R && R.stat) R.stat(g, p, sim); }
    return g;
  }
  function buildStatic() {
    if (!st.sim) return;
    bg = [0, 1, 2].map(b => {
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = cv.height;
      staticInto(c.getContext('2d'), b, st.sim, k, st.world.paper);
      return c;
    });
  }

  /* ---------- level flow ---------- */
  function newSim() {
    st.sim = new Sim(st.level, live() ? [] : strokes());
    st.liveRecs = [];
  }
  function loadLevel(i) {
    finishStroke();
    st.li = Math.max(0, Math.min(LEVELS.length - 1, i));
    st.level = LEVELS[st.li];
    st.world = WORLDS[st.level.world] || WORLDS[0];
    if (!st.level.crayons.includes(st.tool)) st.tool = st.level.crayons[0];
    st.fx = []; st.confetti = []; st.hintUntil = 0; st.fails = 0;
    newSim();
    st.mode = live() ? 'ready' : 'edit';
    st.liveInk = live() ? st.level.live.ink : 0; st.liveDrawn = 0;
    store.set('cc-level', st.li);
    hideOverlay(); $('#failNote').hidden = true; $('#countdown').hidden = true;
    Audio.fan(false);
    renderCaption(); renderTools(); syncInk(); syncGo(); syncHud();
    const b = $('#banner');
    b.hidden = !st.level.bossLevel;
    if (st.level.bossLevel) b.textContent = 'BOSS · ' + (st.level.boss || st.level.name);
    buildStatic();
    cv.setAttribute('aria-label', `Level ${st.level.n}: ${st.level.name}. ${st.level.story}`);
    if (st.level.n === st.world.first && !store.get('cc-seen-world-' + st.level.world, 0)) showWorldIntro();
  }
  function renderCaption() {
    const lv = st.level;
    $('#lvlEyebrow').textContent = `World ${lv.world + 1}: ${st.world.name} · ${lv.n} of ${LEVELS.length}`;
    $('#tagBoss').hidden = !lv.bossLevel;
    $('#tagLive').hidden = !lv.live;
    $('#lvlName').textContent = lv.name;
    const youLetters = new Set(lv.parts.filter(p => p.type === 'label' && p.you).map(p => p.text));
    const story = $('#lvlStory');
    story.textContent = '';
    lv.story.split(/\(([A-Z])\)/).forEach((chunk, i) => {
      if (i % 2) {
        const b = document.createElement('b');
        b.className = 'lt' + (youLetters.has(chunk) ? ' you' : '');
        b.textContent = chunk;
        story.appendChild(b);
      } else story.appendChild(document.createTextNode(chunk));
    });
    $('#lvlTip').textContent = lv.tip;
    $('#btnPrev').disabled = st.li === 0;
    $('#btnNext').disabled = st.li === LEVELS.length - 1;
  }
  function renderTools() {
    const box = $('#tools');
    box.textContent = '';
    const list = ORDER.filter(t => st.level.crayons.includes(t)).concat(['erase']);
    for (const t of list) {
      const b = document.createElement('button');
      b.className = 'tool'; b.type = 'button'; b.dataset.tool = t;
      b.setAttribute('role', 'radio');
      const key = t === 'erase' ? 'E' : String(ORDER.indexOf(t) + 1);
      b.innerHTML = `<span class="stick ${t}"></span><span><b>${TOOLS[t][0]}<span class="key">${key}</span></b><small>${TOOLS[t][1]}</small></span>`;
      b.addEventListener('click', () => { Audio.unlock(); setTool(t); });
      box.appendChild(b);
    }
    syncTools();
  }
  function syncTools() {
    document.querySelectorAll('.tool').forEach(b => b.setAttribute('aria-checked', String(st.tool === b.dataset.tool)));
    sheet.dataset.tool = st.tool;
  }
  function syncInk() {
    const lv = st.level;
    const cap = lv.ink, left = live() ? st.liveInk : Math.max(0, cap - inkUsed());
    $('#inkWord').textContent = live() ? 'Crayon (refills)' : 'Crayon left';
    $('#inkNum').textContent = left.toFixed(1) + ' of ' + cap;
    $('#inkFill').style.width = (left / cap * 100) + '%';
    const showPar = !live() && lv.par;
    $('#par3').hidden = $('#par2').hidden = !showPar;
    if (showPar) {
      $('#par3').style.left = Math.max(0, (cap - lv.par[0]) / cap * 100) + '%';
      $('#par2').style.left = Math.max(0, (cap - lv.par[1]) / cap * 100) + '%';
    }
  }
  function syncGo() {
    const b = $('#btnGo');
    let label = 'GO!', rew = false;
    if (live()) { if (st.mode !== 'ready') { label = 'Restart'; rew = true; } }
    else if (st.mode !== 'edit') { label = 'Rewind'; rew = true; }
    b.classList.toggle('rewind', rew);
    b.textContent = label;
    b.setAttribute('aria-label', rew ? 'Start over' : 'Run the machine');
    sheet.dataset.mode = st.mode;
  }
  function syncHud() {
    const lv = st.level, sim = st.sim, hud = $('#hud'), bits = [];
    if (lv.goal && lv.goal.need) {
      const lostOk = lv.goal.of - lv.goal.need;
      bits.push(`<span>Caught ${sim.delivered} of ${lv.goal.need}</span>`);
      bits.push(`<span class="${sim.lost >= lostOk ? 'bad' : ''}">Lost ${sim.lost} of ${lostOk}</span>`);
    }
    if (lv.goal && lv.goal.stars) bits.push(`<span>Stars ${sim.starsGot} of ${lv.goal.stars}</span>`);
    if (live() && st.mode !== 'ready') {
      const left = Math.max(0, (lv.live.time || 45) - sim.t);
      bits.push(`<span class="${left < 6 ? 'bad' : ''}">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>`);
    }
    const html = bits.join('');
    if (hud.innerHTML !== html) hud.innerHTML = html;
  }

  function go() {
    Audio.unlock();
    if (live()) { if (st.mode === 'ready') startCountdown(); else restart(); return; }
    if (st.mode !== 'edit') { rewind(); return; }
    finishStroke();
    newSim();
    st.sim.start();
    st.mode = 'run'; st.runStart = performance.now(); acc = 0;
    st.wonShown = false; st.stalledShown = false; st.fx = []; st.confetti = [];
    $('#failNote').hidden = true;
    Audio.play('tap');
    syncGo();
  }
  function startCountdown() {
    st.mode = 'count'; st.countT = performance.now(); st.runStart = st.countT + 2800;
    st.wonShown = false; st.stalledShown = false;
    $('#failNote').hidden = true;
    syncGo();
  }
  function restart() {
    finishStroke();
    newSim();
    st.liveInk = st.level.live.ink; st.liveDrawn = 0;
    st.fx = []; st.confetti = [];
    Audio.fan(false);
    $('#failNote').hidden = true; hideOverlay();
    syncInk(); syncHud();
    startCountdown();
  }
  function rewind() {
    finishStroke();
    newSim();
    if (live()) { st.mode = 'ready'; st.liveInk = st.level.live.ink; st.liveDrawn = 0; $('#countdown').hidden = true; }
    else st.mode = 'edit';
    st.fx = []; st.confetti = [];
    Audio.fan(false);
    $('#failNote').hidden = true; hideOverlay();
    syncGo(); syncInk(); syncHud();
  }

  /* ---------- drawing ---------- */
  function toWorld(ev) {
    const r = cv.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width * 16, (ev.clientY - r.top) / r.height * 9];
  }
  const inkLeft = () => live() ? st.liveInk : st.level.ink - inkUsed();
  const outMsg = () => live() ? 'Out of crayon! It refills in a moment.' : 'Out of crayon! Undo or erase a line to get some back.';
  function startStroke(p, ev) {
    const kind = st.tool;
    if (!st.level.crayons.includes(kind)) return;
    if (inkLeft() < 0.3) { toast(outMsg()); Audio.play('nope'); return; }
    const why = st.sim.blocked(p, kind);
    if (why) { toast(why); Audio.play('nope'); return; }
    st.drawing = { kind, raw: [p], len: 0, lastT: ev.timeStamp };
  }
  function extendStroke(p, ev) {
    const d = st.drawing;
    const a = d.raw[d.raw.length - 1], L = Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (L < 0.02) return;
    const n = Math.ceil(L / 0.05);
    for (let i = 1; i <= n; i++) {
      const q = lerp(a, p, i / n), why = st.sim.blocked(q, d.kind);
      if (why) {
        if (i > 1) { const u = (i - 1) / n; d.raw.push(lerp(a, p, u)); d.len += L * u; if (live()) st.liveInk = Math.max(0, st.liveInk - L * u); }
        toast(why); Audio.play('nope'); finishStroke(); return;
      }
    }
    const left = live() ? st.liveInk : inkLeft() - d.len;
    if (L >= left) {
      const u = Math.max(0, left - 0.01) / L;
      d.raw.push(lerp(a, p, u)); d.len += L * u;
      if (live()) st.liveInk = Math.max(0, st.liveInk - L * u);
      toast(outMsg(), 2400);
      finishStroke(); return;
    }
    d.raw.push(p); d.len += L;
    if (live()) { st.liveInk -= L; syncInk(); }
    const dt = Math.max(8, ev.timeStamp - d.lastT); d.lastT = ev.timeStamp;
    Audio.scribble(Math.min(1, L / dt * 180));
  }
  function finishStroke() {
    const d = st.drawing;
    if (!d) return;
    st.drawing = null;
    Audio.scribble(0);
    let pts = geom.prepare(d.raw);
    if (!pts.length) return;
    if (geom.isDot(pts)) pts = [pts[0]];
    const s = { kind: d.kind, pts };
    if (live()) {
      if (geom.isDot(pts)) st.liveInk = Math.max(0, st.liveInk - 0.3);
      st.liveDrawn += geom.inkOf(s);
      st.liveRecs.push(st.sim.addStroke(s));
      syncInk();
      return;
    }
    if (inkUsed() + geom.inkOf(s) > st.level.ink + 0.02) { toast('Out of crayon!'); return; }
    hist().push(strokes().slice());
    strokes().push(s);
    st.sim.addStroke(s);
    syncInk(); saveStrokes();
  }
  /* Rub out only what is under the eraser; lines split around the gap. */
  function eraseAt(p) {
    let changed = false;
    if (!live()) {
      const out = [];
      for (const s of strokes()) {
        const pieces = geom.eraseSplit(s.pts, p, ERASER_R);
        if (!pieces) { out.push(s); continue; }
        changed = true;
        for (const pc of pieces) out.push({ kind: s.kind, pts: pc });
      }
      if (changed) { st.strokes[st.level.id] = out; st.sim = new Sim(st.level, out); }
    } else {
      for (const rec of st.sim.strokes.slice()) {
        if (rec.body.isStatic()) {
          const pieces = geom.eraseSplit(rec.stroke.pts, p, ERASER_R);
          if (!pieces) continue;
          changed = true;
          st.sim.removeStroke(rec);
          for (const pc of pieces) { const r2 = st.sim.addStroke({ kind: rec.kind, pts: pc }); r2.born = rec.born; }
        } else if (geom.nearest(p, st.sim.strokeWorldPts(rec))[2] < ERASER_R) { changed = true; st.sim.removeStroke(rec); }
      }
    }
    if (changed) {
      st.eraseChanged = true;
      if (!st.erT || performance.now() - st.erT > 90) { Audio.play('erase'); st.erT = performance.now(); }
      syncInk();
      if (!live()) saveStrokes();
    }
  }
  function undo() {
    if (live()) {
      let rec = st.liveRecs.pop();
      while (rec && rec.gone) rec = st.liveRecs.pop();
      if (rec) st.sim.removeStroke(rec); else toast('Nothing to undo');
      return;
    }
    if (st.mode !== 'edit') rewind();
    const h = hist();
    if (!h.length) { toast('Nothing to undo'); return; }
    st.strokes[st.level.id] = h.pop();
    st.sim = new Sim(st.level, strokes());
    syncInk(); saveStrokes();
  }
  function clearAll() {
    if (live()) { for (const rec of st.sim.strokes.slice()) st.sim.removeStroke(rec); st.liveRecs = []; return; }
    if (st.mode !== 'edit') rewind();
    if (!strokes().length) return;
    hist().push(strokes().slice());
    st.strokes[st.level.id] = [];
    st.sim = new Sim(st.level, []);
    syncInk(); saveStrokes();
    toast('Sheet cleared. Undo brings it back.');
  }
  function setTool(t) {
    if (t !== 'erase' && !st.level.crayons.includes(t)) { toast('That crayon is not in this level'); return; }
    finishStroke();
    st.tool = t;
    syncTools();
  }

  cv.addEventListener('pointerdown', ev => {
    Audio.unlock();
    if (ev.button > 0) return;
    if (!canDraw()) { toast(live() ? 'Press Restart to try again' : 'Press Rewind to draw again'); return; }
    const p = toWorld(ev);
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    ev.preventDefault();
    if (st.tool === 'erase') {
      st.erasing = true; st.eraseChanged = false;
      if (!live()) st.eraseSnap = strokes().slice();
      eraseAt(p); return;
    }
    startStroke(p, ev);
  });
  cv.addEventListener('pointermove', ev => {
    st.pointer = toWorld(ev);
    if (!canDraw()) return;
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    const list = evs.length ? evs : [ev];
    if (st.drawing) { for (const e of list) { if (!st.drawing) break; extendStroke(toWorld(e), e); } return; }
    if (st.tool === 'erase' && st.erasing) for (const e of list) eraseAt(toWorld(e));
  });
  const up = () => {
    if (st.erasing && !live() && st.eraseChanged && st.eraseSnap) hist().push(st.eraseSnap);
    st.erasing = false; st.eraseSnap = null;
    finishStroke();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { st.pointer = null; });

  /* ---------- running ---------- */
  function fxText(text, x, y, color, size, life) { st.fx.push({ text, x: x * S, y: y * S, color, size: size || 44, t0: performance.now(), life: life || 1100 }); }
  function confetti(x, y, n) {
    if (reduced) return;
    const cols = [PAL.red, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.purple, PAL.pink];
    for (let i = 0; i < (n || 70); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 380 + Math.random() * 520;
      st.confetti.push({ x: x * S, y: y * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, c: cols[i % cols.length], l: 10 + Math.random() * 12, t0: performance.now() });
    }
  }
  function partXY(p) {
    if (!p) return [8, 4];
    const d = p.def;
    if (p.type === 'cup') { const q = p.bodies[0].getPosition(); return [q.x, q.y - p.h - 0.3]; }
    if (p.type === 'bell') return [d.x, d.y + 0.4];
    if (p.type === 'boss') { const q = p.bodies[0].getPosition(); return [q.x, q.y - d.h / 2]; }
    return [d.x != null ? d.x : 8, d.y != null ? d.y : 4];
  }
  function drain() {
    const sim = st.sim;
    for (const e of sim.events) {
      switch (e.name) {
        case 'hit': Audio.play('hit', e); break;
        case 'ding': Audio.play('ding', e); fxText('DING!', e.x + 0.9, e.y + 0.2, PAL.gold, 46); break;
        case 'pop': Audio.play('pop'); fxText('POP!', e.x, e.y - 0.1, PAL.red, 56); break;
        case 'click': Audio.play('click'); fxText('click!', e.x + 0.2, e.y - 0.75, PAL.graphite, 30); break;
        case 'boing': Audio.play('boing'); fxText('boing!', e.x + 0.3, e.y - 0.9, PAL.blue, 30, 800); break;
        case 'boom': Audio.play('boom'); fxText('BOOM!', e.x - 0.3, e.y - 0.6, PAL.darkred, 44, 800); break;
        case 'creak': Audio.play('creak'); break;
        case 'whir': Audio.fan(true); fxText('whirr', e.x + 0.6, e.y - 0.7, PAL.navy, 28); break;
        case 'windup': Audio.play('windup'); fxText('zzzip!', e.x, e.y - 1.0, PAL.darkred, 30); break;
        case 'release': case 'plop': Audio.play('release'); break;
        case 'swish': case 'flag': Audio.play('swish'); break;
        case 'lamp': Audio.play('lamp'); break;
        case 'cluck': Audio.play('cluck'); break;
        case 'deliver': Audio.play('deliver'); fxText('+1', e.x, e.y - 0.8, PAL.green, 44, 900); syncHud(); break;
        case 'sizzle': Audio.play('sizzle'); fxText('tsss!', e.x, e.y - 0.6, PAL.red, 34, 800); syncHud(); break;
        case 'splat': Audio.play('splat'); fxText('splat!', e.x, e.y - 0.5, PAL.orange, 38, 900); syncHud(); break;
        case 'star': Audio.play('star'); syncHud(); break;
        case 'ouch': Audio.play('ouch'); fxText(e.hp > 0 ? 'OUCH!' : 'OOF!', e.x + 0.4, e.y - 0.8, PAL.red, 52, 1000); break;
        case 'defeat': Audio.play('defeat'); confetti(e.x, e.y, 90); break;
        case 'chomp': Audio.play('chomp'); fxText('chomp!', e.x, e.y - 1.0, PAL.pink, 34, 700); break;
        case 'turbo': Audio.play('turbo'); fxText('TURBO!', e.x, e.y - 1.0, PAL.red, 34, 700); break;
        case 'win': {
          Audio.play('win');
          const [x, y] = partXY(e.part);
          fxText(st.level.verb, x, y - 0.6, PAL.red, 70, 1800);
          confetti(x, y);
          break;
        }
      }
    }
    sim.events.length = 0;
  }
  function showWin() {
    st.wonShown = true; st.mode = 'won'; syncGo();
    const lv = st.level, stars = starsFor(lv, st.sim);
    const prev = st.progress[lv.id] || 0;
    if (stars > prev) { st.progress[lv.id] = stars; store.set('cc-progress', st.progress); syncTotal(); }
    const lastLevel = st.li === LEVELS.length - 1;
    let line;
    if (lv.goal && lv.goal.need) line = `You saved <b>${st.sim.delivered}</b> of ${lv.goal.of}. ${stars < 3 ? 'Save them all for three stars.' : 'Every single one. Wow.'}`;
    else if (live()) line = `You drew <b>${inkUsed().toFixed(1)}</b> of crayon. ${stars < 3 ? `Draw ${lv.par[0]} or less for three stars.` : 'Quick and tidy!'}`;
    else line = `You used <b>${inkUsed().toFixed(1)}</b> of ${lv.ink} crayon. ${stars < 3 ? `Use ${lv.par[0]} or less for three stars.` : 'Three stars. Tidy machine!'}`;
    const bossLine = lv.bossLevel ? `<p><b>${lv.boss || lv.name}</b> is beaten!${lv.world < WORLDS.length - 1 ? ` Next up: ${WORLDS[lv.world + 1].name}.` : ''}</p>` : '';
    showOverlay(`
      <div class="panel card" role="dialog" aria-label="Level complete">
        <p class="verb">${lv.verb}</p>
        <div class="stars" aria-label="${stars} of 3 stars"><span class="${stars >= 1 ? 'on' : ''}">&#9733;</span><span class="${stars >= 2 ? 'on' : ''}">&#9733;</span><span class="${stars >= 3 ? 'on' : ''}">&#9733;</span></div>
        <p>${line}</p>
        ${bossLine}
        ${lastLevel ? '<p>That was the Crayon Dragon. You finished all 100 contraptions!</p>' : ''}
        <div class="row">
          ${lastLevel ? '<button class="chip primary" data-act="levels" type="button">All levels</button>' : '<button class="chip primary" data-act="next" type="button">Next level &rarr;</button>'}
          <button class="chip" data-act="replay" type="button">${live() ? 'Play again' : 'Watch again'}</button>
          <button class="chip" data-act="tinker" type="button">Keep tinkering</button>
        </div>
      </div>`, true);
  }
  const FAIL_TEXT = {
    stopped: 'The machine stopped. Rewind, change your drawing, and try again.',
    lost: 'Too many fell in the lava! Restart and catch more of them.',
    stuck: 'Everything got stuck before enough reached the goal.',
    time: 'Out of time! Restart and draw a little sooner.',
    car: 'The car drove into the lava! Bridge the gap before it gets there.'
  };
  function showStalled() {
    st.stalledShown = true; st.mode = 'stalled'; st.fails++;
    Audio.fan(false); Audio.play('stalled');
    const why = st.sim.failReason || 'stopped';
    $('#failText').textContent = st.fails >= 2 && why === 'stopped' ? 'Still stuck. Rewind and peek at a hint, or nudge your line a little.' : (FAIL_TEXT[why] || FAIL_TEXT.stopped);
    $('#btnFailRewind').textContent = live() ? 'Restart' : 'Rewind';
    $('#failNote').hidden = false;
    syncGo();
  }

  /* ---------- overlays ---------- */
  function showOverlay(html, clear) {
    const o = $('#overlay');
    o.innerHTML = html; o.hidden = false;
    o.classList.toggle('clear', !!clear);
    const btn = o.querySelector('button'); if (btn) btn.focus({ preventScroll: true });
  }
  function hideOverlay() { const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; }
  $('#overlay').addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    Audio.unlock(); Audio.play('tap');
    if (a === 'next') loadLevel(st.li + 1);
    else if (a === 'replay') { hideOverlay(); if (live()) restart(); else { rewind(); go(); } }
    else if (a === 'tinker') { hideOverlay(); rewind(); }
    else if (a === 'levels') showLevels();
    else if (a === 'close') hideOverlay();
    else if (a === 'play') { hideOverlay(); store.set('cc-seen-help', 1); }
    else if (a === 'intro') { hideOverlay(); store.set('cc-seen-world-' + st.level.world, 1); }
    else if (a === 'pick') loadLevel(Number(b.dataset.i));
    else if (a === 'world') showLevels(Number(b.dataset.w));
  });
  function showLevels(wi) {
    const w = wi != null ? wi : st.level.world;
    const tabs = WORLDS.map((W, i) => {
      const got = LEVELS.filter(l => l.world === i).reduce((a, l) => a + (st.progress[l.id] || 0), 0);
      return `<button class="wtab" type="button" role="tab" aria-selected="${i === w}" data-act="world" data-w="${i}"><b>${i + 1}. ${W.name}</b><small>&#9733; ${got}/30</small></button>`;
    }).join('');
    const cards = LEVELS.map((lv, i) => ({ lv, i })).filter(x => x.lv.world === w).map(({ lv, i }) => {
      const s = st.progress[lv.id] || 0;
      const stars = [1, 2, 3].map(n => `<span class="${n <= s ? '' : 'off'}">&#9733;</span>`).join('');
      return `<button class="lvl${i === st.li ? ' current' : ''}${lv.bossLevel ? ' boss' : ''}" type="button" data-act="pick" data-i="${i}" aria-label="Level ${lv.n}: ${lv.name}${lv.bossLevel ? ', boss' : ''}${lv.live ? ', live' : ''}, ${s} stars">
        <canvas width="320" height="180" data-thumb="${i}"></canvas>
        <span class="ln"><b>${lv.n}. ${lv.name}</b><span class="st">${stars}</span></span></button>`;
    }).join('');
    showOverlay(`<div class="panel" style="max-width:none;width:100%">
      <div class="levels-head"><h2>${WORLDS[w].name}</h2><span class="total">&#9733; ${totalStars()} of ${LEVELS.length * 3}</span><button class="chip" type="button" data-act="close">Close</button></div>
      <div class="world-tabs" role="tablist">${tabs}</div>
      <div class="level-grid">${cards}</div></div>`);
    document.querySelectorAll('canvas[data-thumb]').forEach(c => {
      const lv = LEVELS[Number(c.dataset.thumb)];
      const sim = new Sim(lv, lv.live ? [] : (st.strokes[lv.id] || []));
      const g = staticInto(c.getContext('2d'), 0, sim, 0.2, (WORLDS[lv.world] || WORLDS[0]).paper);
      for (const p of sim.parts) { const R = Draw.R[p.type]; if (R && R.live) R.live(g, p, sim); }
      Draw.strokes(g, sim, null);
    });
  }
  function showHelp() {
    showOverlay(`<div class="panel card" role="dialog" aria-label="How to play">
      <p class="verb" style="font-size:clamp(34px,5vw,54px);color:var(--navy)">How to play</p>
      <div class="howto">
        <div><span class="n">1</span><b>Draw</b><p>Fill the gaps in the machine with crayon. Every colour has its own physics: blue stays put, orange falls, green bounces, and more to find.</p></div>
        <div><span class="n">2</span><b>Press GO</b><p>Every part runs in order, like the letters in the caption. Live levels start by themselves, so draw while they run.</p></div>
        <div><span class="n">3</span><b>Tinker</b><p>Missed? Rewind, nudge a line, try again. The eraser rubs out just the bit under it. Every tenth level is a boss.</p></div>
      </div>
      <p style="color:var(--muted)">Keys: Space runs or rewinds, 1 to 7 pick a crayon, E erases, Z undoes, H shows a hint.</p>
      <div class="row"><button class="chip primary" data-act="play" type="button">Start drawing</button></div>
    </div>`);
  }
  function showWorldIntro() {
    const w = st.world, t = w.crayon;
    const stick = TOOLS[t] ? `<div class="intro-stick"><span class="stick ${t}"></span></div>` : '';
    const title = TOOLS[t] ? `New crayon: ${TOOLS[t][0]}` : t === 'live' ? 'Quick Draw!' : t === 'mix' ? 'Mix it up!' : 'The whole box!';
    showOverlay(`<div class="panel card" role="dialog" aria-label="${w.name}">
      <p class="eyebrow">World ${st.level.world + 1}</p>
      <p class="verb" style="font-size:clamp(32px,5vw,52px);color:var(--navy)">${w.name}</p>
      ${stick}
      <p><b>${title}</b></p>
      <p>${w.intro}</p>
      <div class="row"><button class="chip primary" data-act="intro" type="button">Let's draw</button></div>
    </div>`);
  }

  /* ---------- render ---------- */
  function render(now) {
    const boil = reduced ? 0 : Math.floor(now / 150) % 3;
    cr.boil = boil;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bg[boil]) ctx.drawImage(bg[boil], 0, 0); else { ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const sim = st.sim, g = { ctx, cr, t: now / 1000 };
    for (const p of sim.parts) if (p.type === 'lava') Draw.R.lava.live(g, p, sim);
    Draw.strokes(g, sim, null, live() ? st.level.live.fade : 0);
    for (const p of sim.parts) { if (p.type === 'lava') continue; const R = Draw.R[p.type]; if (R && R.live) R.live(g, p, sim); }
    const la = st.mode === 'edit' || st.mode === 'ready' ? 1 : Math.max(0, 1 - (now - st.runStart) / 600);
    Draw.labels(g, sim, la);
    if (st.drawing) {
      const d = st.drawing;
      Draw.strokeArt(g, { kind: d.kind, pts: d.raw.length > 1 ? d.raw : [d.raw[0]] }, null, 1, 7, g.t);
      if (d.kind === 'hinge') Draw.pin(g, d.raw[0][0] * S, d.raw[0][1] * S);
    }
    if (st.tool === 'erase' && st.pointer && canDraw()) {
      ctx.save(); ctx.strokeStyle = PAL.pink; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.arc(st.pointer[0] * S, st.pointer[1] * S, ERASER_R * S, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (now < st.hintUntil) {
      const left = st.hintUntil - now;
      Draw.ghost(g, st.level.solution, Math.min(1, left / 600) * (0.55 + 0.25 * Math.sin(now / 160)));
    }
    st.fx = st.fx.filter(f => now - f.t0 < f.life);
    for (const f of st.fx) {
      const a = (now - f.t0) / f.life, s = 1 + 0.35 * Math.exp(-a * 14);
      ctx.save(); ctx.translate(f.x, f.y - a * 30); ctx.scale(s, s);
      cr.text(f.text, 0, 0, { size: f.size, font: Draw.SKETCH, weight: 700, color: f.color, align: 'center', alpha: 1 - a * a, rot: -0.06, halo: 8 });
      ctx.restore();
    }
    if (st.confetti.length) {
      st.confetti = st.confetti.filter(c => now - c.t0 < 3600);
      for (const c of st.confetti) {
        const t = (now - c.t0) / 1000;
        const x = c.x + c.vx * t, y = c.y + c.vy * t + 520 * t * t, r = c.r + c.vr * t;
        if (y > 920) continue;
        const dx = Math.cos(r) * c.l, dy = Math.sin(r) * c.l;
        cr.line([[x - dx, y - dy], [x + dy * 0.3, y - dx * 0.3], [x + dx, y + dy]], { color: c.c, w: 5, wob: 0.5, alpha: Math.min(1, 3.6 - t) });
      }
    }
  }

  function countdownTick(now) {
    const el = $('#countdown');
    const e = now - st.countT, step = Math.floor(e / 700);
    const words = ['3', '2', '1', 'DRAW!'];
    if (step >= 4) {
      el.hidden = true;
      st.mode = 'run'; st.sim.start(); acc = 0; st.runStart = now;
      syncGo(); syncHud();
      return;
    }
    if (el.hidden || el.dataset.step !== String(step)) {
      el.hidden = false; el.dataset.step = String(step); el.textContent = words[step];
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      Audio.play(step < 3 ? 'tick' : 'tap');
    }
  }

  let hudT = 0;
  function frame(now) {
    if (st.frozen) { requestAnimationFrame(frame); return; }  // a recorder is driving the clock
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const sim = st.sim;
    if (st.mode === 'count') countdownTick(now);
    if (live() && (st.mode === 'count' || st.mode === 'run')) {
      const cap = st.level.live.ink;
      if (st.liveInk < cap && !st.drawing) { st.liveInk = Math.min(cap, st.liveInk + (st.level.live.regen || 1) * dt); syncInk(); }
    }
    if (sim && sim.running && sim.t < 70) {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 10) { sim.step(); acc -= DT; n++; }
      if (n === 10) acc = 0;
      drain();
      if (sim.won && !st.wonShown && sim.t - sim.wonT > 1.3) showWin();
      if (sim.stalled && !sim.won && !st.stalledShown) showStalled();
      if (now - hudT > 250) { hudT = now; syncHud(); }
    }
    render(now);
    requestAnimationFrame(frame);
  }

  /* ---------- wiring ---------- */
  $('#btnGo').addEventListener('click', go);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnClear').addEventListener('click', clearAll);
  $('#btnPrev').addEventListener('click', () => { Audio.unlock(); loadLevel(st.li - 1); });
  $('#btnNext').addEventListener('click', () => { Audio.unlock(); loadLevel(st.li + 1); });
  const hint = () => {
    if (!live() && st.mode !== 'edit') rewind();
    st.hintUntil = performance.now() + (live() ? 6000 : 4200);
    $('#failNote').hidden = true;
    toast(live() ? 'A known answer. The little numbers say when to draw each line.' : 'A known answer, faintly. Yours can be different!', 2600);
  };
  $('#btnHint').addEventListener('click', hint);
  $('#btnFailHint').addEventListener('click', hint);
  $('#btnFailRewind').addEventListener('click', () => { if (live()) restart(); else rewind(); });
  $('#btnLevels').addEventListener('click', () => { Audio.unlock(); showLevels(); });
  $('#btnHelp').addEventListener('click', () => { Audio.unlock(); showHelp(); });
  const snd = $('#btnSound');
  function syncSound() { snd.setAttribute('aria-pressed', String(!Audio.muted)); snd.textContent = Audio.muted ? 'Sound off' : 'Sound on'; }
  snd.addEventListener('click', () => { Audio.unlock(); Audio.setMuted(!Audio.muted); store.set('cc-muted', Audio.muted); syncSound(); });
  window.addEventListener('keydown', ev => {
    if (ev.target.closest && ev.target.closest('input, textarea')) return;
    const key = ev.key.toLowerCase();
    if (key === ' ' || key === 'enter') { if (ev.target.tagName === 'BUTTON') return; ev.preventDefault(); go(); }
    else if (key === 'z') { ev.preventDefault(); undo(); }
    else if (/^[1-7]$/.test(key)) setTool(ORDER[Number(key) - 1]);
    else if (key === 'e') setTool('erase');
    else if (key === 'r' && st.mode !== 'edit' && st.mode !== 'ready') { if (live()) restart(); else rewind(); }
    else if (key === 'h') hint();
    else if (key === 'escape' && !$('#overlay').hidden) hideOverlay();
  });

  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 60); });
  ro.observe($('.sheet-wrap'));
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 60); });

  function start(data) {
    const saved = (data && data.strokes) || store.get('cc-strokes', {});
    for (const id in saved) st.strokes[id] = saved[id];
    Audio.setMuted(store.get('cc-muted', false)); syncSound(); syncTotal();
    loadLevel(data && data.li != null ? data.li : store.get('cc-level', 0));
    resize();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('700 30px "Cabin Sketch"'), document.fonts.load('30px "Patrick Hand"')]).then(() => { CC.clearSprites(); cr.pats.clear(); buildStatic(); }).catch(() => {});
    }
    if (!store.get('cc-seen-help', 0) && !(data && data.li != null) && $('#overlay').hidden) showHelp();
    requestAnimationFrame(frame);
  }
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ li: st.li, strokes: st.strokes })); } catch (e) { /* optional */ }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});

  /* debug hooks for development */
  window.CCDBG = {
    st, go, rewind, restart, loadLevel, setTool, eraseAt,
    solve() {
      if (live()) return 'live level: use CCDBG.playLive()';
      st.strokes[st.level.id] = st.level.solution.map(s => ({ kind: s.kind, pts: s.pts.length > 2 ? s.pts : geom.prepare(s.pts) }));
      st.sim = new Sim(st.level, strokes()); syncInk();
    },
    /* start a live level at once and feed it the known timed answer */
    playLive() {
      restart();
      st.countT = performance.now() - 2900;
      countdownTick(performance.now());
      const timed = st.level.solution.slice().sort((a, b) => a.at - b.at);
      const sim = st.sim, orig = sim.step.bind(sim);
      sim.step = function () { while (timed.length && timed[0].at <= this.t) this.addStroke(timed.shift()); orig(); };
    },
    clear() { st.strokes[st.level.id] = []; st.sim = new Sim(st.level, []); syncInk(); },
    advance(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) { st.sim.step(); if (i % 12 === 0) drain(); } drain(); syncHud(); render(performance.now()); },
    size(W) { if (!W) { cv.width = 1; resize(); return; } cv.width = W; cv.height = Math.round(W * 9 / 16); k = W / 1600; cr.res = k; cr.pats.clear(); buildStatic(); },
    bench(n) { const t0 = performance.now(); for (let i = 0; i < (n || 30); i++) render(t0 + i * 16); return (performance.now() - t0) / (n || 30); },
    shot(name) { render(performance.now()); return fetch('/__shot', { method: 'POST', body: JSON.stringify({ name, data: cv.toDataURL('image/jpeg', 0.85) }) }).then(r => r.json()); },
    /* recording hooks (dev/demo.js): freeze the loop, step, draw, capture */
    freeze(on) { st.frozen = !!on; },
    tick(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) if (st.sim.running) st.sim.step(); drain(); },
    render(now) { render(now); },
    gfx() { return { ctx, cr, k, cv }; },
    setDrawing(kind, raw) { st.drawing = raw ? { kind, raw, len: 0, lastT: 0 } : null; },
    drawStroke(kind, raw) { st.drawing = { kind, raw, len: 0, lastT: 0 }; finishStroke(); },
    capture(name, q) { return fetch('/__shot', { method: 'POST', body: JSON.stringify({ name, data: cv.toDataURL('image/jpeg', q || 0.9) }) }).then(r => r.json()); }
  };
})();
