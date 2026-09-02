/**
 * ─────────────────────────────────────────────────────────────
 *  Glyph renderers
 *
 *  The engine decides *which* glyph goes in *which* cell at *what*
 *  brightness; a renderer just blits them. Two implementations:
 *
 *  • WebGLRenderer   — one instanced draw call per frame. All cells
 *                      are packed into a single attribute buffer, so
 *                      cost is ~independent of glyph count. Preferred.
 *  • Canvas2DRenderer — drawImage per glyph from a tiered atlas.
 *                      Fallback when WebGL2 is unavailable / lost.
 * ─────────────────────────────────────────────────────────────
 */

export interface GlyphRenderer {
  readonly kind: "webgl" | "canvas2d";
  /** Rebuild the atlas texture. `atlas` holds every glyph at full alpha in one row. */
  setAtlas(atlas: HTMLCanvasElement, cellWd: number, cellHd: number, chars: number): void;
  /** Glyph colour ramps lo → hi as brightness rises through [rampLo, rampHi]. */
  setColors(lo: string, hi: string, rampLo: number, rampHi: number): void;
  /** Up to 8 accent colours selectable per glyph via `push(..., palette)` (1-based; 0 = ramp). */
  setPalette(colors: string[]): void;
  /** Canvas device size changed. */
  resize(width: number, height: number): void;
  begin(): void;
  /** Queue one glyph. `alpha` in [0, 1] (also drives the colour ramp); `palette` picks an accent colour (0 = ramp). */
  push(col: number, row: number, charIndex: number, alpha: number, palette?: number): void;
  end(): void;
  destroy(): void;
}

function parseColor(css: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillStyle = css;
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

/* ───────────────────────── WebGL2 ───────────────────────── */

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;   // unit quad corner (0..1)
layout(location=1) in vec4 aInst;     // col, row, charIndex, alpha*255 + palette*256
uniform vec2 uCanvas;                 // device px
uniform vec2 uCell;                   // device px
uniform float uChars;                 // glyphs in atlas row
out vec2 vUv;
out float vAlpha;
flat out int vPal;
void main() {
  vec2 px = (aInst.xy + aCorner) * uCell;
  vec2 clip = vec2(px.x / uCanvas.x * 2.0 - 1.0, 1.0 - px.y / uCanvas.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  vUv = vec2((aInst.z + aCorner.x) / uChars, aCorner.y);
  float packed = aInst.w;
  vPal = int(floor(packed / 256.0 + 0.001));
  vAlpha = (packed - float(vPal) * 256.0) / 255.0;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vAlpha;
flat in int vPal;
uniform sampler2D uAtlas;
uniform vec3 uLo;
uniform vec3 uHi;
uniform vec2 uRamp; // [rampLo, rampHi]
uniform vec3 uPalette[8];
out vec4 outColor;
void main() {
  float a = texture(uAtlas, vUv).a * vAlpha;
  float t = smoothstep(uRamp.x, uRamp.y, vAlpha);
  vec3 c = vPal > 0 ? uPalette[min(vPal, 8) - 1] : mix(uLo, uHi, t);
  outColor = vec4(c * a, a); // premultiplied
}`;

export class WebGLRenderer implements GlyphRenderer {
  readonly kind = "webgl" as const;
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instBuf: WebGLBuffer;
  private tex: WebGLTexture;
  private uCanvas: WebGLUniformLocation | null;
  private uCell: WebGLUniformLocation | null;
  private uChars: WebGLUniformLocation | null;
  private uLo: WebGLUniformLocation | null;
  private uHi: WebGLUniformLocation | null;
  private uRamp: WebGLUniformLocation | null;
  private uPalette: WebGLUniformLocation | null;
  private palette = new Float32Array(24);

  private data = new Float32Array(4 * 4096);
  private count = 0;
  private cellWd = 1;
  private cellHd = 1;
  private chars = 1;
  private lo: [number, number, number] = [0.5, 0.5, 0.5];
  private hi: [number, number, number] = [1, 1, 1];
  private rampLo = 0.1;
  private rampHi = 0.8;
  private width = 1;
  private height = 1;
  lost = false;

  static create(canvas: HTMLCanvasElement): WebGLRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) return null;
    try {
      return new WebGLRenderer(gl, canvas);
    } catch {
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) ?? "shader error");
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
    }
    this.prog = prog;
    this.uCanvas = gl.getUniformLocation(prog, "uCanvas");
    this.uCell = gl.getUniformLocation(prog, "uCell");
    this.uChars = gl.getUniformLocation(prog, "uChars");
    this.uLo = gl.getUniformLocation(prog, "uLo");
    this.uHi = gl.getUniformLocation(prog, "uHi");
    this.uRamp = gl.getUniformLocation(prog, "uRamp");
    this.uPalette = gl.getUniformLocation(prog, "uPalette");

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Unit quad (two triangles).
    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Per-instance data.
    this.instBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);

    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      this.onRestore?.();
    });
  }

  /** Engine hooks this to rebuild the atlas after a context restore. */
  onRestore: (() => void) | null = null;

  setAtlas(atlas: HTMLCanvasElement, cellWd: number, cellHd: number, chars: number): void {
    const gl = this.gl;
    this.cellWd = cellWd;
    this.cellHd = cellHd;
    this.chars = chars;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  }

  setColors(lo: string, hi: string, rampLo: number, rampHi: number): void {
    this.lo = parseColor(lo);
    this.hi = parseColor(hi);
    this.rampLo = rampLo;
    this.rampHi = rampHi;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  begin(): void {
    this.count = 0;
  }

  setPalette(colors: string[]): void {
    this.palette.fill(0);
    colors.slice(0, 8).forEach((c, i) => {
      const [r, g, b] = parseColor(c);
      this.palette[i * 3] = r;
      this.palette[i * 3 + 1] = g;
      this.palette[i * 3 + 2] = b;
    });
  }

  push(col: number, row: number, charIndex: number, alpha: number, palette = 0): void {
    let i = this.count * 4;
    if (i + 4 > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    }
    const d = this.data;
    d[i++] = col;
    d[i++] = row;
    d[i++] = charIndex;
    d[i] = Math.round(alpha * 255) + (palette > 0 ? Math.min(8, palette) * 256 : 0);
    this.count++;
  }

  end(): void {
    const gl = this.gl;
    if (this.lost) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.count === 0) return;
    gl.useProgram(this.prog);
    gl.uniform2f(this.uCanvas, this.width, this.height);
    gl.uniform2f(this.uCell, this.cellWd, this.cellHd);
    gl.uniform1f(this.uChars, this.chars);
    gl.uniform3f(this.uLo, this.lo[0], this.lo[1], this.lo[2]);
    gl.uniform3f(this.uHi, this.hi[0], this.hi[1], this.hi[2]);
    gl.uniform2f(this.uRamp, this.rampLo, this.rampHi);
    gl.uniform3fv(this.uPalette, this.palette);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * 4);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
    gl.bindVertexArray(null);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteTexture(this.tex);
    gl.deleteBuffer(this.instBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
  }
}

/* ───────────────────────── Canvas 2D ───────────────────────── */

export class Canvas2DRenderer implements GlyphRenderer {
  readonly kind = "canvas2d" as const;
  private ctx: CanvasRenderingContext2D;
  private tiers: number;
  private atlas: HTMLCanvasElement | null = null;
  private paletteAtlases: HTMLCanvasElement[] = [];
  private paletteColors: string[] = [];
  private src: HTMLCanvasElement | null = null;
  private chars = 0;
  private cellWd = 1;
  private cellHd = 1;
  private lo: [number, number, number] = [128, 128, 128];
  private hi: [number, number, number] = [255, 255, 255];
  private rampLo = 0.1;
  private rampHi = 0.8;
  private width = 1;
  private height = 1;

  static create(canvas: HTMLCanvasElement, tiers: number): Canvas2DRenderer | null {
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    return ctx ? new Canvas2DRenderer(ctx, tiers) : null;
  }

  private constructor(ctx: CanvasRenderingContext2D, tiers: number) {
    this.ctx = ctx;
    this.tiers = tiers;
  }

  setAtlas(atlas: HTMLCanvasElement, cellWd: number, cellHd: number, chars: number): void {
    this.src = atlas;
    this.cellWd = cellWd;
    this.cellHd = cellHd;
    this.chars = chars;
    this.rebuild();
  }

  setColors(lo: string, hi: string, rampLo: number, rampHi: number): void {
    const l = parseColor(lo);
    const h = parseColor(hi);
    this.lo = [l[0] * 255, l[1] * 255, l[2] * 255];
    this.hi = [h[0] * 255, h[1] * 255, h[2] * 255];
    this.rampLo = rampLo;
    this.rampHi = rampHi;
    this.rebuild();
  }

  setPalette(colors: string[]): void {
    this.paletteColors = colors.slice(0, 8);
    this.rebuildPalette();
  }

  /** One tiered atlas per palette colour. */
  private rebuildPalette(): void {
    if (!this.src) return;
    this.paletteAtlases = this.paletteColors.map((color) => {
      const a = document.createElement("canvas");
      a.width = Math.max(1, this.chars * this.cellWd);
      a.height = Math.max(1, this.tiers * this.cellHd);
      const g = a.getContext("2d")!;
      for (let t = 0; t < this.tiers; t++) {
        g.globalAlpha = (t + 1) / this.tiers;
        g.drawImage(this.src!, 0, t * this.cellHd);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-in";
      g.fillStyle = color;
      g.fillRect(0, 0, a.width, a.height);
      return a;
    });
  }

  /** Bake alpha tiers (each tinted along the lo→hi ramp) from the white source atlas. */
  private rebuild(): void {
    if (!this.src) return;
    this.rebuildPalette();
    const a = document.createElement("canvas");
    a.width = Math.max(1, this.chars * this.cellWd);
    a.height = Math.max(1, this.tiers * this.cellHd);
    const g = a.getContext("2d")!;
    for (let t = 0; t < this.tiers; t++) {
      const alpha = (t + 1) / this.tiers;
      let k = Math.min(1, Math.max(0, (alpha - this.rampLo) / (this.rampHi - this.rampLo)));
      k = k * k * (3 - 2 * k);
      const r = Math.round(this.lo[0] + (this.hi[0] - this.lo[0]) * k);
      const gg = Math.round(this.lo[1] + (this.hi[1] - this.lo[1]) * k);
      const b = Math.round(this.lo[2] + (this.hi[2] - this.lo[2]) * k);
      g.save();
      g.beginPath();
      g.rect(0, t * this.cellHd, a.width, this.cellHd);
      g.clip();
      g.globalAlpha = alpha;
      g.drawImage(this.src, 0, t * this.cellHd);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-in";
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.fillRect(0, t * this.cellHd, a.width, this.cellHd);
      g.restore();
    }
    this.atlas = a;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  begin(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
  }

  push(col: number, row: number, charIndex: number, alpha: number, palette = 0): void {
    const atlas = palette > 0 ? (this.paletteAtlases[palette - 1] ?? this.atlas) : this.atlas;
    if (!atlas) return;
    let tier = Math.floor(alpha * this.tiers);
    if (tier >= this.tiers) tier = this.tiers - 1;
    if (tier < 0) return;
    const w = this.cellWd;
    const h = this.cellHd;
    this.ctx.drawImage(atlas, charIndex * w, tier * h, w, h, col * w, row * h, w, h);
  }

  end(): void {}

  destroy(): void {
    this.atlas = null;
  }
}
