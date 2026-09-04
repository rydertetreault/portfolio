/**
 * Offline port of `src/components/ascii-field/engine.ts` (the homepage ASCII
 * plasma / topography field) for baking frames into an SVG.
 *
 * Imports the real `noise.ts`, `presets.ts` and `config.ts`, and mirrors the
 * engine's passes: lattice (domain-warped fbm + plasma sines) → bilinear cells →
 * threshold + upper-left shading → elevation bands → glyph per band, plus the
 * readability ("quiet") mask and the lime accent strips that ride the contours.
 * Cursor, route transitions and adaptive quality are omitted.
 *
 * Looping: `bakeFrames` cross-blends the field with itself one period earlier
 * over the final `blend` seconds (variance-compensated, before quantisation) so
 * the last frame wraps to the first with no cut. Strips run for two periods with
 * a periodic spawn schedule; the second period is emitted.
 */

import { Simplex3 } from "../../src/components/ascii-field/noise.ts";
import { PRESETS } from "../../src/components/ascii-field/presets.ts";
import { DEFAULT_CONFIG } from "../../src/components/ascii-field/config.ts";

export { PRESETS, DEFAULT_CONFIG };

export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Deterministic xorshift RNG so a given seed always bakes the same SVG. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const TRACE_MAX_JUMP = 4;

/* ───────────── field ───────────── */

export class Field {
  /**
   * @param quietRects [x0,y0,x1,y1,strength, ...] in px; the field is dimmed to
   *        `1 - quiet*strength` inside (feathered), like `data-ascii-quiet` elements.
   */
  constructor(w, h, fontSize, p, cfg, quietRects = [], quietZone = null) {
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
    this.qMask = new Float32Array(n);
    const ln = this.lcols * this.lrows;
    this.latN = new Float32Array(ln);
    this.latH = new Float32Array(ln);
    this.latNear = new Float32Array(ln);
    this.tmpN = new Float32Array(ln);
    this.tmpH = new Float32Array(ln);
    this.quietZone = quietZone;
    this.buildQuietMask(quietRects, p.quiet);
  }

  /** Port of engine.buildQuietMask: separable feathered rects → per-cell multiplier. */
  buildQuietMask(rects, quiet) {
    const q = this.qMask;
    const nR = Math.floor(rects.length / 5);
    if (quiet < 0.001 || nR === 0) {
      q.fill(1);
      return;
    }
    const { cols, rows, cellW: cw, cellH: ch } = this;
    const pad = (this.quietZone ?? this.cfg.quietZone).padding;
    const feather = Math.max(1, (this.quietZone ?? this.cfg.quietZone).feather);
    const qCol = new Float32Array(nR * cols);
    const qRow = new Float32Array(nR * rows);
    for (let r = 0; r < nR; r++) {
      const x0 = rects[r * 5] - pad;
      const y0 = rects[r * 5 + 1] - pad;
      const x1 = rects[r * 5 + 2] + pad;
      const y1 = rects[r * 5 + 3] + pad;
      const strength = rects[r * 5 + 4];
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * cw;
        qCol[r * cols + col] =
          cx <= x0 - feather || cx >= x1 + feather
            ? 0
            : strength * Math.min(smoothstep(x0 - feather, x0, cx), 1 - smoothstep(x1, x1 + feather, cx));
      }
      for (let row = 0; row < rows; row++) {
        const cy = (row + 0.5) * ch;
        qRow[r * rows + row] =
          cy <= y0 - feather || cy >= y1 + feather
            ? 0
            : Math.min(smoothstep(y0 - feather, y0, cy), 1 - smoothstep(y1, y1 + feather, cy));
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let m = 0;
        for (let r = 0; r < nR; r++) {
          const fy = qRow[r * rows + row];
          if (fy === 0) continue;
          const v = fy * qCol[r * cols + col];
          if (v > m) m = v;
        }
        q[row * cols + col] = 1 - quiet * m;
      }
    }
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

  /** Near-density lattice at `time`, blended with `time - period` by `wB` (0 = none). */
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
    const { cols, rows, lcols } = this;
    const invStep = 1 / this.step;
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

export class Strips {
  constructor(field, p, palN, seed, rateMul = 1) {
    this.f = field;
    this.p = p;
    this.palN = palN;
    this.rateMul = rateMul;
    this.rand = rng(seed);
    this.strips = [];
    this.acc = 0;
    this.levels = Math.round(p.levels);
    this.pal = new Uint8Array(field.cols * field.rows);
    this.env = new Float32Array(field.cols * field.rows);
  }

  tick(dt, now, driftX, driftY) {
    this.acc += dt * this.p.stripRate * this.rateMul;
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
        // Keep accents off the dimmed panels so they never sit behind text.
        if (f.qMask[r * f.cols + c] < 0.6) continue;
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
        if (f.qMask[traced[i]] < 0.6) continue; // never over text
        this.pal[traced[i]] = st.pal;
        this.env[traced[i]] = env;
      }
    }
  }
}

/* ───────────── frame → glyph grid (banded branch of engine.draw) ───────────── */

export function rasterise(field, p, cfg, strips) {
  const { cols, rows } = field;
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
  const quiet = new Uint8Array(cols * rows); // 0 = full, 1..9 = dimmed tier (qm*10)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const v = field.dBuf[idx];
      const qm = field.qMask[idx];
      let b = Math.round(v * levels);
      let d = b <= 0 ? 0 : Math.pow(b / levels, gamma) * brightness * qm;
      const stripHere = strips.pal[idx];
      let kind = v > 0.02 ? 1 : 0;
      if ((kind === 0 || d < minD) && !stripHere) continue;
      if (stripHere && kind === 0) {
        kind = 1;
        b = Math.max(1, Math.round(levels * 0.5));
        d = 0.6;
      }
      const gi = levels <= rampN - 1 ? b : Math.round((b / levels) * (rampN - 1));
      glyph[idx] = ramp[Math.min(rampN - 1, Math.max(1, gi))];
      band[idx] = b;
      if (stripHere) {
        pal[idx] = stripHere;
        alpha[idx] = Math.max(d, 0.7 + 0.3 * strips.env[idx]);
      } else {
        alpha[idx] = d;
        // Quiet tier: 0 = undimmed; 1–2 = deep dim (merged classes); feather → even tiers 4/6/8.
        const t10 = Math.round(qm * 10);
        quiet[idx] = t10 >= 10 ? 0 : t10 <= 2 ? Math.max(1, t10) : Math.min(8, Math.max(4, Math.round(t10 / 2) * 2));
      }
    }
  }
  return { glyph, band, pal, alpha, quiet };
}

/* ───────────── loop baker ───────────── */

/**
 * Simulate the field and return the frames of one seamless period.
 * @returns {{ frames: object[], field: Field, p: object, cfg: object, fps: number }}
 */
export function bakeFrames({ width, height, fontSize, fps, seconds, blend, seed, stripRate = 1, preset = "hero", quietRects = [], quiet = null, quietZone = null, log = () => {} }) {
  const base = PRESETS[preset];
  if (!base) throw new Error(`unknown preset "${preset}"; one of ${Object.keys(PRESETS).join(", ")}`);
  const p = quiet === null ? base : { ...base, quiet };
  const cfg = DEFAULT_CONFIG;
  const field = new Field(width, height, fontSize, p, cfg, quietRects, quietZone);
  const palN = Math.min(8, cfg.colors.palette.length);
  const strips = new Strips(field, p, palN, seed, stripRate);

  const N = Math.round(fps * seconds);
  const period = N / fps;
  const dt = 1 / fps;
  const dk = width / 1000;
  log(`grid ${field.cols}×${field.rows} cells (${field.cellW.toFixed(2)}×${field.cellH.toFixed(2)} px), ${N} frames @ ${fps} fps = ${period}s loop`);

  const frames = [];
  for (let k = 0; k < 2 * N; k++) {
    const tLoop = (k % N) / fps;
    const wB = blend > 0 ? smoothstep(period - blend, period, tLoop) : 0;
    field.evaluateLattice(tLoop, period, wB);
    field.evaluateCells();

    const tAbs = k / fps;
    const driftX = tAbs * p.driftX * dk;
    const driftY = tAbs * p.driftY * dk;
    strips.tick(dt, tAbs, driftX, driftY);
    strips.render(tAbs, driftX, driftY);

    if (k >= N) frames.push(rasterise(field, p, cfg, strips));
    if (k % 16 === 0) log(`\r  frame ${k + 1}/${2 * N}`, true);
  }
  log("\n", true);
  return { frames, field, p, cfg, fps };
}
