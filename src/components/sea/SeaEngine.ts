/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: engine (framework-agnostic, one WebGL2 canvas)
 *
 *  Per frame:
 *    1. Advance time / plasma phase / flow (same rates as the old field).
 *    2. Ease the scroll position, sample the journey's camera keys,
 *       add hand-held sway, swell riding and cursor parallax.
 *    3. Scene pass → two cols×rows RGBA8 targets (one texel per glyph).
 *    4. Trace pass → the cursor's contour path (2N+1 texels).
 *    5. ASCII pass → canvas (glyph atlas lookup + colour).
 * ─────────────────────────────────────────────────────────────
 */

import { GLYPH_FS, MAX_QUIET, MAX_RIPPLES, RESOLVE_FS, TRACE_FS, TRACE_N, VS, sceneFS, type SeaMode } from "./shaders";
import { newCamera, nearestRestU, sampleCamera, type Camera, type Shot, type Vec3 } from "./timeline";
import { BEATS, KEYS, STOPS, WINDOWS } from "./journey";
import { BEACONS, FLOW_SPEED, MORPH_SPEED, OCEAN, PHASE_SPEED, REGIONS, SWELLS, swellAt } from "./world";
import { CHART_SITES } from "./chart";

const GLYPHS = " .:-=+*#%@" + "/\\|_<>^~";

export const SEA_CONFIG = {
  fontSize: 8,
  lineHeight: 1.25,
  maxDpr: 1.5,
  /** Grey ramp (same as the hero preset). */
  brightness: 0.62,
  gamma: 0.75,
  rampLo: 0.1,
  rampHi: 0.95,
  /** Lime family ×3, warm/orange family ×2 (all from the current site palette). */
  palette: ["#a3e635", "#d8fb74", "#bad366", "#d3b75b", "#a77a4b"],
  pointerRadius: 220,
  pointerGlow: 0.14,
  /** Seconds after the last move before the cursor effects fade (ascii-field idleFade). */
  pointerIdle: 2.5,
  /** Map scanner lens radius (CSS px). */
  lensRadius: 250,
  /** Scroll easing rate (per second): higher = camera follows the scrollbar more tightly. */
  scrollFollow: 4.2,
  steps: 110,
  quietFeather: 70,
  quietPad: 24,
};

export type Telemetry = {
  u: number;
  pos: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  speed: number;
  /** Last beat the camera rested at (index into BEATS). */
  beat: number;
  /** Stop index (STOPS) of that beat. */
  stop: number;
  /** True while the camera is at rest (reading), false while travelling. */
  resting: boolean;
  underwater: boolean;
};

type Uniforms = Record<string, WebGLUniformLocation | null>;

function parseColor(c: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillStyle = c;
  const v = ctx.fillStyle as string;
  if (v.startsWith("#")) {
    const n = parseInt(v.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = v.match(/[\d.]+/g) ?? ["128", "128", "128"];
  return [+m[0] / 255, +m[1] / 255, +m[2] / 255];
}

type Pending = { prog: WebGLProgram; vs: WebGLShader; fs: WebGLShader; t0: number };

/** Queue compile + link without asking for the result (no stall: the driver may work in the background). */
function startProgram(gl: WebGL2RenderingContext, vs: string, fs: string): Pending {
  const ascii = (s: string) => s.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, ascii(src));
    gl.compileShader(sh);
    return sh;
  };
  const t0 = performance.now();
  const p = gl.createProgram()!;
  const v = mk(gl.VERTEX_SHADER, vs);
  const f = mk(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  return { prog: p, vs: v, fs: f, t0 };
}

/** Wait for a queued program (blocks if still compiling) and check it. */
function finishProgram(gl: WebGL2RenderingContext, q: Pending, name: string): WebGLProgram {
  if (!gl.getProgramParameter(q.prog, gl.LINK_STATUS)) {
    const log =
      gl.getShaderInfoLog(q.fs) || gl.getShaderInfoLog(q.vs) || gl.getProgramInfoLog(q.prog) || "(no log)";
    throw new Error(`Sea shader ${name} failed: ${log}`);
  }
  gl.detachShader(q.prog, q.vs);
  gl.detachShader(q.prog, q.fs);
  gl.deleteShader(q.vs);
  gl.deleteShader(q.fs);
  if (process.env.NODE_ENV !== "production") {
    console.info(`[sea] ${name} ready in ${Math.round(performance.now() - q.t0)} ms`);
  }
  return q.prog;
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string, name = "program"): WebGLProgram {
  return finishProgram(gl, startProgram(gl, vs, fs), name);
}

function uniforms(gl: WebGL2RenderingContext, p: WebGLProgram): Uniforms {
  const out: Uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!;
    const name = info.name.replace(/\[0\]$/, "");
    out[name] = gl.getUniformLocation(p, info.name);
  }
  return out;
}

function makeTex(gl: WebGL2RenderingContext, tex: WebGLTexture, w: number, h: number): void {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export type SeaEngineOptions = {
  fontFamily?: string;
  reducedMotion?: boolean;
  /** Elements whose rect dims the field behind them (attribute value = strength, default 0.9). */
  quietSelector?: string;
};

export class SeaEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  /** Scene pass variants (see sceneFS): compiled on demand, 0 (generic) always present. */
  private scene: Partial<Record<SeaMode, { prog: WebGLProgram; u: Uniforms }>> = {};
  private traceProg!: WebGLProgram;
  private resolveProg!: WebGLProgram;
  private glyphProg!: WebGLProgram;
  private tu!: Uniforms;
  private au!: Uniforms;
  private gu!: Uniforms;
  private cellTex!: WebGLTexture;
  private glyphTex!: WebGLTexture;
  private cellFbo!: WebGLFramebuffer;
  private variantTimer = 0;
  /** Scene variants compiling in the background (KHR_parallel_shader_compile when available). */
  private pending: { mode: SeaMode; q: Pending; frames: number }[] = [];
  private parallel: { COMPLETION_STATUS_KHR: number } | null = null;
  private vao!: WebGLVertexArrayObject;
  private sceneTex!: WebGLTexture;
  private sceneTex2!: WebGLTexture;
  private fbo!: WebGLFramebuffer;
  private traceTex!: WebGLTexture;
  private traceFbo!: WebGLFramebuffer;
  private atlasTex!: WebGLTexture;

  private fontFamily: string;
  private reduced: boolean;
  private quietSelector: string | null;

  // metrics
  private w = 0;
  private h = 0;
  private dpr = 1;
  private cellW = 5; // device px
  private cellH = 10;
  private cols = 0;
  private rows = 0;
  private dprCap = SEA_CONFIG.maxDpr;

  // colours
  private lo: [number, number, number] = [0.36, 0.36, 0.36];
  private hi: [number, number, number] = [0.81, 0.81, 0.81];
  private gain = 1;
  private pal = new Float32Array(15);

  // animation
  private raf = 0;
  private running = false;
  private lastTs = 0;
  private time = 0;
  private phase = 0;
  private morph = 0;
  private flow: [number, number] = [0, 0];
  private uSmooth = 0;
  private uTarget = 0;
  private first = true;
  private glitchBurst = 0;
  private seed = 0;
  private seedAt = 0;
  private frameEma = 16;
  private slowFor = 0;
  private steps = SEA_CONFIG.steps;

  // camera
  private cam: Camera = newCamera();
  private camPos: Vec3 = [0, 10, 0];
  private prevPos: Vec3 = [0, 10, 0];
  private right: Vec3 = [1, 0, 0];
  private up: Vec3 = [0, 0, -1];
  private fwd: Vec3 = [0, -1, 0];
  private tanHalf = 0.27;
  private lastBeat = 0;
  private wasUnder = false;

  // pointer
  private px = -1;
  private py = -1;
  private pStrength = 0;
  private pInside = false;
  private pLastMove = -Infinity;
  private pnx = 0; // smoothed, -1..1
  private pny = 0;
  private lensX = 0;
  private lensY = 0;

  // ripples [x, z, t0, strength] ×N
  private rip = new Float32Array(MAX_RIPPLES * 4);
  private ripN = 0;
  private ripNext = 0;

  // waypoint beams + their impacts on the water
  private beamBeat = BEACONS.map((b) => BEATS.findIndex((x) => x.region === b.id));
  private beamDrop = BEACONS.map(() => 0);
  private beamLand = BEACONS.map(() => -99);
  private beamA = new Float32Array(BEACONS.length * 4);
  private beamB = new Float32Array(BEACONS.length * 4);
  private beamN = 0;
  private imp = new Float32Array(4 * 4);
  private impN = 0;
  private impNext = 0;
  // detour: a side trip off the journey (project dossiers, the archive)
  private detourShot: Shot | null = null;
  private detourWant = 0;
  private detourAmt = 0;
  private detourFocus: { x: number; z: number; color: number } | null = null;
  private detourArrived = false;
  private light: Vec3 = [0, 1, 0];
  private sun: Vec3 = [0, 0.1, -1];
  private waveVel: [number, number] = [0, 0];

  // quiet zones
  private quiet = new Float32Array(MAX_QUIET * 4);
  private quietS = new Float32Array(MAX_QUIET);
  private quietN = 0;

  readonly telemetry: Telemetry = {
    u: 0,
    pos: [0, 0, 0],
    yaw: 0,
    pitch: -90,
    roll: 0,
    fov: 30,
    speed: 0,
    beat: 0,
    stop: 0,
    resting: true,
    underwater: false,
  };

  constructor(canvas: HTMLCanvasElement, opts: SeaEngineOptions = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.fontFamily = opts.fontFamily ?? "ui-monospace, Menlo, Consolas, monospace";
    this.reduced = !!opts.reducedMotion;
    this.quietSelector = opts.quietSelector ?? null;

    this.initGL();
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);

    this.setPalette(SEA_CONFIG.palette);
    this.resize();
  }

  /** (Re)create every GL resource: on construction and after a context restore. */
  private initGL(): void {
    const gl = this.gl;
    this.scene = {};
    this.pending = [];
    this.parallel = gl.getExtension("KHR_parallel_shader_compile");
    // Dev: ?sea-sync simulates a browser without background shader compiles.
    if (process.env.NODE_ENV !== "production" && window.location.search.includes("sea-sync")) this.parallel = null;
    // Only the hero variant (tiny: no raymarch) is needed for the first frame; the heavy
    // ocean variants compile in the background while the hero is already on screen.
    this.buildVariant(1);
    this.traceProg = compile(gl, VS, TRACE_FS, "trace");
    this.resolveProg = compile(gl, VS, RESOLVE_FS, "resolve");
    this.glyphProg = compile(gl, VS, GLYPH_FS, "glyph");
    this.tu = uniforms(gl, this.traceProg);
    this.au = uniforms(gl, this.resolveProg);
    this.gu = uniforms(gl, this.glyphProg);
    this.cellTex = gl.createTexture()!;
    this.glyphTex = gl.createTexture()!;
    this.cellFbo = gl.createFramebuffer()!;
    // Dive (mixed) first: it's the next thing the camera needs, then the open ocean, then underwater.
    // With KHR_parallel_shader_compile they build off-thread right away. Without it a build
    // stalls the GPU queue, so it waits until the hero has painted and settled (or the
    // first scroll), and the variants go one at a time.
    window.clearTimeout(this.variantTimer);
    this.variantQueue = [0, 2, 3];
    this.variantsStarted = false;
    if (this.parallel) this.startVariants();
    this.vao = gl.createVertexArray()!;
    this.sceneTex = gl.createTexture()!;
    this.sceneTex2 = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.atlasTex = gl.createTexture()!;
    this.traceTex = gl.createTexture()!;
    this.traceFbo = gl.createFramebuffer()!;
    makeTex(gl, this.traceTex, TRACE_N * 2 + 1, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.traceFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.traceTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private buildVariant(mode: SeaMode): void {
    if (this.disposed || this.scene[mode] || this.gl.isContextLost()) return;
    const prog = compile(this.gl, VS, sceneFS(mode), `scene/${mode}`);
    this.scene[mode] = { prog, u: uniforms(this.gl, prog) };
  }

  private variantQueue: SeaMode[] = [];
  private variantsStarted = false;

  private startVariants(): void {
    if (this.variantsStarted) return;
    this.variantsStarted = true;
    const next = () => {
      const m = this.variantQueue.shift();
      if (m === undefined || this.disposed) return;
      this.queueVariant(m);
      this.variantTimer = window.setTimeout(next, this.parallel ? 0 : 250);
    };
    this.variantTimer = window.setTimeout(next, this.parallel ? 30 : 0);
  }

  private queueVariant(mode: SeaMode): void {
    if (this.disposed || this.scene[mode] || this.gl.isContextLost()) return;
    this.pending.push({ mode, q: startProgram(this.gl, VS, sceneFS(mode)), frames: 0 });
  }

  /** Adopt background-compiled variants once they're done (never stalls with the extension). */
  private pollVariants(): void {
    if (!this.pending.length) return;
    const gl = this.gl;
    const keep: typeof this.pending = [];
    for (const p of this.pending) {
      p.frames++;
      const done = this.parallel
        ? gl.getProgramParameter(p.q.prog, this.parallel.COMPLETION_STATUS_KHR)
        : p.frames > 2 || this.reduced; // no extension: it's already queued ahead of us; collect it
      if (!done) {
        keep.push(p);
        continue;
      }
      try {
        const prog = finishProgram(gl, p.q, `scene/${p.mode}`);
        this.scene[p.mode] = { prog, u: uniforms(gl, prog) };
      } catch (err) {
        console.warn("[sea]", err);
      }
    }
    this.pending = keep;
  }

  /** The cheapest compiled scene variant for the current shot (falls back while others compile). */
  private pickVariant(ocean: number, under: boolean): { prog: WebGLProgram; u: Uniforms } {
    const want: SeaMode = under ? 3 : ocean >= 0.999 ? 2 : ocean <= 0.001 ? 1 : 0;
    const order: SeaMode[] =
      want === 3 ? [3, 2, 0, 1] : want === 2 ? [2, 0, 1] : want === 0 ? [0, 2, 1] : [1, 0];
    for (const m of order) if (this.scene[m]) return this.scene[m]!;
    return this.scene[1]!;
  }

  private onLost = (e: Event): void => {
    e.preventDefault(); // allow the browser to restore the context
  };

  private onRestored = (): void => {
    this.initGL();
    this.resize();
  };

  /* ───────────── public API ───────────── */

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    const gl = this.gl;
    window.clearTimeout(this.variantTimer);
    for (const v of Object.values(this.scene)) if (v) gl.deleteProgram(v.prog);
    for (const p of this.pending) gl.deleteProgram(p.q.prog);
    this.pending = [];
    for (const p of [this.traceProg, this.resolveProg, this.glyphProg]) gl.deleteProgram(p);
    for (const t of [this.sceneTex, this.sceneTex2, this.traceTex, this.atlasTex, this.cellTex, this.glyphTex]) gl.deleteTexture(t);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteFramebuffer(this.traceFbo);
    gl.deleteFramebuffer(this.cellFbo);
    gl.deleteVertexArray(this.vao);
  }

  setReducedMotion(r: boolean): void {
    this.reduced = r;
    this.first = true;
    this.requestStatic();
  }

  setColors(lo: string, hi: string, gain: number): void {
    this.lo = parseColor(lo);
    this.hi = parseColor(hi);
    this.gain = Number.isFinite(gain) ? Math.min(3, Math.max(0.25, gain)) : 1;
    this.requestStatic();
  }

  setPalette(colors: string[]): void {
    for (let i = 0; i < 5; i++) this.pal.set(parseColor(colors[i % colors.length]), i * 3);
  }

  setFontFamily(f: string): void {
    if (f === this.fontFamily) return;
    this.fontFamily = f;
    this.resize();
  }

  /** Scroll position in px (converted to viewport heights internally). */
  setScroll(scrollY: number): void {
    this.uTarget = scrollY / Math.max(1, window.innerHeight);
    this.requestStatic();
  }

  /** Cut straight to the current scroll position on the next frame (deep links): no flight. */
  snap(): void {
    this.first = true;
    this.requestStatic();
  }

  setPointer(x: number, y: number): void {
    this.px = x;
    this.py = y;
    this.pInside = true;
    this.pLastMove = this.time;
    this.requestStatic();
  }

  clearPointer(): void {
    this.pInside = false;
  }

  /**
   * Leave the journey for a side area of the ocean (a project dossier, the archive): the
   * camera lifts off the scroll path, swoops out to `shot` and stays there until cleared.
   * `focus` (world xz) gets a beam strike on arrival. Pass null to fly back.
   */
  setDetour(shot: Shot | null, focus?: { x: number; z: number; color: number }): void {
    if (shot) {
      this.detourShot = shot;
      this.detourFocus = focus ?? null;
      this.detourArrived = false;
    }
    this.detourWant = shot ? 1 : 0;
    this.requestStatic();
  }

  /** 0 = on the journey, 1 = at the detour (eased). */
  get detourAmount(): number {
    return this.detourAmt;
  }

  /** Drop a ripple where the screen point (CSS px) meets the sea. */
  ripple(x: number, y: number, strength = 1): void {
    const hit = this.screenToSea(x, y);
    if (hit) this.addRipple(hit[0], hit[1], strength);
  }

  /** World point → CSS px; null when behind the camera. */
  project(p: Vec3): [number, number] | null {
    const v: Vec3 = [p[0] - this.camPos[0], p[1] - this.camPos[1], p[2] - this.camPos[2]];
    const z = v[0] * this.fwd[0] + v[1] * this.fwd[1] + v[2] * this.fwd[2];
    if (z <= 0.01) return null;
    const x = v[0] * this.right[0] + v[1] * this.right[1] + v[2] * this.right[2];
    const y = v[0] * this.up[0] + v[1] * this.up[1] + v[2] * this.up[2];
    const aspect = this.w / Math.max(1, this.h);
    const nx = x / (z * aspect * this.tanHalf);
    const ny = y / (z * this.tanHalf);
    return [((nx + 1) / 2) * (this.w / this.dpr), ((1 - ny) / 2) * (this.h / this.dpr)];
  }

  /** Signed view-space direction to a world point: [x, y] in -1..1-ish and whether it's ahead. */
  direction(p: Vec3): { x: number; y: number; ahead: boolean } {
    const v: Vec3 = [p[0] - this.camPos[0], p[1] - this.camPos[1], p[2] - this.camPos[2]];
    const z = v[0] * this.fwd[0] + v[1] * this.fwd[1] + v[2] * this.fwd[2];
    const x = v[0] * this.right[0] + v[1] * this.right[1] + v[2] * this.right[2];
    const y = v[0] * this.up[0] + v[1] * this.up[1] + v[2] * this.up[2];
    return { x, y, ahead: z > 0.01 };
  }

  /** Where a screen point (CSS px) meets the sea plane → world [x, z], or null. */
  seaAtScreen(x: number, y: number): [number, number] | null {
    return this.screenToSea(x, y);
  }

  get cameraPos(): Vec3 {
    return this.camPos;
  }

  /** Camera sample at an arbitrary scroll position (for drawing the flight path). */
  cameraAt(u: number): Camera {
    return sampleCamera(KEYS, u, this.w / Math.max(1, this.h), newCamera());
  }

  get backend(): string {
    return "webgl2";
  }

  resize(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.w = Math.max(1, Math.round(cssW * this.dpr));
    this.h = Math.max(1, Math.round(cssH * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;

    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${SEA_CONFIG.fontSize}px ${this.fontFamily}`;
    const adv = ctx.measureText("M").width || SEA_CONFIG.fontSize * 0.6;
    this.cellW = Math.max(2, Math.round(adv * this.dpr));
    this.cellH = Math.max(3, Math.round(SEA_CONFIG.fontSize * SEA_CONFIG.lineHeight * this.dpr));
    this.cols = Math.ceil(this.w / this.cellW);
    this.rows = Math.ceil(this.h / this.cellH);

    const gl = this.gl;
    makeTex(gl, this.sceneTex, this.cols, this.rows);
    makeTex(gl, this.sceneTex2, this.cols, this.rows);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.sceneTex2, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    makeTex(gl, this.cellTex, this.cols, this.rows);
    makeTex(gl, this.glyphTex, this.cols, this.rows);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cellFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cellTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.glyphTex, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.buildAtlas();
    this.requestStatic();
  }

  /* ───────────── internals ───────────── */

  private buildAtlas(): void {
    const n = GLYPHS.length;
    const c = document.createElement("canvas");
    c.width = this.cellW * n;
    c.height = this.cellH;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.font = `${SEA_CONFIG.fontSize * this.dpr}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) ctx.fillText(GLYPHS[i], i * this.cellW + this.cellW / 2, this.cellH / 2);

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private addRipple(x: number, z: number, strength: number): void {
    const i = this.ripNext;
    this.rip.set([x, z, this.time, strength], i * 4);
    this.ripNext = (i + 1) % MAX_RIPPLES;
    this.ripN = Math.min(MAX_RIPPLES, this.ripN + 1);
  }

  /** Ray from a CSS-px screen point onto the y = 0 plane → [x, z] or null. */
  private screenToSea(sx: number, sy: number): [number, number] | null {
    const cssW = this.w / this.dpr;
    const cssH = this.h / this.dpr;
    const nx = (sx / cssW) * 2 - 1;
    const ny = 1 - (sy / cssH) * 2;
    const aspect = this.w / Math.max(1, this.h);
    const a = nx * aspect * this.tanHalf;
    const b = ny * this.tanHalf;
    const d: Vec3 = [
      this.right[0] * a + this.up[0] * b + this.fwd[0],
      this.right[1] * a + this.up[1] * b + this.fwd[1],
      this.right[2] * a + this.up[2] * b + this.fwd[2],
    ];
    const below = this.camPos[1] < 0;
    if (below ? d[1] <= 1e-4 : d[1] >= -1e-4) return null;
    const t = this.camPos[1] / -d[1];
    if (t > 200) return null;
    return [this.camPos[0] + d[0] * t, this.camPos[2] + d[2] * t];
  }

  /** Debug: when set, render() syncs after each pass and records its time (ms). */
  profile: { scene: number; trace: number; ascii: number } | null = null;
  private syncPx = new Uint8Array(4);
  private sync(): number {
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.syncPx);
    return performance.now();
  }

  private staticQueued = false;
  private disposed = false;
  /** Reduced motion: re-render once on demand instead of running the loop. */
  private requestStatic(): void {
    if (!this.reduced || this.staticQueued) return;
    this.staticQueued = true;
    requestAnimationFrame(() => {
      this.staticQueued = false;
      if (!this.disposed) this.render(0);
    });
  }

  private frame = (ts: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (this.reduced) return; // driven by requestStatic()
    if (document.hidden) {
      this.lastTs = 0;
      return;
    }
    const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 1 / 60;
    this.lastTs = ts;
    this.adapt(dt);
    this.render(dt);
  };

  /** Adaptive quality: step down if frames stay slow (never steps back up). */
  private adapt(dt: number): void {
    this.frameEma += (dt * 1000 - this.frameEma) * 0.05;
    if (this.frameEma > 24) this.slowFor += dt;
    else this.slowFor = Math.max(0, this.slowFor - dt);
    if (this.slowFor < 1.5) return;
    this.slowFor = 0;
    this.frameEma = 16;
    if (this.dprCap > 1 && this.dpr > 1) {
      this.dprCap = 1;
      this.resize();
    } else if (this.steps > 64) {
      this.steps = 64;
    }
  }

  private updateCamera(dt: number): void {
    const aspect = this.w / Math.max(1, this.h);
    let u: number;
    if (this.reduced) {
      u = nearestRestU(KEYS, this.uTarget);
      this.uSmooth = u;
    } else {
      if (this.first) this.uSmooth = this.uTarget;
      else this.uSmooth += (this.uTarget - this.uSmooth) * (1 - Math.exp(-dt * SEA_CONFIG.scrollFollow));
      u = this.uSmooth;
    }
    const c = sampleCamera(KEYS, u, aspect, this.cam);
    this.applyDetour(c, dt);
    const t = this.time;
    const pos: Vec3 = [c.pos[0], c.pos[1], c.pos[2]];
    let yaw = c.yaw;
    let pitch = c.pitch;
    let roll = c.roll;

    // Hand-held drift (alive while idle).
    if (c.sway > 0 && !this.reduced) {
      pos[0] += c.sway * 0.22 * Math.sin(t * 0.23);
      pos[1] += c.sway * 0.05 * Math.sin(t * 0.41 + 1.3);
      pos[2] += c.sway * 0.3 * Math.sin(t * 0.17 + 0.4);
      yaw += c.sway * 1.4 * Math.sin(t * 0.13 + 2.1);
      pitch += c.sway * 0.6 * Math.sin(t * 0.31);
      roll += c.sway * 1.1 * Math.sin(t * 0.27 + 0.7);
    }
    // Ride the swell: bob up/down and pitch with the wave beneath.
    if (c.ride > 0) {
      const hNow = swellAt(pos[0], pos[2], t);
      if (hNow !== 0) {
        const hAhead = swellAt(pos[0], pos[2] - 1.5, t);
        pos[1] += c.ride * hNow * 0.75;
        pitch += c.ride * (hAhead - hNow) * 6;
        roll += c.ride * 2.5 * Math.sin(t * 0.6);
      }
    }
    // Cursor parallax: look slightly toward the pointer.
    const on = this.pStrength > 0.01;
    const k = Math.min(1, dt * 3);
    this.pnx += ((on ? (this.px / (this.w / this.dpr)) * 2 - 1 : 0) - this.pnx) * k;
    this.pny += ((on ? (this.py / (this.h / this.dpr)) * 2 - 1 : 0) - this.pny) * k;

    const d2r = Math.PI / 180;
    const cy = Math.cos(yaw * d2r);
    const sy = Math.sin(yaw * d2r);
    pitch = Math.max(-90, Math.min(80, pitch));
    const cp = Math.cos(pitch * d2r);
    const sp = Math.sin(pitch * d2r);
    const f: Vec3 = [cp * sy, sp, -cp * cy];
    const r0: Vec3 = [cy, 0, sy];
    const u0: Vec3 = [r0[1] * f[2] - r0[2] * f[1], r0[2] * f[0] - r0[0] * f[2], r0[0] * f[1] - r0[1] * f[0]];
    const cr = Math.cos(roll * d2r);
    const sr = Math.sin(roll * d2r);
    this.right = [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr];
    this.up = [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr];
    this.fwd = f;

    // Parallax as a small sideways shift in the view plane (scaled with altitude).
    const par = Math.min(0.35, Math.abs(pos[1]) * 0.02);
    for (let i = 0; i < 3; i++) pos[i] += (this.right[i] * this.pnx - this.up[i] * this.pny) * par;

    // Camera-relative lights (see the scene shader): key light ahead-left and high, so wave
    // crests rolling toward the camera catch it; low sun straight ahead for the glitter path.
    {
      const fl: Vec3 = [sy, 0, -cy]; // flat forward
      const rt: Vec3 = [cy, 0, sy];
      const L: Vec3 = [fl[0] * 0.6 - rt[0] * 0.5, 0.62, fl[2] * 0.6 - rt[2] * 0.5];
      const ln = Math.hypot(...L);
      this.light = [L[0] / ln, L[1] / ln, L[2] / ln];
      const S: Vec3 = [fl[0] + rt[0] * 0.18, 0.1, fl[2] + rt[2] * 0.18];
      const sn = Math.hypot(...S);
      this.sun = [S[0] / sn, S[1] / sn, S[2] / sn];
      // Accents drift with the dominant wave train under the camera (swell or open sea).
      const sw = REGIONS.reduce((m, r) => (r.swell ? Math.max(m, 1 - Math.min(1, Math.max(0, (Math.hypot(pos[0] - r.center[0], pos[2] - r.center[1]) - r.inner) / (r.outer - r.inner)))) : m), 0);
      const o = OCEAN[0];
      const w = SWELLS[0];
      const vo = o.w / o.k;
      const vs = w.w / w.k;
      this.waveVel = [
        o.d[0] * vo * (1 - sw) + w.d[0] * vs * sw,
        o.d[1] * vo * (1 - sw) + w.d[1] * vs * sw,
      ];
    }

    this.tanHalf = Math.tan((c.fov * d2r) / 2);
    this.prevPos = this.camPos;
    this.camPos = pos;

    // Telemetry
    const tel = this.telemetry;
    const dx = pos[0] - this.prevPos[0];
    const dy = pos[1] - this.prevPos[1];
    const dz = pos[2] - this.prevPos[2];
    const inst = dt > 0 && !this.first ? Math.sqrt(dx * dx + dy * dy + dz * dz) / dt : 0;
    tel.speed += (inst - tel.speed) * Math.min(1, dt * 6);
    tel.u = u;
    tel.pos = pos;
    tel.yaw = ((yaw % 360) + 360) % 360;
    tel.pitch = pitch;
    tel.roll = roll;
    tel.fov = c.fov;
    tel.resting = c.beat >= 0;
    tel.underwater = pos[1] < -0.35;

    // Arrival at a beat: a ripple + a glitch "cut", like a mission card landing.
    const beat = c.beat;
    if (beat >= 0) {
      tel.beat = beat;
      tel.stop = STOPS.findIndex((s) => s.id === BEATS[beat].stop);
    }
    if (beat >= 0 && beat !== this.lastBeat && !this.first && !this.reduced) {
      const hit = this.screenToSea((this.w / this.dpr) / 2, (this.h / this.dpr) * 0.62);
      if (hit && !tel.underwater) this.addRipple(hit[0], hit[1], 1.1);
      this.glitchBurst = 1;
    }
    if (beat >= 0) this.lastBeat = beat;
    // Breaking the surface on the dive: a hard glitch cut.
    if (tel.underwater !== this.wasUnder && !this.first && !this.reduced) this.glitchBurst = 1.4;
    this.wasUnder = tel.underwater;
  }

  /**
   * Waypoint beams, driven by the scroll: while you travel toward a waypoint its beam falls
   * out of the sky (accelerating), strikes the water (ripple + ring of light + flash) as you
   * arrive, stands while you read, and fades once you leave. Only the beams of the waypoint
   * you're heading to / at are drawn, so no section has beams standing in its background.
   */
  private updateBeams(u: number): void {
    const n = BEACONS.length;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const bi = this.beamBeat[i];
      if (bi < 0) continue;
      const w = WINDOWS[bi];
      const a = w.travelFrom + 0.12;
      const b = w.arrive - 0.04;
      const drop = this.reduced ? (u > b - 0.2 && u < w.leave + 0.3 ? 1 : 0) : Math.min(1, Math.max(0, (u - a) / Math.max(0.05, b - a)));
      // Strike: the head reached the water while scrolling forward.
      if (drop >= 1 && this.beamDrop[i] < 1 && !this.first && !this.reduced && u > a) {
        this.beamLand[i] = this.time;
        const [x, z] = BEACONS[i].pos;
        this.addRipple(x, z, 0.85);
        this.imp.set([x, z, this.time, BEACONS[i].color], this.impNext * 4);
        this.impNext = (this.impNext + 1) % 4;
        this.impN = Math.min(4, this.impN + 1);
      }
      this.beamDrop[i] = drop;
      const fadeIn = Math.min(1, Math.max(0, (u - (a - 0.08)) / 0.1));
      const fadeOut = 1 - Math.min(1, Math.max(0, (u - w.leave) / 0.35));
      let str = fadeIn * fadeOut;
      if (str <= 0.001 || drop <= 0) continue;
      const since = this.time - this.beamLand[i];
      str *= 1 + 1.3 * Math.exp(-Math.max(0, since) * 4.5); // flash on the strike
      const fall = drop * drop; // gravity: accelerating
      const bottom = 28 * (1 - fall) - 0.35;
      // A long falling bolt that settles into a short standing beam once it lands.
      const len = drop < 1 ? 10 : 4.5 + 5.5 * Math.exp(-Math.max(0, since) * 2.5);
      const [x, z] = BEACONS[i].pos;
      this.beamA.set([x, z, bottom, Math.min(1.8, str)], k * 4);
      this.beamB.set([BEACONS[i].color, i * 1.7, bottom + len, 0], k * 4);
      k++;
    }
    // A detour's destination gets its own beam, falling as the camera arrives.
    const f = this.detourFocus;
    if (f && this.detourWant && this.detourAmt > 0.25 && k < BEACONS.length) {
      const drop = Math.min(1, (this.detourAmt - 0.25) / 0.73);
      const since = this.detourArrived ? this.time - this.lastDetourStrike() : 99;
      const bottom = 28 * (1 - drop * drop) - 0.35;
      const len = drop < 1 ? 10 : 4.5 + 5.5 * Math.exp(-since * 2.5);
      this.beamA.set([f.x, f.z, bottom, Math.min(1.8, 1 + 1.3 * Math.exp(-since * 4.5))], k * 4);
      this.beamB.set([f.color, 4.2, bottom + len, 0], k * 4);
      k++;
    }
    this.beamN = k;
  }

  private detourStrikeAt = 0;
  private lastDetourStrike(): number {
    return this.detourStrikeAt;
  }

  private applyDetour(c: Camera, dt: number): void {
    const want = this.detourWant;
    if (this.reduced) this.detourAmt = want;
    else {
      this.detourAmt += (want - this.detourAmt) * (1 - Math.exp(-dt * 1.7));
      if (Math.abs(want - this.detourAmt) < 0.002) this.detourAmt = want;
    }
    const d = this.detourShot;
    const a = this.detourAmt;
    if (!d || a <= 0.0005) return;
    const e = a * a * (3 - 2 * a);
    const lerp = (x: number, y: number) => x + (y - x) * e;
    let yaw = d.yaw;
    while (yaw - c.yaw > 180) yaw -= 360;
    while (yaw - c.yaw < -180) yaw += 360;
    // Lift off the path and swoop back down: an arc, not a slide.
    const arc = Math.sin(Math.PI * e) * (want ? 2.6 : 2.0);
    c.pos = [lerp(c.pos[0], d.pos[0]), lerp(c.pos[1], d.pos[1]) + arc, lerp(c.pos[2], d.pos[2])];
    c.yaw = lerp(c.yaw, yaw);
    c.pitch = lerp(c.pitch, d.pitch) - arc * 3;
    c.roll = lerp(c.roll, d.roll) + Math.sin(Math.PI * e) * (want ? -6 : 6);
    c.fov = lerp(c.fov, d.fov);
    for (const k of ["shade", "fog", "ride", "sway", "stars", "ocean", "lit", "chart", "snow"] as const) c[k] = lerp(c[k], d[k]);
    if (a > 0.985 && want && !this.detourArrived) {
      this.detourArrived = true;
      this.detourStrikeAt = this.time;
      const f = this.detourFocus;
      if (f && !this.reduced) {
        this.addRipple(f.x, f.z, 1);
        this.imp.set([f.x, f.z, this.time, f.color], this.impNext * 4);
        this.impNext = (this.impNext + 1) % 4;
        this.impN = Math.min(4, this.impN + 1);
        this.glitchBurst = 0.8;
      }
    }
  }

  private measureQuiet(): void {
    this.quietN = 0;
    if (!this.quietSelector) return;
    const els = document.querySelectorAll<HTMLElement>(this.quietSelector);
    const pad = SEA_CONFIG.quietPad;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const el of els) {
      if (this.quietN >= MAX_QUIET) break;
      const op = parseFloat(getComputedStyle(el).opacity || "1");
      if (op < 0.02) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < -pad || r.top > vh + pad || r.right < -pad || r.left > vw + pad) continue;
      const s = parseFloat(el.dataset.seaQuiet || "") || 0.9;
      const d = this.dpr;
      this.quiet.set([(r.left - pad) * d, (r.top - pad) * d, (r.right + pad) * d, (r.bottom + pad) * d], this.quietN * 4);
      this.quietS[this.quietN] = Math.min(1, s * op);
      this.quietN++;
    }
  }

  private render(dt: number): void {
    const gl = this.gl;
    if (this.disposed || gl.isContextLost()) return;

    if (!this.reduced) {
      this.time += dt;
      this.phase += dt * PHASE_SPEED;
      this.morph += dt * MORPH_SPEED;
      this.flow[0] += dt * FLOW_SPEED[0];
      this.flow[1] += dt * FLOW_SPEED[1];
    }
    // Cursor influence: on while the pointer is in the window and moved recently.
    const want = this.pInside && this.time - this.pLastMove < SEA_CONFIG.pointerIdle ? 1 : 0;
    this.pStrength = this.reduced ? 0 : this.pStrength + (want - this.pStrength) * (1 - Math.exp(-dt * 3));
    if (!this.variantsStarted && (this.time > 1.2 || this.uTarget > 0.02 || this.reduced)) this.startVariants();
    this.pollVariants();
    this.updateCamera(dt);
    this.updateBeams(this.telemetry.u);
    this.measureQuiet();
    this.first = false;

    // Glitch: scales with camera speed (fast flights tear), plus arrival bursts.
    this.glitchBurst = Math.max(0, this.glitchBurst - dt * 3.2);
    const speedGlitch = Math.min(1, Math.max(0, (this.telemetry.speed - 5) / 18));
    const glitch = this.reduced ? 0 : Math.min(1, speedGlitch * 0.45 + this.glitchBurst * 0.55);
    if (this.time - this.seedAt > 0.06) {
      this.seed = Math.random() * 100;
      this.seedAt = this.time;
    }

    const c = this.cam;
    const under = this.telemetry.underwater;
    const rot = new Float32Array([...this.right, ...this.up, ...this.fwd]);

    // Map scanner lens: follows the cursor; wanders by itself on touch screens.
    const cssW = this.w / this.dpr;
    const cssH = this.h / this.dpr;
    let lensStr = 0;
    if (c.chart > 0.001) {
      if (this.pStrength > 0.05) {
        this.lensX = this.px;
        this.lensY = this.py;
        lensStr = this.pStrength;
      } else if (!this.reduced && !window.matchMedia("(hover: hover)").matches) {
        this.lensX = cssW * (0.5 + 0.3 * Math.sin(this.time * 0.21));
        this.lensY = cssH * (0.55 + 0.22 * Math.sin(this.time * 0.33 + 1.1));
        lensStr = 1;
      }
    }

    gl.bindVertexArray(this.vao);

    // ── scene pass (two targets) ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.cols, this.rows);
    gl.disable(gl.BLEND);
    const variant = this.pickVariant(c.ocean, under);
    gl.useProgram(variant.prog);
    const su = variant.u;
    gl.uniform2f(su.uRes, this.w, this.h);
    gl.uniform2f(su.uCell, this.cellW, this.cellH);
    gl.uniform2f(su.uGrid, this.cols, this.rows);
    gl.uniform3f(su.uCamPos, this.camPos[0], this.camPos[1], this.camPos[2]);
    gl.uniformMatrix3fv(su.uCamRot, false, rot);
    gl.uniform1f(su.uTanHalf, this.tanHalf);
    gl.uniform1f(su.uPixAngle, (2 * this.tanHalf) / this.rows);
    gl.uniform1f(su.uShade, c.shade);
    gl.uniform1f(su.uChop, c.shade * 0.3); // texture only: shading exaggerates slopes
    gl.uniform1f(su.uFog, c.fog);
    gl.uniform1f(su.uOcean, c.ocean);
    gl.uniform1f(su.uLit, c.lit);
    gl.uniform1f(su.uChart, c.chart);
    gl.uniform1f(su.uUnder, under ? 1 : 0);
    gl.uniform1f(su.uAccent, 1);
    gl.uniform4f(su.uLens, this.lensX * this.dpr, this.lensY * this.dpr, SEA_CONFIG.lensRadius * this.dpr, lensStr);
    gl.uniform1i(su.uSteps, this.steps);
    const farT = c.fog > 0.0005 ? Math.min(320, 3.2 / c.fog) : 320;
    gl.uniform1f(su.uFarT, farT);
    // Only regions the camera can actually see get evaluated per height sample.
    const reach = under ? 45 : Math.min(farT, 60 + Math.abs(this.camPos[1]) * 3);
    let mask = 0;
    REGIONS.forEach((r, i) => {
      const d = Math.hypot(this.camPos[0] - r.center[0], this.camPos[2] - r.center[1]);
      if (d - r.outer < reach || c.chart > 0.001) mask |= 1 << i;
    });
    gl.uniform1i(su.uRegMask, mask);
    gl.uniform1f(su.uTime, this.time);
    gl.uniform1f(su.uPhase, this.phase);
    gl.uniform1f(su.uMorph, this.morph);
    gl.uniform2f(su.uFlow, this.flow[0], this.flow[1]);
    gl.uniform4fv(su.uRip, this.rip);
    gl.uniform1i(su.uRipN, this.ripN);
    gl.uniform1i(su.uNReg, REGIONS.length);
    gl.uniform1i(su.uThree, 3);
    gl.uniform1i(su.uNTerr, CHART_SITES.length);
    gl.uniform3f(su.uLight, this.light[0], this.light[1], this.light[2]);
    gl.uniform3f(su.uSun, this.sun[0], this.sun[1], this.sun[2]);
    gl.uniform1f(su.uRelief, 3.2);
    gl.uniform2f(su.uWaveVel, this.waveVel[0], this.waveVel[1]);
    // On the chart the beams give way to the territories.
    const beamN = c.chart > 0.5 ? 0 : this.beamN;
    if (su.uBeam) gl.uniform4fv(su.uBeam, this.beamA);
    if (su.uBeamB) gl.uniform4fv(su.uBeamB, this.beamB);
    gl.uniform1i(su.uBeamN, beamN);
    if (su.uImp) gl.uniform4fv(su.uImp, this.imp);
    gl.uniform1i(su.uImpN, this.impN);
    const p0 = this.profile ? this.sync() : 0;
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const p1 = this.profile ? this.sync() : 0;

    // ── trace pass: the contour under the cursor ──
    const traceOn = this.pStrength > 0.02 && !under;
    const tcol = Math.floor((this.px * this.dpr) / this.cellW);
    const trow = Math.floor((this.py * this.dpr) / this.cellH);
    if (traceOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.traceFbo);
      gl.viewport(0, 0, TRACE_N * 2 + 1, 1);
      gl.useProgram(this.traceProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
      gl.uniform1i(this.tu.uScene, 0);
      gl.uniform2f(this.tu.uGrid, this.cols, this.rows);
      gl.uniform2i(this.tu.uPtrCell, tcol, trow);
      gl.uniform1i(this.tu.uN, TRACE_N);
      gl.uniform1i(this.tu.uSearch, 9);
      gl.uniform1i(this.tu.uJump, 4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const p2 = this.profile ? this.sync() : 0;

    // ── resolve pass (per cell): glyph, colour, alpha ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cellFbo);
    gl.viewport(0, 0, this.cols, this.rows);
    gl.useProgram(this.resolveProg);
    const au = this.au;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.uniform1i(au.uScene, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex2);
    gl.uniform1i(au.uScene2, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.traceTex);
    gl.uniform1i(au.uTrace, 3);
    gl.uniform2f(au.uRes, this.w, this.h);
    gl.uniform2f(au.uCell, this.cellW, this.cellH);
    gl.uniform2f(au.uGrid, this.cols, this.rows);
    gl.uniform3fv(au.uLo, this.lo);
    gl.uniform3fv(au.uHi, this.hi);
    gl.uniform2f(au.uRamp, SEA_CONFIG.rampLo, SEA_CONFIG.rampHi);
    gl.uniform3fv(au.uPal, this.pal);
    gl.uniform1f(au.uBright, SEA_CONFIG.brightness);
    gl.uniform1f(au.uGamma, SEA_CONFIG.gamma);
    gl.uniform1f(au.uGain, this.gain);
    gl.uniform3f(au.uPointer, this.px * this.dpr, this.py * this.dpr, this.pStrength);
    gl.uniform1f(au.uPointerR, SEA_CONFIG.pointerRadius * this.dpr);
    gl.uniform1f(au.uGlow, SEA_CONFIG.pointerGlow);
    gl.uniform2i(au.uTraceSeed, traceOn ? tcol : -1, trow);
    gl.uniform1f(au.uTraceStr, traceOn ? this.pStrength : 0);
    gl.uniform1i(au.uTraceN, TRACE_N);
    gl.uniform1f(au.uGlitch, glitch);
    gl.uniform1f(au.uSeed, this.seed);
    gl.uniform1f(au.uStars, c.stars);
    gl.uniform1f(au.uSnow, under ? Math.max(0.6, c.snow) : c.snow * 0.3);
    gl.uniform1f(au.uTopDown, c.pitch < -60 ? 1 : 0);
    gl.uniform1f(au.uTime, this.time);
    gl.uniform4fv(au.uQuiet, this.quiet);
    gl.uniform1fv(au.uQuietS, this.quietS);
    gl.uniform1i(au.uQuietN, this.quietN);
    gl.uniform1f(au.uQuietFeather, SEA_CONFIG.quietFeather * this.dpr);
    gl.uniform1f(au.uOceanAmt, c.ocean);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ── glyph pass (per pixel): stamp the atlas ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.glyphProg);
    const gu = this.gu;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.cellTex);
    gl.uniform1i(gu.uCells, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTex);
    gl.uniform1i(gu.uGlyphs, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(gu.uAtlas, 2);
    gl.uniform2f(gu.uRes, this.w, this.h);
    gl.uniform2f(gu.uCell, this.cellW, this.cellH);
    gl.uniform2f(gu.uGrid, this.cols, this.rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.profile) {
      const p3 = this.sync();
      const k = 0.2;
      this.profile.scene += (p1 - p0 - this.profile.scene) * k;
      this.profile.trace += (p2 - p1 - this.profile.trace) * k;
      this.profile.ascii += (p3 - p2 - this.profile.ascii) * k;
    }
    gl.bindVertexArray(null);
  }

  /** Debug: the cursor contour trace path (row per column offset, -1 = none). */
  debugTrace(): number[] {
    const gl = this.gl;
    const n = TRACE_N * 2 + 1;
    const px = new Uint8Array(n * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.traceFbo);
    gl.readPixels(0, 0, n, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(px[i * 4 + 2] > 127 ? px[i * 4] * 256 + px[i * 4 + 1] : -1);
    return out;
  }

  /**
   * Debug: the final frame as text, one char per sampled cell (what is actually drawn).
   * mode "glyph": the glyph itself (grey), "L" lime, "O" orange accent cells.
   * mode "alpha": 0-9 brightness, letters for accents (l/L lime, o/O orange by brightness).
   * Stats: visible fraction, mean / std alpha, accent fractions.
   */
  debugCells(stepX = 2, stepY = 1, mode: "glyph" | "alpha" | "raw" = "glyph"): { text: string; stats: Record<string, number> } {
    const gl = this.gl;
    const n = this.cols * this.rows * 4;
    const col = new Uint8Array(n);
    const gly = new Uint8Array(n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cellFbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, col);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, gly);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const st = { vis: 0, mean: 0, std: 0, lime: 0, orange: 0, n: 0 };
    let s2 = 0;
    let text = "";
    for (let r = 0; r < this.rows; r += stepY) {
      let line = "";
      for (let c = 0; c < this.cols; c += stepX) {
        const i = ((this.rows - 1 - r) * this.cols + c) * 4;
        const a = col[i + 3] / 255;
        const R = col[i], G = col[i + 1], B = col[i + 2];
        const g = gly[i];
        st.n++;
        st.mean += a;
        s2 += a * a;
        if (a <= 0.003 || g === 0) {
          line += " ";
          continue;
        }
        st.vis++;
        const sat = Math.max(R, G, B) - Math.min(R, G, B);
        const lime = sat > 40 && G >= R && G > B;
        const orng = sat > 40 && R > G && G > B;
        if (lime) st.lime++;
        if (orng) st.orange++;
        if (mode === "raw") line += GLYPHS[g] ?? "?";
        else if (mode === "glyph") line += lime ? "L" : orng ? "O" : GLYPHS[g] ?? "?";
        else if (lime) line += a > 0.5 ? "L" : "l";
        else if (orng) line += a > 0.5 ? "O" : "o";
        else line += String(Math.min(9, Math.floor(a * 10)));
      }
      text += line + "\n";
    }
    st.mean /= st.n;
    st.std = Math.sqrt(Math.max(0, s2 / st.n - st.mean * st.mean));
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(st)) stats[k] = k === "n" ? v : +(k === "mean" || k === "std" ? v : v / st.n).toFixed(3);
    return { text, stats };
  }

  /**
   * Debug: read the scene target back as text, one char per sampled cell —
   * band glyph from the ramp, "~" sky (or "-" horizon glow), "L"/"O" lime/orange
   * accent patches on band edges, "@" specular, "|" beacon. Plus a histogram.
   * mode "alpha" shows final brightness instead of the band.
   */
  debugDump(stepX = 4, stepY = 2, mode: "band" | "alpha" = "band"): { text: string; stats: Record<string, number> } {
    const gl = this.gl;
    const px = new Uint8Array(this.cols * this.rows * 4);
    const px2 = new Uint8Array(this.cols * this.rows * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, px2);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const ramp = " .:-=+*#";
    const stats: Record<string, number> = { sky: 0, lime: 0, orange: 0, spec: 0, beacon: 0, region: 0, grid: 0, inten: 0, n: 0 };
    const band = (c: number, r: number) => {
      const i = ((this.rows - 1 - r) * this.cols + c) * 4;
      return px[i + 1] === 255 ? -1 : Math.round((px[i] / 255) * 7);
    };
    let text = "";
    for (let r = 0; r < this.rows; r += stepY) {
      let line = "";
      for (let c = 0; c < this.cols; c += stepX) {
        const i = ((this.rows - 1 - r) * this.cols + c) * 4;
        const g = px[i + 1];
        stats.n++;
        if (px2[i] > 140) {
          stats.beacon++;
          line += "|";
          continue;
        }
        if (g === 255) {
          stats.sky++;
          line += px[i + 2] > 10 ? "-" : "~";
          continue;
        }
        const b = band(c, r);
        stats["b" + b] = (stats["b" + b] ?? 0) + 1;
        stats.inten += px[i + 3] / 255;
        if (px2[i + 2] > 0) stats.region++;
        if (px2[i + 3] > 127) stats.grid++;
        const edge = b > 0 && (band(c, Math.max(0, r - 1)) !== b || band(c, Math.min(this.rows - 1, r + 1)) !== b);
        const lime = (g >> 4) / 14;
        const orng = (g & 15) / 15;
        if (px[i + 2] > 127) {
          stats.spec++;
          line += "@";
        } else if (edge && lime > 0.35 && b >= 5) {
          stats.lime++;
          line += "L";
        } else if (edge && orng > 0.35 && b >= 2 && b <= 5) {
          stats.orange++;
          line += "O";
        } else if (mode === "alpha") {
          const a = b <= 0 ? 0 : Math.pow(b / 7, SEA_CONFIG.gamma) * SEA_CONFIG.brightness * (px[i + 3] / 255);
          line += " .,:;-=+*#%@"[Math.min(11, Math.round((a * 11) / 0.75))] ?? "@";
        } else line += ramp[b];
      }
      text += line + "\n";
    }
    stats.inten = +(stats.inten / Math.max(1, stats.n - stats.sky)).toFixed(3);
    return { text, stats };
  }
}

/** Where a beat's rest begins (vh); used by HUD jump links. */
export { stopArriveU } from "./journey";
