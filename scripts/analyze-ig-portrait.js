// Analyze ig portait.png — find the neon accent colors used
const sharp = require("sharp");

async function main() {
  const path = "ig portait.png";
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const buckets = new Map(); // key: quantized color, value: count
  let bwCount = 0;
  let colorCount = 0;
  const brightColors = []; // (r,g,b) with high saturation

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const a = channels === 4 ? data[i * channels + 3] : 255;
    if (a < 20) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max; // simple HSV S
    const val = max / 255;

    if (sat < 0.15) {
      bwCount++;
      continue; // near grayscale
    }
    if (val < 0.35) continue; // too dark
    colorCount++;

    // Quantize to 32 levels per channel to bucket similar colors
    const qr = r >> 3, qg = g >> 3, qb = b >> 3;
    const key = (qr << 10) | (qg << 5) | qb;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  console.log(`total pixels: ${width * height}`);
  console.log(`~grayscale (S<0.15): ${bwCount} (${(bwCount / (width * height) * 100).toFixed(1)}%)`);
  console.log(`vivid colored: ${colorCount} (${(colorCount / (width * height) * 100).toFixed(1)}%)`);

  // Top color clusters
  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log("\nTop 20 vivid color buckets (r,g,b · count · hex):");
  for (const [key, count] of top) {
    const qr = (key >> 10) & 0x1f, qg = (key >> 5) & 0x1f, qb = key & 0x1f;
    const r = (qr << 3) | 4, g = (qg << 3) | 4, b = (qb << 3) | 4;
    const hex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
    console.log(`  rgb(${r},${g},${b})  ${count.toString().padStart(6)}  ${hex}`);
  }

  // Save a small preview
  await sharp(path).resize(120, 115, { fit: "fill" }).toFile("/tmp/ig-preview.png");
  console.log("\npreview saved: /tmp/ig-preview.png");
}
main().catch(e => { console.error(e); process.exit(1); });
