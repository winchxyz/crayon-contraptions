/* Turn recorded frames (shots/dm_NNNN.jpg from dev/demo.js) into
   media/demo.mp4 (full, 30 fps) and media/demo.gif (short highlights for the
   README). Needs ffmpeg on PATH.   node tools/make-demo.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const MEDIA = path.join(ROOT, 'media');
const frames = fs.readdirSync(SHOTS).filter(f => /^dm_\d{4}\.jpg$/.test(f)).sort();
if (!frames.length) throw new Error('no frames in shots/: run dev/demo.js first');
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const size = f => (fs.statSync(f).size / 1048576).toFixed(1) + ' MB';

// full video
const mp4 = path.join(MEDIA, 'demo.mp4');
ff(['-framerate', '30', '-i', path.join(SHOTS, 'dm_%04d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
console.log(`${mp4}  ${frames.length} frames, ${(frames.length / 30).toFixed(1)} s, ${size(mp4)}`);

// GIF: a few highlight windows (frame numbers), every other frame (15 fps)
const pick = [[118, 300], [402, 520], [1386, 1452], [1560, 1640]];
const tmp = path.join(SHOTS, 'gif');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp);
let k = 0;
for (const [a, b] of pick) for (let i = a; i <= b && i < frames.length; i += 2) fs.copyFileSync(path.join(SHOTS, frames[i]), path.join(tmp, `g_${String(k++).padStart(4, '0')}.jpg`));
const gif = path.join(MEDIA, 'demo.gif');
const scale = 'scale=640:-1:flags=lanczos';
ff(['-framerate', '15', '-i', path.join(tmp, 'g_%04d.jpg'), '-vf', `${scale},palettegen=max_colors=96:stats_mode=diff`, path.join(tmp, 'palette.png')]);
ff(['-framerate', '15', '-i', path.join(tmp, 'g_%04d.jpg'), '-i', path.join(tmp, 'palette.png'),
  '-lavfi', `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, '-loop', '0', gif]);
console.log(`${gif}  ${k} frames, ${(k / 15).toFixed(1)} s, ${size(gif)}`);
