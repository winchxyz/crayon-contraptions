/* Crayon Contraptions — levels. Units are metres on a 16 x 9 sheet, y down,
   floor top at 8.7. Letters (label) follow Rube Goldberg's captions: the
   story line names each part in the order the machine runs. `solution` is a
   known-good drawing; test/solve.js proves every level with it. */
(function (root) {
  'use strict';
  const CC = root.CC || (root.CC = {});
  const F = 8.7;

  /* Centre of a ball resting on a seesaw plank. Pivot (px, py) is the plank's
     bottom centre, a its angle, t its thickness, s the distance along it. */
  function onPlank(px, py, a, t, s, r) {
    return [px + Math.cos(a) * s + Math.sin(a) * (t + r), py + Math.sin(a) * s - Math.cos(a) * (t + r)];
  }

  const L = [];

  /* 1 ─ a single ramp */
  L.push({
    id: 'first-scribble',
    name: 'First Scribble',
    verb: 'Swish!',
    story: 'The boxing glove (A) punches the ball (B), which rolls down your ramp (C) and drops into the basket (D).',
    tip: 'Draw one line from under the shelf down toward the basket, then press GO.',
    crayons: ['solid'], ink: 16, par: [9.5, 12],
    parts: [
      { type: 'plank', x1: 0.2, y1: 2.6, x2: 3.4, y2: 2.6, t: 0.22 },
      { type: 'pusher', x: 0.75, y: 2.42, dir: 1, reach: 0.7, speed: 3, when: 'start', label: 'A' },
      { type: 'ball', style: 'rubber', x: 1.3, y: 2.36, label: 'B' },
      { type: 'block', x: 11.3, y: 5.9, w: 2.9, h: F - 5.9, style: 'books' },
      { type: 'cup', x: 12.75, y: 5.9, w: 1.5, h: 0.75, back: 'right', backH: 1.7, style: 'basket', label: 'D' },
      { type: 'note', x: 5.2, y: 1.7, text: 'draw a ramp here', size: 34, rot: -0.04 },
      { type: 'arrow', pts: [[6.6, 1.95], [7.0, 2.6], [7.3, 3.2]] },
      { type: 'label', x: 7.8, y: 4.35, text: 'C', you: true },
      { type: 'deco', kind: 'sun', x: 14.6, y: 1.3 }
    ],
    solution: [{ kind: 'solid', pts: [[3.7, 3.2], [11.75, 4.75]] }]
  });

  /* 2 ─ a bridge for the wind-up car */
  L.push({
    id: 'mind-the-gap',
    name: 'Mind the Gap',
    verb: 'Ding!',
    story: 'The wind-up car (A) drives across your bridge (B), bumps the dominoes (C), and the last one rings the bell (D).',
    tip: 'Cars need a floor. Draw a bridge from box to box.',
    crayons: ['solid'], ink: 6.5, par: [4.8, 5.6],
    parts: [
      { type: 'block', x: 0, y: 6.0, w: 5.4, h: F - 6.0, style: 'box', text: 'TOYS' },
      { type: 'block', x: 9.2, y: 6.0, w: 6.8, h: F - 6.0, style: 'box', text: 'FRAGILE' },
      { type: 'nodraw', x: 5.5, y: 6.75, w: 3.6, h: F - 6.75 },
      { type: 'car', x: 1.6, y: 6.0, dir: 1, speed: 2.2, when: 'start', label: 'A' },
      { type: 'dominoes', x: 11.0, y: 6.0, n: 8, gap: 0.42, h: 0.8, label: 'C' },
      { type: 'bell', x: 14.6, y: 4.8, size: 0.8, hang: true, label: 'D' },
      { type: 'label', x: 7.3, y: 5.3, text: 'B', you: true },
      { type: 'deco', kind: 'cloud', x: 4.2, y: 1.6 },
      { type: 'deco', kind: 'cloud', x: 10.8, y: 1.1, s: 0.8 }
    ],
    solution: [{ kind: 'solid', pts: [[5.2, 5.98], [9.45, 5.98]] }]
  });

  /* 3 ─ loose crayon: drop a weight on the seesaw */
  (function () {
    const px = 8.2, py = 7.95, a = -0.3, t = 0.14, len = 3.4;
    const ball = onPlank(px, py, a, t, -(len / 2 - 0.1 - 0.2 - 0.01), 0.2);
    L.push({
      id: 'heavy-crayon',
      name: 'Heavy Crayon',
      verb: 'Ding!',
      story: 'Your orange scribble (A) falls on the seesaw (B), which flings the tennis ball (C) up to ring the bell (D).',
      tip: 'The orange crayon draws things that fall when you press GO. Scribble a heavy blob high above the raised end.',
      crayons: ['loose'], ink: 6, par: [4.4, 5.2],
      parts: [
        { type: 'seesaw', x: px, y: py, len, t, angle: a, limit: [-0.3, -0.08], lips: [-1], label: 'B' },
        { type: 'ball', style: 'tennis', x: ball[0], y: ball[1], label: 'C' },
        { type: 'bell', x: 7.45, y: 3.15, size: 0.9, hang: true, label: 'D' },
        { type: 'nodraw', x: 3.2, y: 0.25, w: 4.9, h: F - 0.25 },
        { type: 'note', x: 10.8, y: 2.6, text: 'scribble a heavy blob', size: 32, rot: 0.03 },
        { type: 'arrow', pts: [[10.6, 3.1], [10.2, 3.6], [9.9, 4.1]] },
        { type: 'label', x: 10.9, y: 4.9, text: 'A', you: true },
        { type: 'deco', kind: 'sun', x: 14.4, y: 1.4 }
      ],
      solution: [{ kind: 'loose', pts: [[9.0, 3.1], [9.8, 3.15], [9.0, 3.3], [9.8, 3.35], [9.0, 3.5], [9.8, 3.55]] }]
    });
  })();

  /* 4 ─ catch a flying ball */
  (function () {
    const px = 4.6, py = 7.7, a = -0.3, t = 0.14, len = 3.2;
    const tb = onPlank(px, py, a, t, -(len / 2 - 0.1 - 0.2 - 0.01), 0.2);
    L.push({
      id: 'catch',
      name: 'Catch!',
      verb: 'Swish!',
      story: 'The trapdoor (A) drops the bowling ball (B) on the seesaw (C), which tosses the tennis ball (D). Catch it with your line (E) and steer it into the bucket (F).',
      tip: 'Press GO once and watch where the tennis ball flies. Then draw a slide under it.',
      crayons: ['solid'], ink: 11, par: [7, 8.5],
      parts: [
        { type: 'plank', x1: 6.2, y1: 3.0, x2: 8.4, y2: 3.0, t: 0.2 },
        { type: 'gate', x1: 5.1, y1: 3.0, x2: 6.2, y2: 3.0, t: 0.16, when: 'start', label: 'A' },
        { type: 'ball', style: 'bowling', x: 5.75, y: 2.66, label: 'B' },
        { type: 'seesaw', x: px, y: py, len, t, angle: a, lips: [-1], label: 'C' },
        { type: 'ball', style: 'tennis', x: tb[0], y: tb[1], label: 'D' },
        { type: 'block', x: 13.2, y: 6.8, w: 2.2, h: F - 6.8, style: 'books' },
        { type: 'cup', x: 14.3, y: 6.8, w: 1.3, h: 1.0, style: 'bucket', accept: 'tennis', back: 'right', backH: 1.9, label: 'F' },
        { type: 'nodraw', x: 2.2, y: 6.2, w: 5.0, h: F - 6.2 },
        { type: 'label', x: 10.6, y: 6.2, text: 'E', you: true },
        { type: 'deco', kind: 'cloud', x: 12.4, y: 1.5 }
      ],
      solution: [{ kind: 'solid', pts: [[7.8, 4.3], [10.5, 4.9], [13.5, 5.55]] }]
    });
  })();

  /* 5 ─ two ramps and a domino run */
  L.push({
    id: 'domino-rally',
    name: 'Domino Rally',
    verb: 'Swish!',
    story: 'The glove (A) knocks the marble (B) down your first ramp (C) into the dominoes (D). The last domino hits the button (E), opening the trapdoor (F). The bowling ball (G) rolls down your second ramp (H) into the basket (I).',
    tip: 'Two gaps this time. Only the bowling ball counts for the basket.',
    crayons: ['solid'], ink: 15, par: [11, 12.8],
    parts: [
      { type: 'plank', x1: 12.0, y1: 1.9, x2: 15.8, y2: 1.9, t: 0.2 },
      { type: 'pusher', x: 15.3, y: 1.72, dir: -1, reach: 0.7, speed: 2.6, when: 'start', label: 'A' },
      { type: 'ball', style: 'marble', x: 14.7, y: 1.9 - 0.17, label: 'B' },
      { type: 'plank', x1: 3.0, y1: 5.2, x2: 8.8, y2: 5.2, t: 0.2 },
      { type: 'dominoes', x: 3.9, y: 5.2, n: 9, gap: 0.5, h: 0.8, label: 'D' },
      { type: 'button', x: 3.35, y: 5.2, w: 0.6, fires: 'g1', label: 'E' },
      { type: 'plank', x1: 0, y1: 1.7, x2: 1.15, y2: 1.7, t: 0.2 },
      { type: 'gate', x1: 2.3, y1: 1.7, x2: 1.15, y2: 1.7, t: 0.16, when: 'g1', label: 'F' },
      { type: 'ball', style: 'bowling', x: 1.72, y: 1.7 - 0.34, label: 'G' },
      { type: 'cup', x: 8.1, y: F, w: 1.4, h: 0.9, style: 'basket', accept: 'bowling', back: 'right', backH: 1.3, label: 'I' },
      { type: 'wire', from: [3.35, 4.8], to: [2.2, 1.9] },
      { type: 'label', x: 10.6, y: 3.0, text: 'C', you: true },
      { type: 'label', x: 4.0, y: 6.5, text: 'H', you: true }
    ],
    solution: [
      { kind: 'solid', pts: [[12.3, 2.55], [8.6, 4.35]] },
      { kind: 'solid', pts: [[1.3, 5.7], [7.25, 7.55]] }
    ]
  });

  /* 6 ─ trampoline bank shot */
  L.push({
    id: 'bounce-house',
    name: 'Bounce House',
    verb: 'Click!',
    story: 'The conveyor (A) carries the ball (B) off the edge onto the trampoline (C). Catch the bounce with your line (D) and roll it into the button (E) to switch on the lamp (F).',
    tip: 'Red zones are no-crayon zones. Catch the ball near the top of its bounce.',
    crayons: ['solid'], ink: 7, par: [3.4, 4.6],
    parts: [
      { type: 'conveyor', x1: 0.3, x2: 4.6, y: 2.4, speed: 4.5, when: 'start', label: 'A' },
      { type: 'ball', style: 'rubber', x: 2.2, y: 2.4 - 0.24, label: 'B' },
      { type: 'trampoline', x: 6.3, y: F, w: 1.6, angle: 0.18, label: 'C' },
      { type: 'block', x: 12.2, y: 4.9, w: 3.8, h: F - 4.9, style: 'box', text: 'LAMP CO.' },
      { type: 'button', x: 13.4, y: 4.9, w: 0.7, fires: 'lamp1', label: 'E' },
      { type: 'lamp', id: 'lamp1', x: 15.1, y: 4.9, when: 'lamp1', label: 'F' },
      { type: 'wire', from: [13.75, 4.8], to: [14.85, 4.8] },
      { type: 'nodraw', x: 4.75, y: 0.15, w: 3.15, h: F - 0.15 },
      { type: 'nodraw', x: 4.2, y: 2.75, w: 0.55, h: F - 2.75 },
      { type: 'nodraw', x: 7.9, y: 5.1, w: 4.3, h: F - 5.1 },
      { type: 'label', x: 10.2, y: 2.9, text: 'D', you: true }
    ],
    solution: [{ kind: 'solid', pts: [[9.5, 4.45], [12.3, 4.85]] }]
  });

  /* 7 ─ fan and balloon */
  L.push({
    id: 'fan-club',
    name: 'Fan Club',
    verb: 'Pop!',
    story: 'The marble (A) rolls down the slide into the switch (B), which starts the fan (C). The wind pushes the beach ball (D) across the floor; your jump (E) sends it up to pop the balloon (F).',
    tip: 'Build a ski jump. The balloon is out of reach, so the ball has to fly the last bit.',
    crayons: ['solid'], ink: 9, par: [4.5, 6],
    parts: [
      { type: 'plank', x1: 0.1, y1: 1.3, x2: 4.5, y2: 2.6, t: 0.18 },
      { type: 'block', x: 4.5, y: 1.6, w: 0.35, h: 1.4, style: 'wood' },
      { type: 'button', x: 4.5, y: 2.35, w: 0.6, angle: -Math.PI / 2, fires: 'fan1', label: 'B' },
      { type: 'ball', style: 'marble', x: 0.8, y: 1.3, hold: 'start', label: 'A' },
      { type: 'fan', id: 'fan1', x: 0.45, y: 8.05, dir: 'right', reach: 11, width: 1.3, power: 0.8, when: 'fan1', label: 'C' },
      { type: 'ball', style: 'beach', x: 1.9, y: F - 0.5, label: 'D' },
      { type: 'balloon', x: 14.3, y: 6.1, r: 0.5, tie: [14.2, F], label: 'F' },
      { type: 'wire', from: [4.4, 2.0], to: [0.45, 7.55] },
      { type: 'nodraw', x: 11.7, y: 3.4, w: 4.3, h: F - 3.4 },
      { type: 'label', x: 8.4, y: 6.2, text: 'E', you: true },
      { type: 'deco', kind: 'cloud', x: 9.2, y: 1.2 }
    ],
    solution: [{ kind: 'solid', pts: [[7.5, 8.66], [9.0, 8.4], [10.0, 7.8], [10.7, 7.0]] }]
  });

  /* 8 ─ the grand contraption */
  L.push({
    id: 'feed-the-cat',
    name: 'Feed the Cat',
    verb: 'Nom!',
    story: 'The glove (A) pushes the ball (B) over your ramp (C) into the dominoes (D). The last domino presses the button (E), the cannon (F) fires a meatball (G), and your slide (H) delivers it to the bowl (I). Mr. Whiskers wakes up happy.',
    tip: 'Both crayons work here. The red zones keep the button and the cannon honest.',
    crayons: ['solid', 'loose'], ink: 15, par: [12, 13.5],
    parts: [
      { type: 'plank', x1: 0.2, y1: 1.8, x2: 4.0, y2: 1.8, t: 0.22 },
      { type: 'pusher', x: 0.7, y: 1.62, dir: 1, reach: 0.7, speed: 3, when: 'start', label: 'A' },
      { type: 'ball', style: 'rubber', x: 1.25, y: 1.56, label: 'B' },
      { type: 'plank', x1: 7.0, y1: 4.6, x2: 11.8, y2: 4.6, t: 0.2 },
      { type: 'dominoes', x: 7.7, y: 4.6, n: 8, gap: 0.46, h: 0.8, label: 'D' },
      { type: 'button', x: 11.45, y: 4.6, w: 0.6, fires: 'c1', label: 'E' },
      { type: 'cannon', x: 14.6, y: F, angle: -135, speed: 8, when: 'c1', label: 'F' },
      { type: 'wire', from: [11.7, 4.7], to: [14.3, 8.0] },
      { type: 'block', x: 1.8, y: 7.2, w: 2.4, h: F - 7.2, style: 'box', text: 'CAT FOOD' },
      { type: 'cup', x: 2.7, y: 7.2, w: 1.2, h: 0.4, style: 'bowl', accept: 'meatball', back: 'left', backH: 1.1, label: 'I' },
      { type: 'cat', x: 0.95, y: F },
      { type: 'nodraw', x: 10.7, y: 2.8, w: 1.9, h: 1.75 },
      { type: 'nodraw', x: 12.9, y: 6.6, w: 3.1, h: F - 6.6 },
      { type: 'label', x: 5.3, y: 2.6, text: 'C', you: true },
      { type: 'label', x: 6.0, y: 5.9, text: 'H', you: true }
    ],
    solution: [
      { kind: 'solid', pts: [[4.2, 2.35], [7.3, 4.35]] },
      { kind: 'solid', pts: [[11.3, 6.55], [7.0, 6.7], [3.6, 6.72]] }
    ]
  });

  CC.HAND = L;
})(typeof window !== 'undefined' ? window : globalThis);
