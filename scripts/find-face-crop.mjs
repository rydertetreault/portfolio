// Find the face bounding box by measuring where the non-black content lives
import sharp from "sharp";

const FRAME = ".face-frames/f07.jpg";
const { data, info } = await sharp(FRAME).grayscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// Column mass — for each x, sum brightness (bright = content)
const colMass = new Float32Array(W);
const rowMass = new Float32Array(H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const v = data[y * W + x];
    // Only count pixels above a low threshold (ignore truly-black bg)
    if (v > 30) { colMass[x] += v; rowMass[y] += v; }
  }
}

// Normalize
const maxCol = Math.max(...colMass);
const maxRow = Math.max(...rowMass);

// Find bbox where mass > 15% of peak
const th = 0.15;
let x0 = 0; while (x0 < W && colMass[x0] < maxCol * th) x0++;
let x1 = W-1; while (x1 > 0 && colMass[x1] < maxCol * th) x1--;
let y0 = 0; while (y0 < H && rowMass[y0] < maxRow * th) y0++;
let y1 = H-1; while (y1 > 0 && rowMass[y1] < maxRow * th) y1--;

console.log(`frame: ${W}x${H}`);
console.log(`content bbox @15%: x=[${x0}, ${x1}] y=[${y0}, ${y1}]`);
console.log(`  → crop: ${x1-x0}x${y1-y0} at (${x0}, ${y0})`);

// The face lives in the LEFT ~55% of the frame; text overlays are on the right
// and along the bottom. Restrict search accordingly.
const searchXMax = Math.round(W * 0.55);
const searchYMax = Math.round(H * 0.78);
const faceRowMass = new Float32Array(H);
const faceColMass = new Float32Array(W);
for (let y = 0; y < searchYMax; y++) {
  for (let x = 0; x < searchXMax; x++) {
    const v = data[y * W + x];
    if (v > 30) { faceRowMass[y] += v; faceColMass[x] += v; }
  }
}
const maxFRow = Math.max(...faceRowMass);
const maxFCol = Math.max(...faceColMass);
let fy0 = 0, fy1 = searchYMax - 1;
while (fy0 < searchYMax && faceRowMass[fy0] < maxFRow * 0.10) fy0++;
while (fy1 > fy0 && faceRowMass[fy1] < maxFRow * 0.10) fy1--;
let fx0 = 0, fx1 = searchXMax - 1;
while (fx0 < searchXMax && faceColMass[fx0] < maxFCol * 0.12) fx0++;
while (fx1 > fx0 && faceColMass[fx1] < maxFCol * 0.12) fx1--;

console.log(`\nface-only bbox (excluding bottom UI):`);
console.log(`  x=[${fx0}, ${fx1}] y=[${fy0}, ${fy1}]`);
console.log(`  → crop: ${fx1-fx0}x${fy1-fy0} at (${fx0}, ${fy0})`);

// Save a preview PNG with the crop applied for visual verification
await sharp(FRAME)
  .extract({ left: fx0, top: fy0, width: fx1-fx0, height: fy1-fy0 })
  .toFile("public/_dev-frames/face-crop.jpg");
console.log("\nsaved: public/_dev-frames/face-crop.jpg");
