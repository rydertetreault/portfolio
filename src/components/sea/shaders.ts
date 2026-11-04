/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: GLSL
 *
 *  Pass 1 (SCENE_FS): one fragment per glyph cell. Raymarches the
 *  ocean heightfield through the camera and writes, per cell:
 *     R  band value 0..1 (topographic elevation → glyph)
 *     G  packed accents: lime (hi nibble) | orange (lo nibble); 1.0 = sky
 *     B  specular glint (sea) / horizon glow (sky)
 *     A  intensity (lighting × fog)
 *
 *  Pass 2 (ASCII_FS): full resolution. Looks up the cell, picks a
 *  glyph from the atlas, colours it (grey ramp + accents) and adds
 *  cursor glow, quiet zones behind text, and transition glitches.
 *
 *  Viewed straight down with shade = 0 the band value is exactly the
 *  old 2D plasma field, so the hero looks like the current site.
 * ─────────────────────────────────────────────────────────────
 */

import {
  LIGHT,
  MAX_HEIGHT,
  PLASMA_AMP,
  PLASMA_DIST,
  PLASMA_MIX,
  PLASMA_NORM,
  PLASMA_WARP,
  SWELL,
  SWELLS,
  CHOP,
  CHOP_AMP,
  SUN,
} from "./world";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const MAX_RIPPLES = 8;
export const MAX_QUIET = 6;
export const LEVELS = 7;

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
// Matches ascii-field/noise.ts fbm (lacunarity 2.03, z × 1.6, normalised).
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 3; o++) {
    s += snoise(p) * a; n += a; a *= 0.5;
    p *= vec3(2.03, 2.03, 1.6);
  }
  return s / n;
}`;

const swellTerms = SWELLS.map(
  (s) =>
    `  h += ${f(s.a)} * sin(dot(p, vec2(${f(s.d[0])}, ${f(s.d[1])})) * ${f(s.k)} - t * ${f(s.w)} + ${f(s.ph)});`,
).join("\n");

const chopTerms = CHOP.map(
  (s) =>
    `  h += ${f(s.a)} * sin(dot(p, vec2(${f(s.d[0])}, ${f(s.d[1])})) * ${f(s.k)} - t * ${f(s.w)} + ${f(s.ph)});`,
).join("\n");

const WORLD = `
const float PD = ${f(PLASMA_DIST)};
const float NORM = ${f(PLASMA_NORM)};
const float WARP = ${f(PLASMA_WARP)};
const float PMIX = ${f(PLASMA_MIX)};
const float PAMP = ${f(PLASMA_AMP)};
const vec2  SW_C = vec2(${f(SWELL.center[0])}, ${f(SWELL.center[1])});
const float SW_IN = ${f(SWELL.inner)};
const float SW_OUT = ${f(SWELL.outer)};
const float SW_CHOP = ${f(SWELL.chop)};
const float MAXH = ${f(MAX_HEIGHT)};
const vec3  LIGHT = normalize(vec3(${f(LIGHT[0])}, ${f(LIGHT[1])}, ${f(LIGHT[2])}));
const vec3  SUN = normalize(vec3(${f(SUN[0])}, ${f(SUN[1])}, ${f(SUN[2])}));

uniform float uTime;
uniform float uPhase;
uniform float uMorph;
uniform vec2  uFlow;
uniform vec4  uRip[${MAX_RIPPLES}];
uniform int   uRipN;
uniform float uChop;

float swellW(vec2 p) { return 1.0 - smoothstep(SW_IN, SW_OUT, length(p - SW_C)); }

float swellH(vec2 p, float t) {
  float h = 0.0;
${swellTerms}
  return h;
}

float chopH(vec2 p, float t) {
  float h = 0.0;
${chopTerms}
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

// Geometric height of the sea surface.
float geo(vec2 p) {
  vec2 fl = p + uFlow;
  vec2 q = warpQ(fl);
  float raw = plasmaRaw(p, fl + q * WARP, q);
  float sw = swellW(p);
  float h = PAMP * mix(1.0, SW_CHOP, sw) * (softSat(raw) - 0.5) + sw * swellH(p, uTime) + ripples(p);
  if (uChop > 0.001) h += uChop * chopH(p, uTime);
  return h;
}`;

export const SCENE_FS = `#version 300 es
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
uniform float uAccent;   // accent density (lower on the map view)
uniform int   uSteps;

out vec4 o;

${NOISE}
${WORLD}

void main() {
  vec2 c = gl_FragCoord.xy;
  float rowTop = uGrid.y - c.y;
  vec2 px = vec2(c.x * uCell.x, rowTop * uCell.y);
  vec2 ndc = vec2(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0);
  float aspect = uRes.x / uRes.y;
  vec3 rd = normalize(uCamRot * vec3(ndc.x * aspect * uTanHalf, ndc.y * uTanHalf, 1.0));
  vec3 ro = uCamPos;

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
    tmax = min(tmax, (MAXH - ro.y) / max(rd.y, 1e-4)); // leaves the slab upward → sky
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
      dt = max(0.004 + 0.006 * t, (p.y - h) * 0.45);
      t += dt;
      if (t > tmax) break;
    }
    // A downward ray must meet the sea before the slab floor: out of steps = distant water.
    if (!hit && rd.y < -1e-4) {
      hit = true;
      t = min(t, tmax);
    }
  }

  float horizon = smoothstep(0.004, 0.02, uFog);
  if (!hit) {
    // Sky: a soft glow hugging the horizon (only once the camera has tilted).
    float sun = pow(max(dot(rd, SUN), 0.0), 240.0);
    float glow = max(exp(-abs(rd.y) * 38.0), sun * 0.9) * horizon;
    o = vec4(0.0, 1.0, glow, 0.0);
    return;
  }

  vec3 p = ro + rd * t;
  // World size of one cell on the surface: drives automatic detail filtering.
  float fp = t * uPixAngle / max(-rd.y, 0.02);
  float far = smoothstep(0.5, 2.2, fp);

  vec2 fl = p.xz + uFlow;
  vec2 q = warpQ(fl);
  vec2 w = fl + q * WARP;
  float raw = plasmaRaw(p.xz, w, q);
  float n01 = fbm3(vec3(w * 0.1, uMorph)) * 0.75 + 0.5;
  float b = mix(n01, clamp(raw, 0.0, 1.0), PMIX);
  float sw = swellW(p.xz);
  float sh = sw * swellH(p.xz, uTime);
  float rp = ripples(p.xz);
  float ch = uChop > 0.001 ? uChop * chopH(p.xz, uTime) * (1.0 - smoothstep(0.08, 0.45, fp)) : 0.0;
  b = mix(0.5, b, mix(1.0, SW_CHOP + 0.15, sw)); // the swell's long waves dominate its contours
  b = clamp(b + sh / 1.6 + rp * 0.8 + ch / PAMP, 0.0, 1.0);
  b = mix(b, clamp(0.42 + sh * 0.3, 0.0, 1.0), far); // distant sea: uniform texture, swells still read

  float light = 1.0;
  float spec = 0.0;
  if (uShade > 0.001) {
    float e = max(0.03, fp * 0.6);
    float hx = geo(p.xz + vec2(e, 0.0)) - geo(p.xz - vec2(e, 0.0));
    float hz = geo(p.xz + vec2(0.0, e)) - geo(p.xz - vec2(0.0, e));
    vec3 n = normalize(vec3(-hx, 2.0 * e, -hz));
    float dif = clamp(dot(n, LIGHT), 0.0, 1.0);
    light = mix(1.0, 0.2 + 1.05 * dif, uShade);
    vec3 hv = normalize(SUN - rd);
    spec = pow(clamp(dot(n, hv), 0.0, 1.0), 64.0) * uShade * (1.0 - far * 0.6);
  }
  float fog = exp(-t * uFog);

  // Accent patches ride the flowing field; the ASCII pass puts them on band edges.
  float lime = smoothstep(0.55, 0.9, snoise(vec3(fl * 1.6, uTime * 0.22))) * (1.0 - far) * uAccent;
  float orng = smoothstep(0.6, 0.92, snoise(vec3(fl * 1.3 + 41.0, uTime * 0.17))) * (0.3 + 0.7 * sw) * (1.0 - far) * uAccent;
  float g = (floor(lime * 14.0 + 0.5) * 16.0 + floor(orng * 15.0 + 0.5)) / 255.0;

  o = vec4(b, g, clamp(spec * fog, 0.0, 1.0), clamp(light * fog, 0.0, 1.0));
}`;

export const ASCII_FS = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uScene;
uniform sampler2D uAtlas;
uniform vec2  uRes;
uniform vec2  uCell;
uniform vec2  uGrid;
uniform vec3  uLo;
uniform vec3  uHi;
uniform vec2  uRamp;
uniform vec3  uPal[5];   // 0-2 lime family, 3-4 warm/orange family
uniform float uBright;
uniform float uGamma;
uniform float uGain;
uniform vec3  uPointer;  // device px (top-left origin), strength
uniform float uPointerR;
uniform float uGlow;
uniform float uGlitch;
uniform float uSeed;
uniform float uStars;
uniform float uContour;
uniform float uTime;
uniform vec4  uQuiet[${MAX_QUIET}];  // rect x0,y0,x1,y1 (device px)
uniform float uQuietS[${MAX_QUIET}]; // strength
uniform int   uQuietN;
uniform float uQuietFeather;

out vec4 o;

const float L = ${f(LEVELS)};
const int G_RAMP = 0;     // " .:-=+*#%@" → 0..9
const int G_EXTRA = 10;   // "/\\\\|_<>^~" → 10..17

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

int bandAt(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(uGrid) - 1);
  vec4 d = texelFetch(uScene, c, 0);
  if (d.g > 0.99) return -1;
  return int(floor(d.r * L + 0.5));
}

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); // top-left origin
  vec2 cellF = floor(fc / uCell);
  vec2 local = fc - cellF * uCell;

  // Transition glitch: rows tear sideways in steps.
  float gh = hash(vec2(cellF.y, uSeed));
  if (uGlitch > 0.0 && gh < uGlitch * 0.3) {
    cellF.x += floor((hash(vec2(cellF.y, uSeed + 1.7)) - 0.5) * 40.0 * uGlitch);
  }
  if (cellF.x < 0.0 || cellF.x >= uGrid.x) { o = vec4(0.0); return; }
  ivec2 cell = ivec2(cellF.x, uGrid.y - 1.0 - cellF.y);
  vec4 d = texelFetch(uScene, cell, 0);

  int glyph = 0;
  float alpha = 0.0;
  vec3 col = uLo;
  bool accent = false;

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
    float t = smoothstep(uRamp.x, uRamp.y, alpha);
    col = mix(uLo, uHi, t);
  } else {
    int band = int(floor(d.r * L + 0.5));
    float inten = d.a;
    glyph = G_RAMP + band;
    alpha = band <= 0 ? 0.0 : pow(float(band) / L, uGamma) * uBright * inten;

    // Specular glints: brightest glyphs.
    if (d.b > 0.5 && band > 0) {
      glyph = d.b > 0.8 ? 9 : 8; // '@' / '%'
      alpha = max(alpha, d.b * uBright * 1.25);
    }
    float t = smoothstep(uRamp.x, uRamp.y, alpha);
    col = mix(uLo, uHi, t);

    // Accent strips on band edges (lime on high contours, orange on mid ones).
    int up = bandAt(cell + ivec2(0, 1));
    int dn = bandAt(cell - ivec2(0, 1));
    bool edge = band > 0 && ((up >= 0 && up != band) || (dn >= 0 && dn != band));
    if (uContour > 0.001) {
      // Map view: lines where the band changes in any direction, interiors fade.
      int lf = bandAt(cell - ivec2(1, 0));
      int rt = bandAt(cell + ivec2(1, 0));
      bool line = edge || (lf >= 0 && lf != band) || (rt >= 0 && rt != band);
      if (!line) alpha *= 1.0 - uContour * 0.82;
      else alpha = mix(alpha, max(alpha, 0.5 * inten), uContour);
    }
    if (edge) {
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
  if (alpha <= 0.003) { o = vec4(0.0); return; }

  float a = texelFetch(uAtlas, ivec2(float(glyph) * uCell.x + local.x, local.y), 0).a * alpha;
  o = vec4(col * a, a);
}`;
