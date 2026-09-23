/* Crayon Contraptions — synthesized sound. Nothing is loaded; every noise is
   built from oscillators and a noise buffer. Starts on the first tap. */
(function (root) {
  'use strict';
  const CC = root.CC;
  let ac = null, master = null, noiseBuf = null, muted = false;
  let scratch = null, whir = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const now = () => ac.currentTime;
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, dur, vol, when) {
    const t = now() + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(freq, q, dur, vol, type, when) {
    const t = now() + (when || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  }

  const SFX = {
    hit(e) {
      const v = Math.min(1, e.dv / 6) * 0.5;
      const m = e.a === 'domino' || e.b === 'domino' ? 'domino' : (e.a === 'metal' || e.b === 'metal') ? 'metal' : 'thud';
      if (m === 'domino') { noise(2600, 3, 0.04, v * 0.9); tone('triangle', 900, 700, 0.05, v * 0.4); }
      else if (m === 'metal') { tone('sine', 1300, 1250, 0.25, v * 0.35); tone('sine', 2710, 0, 0.18, v * 0.15); }
      else { tone('sine', 150, 70, 0.12, v * 0.9); noise(900, 1, 0.05, v * 0.4); }
    },
    ding(e) {
      const v = 0.35 * (e.vol || 0.8), f = 880;
      [[1, 1], [2.76, 0.4], [5.4, 0.22], [8.93, 0.1]].forEach(([k, a]) => tone('sine', f * k, 0, 1.6 / Math.sqrt(k), v * a));
    },
    pop() { noise(3000, 0.6, 0.09, 0.8, 'highpass'); tone('sine', 220, 60, 0.1, 0.5); },
    click() { tone('square', 1500, 900, 0.03, 0.12); noise(4000, 2, 0.02, 0.2); },
    boing() { const t = now(), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.12); o.frequency.exponentialRampToValueAtTime(240, t + 0.4); env(g, t, 0.01, 0.35, 0.4); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); },
    boom() { noise(380, 0.7, 0.7, 0.9, 'lowpass'); tone('sine', 90, 35, 0.5, 0.7); },
    creak() { tone('sawtooth', 140, 90, 0.28, 0.08); noise(700, 4, 0.2, 0.2); },
    windup() { for (let i = 0; i < 10; i++) noise(3200, 5, 0.018, 0.35, 'bandpass', i * 0.05); },
    release() { tone('triangle', 700, 500, 0.06, 0.15); },
    swish() { const t = now(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.3); env(g, t, 0.05, 0.4, 0.3); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.4); },
    lamp() { tone('square', 1800, 1200, 0.03, 0.12); tone('sine', 120, 0, 0.6, 0.06, 0.05); },
    whir() {},
    win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('triangle', f, 0, 0.35, 0.2, 0.08 + i * 0.11)); tone('triangle', 1318.5, 0, 0.6, 0.12, 0.55); },
    stalled() { tone('triangle', 392, 370, 0.25, 0.14); tone('triangle', 330, 300, 0.45, 0.14, 0.24); },
    tap() { noise(1800, 1.5, 0.03, 0.2); },
    tick() { tone('square', 880, 0, 0.06, 0.08); },
    cluck() { tone('square', 620, 420, 0.07, 0.07); tone('square', 700, 480, 0.06, 0.06, 0.1); },
    deliver() { tone('triangle', 784, 0, 0.12, 0.18); tone('triangle', 1175, 0, 0.18, 0.14, 0.08); },
    sizzle() { noise(5200, 0.8, 0.5, 0.35, 'highpass'); tone('sine', 300, 120, 0.2, 0.08); },
    splat() { noise(900, 0.9, 0.18, 0.6, 'lowpass'); tone('sine', 180, 60, 0.12, 0.3); },
    star() { [1318.5, 1760, 2349].forEach((f, i) => tone('sine', f, 0, 0.25, 0.12, i * 0.06)); },
    ouch() { tone('sawtooth', 320, 140, 0.25, 0.12); noise(600, 1, 0.15, 0.4); },
    defeat() { [523.25, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('triangle', f, 0, 0.22, 0.18, i * 0.1)); noise(300, 0.6, 0.6, 0.5, 'lowpass'); },
    chomp() { tone('square', 160, 90, 0.08, 0.14); noise(700, 2, 0.06, 0.3, 'bandpass', 0.05); },
    turbo() { const t = now(), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.35); env(g, t, 0.02, 0.1, 0.35); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45); },
    erase() { noise(1200, 1, 0.08, 0.25); },
    nope() { tone('square', 220, 180, 0.08, 0.06); }
  };

  const Audio = {
    unlock() { return init(); },
    play(name, e) { if (!ac || muted || !SFX[name]) return; try { SFX[name](e || {}); } catch (err) { /* sound is optional */ } },
    get muted() { return muted; },
    setMuted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, now(), 0.02); if (muted) { this.scribble(0); this.fan(false); } },
    /* Continuous crayon-on-paper scratch; level 0..1 follows pointer speed. */
    scribble(level) {
      if (!ac || muted) return;
      if (!scratch) {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.9;
        f2.type = 'highpass'; f2.frequency.value = 900; g.gain.value = 0;
        s.connect(f); f.connect(f2); f2.connect(g); g.connect(master); s.start();
        scratch = { s, g, f };
      }
      scratch.g.gain.setTargetAtTime(Math.min(0.22, level * 0.22), now(), 0.03);
      scratch.f.frequency.setTargetAtTime(1800 + level * 1600, now(), 0.05);
    },
    fan(on) {
      if (!ac) return;
      if (on && !muted) {
        if (!whir) {
          const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
          s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0;
          s.connect(f); f.connect(g); g.connect(master); s.start(); whir = { s, g };
        }
        whir.g.gain.setTargetAtTime(0.12, now(), 0.3);
      } else if (whir) whir.g.gain.setTargetAtTime(0, now(), 0.15);
    }
  };
  CC.Audio = Audio;
})(window);
