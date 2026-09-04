#!/usr/bin/env node
/**
 * Bake the homepage ASCII plasma / topography field into a looping animated SVG
 * for the GitHub profile README (GitHub renders CSS animations inside SVGs, but
 * never runs JS, so the live engine can't be used there).
 *
 * The field math is a straight port of `src/components/ascii-field/engine.ts`
 * (lattice → cells → bands → glyphs, plus the accent strips that ride the
 * contours) and imports the real `noise.ts`, `presets.ts` and `config.ts`, so the
 * output is the same "hero" field the site draws. Cursor / quiet-zone / route
 * effects are omitted (there is no cursor in a README).
 *
 * Looping: the field is cross-blended in continuous space with itself one period
 * earlier over the final `--blend` seconds (variance-compensated, before band
 * quantisation) so frame N wraps to frame 0 with no cut. Strips are simulated for
 * two periods with a periodic spawn schedule and the second period is emitted.
 *
 * Usage (from the repo root, Node ≥ 22.6 for TS imports):
 *   node scripts/generate-readme-waveform.mjs [--width 1200] [--height 300]
 *        [--font 11] [--fps 8] [--seconds 12] [--blend 4] [--seed 7]
 *        [--strip-rate 2.5] [--font-file path.woff2] [--out dir] [--preview]
 *
 * `--strip-rate` multiplies the preset's accent-strip spawn rate: the banner is a
 * short slice of the field, so the site's rate reads sparse here.
 *
 * Emits `<out>/ascii-waveform-dark.svg` and `<out>/ascii-waveform-light.svg`
 * (default out: scripts/out, gitignored). Copy them into the profile repo
 * (rydertetreault/RyderTetreault → assets/) and reference via <picture> in its README.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Simplex3, hash2 } from "../src/components/ascii-field/noise.ts";
import { PRESETS } from "../src/components/ascii-field/presets.ts";
import { DEFAULT_CONFIG } from "../src/components/ascii-field/config.ts";

/* ───────────── args ───────────── */

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const v = all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true";
    return [k, v];
  }).filter((e) => e.length),
);
const num = (k, d) => (args[k] !== undefined ? Number(args[k]) : d);

const WIDTH = num("width", 1200);
const HEIGHT = num("height", 300);
const FONT = num("font", 11);
const FPS = num("fps", 8);
const SECONDS = num("seconds", 12);
const BLEND = num("blend", 5);
const SEED = num("seed", 7);
const STRIP_RATE = num("strip-rate", 2.5);
const PRESET = args.preset ?? "hero";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(args.out ?? resolve(HERE, "out"));
// Geist Mono (the site's mono font, OFL) subset to the field's glyphs:
//   fonttools varLib.instancer GeistMono-Variable.ttf wght=400 -o GeistMono-400.ttf
//   pyftsubset GeistMono-400.ttf --text=' .:-=+*#%@_\|/<>^' --flavor=woff2 --no-hinting --layout-features='' --name-IDs='' \
//     --output-file=scripts/assets/GeistMono-ascii.woff2
const FONT_FILE = args["font-file"] === "none" ? null : resolve(args["font-file"] ?? resolve(HERE, "assets/GeistMono-ascii.woff2"));
const PREVIEW = args.preview === "true";

/* ───────────── theme (from globals.css) ───────────── */

const THEMES = {
  dark: { lo: "#5c5c5c", hi: "#cfcfcf" },
  light: { lo: "#6a6a6a", hi: "#111111" },
};
// Light theme uses the site's darker accent so strips stay legible on white.
const LIGHT_PALETTE = ["#4d7c0f", "#65a30d", "#5f8a2a", "#6a8f2f", "#7a7a26", "#7c5a2e", "#3f7a2a"];

/* ───────────── deterministic RNG ───────────── */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const TRACE_MAX_JUMP = 4;

/* ───────────── field (port of engine.ts) ───────────── */

class Field {
  constructor(w, h, fontSize, p, cfg) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.cfg = cfg;
    this.noise = new Simplex3(1337);
    this.octaves = cfg.perf.octaves;
    this.step = Math.max(1, Math.round(cfg.perf.latticeStep));
    this.cellW = fontSize * 0.6 * cfg.cell.widthScale; // Geist Mono advance = 0.6em
    this.cellH = fontSize * cfg.cell.lineHeight;
    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);
    this.lcols = Math.ceil(this.cols / this.step) + 1;
    this.lrows = Math.ceil(this.rows / this.step) + 1;
    const n = this.cols * this.rows;
    this.nBuf = new Float32Array(n);
    this.dBuf = new Float32Array(n);
    const ln = this.lcols * this.lrows;
    this.latN = new Float32Array(ln); // fbm (zero-mean-ish)
    this.latH = new Float32Array(ln); // plasma sum of sines (zero-mean)
    this.latNear = new Float32Array(ln);
    this.tmpN = new Float32Array(ln);
    this.tmpH = new Float32Array(ln);
  }

  /** Raw lattice components at an (unwrapped) time. Drift is linear in time. */
  sampleLattice(time, outN, outH) {
    const p = this.p;
    const noise = this.noise;
    const step = this.step;
    const cw = this.cellW;
    const ch = this.cellH;
    const wk = 1000 / Math.max(1, this.w);
    const dk = this.w / 1000;
    const offX = time * p.driftX * dk;
    const offY = time * p.driftY * dk;
    const s = p.scale * wk;
    const warpAmt = p.warp / Math.max(1e-6, s);
    const tNear = time * p.speed;

    const pf = s * p.plasmaFreq;
    const pt = time * p.speed * p.plasmaSpeed;
    const pdist = p.plasmaDistortion * 2.2;
    const pcx = this.w / 2;
    const pcy = this.h / 2;
    const sin = Math.sin;
    const sqrt = Math.sqrt;
    const dx0 = sin(0.3 * pt) * pdist;
    const dy0 = sin(0.4 * pt) * pdist;

    for (let j = 0; j < this.lrows; j++) {
      const cy = (j * step + 0.5) * ch;
      const rowIdx = j * this.lcols;
      for (let i = 0; i < this.lcols; i++) {
        const cx = (i * step + 0.5) * cw;
        const x = cx + offX;
        const y = cy + offY;

        const qx = noise.fbm(x * s * 0.9, y * s * 0.9, tNear * 0.7, 2);
        const qy = noise.fbm(x * s * 0.9 + 7.3, y * s * 0.9 + 3.1, tNear * 0.7 + 11, 2);
        const wx = x + qx * warpAmt;
        const wy = y + qy * warpAmt;
        outN[rowIdx + i] = noise.fbm(wx * s, wy * s, tNear, this.octaves);

        const r = (wx - (pcx - this.w / 2)) * pf;
        const im = (wy - pcy) * pf;
        const u = (cx - pcx + qx * warpAmt * 0.5) * pf;
        const v = (cy - pcy + qy * warpAmt * 0.5) * pf;
        const ex = r + dx0;
        const ey = im + dy0;
        let h = sin(r + pt) + sin(im + 0.7 * pt) + sin(0.5 * (r + im + pt));
        h += sin(sqrt(ex * ex + ey * ey + 1) + pt);
        h += 0.5 * sin(2 * r + sin(im + 0.5 * pt) * pdist);
        h += 0.5 * sin(2 * im + sin(r + 0.6 * pt) * pdist);
        h += 0.7 * sin(2 * sqrt(u * u + v * v) - 1.5 * pt);
        outH[rowIdx + i] = h;
      }
    }
  }

  /**
   * Evaluate the near density lattice at `time`, blended with `time - period`
   * by weight `wB` (0 = no blend). Blending happens on the zero-mean components
   * with variance compensation so contrast doesn't dip through the seam.
   */
  evaluateLattice(time, period, wB) {
    const p = this.p;
    this.sampleLattice(time, this.latN, this.latH);
    if (wB > 0) {
      this.sampleLattice(time - period, this.tmpN, this.tmpH);
      const wA = 1 - wB;
      const norm = 1 / Math.sqrt(wA * wA + wB * wB);
      for (let i = 0; i < this.latN.length; i++) {
        this.latN[i] = (this.latN[i] * wA + this.tmpN[i] * wB) * norm;
        this.latH[i] = (this.latH[i] * wA + this.tmpH[i] * wB) * norm;
      }
    }
    const pm = p.plasma;
    const NORM = p.plasmaContrast / 5.4;
    for (let i = 0; i < this.latN.length; i++) {
      let n01 = this.latN[i] * 0.75 + 0.5;
      if (pm > 0.001) {
        let p01 = 0.5 + 0.5 * this.latH[i] * NORM;
        if (p01 < 0) p01 = 0;
        else if (p01 > 1) p01 = 1;
        n01 += (p01 - n01) * pm;
      }
      this.latNear[i] = n01;
    }
  }

  /** Lattice → per-cell density (nBuf) → thresholded + shaded value (dBuf). */
  evaluateCells() {
    const p = this.p;
    const cols = this.cols;
    const rows = this.rows;
    const invStep = 1 / this.step;
    const lcols = this.lcols;
    const lat = this.latNear;
    const nBuf = this.nBuf;
    const dBuf = this.dBuf;

    for (let row = 0; row < rows; row++) {
      const fy = row * invStep;
      const j0 = Math.floor(fy);
      const ty = fy - j0;
      const r0 = j0 * lcols;
      const r1 = r0 + lcols;
      for (let col = 0; col < cols; col++) {
        const fx = col * invStep;
        const i0 = Math.floor(fx);
        const tx = fx - i0;
        const a = lat[r0 + i0];
        const b = lat[r0 + i0 + 1];
        const c = lat[r1 + i0];
        const d = lat[r1 + i0 + 1];
        nBuf[row * cols + col] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
      }
    }

    const thr = p.threshold;
    const thrHi = p.threshold + p.softness;
    const contrast = p.contrast;
    const shading = p.shading;
    const lx = -0.55;
    const ly = -0.83;
    const gradK = 6 / Math.max(1e-6, p.scale * (1000 / Math.max(1, this.w)) * 1000);
    const cw = this.cellW;
    const ch = this.cellH;

    for (let row = 0; row < rows; row++) {
      const rowIdx = row * cols;
      for (let col = 0; col < cols; col++) {
        const idx = rowIdx + col;
        const n01 = nBuf[idx];
        let near = smoothstep(thr, thrHi, n01);
        if (near > 0 && contrast !== 1) near = Math.pow(near, contrast);
        let v;
        if (near > 0.002) {
          const l = col > 0 ? nBuf[idx - 1] : n01;
          const r = col < cols - 1 ? nBuf[idx + 1] : n01;
          const u = row > 0 ? nBuf[idx - cols] : n01;
          const b = row < rows - 1 ? nBuf[idx + cols] : n01;
          const gx = ((r - l) * gradK) / cw;
          const gy = ((b - u) * gradK) / ch;
          let lit = 0.5 + (gx * lx + gy * ly) * 2.2;
          if (lit < 0) lit = 0;
          else if (lit > 1) lit = 1;
          v = near * (1 - shading * 0.55 + shading * lit * 0.9);
        } else {
          v = 0;
        }
        dBuf[idx] = v > 1 ? 1 : v;
      }
    }
  }

  /* ── contour helpers (verbatim from engine.ts) ── */

  bandAt(col, row, levels) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return -1;
    const v = this.dBuf[row * this.cols + col];
    return levels > 0 ? Math.round(v * levels) : v > 0.5 ? 1 : 0;
  }

  edgeContinuous(a, b, r0, r1, band, levels) {
    const lo = Math.min(r0, r1) + 1;
    const hi = Math.max(r0, r1) - 1;
    for (let r = lo; r <= hi; r++) {
      if (this.bandAt(a, r, levels) !== band && this.bandAt(b, r, levels) !== band) return false;
    }
    return true;
  }

  tracePath(col, row, band, side, dir, len, levels, prev, outCols, outRows) {
    outCols.length = 0;
    outRows.length = 0;
    let c = col;
    let r = row;
    let lastDr = 0;
    for (let i = 0; i < len; i++) {
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) break;
      outCols.push(c);
      outRows.push(r);
      const nc = c + dir;
      if (nc < 0 || nc >= this.cols) break;
      const want = prev && prev.length > i + 1 ? prev[i + 1] : Number.NaN;
      let best = Number.NaN;
      let bestScore = Infinity;
      for (let dr = -TRACE_MAX_JUMP; dr <= TRACE_MAX_JUMP; dr++) {
        const nr = r + dr;
        if (this.bandAt(nc, nr, levels) !== band) continue;
        if (this.bandAt(nc, nr + side, levels) === band) continue;
        if (!this.edgeContinuous(c, nc, r, nr, band, levels)) continue;
        let score = Math.abs(dr) + (dr === lastDr ? 0 : 0.25);
        if (!Number.isNaN(want)) score += Math.abs(nr - want) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = dr;
        }
      }
      if (Number.isNaN(best)) break;
      c = nc;
      r += best;
      lastDr = best;
    }
  }

  pathQuality(rows) {
    let bends = 0;
    let zigzags = 0;
    let lastSign = 0;
    for (let i = 1; i < rows.length; i++) {
      const d = rows[i] - rows[i - 1];
      if (d === 0) continue;
      bends++;
      const sgn = d > 0 ? 1 : -1;
      if (lastSign && sgn !== lastSign) zigzags++;
      lastSign = sgn;
    }
    return { bends, zigzags };
  }

  stampPath(cols, rows, thick, side, out, band, levels) {
    out.length = 0;
    const W = this.cols;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const r = rows[i];
      out.push(r * W + c);
      const r2 = r - side;
      if (thick === 2 && r2 >= 0 && r2 < this.rows) out.push(r2 * W + c);
      if (band >= 0 && i > 0) {
        const pc = cols[i - 1];
        const pr = rows[i - 1];
        const lo = Math.min(pr, r) + 1;
        const hi = Math.max(pr, r) - 1;
        for (let k = lo; k <= hi; k++) {
          if (this.bandAt(pc, k, levels) === band) out.push(k * W + pc);
          else if (this.bandAt(c, k, levels) === band) out.push(k * W + c);
        }
      }
    }
  }

  snapToEdge(col, row, band, side, levels) {
    for (let d = 0; d <= 3; d++) {
      for (const r of d === 0 ? [row] : [row - d, row + d]) {
        if (this.bandAt(col, r, levels) === band && this.bandAt(col, r + side, levels) !== band) return r;
      }
    }
    return -1;
  }
}

/* ───────────── strips (port of spawnStrip + the per-frame strip pass) ───────────── */

class Strips {
  constructor(field, p, palN, seed) {
    this.f = field;
    this.p = p;
    this.palN = palN;
    this.rand = rng(seed);
    this.strips = [];
    this.acc = 0;
    this.levels = Math.round(p.levels);
    this.pal = new Uint8Array(field.cols * field.rows);
    this.env = new Float32Array(field.cols * field.rows);
  }

  /** Advance spawning by dt (Poisson-ish, like the engine's accumulator). */
  tick(dt, now, driftX, driftY) {
    this.acc += dt * this.p.stripRate * STRIP_RATE;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.spawn(now, driftX, driftY);
    }
  }

  spawn(now, driftX, driftY) {
    const f = this.f;
    const p = this.p;
    const levels = this.levels;
    const rand = this.rand;
    if (this.palN === 0 || f.cols < 8) return;
    const group = rand() < 0.4 ? 2 + (rand() < 0.4 ? 1 : 0) : 1;
    let seedCol = -1;
    let seedRow = -1;
    for (let g = 0; g < group; g++) {
      let col = -1, row = -1, band = -1;
      for (let attempt = 0; attempt < 14; attempt++) {
        const c = seedCol < 0 ? Math.floor(rand() * f.cols) : Math.max(0, Math.min(f.cols - 1, seedCol + Math.round((rand() - 0.5) * 40)));
        const r = seedRow < 0 ? Math.floor(rand() * f.rows) : Math.max(0, Math.min(f.rows - 1, seedRow + Math.round((rand() - 0.5) * 12)));
        const b = f.bandAt(c, r, levels);
        const edge = b !== f.bandAt(c, r - 1, levels) || b !== f.bandAt(c, r + 1, levels);
        if (b >= Math.max(2, levels - 3) && edge) {
          col = c; row = r; band = b;
          break;
        }
      }
      if (col < 0) return;
      seedCol = col;
      seedRow = row;
      const side = f.bandAt(col, row - 1, levels) !== band ? -1 : 1;
      const dir = rand() < 0.5 ? 1 : -1;
      const len = Math.round(p.stripMin + rand() * Math.max(0, p.stripMax - p.stripMin));
      const thick = rand() < 0.35 ? 2 : 1;
      const pc = [], pr = [];
      f.tracePath(col, row, band, side, dir, len, levels, null, pc, pr);
      if (pc.length < 4) continue;
      const q = f.pathQuality(pr);
      if (q.bends < 1 || q.zigzags > 1) continue;
      this.strips.push({
        ax: (col + 0.5) * f.cellW + driftX,
        ay: (row + 0.5) * f.cellH + driftY,
        band, side, dir, len, thick,
        pal: 1 + Math.floor(rand() * this.palN),
        t0: now,
        life: Math.max(0.2, p.stripLife) * (0.7 + rand() * 0.6),
        prevRows: pr.slice(),
      });
    }
  }

  /** Re-trace every live strip on the current field → per-cell palette/envelope. */
  render(now, driftX, driftY) {
    const f = this.f;
    const levels = this.levels;
    this.pal.fill(0);
    this.env.fill(0);
    const traced = [], pathC = [], pathR = [];
    for (let k = this.strips.length - 1; k >= 0; k--) {
      const st = this.strips[k];
      const u = (now - st.t0) / st.life;
      if (u >= 1) {
        this.strips.splice(k, 1);
        continue;
      }
      const col = Math.round((st.ax - driftX) / f.cellW - 0.5);
      const row0 = Math.round((st.ay - driftY) / f.cellH - 0.5);
      const row = f.snapToEdge(col, row0, st.band, st.side, levels);
      if (row < 0) {
        st.life = Math.min(st.life, now - st.t0 + 0.25);
      } else {
        st.ay = (row + 0.5) * f.cellH + driftY;
      }
      const env = Math.min(1, u * 4) * Math.min(1, (1 - u) * 2.5);
      traced.length = 0;
      if (row >= 0) {
        f.tracePath(col, row, st.band, st.side, st.dir, st.len, levels, st.prevRows, pathC, pathR);
        const q = f.pathQuality(pathR);
        if (q.zigzags > 2) st.life = Math.min(st.life, now - st.t0 + 0.25);
        st.prevRows = pathR.slice();
        const n = pathC.length;
        const grow = Math.min(1, u * 3.2);
        const shrink = u > 0.62 ? (u - 0.62) / 0.38 : 0;
        const from = Math.floor(n * shrink);
        const to = Math.ceil(n * grow);
        pathC.splice(to);
        pathR.splice(to);
        pathC.splice(0, Math.min(from, pathC.length));
        pathR.splice(0, Math.min(from, pathR.length));
        f.stampPath(pathC, pathR, st.thick, st.side, traced, st.band, levels);
      }
      for (let i = 0; i < traced.length; i++) {
        this.pal[traced[i]] = st.pal;
        this.env[traced[i]] = env;
      }
    }
  }
}

/* ───────────── frame → glyph grid ───────────── */

/**
 * Returns per-cell {glyph, band, pal, alpha} arrays for the current field state
 * (port of the banded branch of engine.draw()).
 */
function rasterise(field, p, cfg, strips) {
  const cols = field.cols, rows = field.rows;
  const levels = Math.round(p.levels);
  const gamma = p.levelGamma;
  const brightness = p.brightness;
  const ramp = cfg.chars.ramp;
  const rampN = ramp.length;
  const minD = 0.05;

  const glyph = new Array(cols * rows).fill(" ");
  const band = new Uint8Array(cols * rows);
  const pal = new Uint8Array(cols * rows);
  const alpha = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const v = field.dBuf[idx];
      let b = Math.round(v * levels);
      let d = b <= 0 ? 0 : Math.pow(b / levels, gamma) * brightness;
      const stripHere = strips.pal[idx];
      let kind = v > 0.02 ? 1 : 0;
      if ((kind === 0 || d < minD) && !stripHere) continue;
      if (stripHere && kind === 0) {
        kind = 1;
        b = Math.max(1, Math.round(levels * 0.5));
        d = 0.6;
      }
      const gi = levels <= rampN - 1 ? b : Math.round((b / levels) * (rampN - 1));
      const ch = ramp[Math.min(rampN - 1, Math.max(1, gi))];
      let dOut = d;
      let pk = 0;
      if (stripHere) {
        pk = stripHere;
        dOut = Math.max(d, 0.7 + 0.3 * strips.env[idx]);
      }
      glyph[idx] = ch;
      band[idx] = b;
      pal[idx] = pk;
      alpha[idx] = dOut;
    }
  }
  return { glyph, band, pal, alpha };
}

/* ───────────── SVG emit ───────────── */

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvg(frames, field, p, cfg, theme, palette, fontData, fps, seconds) {
  const levels = Math.round(p.levels);
  const gamma = p.levelGamma;
  const brightness = p.brightness;
  const { rampLo, rampHi } = cfg.colors;
  const cellW = field.cellW, cellH = field.cellH;
  const N = frames.length;
  const period = N / fps;

  // Per-band colour + opacity, exactly as the shader does it.
  let css = "";
  for (let b = 1; b <= levels; b++) {
    const d = Math.pow(b / levels, gamma) * brightness;
    const t = smoothstep(rampLo, rampHi, d);
    css += `.b${b}{fill:${mixHex(theme.lo, theme.hi, t)};fill-opacity:${d.toFixed(3)}}`;
  }
  // Accent palette (strips). Opacity tiers 0.70 → 1.00.
  for (let k = 1; k <= palette.length; k++) css += `.p${k}{fill:${palette[k - 1]}}`;
  for (let a = 7; a <= 10; a++) css += `.a${a}{fill-opacity:${(a / 10).toFixed(1)}}`;

  const fontFace = fontData
    ? `@font-face{font-family:"GM";src:url(data:font/woff2;base64,${fontData}) format("woff2")}`
    : "";
  const family = fontData ? `"GM",` : "";

  // Frame k is visible during [k/fps, (k+1)/fps) of each period.
  css += `text{dominant-baseline:central}`;
  css += `.f{visibility:hidden;animation:show ${period.toFixed(3)}s step-end infinite}`;
  css += `@keyframes show{0%{visibility:visible}${((100 / N)).toFixed(4)}%{visibility:hidden}100%{visibility:hidden}}`;
  css += `@media (prefers-reduced-motion:reduce){.f{animation:none}.f:first-child{visibility:visible}}`;

  let body = "";
  for (let k = 0; k < N; k++) {
    const fr = frames[k];
    body += `<g class="f" style="animation-delay:${(k / fps).toFixed(3)}s">`;
    for (let row = 0; row < field.rows; row++) {
      const y = (row + 0.5) * cellH; // cell centre; text{dominant-baseline:central} mirrors the atlas's textBaseline="middle"
      let line = "";
      let curClass = null;
      let run = "";
      let any = false;
      const flush = () => {
        if (!run) return;
        if (curClass === null) line += esc(run);
        else line += `<tspan class="${curClass}">${esc(run)}</tspan>`;
        run = "";
      };
      for (let col = 0; col < field.cols; col++) {
        const idx = row * field.cols + col;
        const g = fr.glyph[idx];
        let cls = null;
        if (g !== " ") {
          any = true;
          if (fr.pal[idx]) {
            const tier = Math.max(7, Math.min(10, Math.round(fr.alpha[idx] * 10)));
            cls = `p${fr.pal[idx]} a${tier}`;
          } else {
            cls = `b${fr.band[idx]}`;
          }
        }
        if (cls !== curClass) {
          flush();
          curClass = cls;
        }
        run += g;
      }
      flush();
      if (!any) continue;
      // Trim trailing spaces (they carry no ink).
      line = line.replace(/ +$/, "");
      body += `<text y="${y.toFixed(2)}">${line}</text>`;
    }
    body += `</g>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" ` +
    `font-family='${family}ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace' ` +
    `font-size="${FONT}" xml:space="preserve" role="img" aria-label="Animated ASCII topography">` +
    `<style>${fontFace}${css}</style>` +
    `<g>${body}</g></svg>`
  );
}

/* ───────────── main ───────────── */

const p = PRESETS[PRESET];
if (!p) {
  console.error(`unknown preset "${PRESET}"; one of ${Object.keys(PRESETS).join(", ")}`);
  process.exit(1);
}
const cfg = DEFAULT_CONFIG;
const field = new Field(WIDTH, HEIGHT, FONT, p, cfg);
const palN = Math.min(8, cfg.colors.palette.length);
const strips = new Strips(field, p, palN, SEED);

const N = Math.round(FPS * SECONDS);
const period = N / FPS;
const dt = 1 / FPS;
const dk = WIDTH / 1000;

console.log(`grid ${field.cols}×${field.rows} cells (${field.cellW.toFixed(2)}×${field.cellH.toFixed(2)} px), ${N} frames @ ${FPS} fps = ${period}s loop`);

// Two periods: strips warm up through the first, the second is emitted.
const frames = [];
for (let k = 0; k < 2 * N; k++) {
  const tLoop = (k % N) / FPS; // time within the period, identical in both passes
  const wB = BLEND > 0 ? smoothstep(period - BLEND, period, tLoop) : 0;
  field.evaluateLattice(tLoop, period, wB);
  field.evaluateCells();

  // Strip anchors live in "drift space"; drift advances linearly and continuously
  // across the seam (both blended fields drift at the same rate).
  const tAbs = k / FPS;
  const driftX = tAbs * p.driftX * dk;
  const driftY = tAbs * p.driftY * dk;
  strips.tick(dt, tAbs, driftX, driftY);
  strips.render(tAbs, driftX, driftY);

  if (k >= N) frames.push(rasterise(field, p, cfg, strips));
  if (k % 16 === 0) process.stdout.write(`\r  frame ${k + 1}/${2 * N}`);
}
process.stdout.write("\n");

if (PREVIEW) {
  const fr = frames[0];
  for (let row = 0; row < field.rows; row++) {
    let s = "";
    for (let col = 0; col < Math.min(field.cols, 160); col++) {
      const idx = row * field.cols + col;
      s += fr.pal[idx] ? `\x1b[38;2;163;230;53m${fr.glyph[idx]}\x1b[0m` : fr.glyph[idx];
    }
    console.log(s);
  }
}

const fontData = FONT_FILE ? readFileSync(FONT_FILE).toString("base64") : null;
mkdirSync(OUT, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  const palette = name === "light" ? LIGHT_PALETTE : cfg.colors.palette;
  const svg = buildSvg(frames, field, p, cfg, theme, palette, fontData, FPS, SECONDS);
  const file = resolve(OUT, `ascii-waveform-${name}.svg`);
  writeFileSync(file, svg);
  const tspans = (svg.match(/<tspan/g) || []).length;
  console.log(`wrote ${file}  ${(svg.length / 1024).toFixed(0)} KB, ${tspans} tspans`);
}
