/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: engine (framework-agnostic, one WebGL2 canvas)
 *
 *  Per frame:
 *    1. Advance time / plasma phase / flow (same rates as the old field).
 *    2. Ease the scroll position, sample the camera timeline, add
 *       hand-held sway, swell riding and cursor parallax.
 *    3. Scene pass → cols×rows RGBA8 target (one texel per glyph).
 *    4. ASCII pass → canvas (glyph atlas lookup + colour).
 * ─────────────────────────────────────────────────────────────
 */

import { ASCII_FS, MAX_QUIET, MAX_RIPPLES, SCENE_FS, VS } from "./shaders";
import { KEYS, newCamera, nearestRestU, sampleCamera, type Camera, type Vec3 } from "./timeline";
import { FLOW_SPEED, MORPH_SPEED, PHASE_SPEED, swellHeight, swellWeight } from "./world";

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
  stop: number;
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

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const ascii = (s: string) => s.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, ascii(src));
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Sea shader compile failed: " + log);
    }
    return sh;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Sea link failed: " + gl.getProgramInfoLog(p));
  return p;
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

export type SeaEngineOptions = {
  fontFamily?: string;
  reducedMotion?: boolean;
  /** Elements whose rect dims the field behind them (attribute value = strength, default 0.9). */
  quietSelector?: string;
};

export class SeaEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private sceneProg!: WebGLProgram;
  private asciiProg!: WebGLProgram;
  private su!: Uniforms;
  private au!: Uniforms;
  private vao!: WebGLVertexArrayObject;
  private sceneTex!: WebGLTexture;
  private fbo!: WebGLFramebuffer;
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
  private lastStop = 0;

  // pointer
  private px = -1;
  private py = -1;
  private pStrength = 0;
  private pTarget = 0;
  private pnx = 0; // smoothed, -1..1
  private pny = 0;

  // ripples [x, z, t0, strength] ×N
  private rip = new Float32Array(MAX_RIPPLES * 4);
  private ripN = 0;
  private ripNext = 0;

  // quiet zones
  private quiet = new Float32Array(MAX_QUIET * 4);
  private quietS = new Float32Array(MAX_QUIET);
  private quietN = 0;

  readonly telemetry: Telemetry = { u: 0, pos: [0, 0, 0], yaw: 0, pitch: -90, roll: 0, fov: 30, speed: 0, stop: 0 };

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
    this.sceneProg = compile(gl, VS, SCENE_FS);
    this.asciiProg = compile(gl, VS, ASCII_FS);
    this.su = uniforms(gl, this.sceneProg);
    this.au = uniforms(gl, this.asciiProg);
    this.vao = gl.createVertexArray()!;
    this.sceneTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.atlasTex = gl.createTexture()!;
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
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    const gl = this.gl;
    gl.deleteProgram(this.sceneProg);
    gl.deleteProgram(this.asciiProg);
    gl.deleteTexture(this.sceneTex);
    gl.deleteTexture(this.atlasTex);
    gl.deleteFramebuffer(this.fbo);
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

  setPointer(x: number, y: number): void {
    this.px = x;
    this.py = y;
    this.pTarget = 1;
  }

  clearPointer(): void {
    this.pTarget = 0;
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

  /** Camera sample at an arbitrary scroll position (for drawing the flight path). */
  cameraAt(u: number): Camera {
    return sampleCamera(u, this.w / Math.max(1, this.h), newCamera());
  }

  get backend(): string {
    return "webgl2";
  }

  /**
   * Debug: read the scene target back as text, one char per sampled cell —
   * band glyph from the ramp, "~" sky (or "-" horizon glow), "L"/"O" lime/orange
   * accent patches on band edges, "@" specular. Plus a histogram.
   */
  debugDump(stepX = 4, stepY = 2, mode: "band" | "alpha" = "band"): { text: string; stats: Record<string, number> } {
    const gl = this.gl;
    const px = new Uint8Array(this.cols * this.rows * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const ramp = " .:-=+*#";
    const stats: Record<string, number> = { sky: 0, lime: 0, orange: 0, spec: 0, inten: 0, n: 0 };
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
        if (g === 255) {
          stats.sky++;
          line += px[i + 2] > 10 ? "-" : "~";
          continue;
        }
        const b = band(c, r);
        stats["b" + b] = (stats["b" + b] ?? 0) + 1;
        stats.inten += px[i + 3] / 255;
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
          line += " .,:;-=+*#%@"[Math.min(11, Math.round(a * 11 / 0.75))] ?? "@";
        } else line += ramp[b];
      }
      text += line + "\n";
    }
    stats.inten = +(stats.inten / Math.max(1, stats.n - stats.sky)).toFixed(3);
    return { text, stats };
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
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0);
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
    if (d[1] >= -1e-4) return null;
    const t = this.camPos[1] / -d[1];
    if (t > 200) return null;
    return [this.camPos[0] + d[0] * t, this.camPos[2] + d[2] * t];
  }

  private staticQueued = false;
  /** Reduced motion: re-render once on demand instead of running the loop. */
  private requestStatic(): void {
    if (!this.reduced || this.staticQueued) return;
    this.staticQueued = true;
    requestAnimationFrame(() => {
      this.staticQueued = false;
      this.render(0);
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
    } else if (this.steps > 60) {
      this.steps = 60;
    }
  }

  private updateCamera(dt: number): void {
    const aspect = this.w / Math.max(1, this.h);
    let u: number;
    if (this.reduced) {
      u = nearestRestU(this.uTarget);
      this.uSmooth = u;
    } else {
      if (this.first) this.uSmooth = this.uTarget;
      else this.uSmooth += (this.uTarget - this.uSmooth) * (1 - Math.exp(-dt * SEA_CONFIG.scrollFollow));
      u = this.uSmooth;
    }
    const c = sampleCamera(u, aspect, this.cam);
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
      const sw = swellWeight(pos[0], pos[2]) * c.ride;
      if (sw > 0) {
        const hNow = swellHeight(pos[0], pos[2], t);
        const hAhead = swellHeight(pos[0], pos[2] - 1.5, t);
        pos[1] += sw * hNow * 0.75;
        pitch += sw * (hAhead - hNow) * 6;
        roll += sw * 2.5 * Math.sin(t * 0.6);
      }
    }
    // Cursor parallax: look slightly toward the pointer.
    this.pnx += ((this.pStrength > 0 ? (this.px / (this.w / this.dpr)) * 2 - 1 : 0) - this.pnx) * Math.min(1, dt * 3);
    this.pny += ((this.pStrength > 0 ? (this.py / (this.h / this.dpr)) * 2 - 1 : 0) - this.pny) * Math.min(1, dt * 3);

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
    const par = Math.min(0.35, pos[1] * 0.02);
    for (let i = 0; i < 3; i++) pos[i] += (this.right[i] * this.pnx - this.up[i] * this.pny) * par;

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

    // Stop arrival: a ripple + a glitch "cut", like a mission card landing.
    const stop = c.stop;
    tel.stop = stop >= 0 ? stop : tel.stop;
    if (stop >= 0 && stop !== this.lastStop && !this.first) {
      const hit = this.screenToSea((this.w / this.dpr) / 2, (this.h / this.dpr) * 0.62);
      if (hit && !this.reduced) this.addRipple(hit[0], hit[1], 1.1);
      if (!this.reduced) this.glitchBurst = 1;
    }
    if (stop >= 0) this.lastStop = stop;
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
    if (gl.isContextLost()) return;

    if (!this.reduced) {
      this.time += dt;
      this.phase += dt * PHASE_SPEED;
      this.morph += dt * MORPH_SPEED;
      this.flow[0] += dt * FLOW_SPEED[0];
      this.flow[1] += dt * FLOW_SPEED[1];
    }
    this.pStrength += (this.pTarget - this.pStrength) * Math.min(1, dt * 5);
    this.updateCamera(dt);
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
    const rot = new Float32Array([...this.right, ...this.up, ...this.fwd]);

    // ── scene pass ──
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.cols, this.rows);
    gl.disable(gl.BLEND);
    gl.useProgram(this.sceneProg);
    const su = this.su;
    gl.uniform2f(su.uRes, this.w, this.h);
    gl.uniform2f(su.uCell, this.cellW, this.cellH);
    gl.uniform2f(su.uGrid, this.cols, this.rows);
    gl.uniform3f(su.uCamPos, this.camPos[0], this.camPos[1], this.camPos[2]);
    gl.uniformMatrix3fv(su.uCamRot, false, rot);
    gl.uniform1f(su.uTanHalf, this.tanHalf);
    gl.uniform1f(su.uPixAngle, (2 * this.tanHalf) / this.rows);
    gl.uniform1f(su.uShade, c.shade);
    gl.uniform1f(su.uChop, c.shade);
    gl.uniform1f(su.uAccent, 1 - c.contour * 0.7);
    gl.uniform1f(su.uFog, c.fog);
    gl.uniform1i(su.uSteps, this.steps);
    gl.uniform1f(su.uTime, this.time);
    gl.uniform1f(su.uPhase, this.phase);
    gl.uniform1f(su.uMorph, this.morph);
    gl.uniform2f(su.uFlow, this.flow[0], this.flow[1]);
    gl.uniform4fv(su.uRip, this.rip);
    gl.uniform1i(su.uRipN, this.ripN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ── ASCII pass ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.asciiProg);
    const au = this.au;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.uniform1i(au.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(au.uAtlas, 1);
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
    gl.uniform3f(au.uPointer, this.px * this.dpr, this.py * this.dpr, this.reduced ? 0 : this.pStrength);
    gl.uniform1f(au.uPointerR, SEA_CONFIG.pointerRadius * this.dpr);
    gl.uniform1f(au.uGlow, SEA_CONFIG.pointerGlow);
    gl.uniform1f(au.uGlitch, glitch);
    gl.uniform1f(au.uSeed, this.seed);
    gl.uniform1f(au.uStars, c.stars);
    gl.uniform1f(au.uContour, c.contour);
    gl.uniform1f(au.uTime, this.time);
    gl.uniform4fv(au.uQuiet, this.quiet);
    gl.uniform1fv(au.uQuietS, this.quietS);
    gl.uniform1i(au.uQuietN, this.quietN);
    gl.uniform1f(au.uQuietFeather, SEA_CONFIG.quietFeather * this.dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}

/** Where each stop's rest window begins, in viewport heights (for HUD jump links). */
export function stopStartU(stop: number): number {
  const k = KEYS.find((k) => k.stop === stop);
  return k ? k.at : 0;
}
