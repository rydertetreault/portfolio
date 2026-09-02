// Extract 1 native-res frame + several candidate face crops for visual review
import sharp from "sharp";
import { execSync } from "child_process";

// Pull one native-resolution frame (mid-video) to work from
execSync(`ffmpeg -y -ss 4 -i face.mp4 -frames:v 1 -q:v 2 public/_dev-frames/native-full.jpg -hide_banner -loglevel error`);

const meta = await sharp("public/_dev-frames/native-full.jpg").metadata();
console.log(`native frame: ${meta.width}x${meta.height}`);

// Candidate crops to try — described as fractional bboxes [x0, y0, x1, y1] of the frame
const CANDIDATES = [
  ["A-left-narrow",  0.13, 0.10, 0.42, 0.85],
  ["B-left-wide",    0.10, 0.05, 0.47, 0.90],
  ["C-center-left",  0.15, 0.05, 0.50, 0.80],
  ["D-center",       0.20, 0.05, 0.55, 0.85],
  ["E-tall-narrow",  0.18, 0.02, 0.40, 0.95],
  ["F-square-left",  0.10, 0.10, 0.45, 0.75],
];

for (const [name, x0f, y0f, x1f, y1f] of CANDIDATES) {
  const x0 = Math.round(meta.width * x0f);
  const y0 = Math.round(meta.height * y0f);
  const x1 = Math.round(meta.width * x1f);
  const y1 = Math.round(meta.height * y1f);
  const w = x1 - x0, h = y1 - y0;
  const out = `public/_dev-frames/crop-${name}.jpg`;
  await sharp("public/_dev-frames/native-full.jpg")
    .extract({ left: x0, top: y0, width: w, height: h })
    .toFile(out);
  console.log(`${name}: ${w}x${h} @ (${x0}, ${y0}) → ${out}`);
}
