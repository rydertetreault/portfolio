/**
 * GLSL for the ocean.
 *
 * Two passes per frame:
 *   1. FIELD: the live plasma (+ the stop events) evaluated once per glyph cell, for 4
 *      nested levels of detail (cell size ×1, ×2, ×4, ×8), into a texture array.
 *   2. SURFACE: a camera-centred heightfield mesh. Every fragment finds its glyph cell
 *      in world space, looks up the cell's band and stamps that band's glyph, so the
 *      glyphs are laid on the water and move with it in 3D. From straight above this
 *      is exactly the live background.
 */
import {
  BRIGHTNESS,
  CURRENTS,
  EDDY_DEPTH,
  EDDY_R,
  LEVELS,
  LEVEL_GAMMA,
  PLASMA_AMP,
  PLASMA_DIST,
  PLASMA_MIX,
  PLASMA_NORM,
  PLASMA_WARP,
  QUIET,
  RAMP,
  STILL,
  SWELL,
  WHIRL,
} from "./world";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const NLEV = 4;
export const MAX_QUIET = 8;
export const MAX_EDDY = 4;

const NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
// ascii-field/noise.ts fbm (lacunarity 2.03, z x 1.6, normalised).
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 3; o++) {
    s += snoise(p) * a; n += a; a *= 0.5;
    p *= vec3(2.03, 2.03, 1.6);
  }
  return s / n;
}`;

/** The field: plasma + events. field(p, full) = (height, band value 0..1). */
const FIELD = `
uniform float uTime;
uniform float uPhase;
uniform float uMorph;
uniform vec2  uFlow;
uniform float uAmp;      // plasma relief: 0 = flat (Origin) .. 1
uniform float uSwellW;
uniform vec4  uEddy[${MAX_EDDY}];   // centre x, z, weight, arms (sign = direction)
uniform float uCurW;
uniform float uStillW;
uniform float uWhirlW;

const float PD = ${f(PLASMA_DIST)};
const float NORM = ${f(PLASMA_NORM)};
const float WARP = ${f(PLASMA_WARP)};
const float PMIX = ${f(PLASMA_MIX)};
const float PAMP = ${f(PLASMA_AMP)};

vec2 warpQ(vec2 fl) {
  vec3 a = vec3(fl * 0.09, uMorph * 0.7);
  return vec2(snoise(a), snoise(a + vec3(7.3, 3.1, 11.0)));
}

// The live "ASCII Plasma" (ascii-field/engine.ts, sampleLattice), in world units.
float plasmaRaw(vec2 p, vec2 w, vec2 q) {
  float pt = uPhase;
  vec2 e = w + vec2(sin(0.3 * pt), sin(0.4 * pt)) * PD;
  float h = sin(w.x + pt) + sin(w.y + 0.7 * pt) + sin(0.5 * (w.x + w.y + pt));
  h += sin(sqrt(dot(e, e) + 1.0) + pt);
  h += 0.5 * sin(2.0 * w.x + sin(w.y + 0.5 * pt) * PD);
  h += 0.5 * sin(2.0 * w.y + sin(w.x + 0.6 * pt) * PD);
  vec2 uv = p + q * WARP * 0.5;
  h += 0.7 * sin(2.0 * length(uv) - 1.5 * pt);
  return 0.5 + 0.5 * h * NORM;
}

float softSat(float x) { return 0.5 + 0.5 * tanh((x - 0.5) * 2.0) / tanh(1.0); }

vec2 rot(vec2 d, float a) { float c = cos(a), s = sin(a); return vec2(c * d.x - s * d.y, s * d.x + c * d.y); }

// A turning vortex at c: twists the plasma around it and adds spiral arms + a dip.
// Returns (height, spiral band, blend); writes the twisted sample point into pp.
vec3 vortex(vec2 p, inout vec2 pp, vec2 c, float R, float arms, float w, float depth, float eye, float spin, float twist, float tight) {
  vec2 d = p - c;
  float r = length(d);
  if (w < 0.001 || r > R * 2.2) return vec3(0.0);
  float fall = exp(-r * r / (R * R));
  float dir = sign(arms);
  pp = c + rot(pp - c, twist * dir * w * exp(-r * r / (R * R * 2.0)));
  float a = atan(d.y, d.x);
  float s = sin(abs(arms) * (dir * a - spin * uTime) + tight * log(r + 0.35));
  float core = smoothstep(eye * 0.4, eye, r);           // the calm eye
  float band = 0.5 + 0.5 * s * core;
  float h = -depth * (0.6 * exp(-r * r / (R * R * 0.25)) + 0.4 * fall) + 0.14 * s * fall * core;
  return vec3(h * w, band, w * (1.0 - smoothstep(R * 0.55, R * 1.7, r)));
}

vec2 field(vec2 p, bool full) {
  vec2 pp = p;
  float h = 0.0;
  float v = 0.0;

  // Vortices first: they bend the plasma that gets sampled below.
  vec3 vt[${MAX_EDDY + 1}];
  for (int i = 0; i < ${MAX_EDDY}; i++) {
    vt[i] = vortex(p, pp, uEddy[i].xy, ${f(EDDY_R)}, uEddy[i].w, uEddy[i].z, ${f(EDDY_DEPTH)}, 0.6, 0.35, 0.0, 7.0);
  }
  vt[${MAX_EDDY}] = vortex(p, pp, vec2(${f(WHIRL.c[0])}, ${f(WHIRL.c[1])}), ${f(WHIRL.r)}, ${f(WHIRL.arms)}, uWhirlW,
                       ${f(WHIRL.depth)}, ${f(WHIRL.eye)}, 0.45, 2.0, ${f(WHIRL.tight)});

  vec2 fl = pp + uFlow;
  vec2 q = warpQ(fl);
  vec2 w = fl + q * WARP;
  float raw = plasmaRaw(pp, w, q);
  v = clamp(raw, 0.0, 1.0);
  if (full) v = mix(fbm3(vec3(w * 0.1, uMorph)) * 0.75 + 0.5, v, PMIX);
  v = smoothstep(0.04, 1.0, v); // hero preset threshold / softness

  // Still water: the relief settles, the bands thin out, slow rings spread.
  float calm = 0.0;
  if (uStillW > 0.001) {
    float r = length(p - vec2(${f(STILL.c[0])}, ${f(STILL.c[1])}));
    calm = uStillW * (1.0 - smoothstep(${f(STILL.r * 0.55)}, ${f(STILL.r)}, r));
    float ring = sin(r * 1.5 - uTime * 0.7) * exp(-r * 0.07);
    v = mix(v, 0.3 + (v - 0.5) * 0.15 + 0.32 * ring, calm);
    h += 0.08 * ring * calm;
  }

  h += PAMP * (softSat(raw) - 0.5) * uAmp * (1.0 - 0.85 * calm);

  // Swell: three long crests, one per role.
  if (uSwellW > 0.001) {
    float lat = 1.0 - smoothstep(${f(SWELL.reach * 0.6)}, ${f(SWELL.reach)}, abs(p.x - ${f(SWELL.x)}));
    float s = 0.0;
    ${SWELL.crests
      .map(
        (zc, k) => `{
      float d = (p.y - ${f(zc)} - 0.7 * sin(p.x * 0.13 + ${f(k * 1.7)})) / ${f(SWELL.width)};
      s += exp(-d * d) * (0.95 + 0.05 * sin(uTime * 0.5 + ${f(k * 2.1)}));
    }`,
      )
      .join("\n    ")}
    s *= lat * uSwellW;
    h += ${f(SWELL.height)} * s;
    v = clamp(v + 0.2 * s, 0.0, 1.0);
  }

  // Currents: three lanes of streaks flowing south; the water between them goes quiet.
  if (uCurW > 0.001) {
    float zm = smoothstep(${f(CURRENTS.z0)}, ${f(CURRENTS.z0 + 6)}, p.y) * (1.0 - smoothstep(${f(CURRENTS.z1 - 6)}, ${f(CURRENTS.z1)}, p.y));
    float rx = (p.x - ${f(CURRENTS.x)}) / ${f(CURRENTS.gap * 2.4)};
    float region = exp(-rx * rx) * zm * uCurW;
    v = mix(v, 0.1 + (v - 0.5) * 0.15, region);
    h *= 1.0 - 0.8 * region;
    ${CURRENTS.speeds
      .map(
        (spd, i) => `{
      float lx = (p.x - ${f(CURRENTS.x + (i - 1) * CURRENTS.gap)}) / ${f(CURRENTS.width)};
      float m = exp(-lx * lx) * zm * uCurW;
      if (m > 0.01) {
        float n = snoise(vec3(p.x * 1.6 + ${f(i * 7)}, (p.y - uTime * ${f(spd)}) * 0.22, uTime * 0.05));
        v = mix(v, clamp(0.68 + 0.4 * n, 0.0, 1.0), m);
        h += 0.12 * n * m;
      }
    }`,
      )
      .join("\n    ")}
  }

  for (int i = 0; i <= ${MAX_EDDY}; i++) {
    h += vt[i].x;
    v = mix(v, vt[i].y, vt[i].z);
  }
  return vec2(h, clamp(v, 0.0, 1.0));
}`;

/** Full-screen triangle. */
export const QUAD_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Pass 1: one texel per glyph cell of one level. r = band value, g = height. */
export const FIELD_FS = `#version 300 es
precision highp float;
${NOISE}
${FIELD}
uniform vec2 uOrig;   // world xz of texel (0, 0)'s corner
uniform vec2 uCellK;  // this level's cell size (world)
out vec4 o;
void main() {
  vec2 p = uOrig + (floor(gl_FragCoord.xy) + 0.5) * uCellK;
  vec2 fv = field(p, true);
  o = vec4(fv.y, fv.x, 0.0, 1.0);
}`;

/** Pass 2: the water surface. */
export const SURFACE_VS = `#version 300 es
precision highp float;
${NOISE}
${FIELD}
in vec2 aGrid;          // [-1, 1]^2
uniform vec2 uCenter;
uniform float uRadius;
uniform mat4 uVP;
out vec3 vW;
void main() {
  vec2 c = aGrid;
  vec2 p = uCenter + (0.12 * c + 0.88 * c * abs(c)) * uRadius;
  float h = field(p, false).x;
  vW = vec3(p.x, h, p.y);
  gl_Position = uVP * vec4(vW, 1.0);
}`;

export const SURFACE_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vW;
uniform sampler2DArray uField;
uniform sampler2DArray uGlyphS;  // glyphs at their native size (crisp at the Origin)
uniform sampler2DArray uGlyphL;  // large glyphs (close to the camera)
uniform vec2  uOrig[${NLEV}];
uniform vec2  uCell;             // level-0 cell (world)
uniform ivec2 uTex;              // texels per level
uniform vec2  uNative;           // native glyph cell, device px
uniform vec3  uCam;
uniform vec3  uBg;
uniform vec3  uLo;
uniform vec3  uHi;
uniform float uGain;
uniform vec2  uFog;              // fade start, end (world distance)
uniform float uGlyph;            // smallest glyph relative to native
uniform vec2  uRes;
uniform vec4  uQuiet[${MAX_QUIET}];  // device px, top-left origin: x0, y0, x1, y1
uniform float uQuietA[${MAX_QUIET}];
uniform int   uQuietN;
uniform float uFeather;
out vec4 o;

const float L = ${f(LEVELS)};

// Glyph of level k at xz: returns (opacity, coverage).
vec2 glyph(int k, vec2 xz, vec2 gx, vec2 gy, float hpx) {
  float s = exp2(float(k));
  vec2 ck = (xz - uOrig[k]) / (uCell * s);
  ivec2 id = ivec2(floor(ck));
  if (id.x < 0 || id.y < 0 || id.x >= uTex.x || id.y >= uTex.y) return vec2(0.0);
  float v = texelFetch(uField, ivec3(id, k), 0).r;
  float band = floor(v * L + 0.5);
  if (band < 1.0) return vec2(0.0);
  float a = pow(band / L, ${f(LEVEL_GAMMA)}) * ${f(BRIGHTNESS)} * uGain;
  vec3 uvw = vec3(fract(ck), band - 1.0);
  gx /= s;
  gy /= s;
  float hk = hpx * s;
  float cs = textureGrad(uGlyphS, uvw, gx, gy).r;
  float t = smoothstep(uNative.y * 1.05, uNative.y * 1.8, hk);
  float cov = t > 0.0 ? mix(cs, textureGrad(uGlyphL, uvw, gx, gy).r, t) : cs;
  cov *= 1.0 - smoothstep(uNative.y * 5.0, uNative.y * 8.0, hk); // too close to read: let it go
  return vec2(min(a, 1.0), cov);
}

void main() {
  vec2 xz = vW.xz;
  vec2 c0 = xz / uCell;
  vec2 gx = dFdx(c0);
  vec2 gy = dFdy(c0);
  // On-screen size of a level-0 cell (px) along world x and z.
  float wpx = 1.0 / max(1e-5, length(vec2(gx.x, gy.x)));
  float hpx = 1.0 / max(1e-5, length(vec2(gx.y, gy.y)));
  float rel = sqrt((wpx / uNative.x) * (hpx / uNative.y));
  // Level k draws glyphs at rel * 2^k. Prefer the level that keeps glyphs at least ~uGlyph
  // (crisp, never shrunk into grey), blending only right at each switch.
  float lodRaw = log2(uGlyph / rel);
  float lod = clamp(lodRaw, 0.0, ${f(NLEV - 1)});
  int k0 = int(floor(lod));
  float tk = smoothstep(0.0, 0.25, fract(lod));
  int k1 = min(k0 + 1, ${NLEV - 1});
  if (k0 == k1) tk = 0.0;
  vec2 g0 = tk < 0.999 ? glyph(k0, xz, gx, gy, hpx) : vec2(0.0);
  vec2 g1 = tk > 0.001 ? glyph(k1, xz, gx, gy, hpx) : vec2(0.0);

  // Fade: distance, and beyond the coarsest level.
  float d = distance(uCam, vW);
  float fade = 1.0 - smoothstep(uFog.x, uFog.y, d);
  fade *= 1.0 - smoothstep(${f(NLEV - 1.4)}, ${f(NLEV - 1)}, lodRaw);

  // Quiet zones behind text.
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float q = 0.0;
  for (int i = 0; i < ${MAX_QUIET}; i++) {
    if (i >= uQuietN) break;
    vec4 r = uQuiet[i];
    vec2 dd = max(max(r.xy - px, px - r.zw), 0.0);
    q = max(q, (1.0 - smoothstep(0.0, uFeather, length(dd))) * uQuietA[i]);
  }
  fade *= 1.0 - ${f(QUIET)} * q;

  vec3 c = uBg;
  vec3 col0 = mix(uLo, uHi, smoothstep(${f(RAMP[0])}, ${f(RAMP[1])}, g0.x));
  vec3 col1 = mix(uLo, uHi, smoothstep(${f(RAMP[0])}, ${f(RAMP[1])}, g1.x));
  vec3 a = mix(uBg, col0, g0.x * g0.y);
  vec3 b = mix(uBg, col1, g1.x * g1.y);
  c = mix(uBg, mix(a, b, tk), fade);
  o = vec4(c, 1.0);
}`;
