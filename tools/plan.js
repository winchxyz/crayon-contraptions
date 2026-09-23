/* Crayon Contraptions — the 100-level plan: ten worlds of ten, the tenth of
   each is a boss. hand: a handmade level from tools/hand.js; arch: a recipe
   from tools/archetypes.js with difficulty 0..1. */
const ALL = ['solid', 'loose', 'bouncy', 'floaty', 'hinge', 'zoom', 'magnet'];

module.exports = [
  {
    name: 'The Playroom', paper: 'graph', crayon: 'solid',
    intro: 'The blue crayon draws lines that stay put: ramps, bridges, catchers.',
    levels: [
      { hand: 'first-scribble' },
      { arch: 'ramp', diff: 0.1, name: 'Down the Slide', crayons: ['solid'] },
      { hand: 'mind-the-gap' },
      { arch: 'drop', diff: 0.2, name: 'Look Out Below', crayons: ['solid'] },
      { hand: 'catch' },
      { arch: 'dominoRamp', diff: 0.3, name: 'Tip Tap Topple', crayons: ['solid'] },
      { arch: 'ramp', diff: 0.55, name: 'Over the Blocks', crayons: ['solid'] },
      { hand: 'domino-rally' },
      { hand: 'bounce-house' },
      { arch: 'boss1', boss: true, name: 'Grumbox', crayons: ['solid'] }
    ]
  },
  {
    name: 'Heavy Homework', paper: 'ruled', crayon: 'loose',
    intro: 'The orange crayon draws heavy things. They hang still while you draw and fall the moment you press GO.',
    levels: [
      { hand: 'heavy-crayon' },
      { arch: 'heavySeesaw', diff: 0.2, name: 'Plonk!', crayons: ['loose'] },
      { arch: 'heavyKnock', diff: 0.2, name: 'Nudge', crayons: ['loose'] },
      { arch: 'heavyPress', diff: 0.3, name: 'Down the Chute', crayons: ['loose'] },
      { arch: 'heavySeesaw', diff: 0.5, name: 'High Fling', crayons: ['loose'] },
      { arch: 'heavyKnock', diff: 0.6, name: 'Ledge Pusher', crayons: ['loose'] },
      { arch: 'heavyPress', diff: 0.6, name: 'Press Pass', crayons: ['loose'] },
      { arch: 'heavySeesaw', diff: 0.8, name: 'Moon Toss', crayons: ['loose'] },
      { hand: 'feed-the-cat' },
      { arch: 'boss2', boss: true, name: 'Sir Tipsy', crayons: ['loose'] }
    ]
  },
  {
    name: 'Boing Boing', paper: 'dots', crayon: 'bouncy',
    intro: 'The green crayon is pure rubber. Anything that lands on it springs right back up.',
    levels: [
      { arch: 'bounceOver', diff: 0.1, name: 'First Bounce', crayons: ['bouncy'] },
      { arch: 'bounceBack', diff: 0.2, name: 'Bat It Back', crayons: ['bouncy'] },
      { arch: 'bounceOver', diff: 0.35, name: 'Over the Wall', crayons: ['bouncy'] },
      { arch: 'bounceBack', diff: 0.5, name: 'Rebound', crayons: ['bouncy'] },
      { arch: 'bounceOver', diff: 0.55, name: 'Ring-a-Bounce', crayons: ['bouncy', 'solid'] },
      { arch: 'bounceBack', diff: 0.7, name: 'Wrong Way Ball', crayons: ['bouncy', 'solid'] },
      { arch: 'bounceOver', diff: 0.7, name: 'Springboard', crayons: ['bouncy', 'solid'] },
      { hand: 'fan-club' },
      { arch: 'bounceOver', diff: 0.85, name: 'Pogo Pro', crayons: ['bouncy'] },
      { arch: 'boss3', boss: true, name: 'Boingo', crayons: ['bouncy', 'solid'] }
    ]
  },
  {
    name: 'Up and Away', paper: 'sky', crayon: 'floaty',
    intro: 'The yellow crayon draws things lighter than air. At GO they float up and slide along anything above them.',
    levels: [
      { arch: 'floatyButton', diff: 0.1, what: 'lamp', name: 'Float Up', crayons: ['floaty'] },
      { arch: 'floatyButton', diff: 0.2, what: 'trap', name: 'Lift the Latch', crayons: ['floaty'] },
      { arch: 'floatyButton', diff: 0.3, what: 'cannon', name: 'Pop Goes the Button', crayons: ['floaty'] },
      { arch: 'floatyBalloon', diff: 0.4, name: 'Balloon Chase', crayons: ['floaty', 'solid'] },
      { arch: 'floatyButton', diff: 0.5, what: 'trap', name: 'Sneaky Float', crayons: ['floaty'] },
      { arch: 'floatyButton', diff: 0.6, what: 'cannon', name: 'Sky Shot', crayons: ['floaty'] },
      { arch: 'floatyBalloon', diff: 0.6, name: 'Ceiling Maze', crayons: ['floaty', 'solid'] },
      { arch: 'floatyButton', diff: 0.8, what: 'lamp', name: 'Night Light', crayons: ['floaty'] },
      { arch: 'floatyBalloon', diff: 0.8, name: 'Upside Down', crayons: ['floaty', 'solid'] },
      { arch: 'boss4', boss: true, name: 'Nimbus', crayons: ['floaty'] }
    ]
  },
  {
    name: 'Quick Draw', paper: 'kraft', crayon: 'live',
    intro: 'These machines start on their own. Draw while they run! The floor is lava, lines fade, and your crayon refills.',
    levels: [
      { arch: 'liveRain', diff: 0.1, name: 'Rainy Day', crayons: ['solid'] },
      { arch: 'liveCar', diff: 0.2, pits: 2, name: 'Bridge Builder', crayons: ['solid'] },
      { arch: 'liveHen', diff: 0.2, name: 'Egg Catch', crayons: ['solid'] },
      { arch: 'liveRain', diff: 0.45, name: 'Two Pipes', crayons: ['solid'] },
      { arch: 'liveMoving', diff: 0.4, name: 'Shifty Bucket', crayons: ['solid'] },
      { arch: 'liveCar', diff: 0.5, pits: 3, name: 'Rush Hour', crayons: ['solid'] },
      { arch: 'liveStars', diff: 0.5, name: 'Star Hopper', crayons: ['bouncy', 'solid'], kinds: ['bouncy', 'solid'] },
      { arch: 'liveHen', diff: 0.6, need: 4, name: 'Scrambled', crayons: ['solid'] },
      { arch: 'liveRain', diff: 0.7, need: 4, name: 'Downpour', crayons: ['solid', 'bouncy'], kinds: ['solid', 'bouncy'] },
      { arch: 'boss5', boss: true, name: 'The Scribble Eater', crayons: ['solid'] }
    ]
  },
  {
    name: 'Swing Time', paper: 'legal', crayon: 'hinge',
    intro: 'The purple crayon is pinned where you start it. At GO it swings like a pendulum, a hammer or a drawbridge.',
    levels: [
      { arch: 'hingeHammer', diff: 0.1, name: 'Knock Knock', crayons: ['hinge'] },
      { arch: 'bridge', kind: 'hinge', diff: 0.2, name: 'Drawbridge', crayons: ['hinge'] },
      { arch: 'hingeBell', diff: 0.3, name: 'Tick Tock Ding', crayons: ['hinge'] },
      { arch: 'hingeDomino', diff: 0.3, name: 'Domino Swing', crayons: ['hinge'] },
      { arch: 'hingeHammer', diff: 0.5, name: 'Home Run', crayons: ['hinge'] },
      { arch: 'bridge', kind: 'hinge', diff: 0.55, name: 'Timber!', crayons: ['hinge'] },
      { arch: 'hingeDomino', diff: 0.6, name: 'Pendulum Push', crayons: ['hinge', 'solid'] },
      { arch: 'hingeBell', diff: 0.7, name: 'Big Ben', crayons: ['hinge', 'solid'] },
      { arch: 'hingeHammer', diff: 0.7, name: 'Grand Slam', crayons: ['hinge', 'solid'] },
      { arch: 'boss6', boss: true, name: 'Tick-Tock', crayons: ['hinge'] }
    ]
  },
  {
    name: 'Zoom Zoom', paper: 'pink', crayon: 'zoom',
    intro: 'The red crayon is a booster. It shoves things along it in the direction you drew it, even uphill.',
    levels: [
      { arch: 'zoomUphill', diff: 0.1, name: 'Uphill Rocket', crayons: ['zoom'] },
      { arch: 'zoomJump', diff: 0.2, name: 'Turbo Car', crayons: ['zoom'] },
      { arch: 'zoomOver', diff: 0.3, name: 'Wall Hop', crayons: ['zoom'] },
      { arch: 'zoomUphill', diff: 0.4, name: 'Express Lane', crayons: ['zoom'] },
      { arch: 'zoomJump', diff: 0.5, name: 'Long Jump', crayons: ['zoom'] },
      { arch: 'zoomOver', diff: 0.6, name: 'Vault', crayons: ['zoom', 'solid'] },
      { arch: 'bridge', kind: 'zoom', diff: 0.5, name: 'Speed Bridge', crayons: ['zoom'] },
      { arch: 'zoomUphill', diff: 0.7, name: 'Rocket Rink', crayons: ['zoom', 'solid'] },
      { arch: 'zoomJump', diff: 0.8, name: 'Mega Leap', crayons: ['zoom'] },
      { arch: 'boss7', boss: true, name: 'Turbo Snail', crayons: ['zoom', 'solid'] }
    ]
  },
  {
    name: 'Magnet Lab', paper: 'blueprint', crayon: 'magnet',
    intro: 'The black crayon is a magnet. It does not touch anything, but it pulls steel balls toward it from far away.',
    levels: [
      { arch: 'magnetBasket', diff: 0.1, name: 'Attraction', crayons: ['magnet'] },
      { arch: 'magnetCurve', diff: 0.2, name: 'Curveball', crayons: ['magnet'] },
      { arch: 'magnetBasket', diff: 0.35, name: 'Steel Catch', crayons: ['magnet'] },
      { arch: 'magnetCurve', diff: 0.45, name: 'Around the Bend', crayons: ['magnet'] },
      { arch: 'magnetBasket', diff: 0.55, name: 'Pull Up', crayons: ['magnet', 'solid'] },
      { arch: 'magnetCurve', diff: 0.6, name: 'Sticky Situation', crayons: ['magnet', 'solid'] },
      { arch: 'magnetBasket', diff: 0.7, name: 'Bullseye', crayons: ['magnet'] },
      { arch: 'magnetCurve', diff: 0.8, name: 'Magnetic North', crayons: ['magnet'] },
      { arch: 'magnetBasket', diff: 0.85, name: 'Field Trip', crayons: ['magnet'] },
      { arch: 'boss8', boss: true, name: 'Magneto', crayons: ['magnet', 'solid'] }
    ]
  },
  {
    name: 'Chaos Factory', paper: 'newsprint', crayon: 'mix',
    intro: 'Live machines, mixed crayons. Switch crayons on the fly with the keys 1 to 7.',
    levels: [
      { arch: 'liveRain', diff: 0.3, name: 'Bouncing Rain', crayons: ['bouncy', 'zoom'], kinds: ['bouncy', 'zoom'] },
      { arch: 'liveCar', diff: 0.4, pits: 3, name: 'Nitro Run', crayons: ['zoom', 'solid'], kinds: ['zoom', 'solid'] },
      { arch: 'liveHen', diff: 0.4, name: 'Egg Juggler', crayons: ['solid', 'bouncy'], kinds: ['solid'] },
      { arch: 'liveStars', diff: 0.5, name: 'Star Rush', crayons: ['bouncy', 'zoom', 'solid'], kinds: ['bouncy', 'zoom'] },
      { arch: 'liveMoving', diff: 0.5, name: 'Moving Target', crayons: ['solid', 'bouncy'], kinds: ['solid', 'bouncy'] },
      { arch: 'liveRain', diff: 0.7, need: 4, name: 'Factory Floor', crayons: ['solid', 'zoom'], kinds: ['solid', 'zoom'] },
      { arch: 'liveCar', diff: 0.8, pits: 3, name: 'Lava Rally', crayons: ['solid', 'zoom'], kinds: ['solid', 'zoom'] },
      { arch: 'liveStars', diff: 0.8, name: 'Constellation', crayons: ['bouncy', 'solid'], kinds: ['bouncy', 'solid'] },
      { arch: 'liveHen', diff: 0.8, need: 4, name: 'Egg Storm', crayons: ['solid'], kinds: ['solid'] },
      { arch: 'boss9', boss: true, name: 'The Chaos King', crayons: ['solid', 'bouncy', 'zoom'] }
    ]
  },
  {
    name: 'Grand Finale', paper: 'party', crayon: 'all',
    intro: 'Every crayon in the box, on every level. There is always more than one way.',
    levels: [
      { arch: 'dominoRamp', diff: 0.9, name: 'Chain Reaction', crayons: ALL },
      { arch: 'heavySeesaw', diff: 0.9, name: 'Catapult', crayons: ALL },
      { arch: 'floatyBalloon', diff: 0.9, name: 'Hot Air', crayons: ALL },
      { arch: 'bounceBack', diff: 0.9, name: 'Pinball', crayons: ALL },
      { arch: 'hingeDomino', diff: 0.9, name: 'Swing Set', crayons: ALL },
      { arch: 'zoomOver', diff: 0.9, name: 'Launch Pad', crayons: ALL },
      { arch: 'magnetCurve', diff: 0.9, name: 'Iron Will', crayons: ALL },
      { arch: 'liveRain', diff: 0.9, need: 4, name: 'Monsoon', crayons: ['solid', 'bouncy', 'zoom'], kinds: ['solid', 'bouncy', 'zoom'] },
      { arch: 'liveCar', diff: 0.9, pits: 3, name: 'Last Lap', crayons: ['solid', 'zoom', 'bouncy'], kinds: ['solid', 'zoom'] },
      { arch: 'boss10', boss: true, name: 'The Crayon Dragon', crayons: ['solid', 'bouncy', 'zoom'] }
    ]
  }
];
