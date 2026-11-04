/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: GLSL
 *
 *  Pass 1 SCENE_FS — one fragment per glyph cell, two targets:
 *    o0.R  glyph value 0..1 (→ band / glyph)
 *    o0.G  packed accents: lime (hi nibble) | orange (lo nibble); 1.0 = sky
 *    o0.B  specular glint (sea) / horizon glow (sky)
 *    o0.A  intensity (lighting × fog)
 *    o1.R  beacon / scan / lighthouse glow 0..1
 *    o1.G  glow colour (palette index / 255)
 *    o1.B  region id (/ 255, 0 = open sea)
 *    o1.A  chart amount (7 bits) | grid line (high bit)
 *
 *  Pass 2 TRACE_FS — 2N+1 fragments: walks the band contour nearest
 *    the cursor (a port of ascii-field's tracePath), one column per
 *    fragment, so the ASCII pass can light it up.
 *
 *  Pass 3 ASCII_FS — full resolution: glyph atlas lookup + colour,
 *    accents, cursor trace + glow, map tint / borders / grid,
 *    beacons, particles, quiet zones, glitches.
 *
 *  Viewed straight down with ocean = lit = 0, the value is exactly
 *  the old 2D plasma field, so the hero matches the current site.
 * ─────────────────────────────────────────────────────────────
 */

import {
  BEACONS,
  CHOP,
  CHOP_AMP,
  LIGHT,
  MAX_HEIGHT,
  OCEAN,
  OCEAN_RANGE,
  PILLAR_HEIGHT,
  PLASMA_AMP,
  PLASMA_DIST,
  PLASMA_MIX,
  PLASMA_NORM,
  PLASMA_WARP,
  REGIONS,
  SUN,
  SWELLS,
} from "./world";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const v4 = (a: number, b: number, c: number, d: number) => `vec4(${f(a)}, ${f(b)}, ${f(c)}, ${f(d)})`;

export const MAX_RIPPLES = 8;
export const MAX_QUIET = 6;
export const LEVELS = 7;
/** Cursor contour trace: cells followed in each direction (ascii-field config.pointer.trace). */
export const TRACE_N = 14;

export const VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/* Simplex noise: Ashima Arts / Stefan Gustavson (MIT). */
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
// Matches ascii-field/noise.ts fbm (lacunarity 2.03, z x 1.6, normalised).
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 3; o++) {
    s += snoise(p) * a; n += a; a *= 0.5;
    p *= vec3(2.03, 2.03, 1.6);
  }
  return s / n;
}`;

type Wave = { d: [number, number]; k: number; w: number; a: number; ph: number };
const terms = (ws: Wave[], fn: string) =>
  ws
    .map(
      (s) =>
        `  h += ${f(s.a)} * ${fn}(dot(p, vec2(${f(s.d[0])}, ${f(s.d[1])})) * ${f(s.k)} - t * ${f(s.w)} + ${f(s.ph)});`,
    )
    .join("\n");

const NREG = REGIONS.length;
const NBEACON = BEACONS.length;
const REG_A = REGIONS.map((r) => v4(r.center[0], r.center[1], r.inner, r.outer)).join(",\n  ");
const REG_B = REGIONS.map((r) => v4(r.amp ?? 1, r.swell ?? 0, r.terrace ?? 0, r.cross ?? 0)).join(",\n  ");
const REG_C = REGIONS.map((r) => v4(r.scan ?? 0, r.ice ?? 0, r.flow ?? 0, r.ping ?? 0)).join(",\n  ");
const REG_D = REGIONS.map((r) => v4(r.spec ?? 1, r.beam ?? 0, r.color, 0)).join(",\n  ");
const BEACON_A = BEACONS.map((b, i) => v4(b.pos[0], b.pos[1], b.color, i * 1.7)).join(",\n  ");

const WORLD = `
const float PD = ${f(PLASMA_DIST)};
const float NORM = ${f(PLASMA_NORM)};
const float WARP = ${f(PLASMA_WARP)};
const float PMIX = ${f(PLASMA_MIX)};
const float PAMP = ${f(PLASMA_AMP)};
const float OCN_RANGE = ${f(OCEAN_RANGE)};
const float MAXH = ${f(MAX_HEIGHT)};
const vec3  LIGHT = normalize(vec3(${f(LIGHT[0])}, ${f(LIGHT[1])}, ${f(LIGHT[2])}));
const vec3  SUN = normalize(vec3(${f(SUN[0])}, ${f(SUN[1])}, ${f(SUN[2])}));

const int NREG = ${NREG};
const vec4 REG_A[NREG] = vec4[NREG](
  ${REG_A}
); // centre xz, inner, outer
const vec4 REG_B[NREG] = vec4[NREG](
  ${REG_B}
); // amp, swell, terrace, cross
const vec4 REG_C[NREG] = vec4[NREG](
  ${REG_C}
); // scan, ice, flow, ping
const vec4 REG_D[NREG] = vec4[NREG](
  ${REG_D}
); // spec, beam, colour, -

const int NBEACON = ${NBEACON};
const vec4 BEACON[NBEACON] = vec4[NBEACON](
  ${BEACON_A}
); // xz, colour, phase
const float PILLAR_H = ${f(PILLAR_HEIGHT)};

uniform float uTime;
uniform float uPhase;
uniform float uMorph;
uniform vec2  uFlow;
uniform vec4  uRip[${MAX_RIPPLES}];
uniform int   uRipN;
uniform float uOcean;
uniform float uChop;
uniform int   uRegMask;  // regions within reach of the camera (bit i = REG_*[i])

float regionW(int i, vec2 p) {
  vec4 a = REG_A[i];
  return 1.0 - smoothstep(a.z, a.w, length(p - a.xy));
}

float swellH(vec2 p, float t) {
  float h = 0.0;
${terms(SWELLS, "sin")}
  return h;
}

// Sharp-crested travelling wave: broad troughs, peaked crests.
float crest(float x) { float s = 0.5 + 0.5 * sin(x); return s * s * 1.6 - 0.55; }

// Gentle crest bending so the swells aren't ruler-straight (cheap: no noise).
vec2 oceanWarp(vec2 p) {
  float t = uTime * 0.05;
  return p + 0.8 * vec2(sin(p.y * 0.11 + t) + 0.5 * sin(p.x * 0.07 - p.y * 0.05 + 1.3 * t),
                        sin(p.x * 0.09 - t * 0.8) + 0.5 * sin(p.y * 0.06 + p.x * 0.04 + 2.1));
}

float oceanH(vec2 p, float t) {
  float h = 0.0;
${terms(OCEAN, "crest")}
  return h;
}

float chopH(vec2 p, float t) {
  float h = 0.0;
${terms(CHOP, "sin")}
  return h * ${f(CHOP_AMP)};
}

// Click / arrival ripples: expanding rings in world space.
float ripples(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    if (i >= uRipN) break;
    vec4 r = uRip[i];
    float age = uTime - r.z;
    if (age < 0.0 || age > 7.0) continue;
    float x = length(p - r.xy) - age * 2.4;
    h += cos(x * 3.2) * exp(-x * x * 0.5) * exp(-age * 0.55) * r.w * 0.32;
  }
  return h;
}

vec2 warpQ(vec2 fl) {
  vec3 a = vec3(fl * 0.09, uMorph * 0.7);
  return vec2(snoise(a), snoise(a + vec3(7.3, 3.1, 11.0)));
}

// The original "ASCII Plasma" (engine.ts, sampleLattice), in world units.
// p = world point (anchors the origin ripple), w = warped flowing coords.
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

// Everything a hit point needs besides the height.
struct Sea {
  float h;       // geometric height
  float band;    // height-based value 0..1
  float swell;   // swell contribution (for the far-field texture)
  float spec;    // specular multiplier
  float ice;     // frozen amount
  float crack;   // ice crack line 0..1
  float flowV;   // current streak value
  float glow;    // scan / lighthouse glow
  float glowCol; // its palette index
  float region;  // dominant region id (0 = open sea)
  float regionW; // its weight
};

// The ocean with every region's character applied (no plasma).
float oceanSea(vec2 p, bool full, inout Sea s) {
  float t = uTime;
  vec2 wp = oceanWarp(p);
  float amp = 1.0, swell = 0.0, terr = 0.0, cross_ = 0.0, ice = 0.0, flow = 0.0, ping = 0.0;
  float extra = 0.0;
  float best = 0.0;
  for (int i = 0; i < NREG; i++) {
    if ((uRegMask & (1 << i)) == 0) continue;
    vec4 a = REG_A[i];
    float d = length(p - a.xy);
    if (d >= a.w) continue;
    float w = 1.0 - smoothstep(a.z, a.w, d);
    vec4 b = REG_B[i], c = REG_C[i], e = REG_D[i];
    amp += w * (b.x - 1.0);
    swell += w * b.y;
    terr += w * b.z;
    cross_ += w * b.w;
    ice += w * c.y;
    flow += w * c.z;
    if (c.w > 0.0) {
      // Radar ping: rings expanding from the centre.
      float x = fract((d - t * 1.7) / 7.0) - 0.5;
      extra += w * c.w * 0.22 * exp(-x * x * 90.0);
    }
    if (full) {
      s.spec += w * (e.x - 1.0);
      if (w > best) { best = w; s.region = float(i + 1); s.regionW = w; }
      if (c.x > 0.0) {
        // OCR scanline sweeping across the water.
        float sp = mod(t * 2.6, a.w * 2.0) - a.w;
        float x = (p.x - a.x) - sp;
        float g = w * c.x * exp(-x * x * 6.0);
        if (g > s.glow) { s.glow = g; s.glowCol = 9.0; } // 8 + lime: a glow on the water
      }
      if (e.y > 0.0) {
        // Lighthouse beam sweeping the water around the light.
        vec2 dv = p - a.xy - vec2(0.0, 2.0);
        float ang = atan(dv.y, dv.x) - t * 0.7;
        float dA = abs(mod(ang + 3.14159, 6.28318) - 3.14159);
        float g = e.y * smoothstep(0.32, 0.0, dA) * smoothstep(a.w * 1.6, 1.0, length(dv)) * 0.9;
        if (g > s.glow) { s.glow = g; s.glowCol = 12.0; } // 8 + warm
      }
    }
  }
  float h = amp * oceanH(wp, t);
  if (cross_ > 0.001) h += cross_ * oceanH(vec2(wp.y, -wp.x) * 1.3, t * 1.1);
  if (swell > 0.001) h += swell * swellH(p, t);
  if (flow > 0.001) h += flow * 0.2 * snoise(vec3(p.x * 0.32 - t * 1.6, p.y * 2.1, t * 0.15));
  if (ice > 0.001) {
    float frozen = 0.25 * oceanH(wp, 0.0) + 0.04 * snoise(vec3(p * 0.9, 0.0));
    h = mix(h, frozen, ice);
  }
  if (terr > 0.001) {
    float st = 5.0;
    float q = (floor(h * st) + smoothstep(0.7, 1.0, fract(h * st))) / st;
    h = mix(h, q, terr);
  }
  h += extra;
  if (full) {
    s.swell = swell * swellH(p, t);
    s.ice = ice;
    if (ice > 0.001) s.crack = smoothstep(0.9, 0.98, 1.0 - abs(snoise(vec3(p * 0.7, 3.0)))) * ice;
    if (flow > 0.001) s.flowV = flow * snoise(vec3(p.x * 0.5 - t * 2.2, p.y * 3.4, 0.0));
  }
  return h;
}

// Geometric height of the sea surface (raymarch + normals).
float geo(vec2 p) {
  Sea s = Sea(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  float h = 0.0;
#if SEA_MODE == 1
  {
#elif SEA_MODE == 0
  if (uOcean < 0.999) {
#else
  if (false) {
#endif
    vec2 fl = p + uFlow;
    vec2 q = warpQ(fl);
    float raw = plasmaRaw(p, fl + q * WARP, q);
    h = PAMP * (softSat(raw) - 0.5);
  }
#if SEA_MODE == 0
  if (uOcean > 0.001) h = mix(h, oceanSea(p, false, s), uOcean);
#elif SEA_MODE >= 2
  h = oceanSea(p, false, s);
#endif
  if (uChop > 0.001) h += uChop * chopH(p, uTime);
  return h + ripples(p);
}

// Full evaluation at a hit point.
Sea seaAt(vec2 p) {
  Sea s = Sea(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  float hP = 0.0, bP = 0.0, hO = 0.0, bO = 0.0;
#if SEA_MODE == 1
  {
#elif SEA_MODE == 0
  if (uOcean < 0.999) {
#else
  if (false) {
#endif
    vec2 fl = p + uFlow;
    vec2 q = warpQ(fl);
    vec2 w = fl + q * WARP;
    float raw = plasmaRaw(p, w, q);
    float n01 = fbm3(vec3(w * 0.1, uMorph)) * 0.75 + 0.5;
    bP = mix(n01, clamp(raw, 0.0, 1.0), PMIX);
    hP = PAMP * (softSat(raw) - 0.5);
  }
#if SEA_MODE != 1
  if (SEA_MODE >= 2 || uOcean > 0.001) {
    hO = oceanSea(p, true, s);
    bO = clamp(0.5 + hO / OCN_RANGE, 0.0, 1.0);
  }
#endif
#if SEA_MODE == 1
  float oc = 0.0;
#elif SEA_MODE >= 2
  float oc = 1.0;
#else
  float oc = uOcean;
#endif
  float rp = ripples(p);
  s.h = mix(hP, hO, oc) + rp;
  s.band = clamp(mix(bP, bO, oc) + rp * 0.8, 0.0, 1.0);
  return s;
}`;

export type SeaMode = 0 | 1 | 2 | 3;
/** Scene pass, specialised: 0 mixed (generic), 1 plasma only (hero), 2 ocean only, 3 underwater. */
export const sceneFS = (mode: SeaMode) => `#version 300 es
#define SEA_MODE ${mode}
precision highp float;
precision highp int;

uniform vec2  uRes;      // canvas, device px
uniform vec2  uCell;     // glyph cell, device px
uniform vec2  uGrid;     // cols, rows
uniform vec3  uCamPos;
uniform mat3  uCamRot;   // columns: right, up, forward
uniform float uTanHalf;  // tan(vertical fov / 2)
uniform float uPixAngle; // radians per cell (vertical)
uniform float uShade;
uniform float uFog;
uniform float uLit;
uniform float uChart;
uniform float uUnder;
uniform float uAccent;
uniform vec4  uLens;     // device px x, y (top-left origin), radius, strength
uniform int   uSteps;
uniform float uFarT;     // beyond this the sea is fogged / filtered flat: stop marching

layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;

${NOISE}
${WORLD}

// Closest approach between the ray and a vertical light pillar → (distance, ray t).
vec2 rayPillar(vec3 ro, vec3 rd, vec3 a, float hgt) {
  vec3 ba = vec3(0.0, hgt, 0.0);
  vec3 w0 = ro - a;
  float B = dot(rd, ba), C = hgt * hgt, D = dot(rd, w0), E = dot(ba, w0);
  float den = C - B * B;
  float s = den > 1e-4 ? clamp((E - B * D) / den, 0.0, 1.0) : 0.0;
  vec3 q = a + ba * s;
  float t = max(dot(q - ro, rd), 0.0);
  return vec2(length(ro + rd * t - q), t);
}

void beacons(vec3 ro, vec3 rd, float tHit, inout float glow, inout float col) {
  for (int i = 0; i < NBEACON; i++) {
    vec4 b = BEACON[i];
    // On the chart the pillars shrink to stubs: dots on the map, not streaks.
    vec2 r = rayPillar(ro, rd, vec3(b.x, -0.4, b.y), PILLAR_H * (1.0 - 0.97 * uChart));
    float wdt = max(0.06, r.y * uPixAngle * 1.1);
    float g = exp(-pow(r.x / wdt, 2.0)) + 0.25 * exp(-r.x / (wdt * 5.0));
    g *= 0.8 + 0.2 * sin(uTime * 2.2 + b.w);
    if (r.y > tHit + 0.1) g *= 0.12; // behind a wave
    if (g > glow) { glow = g; col = b.z; }
  }
}

void packOut(float v, float lime, float orng, float spec, float inten,
             float glow, float glowCol, float region, float chart, bool grid) {
  float g = (floor(lime * 14.0 + 0.5) * 16.0 + floor(orng * 15.0 + 0.5)) / 255.0;
  o0 = vec4(clamp(v, 0.0, 1.0), g, clamp(spec, 0.0, 1.0), clamp(inten, 0.0, 1.0));
  float a = (floor(clamp(chart, 0.0, 1.0) * 127.0 + 0.5) + (grid ? 128.0 : 0.0)) / 255.0;
  o1 = vec4(clamp(glow, 0.0, 1.0), glowCol / 255.0, region / 255.0, a);
}

void underwater(vec3 ro, vec3 rd) {
  float t = 0.0;
  bool hit = false;
  if (rd.y > 0.02) {
    float t0 = ro.y < -MAXH ? (-MAXH - ro.y) / rd.y : 0.0;
    float tmax = min((MAXH - ro.y) / rd.y, 45.0); // the murk swallows everything beyond
    t = t0;
    float dt = 0.0;
    for (int i = 0; i < 64; i++) {
      vec3 p = ro + rd * t;
      float h = geo(p.xz);
      if (p.y > h) { hit = true; break; }
      float foot = 0.6 * t * uPixAngle / max(rd.y, 0.04);
      dt = max(max(0.01, foot), (h - p.y) * 0.45);
      t += dt;
      if (t > tmax) break;
    }
  }
  float v, inten;
  if (hit) {
    vec3 p = ro + rd * t;
    float e = 0.06;
    float h0 = geo(p.xz);
    vec3 n = normalize(vec3(h0 - geo(p.xz + vec2(e, 0.0)), e, h0 - geo(p.xz + vec2(0.0, e))));
    float window = smoothstep(0.35, 0.95, rd.y);           // Snell's window overhead
    float caust = pow(clamp(dot(n, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 6.0);
    v = 0.16 + 0.62 * window * (0.55 + 0.45 * caust);
    inten = exp(-t * 0.08);
  } else {
    v = 0.05 + 0.12 * smoothstep(-0.7, 0.5, rd.y);
    inten = 1.0;
  }
  // Light shafts from above.
  vec2 sp = rd.xz / (rd.y + 1.35);
  float shaft = pow(max(snoise(vec3(sp * 5.0, uTime * 0.06)), 0.0), 2.0) * smoothstep(-0.3, 0.7, rd.y);
  v += shaft * 0.35;
  float glow = 0.0, gc = 0.0;
  beacons(ro, rd, hit ? t : 1e5, glow, gc);
  packOut(v, 0.0, 0.0, 0.0, inten, glow * 0.6, gc, 0.0, 0.0, false);
}

void main() {
  vec2 c = gl_FragCoord.xy;
  float rowTop = uGrid.y - c.y;
  vec2 px = vec2(c.x * uCell.x, rowTop * uCell.y);
  vec2 ndc = vec2(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0);
  float aspect = uRes.x / uRes.y;
  vec3 rd = normalize(uCamRot * vec3(ndc.x * aspect * uTanHalf, ndc.y * uTanHalf, 1.0));
  vec3 ro = uCamPos;

#if SEA_MODE == 3
  underwater(ro, rd);
  return;
#endif
#if SEA_MODE == 0
  if (uUnder > 0.5) { underwater(ro, rd); return; }
#endif

  // Clip the ray to the slab that can contain the surface.
  float t0 = 0.0;
  float tmax = 320.0;
  bool any = true;
  if (rd.y < -1e-4) {
    if (ro.y > MAXH) t0 = (ro.y - MAXH) / -rd.y;
    tmax = min(tmax, (ro.y + MAXH) / -rd.y);
  } else if (ro.y > MAXH) {
    any = false;
  } else {
    tmax = min(tmax, (MAXH - ro.y) / max(rd.y, 1e-4)); // leaves the slab upward -> sky
  }

  bool hit = false;
  float t = t0;
  if (any && tmax > t0) {
    float dt = 0.0, lh = 0.0, ly = 0.0;
    for (int i = 0; i < 160; i++) {
      if (i >= uSteps) break;
      vec3 p = ro + rd * t;
      float h = geo(p.xz);
      if (p.y < h) {
        if (i > 0) t = t - dt + dt * (lh - ly) / (p.y - ly - h + lh);
        hit = true;
        break;
      }
      lh = h;
      ly = p.y;
      // Cone marching: never step finer than ~half a glyph cell's footprint on the surface.
      float foot = 0.6 * t * uPixAngle / max(-rd.y, 0.04);
      dt = max(max(0.004, foot), (p.y - h) * 0.45);
      t += dt;
      if (t > tmax || t > uFarT) break;
    }
    // A downward ray must meet the sea before the slab floor: out of steps = distant water.
    if (!hit && rd.y < -1e-4) {
      hit = true;
      t = min(t, tmax);
    }
  }

  float glow = 0.0, gc = 0.0;
  beacons(ro, rd, hit ? t : 1e5, glow, gc);

  float horizon = smoothstep(0.004, 0.02, uFog);
  if (!hit) {
    // Sky: a soft glow hugging the horizon (only once the camera has tilted).
    float sun = pow(max(dot(rd, SUN), 0.0), 240.0);
    float hg = max(exp(-abs(rd.y) * 38.0), sun * 0.9) * horizon;
    o0 = vec4(0.0, 1.0, hg, 0.0);
    o1 = vec4(glow, gc / 255.0, 0.0, 0.0);
    return;
  }

  vec3 p = ro + rd * t;
  // World size of one cell on the surface: drives automatic detail filtering.
  float fp = t * uPixAngle / max(-rd.y, 0.02);
  float far = smoothstep(0.5, 2.2, fp);

  Sea s = seaAt(p.xz);
  float b = s.band;

  float dif = 0.75, spec = 0.0, lightMul = 1.0;
  if (uShade > 0.001) {
    float e = max(0.03, fp * 0.6);
    float h0 = geo(p.xz);
    float hx = geo(p.xz + vec2(e, 0.0)) - h0;
    float hz = geo(p.xz + vec2(0.0, e)) - h0;
    vec3 n = normalize(vec3(-hx, e, -hz));
    dif = clamp(dot(n, LIGHT), 0.0, 1.0);
    lightMul = mix(1.0, 0.2 + 1.05 * dif, uShade);
    vec3 hv = normalize(SUN - rd);
    spec = pow(clamp(dot(n, hv), 0.0, 1.0), 64.0) * uShade * s.spec * (1.0 - far * 0.6);
  }

  // Lit value: the glyph follows the light across the wave, height only tints it.
  float shade = 0.2 + 0.8 * dif;
  float litV = shade * 0.72 + (b - 0.5) * 0.4 + spec * 0.25;
  float v = mix(b, litV, uLit);
  float farV = mix(clamp(0.42 + s.swell * 0.3, 0.0, 1.0), 0.18 + 0.5 * shade, uLit);
  v = mix(v, farV, far);

  // Region character in the value.
  if (s.ice > 0.001) v = mix(v, 0.6 + 0.08 * snoise(vec3(p.xz * 0.8, 1.0)), s.ice * 0.8) - s.crack * 0.55;
  if (s.flowV != 0.0) v += s.flowV * 0.22 * (1.0 - far);
  v += s.glow * 0.25;

  float fog = exp(-t * uFog);
  float inten = clamp(mix(lightMul, 1.0, uLit) * fog, 0.0, 1.0);

  // Accent patches ride the flowing field; the ASCII pass puts them on band edges.
  vec2 fl = p.xz + uFlow;
  float lime = smoothstep(0.55, 0.9, snoise(vec3(fl * 1.6, uTime * 0.22))) * (1.0 - far) * uAccent;
  float orng = smoothstep(0.6, 0.92, snoise(vec3(fl * 1.3 + 41.0, uTime * 0.17))) * (0.3 + 0.7 * min(1.0, abs(s.swell) * 3.0 + s.regionW)) * (1.0 - far) * uAccent;

  if (s.glow > glow) { glow = s.glow; gc = s.glowCol; }

  // ── Map view: a nautical chart, with the cursor scanning the live sea through it ──
  float chart = 0.0;
  bool grid = false;
  if (uChart > 0.001) {
    float lens = 0.0;
    if (uLens.w > 0.001) {
      float d = length(px - uLens.xy) / uLens.z;
      lens = (1.0 - smoothstep(0.62, 1.0, d)) * uLens.w;
    }
    chart = uChart * (1.0 - lens);
    float cur = snoise(vec3(p.xz * 0.045, uTime * 0.012));
    float detail = snoise(vec3(p.xz * 0.14, 3.0));
    float chartV = 0.2 + 0.13 * cur + 0.06 * detail + 0.14 * s.regionW + 0.08 * clamp(s.swell, -1.0, 1.0);
    v = mix(v, chartV, chart);
    inten = mix(inten, 1.0, chart);
    lime *= 1.0 - chart * 0.85;
    orng *= 1.0 - chart * 0.85;
    vec2 gq = abs(fract(p.xz / 16.0 + 0.5) - 0.5) * 16.0;
    grid = min(gq.x, gq.y) < fp * 0.55;
  }

  packOut(v, lime, orng, spec * fog, inten, glow, gc, s.regionW > 0.5 ? s.region : 0.0, chart, grid);
}`;

/* Cursor contour trace (port of ascii-field engine.ts: seed search + tracePath). */
export const TRACE_FS = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uScene;
uniform vec2  uGrid;     // cols, rows
uniform ivec2 uPtrCell;  // cursor cell (col, row from top)
uniform int   uN;

out vec4 o;

const float L = ${f(LEVELS)};
const int MAX_JUMP = 4;

int bandAt(int c, int r) {
  if (c < 0 || r < 0 || c >= int(uGrid.x) || r >= int(uGrid.y)) return -1;
  vec4 d = texelFetch(uScene, ivec2(c, int(uGrid.y) - 1 - r), 0);
  if (d.g > 0.99) return -1;
  return int(floor(d.r * L + 0.5));
}

bool edgeContinuous(int a, int b, int r0, int r1, int band) {
  int lo = min(r0, r1) + 1;
  int hi = max(r0, r1) - 1;
  for (int r = lo; r <= hi; r++) {
    if (bandAt(a, r) != band && bandAt(b, r) != band) return false;
  }
  return true;
}

void main() {
  int k = int(gl_FragCoord.x) - uN;
  int steps = k < 0 ? -k : k;
  int dir = k < 0 ? -1 : 1;
  int pc = uPtrCell.x;
  int prow = uPtrCell.y;

  // Nearest band edge (any band >= 1) within reach of the cursor.
  int best = -1;
  int bestD = 99;
  for (int dr = -9; dr <= 9; dr++) {
    int r = prow + dr;
    int b = bandAt(pc, r);
    if (b < 1) continue;
    if (b != bandAt(pc, r - 1) || b != bandAt(pc, r + 1)) {
      int ad = dr < 0 ? -dr : dr;
      if (ad < bestD) { bestD = ad; best = r; }
    }
  }
  if (best < 0) { o = vec4(0.0); return; }
  int band = bandAt(pc, best);
  int side = bandAt(pc, best - 1) != band ? -1 : 1;

  int c = pc;
  int r = best;
  int lastDr = 0;
  for (int i = 0; i < 32; i++) {
    if (i >= steps) break;
    int nc = c + dir;
    if (nc < 0 || nc >= int(uGrid.x)) { o = vec4(0.0); return; }
    int bestDr = 99;
    float bestScore = 1e9;
    for (int dr = -MAX_JUMP; dr <= MAX_JUMP; dr++) {
      int nr = r + dr;
      if (bandAt(nc, nr) != band) continue;
      if (bandAt(nc, nr + side) == band) continue; // interior, not the edge
      if (!edgeContinuous(c, nc, r, nr, band)) continue;
      float score = float(dr < 0 ? -dr : dr) + (dr == lastDr ? 0.0 : 0.25);
      if (score < bestScore) { bestScore = score; bestDr = dr; }
    }
    if (bestDr == 99) { o = vec4(0.0); return; } // contour ended
    c = nc;
    r += bestDr;
    lastDr = bestDr;
  }
  // row (16 bit), valid, band
  o = vec4(float(r / 256) / 255.0, float(r - (r / 256) * 256) / 255.0, 1.0, float(band) / 255.0);
}`;

/*
 * Resolve pass: one fragment per CELL (cols x rows). Decides each cell's glyph,
 * colour and alpha (accents, cursor trace + glow, chart, beacons, particles,
 * quiet zones, glitches). The glyph pass below only stamps the atlas, so the
 * per-pixel cost stays tiny at any resolution.
 *   o0 = colour.rgb, alpha      o1.r = glyph index / 255
 */
export const RESOLVE_FS = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uScene;
uniform sampler2D uScene2;
uniform sampler2D uTrace;
uniform vec2  uRes;
uniform vec2  uCell;
uniform vec2  uGrid;
uniform vec3  uLo;
uniform vec3  uHi;
uniform vec2  uRamp;
uniform vec3  uPal[5];   // 1-3 lime family, 4-5 warm/orange family
uniform float uBright;
uniform float uGamma;
uniform float uGain;
uniform vec3  uPointer;  // device px (top-left origin), strength
uniform float uPointerR;
uniform float uGlow;
uniform ivec2 uTraceSeed; // cursor cell (col, row); col < 0 = off
uniform float uTraceStr;
uniform int   uTraceN;
uniform float uGlitch;
uniform float uSeed;
uniform float uStars;
uniform float uSnow;
uniform float uTopDown;
uniform float uTime;
uniform vec4  uQuiet[${MAX_QUIET}];  // rect x0,y0,x1,y1 (device px)
uniform float uQuietS[${MAX_QUIET}]; // strength
uniform int   uQuietN;
uniform float uQuietFeather;

layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;

const float L = ${f(LEVELS)};
const int REG_COLOR[${REGIONS.length}] = int[${REGIONS.length}](${REGIONS.map((r) => r.color).join(", ")});
const int G_EXTRA = 10;   // extra glyphs after the ramp: / \\ | _ < > ^ ~

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

ivec2 clampCell(ivec2 c) { return clamp(c, ivec2(0), ivec2(uGrid) - 1); }

int bandAt(ivec2 c) {
  vec4 d = texelFetch(uScene, clampCell(c), 0);
  if (d.g > 0.99) return -1;
  return int(floor(d.r * L + 0.5));
}

int regionAt(ivec2 c) { return int(floor(texelFetch(uScene2, clampCell(c), 0).b * 255.0 + 0.5)); }

vec3 pal(int i) { return uPal[clamp(i, 1, 5) - 1]; }

// Cursor contour trace: is this cell on the traced path? Returns envelope (0 = no).
float traceAt(int col, int rowTop, int band) {
  if (uTraceSeed.x < 0 || uTraceStr <= 0.001) return 0.0;
  int k = col - uTraceSeed.x;
  int ak = k < 0 ? -k : k;
  if (ak > uTraceN) return 0.0;
  vec4 tk = texelFetch(uTrace, ivec2(k + uTraceN, 0), 0);
  if (tk.b < 0.5) return 0.0;
  int tb = int(floor(tk.a * 255.0 + 0.5));
  int r = int(floor(tk.r * 255.0 + 0.5)) * 256 + int(floor(tk.g * 255.0 + 0.5));
  float env = uTraceStr * (1.0 - float(ak) / float(uTraceN) * 0.85);
  if (rowTop == r) return env;
  // Vertical runs where the contour jumps rows between columns (stampPath).
  for (int s = -1; s <= 1; s += 2) {
    int m = k + s;
    int am = m < 0 ? -m : m;
    if (am > uTraceN) continue;
    vec4 tm = texelFetch(uTrace, ivec2(m + uTraceN, 0), 0);
    if (tm.b < 0.5) continue;
    int rm = int(floor(tm.r * 255.0 + 0.5)) * 256 + int(floor(tm.g * 255.0 + 0.5));
    int lo = min(r, rm) + 1;
    int hi = max(r, rm) - 1;
    if (rowTop < lo || rowTop > hi || band != tb) continue;
    ivec2 other = ivec2(uTraceSeed.x + m, int(uGrid.y) - 1 - rowTop);
    // The column nearer the seed owns the run; the outer one fills only where it has to.
    if (am > ak) return env;
    if (bandAt(other) != tb) return env;
  }
  return 0.0;
}

void out0() { o0 = vec4(0.0); o1 = vec4(0.0); }

void main() {
  // This fragment is one cell; fc = its centre in device px (top-left origin).
  vec2 cellF = vec2(floor(gl_FragCoord.x), uGrid.y - 1.0 - floor(gl_FragCoord.y));
  vec2 fc = (cellF + 0.5) * uCell;

  // Transition glitch: rows tear sideways in steps.
  float gh = hash(vec2(cellF.y, uSeed));
  if (uGlitch > 0.0 && gh < uGlitch * 0.3) {
    cellF.x += floor((hash(vec2(cellF.y, uSeed + 1.7)) - 0.5) * 40.0 * uGlitch);
  }
  if (cellF.x < 0.0 || cellF.x >= uGrid.x) { out0(); return; }
  ivec2 cell = ivec2(cellF.x, uGrid.y - 1.0 - cellF.y);
  vec4 d = texelFetch(uScene, cell, 0);
  vec4 d2 = texelFetch(uScene2, cell, 0);

  int glyph = 0;
  float alpha = 0.0;
  vec3 col = uLo;
  bool accent = false;
  int band = -1;

  if (d.g > 0.99) {
    // Sky: horizon haze + sparse stars.
    float glow = d.b;
    if (glow > 0.04) {
      glyph = glow > 0.55 ? 3 : 1; // '-' then '.'
      alpha = glow * 0.42 * uBright;
    } else {
      float h = hash(cellF * 1.37 + 0.5);
      if (h < 0.006 * uStars) {
        glyph = h < 0.0012 * uStars ? 5 : 1; // '+' or '.'
        alpha = (0.18 + 0.14 * sin(uTime * (1.0 + h * 900.0))) * uStars;
      }
    }
    col = mix(uLo, uHi, smoothstep(uRamp.x, uRamp.y, alpha));
  } else {
    band = int(floor(d.r * L + 0.5));
    float inten = d.a;
    float chartAmt = mod(floor(d2.a * 255.0 + 0.5), 128.0) / 127.0;
    bool grid = d2.a * 255.0 > 127.5;
    glyph = band;
    alpha = band <= 0 ? 0.0 : pow(float(band) / L, uGamma) * uBright * inten;

    // Specular glints: brightest glyphs.
    if (d.b > 0.5 && band > 0) {
      glyph = d.b > 0.8 ? 9 : 8; // '@' / '%'
      alpha = max(alpha, d.b * uBright * 1.25);
    }
    col = mix(uLo, uHi, smoothstep(uRamp.x, uRamp.y, alpha));

    int up = bandAt(cell + ivec2(0, 1));
    int dn = bandAt(cell - ivec2(0, 1));
    bool edge = band > 0 && ((up >= 0 && up != band) || (dn >= 0 && dn != band));

    // Map view: regions tinted in their colour, dotted borders, graticule.
    if (chartAmt > 0.01) {
      int rid = int(floor(d2.b * 255.0 + 0.5));
      if (rid > 0) {
        int rc = REG_COLOR[clamp(rid - 1, 0, ${REGIONS.length - 1})];
        col = mix(col, pal(rc), 0.55 * chartAmt);
        alpha = max(alpha, 0.16 * chartAmt);
        bool border = regionAt(cell + ivec2(1, 0)) != rid || regionAt(cell - ivec2(1, 0)) != rid ||
                      regionAt(cell + ivec2(0, 1)) != rid || regionAt(cell - ivec2(0, 1)) != rid;
        if (border) {
          glyph = 1; // '.'
          col = pal(rc);
          alpha = max(alpha, 0.7 * chartAmt);
          accent = true;
        }
      }
      if (grid && !accent) {
        glyph = 1;
        col = mix(col, uHi, 0.5 * chartAmt);
        alpha = max(alpha, 0.24 * chartAmt);
      }
    }

    // Accent strips on band edges (lime on high contours, orange on mid ones).
    if (edge && !accent) {
      float gv = floor(d.g * 255.0 + 0.5);
      float lime = floor(gv / 16.0) / 14.0;
      float orng = mod(gv, 16.0) / 15.0;
      float vis = clamp(inten * 1.4, 0.0, 1.0);
      float pick = hash(floor(cellF / vec2(9.0, 3.0)));
      if (lime > 0.35 && band >= int(L) - 2) {
        col = uPal[int(pick * 2.999)];
        alpha = max(alpha, (0.5 + 0.45 * lime) * vis);
        accent = true;
      } else if (orng > 0.35 && band >= 2 && band <= int(L) - 2) {
        col = uPal[3 + int(pick * 1.999)];
        alpha = max(alpha, (0.45 + 0.45 * orng) * vis);
        accent = true;
      }
    }

    // Cursor: the contour under the pointer lights up lime along the curve.
    float tr = traceAt(int(cellF.x), int(cellF.y), band);
    if (tr > 0.0) {
      col = uPal[0];
      alpha = max(alpha, 0.35 + 0.6 * tr);
      accent = true;
    }

    // Cursor: a soft light lift.
    if (uPointer.z > 0.001 && band > 0) {
      float pd = length(fc - uPointer.xy) / uPointerR;
      if (pd < 1.0) {
        float k = (1.0 - pd) * (1.0 - pd) * uPointer.z * uGlow;
        alpha += k;
        if (!accent) col = mix(col, uHi, k * 2.0);
      }
    }
  }

  // Light pillars / scanlines / lighthouse beams.
  float bg = d2.r;
  if (bg > 0.18) {
    int bc = int(floor(d2.g * 255.0 + 0.5));
    bool onWater = bc >= 8; // scanline / lighthouse beam lying on the sea
    if (onWater) bc -= 8;
    float k = smoothstep(0.18, 0.9, bg);
    if (onWater) glyph = bg > 0.55 ? 4 : 3; // '=' / '-'
    else if (bg > 0.55) glyph = uTopDown > 0.5 ? 9 : G_EXTRA + 2; // '@' from above, '|' side-on
    else if (alpha < 0.05 || glyph < 2) glyph = bg > 0.35 ? 5 : 2; // halo: '+' / ':'
    col = mix(col, pal(max(bc, 1)), k);
    alpha = max(alpha, 0.25 + 0.7 * k);
  }

  // Underwater: drifting particles.
  if (uSnow > 0.001) {
    float sy = cellF.y + uTime * 1.3;
    vec2 sc = vec2(cellF.x, floor(sy));
    float h = hash(sc * 0.731 + 7.0);
    if (h < 0.01 * uSnow) {
      glyph = h < 0.003 * uSnow ? 5 : 1;
      alpha = max(alpha, 0.25 + 0.4 * hash(sc + 3.0));
      col = mix(uLo, uHi, 0.6);
    }
  }

  // Glitch glyph substitution.
  if (uGlitch > 0.0 && alpha > 0.0 && hash(cellF + uSeed * 3.1) < uGlitch * 0.12) {
    glyph = G_EXTRA + int(hash(cellF.yx + uSeed) * 7.999);
  }

  // Quiet zones: keep text readable.
  float qm = 1.0;
  for (int i = 0; i < ${MAX_QUIET}; i++) {
    if (i >= uQuietN) break;
    vec4 r = uQuiet[i];
    vec2 dd = max(max(r.xy - fc, fc - r.zw), 0.0);
    float m = 1.0 - smoothstep(0.0, uQuietFeather, length(dd));
    qm *= 1.0 - uQuietS[i] * m;
  }
  alpha = clamp(alpha * qm * uGain, 0.0, 1.0);
  if (alpha <= 0.003 || glyph == 0) { out0(); return; }
  o0 = vec4(col, alpha);
  o1 = vec4(float(glyph) / 255.0, 0.0, 0.0, 1.0);
}`;

/* Glyph pass: full resolution, just stamps each cell's glyph from the atlas. */
export const GLYPH_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uCells;   // colour.rgb, alpha
uniform sampler2D uGlyphs;  // glyph index / 255
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform vec2 uCell;
uniform vec2 uGrid;
out vec4 o;
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cellF = floor(fc / uCell);
  vec2 local = fc - cellF * uCell;
  ivec2 cell = ivec2(cellF.x, uGrid.y - 1.0 - cellF.y);
  vec4 c = texelFetch(uCells, cell, 0);
  if (c.a <= 0.003) { o = vec4(0.0); return; }
  float g = floor(texelFetch(uGlyphs, cell, 0).r * 255.0 + 0.5);
  float a = texelFetch(uAtlas, ivec2(g * uCell.x + local.x, local.y), 0).a * c.a;
  o = vec4(c.rgb * a, a);
}`;
