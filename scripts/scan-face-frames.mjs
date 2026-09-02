import sharp from "sharp";
import { readdirSync } from "fs";
import path from "path";

const DIR = ".face-frames";
const files = readdirSync(DIR).filter(f => f.endsWith(".jpg")).sort();

// For each frame, sample a small grid and report:
//   - mean luma (overall brightness)
//   - fraction of "vivid" pixels (S > 0.35, V > 0.35)
//   - top 3 vivid hue buckets (16 hue bins)
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}
const HUE_NAMES = ["red","orange","yellow","chartreuse","green","spring","cyan","azure","blue","violet","magenta","pink"];
function hueName(h) { return HUE_NAMES[Math.floor(h / 30) % 12]; }

for (const f of files) {
  const p = path.join(DIR, f);
  const { data, info } = await sharp(p).resize(160, 90, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let sumL = 0, vivid = 0;
  const hueBuckets = {};
  for (let i = 0; i < n; i++) {
    const r = data[i*3], g = data[i*3+1], b = data[i*3+2];
    const y = 0.299*r + 0.587*g + 0.114*b;
    sumL += y;
    const [h, s, v] = rgbToHsv(r, g, b);
    if (s > 0.4 && v > 0.35) {
      vivid++;
      const name = hueName(h);
      hueBuckets[name] = (hueBuckets[name] || 0) + 1;
    }
  }
  const meanL = (sumL / n).toFixed(0);
  const vividPct = (vivid / n * 100).toFixed(1);
  const topHues = Object.entries(hueBuckets).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([k,v])=>`${k}:${v}`).join(" ");
  console.log(`${f}  L=${meanL}  vivid=${vividPct}%  top=[${topHues}]`);
}
