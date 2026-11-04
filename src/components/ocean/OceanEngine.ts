/**
 * OceanEngine: WebGL2 renderer for the ocean (see shaders.ts for the two passes).
 * Framework-agnostic: OceanCanvas.tsx feeds it scroll, theme, quiet zones and size.
 */
import { MAX_EDDY, MAX_QUIET, NLEV, FIELD_FS, QUAD_VS, SKY_FS, SURFACE_FS, SURFACE_VS } from "./shaders";
import { EDDIES, FLOW_SPEED, FONT_SIZE, GLYPHS, LINE_HEIGHT, MORPH_SPEED, PHASE_SPEED, PLASMA_AMP, SPAN, swellAt } from "./world";
import { sampleCamera, type Camera } from "./timeline";
import { KEYS, SUN_DIR, eventsAt, type Events } from "./route";

type Uniforms = Record<string, WebGLUniformLocation | null>;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, "aGrid");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}

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
  private skyProg: WebGLProgram;
  private fu: Uniforms;
  private su: Uniforms;
  private ku: Uniforms;
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
  private u = 0; // smoothed scroll (viewport heights)
  private uTarget = 0;
  private reduced = false;

  private bg: [number, number, number] = [0.92, 0.92, 0.92];
  private lo: [number, number, number] = [0.4, 0.4, 0.4];
  private hi: [number, number, number] = [0.07, 0.07, 0.07];
  private acc = new Float32Array([0.3, 0.49, 0.06, 0.76, 0.33, 0.05, 0.63, 0.38, 0.03]);
  private gain = 1;
  private quiet: Quiet[] = [];

  /** Called every frame with the camera's (smoothed) scroll position. */
  onFrame: ((u: number) => void) | null = null;
  /** Text rects to keep readable (CSS px), polled every frame. */
  quietSource: (() => Quiet[]) | null = null;

  /** Debug: fixed camera instead of the route. */
  debugCam: Camera | null = null;

  /** Last camera (for debugging / tests). */
  cam: Camera | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("float render targets unavailable");
    this.gl = gl;
    this.fieldProg = compile(gl, QUAD_VS, FIELD_FS);
    this.surfProg = compile(gl, SURFACE_VS, SURFACE_FS);
    this.fu = uniforms(gl, this.fieldProg);
    this.su = uniforms(gl, this.surfProg);
    this.skyProg = compile(gl, QUAD_VS, SKY_FS);
    this.ku = uniforms(gl, this.skyProg);
    this.fieldTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.glyphS = gl.createTexture()!;
    this.glyphL = gl.createTexture()!;
    this.vao = this.buildMesh(220);
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

  /** Glyph atlas (one layer per band) at `cw × ch` px. */
  private buildGlyphs(tex: WebGLTexture, cw: number, ch: number): void {
    const gl = this.gl;
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R8, cw, ch, GLYPHS.length, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const data = new Uint8Array(cw * ch);
    GLYPHS.forEach((g, i) => {
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

  dispose(): void {
    this.stop();
    this.dead = true;
    // Free resources but keep the context: React (StrictMode / remounts) may reuse this canvas.
    const gl = this.gl;
    gl.deleteProgram(this.fieldProg);
    gl.deleteProgram(this.surfProg);
    gl.deleteProgram(this.skyProg);
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

    const ev = eventsAt(this.u);
    if (!this.reduced) {
      this.time += dt;
      const slow = 1 - 0.4 * ev.calm;
      this.phase += dt * PHASE_SPEED * slow;
      this.morph += dt * MORPH_SPEED * slow;
      this.flow[0] += dt * FLOW_SPEED[0] * slow;
      this.flow[1] += dt * FLOW_SPEED[1] * slow;
      // The whirlpool spins up as you go down it.
      this.whirlPhase += dt * (0.45 + 5 * ev.dive * ev.dive);
    }

    const aspect = this.w / this.h;
    const cam = this.debugCam ? { ...this.debugCam, pos: [...this.debugCam.pos] as [number, number, number] } : sampleCamera(KEYS, this.u, aspect);
    // Ride the water: never dip below the swell / waves under the camera.
    if (ev.dive < 0.01 && cam.pitch > -89.9) {
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
    const tHit = fy < -0.05 ? Math.min(cam.pos[1] / -fy, 14) : 14;
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

    // ── pass 2: the surface ──
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (ev.calm > 0.001) this.drawSky(cam, aspect, ev.calm);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.useProgram(this.surfProg);
    const su = this.su;
    this.setFieldUniforms(su, ev);
    gl.uniformMatrix4fv(su.uVP, false, this.viewProj(cam, aspect));
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
    gl.uniform1f(su.uStrips, 1);
    gl.uniform3fv(su.uSunDir, SUN_DIR);
    gl.uniform1f(su.uSunAmt, ev.calm);
    gl.uniform2f(su.uFog, cam.fog * 0.45, cam.fog);
    gl.uniform1f(su.uGlyph, cam.glyph);
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

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
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
    const e = new Float32Array(MAX_EDDY * 4);
    EDDIES.forEach((d, i) => e.set([d.c[0], d.c[1], ev.eddies[i], d.arms], i * 4));
    gl.uniform4fv(u.uEddy, e);
    gl.uniform1f(u.uCurW, ev.currents);
    gl.uniform1f(u.uCalmW, ev.calm);
    gl.uniform1f(u.uWhirlW, ev.whirl);
    gl.uniform1f(u.uWhirlPhase, this.whirlPhase);
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
    gl.uniform1f(u.uFeather, 60 * this.dpr);
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
    gl.uniform3fv(k.uLo, this.lo);
    this.setQuietUniforms(k);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.glyphS);
    gl.uniform1i(k.uGlyphS, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
