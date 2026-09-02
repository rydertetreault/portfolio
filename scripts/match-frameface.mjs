// Template-match frameface.png against a native-res frame of face.mp4
// to recover the crop rectangle, then verify it visually.
import sharp from "sharp";
import { execSync } from "child_process";

// Ensure we have a full-res reference frame
if (!(await import("fs")).existsSync("public/_dev-frames/native-full.jpg")) {
  execSync(`ffmpeg -y -ss 4 -i face.mp4 -frames:v 1 -q:v 2 public/_dev-frames/native-full.jpg -hide_banner -loglevel error`);
}

const frameMeta = await sharp("public/_dev-frames/native-full.jpg").metadata();
const templateMeta = await sharp("frameface.png").metadata();
const FW = frameMeta.width, FH = frameMeta.height;
const TW = templateMeta.width, TH = templateMeta.height;
console.log(`frame: ${FW}x${FH}, template: ${TW}x${TH}`);

// Downsample both to a small scale for a fast search, then refine
async function searchAtScale(scale) {
  const fW = Math.round(FW * scale);
  const fH = Math.round(FH * scale);
  const tW = Math.round(TW * scale);
  const tH = Math.round(TH * scale);
  const frame = await sharp("public/_dev-frames/native-full.jpg").grayscale().resize(fW, fH, {fit:"fill"}).raw().toBuffer();
  const tmpl = await sharp("frameface.png").grayscale().resize(tW, tH, {fit:"fill"}).raw().toBuffer();

  let best = { x: 0, y: 0, score: Infinity };
  const stepX = fW - tW;
  const stepY = fH - tH;
  for (let y = 0; y <= stepY; y++) {
    for (let x = 0; x <= stepX; x++) {
      let sad = 0;
      for (let ty = 0; ty < tH; ty += 2) {          // stride-2 for speed
        for (let tx = 0; tx < tW; tx += 2) {
          const f = frame[(y+ty)*fW + (x+tx)];
          const t = tmpl[ty*tW + tx];
          sad += Math.abs(f - t);
        }
      }
      if (sad < best.score) best = { x, y, score: sad };
    }
  }
  return { ...best, fW, fH, tW, tH, scale };
}

// If the user cropped without resizing, TW=401 = crop width in original.
// Try assuming template size is 1x, 0.75x, 0.5x of the original crop.
console.log("\nTemplate matching (assumes user cropped without resize)…");
const r = await searchAtScale(0.35);
console.log(`  scale 0.35 → best (${r.x}, ${r.y})  score=${r.score}`);
// Convert to native coords
const nx = Math.round(r.x / r.scale);
const ny = Math.round(r.y / r.scale);
console.log(`  → native crop: ${TW}x${TH} at (${nx}, ${ny})`);

// Save what we think the crop region looks like from the native frame
await sharp("public/_dev-frames/native-full.jpg")
  .extract({ left: nx, top: ny, width: TW, height: TH })
  .toFile("public/_dev-frames/matched-crop.jpg");
console.log(`  saved: public/_dev-frames/matched-crop.jpg`);
console.log(`\nCompare:  frameface.png  ↔  matched-crop.jpg  (should look identical)`);

// Also emit the crop rect for the ffmpeg pipeline
console.log(`\nFFmpeg crop filter:  crop=${TW}:${TH}:${nx}:${ny}`);
