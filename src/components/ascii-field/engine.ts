/**
 * ─────────────────────────────────────────────────────────────
 *  ASCII cyber clouds engine (framework-agnostic, single <canvas>)
 *
 *  Per frame:
 *    1. Ease current params toward the target preset.
 *    2. Lattice pass: evaluate two cloud layers (near = domain-
 *       warped fbm, far = plain fbm) on a coarse lattice, with the
 *       cursor pushing the sample coordinates outward.
 *    3. Cell pass: bilinearly interpolate the lattice to every
 *       grid cell, combine layers, apply volumetric shading from
 *       the local density gradient, quiet zone, cursor glow.
 *    4. Draw pass: map brightness → glyph on the ramp (with
 *       per-cell jitter), sprinkle directional texture glyphs, and
 *       hand every cell to the renderer (WebGL2 instanced quads in
 *       one draw call; Canvas 2D atlas blits as fallback).
 *
 *  No DOM nodes per cell, no fillText per frame; 60 FPS on desktop.
 * ─────────────────────────────────────────────────────────────
 */

import { Simplex3, hash2 } from "./noise";
import { DEFAULT_CONFIG, type AsciiFieldConfig } from "./config";
import { PRESETS, lerpParams, type FieldParams } from "./presets";
import { WebGLRenderer, Canvas2DRenderer, type GlyphRenderer } from "./renderer";

const KIND_NONE = 0;
const KIND_CLOUD = 1;
const KIND_POINTER = 2;

/**
 * Transition effects:
 *  cover    – a dense cloud front sweeps across and buries the screen (holds covered)
 *  reveal   – the front sweeps again, uncovering the (new) page behind it
 *  collapse – CRT-style: the field squashes to a bright centre line, then a dot (holds)
 *  expand   – the reverse of collapse
 */
export type FxKind = "cover" | "reveal" | "collapse" | "expand";

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export type EngineOptions = {
  config?: Partial<AsciiFieldConfig>;
  fontFamily?: string;
  /** Static mode: render one frame and never animate (prefers-reduced-motion). */
  staticMode?: boolean;
  seed?: number;
  /** Force the Canvas 2D path (default: WebGL2 when available). */
  forceCanvas2D?: boolean;
};

export class AsciiFieldEngine {
  readonly cfg: AsciiFieldConfig;

  private canvas: HTMLCanvasElement;
  private renderer: GlyphRenderer;
  /** Optional opaque backdrop (page-background-coloured cells) drawn under cover/collapse FX. */
  private backdrop: GlyphRenderer | null = null;
  private backdropCanvas: HTMLCanvasElement | null = null;
  private bgColor = "#050505";
  private measure: CanvasRenderingContext2D;
  private noise: Simplex3;
  private fontFamily: string;
  private staticMode: boolean;

  // Grid / device metrics
  private w = 0;
  private h = 0;
  private dpr = 1;
  private cols = 0;
  private rows = 0;
  private cellW = 7; // CSS px
  private cellH = 13;
  private cellWd = 7; // device px (integers → crisp blits)
  private cellHd = 13;
  private isMobile = false;
  private octaves = 3;
  private maxFps = 0;

  // Lattice (coarse noise samples)
  private step = 2;
  private lcols = 0;
  private lrows = 0;
  private latNear = new Float32Array(0);
  private latFar = new Float32Array(0);

  // Glyph atlas (white glyphs, one row; renderers colour/tier it themselves)
  private atlas: HTMLCanvasElement | null = null;
  private atlasChars = "";
  private charIndex = new Map<string, number>();
  private loColor = "#7a7a7a";
  private hiColor = "#ffffff";
  /** Theme-level opacity multiplier on preset brightness (light mode needs more). */
  private gain = 1;

  // Cell buffers
  private nBuf = new Float32Array(0); // near density (pre-shading) for gradients
  private dBuf = new Float32Array(0); // raw density (0..1); alpha is derived in the draw pass
  private kindBuf = new Uint8Array(0);
  private charBuf = new Uint8Array(0);
  private qMask = new Float32Array(0); // per-cell readability multiplier (1 = untouched)
  private qCol = new Float32Array(0); // scratch: per-rect column feather
  private qRow = new Float32Array(0); // scratch: per-rect row feather

  // Animation state
  private raf = 0;
  private running = false;
  private lastTs = 0;
  private lastDraw = 0;
  private time = 0;
  private driftX = 0;
  private driftY = 0;
  private farDrift = 0;
  private scrollY = 0;

  // Adaptive quality (0 = full … 3 = lowest)
  private qualityLevel = 0;
  private workEma = 0;
  private slowFrames = 0;

  private cur: FieldParams = { ...PRESETS.hero };
  private target: FieldParams = { ...PRESETS.hero };

  // Pointer
  private pointerX = -9999;
  private pointerY = -9999;
  private pointerTx = -9999;
  private pointerTy = -9999;
  private pointerStrength = 0;
  private pointerLastMove = -Infinity;
  private pointerSeen = false;

  // Navigation pulses: expanding rings, flat [x, y, startTime, ...]
  private pulses: number[] = [];

  // Accent strips: short coloured runs that ride a contour of the field. Each is anchored
  // in field (world) space and re-traced every frame, so it moves and bends with the terrain.
  private strips: {
    ax: number; // anchor x in world px (screen x + drift at spawn)
    ay: number;
    band: number;
    side: -1 | 1;
    dir: -1 | 1;
    len: number;
    thick: number;
    pal: number;
    t0: number;
    life: number;
    /** last frame's traced rows (per step) → hysteresis so the path doesn't flicker */
    prevRows: number[];
  }[] = [];
  private cursorPrev: [number[], number[]] = [[], []];
  private stripSpawnAcc = 0;
  private stripPal = new Uint8Array(0); // per-cell palette index for this frame (0 = none)
  private stripEnv = new Float32Array(0); // per-cell fade envelope for this frame

  // Transition effects (page navigation choreography)
  private fx: { kind: FxKind; t0: number; dur: number; dir: 1 | -1; resolve: () => void } | null = null;
  private coverHold = false; // fully covered (between "cover" and "reveal")
  private collapseHold = false; // collapsed to a line (between "collapse" and "expand")
  private glitchUntil = 0;
  private frameSeed = 0;
  private rowShift = new Int16Array(0);

  // Quiet zones: rectangles (CSS px) around text that must stay readable
  private quietRects: number[] = []; // flat [x0, y0, x1, y1, strength, ...]

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions = {}) {
    this.canvas = canvas;
    this.cfg = {
      ...DEFAULT_CONFIG,
      ...opts.config,
      chars: { ...DEFAULT_CONFIG.chars, ...opts.config?.chars },
      cell: { ...DEFAULT_CONFIG.cell, ...opts.config?.cell },
      pointer: { ...DEFAULT_CONFIG.pointer, ...opts.config?.pointer },
      colors: { ...DEFAULT_CONFIG.colors, ...opts.config?.colors },
      perf: { ...DEFAULT_CONFIG.perf, ...opts.config?.perf },
      mobile: { ...DEFAULT_CONFIG.mobile, ...opts.config?.mobile },
    };
    this.fontFamily = opts.fontFamily ?? "ui-monospace, Menlo, Consolas, monospace";
    this.staticMode = !!opts.staticMode;
    this.noise = new Simplex3(opts.seed ?? 20240917);
    this.measure = document.createElement("canvas").getContext("2d")!;

    const gl = opts.forceCanvas2D ? null : WebGLRenderer.create(canvas);
    if (gl) {
      gl.onRestore = () => {
        this.buildAtlas();
        if (this.staticMode) this.renderStatic();
      };
      this.renderer = gl;
    } else {
      const c2d = Canvas2DRenderer.create(canvas, this.cfg.alphaTiers);
      if (!c2d) throw new Error("AsciiFieldEngine: no canvas context available");
      this.renderer = c2d;
    }
    this.resize();
  }

  /** Which backend is in use ("webgl" | "canvas2d"). */
  get backend(): GlyphRenderer["kind"] {
    return this.renderer.kind;
  }

  /* ───────────── public API ───────────── */

  /** Ease toward a new parameter set. */
  setParams(p: FieldParams): void {
    this.target = p;
    if (this.staticMode) {
      this.cur = { ...p };
      this.renderStatic();
    }
  }

  /** Jump immediately (first mount). */
  setParamsImmediate(p: FieldParams): void {
    this.target = p;
    this.cur = { ...p };
    if (this.staticMode) this.renderStatic();
  }

  /** Theme brightness gain (from the `--ascii-gain` CSS variable); clamped to [0.25, 3]. */
  setGain(gain: number): void {
    const g = Number.isFinite(gain) ? Math.min(3, Math.max(0.25, gain)) : 1;
    if (g === this.gain) return;
    this.gain = g;
    if (this.staticMode) this.renderStatic();
  }

  /** Glyph colours: `lo` for faint lowlands, `hi` for dense peaks. */
  setColors(lo: string, hi: string): void {
    if (lo === this.loColor && hi === this.hiColor && this.atlas) return;
    this.loColor = lo;
    this.hiColor = hi;
    this.renderer.setColors(lo, hi, this.cfg.colors.rampLo, this.cfg.colors.rampHi);
    if (this.staticMode) this.renderStatic();
  }

  setFontFamily(family: string): void {
    if (family === this.fontFamily) return;
    this.fontFamily = family;
    this.resize();
  }

  setPointer(x: number, y: number): void {
    if (!this.pointerSeen) {
      this.pointerX = x;
      this.pointerY = y;
      this.pointerSeen = true;
    }
    this.pointerTx = x;
    this.pointerTy = y;
    this.pointerLastMove = performance.now();
  }

  clearPointer(): void {
    this.pointerLastMove = -Infinity;
  }

  /**
   * Fire an ASCII shockwave from (x, y) in CSS px: an expanding ring that lifts the
   * terrain into the top bands as it sweeps through, then fades. Used on navigation.
   */
  pulse(x: number, y: number): void {
    if (this.staticMode) return;
    this.pulses.push(x, y, performance.now());
    if (this.pulses.length > 12) this.pulses.splice(0, 3);
  }

  /**
   * Start a transition effect. Resolves when it completes. `dir` is the sweep
   * direction for cover/reveal (1 = left→right, -1 = right→left).
   */
  startFx(kind: FxKind, durationMs: number, dir: 1 | -1 = 1): Promise<void> {
    if (this.staticMode) {
      if (kind === "cover") this.coverHold = true;
      if (kind === "reveal") this.coverHold = false;
      if (kind === "collapse") this.collapseHold = true;
      if (kind === "expand") this.collapseHold = false;
      this.renderStatic();
      return Promise.resolve();
    }
    this.fx?.resolve();
    return new Promise((resolve) => {
      this.fx = { kind, t0: performance.now(), dur: Math.max(16, durationMs), dir, resolve };
    });
  }

  /** Immediately clear any transition state (cover/collapse holds). */
  resetFx(): void {
    this.fx?.resolve();
    this.fx = null;
    this.coverHold = false;
    this.collapseHold = false;
    this.glitchUntil = 0;
  }

  /**
   * Attach a second canvas (same size, stacked just below this one when lifted to the
   * front) that receives solid page-background cells behind the cover / collapse FX,
   * so the old page is fully hidden even between glyph pixels.
   */
  attachBackdrop(canvas: HTMLCanvasElement | null, bgColor?: string): void {
    this.backdrop?.destroy();
    this.backdrop = null;
    this.backdropCanvas = canvas;
    if (bgColor) this.bgColor = bgColor;
    if (!canvas) return;
    this.backdrop =
      (this.renderer.kind === "webgl" ? WebGLRenderer.create(canvas) : null) ??
      Canvas2DRenderer.create(canvas, 8);
    this.syncBackdrop();
  }

  setBackdropColor(bg: string): void {
    this.bgColor = bg;
    this.backdrop?.setColors(bg, bg, 0, 1);
  }

  private syncBackdrop(): void {
    const b = this.backdrop;
    const c = this.backdropCanvas;
    if (!b || !c) return;
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    b.resize(c.width, c.height);
    const a = document.createElement("canvas");
    a.width = this.cellWd;
    a.height = this.cellHd;
    const g = a.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, a.width, a.height);
    b.setAtlas(a, this.cellWd, this.cellHd, 1);
    b.setColors(this.bgColor, this.bgColor, 0, 1);
  }

  /** Row-tear glitch for `durationMs` (random rows shift sideways and flare). */
  glitch(durationMs: number): void {
    this.glitchUntil = performance.now() + durationMs;
  }

  /** Scroll offset (px). Advances the animation so scrolling morphs the clouds. */
  setScroll(y: number): void {
    this.scrollY = y;
  }

  /**
   * Rectangles (CSS px, flat [x0, y0, x1, y1, strength, …]) around text that must stay
   * readable. `strength` (0..1) scales the preset's `quiet` for that rectangle.
   */
  setQuietRects(rects: number[]): void {
    this.quietRects = rects;
    if (this.staticMode) this.renderStatic();
  }

  start(): void {
    if (this.running) return;
    if (this.staticMode) {
      this.renderStatic();
      return;
    }
    this.running = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy(): void {
    this.stop();
    this.atlas = null;
    this.renderer.destroy();
  }

  /** Current adaptive quality level (0 = full quality). */
  get quality(): number {
    return this.qualityLevel;
  }

  /** Recompute grid/lattice/atlas for the current canvas size + DPR. Safe to call often. */
  resize(): void {
    const cfg = this.cfg;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.isMobile =
      w < cfg.mobile.breakpoint ||
      (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches && w < 1024);

    const q = this.qualityLevel;
    let maxDpr = this.isMobile ? cfg.mobile.maxDevicePixelRatio : cfg.perf.maxDevicePixelRatio;
    if (q >= 1) maxDpr = Math.min(maxDpr, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let fontSize = this.isMobile ? cfg.mobile.fontSize : cfg.cell.fontSize;
    if (q >= 2) fontSize = Math.round(fontSize * 1.3);
    const lineHeight = this.isMobile ? cfg.mobile.lineHeight : cfg.cell.lineHeight;
    this.octaves = Math.max(2, (this.isMobile ? cfg.mobile.octaves : cfg.perf.octaves) - (q >= 2 ? 1 : 0));
    this.maxFps = this.isMobile ? cfg.mobile.maxFps : cfg.perf.maxFps;
    if (q >= 3) this.maxFps = this.maxFps > 0 ? Math.min(this.maxFps, 30) : 30;
    this.step = Math.max(1, Math.round(cfg.perf.latticeStep));

    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.renderer.resize(this.canvas.width, this.canvas.height);

    this.measure.font = `${fontSize * dpr}px ${this.fontFamily}`;
    const adv = this.measure.measureText("M").width / dpr || fontSize * 0.6;
    this.cellWd = Math.max(1, Math.round(adv * cfg.cell.widthScale * dpr));
    this.cellHd = Math.max(1, Math.round(fontSize * lineHeight * dpr));
    this.cellW = this.cellWd / dpr;
    this.cellH = this.cellHd / dpr;

    this.cols = Math.ceil(this.canvas.width / this.cellWd);
    this.rows = Math.ceil(this.canvas.height / this.cellHd);
    this.lcols = Math.ceil(this.cols / this.step) + 1;
    this.lrows = Math.ceil(this.rows / this.step) + 1;

    const n = this.cols * this.rows;
    if (this.nBuf.length !== n) {
      this.nBuf = new Float32Array(n);
      this.dBuf = new Float32Array(n);
      this.kindBuf = new Uint8Array(n);
      this.charBuf = new Uint8Array(n);
    }
    const ln = this.lcols * this.lrows;
    if (this.latNear.length !== ln) {
      this.latNear = new Float32Array(ln);
      this.latFar = new Float32Array(ln);
    }
    if (this.qMask.length !== n) this.qMask = new Float32Array(n);

    this.buildAtlas(fontSize);
    if (this.staticMode) this.renderStatic();
  }

  /* ───────────── glyph atlas ───────────── */

  private buildAtlas(fontSizeOverride?: number): void {
    const cfg = this.cfg;
    const fontSize =
      fontSizeOverride ?? (this.isMobile ? cfg.mobile.fontSize : cfg.cell.fontSize);
    const c = cfg.chars;
    const all = new Set<string>();
    for (const s of [c.ramp, c.flow.join(""), c.pointer.join("")]) {
      for (const ch of s) if (ch !== " ") all.add(ch);
    }
    this.atlasChars = Array.from(all).join("");
    this.charIndex.clear();
    for (let i = 0; i < this.atlasChars.length; i++) this.charIndex.set(this.atlasChars[i], i);

    const a = document.createElement("canvas");
    a.width = Math.max(1, this.atlasChars.length * this.cellWd);
    a.height = Math.max(1, this.cellHd);
    const g = a.getContext("2d")!;
    g.font = `${fontSize * this.dpr}px ${this.fontFamily}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#fff";
    for (let i = 0; i < this.atlasChars.length; i++) {
      g.fillText(this.atlasChars[i], i * this.cellWd + this.cellWd / 2, this.cellHd / 2);
    }
    this.atlas = a;
    this.renderer.setAtlas(a, this.cellWd, this.cellHd, this.atlasChars.length);
    this.renderer.setColors(this.loColor, this.hiColor, this.cfg.colors.rampLo, this.cfg.colors.rampHi);
    this.renderer.setPalette(this.cfg.colors.palette);
    this.syncBackdrop();
  }

  /* ───────────── frame loop ───────────── */

  private loop = (ts: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);

    if (this.maxFps > 0 && ts - this.lastDraw < 1000 / this.maxFps - 0.5) return;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    this.lastDraw = ts;

    const t0 = performance.now();
    this.update(dt, ts);
    this.draw();
    this.trackWork(performance.now() - t0);
  };

  /** Adaptive quality: step down if we consistently blow the frame budget. */
  private trackWork(ms: number): void {
    const perf = this.cfg.perf;
    if (!perf.adaptive || this.qualityLevel >= 3) return;
    this.workEma = this.workEma === 0 ? ms : this.workEma * 0.9 + ms * 0.1;
    if (this.workEma > perf.budgetMs) {
      if (++this.slowFrames > 60) {
        this.qualityLevel++;
        this.slowFrames = 0;
        this.workEma = 0;
        this.resize();
      }
    } else {
      this.slowFrames = 0;
    }
  }

  private renderStatic(): void {
    if (!this.atlas) return;
    this.pointerStrength = 0;
    this.draw();
  }

  private update(dt: number, now: number): void {
    const cfg = this.cfg;
    const k = 1 - Math.exp(-dt * cfg.paramSmoothing);
    this.cur = lerpParams(this.cur, this.target, k);

    const p = this.cur;
    this.time += dt * cfg.timeScale;
    const wk = this.w / 1000; // drift is authored in px/s at a 1000px-wide viewport
    this.driftX += dt * p.driftX * wk;
    this.driftY += dt * p.driftY * wk;
    this.farDrift += dt * p.farDrift * wk;

    // Accent strips: Poisson-ish spawning, placed on a high band so they ride a contour.
    if (p.stripRate > 0 && this.cols > 0) {
      this.stripSpawnAcc += dt * p.stripRate;
      while (this.stripSpawnAcc >= 1) {
        this.stripSpawnAcc -= 1;
        this.spawnStrip();
      }
    }

    const pk = 1 - Math.exp(-dt * cfg.pointer.smoothing);
    this.pointerX += (this.pointerTx - this.pointerX) * pk;
    this.pointerY += (this.pointerTy - this.pointerY) * pk;
    const idle = (now - this.pointerLastMove) / 1000;
    const want = idle < cfg.pointer.idleFade ? 1 : 0;
    this.pointerStrength += (want - this.pointerStrength) * (1 - Math.exp(-dt * 3));
  }

  private bandAt(col: number, row: number, levels: number): number {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return -1;
    const v = this.dBuf[row * this.cols + col];
    return levels > 0 ? Math.round(v * levels) : v > 0.5 ? 1 : 0;
  }

  /**
   * Walk along the edge of `band` starting at (col,row): at each step pick the
   * neighbouring row that stays on the band boundary, so the path follows the
   * contour line. `prev` (last frame's rows per step) adds hysteresis so the path
   * only moves when the contour does. The result is median-smoothed to remove
   * single-cell jaggies. Returns the path as parallel col/row arrays.
   */
  private tracePath(
    col: number,
    row: number,
    band: number,
    side: -1 | 1,
    dir: -1 | 1,
    len: number,
    levels: number,
    prev: number[] | null,
    outCols: number[],
    outRows: number[],
  ): void {
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
      let best = 0;
      let bestScore = Infinity;
      const want = prev && prev.length > i + 1 ? prev[i + 1] : Number.NaN;
      for (let dr = -1; dr <= 1; dr++) {
        const b = this.bandAt(nc, r + dr, levels);
        if (b < 0) continue;
        const onEdge = this.bandAt(nc, r + dr + side, levels) !== band;
        let score = Math.abs(b - band) * 10 + (onEdge ? 0 : 4) + (dr === lastDr ? 0 : 0.6) + hash2(nc, r + dr) * 0.3;
        if (!Number.isNaN(want)) score += Math.abs(r + dr - want) * 2.5; // stick to last frame's path
        if (score < bestScore) {
          bestScore = score;
          best = dr;
        }
      }
      if (bestScore >= 20) break; // contour ended
      c = nc;
      r += best;
      lastDr = best;
    }
    // Median-of-3 on the rows: removes one-cell spikes without moving the curve.
    if (outRows.length >= 3) {
      const src = outRows.slice();
      for (let i = 1; i < src.length - 1; i++) {
        const a = src[i - 1];
        const b = src[i];
        const cc = src[i + 1];
        outRows[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), cc));
      }
    }
  }

  /** Path quality: how many bends it has and how often it reverses (zigzags). */
  private pathQuality(rows: number[]): { bends: number; zigzags: number } {
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

  /** Materialise a path into cell indices (optionally two cells thick). */
  private stampPath(cols: number[], rows: number[], thick: number, side: -1 | 1, out: number[]): void {
    out.length = 0;
    for (let i = 0; i < cols.length; i++) {
      out.push(rows[i] * this.cols + cols[i]);
      const r2 = rows[i] - side;
      if (thick === 2 && r2 >= 0 && r2 < this.rows) out.push(r2 * this.cols + cols[i]);
    }
  }

  /** Find the edge cell of `band` closest to (col,row) within a few rows, or -1. */
  private snapToEdge(col: number, row: number, band: number, side: -1 | 1, levels: number): number {
    for (let d = 0; d <= 3; d++) {
      for (const r of d === 0 ? [row] : [row - d, row + d]) {
        if (this.bandAt(col, r, levels) === band && this.bandAt(col, r + side, levels) !== band) return r;
      }
    }
    return -1;
  }

  /**
   * Spawn one (sometimes a small cluster of) accent strips on an upper band edge.
   * Lengths and thicknesses vary; the strip is stored as a world-space anchor.
   */
  private spawnStrip(): void {
    const p = this.cur;
    const levels = Math.round(p.levels);
    const palN = Math.min(8, this.cfg.colors.palette.length);
    if (palN === 0 || this.cols < 8) return;
    const group = Math.random() < 0.4 ? 2 + (Math.random() < 0.4 ? 1 : 0) : 1; // occasional clusters of 2–3
    let seedCol = -1;
    let seedRow = -1;
    for (let g = 0; g < group; g++) {
      let col = -1;
      let row = -1;
      let band = -1;
      for (let attempt = 0; attempt < 14; attempt++) {
        const c =
          seedCol < 0
            ? Math.floor(Math.random() * this.cols)
            : Math.max(0, Math.min(this.cols - 1, seedCol + Math.round((Math.random() - 0.5) * 40)));
        const r =
          seedRow < 0
            ? Math.floor(Math.random() * this.rows)
            : Math.max(0, Math.min(this.rows - 1, seedRow + Math.round((Math.random() - 0.5) * 12)));
        const b = this.bandAt(c, r, levels);
        const edge = b !== this.bandAt(c, r - 1, levels) || b !== this.bandAt(c, r + 1, levels);
        if (b >= Math.max(2, levels - 3) && edge) {
          col = c;
          row = r;
          band = b;
          break;
        }
      }
      if (col < 0) return;
      seedCol = col;
      seedRow = row;
      const side: -1 | 1 = this.bandAt(col, row - 1, levels) !== band ? -1 : 1;
      const dir: -1 | 1 = Math.random() < 0.5 ? 1 : -1;
      const len = Math.round(p.stripMin + Math.random() * Math.max(0, p.stripMax - p.stripMin));
      const thick = Math.random() < 0.35 ? 2 : 1;
      const pc: number[] = [];
      const pr: number[] = [];
      this.tracePath(col, row, band, side, dir, len, levels, null, pc, pr);
      if (pc.length < 4) continue;
      // Only accent smooth, curved edges: at least one bend, and (almost) no zigzag.
      const q = this.pathQuality(pr);
      if (q.bends < 1 || q.zigzags > 1) continue;
      this.strips.push({
        ax: (col + 0.5) * this.cellW + this.driftX,
        ay: (row + 0.5) * this.cellH + this.driftY,
        band,
        side,
        dir,
        len,
        thick,
        pal: 1 + Math.floor(Math.random() * palN),
        t0: performance.now(),
        life: Math.max(0.2, p.stripLife) * (0.7 + Math.random() * 0.6) * 1000,
        prevRows: pr.slice(),
      });
    }
  }

  /* ───────────── pass: readability mask (per cell) ───────────── */

  private buildQuietMask(quiet: number): void {
    const cols = this.cols;
    const rows = this.rows;
    const q = this.qMask;
    const rects = this.quietRects;
    const nR = Math.floor(rects.length / 5);
    if (quiet < 0.001 || nR === 0) {
      q.fill(1);
      return;
    }
    const cw = this.cellW;
    const ch = this.cellH;
    const pad = this.cfg.quietZone.padding;
    const feather = Math.max(1, this.cfg.quietZone.feather);

    // Per-rect separable feathers → per cell m = max_r (fx[r][col] * fy[r][row]).
    if (this.qCol.length < nR * cols) this.qCol = new Float32Array(nR * cols);
    if (this.qRow.length < nR * rows) this.qRow = new Float32Array(nR * rows);
    const qCol = this.qCol;
    const qRow = this.qRow;
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
      const rowIdx = row * cols;
      for (let col = 0; col < cols; col++) {
        let m = 0;
        for (let r = 0; r < nR; r++) {
          const fy = qRow[r * rows + row];
          if (fy === 0) continue;
          const v = fy * qCol[r * cols + col];
          if (v > m) m = v;
        }
        q[rowIdx + col] = 1 - quiet * m;
      }
    }
  }

  /* ───────────── pass: lattice noise (coarse) ───────────── */

  private evaluateLattice(time: number): void {
    const cfg = this.cfg;
    const p = this.cur;
    const noise = this.noise;
    const octaves = this.octaves;
    const step = this.step;
    const lcols = this.lcols;
    const lrows = this.lrows;
    const cw = this.cellW;
    const ch = this.cellH;
    const latNear = this.latNear;
    const latFar = this.latFar;

    // Cursor parallax shifts the whole field slightly.
    const ps = this.pointerStrength;
    const hasPointer = this.pointerSeen;
    const parX = hasPointer ? (this.pointerX - this.w / 2) * p.parallax * ps : 0;
    const parY = hasPointer ? (this.pointerY - this.h / 2) * p.parallax * ps : 0;

    const offX = this.driftX - parX;
    const offY = this.driftY - parY;
    const wk = 1000 / Math.max(1, this.w); // frequencies are authored at a 1000px-wide viewport
    const s = p.scale * wk;
    const warpAmt = p.warp / Math.max(1e-6, s); // in px so warp scales with feature size
    const tNear = time * p.speed;
    const tFar = time * p.speed * 0.6;
    const fs = p.farScale * wk;
    const farOff = this.farDrift;

    const mx = this.pointerX;
    const my = this.pointerY;
    const pr2 = cfg.pointer.radius * cfg.pointer.radius;
    const push = cfg.pointer.warp;

    // Plasma: classic layered sines (x, y, diagonal, travelling radial, distortion),
    // sampled through the same domain warp so the bands bend like terrain contours.
    const pm = p.plasma;
    const pf = s * p.plasmaFreq; // radians per px
    const pt = time * p.speed * p.plasmaSpeed;
    const pdist = p.plasmaDistortion * 2.2;
    const pcx = this.w / 2 - parX;
    const pcy = this.h / 2 - parY;
    const sin = Math.sin;
    const sqrt = Math.sqrt;
    const dx0 = sin(0.3 * pt) * pdist;
    const dy0 = sin(0.4 * pt) * pdist;
    const NORM = p.plasmaContrast / 5.4;

    // CRT collapse: compress the sampled pattern toward the centre line.
    const kc = this.collapseLevel();
    const squash = kc > 0 ? 1 / (1 - kc * 0.92) : 1;
    const hMid = this.h / 2;

    for (let j = 0; j < lrows; j++) {
      const cy0 = (j * step + 0.5) * ch;
      const cy = kc > 0 ? hMid + (cy0 - hMid) * squash : cy0;
      const rowIdx = j * lcols;
      for (let i = 0; i < lcols; i++) {
        const cx = (i * step + 0.5) * cw;

        // Cursor pushes the sample coordinates outward → clouds part around it.
        let x = cx + offX;
        let y = cy + offY;
        if (ps > 0.001) {
          const dx = cx - mx;
          const dy = cy - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < pr2) {
            const f = 1 - d2 / pr2;
            const k = (f * f * ps * push) / (Math.sqrt(d2) + 1);
            x += dx * k;
            y += dy * k;
          }
        }

        // Near layer: domain-warped fbm → billowing, curling masses.
        const qx = noise.fbm(x * s * 0.9, y * s * 0.9, tNear * 0.7, 2);
        const qy = noise.fbm(x * s * 0.9 + 7.3, y * s * 0.9 + 3.1, tNear * 0.7 + 11, 2);
        const wx = x + qx * warpAmt;
        const wy = y + qy * warpAmt;
        const n = noise.fbm(wx * s, wy * s, tNear, octaves);
        let n01 = n * 0.75 + 0.5;

        if (pm > 0.001) {
          // Pivot on the left edge: features move toward the pivot as the frequency
          // rises, so easing from a lower-frequency preset (resume) to the overview makes
          // the whole pattern glide left — the field's idle drift direction.
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
          let p01 = 0.5 + 0.5 * h * NORM;
          if (p01 < 0) p01 = 0;
          else if (p01 > 1) p01 = 1;
          n01 += (p01 - n01) * pm;
        }
        latNear[rowIdx + i] = n01;

        // Far layer: plain, larger, slower.
        const f = noise.fbm((cx + farOff) * fs, cy * fs + 100, tFar, 2);
        latFar[rowIdx + i] = f * 0.75 + 0.5;
      }
    }
  }

  /* ───────────── pass: per-cell combine + shading ───────────── */

  private evaluateCells(): void {
    const cfg = this.cfg;
    const p = this.cur;
    const cols = this.cols;
    const rows = this.rows;
    const step = this.step;
    const invStep = 1 / step;
    const lcols = this.lcols;
    const latNear = this.latNear;
    const latFar = this.latFar;
    const nBuf = this.nBuf;
    const dBuf = this.dBuf;
    const kindBuf = this.kindBuf;
    const charBuf = this.charBuf;
    const cw = this.cellW;
    const ch = this.cellH;

    const thr = p.threshold;
    const thrHi = p.threshold + p.softness;
    const contrast = p.contrast;
    const fthr = p.farThreshold;
    const fthrHi = p.farThreshold + 0.35;
    const farA = p.farAlpha;

    // 1) interpolate lattice → near density (nBuf) and far density (temp in dBuf)
    for (let row = 0; row < rows; row++) {
      const fy = row * invStep;
      const j0 = Math.floor(fy);
      const ty = fy - j0;
      const r0 = j0 * lcols;
      const r1 = r0 + lcols;
      const rowIdx = row * cols;
      for (let col = 0; col < cols; col++) {
        const fx = col * invStep;
        const i0 = Math.floor(fx);
        const tx = fx - i0;
        const a = latNear[r0 + i0];
        const b = latNear[r0 + i0 + 1];
        const c = latNear[r1 + i0];
        const d = latNear[r1 + i0 + 1];
        nBuf[rowIdx + col] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
        const fa = latFar[r0 + i0];
        const fb = latFar[r0 + i0 + 1];
        const fc = latFar[r1 + i0];
        const fd = latFar[r1 + i0 + 1];
        dBuf[rowIdx + col] = (fa + (fb - fa) * tx) * (1 - ty) + (fc + (fd - fc) * tx) * ty;
      }
    }

    // 2) density + volumetric shading + cursor glow
    const shading = p.shading;
    const lx = -0.55; // light from upper-left
    const ly = -0.83;
    const gradK = 6 / Math.max(1e-6, p.scale * (1000 / Math.max(1, this.w)) * 1000); // normalise gradient to feature size
    const ps = this.pointerStrength;
    const mx = this.pointerX;
    const my = this.pointerY;
    const pr2 = cfg.pointer.radius * cfg.pointer.radius;
    const glow = cfg.pointer.glow;
    const pointerChars = cfg.chars.pointer.map((c) => this.charIndex.get(c) ?? 0); // shockwave glyphs

    // Active navigation pulses → ring radius / width / amplitude for this frame.
    const nowMs = performance.now();
    const PULSE_LIFE = 1.5; // s
    const PULSE_SPEED = 1500 * (this.w / 1440); // px/s, scaled to viewport width
    const pulseX: number[] = [];
    const pulseY: number[] = [];
    const pulseR: number[] = [];
    const pulseW: number[] = [];
    const pulseA: number[] = [];
    for (let k = this.pulses.length - 3; k >= 0; k -= 3) {
      const age = (nowMs - this.pulses[k + 2]) / 1000;
      if (age > PULSE_LIFE) {
        this.pulses.splice(k, 3);
        continue;
      }
      const t = age / PULSE_LIFE;
      pulseX.push(this.pulses[k]);
      pulseY.push(this.pulses[k + 1]);
      pulseR.push(age * PULSE_SPEED);
      pulseW.push(60 + age * 140);
      pulseA.push((1 - t) * (1 - t) * 0.9);
    }
    const nPulse = pulseX.length;

    for (let row = 0; row < rows; row++) {
      const rowIdx = row * cols;
      const cy = (row + 0.5) * ch;
      for (let col = 0; col < cols; col++) {
        const idx = rowIdx + col;
        const n01 = nBuf[idx];

        let near = smoothstep(thr, thrHi, n01);
        if (near > 0 && contrast !== 1) near = Math.pow(near, contrast);

        let v: number;
        if (near > 0.002) {
          // Gradient of the density field → lit vs. shadowed side of each mass.
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

        // Far haze fills in where the near layer is empty.
        const far = smoothstep(fthr, fthrHi, dBuf[idx]) * farA;
        v = v + far * (1 - near);

        // NOTE: dBuf holds raw density (0..1); brightness + readability mask are
        // applied in the draw pass after band quantization.
        let kind = KIND_CLOUD;
        if (ps > 0.001) {
          // Soft light lift around the cursor (no glyph swaps, no distortion).
          const dx = (col + 0.5) * cw - mx;
          const dy = cy - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < pr2) {
            const f = 1 - d2 / pr2;
            v += f * f * ps * glow;
          }
        }

        // Navigation shockwave rings.
        if (nPulse > 0) {
          const cx = (col + 0.5) * cw;
          for (let k = 0; k < nPulse; k++) {
            const dx = cx - pulseX[k];
            const dy = cy - pulseY[k];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rel = (dist - pulseR[k]) / pulseW[k];
            if (rel > 2.5 || rel < -2.5) continue;
            const ring = Math.exp(-rel * rel) * pulseA[k];
            if (ring < 0.02) continue;
            v += ring;
            if (ring > 0.45 && hash2(col + 31, row + 7) < 0.45) {
              kind = KIND_POINTER;
              const ax = Math.abs(dx);
              const ay = Math.abs(dy);
              charBuf[idx] = pointerChars[ax > ay ? (dx > 0 ? 0 : 1) : dy < 0 ? 2 : 3];
            }
          }
        }

        dBuf[idx] = v > 1 ? 1 : v;
        kindBuf[idx] = v > 0.02 ? kind : KIND_NONE;
      }
    }
  }

  /* ───────────── transition helpers ───────────── */

  /** Progress of the running effect in [0, 1], finishing it when done. */
  private fxProgress(now: number): number {
    const fx = this.fx;
    if (!fx) return 0;
    const p = Math.min(1, (now - fx.t0) / fx.dur);
    if (p >= 1) {
      if (fx.kind === "cover") this.coverHold = true;
      if (fx.kind === "reveal") this.coverHold = false;
      if (fx.kind === "collapse") this.collapseHold = true;
      if (fx.kind === "expand") this.collapseHold = false;
      this.fx = null;
      fx.resolve();
    }
    return p;
  }

  /** Current collapse amount in [0, 1] (1 = fully collapsed to a dot). */
  private collapseLevel(): number {
    const fx = this.fx;
    if (fx?.kind === "collapse") {
      const p = Math.min(1, (performance.now() - fx.t0) / fx.dur);
      return p * p * (3 - 2 * p);
    }
    if (fx?.kind === "expand") {
      const p = Math.min(1, (performance.now() - fx.t0) / fx.dur);
      return 1 - p * p * (3 - 2 * p);
    }
    return this.collapseHold ? 1 : 0;
  }

  /* ───────────── draw pass ───────────── */

  private draw(): void {
    const atlas = this.atlas;
    if (!atlas) return;
    const cfg = this.cfg;
    const p = this.cur;
    const time = this.time + this.scrollY * cfg.scrollTimeWarp;

    this.buildQuietMask(p.quiet);
    this.evaluateLattice(time);
    this.evaluateCells();

    const renderer = this.renderer;
    const cols = this.cols;
    const rows = this.rows;
    const nBuf = this.nBuf;
    const dBuf = this.dBuf;
    const kindBuf = this.kindBuf;
    const charBuf = this.charBuf;
    const charIndex = this.charIndex;
    const flowIdx = cfg.chars.flow.map((c) => charIndex.get(c) ?? 0);
    const rampIdx = Array.from(cfg.chars.ramp, (c) => (c === " " ? -1 : (charIndex.get(c) ?? 0)));
    const rampN = rampIdx.length;
    const texture = p.texture;
    const levels = Math.round(p.levels);
    const banded = levels > 0;
    const gamma = p.levelGamma;
    const brightness = Math.min(1, p.brightness * this.gain);
    const qMask = this.qMask;
    const thin = banded ? 0 : cfg.thinBelow; // bands stay solid, no dithering
    // Accent palette: (a) optional patch colouring of peak/mid cells, (b) short strips.
    const palN = Math.min(8, cfg.colors.palette.length);
    const palAmt = palN ? p.paletteAmount : 0;
    const palMid = palN ? p.paletteMid : 0;
    const palScale = cfg.colors.paletteScale;
    const palTime = this.time * 0.02;
    const noise = this.noise;
    // Active strips → per-cell lookup for this frame (expire old ones).
    const nowS = performance.now();
    const cellCount = cols * rows;
    if (this.stripPal.length !== cellCount) {
      this.stripPal = new Uint8Array(cellCount);
      this.stripEnv = new Float32Array(cellCount);
    }
    const stripPal = this.stripPal;
    const stripEnv = this.stripEnv;
    stripPal.fill(0);
    const traced: number[] = [];
    const pathC: number[] = [];
    const pathR: number[] = [];
    for (let k = this.strips.length - 1; k >= 0; k--) {
      const st = this.strips[k];
      const u = (nowS - st.t0) / st.life;
      if (u >= 1) {
        this.strips.splice(k, 1);
        continue;
      }
      // Anchor moves with the field's drift; snap it back onto its contour (the field
      // morphs too), then re-trace the run along the current edge.
      const col = Math.round((st.ax - this.driftX) / this.cellW - 0.5);
      const row0 = Math.round((st.ay - this.driftY) / this.cellH - 0.5);
      const row = this.snapToEdge(col, row0, st.band, st.side, levels);
      if (row < 0) {
        st.life = Math.min(st.life, nowS - st.t0 + 250); // contour gone: fade out quickly
      } else {
        // Follow the contour: the anchor rides along as the wave travels/morphs.
        st.ay = (row + 0.5) * this.cellH + this.driftY;
      }
      const env = Math.min(1, u * 4) * Math.min(1, (1 - u) * 2.5); // fade in fast, out slower
      traced.length = 0;
      if (row >= 0) {
        this.tracePath(col, row, st.band, st.side, st.dir, st.len, levels, st.prevRows, pathC, pathR);
        const q = this.pathQuality(pathR);
        if (q.zigzags > 2) {
          st.life = Math.min(st.life, nowS - st.t0 + 250); // edge went jagged: fade out
        }
        st.prevRows = pathR.slice();
        // Draw the strip progressively along the curve: it extends from its start while
        // fading in, then retracts from the start while fading out — no speckle.
        const n = pathC.length;
        const grow = Math.min(1, u * 3.2); // 0..1 over the first ~30% of life
        const shrink = u > 0.62 ? (u - 0.62) / 0.38 : 0; // 0..1 over the last ~38%
        const from = Math.floor(n * shrink);
        const to = Math.ceil(n * grow);
        pathC.splice(to);
        pathR.splice(to);
        pathC.splice(0, Math.min(from, pathC.length));
        pathR.splice(0, Math.min(from, pathR.length));
        this.stampPath(pathC, pathR, st.thick, st.side, traced);
      }
      for (let i = 0; i < traced.length; i++) {
        stripPal[traced[i]] = st.pal;
        stripEnv[traced[i]] = env;
      }
    }
    // Cursor: light up the contour under the pointer, fading out along the curve.
    if (this.pointerStrength > 0.02 && cfg.pointer.trace > 0 && palN > 0) {
      const pc = Math.floor(this.pointerX / this.cellW);
      const prow = Math.floor(this.pointerY / this.cellH);
      let best = -1;
      let bestD = 99;
      // Nearest band edge (any band ≥ 1) within reach of the cursor.
      for (let dr = -9; dr <= 9; dr++) {
        const r = prow + dr;
        const b = this.bandAt(pc, r, levels);
        if (b < 1) continue;
        if (b !== this.bandAt(pc, r - 1, levels) || b !== this.bandAt(pc, r + 1, levels)) {
          if (Math.abs(dr) < bestD) {
            bestD = Math.abs(dr);
            best = r;
          }
        }
      }
      if (best >= 0) {
        const b = this.bandAt(pc, best, levels);
        const side: -1 | 1 = this.bandAt(pc, best - 1, levels) !== b ? -1 : 1;
        const pal = Math.min(palN, Math.max(1, cfg.pointer.traceColor));
        const n = cfg.pointer.trace;
        for (const dir of [1, -1] as const) {
          const slot = dir > 0 ? 0 : 1;
          const prev = this.cursorPrev[slot];
          // Hysteresis only while the trace stays on the same start cell; otherwise re-seed.
          const usePrev = prev.length > 0 && prev[0] === best ? prev : null;
          this.tracePath(pc, best, b, side, dir, n, levels, usePrev, pathC, pathR);
          this.cursorPrev[slot] = pathR.slice();
          this.stampPath(pathC, pathR, 1, side, traced);
          for (let i = 0; i < traced.length; i++) {
            const env = this.pointerStrength * (1 - (i / n) * 0.85);
            if (env > stripEnv[traced[i]] || !stripPal[traced[i]]) {
              stripPal[traced[i]] = pal;
              stripEnv[traced[i]] = env;
            }
          }
        }
      }
    }
    const minD = 0.05;

    // ── transition state for this frame ──
    const now = performance.now();
    const fxKind = this.fx?.kind ?? null;
    const fxP = this.fxProgress(now);
    const fxDir = this.fx?.dir ?? 1;
    const w = this.w;
    const h = this.h;
    const cw = this.cellW;
    const ch = this.cellH;
    const coverOn = fxKind === "cover" || fxKind === "reveal" || this.coverHold;
    const coverFront = fxDir > 0 ? (-0.35 + 1.7 * fxP) * w : (1.35 - 1.7 * fxP) * w;
    const coverFw = w * 0.35;
    const coverBright = 0.9;
    const kc = this.collapseLevel();
    const collapseOn = kc > 0.001;
    const lineW = h * 0.5 * (1 - kc) * (1 - kc) + ch * 0.45;
    const hx = kc > 0.7 ? (kc - 0.7) / 0.3 : 0;
    const hWin = w * 0.5 * (1 - hx) + cw * 0.8;
    const fxActive = coverOn || collapseOn;
    const backdrop = this.backdrop;
    if (backdrop) backdrop.begin();
    // Row-tear glitch: pick rows for this frame.
    const glitchOn = now < this.glitchUntil;
    this.frameSeed = (this.frameSeed + 1) % 4096;
    if (glitchOn) {
      if (this.rowShift.length !== rows) this.rowShift = new Int16Array(rows);
      for (let r = 0; r < rows; r++) {
        const pick = hash2(r * 3 + 1, this.frameSeed) < 0.16;
        this.rowShift[r] = pick ? Math.round((hash2(r + 11, this.frameSeed + 5) - 0.5) * cols * 0.4) : 0;
      }
    }

    renderer.begin();

    for (let row = 0; row < rows; row++) {
      const rowIdx = row * cols;
      const cy = (row + 0.5) * ch;
      const shift = glitchOn ? this.rowShift[row] : 0;
      for (let col = 0; col < cols; col++) {
        let idx = rowIdx + col;
        if (shift !== 0) idx = rowIdx + ((((col + shift) % cols) + cols) % cols);
        let kind = kindBuf[idx];
        let v = kind === KIND_NONE ? 0 : dBuf[idx]; // raw density
        if (shift !== 0 && v > 0) v = Math.min(1, v + 0.3);
        if (!fxActive && kind === KIND_NONE) continue;

        // CRT collapse: squeeze into a bright centre line, then a dot.
        if (collapseOn) {
          if (backdrop) backdrop.push(col, row, 0, kc); // page darkens to black as it collapses
          const yc = (cy - h / 2) / lineW;
          const xc = ((col + 0.5) * cw - w / 2) / hWin;
          const win = Math.exp(-yc * yc) * Math.exp(-xc * xc * xc * xc);
          v = Math.max(v * win, kc * win);
          if (v > 0.02 && kind === KIND_NONE) kind = KIND_CLOUD;
        }

        const qm = fxActive ? 1 : qMask[idx];
        let d: number; // final alpha
        let band = 0;
        if (banded) {
          // Quantize raw density into elevation bands, then shape alpha per band.
          band = Math.round(v * levels);
          d = band <= 0 ? 0 : Math.pow(band / levels, gamma) * brightness * qm;
        } else {
          d = v * brightness * qm;
        }

        // Cloud-sweep cover / reveal (drawn on top of everything, ignores the mask).
        if (coverOn) {
          let c: number;
          if (this.coverHold && fxKind !== "reveal") {
            c = 1;
          } else {
            const cx = (col + 0.5) * cw + (nBuf[idx] - 0.5) * w * 0.3; // organic front
            // Cells the front has already passed are "behind" it (covered on "cover").
            const behind =
              fxDir > 0
                ? 1 - smoothstep(coverFront - coverFw, coverFront, cx)
                : smoothstep(coverFront, coverFront + coverFw, cx);
            c = fxKind === "reveal" ? 1 - behind : behind;
          }
          // Opaque backdrop fills in just behind the front so the old page vanishes.
          if (backdrop && c > 0.05) backdrop.push(col, row, 0, smoothstep(0.05, 0.45, c));
          if (c > 0.02) {
            // Terrain shows through the cover (dense bands, never below the mid band).
            const cv = c * (0.62 + 0.38 * nBuf[idx]);
            const cb = banded ? Math.max(1, Math.round(cv * levels)) : 0;
            const cd = banded ? Math.pow(cb / levels, gamma) * coverBright : cv * coverBright;
            if (cd > d) {
              d = cd;
              band = cb;
              kind = KIND_CLOUD;
            }
          }
        }

        const stripHere = stripPal[idx];
        if ((kind === KIND_NONE || d < minD) && !stripHere) continue;
        // Stochastic thinning of faint cells → airy, dithered cloud edges + fewer blits.
        if (thin > 0 && d < thin && hash2(col + 5, row + 13) * thin > d) continue;

        let ci: number;
        if (kind === KIND_POINTER) {
          ci = charBuf[idx];
        } else if (banded) {
          // One glyph per band, with a few contour-following texture glyphs.
          ci = -1;
          if (texture > 0.001 && d > 0.15 && d < 0.6 && hash2(row + 3, col + 9) < texture) {
            const l = col > 0 ? nBuf[idx - 1] : nBuf[idx];
            const r = col < cols - 1 ? nBuf[idx + 1] : nBuf[idx];
            const u = row > 0 ? nBuf[idx - cols] : nBuf[idx];
            const b = row < rows - 1 ? nBuf[idx + cols] : nBuf[idx];
            const gx = r - l;
            const gy = b - u;
            if (gx * gx + gy * gy > 1e-6) {
              let bkt = Math.round(Math.atan2(-gx, gy) / (Math.PI / 4));
              bkt = ((bkt % 8) + 8) % 8;
              ci = flowIdx[bkt];
            }
          }
          if (ci < 0) {
            // Band k → k-th glyph of the ramp (or spread across the ramp if more bands than glyphs).
            const gi = levels <= rampN - 1 ? band : Math.round((band / levels) * (rampN - 1));
            ci = rampIdx[Math.min(rampN - 1, Math.max(1, gi))];
            if (ci < 0) continue;
          }
        } else {
          ci = -1;
          if (texture > 0.001 && d > 0.15 && d < 0.6 && hash2(row + 3, col + 9) < texture) {
            // Directional glyph following the local contour of the cloud.
            const l = col > 0 ? nBuf[idx - 1] : nBuf[idx];
            const r = col < cols - 1 ? nBuf[idx + 1] : nBuf[idx];
            const u = row > 0 ? nBuf[idx - cols] : nBuf[idx];
            const b = row < rows - 1 ? nBuf[idx + cols] : nBuf[idx];
            const gx = r - l;
            const gy = b - u;
            if (gx * gx + gy * gy > 1e-6) {
              let bkt = Math.round(Math.atan2(-gx, gy) / (Math.PI / 4));
              bkt = ((bkt % 8) + 8) % 8;
              ci = flowIdx[bkt];
            }
          }
          if (ci < 0) {
            let v = d + (hash2(col, row) - 0.5) * 0.16;
            if (v < 0) v = 0;
            else if (v > 0.999) v = 0.999;
            ci = rampIdx[Math.floor(v * rampN)];
            if (ci < 0) continue;
          }
        }

        // Colour: monochrome ramp unless this cell sits in an accent strip (or patch).
        let pal = 0;
        let dOut = d;
        if (stripHere && kind === KIND_NONE) {
          kind = KIND_CLOUD; // empty cell inside a strip: draw it so the run is continuous
          band = Math.max(1, Math.round(levels * 0.5));
          d = 0.6;
          dOut = d;
        }
        if (stripHere && kind === KIND_CLOUD && !coverOn) {
          const env = stripEnv[idx];
          pal = stripHere;
          dOut = Math.max(d, 0.7 + 0.3 * env); // strips render at (near) full brightness, glinting with the envelope
        }
        if (!pal && palAmt > 0 && kind === KIND_CLOUD && !coverOn) {
          const peak = banded ? band >= levels - 1 : d > 0.8;
          const mid = banded ? band >= Math.ceil(levels * 0.5) : d > 0.45;
          const h = hash2(col + 61, row + 23);
          if ((peak && h < palAmt) || (mid && h < palMid)) {
            const n = noise.noise((col + 0.5) * cw * palScale, (row + 0.5) * ch * palScale, palTime) * 0.5 + 0.5;
            pal = 1 + Math.min(palN - 1, Math.floor(n * palN));
          }
        }
        renderer.push(col, row, ci, dOut, pal);
      }
    }

    renderer.end();
    if (backdrop) backdrop.end();
  }
}
