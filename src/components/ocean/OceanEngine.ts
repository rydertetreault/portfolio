/**
 * OceanEngine: WebGL2 renderer for the ocean (see shaders.ts for the two passes).
 * Framework-agnostic: OceanCanvas.tsx feeds it scroll, theme, quiet zones and size.
 */
import { BUBBLES, BUBBLE_FS, BUBBLE_VS, DEEP_FS, FADE_FS, MAX_PROBE, PROBE_FS, MAX_ISLE, MAX_QUIET, NLEV, QUAD_VS, SKY_FS, SURFACE_FS, fieldFS, surfaceVS } from "./shaders";
import { CHAIN, ISLANDS, ISLE_COUNT, FLOW_SPEED, isleCentre, isleSeed, BUBBLE_GLYPHS, RAY_GLYPHS, FONT_SIZE, GLYPHS, LINE_HEIGHT, MORPH_SPEED, PHASE_SPEED, PLASMA_AMP, SUN_GLYPHS, SPAN, swellAt, whirlH } from "./world";
import { sampleCamera, type Camera } from "./timeline";
import { ALL_PROJECTS, KEYS, SUN_DIR, eventsAt, type Events } from "./route";

type Uniforms = Record<string, WebGLUniformLocation | null>;

/**
 * Compile + link without asking how it went: asking blocks until the driver is done, and on some
 * (ANGLE / D3D) the big field shader takes seconds. With KHR_parallel_shader_compile it then
 * compiles off the main thread; `ready` polls it, `finish` checks the result.
 */
function startCompile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, "aGrid");
  gl.linkProgram(p);
  return p;
}

const COMPLETION_STATUS_KHR = 0x91b1;

type FullPrograms = {
  field: WebGLProgram;
  surf: WebGLProgram;
  sky: WebGLProgram;
  form: WebGLProgram;
  probe: WebGLProgram;
  deep: WebGLProgram;
  bubble: WebGLProgram;
};

/**
 * Programs per GL context. The canvas (and its context) outlives an engine: React StrictMode
 * (dev) and hot reloads mount a second engine on it straight away. Without this each one
 * compiled the ocean again, and the second compile queued behind the first, stalling the
 * opening field for seconds. Programs are never deleted; they live as long as the context.
 */
const PROGRAMS = new WeakMap<
  WebGL2RenderingContext,
  { lite?: [WebGLProgram, WebGLProgram]; full?: FullPrograms; done?: boolean; failed?: boolean }
>();

function finish(gl: WebGL2RenderingContext, p: WebGLProgram): WebGLProgram {
  const shaders = gl.getAttachedShaders(p) ?? [];
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const bad = shaders.find((s) => !gl.getShaderParameter(s, gl.COMPILE_STATUS));
    throw new Error((bad ? gl.getShaderInfoLog(bad) : gl.getProgramInfoLog(p)) ?? "shader");
  }
  shaders.forEach((s) => {
    gl.detachShader(p, s);
    gl.deleteShader(s);
  });
  return p;
}

const compile = (gl: WebGL2RenderingContext, vs: string, fs: string) => finish(gl, startCompile(gl, vs, fs));

function uniforms(gl: WebGL2RenderingContext, p: WebGLProgram): Uniforms {
  const u: Uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!;
    const name = info.name.replace(/\[0\]$/, "");
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return u;
}

function parseColor(c: string): [number, number, number] {
  const m = c.trim().match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const r = c.match(/rgba?\(([^)]+)\)/);
  if (r) {
    const [a, b, d] = r[1].split(",").map((x) => parseFloat(x) / 255);
    return [a, b, d];
  }
  return [0.5, 0.5, 0.5];
}

/* ── tiny mat4 (column-major) ── */
type M4 = Float32Array;
function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}
function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

export type Quiet = { x0: number; y0: number; x1: number; y1: number; a: number };

export class OceanEngine {
  private gl: WebGL2RenderingContext;
  private fieldProg: WebGLProgram;
  private surfProg: WebGLProgram;
  /** Compiled after the first frame (see `full`); null until then. */
  private skyProg: WebGLProgram | null = null;
  private deepProg: WebGLProgram | null = null;
  private bubbleProg: WebGLProgram | null = null;
  private du: Uniforms = {};
  private bu: Uniforms = {};
  private emptyVao: WebGLVertexArrayObject;
  private formProg: WebGLProgram | null = null;
  private probeProg: WebGLProgram | null = null;
  /** The full programs, compiling in the background while the lite field shows the Origin. */
  private full: FullPrograms | null = null;
  private programs: NonNullable<ReturnType<typeof PROGRAMS.get>>;
  private fullReady = false;
  private parallel = false;
  private frames = 0;
  private t0 = performance.now();
  private pu: Uniforms = {};
  private probePts: WebGLTexture;
  private probeTex: WebGLTexture;
  private probeFbo: WebGLFramebuffer;
  /** Two read buffers used in turn, so a buffer is never written while its readback is pending. */
  private probePbo: WebGLBuffer[] = [];
  private probeFence: (WebGLSync | null)[] = [null, null];
  private probeNs = [0, 0];
  private probeNext = 0;
  private probeReq: Float32Array | null = null;
  private probeOut = new Float32Array(MAX_PROBE * 4);
  /** Water heights at the last requested probe points (one frame behind), or null. */
  probeHeights: Float32Array | null = null;
  private mu: Uniforms = {};
  private fu: Uniforms = {};
  private su: Uniforms = {};
  private ku: Uniforms = {};
  private fieldTex: WebGLTexture;
  private fbo: WebGLFramebuffer;
  private glyphS: WebGLTexture;
  private glyphL: WebGLTexture;
  private vao: WebGLVertexArrayObject;
  private nIdx = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private dead = false;

  private dpr = 1;
  private w = 1; // device px
  private h = 1;
  private cssW = 1;
  private cellW = 5; // native glyph cell, device px
  private cellH = 10;
  private cell: [number, number] = [0.04, 0.08]; // level-0 cell, world
  private texW = 512;
  private texH = 256;
  private texAlloc: [number, number] = [0, 0];
  private font = "ui-monospace, monospace";

  private time = 0;
  private phase = 0;
  private morph = 0;
  private flow: [number, number] = [0, 0];
  private whirlPhase = 0;
  /** Hovered project's island (-1 = none). */
  isleHi = -1;
  private u = 0; // smoothed scroll (viewport heights)
  private uTarget = 0;
  private reduced = false;

  private bg: [number, number, number] = [0.92, 0.92, 0.92];
  private lo: [number, number, number] = [0.4, 0.4, 0.4];
  private hi: [number, number, number] = [0.07, 0.07, 0.07];
  private acc = new Float32Array(12 * 3).fill(0.5);
  private gain = 1;
  private quiet: Quiet[] = [];

  /** Called every frame with the camera's (smoothed) scroll position. */
  onFrame: ((u: number) => void) | null = null;
  /** Text rects to keep readable (CSS px), polled every frame. */
  quietSource: (() => Quiet[]) | null = null;

  /** Ask for the water's height at these world points (x, z pairs); read probeHeights later. */
  probe(xz: Float32Array | null): void {
    this.probeReq = xz;
  }

  /** Collect any finished probe readbacks, then queue this frame's into a free buffer. */
  private runProbe(ev: Events): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      const f = this.probeFence[i];
      if (!f) continue;
      if (gl.getSyncParameter(f, gl.SYNC_STATUS) !== gl.SIGNALED) continue;
      gl.deleteSync(f);
      this.probeFence[i] = null;
      const n = this.probeNs[i];
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.probePbo[i]);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.probeOut);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const h = this.probeHeights && this.probeHeights.length === n ? this.probeHeights : new Float32Array(n);
      for (let j = 0; j < n; j++) h[j] = this.probeOut[j * 4];
      this.probeHeights = h;
    }
    const req = this.probeReq;
    const slot = this.probeNext;
    if (!this.probeProg || !req || req.length < 2 || this.probeFence[slot]) return; // not compiled yet, nothing asked, or both in flight
    const n = Math.min(MAX_PROBE, req.length >> 1);
    gl.bindTexture(gl.TEXTURE_2D, this.probePts);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, 1, gl.RG, gl.FLOAT, req.subarray(0, n * 2));
    gl.useProgram(this.probeProg);
    this.setFieldUniforms(this.pu, ev);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.probePts);
    gl.uniform1i(this.pu.uPts, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.probeFbo);
    gl.viewport(0, 0, n, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.probePbo[slot]);
    gl.readPixels(0, 0, n, 1, gl.RGBA, gl.FLOAT, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.probeFence[slot] = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this.probeNs[slot] = n;
    this.probeNext = 1 - slot;
    gl.flush();
  }

  /** Island close-up (Projects): the camera leaves the route and flies to this shot. */
  private focusShot: Camera | null = null;
  private focusAmt = 0;
  private focusOn = false;

  /** All projects: the camera leaves the route for an aerial view of both chains, which rise. */
  private allOn = false;
  /** 0..1 how far the camera has gone to the all-projects view (eased). */
  allAmt = 0;
  /** Seconds into the chains' rise (runs back down, faster, on the way out). */
  private allT = 0;
  /** Projects in each chain (Professional, Personal). */
  chainN: number[] = [0, 0];
  /** Each island's rise this frame (0 = under the sea, 1 = formed), in isleCentre order. */
  isleRise = new Float32Array(ISLE_COUNT);

  setAll(on: boolean): void {
    this.allOn = on;
  }

  /** Fly to island k's close-up, or back (null). */
  setFocus(k: number | null): void {
    if (k === null) {
      this.focusOn = false;
      return;
    }
    const c = isleCentre(k, this.chainN);
    // From the south-east, turned so the whole island sits left of centre; its details are on the right.
    this.focusShot = { pos: [c[0] + 5.5, 7, c[1] + 12], yaw: -8, pitch: -26, roll: 0, fov: 50, amp: 1, fog: 80, glyph: 1.05 };
    this.focusOn = true;
  }

  /** Debug: fixed camera instead of the route. */
  debugCam: Camera | null = null;

  /** This frame's view-projection and events (for overlays that sit in the world). */
  private vp: Float32Array = new Float32Array(16);
  ev: Events | null = null;

  /** World point → CSS px (x, y) and view depth; null when behind the camera. */
  project(p: [number, number, number]): [number, number, number] | null {
    const m = this.vp;
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    if (w < 0.05) return null;
    return [((x / w) * 0.5 + 0.5) * this.cssW, (0.5 - (y / w) * 0.5) * (this.h / this.dpr), w];
  }

  /** Last camera (for debugging / tests). */
  cam: Camera | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("float render targets unavailable");
    this.gl = gl;
    // The Origin has no water events, so the first frames use a lite field (just the plasma),
    // which compiles fast; the full ocean compiles in the background (startFull / pollFull).
    const programs = PROGRAMS.get(gl) ?? {};
    PROGRAMS.set(gl, programs);
    this.programs = programs;
    this.parallel = !!gl.getExtension("KHR_parallel_shader_compile");
    if (programs.done && programs.full) {
      // A remount: the full ocean is already compiled.
      this.full = programs.full;
      this.fieldProg = programs.full.field;
      this.surfProg = programs.full.surf;
      this.adoptFull();
    } else {
      programs.lite ??= [compile(gl, QUAD_VS, fieldFS(true)), compile(gl, surfaceVS(true), SURFACE_FS)];
      [this.fieldProg, this.surfProg] = programs.lite;
      this.fu = uniforms(gl, this.fieldProg);
      this.su = uniforms(gl, this.surfProg);
      if (programs.failed) this.fullReady = true;
      else if (this.parallel) this.startFull();
    }
    this.probePts = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.probePts);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, MAX_PROBE, 1, 0, gl.RG, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.probeTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.probeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAX_PROBE, 1, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.probeFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.probeFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.probeTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let i = 0; i < 2; i++) {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, MAX_PROBE * 16, gl.STREAM_READ);
      this.probePbo.push(b);
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.fieldTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.glyphS = gl.createTexture()!;
    this.glyphL = gl.createTexture()!;
    this.vao = this.buildMesh(220);
    this.emptyVao = gl.createVertexArray()!;
  }

  /* ── setup ── */

  private buildMesh(n: number): WebGLVertexArrayObject {
    const gl = this.gl;
    const pos = new Float32Array(n * n * 2);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        pos[(j * n + i) * 2] = (i / (n - 1)) * 2 - 1;
        pos[(j * n + i) * 2 + 1] = (j / (n - 1)) * 2 - 1;
      }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let k = 0;
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i;
        idx.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], k);
        k += 6;
      }
    this.nIdx = idx.length;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return vao;
  }

  /** Glyph atlas (one layer per band, then the sun's brightest glyphs) at `cw × ch` px. */
  private buildGlyphs(tex: WebGLTexture, cw: number, ch: number): void {
    const gl = this.gl;
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    const all = [...GLYPHS, ...SUN_GLYPHS, ...BUBBLE_GLYPHS, ...RAY_GLYPHS];
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R8, cw, ch, all.length, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const data = new Uint8Array(cw * ch);
    all.forEach((g, i) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "#fff";
      ctx.font = `${(ch / LINE_HEIGHT).toFixed(2)}px ${this.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(g, cw / 2, ch / 2);
      const px = ctx.getImageData(0, 0, cw, ch).data;
      for (let p = 0; p < cw * ch; p++) data[p] = px[p * 4 + 3];
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, cw, ch, 1, gl.RED, gl.UNSIGNED_BYTE, data);
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  }

  setFont(f: string): void {
    this.font = f;
    this.resize(true);
  }

  setColors(bg: string, lo: string, hi: string, gain: number, accents: string[]): void {
    accents.forEach((c, i) => this.acc.set(parseColor(c), i * 3));
    this.bg = parseColor(bg);
    this.lo = parseColor(lo);
    this.hi = parseColor(hi);
    this.gain = gain;
  }

  setReducedMotion(r: boolean): void {
    this.reduced = r;
  }

  /** 0..1 a cut through black (Back to the surface). */
  private flash = 0;

  /** To a stop without flying the route in between: cut through black. */
  jumpTo(u: number): void {
    this.uTarget = u;
    this.u = u;
    this.flash = 1;
  }

  setScroll(u: number): void {
    this.uTarget = u;
  }

  /** Jump without easing (initial load, deep links). */
  snap(): void {
    this.u = this.uTarget;
  }

  setQuiet(q: Quiet[]): void {
    this.quiet = q.slice(0, MAX_QUIET);
  }

  resize(force = false): void {
    if (this.dead) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // as the live field (perf.maxDevicePixelRatio)
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (!force && w === this.w && h === this.h && dpr === this.dpr) return;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.cssW = cssW;
    this.canvas.width = w;
    this.canvas.height = h;

    // Native glyph cell, exactly like the live field (integer device px).
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${FONT_SIZE}px ${this.font}`;
    const adv = ctx.measureText("M").width || FONT_SIZE * 0.6;
    this.cellW = Math.max(2, Math.round(adv * dpr));
    this.cellH = Math.max(3, Math.round(FONT_SIZE * LINE_HEIGHT * dpr));
    // The Origin spans SPAN units across the screen, so one cell is:
    const cw = (SPAN * this.cellW) / w;
    this.cell = [cw, (cw * this.cellH) / this.cellW];

    // Field texture: enough level-0 cells to cover the Origin screen, with margin.
    const cols = Math.ceil(w / this.cellW);
    const rows = Math.ceil(h / this.cellH);
    this.texW = Math.min(1024, Math.ceil((Math.max(cols, rows * 2) * 1.6) / 16) * 16);
    this.texH = Math.min(1024, Math.max(Math.ceil((this.texW * this.cell[0]) / this.cell[1] / 16) * 16, Math.ceil(rows * 1.3)));
    const gl = this.gl;
    if (this.texAlloc[0] !== this.texW || this.texAlloc[1] !== this.texH) {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.fieldTex);
      gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA16F, this.texW, this.texH, NLEV, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.texAlloc = [this.texW, this.texH];
    }
    this.buildGlyphs(this.glyphS, this.cellW, this.cellH);
    const LH = 64;
    this.buildGlyphs(this.glyphL, Math.round((LH * this.cellW) / this.cellH), LH);
    if (!this.running) this.frame(performance.now());
  }

  start(): void {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.frame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private startFull(): void {
    const gl = this.gl;
    this.full = this.programs.full ??= {
      field: startCompile(gl, QUAD_VS, fieldFS()),
      surf: startCompile(gl, surfaceVS(), SURFACE_FS),
      sky: startCompile(gl, QUAD_VS, SKY_FS),
      form: startCompile(gl, QUAD_VS, FADE_FS),
      probe: startCompile(gl, QUAD_VS, PROBE_FS),
      deep: startCompile(gl, QUAD_VS, DEEP_FS),
      bubble: startCompile(gl, BUBBLE_VS, BUBBLE_FS),
    };
  }

  /** Swap the full programs in once they're compiled (without the extension: after frame 2, blocking once). */
  private pollFull(): void {
    if (this.fullReady) return;
    const gl = this.gl;
    if (!this.full) {
      if (this.frames < 2) return;
      this.startFull();
    }
    const f = this.full!;
    const all = Object.values(f);
    if (this.parallel && !all.every((p) => gl.getProgramParameter(p, COMPLETION_STATUS_KHR))) return;
    try {
      all.forEach((p) => finish(gl, p));
    } catch (e) {
      console.warn("[ocean] full shaders failed; staying on the lite field", e);
      this.fullReady = true;
      this.programs.failed = true;
      return;
    }
    this.programs.done = true;
    this.programs.lite?.forEach((p) => gl.deleteProgram(p));
    this.programs.lite = undefined;
    this.adoptFull();
    if (process.env.NODE_ENV !== "production") {
      console.info(`[ocean] full shaders ready ${Math.round(performance.now() - this.t0)} ms after start (parallel compile: ${this.parallel})`);
    }
  }

  /** Switch to the (compiled) full programs. */
  private adoptFull(): void {
    const gl = this.gl;
    const f = this.full!;
    this.fieldProg = f.field;
    this.surfProg = f.surf;
    this.skyProg = f.sky;
    this.formProg = f.form;
    this.probeProg = f.probe;
    this.deepProg = f.deep;
    this.bubbleProg = f.bubble;
    this.du = uniforms(gl, f.deep);
    this.bu = uniforms(gl, f.bubble);
    this.fu = uniforms(gl, f.field);
    this.su = uniforms(gl, f.surf);
    this.ku = uniforms(gl, f.sky);
    this.mu = uniforms(gl, f.form);
    this.pu = uniforms(gl, f.probe);
    this.fullReady = true;
    this.full = null;
  }

  dispose(): void {
    this.stop();
    this.dead = true;
    // Free resources but keep the context: React (StrictMode / remounts) may reuse this canvas.
    // The programs stay (PROGRAMS): the next engine on this context picks them up.
    const gl = this.gl;
    gl.deleteVertexArray(this.emptyVao);
    this.probeFence.forEach((f) => f && gl.deleteSync(f));
    this.probePbo.forEach((b) => gl.deleteBuffer(b));
    gl.deleteTexture(this.probePts);
    gl.deleteTexture(this.probeTex);
    gl.deleteFramebuffer(this.probeFbo);
    gl.deleteTexture(this.fieldTex);
    gl.deleteTexture(this.glyphS);
    gl.deleteTexture(this.glyphL);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteVertexArray(this.vao);
  }

  /* ── per frame ── */

  private frame(now: number): void {
    if (this.dead) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    // Camera follows the scroll with a soft lag (a flight, not a scrub).
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 5.5);
    this.u += (this.uTarget - this.u) * k;
    if (Math.abs(this.uTarget - this.u) < 1e-4) this.u = this.uTarget;

    this.pollFull();
    this.frames++;
    const ev = eventsAt(this.u);
    this.flash = Math.max(0, this.flash - dt * (this.reduced ? 10 : 1.3));
    if (!this.reduced) {
      this.time += dt;
      const slow = 1 - 0.4 * ev.calm;
      this.phase += dt * PHASE_SPEED * slow;
      this.morph += dt * MORPH_SPEED * slow;
      this.flow[0] += dt * FLOW_SPEED[0] * slow;
      this.flow[1] += dt * FLOW_SPEED[1] * slow;
      // The whirlpool spins up as it forms, and faster as you're pulled down it.
      this.whirlPhase += dt * (0.25 + 0.5 * ev.whirl + 4 * ev.dive * ev.dive);
    }

    const aspect = this.w / this.h;
    const cam = this.debugCam ? { ...this.debugCam, pos: [...this.debugCam.pos] as [number, number, number] } : sampleCamera(KEYS, this.u, aspect);
    // All projects: a slower flight out to the right and up, then the chains rise one by one.
    const ak = this.reduced ? 1 : 1 - Math.exp(-dt * 1.7);
    this.allAmt += ((this.allOn ? 1 : 0) - this.allAmt) * ak;
    if (Math.abs((this.allOn ? 1 : 0) - this.allAmt) < 1e-3) this.allAmt = this.allOn ? 1 : 0;
    this.allT = this.reduced ? (this.allOn ? 9 : 0) : Math.min(9, Math.max(0, this.allT + (this.allOn ? dt : -2 * dt)));
    for (let k = 0; k < ISLE_COUNT; k++) {
      if (k < ISLANDS.length) {
        // The featured chain sinks while you're over the others (it would peek in at the edge).
        this.isleRise[k] = ev.islands[k] * (1 - this.allAmt);
        continue;
      }
      const j = k - ISLANDS.length;
      const row = Math.floor(j / CHAIN.max);
      const i = j % CHAIN.max;
      if (i >= (this.chainN[row] ?? 0)) {
        this.isleRise[k] = 0;
        continue;
      }
      const x = Math.min(1, Math.max(0, (this.allT - 0.7 - (i + row * 0.5) * 0.22) / 0.9));
      this.isleRise[k] = x * x * (3 - 2 * x);
    }
    if (this.allAmt > 0) {
      const t = this.allAmt * this.allAmt * (3 - 2 * this.allAmt);
      const f = ALL_PROJECTS;
      const m = (a: number, b: number) => a + (b - a) * t;
      // Out to the right first, climbing as it goes.
      const tu = Math.min(1, t * 1.25) ** 1.5;
      for (let ax = 0; ax < 3; ax++) cam.pos[ax] = ax === 1 ? cam.pos[1] + (f.pos[1] - cam.pos[1]) * tu : m(cam.pos[ax], f.pos[ax]);
      cam.yaw = m(cam.yaw, f.yaw);
      cam.pitch = cam.pitch + (f.pitch - cam.pitch) * tu;
      cam.roll = m(cam.roll, f.roll);
      cam.fov = m(cam.fov, f.fov);
      cam.fog = m(cam.fog, f.fog);
      cam.glyph = m(cam.glyph, f.glyph);
    }
    // Island close-up: ease away from the camera and back (reduced motion: cut).
    const fk = this.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    this.focusAmt += ((this.focusOn ? 1 : 0) - this.focusAmt) * fk;
    if (Math.abs((this.focusOn ? 1 : 0) - this.focusAmt) < 1e-3) this.focusAmt = this.focusOn ? 1 : 0;
    if (this.focusShot && this.focusAmt > 0) {
      const t = this.focusAmt * this.focusAmt * (3 - 2 * this.focusAmt);
      const f = this.focusShot;
      const m = (a: number, b: number) => a + (b - a) * t;
      for (let ax = 0; ax < 3; ax++) cam.pos[ax] = m(cam.pos[ax], f.pos[ax]);
      cam.yaw = m(cam.yaw, f.yaw);
      cam.pitch = m(cam.pitch, f.pitch);
      cam.roll = m(cam.roll, f.roll);
      cam.fov = m(cam.fov, f.fov);
      cam.fog = m(cam.fog, f.fog);
      cam.glyph = m(cam.glyph, f.glyph);
    }
    // Ride the water: never dip below the swell / waves under the camera.
    if (ev.dive < 0.01 && ev.deep < 0.01 && cam.pitch > -89.9) {
      const floor = swellAt(cam.pos[0], cam.pos[2]) * ev.swell + PLASMA_AMP * 0.5 * cam.amp + 0.75;
      if (cam.pos[1] < floor) cam.pos[1] = floor;
    }
    // Overhead shots: pin the glyph lattice to whole device pixels so glyphs are as crisp as the live field.
    if (cam.pitch <= -89.9) {
      const alt = cam.pos[1];
      const ppu = this.w / (2 * alt * aspect * Math.tan((cam.fov * Math.PI) / 360));
      const snap = (v: number, half: number) => {
        const off = (v * ppu - half) % 1;
        return v - off / ppu;
      };
      cam.pos[0] = snap(cam.pos[0], this.w / 2);
      cam.pos[2] = snap(cam.pos[2], this.h / 2);
    }
    this.cam = cam;
    this.vp = this.viewProj(cam, aspect);
    this.ev = ev;
    this.onFrame?.(this.u);
    if (this.quietSource) this.quiet = this.quietSource().slice(0, MAX_QUIET);

    const gl = this.gl;

    // ── pass 1: the field, per level, centred where the camera looks ──
    const yawR = (cam.yaw * Math.PI) / 180;
    const pitchR = (cam.pitch * Math.PI) / 180;
    const fx = Math.sin(yawR) * Math.cos(pitchR);
    const fy = Math.sin(pitchR);
    const fz = -Math.cos(yawR) * Math.cos(pitchR);
    // Ground focus: where the view axis meets the water (clamped for shallow views).
    // (Height above the water, which inside the whirlpool is below sea level.)
    const alt = Math.max(0.5, cam.pos[1] - whirlH(cam.pos[0], cam.pos[2], ev.whirl));
    const tHit = fy < -0.05 ? Math.min(alt / -fy, 14) : 14;
    const hl = Math.hypot(fx, fz) || 1;

    gl.useProgram(this.fieldProg);
    this.setFieldUniforms(this.fu, ev);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.texW, this.texH);
    gl.disable(gl.DEPTH_TEST);
    const origins: number[] = [];
    for (let lv = 0; lv < NLEV; lv++) {
      const s = 2 ** lv;
      const cx = this.cell[0] * s;
      const cz = this.cell[1] * s;
      // Each level is centred ahead of the camera, further out for the coarser ones.
      const ahead = Math.min(tHit * 0.6 + (Math.min(this.texW * cx, this.texH * cz) * 0.3 * (lv > 0 ? 1 : 0)), 200) * Math.hypot(fx, fz);
      const focus = [cam.pos[0] + (fx / hl) * ahead, cam.pos[2] + (fz / hl) * ahead];
      const ox = Math.floor((focus[0] - (this.texW * cx) / 2) / cx) * cx;
      const oz = Math.floor((focus[1] - (this.texH * cz) / 2) / cz) * cz;
      origins.push(ox, oz);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.fieldTex, 0, lv);
      gl.uniform2f(this.fu.uOrig, ox, oz);
      gl.uniform2f(this.fu.uCellK, cx, cz);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.runProbe(ev);

    // ── pass 2: the surface ──
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const under = ev.deep > 0.5;
    if (ev.deep > 0.001 && this.deepProg) this.drawDeep(cam, ev.deep);
    const sun = ev.calm * (1 - ev.deep);
    if (sun > 0.001 && this.skyProg) this.drawSky(cam, aspect, sun);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.useProgram(this.surfProg);
    const su = this.su;
    this.setFieldUniforms(su, ev);
    gl.uniformMatrix4fv(su.uVP, false, this.vp);
    gl.uniform2f(su.uCenter, cam.pos[0] + fx * 2, cam.pos[2] + fz * 2);
    gl.uniform1f(su.uRadius, Math.max(40, cam.pos[1] * 6, Math.min(cam.fog, 200) * 0.8));
    gl.uniform2fv(su.uOrig, origins);
    gl.uniform2f(su.uCell, this.cell[0], this.cell[1]);
    gl.uniform2i(su.uTex, this.texW, this.texH);
    gl.uniform2f(su.uNative, this.cellW, this.cellH);
    gl.uniform3fv(su.uCam, cam.pos);
    gl.uniform3fv(su.uBg, this.bg);
    gl.uniform3fv(su.uLo, this.lo);
    gl.uniform3fv(su.uHi, this.hi);
    gl.uniform1f(su.uGain, this.gain);
    gl.uniform3fv(su.uAcc, this.acc);
    gl.uniform3fv(su.uSunDir, SUN_DIR);
    gl.uniform1f(su.uSunAmt, ev.calm);
    gl.uniform2f(su.uFog, cam.fog * 0.45, cam.fog);
    gl.uniform1f(su.uGlyph, cam.glyph);
    gl.uniform1f(su.uDeep, ev.deep);
    gl.uniform2f(su.uRes, this.w, this.h);
    this.setQuietUniforms(su);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.fieldTex);
    gl.uniform1i(su.uField, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphS);
    gl.uniform1i(su.uGlyphS, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphL);
    gl.uniform1i(su.uGlyphL, 2);

    // Under the sea the surface is blended over the water (the deep pass) instead of painting it out.
    if (under) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    if (ev.deep > 0.001 && this.bubbleProg) this.drawBubbles(cam, ev.deep);
    gl.disable(gl.BLEND);

    const fl = this.flash * this.flash * (3 - 2 * this.flash);
    const black = Math.max(ev.blackout, fl);
    if (black > 0.001 && this.formProg) this.drawFade(black);
  }

  /** Fade to the background (the bottom of the whirlpool; cuts). */
  private drawFade(amt: number): void {
    const gl = this.gl;
    const k = this.mu;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.formProg);
    gl.uniform3fv(k.uBg, this.bg);
    gl.uniform1f(k.uBlack, amt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }

  /** Debug: band values (r) of field level `lv` in a box around texel (cx, cy) as text rows. */
  debugField(lv = 0, step = 8): string {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.fieldTex, 0, lv);
    const px = new Float32Array(this.texW * this.texH * 4);
    gl.readPixels(0, 0, this.texW, this.texH, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const ramp = " .:-=+*#";
    let out = "";
    for (let y = 0; y < this.texH; y += step * 2) {
      for (let x = 0; x < this.texW; x += step) out += ramp[Math.round(px[(y * this.texW + x) * 4] * 7)] ?? "?";
      out += "\n";
    }
    return out;
  }

  private setFieldUniforms(u: Uniforms, ev: Events): void {
    const gl = this.gl;
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uPhase, this.phase);
    gl.uniform1f(u.uMorph, this.morph);
    gl.uniform2f(u.uFlow, this.flow[0], this.flow[1]);
    gl.uniform1f(u.uAmp, this.cam?.amp ?? 0);
    gl.uniform1f(u.uSwellW, ev.swell);
    gl.uniform3fv(u.uCrest, ev.crest);
    gl.uniform3fv(u.uCrestB, ev.crestBuild);
    const e = new Float32Array(MAX_ISLE * 4);
    for (let k = 0; k < ISLE_COUNT; k++) {
      const c = isleCentre(k, this.chainN);
      e.set([c[0], c[1], this.isleRise[k], isleSeed(k)], k * 4);
    }
    gl.uniform4fv(u.uIsle, e);
    gl.uniform1f(u.uIsleSea, Math.max(ev.isleSea, this.allAmt));
    gl.uniform1f(u.uCurW, ev.currents);
    gl.uniform1f(u.uCalmW, ev.calm);
    gl.uniform1f(u.uWhirlW, ev.whirl);
    gl.uniform1f(u.uWhirlPhase, this.whirlPhase);
    gl.uniform1f(u.uDive, ev.dive);
    gl.uniform1f(u.uIsleHi, this.isleHi);
    // In the swell and the currents the only colours are the items' own (ambient strips fade out).
    gl.uniform1f(u.uAmbient, 1 - 0.95 * Math.max(ev.swell, ev.currents));
  }

  private setQuietUniforms(u: Uniforms): void {
    const gl = this.gl;
    const q = new Float32Array(MAX_QUIET * 4);
    const qa = new Float32Array(MAX_QUIET);
    this.quiet.forEach((r, i) => {
      q.set([r.x0 * this.dpr, r.y0 * this.dpr, r.x1 * this.dpr, r.y1 * this.dpr], i * 4);
      qa[i] = r.a;
    });
    gl.uniform4fv(u.uQuiet, q);
    gl.uniform1fv(u.uQuietA, qa);
    gl.uniform1i(u.uQuietN, this.quiet.length);
    gl.uniform1f(u.uFeather, 70 * this.dpr);
  }

  /** The low sun on the Education horizon (screen-locked glyph cells). */
  private drawSky(c: Camera, aspect: number, amt: number): void {
    const gl = this.gl;
    const { f, r, up } = this.basis(c);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProg);
    const k = this.ku;
    gl.uniform2f(k.uNative, this.cellW, this.cellH);
    gl.uniform2f(k.uRes, this.w, this.h);
    gl.uniform3fv(k.uCamR, r);
    gl.uniform3fv(k.uCamU, up);
    gl.uniform3fv(k.uCamF, f);
    gl.uniform1f(k.uTanHalf, Math.tan((c.fov * Math.PI) / 360));
    gl.uniform3fv(k.uSunDir, SUN_DIR);
    gl.uniform1f(k.uSunAmt, amt);
    gl.uniform1f(k.uTime, this.time);
    gl.uniform3fv(k.uBg, this.bg);
    gl.uniform3fv(k.uSunCol, this.acc.subarray(3, 6));
    gl.uniform3fv(k.uSunCore, this.acc.subarray(6, 9));
    gl.uniform3fv(k.uLo, this.lo);
    this.setQuietUniforms(k);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphS);
    gl.uniform1i(k.uGlyphS, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Under the sea: the water behind everything (screen-locked glyph cells). */
  private drawDeep(c: Camera, amt: number): void {
    const gl = this.gl;
    const { f, r, up } = this.basis(c);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.deepProg);
    const k = this.du;
    gl.uniform2f(k.uNative, this.cellW, this.cellH);
    gl.uniform2f(k.uRes, this.w, this.h);
    gl.uniform3fv(k.uCamR, r);
    gl.uniform3fv(k.uCamU, up);
    gl.uniform3fv(k.uCamF, f);
    gl.uniform1f(k.uTanHalf, Math.tan((c.fov * Math.PI) / 360));
    gl.uniform1f(k.uTime, this.time);
    gl.uniform3fv(k.uBg, this.bg);
    gl.uniform3fv(k.uLo, this.lo);
    gl.uniform3fv(k.uHi, this.hi);
    gl.uniform1f(k.uDeep, amt);
    this.setQuietUniforms(k);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphS);
    gl.uniform1i(k.uGlyphS, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Under the sea: bubbles rising (world-space points, depth-tested against the surface). */
  private drawBubbles(c: Camera, amt: number): void {
    const gl = this.gl;
    const yaw = (c.yaw * Math.PI) / 180;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.bubbleProg);
    const k = this.bu;
    gl.uniformMatrix4fv(k.uVP, false, this.vp);
    gl.uniform3fv(k.uCam, c.pos);
    gl.uniform3f(k.uFwd, Math.sin(yaw), 0, -Math.cos(yaw));
    gl.uniform1f(k.uTime, this.time);
    gl.uniform2f(k.uRes, this.w, this.h);
    gl.uniform2f(k.uNative, this.cellW, this.cellH);
    gl.uniform1f(k.uDeep, amt);
    gl.uniform3fv(k.uHi, this.hi);
    gl.uniform3fv(k.uLo, this.lo);
    gl.uniform3fv(k.uAcc, this.acc);
    this.setQuietUniforms(k);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphL);
    gl.uniform1i(k.uGlyphL, 2);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.POINTS, 0, BUBBLES);
    gl.bindVertexArray(null);
    gl.depthMask(true);
  }

  private basis(c: Camera): { f: number[]; r: number[]; up: number[] } {
    const yaw = (c.yaw * Math.PI) / 180;
    const pitch = (c.pitch * Math.PI) / 180;
    const roll = (c.roll * Math.PI) / 180;
    const f = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    let r = [Math.cos(yaw), 0, Math.sin(yaw)];
    let up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    if (roll) {
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const r2 = r.map((v, i) => v * cr + up[i] * sr);
      up = up.map((v, i) => v * cr - r[i] * sr);
      r = r2;
    }
    return { f, r, up };
  }

  private viewProj(c: Camera, aspect: number): Float32Array {
    const { f, r, up } = this.basis(c);
    const p = c.pos;
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    // View matrix (rows: right, up, -forward).
    const view = new Float32Array([
      r[0], up[0], -f[0], 0,
      r[1], up[1], -f[1], 0,
      r[2], up[2], -f[2], 0,
      -dot(r, p), -dot(up, p), dot(f, p), 1,
    ]);
    const near = Math.max(0.02, Math.min(0.3, c.pos[1] * 0.05));
    return mul(perspective((c.fov * Math.PI) / 180, aspect, near, 600), view);
  }
}
