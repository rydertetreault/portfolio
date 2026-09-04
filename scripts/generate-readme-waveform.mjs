#!/usr/bin/env node
/**
 * Bake the homepage ASCII plasma / topography field into looping animated SVGs
 * for the GitHub profile README (GitHub renders CSS animations inside SVGs but
 * never runs JS, so the live engine can't be used there).
 *
 * Two layouts:
 *   --mode banner   a wide strip of the field alone
 *   --mode poster   the homepage composition: intro panel + sections rendered as
 *                   SVG text, field flowing around and dimmed beneath the panels
 *                   (default)
 *
 * The field is a straight port of `src/components/ascii-field/engine.ts` (see
 * readme-waveform/field.mjs) using the real noise / presets / config, so it is
 * the same "hero" field the site draws. Fonts (Geist / Geist Mono subsets), the
 * avatar and text metrics come from readme-waveform/assets — rebuild them with
 * `python3 scripts/readme-waveform/build-assets.py`.
 *
 * Usage (repo root, Node ≥ 22.6 for TS imports):
 *   node scripts/generate-readme-waveform.mjs [--mode poster|banner]
 *        [--width 1200] [--height 300 (banner)] [--font 11] [--fps 8] [--seconds 12]
 *        [--blend 5] [--seed 7] [--strip-rate 2.5] [--sub 4] [--out dir] [--preview]
 *
 * Emits `<out>/ascii-<mode>-dark.svg` and `<out>/ascii-<mode>-light.svg` (default out:
 * scripts/out, gitignored). Copy them into rydertetreault/RyderTetreault → assets/
 * and reference them from its README via <picture>.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bakeFrames } from "./readme-waveform/field.mjs";
import { THEMES, bandCss, animCss, fontFace, framesMarkup, svgDocument, stats } from "./readme-waveform/svg.mjs";
import { layoutPoster } from "./readme-waveform/poster.mjs";
import { content } from "./readme-waveform/content.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, "readme-waveform/assets");

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (!a.startsWith("--")) return [];
    const v = all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true";
    return [a.slice(2), v];
  }).filter((e) => e.length),
);
const num = (k, d) => (args[k] !== undefined ? Number(args[k]) : d);

const MODE = args.mode ?? "poster";
const WIDTH = num("width", 1200);
const FONT = num("font", 11);
const FPS = num("fps", 8);
const SECONDS = num("seconds", MODE === "poster" ? 10 : 12);
const BLEND = num("blend", 5);
const SEED = num("seed", 7);
const STRIP_RATE = num("strip-rate", 2.5);
const PRESET = args.preset ?? "hero";
const OUT = resolve(args.out ?? resolve(HERE, "out"));
const PREVIEW = args.preview === "true";
const SUB = num("sub", MODE === "poster" ? 4 : 1); // cadence divisor for the dimmed in-panel glyphs

const log = (msg, raw = false) => (raw ? process.stdout.write(msg) : console.log(msg));

let height, quietRects = [], quiet = null, quietZone = null, poster = null;
if (MODE === "poster") {
  poster = await layoutPoster(content, { width: WIDTH });
  height = poster.height;
  quietRects = poster.quietRects;
  quiet = poster.quiet;
  quietZone = poster.quietZone;
  log(`poster ${WIDTH}×${height}, panels x ${poster.panels.x0}–${poster.panels.x1}, split at ${poster.panels.xSplit} (left ${poster.leftW})`);
} else {
  height = num("height", 300);
}

const baked = bakeFrames({
  width: WIDTH, height, fontSize: FONT, fps: FPS, seconds: SECONDS, blend: BLEND, seed: SEED,
  stripRate: STRIP_RATE, preset: PRESET, quietRects, quiet, quietZone, log,
});
const { frames, field, p, cfg } = baked;

if (PREVIEW) {
  const fr = frames[0];
  for (let row = 0; row < field.rows; row++) {
    let s = "";
    for (let col = 0; col < Math.min(field.cols, 180); col++) {
      const idx = row * field.cols + col;
      const g = fr.glyph[idx];
      s += fr.pal[idx] ? `\x1b[38;2;163;230;53m${g}\x1b[0m` : fr.quiet[idx] ? `\x1b[2m${g}\x1b[0m` : g;
    }
    console.log(s);
  }
}

mkdirSync(OUT, { recursive: true });
const monoFace = fontFace("GM", resolve(ASSETS, "geist-mono-field.woff2"));
const sansFace = MODE === "poster" ? fontFace("GS", resolve(ASSETS, "geist-sans.woff2"), "100 900") : "";
const frameStack = framesMarkup(frames, field, FPS, FONT, SUB);

for (const [name, theme] of Object.entries(THEMES)) {
  const style = monoFace + sansFace + bandCss(theme, p, cfg) + animCss(frames.length, FPS, SUB);
  let body = frameStack;
  let label = "Animated ASCII topography from rydertetreault.dev";
  if (poster) {
    body += await poster.render(theme, resolve(ASSETS, "profile.jpg"));
    label = `Ryder Tetreault: ${content.tagline}. About, experience, education and contact over an animated ASCII field.`;
  }
  const svg = svgDocument({ width: WIDTH, height, style, body, label });
  const file = resolve(OUT, `ascii-${MODE}-${name}.svg`);
  writeFileSync(file, svg);
  log(`wrote ${file}  ${stats(svg)}`);
}
