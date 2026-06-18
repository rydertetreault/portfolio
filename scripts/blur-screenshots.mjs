// Region-targeted blur for portfolio screenshots.
//
// Two modes per job:
//   - mode: "blur"  → blur only the listed regions (e.g. KPI cards with numbers)
//   - mode: "keep"  → blur the WHOLE image except the listed regions (e.g. keep nav chrome sharp)
//
// Coordinates are percentages of width/height (0–100).
// Run: node scripts/blur-screenshots.mjs
import sharp from "sharp";
import path from "node:path";

const SIGMA = 14; // blur intensity

/** @typedef {{x:number,y:number,w:number,h:number}} Rect */
/** @typedef {{in:string,out:string,mode:"blur"|"keep",regions:Rect[]}} Job */

/** @type {Job[]} */
const jobs = [
  // ── Analytics dashboard screenshots ─────────────────────────────
  // Blur regions traced from the user's blue-circle annotations.
  {
    in: "public/projects/analytics-api/_raw-01.png",
    out: "public/projects/analytics-api/01.png",
    mode: "blur",
    regions: [
      { x: 16.42, y: 20.33, w: 34.37, h: 20.98 },
      { x: 22.04, y: 58.80, w: 57.19, h: 7.98 },
    ],
  },
  {
    in: "public/projects/analytics-api/_raw-02.png",
    out: "public/projects/analytics-api/02.png",
    mode: "blur",
    regions: [
      { x: 17.98, y: 27.06, w: 9.20, h: 10.78 },
      { x: 33.33, y: 27.39, w: 9.88, h: 11.11 },
      { x: 48.48, y: 26.51, w: 8.99, h: 10.01 },
      { x: 65.46, y: 28.05, w: 11.41, h: 9.02 },
      { x: 17.98, y: 57.43, w: 55.21, h: 14.08 },
    ],
  },

  // ── Media Library cover ─────────────────────────────────────────
  // Keep top nav bar + side nav bar sharp, blur the asset gallery.
  {
    in: "public/projects/media-library/_raw-cover.png",
    out: "public/projects/media-library/cover.png",
    mode: "keep",
    regions: [
      // Top nav bar — full width strip across the top.
      { x: 0, y: 0, w: 100, h: 10 },
      // Side nav bar — left column for the full height.
      { x: 0, y: 0, w: 15, h: 100 },
    ],
  },
];

function pct(p, total) {
  return Math.max(0, Math.min(total, Math.round((p / 100) * total)));
}

for (const job of jobs) {
  const input = path.resolve(job.in);
  const output = path.resolve(job.out);

  const meta = await sharp(input).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) throw new Error(`Cannot read dimensions for ${job.in}`);

  const rects = job.regions.map((r) => ({
    left: pct(r.x, W),
    top: pct(r.y, H),
    width: pct(r.w, W),
    height: pct(r.h, H),
  }));

  if (job.mode === "blur") {
    // Extract each region, blur it, composite back onto the raw image.
    const overlays = await Promise.all(
      rects.map(async ({ left, top, width, height }) => {
        const buf = await sharp(input)
          .extract({ left, top, width, height })
          .blur(SIGMA)
          .toBuffer();
        return { input: buf, left, top };
      })
    );
    await sharp(input).composite(overlays).toFile(output);
    console.log(`[blur] ${job.in} → ${job.out}  (${rects.length} region${rects.length === 1 ? "" : "s"})`);
  } else {
    // mode === "keep": blur the whole image, then composite the raw rects on top.
    const blurredBase = await sharp(input).blur(SIGMA).toBuffer();
    const overlays = await Promise.all(
      rects.map(async ({ left, top, width, height }) => {
        const buf = await sharp(input)
          .extract({ left, top, width, height })
          .toBuffer();
        return { input: buf, left, top };
      })
    );
    await sharp(blurredBase).composite(overlays).toFile(output);
    console.log(`[keep] ${job.in} → ${job.out}  (kept ${rects.length} region${rects.length === 1 ? "" : "s"} sharp)`);
  }
}
