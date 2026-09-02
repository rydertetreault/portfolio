/**
 * Generate the packed ASCII face-video data file consumed by AsciiFace.tsx.
 *
 * Pipeline:
 *   1. ffmpeg extracts every frame of face.mp4 at the pre-matched face crop
 *      (401×400 @ 329,137) into .face-work/ as raw grayscale + RGB PNGs.
 *   2. Sharp downsamples each frame to (COLS × ROWS) — one byte per cell for
 *      luma, plus a sparse list of accent-colored cells (saturation > threshold)
 *      keeping their real RGB so the neon overlays from the reel survive.
 *   3. Everything packs into a single binary at public/face.bin:
 *
 *      HEADER (16 bytes)
 *        'F','A','C','E'          magic
 *        u8  version              = 1
 *        u8  cols                 grid width
 *        u8  rows                 grid height
 *        u16 numFrames            LE
 *        u16 fps                  LE (source sampling rate)
 *        u8[5] reserved
 *
 *      PER FRAME
 *        u8[cols*rows]  luma
 *        u16            accentCount        LE
 *        {u16 cellIdx, u8 r, u8 g, u8 b}[]  packed
 */

import sharp from "sharp";
import { execSync } from "child_process";
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

// ── Configuration ────────────────────────────────────────────────────────────
const SRC = "face.mp4";
const OUT = "public/face.bin";
const WORK = ".face-work";

const CROP = { w: 401, h: 400, x: 329, y: 137 };
const FPS = 15;                    // sampling rate (video is 60fps → every 4th)
const COLS = 130;                  // ASCII grid width — denser, face reads better
const ROWS = 77;                   // aspect (130/77 = 1.688) pairs with cellH=cellW*1.7 → square display
const ACCENT_SAT = 0.28;
const ACCENT_VAL = 0.28;

// ── 1. Extract frames ────────────────────────────────────────────────────────
if (existsSync(WORK)) rmSync(WORK, { recursive: true });
mkdirSync(WORK, { recursive: true });

console.log(`Extracting frames from ${SRC} (crop ${CROP.w}×${CROP.h} @ ${CROP.x},${CROP.y}, ${FPS}fps)…`);
execSync(
  `ffmpeg -i ${SRC} -vf "crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y},eq=brightness=0.06:contrast=1.55:saturation=1.20,fps=${FPS},scale=${COLS}:${ROWS}:flags=area" ` +
    `-q:v 2 ${WORK}/f%04d.png -hide_banner -loglevel error`,
);

const files = readdirSync(WORK).filter((f) => f.endsWith(".png")).sort();
console.log(`Got ${files.length} frames.`);

// ── 2. Sample every frame → luma grid + sparse accent list ──────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
  let h = 0;
  if (d > 0) {
    if (M === r) h = ((g - b) / d) % 6;
    else if (M === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  return [h, M === 0 ? 0 : d / M, M];
}

const samples = /** @type {Array<{luma: Uint8Array, accents: Array<[number,number,number,number]>}>} */ ([]);

for (const f of files) {
  const buf = await sharp(`${WORK}/${f}`).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = buf;
  if (info.width !== COLS || info.height !== ROWS) {
    throw new Error(`unexpected size ${info.width}x${info.height} for ${f}`);
  }
  const luma = new Uint8Array(COLS * ROWS);
  const accents = /** @type {Array<[number,number,number,number]>} */ ([]);
  for (let i = 0; i < COLS * ROWS; i++) {
    const r = data[i * info.channels];
    const g = data[i * info.channels + 1];
    const b = data[i * info.channels + 2];
    luma[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const [, s, v] = rgbToHsv(r, g, b);
    if (s > ACCENT_SAT && v > ACCENT_VAL) accents.push([i, r, g, b]);
  }
  samples.push({ luma, accents });
}

// Stats
const totalCells = COLS * ROWS * samples.length;
const totalAccents = samples.reduce((s, x) => s + x.accents.length, 0);
console.log(`  cells: ${totalCells}, accented: ${totalAccents} (${((totalAccents / totalCells) * 100).toFixed(2)}%)`);

// ── 3. Pack into a single binary ─────────────────────────────────────────────
const framePayloadSize = samples.length * (COLS * ROWS + 2) + totalAccents * 5;
const totalSize = 16 + framePayloadSize;
const out = new Uint8Array(totalSize);
let off = 0;

// Header
out[off++] = 0x46; out[off++] = 0x41; out[off++] = 0x43; out[off++] = 0x45; // "FACE"
out[off++] = 1;       // version
out[off++] = COLS;
out[off++] = ROWS;
out[off++] = samples.length & 0xff; out[off++] = (samples.length >> 8) & 0xff; // u16 numFrames
out[off++] = FPS & 0xff; out[off++] = (FPS >> 8) & 0xff;                       // u16 fps
off += 5; // reserved (16-byte header total)

for (const { luma, accents } of samples) {
  out.set(luma, off); off += luma.length;
  out[off++] = accents.length & 0xff; out[off++] = (accents.length >> 8) & 0xff;
  for (const [idx, r, g, b] of accents) {
    out[off++] = idx & 0xff; out[off++] = (idx >> 8) & 0xff;
    out[off++] = r; out[off++] = g; out[off++] = b;
  }
}

if (off !== totalSize) throw new Error(`packing mismatch: wrote ${off} of ${totalSize}`);

writeFileSync(OUT, out);
const kb = (totalSize / 1024).toFixed(1);
console.log(`\nWrote ${OUT}  (${kb} KB, ${samples.length} frames, ${COLS}×${ROWS} grid)`);
console.log(`Estimated gzipped: ~${(totalSize * 0.3 / 1024).toFixed(0)} KB`);
