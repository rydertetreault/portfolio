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
  CALM,
  CURRENTS,
  EDDIES,
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
  SWELL,
  WHIRL,
} from "./world";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const NLEV = 5;
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

/** The field: plasma + events. field(p, full) = (height, band 0..1, accent index, accent amount). */
const FIELD = `
uniform float uTime;
uniform float uPhase;
uniform float uMorph;
uniform vec2  uFlow;
uniform float uAmp;      // plasma relief: 0 = flat (Origin) .. 1
uniform float uSwellW;
uniform vec3  uCrest;    // how lit each crest's foam is (the company you're at)
uniform vec4  uEddy[${MAX_EDDY}];   // centre x, z, weight, arms (sign = direction)
uniform float uCurW;
uniform float uCalmW;
uniform float uWhirlW;
uniform float uWhirlPhase;  // accumulated spin (speeds up as you dive in)
uniform float uEddyHi;      // hovered project's eddy (-1 = none): the others dim
uniform float uAmbient;     // ambient contour strips (0..1)

const float PD = ${f(PLASMA_DIST)};
const float NORM = ${f(PLASMA_NORM)};
const float WARP = ${f(PLASMA_WARP)};
const float PMIX = ${f(PLASMA_MIX)};
const float PAMP = ${f(PLASMA_AMP)};
const float EDDY_COL[${MAX_EDDY}] = float[${MAX_EDDY}](${EDDIES.map((e) => f(e.color)).join(", ")});

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

struct Vx { float h; float band; float blend; float acc; };

// A turning vortex at c: spiral arms (rotated by ang), a dip, and a calm eye.
// Twists the plasma sample point pp around it.
Vx vortex(vec2 p, inout vec2 pp, vec2 c, float R, float arms, float w, float depth, float eye, float ang, float twist, float tight) {
  vec2 d = p - c;
  float r = length(d);
  if (w < 0.001 || r > R * 2.2) return Vx(0.0, 0.0, 0.0, 0.0);
  float fall = exp(-r * r / (R * R));
  float dir = sign(arms);
  pp = c + rot(pp - c, twist * dir * w * exp(-r * r / (R * R * 2.0)));
  float a = atan(d.y, d.x);
  float s = sin(abs(arms) * (dir * a - ang) + tight * log(r + 0.35));
  float core = smoothstep(eye * 0.4, eye, r);
  float band = 0.5 + 0.5 * s * core;
  float h = -depth * (0.6 * exp(-r * r / (R * R * 0.25)) + 0.4 * fall) + 0.14 * s * fall * core;
  float blend = w * (1.0 - smoothstep(R * 0.55, R * 1.7, r));
  float acc = smoothstep(0.55, 0.95, s) * core * blend;  // the crest of each arm
  return Vx(h * w, band, blend, acc);
}

// The maelstrom: the plasma itself is wound into a log spiral around a deep funnel (so
// the bands become hurricane streaks), fine foam filaments race around it, and the
// centre drops away into a dark drain.
struct Ms { float h; float band; float blend; float acc; float dark; };
Ms maelstrom(vec2 p, inout vec2 pp, vec2 c, float R, float w, float depth, float ang) {
  vec2 d = p - c;
  float r = length(d);
  if (w < 0.001 || r > R * 2.6) return Ms(0.0, 0.0, 0.0, 0.0, 0.0);
  float reach = 1.0 - smoothstep(R * 0.9, R * 2.6, r);
  float rc = R * 0.16;
  // Winding: tight near the drain, loosening outward; the whole thing turns.
  float wind = 2.4 * log(1.0 + R / (r + 0.35)) + ang * (1.0 + 1.5 * rc / (r + rc));
  pp = c + rot(pp - c, w * reach * wind);
  // Funnel: broad dish with steep inner walls.
  float k = R * 0.32;
  float h = -depth * (k * k / (r * r + k * k)) - depth * 0.5 * exp(-r * r / (rc * rc));
  // Foam filaments: wound and turned by exactly the same angle as the plasma above, so they
  // ride the flow instead of sliding across it; broken up into streaks in the same frame.
  float a = atan(d.y, d.x) + w * reach * wind;
  float fil = sin(14.0 * a);
  vec2 pr = pp - c;
  float brk = smoothstep(-0.2, 0.6, snoise(vec3(pr * 0.35, uTime * 0.05)));
  float streak = smoothstep(0.55, 0.95, fil) * brk;
  float band = 0.5 + 0.45 * streak;
  // The abyss: the walls get denser and denser toward the drain.
  float dark = w * (1.0 - smoothstep(rc * 0.4, R * 0.75, r));
  float wall = 1.0 - smoothstep(rc * 1.5, R * 1.6, r);  // filaments strongest on the walls
  return Ms(h * w * reach, band, w * 0.6 * wall, wall * w, dark);
}

void accent(inout vec2 ac, float idx, float amt) {
  if (amt > ac.y) ac = vec2(idx, amt);
}

vec4 field(vec2 p, bool full) {
  vec2 pp = p;
  float h = 0.0;
  float v = 0.0;
  vec2 ac = vec2(0.0);   // area accents (current lanes, crest foam)
  vec2 ct = vec2(0.0);   // contour accents: only drawn on band edges (the live site's strips)

  // Vortices first: they bend the plasma that gets sampled below.
  Vx vt[${MAX_EDDY}];
  for (int i = 0; i < ${MAX_EDDY}; i++) {
    vt[i] = vortex(p, pp, uEddy[i].xy, ${f(EDDY_R)}, uEddy[i].w, uEddy[i].z, ${f(EDDY_DEPTH)}, 0.6, 0.35 * uTime, 0.0, 7.0);
  }
  Ms ms = maelstrom(p, pp, vec2(${f(WHIRL.c[0])}, ${f(WHIRL.c[1])}), ${f(WHIRL.r)}, uWhirlW, ${f(WHIRL.depth)}, uWhirlPhase);

  vec2 fl = pp + uFlow;
  vec2 q = warpQ(fl);
  vec2 w = fl + q * WARP;
  float raw = plasmaRaw(pp, w, q);
  v = clamp(raw, 0.0, 1.0);
  if (full) v = mix(fbm3(vec3(w * 0.1, uMorph)) * 0.75 + 0.5, v, PMIX);
  v = smoothstep(0.04, 1.0, v); // hero preset threshold / softness
  float relief = PAMP * (softSat(raw) - 0.5) * uAmp;

  // Calm water to the horizon: low relief, long slow swells rolling in from the sun.
  if (uCalmW > 0.001) {
    float r = length(p - vec2(${f(CALM.c[0])}, ${f(CALM.c[1])}));
    float calm = uCalmW * (1.0 - smoothstep(${f(CALM.r * 0.7)}, ${f(CALM.r)}, r));
    vec2 sd = vec2(${f(Math.sin((CALM.sunYaw * Math.PI) / 180))}, ${f(-Math.cos((CALM.sunYaw * Math.PI) / 180))});
    float swl = sin(dot(p, sd) * 0.45 + uTime * 0.5) * 0.6 + sin(dot(p, vec2(sd.y, -sd.x)) * 0.21 + uTime * 0.23) * 0.4;
    relief *= 1.0 - 0.75 * calm;
    h += 0.28 * swl * calm;
    v = mix(v, 0.4 + (v - 0.5) * 0.35 + 0.12 * swl, calm);
  }
  h += relief;

  // Swell: three long crests, one per company; the foam on top is that company's colour.
  if (uSwellW > 0.001) {
    float lat = (1.0 - smoothstep(${f(SWELL.reach * 0.6)}, ${f(SWELL.reach)}, abs(p.x - ${f(SWELL.x)}))) * uSwellW;
    float s = 0.0;
    ${SWELL.crests
      .map(
        (zc, k) => `{
      float d = (p.y - ${f(zc)} - 0.7 * sin(p.x * 0.13 + ${f(k * 1.7)})) / ${f(SWELL.width)};
      float c = exp(-d * d) * (0.95 + 0.05 * sin(uTime * 0.5 + ${f(k * 2.1)}));
      s += c;
      accent(ac, ${f(SWELL.colors[k])}, exp(-d * d / 0.012) * lat * uCrest[${k}]);
    }`,
      )
      .join("\n    ")}
    h += ${f(SWELL.height)} * s * lat;
    v = clamp(v + 0.2 * s * lat, 0.0, 1.0);
  }

  // Currents: three lanes of streaks flowing north, each in its skill group's colour;
  // the water between them goes quiet.
  if (uCurW > 0.001) {
    float zm = smoothstep(${f(CURRENTS.z0)}, ${f(CURRENTS.z0 + 8)}, p.y) * (1.0 - smoothstep(${f(CURRENTS.z1 - 4)}, ${f(CURRENTS.z1)}, p.y));
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
        float n = snoise(vec3(p.x * 1.6 + ${f(i * 7)}, (p.y + uTime * ${f(spd)}) * 0.22, uTime * 0.05));
        v = mix(v, clamp(0.68 + 0.4 * n, 0.0, 1.0), m);
        h += 0.12 * n * m;
        accent(ac, ${f(CURRENTS.colors[i])}, m * (0.55 + 0.45 * smoothstep(-0.1, 0.5, n)));
      }
    }`,
      )
      .join("\n    ")}
  }

  for (int i = 0; i < ${MAX_EDDY}; i++) {
    h += vt[i].h;
    v = mix(v, vt[i].band, vt[i].blend);
    float hiK = uEddyHi < -0.5 || abs(uEddyHi - float(i)) < 0.5 ? 1.0 : 0.25;
    accent(ct, EDDY_COL[i], vt[i].acc * hiK);
  }
  h += ms.h;
  v = mix(v, max(v, ms.band), ms.blend);
  v = mix(v, 1.0, ms.dark * 0.85);
  // Strips riding the contours, as on the live homepage: where they show is decided in the
  // same flowing (and, in a vortex, twisted) coordinates as the plasma, so they move with it.
  // Denser on the maelstrom's walls.
  {
    vec2 fc = pp + uFlow;
    float m = snoise(vec3(fc * 0.32, uTime * 0.07));
    float thr = mix(0.62, 0.15, ms.acc);
    float amt = smoothstep(thr, thr + 0.12, m) * uAmbient;
    float pal = snoise(vec3(fc * 0.15 + 37.0, uTime * 0.03)) > 0.3 ? 2.0 : 1.0;
    accent(ct, pal, max(amt, 0.0));
  }
  vec2 outA = ac.y >= ct.y ? ac : vec2(ct.x, -ct.y);
  return vec4(h, clamp(v, 0.0, 1.0), outA);
}`;

/** Full-screen triangle. */
export const QUAD_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Pass 1: one texel per glyph cell of one level. r = band, g = height, b = accent index, a = accent amount. */
export const FIELD_FS = `#version 300 es
precision highp float;
${NOISE}
${FIELD}
uniform vec2 uOrig;   // world xz of texel (0, 0)'s corner
uniform vec2 uCellK;  // this level's cell size (world)
out vec4 o;
void main() {
  vec2 p = uOrig + (floor(gl_FragCoord.xy) + 0.5) * uCellK;
  vec4 fv = field(p, true);
  o = vec4(fv.y, fv.x, fv.z, fv.w);
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
uniform vec3  uAcc[3];           // accent palette (--ocean-a1..3)
uniform float uGain;
uniform float uTime;
uniform vec3  uSunDir;
uniform float uSunAmt;           // glitter path toward the sun
uniform vec2  uFog;              // fade start, end (world distance)
uniform float uGlyph;            // smallest glyph relative to native
uniform vec2  uRes;
uniform vec4  uQuiet[${MAX_QUIET}];  // device px, top-left origin: x0, y0, x1, y1
uniform float uQuietA[${MAX_QUIET}];
uniform int   uQuietN;
uniform float uFeather;
out vec4 o;

const float L = ${f(LEVELS)};

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float bandOf(ivec2 id, int k) {
  return floor(texelFetch(uField, ivec3(clamp(id, ivec2(0), uTex - 1), k), 0).r * L + 0.5);
}

// Glyph of level k at xz: (colour, coverage × opacity).
vec4 glyph(int k, vec2 xz, vec2 gx, vec2 gy, float hpx) {
  float s = exp2(float(k));
  vec2 ck = (xz - uOrig[k]) / (uCell * s);
  ivec2 id = ivec2(floor(ck));
  if (id.x < 0 || id.y < 0 || id.x >= uTex.x || id.y >= uTex.y) return vec4(0.0);
  vec4 fv = texelFetch(uField, ivec3(id, k), 0);
  float band = floor(fv.r * L + 0.5);
  float accI = fv.b;
  float accA = fv.a;

  // Contour accents (negative amount): only on cells at the high side of a band edge, upper
  // bands only, so they trace the waveform's contours like the live site's strips.
  if (accA < 0.0) {
    float amt = -accA;
    accA = 0.0;
    if (band >= 3.0) {
      float lo = min(min(bandOf(id + ivec2(1, 0), k), bandOf(id - ivec2(1, 0), k)),
                     min(bandOf(id + ivec2(0, 1), k), bandOf(id - ivec2(0, 1), k)));
      if (lo < band) accA = amt;
    }
  }

  // Glitter path toward a low sun.
  if (uSunAmt > 0.001) {
    vec2 cc = uOrig[k] + (vec2(id) + 0.5) * uCell * s;
    vec2 dv = normalize(cc - uCam.xz);
    vec2 sd = normalize(uSunDir.xz);
    float cr = abs(dv.x * sd.y - dv.y * sd.x);
    float tw = step(0.62, fract(hash12(vec2(id) + float(k) * 31.0) + uTime * (0.25 + 0.5 * hash12(vec2(id.yx)))));
    float g = exp(-cr * cr / 0.0012) * step(0.0, dot(dv, sd)) * tw * uSunAmt;
    if (g > accA) { accA = g; accI = 2.0; band = max(band, 4.0); }
  }

  if (accA > 0.3) band = max(band, 3.0);
  if (band < 1.0) return vec4(0.0);
  float a = min(1.0, pow(band / L, ${f(LEVEL_GAMMA)}) * ${f(BRIGHTNESS)} * uGain);
  vec3 col = mix(uLo, uHi, smoothstep(${f(RAMP[0])}, ${f(RAMP[1])}, a));
  if (accA > 0.001) {
    int ai = clamp(int(accI + 0.5) - 1, 0, 2);
    vec3 ac = ai == 0 ? uAcc[0] : (ai == 1 ? uAcc[1] : uAcc[2]);
    float t = min(1.0, accA * 1.3);
    col = mix(col, ac, t);
    a = mix(a, max(a, 0.85), t);
  }

  vec3 uvw = vec3(fract(ck), band - 1.0);
  gx /= s;
  gy /= s;
  float hk = hpx * s;
  float cs = textureGrad(uGlyphS, uvw, gx, gy).r;
  float t = smoothstep(uNative.y * 1.05, uNative.y * 1.8, hk);
  float cov = t > 0.0 ? mix(cs, textureGrad(uGlyphL, uvw, gx, gy).r, t) : cs;
  cov *= 1.0 - smoothstep(uNative.y * 5.0, uNative.y * 8.0, hk); // too close to read: let it go
  return vec4(col, a * cov);
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

  vec4 g0 = tk < 0.999 ? glyph(k0, xz, gx, gy, hpx) : vec4(0.0);
  vec4 g1 = tk > 0.001 ? glyph(k1, xz, gx, gy, hpx) : vec4(0.0);

  // Fade: distance, and beyond the coarsest level.
  float d = distance(uCam, vW);
  float fade = 1.0 - smoothstep(uFog.x, uFog.y, d);
  fade *= 1.0 - 0.6 * smoothstep(${f(NLEV - 1.4)}, ${f(NLEV + 0.5)}, lodRaw);

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

  vec3 a = mix(uBg, g0.rgb, g0.a);
  vec3 b = mix(uBg, g1.rgb, g1.a);
  o = vec4(mix(uBg, mix(a, b, tk), fade), 1.0);
}`;

/** Sky: a setting sun and the horizon, drawn in glyphs (screen-locked cells), only when uSunAmt > 0. */
export const SKY_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uGlyphS;
uniform vec2  uNative;
uniform vec2  uRes;
uniform vec3  uCamR;
uniform vec3  uCamU;
uniform vec3  uCamF;
uniform float uTanHalf;
uniform vec3  uSunDir;
uniform float uSunAmt;
uniform float uTime;
uniform vec3  uBg;
uniform vec3  uSunCol;   // rim / glow (orange)
uniform vec3  uSunCore;  // core (gold)
uniform vec3  uLo;
uniform vec4  uQuiet[${MAX_QUIET}];
uniform float uQuietA[${MAX_QUIET}];
uniform int   uQuietN;
uniform float uFeather;
out vec4 o;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uNative);
  vec2 cc = (cell + 0.5) * uNative;
  vec2 ndc = cc / uRes * 2.0 - 1.0;
  vec3 dir = normalize(uCamF + ndc.x * uTanHalf * (uRes.x / uRes.y) * uCamR + ndc.y * uTanHalf * uCamU);

  // Sun-relative angles: az (along the horizon), el (above the horizon).
  float el = asin(clamp(dir.y, -1.0, 1.0));
  float sunEl = asin(uSunDir.y);
  float az = atan(dir.x, -dir.z) - atan(uSunDir.x, -uSunDir.z);
  az = mod(az + 3.14159265, 6.2831853) - 3.14159265;
  const float R = 0.1;                 // disc radius (rad)
  vec2 d = vec2(az, el - sunEl) / R;   // disc units
  float r = length(d);

  float band = 0.0;
  float a = 0.0;
  vec3 col = uSunCol;

  if (r < 1.0) {
    // The disc: dense gold core shading out to an orange rim.
    band = r < 0.55 ? 7.0 : (r < 0.82 ? 6.0 : 5.0);
    col = mix(uSunCore, uSunCol, smoothstep(0.2, 1.0, r));
    a = 0.95 - 0.25 * smoothstep(0.6, 1.0, r);
    // Sunset stripes: whole glyph rows below the sun's centre, closer together toward the water.
    float sunRow = (dot(uSunDir, uCamU) / (dot(uSunDir, uCamF) * uTanHalf) * 0.5 + 0.5) * uRes.y / uNative.y;
    float k = floor(sunRow) - cell.y;   // rows below the centre
    if (k >= 1.0 && fract(sqrt(k) * 1.7) < 0.3) { band = 0.0; a = 0.0; }
  } else {
    // Halo: quantised into soft bands (like the field's elevation bands), wide along the horizon.
    vec2 hd = vec2(d.x * 0.4, d.y);
    float g = exp(-(length(hd) - 1.0) * 3.2) * step(0.0, el);
    float gb = floor(g * 4.0) / 4.0;
    if (gb > 0.0) {
      band = gb >= 0.75 ? 3.0 : (gb >= 0.5 ? 2.0 : 1.0);
      col = uSunCol;
      a = 0.2 + 0.4 * gb;
    }
  }

  // Haze: the sky thickens toward the horizon, warm near the sun, grey away from it.
  float rows = el / (2.0 * uTanHalf / uRes.y * uNative.y);   // cell rows above the horizon
  if (band < 1.0 && rows > -0.5 && rows < 6.0) {
    float warm = exp(-abs(az) / 0.5);
    float dens = 1.0 - rows / 6.0;
    float hb = floor(dens * dens * 3.0 + hash12(cell) * 0.6);
    if (hb > 0.0) {
      band = min(hb, 3.0) + (rows < 0.5 && warm > 0.4 ? 1.0 : 0.0);
      col = mix(uLo, uSunCol, warm);
      a = (0.18 + 0.3 * dens) * (0.6 + 0.4 * warm);
    }
  }

  a *= uSunAmt;
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  for (int i = 0; i < ${MAX_QUIET}; i++) {
    if (i >= uQuietN) break;
    vec4 q = uQuiet[i];
    vec2 dd = max(max(q.xy - px, px - q.zw), 0.0);
    a *= 1.0 - (1.0 - smoothstep(0.0, uFeather, length(dd))) * uQuietA[i];
  }
  vec2 uv = (gl_FragCoord.xy - cell * uNative) / uNative;
  uv.y = 1.0 - uv.y;
  float cov = band > 0.0 ? textureLod(uGlyphS, vec3(uv, band - 1.0), 0.0).r : 0.0;
  o = vec4(mix(uBg, col, a * cov), 1.0);
}`;

export const MAX_BOX = 3;

/**
 * The bottom of the maelstrom: the screen goes black and the swirling field (screen-locked
 * glyph cells) gathers into the outlines of the directory's boxes.
 */
export const FORM_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uGlyphS;
uniform vec2  uNative;
uniform vec2  uRes;
uniform float uTime;
uniform float uSpin;
uniform float uBlack;
uniform float uForm;
uniform vec4  uBox[${MAX_BOX}];   // device px, top-left origin: x0, y0, x1, y1
uniform int   uBoxN;
uniform float uBoxHi;             // hovered box (-1 = none)
uniform vec3  uAcc[3];
out vec4 o;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 rot(vec2 d, float a) { float c = cos(a), s = sin(a); return vec2(c * d.x - s * d.y, s * d.x + c * d.y); }
float sdBox(vec2 p, vec4 b) {
  vec2 c = (b.xy + b.zw) * 0.5;
  vec2 h = (b.zw - b.xy) * 0.5;
  vec2 d = abs(p - c) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uNative);
  vec2 cc = (cell + 0.5) * uNative;
  vec2 px = vec2(cc.x, uRes.y - cc.y);
  float f = uForm;

  // The free field: the plasma, still wound into the spiral you fell down.
  vec2 q = (px - uRes * 0.5) / uNative.y * 0.09;
  float r = length(q);
  q = rot(q, 3.0 * log(1.0 + 5.0 / (r + 0.3)) + uSpin);
  float pt = uTime * 0.45;
  float v = sin(q.x + pt) + sin(q.y + 0.7 * pt) + sin(0.5 * (q.x + q.y + pt)) + sin(sqrt(dot(q, q) + 1.0) + pt);
  v = 0.5 + 0.5 * v * 0.37;
  v *= smoothstep(0.2, 2.5, r);                     // the drain stays dark

  // Distance (in cell rows) to the nearest box outline.
  float dB = 1e5;
  float inside = 0.0;
  int bi = 0;
  for (int i = 0; i < ${MAX_BOX}; i++) {
    if (i >= uBoxN) break;
    float sd = sdBox(px, uBox[i]) / uNative.y;
    if (abs(sd) < dB) { dB = abs(sd); bi = i; }
    if (sd < 0.0) inside = 1.0;
  }
  // Early on the outlines are loose and wide, then they tighten onto the edges.
  float jitter = (hash12(cell + floor(uTime * 6.0)) - 0.5) * 3.0 * (1.0 - f);
  float ring = exp(-max(0.0, dB - 0.55 + jitter) / mix(9.0, 0.4, f));
  float hi = abs(uBoxHi - float(bi)) < 0.5 ? 1.0 : 0.0;
  // Once formed, the field settles into a dim, slow background (the deep), and the boxes'
  // insides clear so their text reads.
  // Calmer toward the middle where the content sits, full waveform out at the edges.
  float edgeV = smoothstep(0.22, 0.6, length((px / uRes - 0.5) * vec2(1.0, 1.35)));
  float bg = v * mix(1.0, mix(0.4, 0.9, edgeV), f) * (1.0 - inside * smoothstep(0.3, 0.8, f));
  float val = max(bg, ring * smoothstep(0.0, 0.55, f) * (0.72 + 0.28 * hi));
  float band = floor(clamp(val, 0.0, 1.0) * 7.0 + 0.5);

  vec3 grey = mix(vec3(0.3), vec3(0.75), smoothstep(0.1, 0.95, val));
  vec3 acc = bi == 0 ? uAcc[0] : (bi == 1 ? uAcc[1] : uAcc[2]);
  float edge = smoothstep(0.35, 0.95, f) * exp(-dB / 1.4);
  vec3 col = mix(grey, acc, clamp(edge * (1.0 + hi), 0.0, 1.0));
  float a = band > 0.0 ? pow(band / 7.0, 0.75) * (0.75 + 0.25 * edge) : 0.0;

  vec2 uv = (gl_FragCoord.xy - cell * uNative) / uNative;
  uv.y = 1.0 - uv.y;
  float cov = band > 0.0 ? textureLod(uGlyphS, vec3(uv, band - 1.0), 0.0).r : 0.0;
  // Box panels: a faint fill, a touch of the box's colour when hovered.
  vec3 fill = inside * smoothstep(0.5, 1.0, f) * mix(vec3(0.035), acc * 0.07, hi);
  vec3 c = mix(fill, col, a * cov);
  o = vec4(c * uBlack, uBlack);
}`;
