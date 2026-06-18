// Detect the bright-blue annotation rings drawn on the marked screenshots
// and print their bounding boxes as percentages of the image dimensions.
// Run: node scripts/detect-blue-regions.mjs
import sharp from "sharp";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "projects", "analytics-api");

const files = [
  "Screenshot 2026-06-18 000920.png",
  "Screenshot 2026-06-18 001003.png",
];

// "Bright blue" classifier: a pixel that's clearly more blue than red/green.
function isBlue(r, g, b) {
  return b > 150 && b > r + 40 && b > g + 40;
}

// Group blue pixels into connected blobs (flood fill) so we get one rect per circle.
function findBlobs(mask, W, H, minPixels = 200) {
  const visited = new Uint8Array(mask.length);
  const blobs = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (!mask[idx] || visited[idx]) continue;
      // BFS flood fill
      const stack = [idx];
      visited[idx] = 1;
      let count = 0;
      let minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const cur = stack.pop();
        const cx = cur % W;
        const cy = (cur - cx) / W;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nIdx = ny * W + nx;
          if (mask[nIdx] && !visited[nIdx]) {
            visited[nIdx] = 1;
            stack.push(nIdx);
          }
        }
      }
      if (count >= minPixels) {
        blobs.push({ minX, minY, maxX, maxY, count });
      }
    }
  }
  return blobs;
}

for (const file of files) {
  const inPath = path.join(dir, file);
  const { data, info } = await sharp(inPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;

  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isBlue(r, g, b)) mask[p] = 1;
  }

  const blobs = findBlobs(mask, W, H, 300);
  console.log(`\n=== ${file}  (${W}×${H}) ===`);
  if (!blobs.length) {
    console.log("  No blue annotations found.");
    continue;
  }
  // Sort by Y then X for stable ordering
  blobs.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  for (const blob of blobs) {
    const padPx = 6; // pad slightly so the blur covers a bit past the ring
    const left = Math.max(0, blob.minX - padPx);
    const top = Math.max(0, blob.minY - padPx);
    const right = Math.min(W - 1, blob.maxX + padPx);
    const bottom = Math.min(H - 1, blob.maxY + padPx);
    const w = right - left;
    const h = bottom - top;
    const xPct = (left / W) * 100;
    const yPct = (top / H) * 100;
    const wPct = (w / W) * 100;
    const hPct = (h / H) * 100;
    console.log(
      `  blob ${blob.count.toString().padStart(5)}px  px(${left},${top},${w}x${h})  ` +
        `→  { x: ${xPct.toFixed(2)}, y: ${yPct.toFixed(2)}, w: ${wPct.toFixed(2)}, h: ${hPct.toFixed(2)} }`
    );
  }
}
