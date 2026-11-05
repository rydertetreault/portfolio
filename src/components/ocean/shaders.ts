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
  BUBBLE_GLYPHS,
  GLYPHS,
  ISLE_COUNT,
  isleColor,
  ISLE,
  LEVELS,
  LEVEL_GAMMA,
  PLASMA_AMP,
  PLASMA_DIST,
  PLASMA_MIX,
  PLASMA_NORM,
  PLASMA_WARP,
  QUIET,
  RAMP,
  SUN_GLYPHS,
  SWELL,
  WHIRL,
} from "./world";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const NLEV = 5;
export const MAX_QUIET = 8;
export const MAX_ISLE = ISLE_COUNT;

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
uniform vec3  uCrestB;   // how formed each crest is (builds as you fly toward it)
uniform vec4  uIsle[${MAX_ISLE}];   // centre x, z, formed 0..1, seed
uniform float uCurW;
uniform float uCalmW;
uniform float uIsleSea;    // Projects: low rolling sea around the islands (0..1)
uniform float uWhirlW;
uniform float uWhirlPhase;  // accumulated spin (speeds up as you dive in)
uniform float uDive;        // 0..1 down the whirlpool
uniform float uIsleHi;      // hovered project's island (-1 = none): the others' contours dim
uniform float uAmbient;     // ambient contour strips (0..1)

const float PD = ${f(PLASMA_DIST)};
const float NORM = ${f(PLASMA_NORM)};
const float WARP = ${f(PLASMA_WARP)};
const float PMIX = ${f(PLASMA_MIX)};
const float PAMP = ${f(PLASMA_AMP)};
const float ISLE_COL[${MAX_ISLE}] = float[${MAX_ISLE}](${Array.from({ length: ISLE_COUNT }, (_, k) => f(isleColor(k))).join(", ")});

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

// Contact: a whirlpool, formed out of the calm water between the Education camera and the sun.
// w (0..1) is how formed it is:
//   1. the sea starts turning: its waves wind round the centre and streaks of foam appear;
//   2. the funnel sinks (depth ∝ a² / (r² + a²), a real vortex's profile), bright spiral arms
//      of foam wind down into it;
//   3. the throat opens: a black hole at the bottom that the camera falls through.
// The water flows +θ (atan(z, x)) and inward: the arms follow the streamlines and turn with the
// spin, the streaks along them run down toward the throat.
struct Wp { float h; float v; float cover; float dark; float strip; float stripI; float arm; };
Wp whirlpool(vec2 p, inout vec2 pp, float w, float ang) {
  const vec2 C = vec2(${f(WHIRL.c[0])}, ${f(WHIRL.c[1])});
  const float R = ${f(WHIRL.R)};
  const float A2 = ${f(WHIRL.a * WHIRL.a)};
  vec2 d = p - C;
  float r = length(d);
  if (w < 0.001 || r > R * 1.6) return Wp(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  float wind = smoothstep(0.0, 0.45, w);
  float sink = smoothstep(0.25, 0.9, w);                  // keep in step with world.ts whirlSink
  float open = smoothstep(0.7, 1.0, w);
  float reach = 1.0 - smoothstep(R * 0.7, R * 1.5, r);
  float cover = wind * reach;
  float fR = A2 / (R * R + A2);
  float prof = max(0.0, (A2 / (r * r + A2) - fR) / (1.0 - fR));   // world.ts whirlProfile
  // The sea's own waves get wound round, tighter toward the core, and carried round with the
  // flow. (Rotating where the plasma is sampled by -a moves the pattern by +a: the same way, and
  // the same winding, as the arms below.)
  pp = C + rot(pp - C, -cover * (4.0 * prof + 1.1 * log(1.0 + R / (r + 1.0)) + ang));

  float th = atan(d.y, d.x);
  float lr = log(r + 0.6);
  float sp = th + 2.4 * lr;                               // constant along a streamline
  float spin = sp - ang;                                  // the arms turn with the water
  // Foam streaks: long along the streamlines, thin across them, running inward.
  vec2 ring = vec2(cos(sp), sin(sp));
  float st = snoise(vec3(ring * 5.0, lr * 7.0 + ang * 1.4)) * 0.65
           + snoise(vec3(ring * 11.0 + 4.0, lr * 13.0 + ang * 2.2)) * 0.35;
  // Spiral arms, edges torn by the streaks; gone near the rim (they form there) and in the throat.
  float armPh = ${f(WHIRL.arms)} * spin / 6.2831853;
  float arm = smoothstep(0.66, 0.96, 0.5 + 0.5 * cos(6.2831853 * armPh) + 0.22 * st);
  arm *= smoothstep(R * 1.05, R * 0.55, r) * smoothstep(0.4, 1.0, w);
  // Band value: dense, bright water (the turning streaks), brighter still on the arms and toward
  // the lip, where the light catches it.
  float lit = 0.85 + 0.35 * (1.0 - prof);
  float vw = clamp((0.34 + 0.4 * smoothstep(-0.6, 0.6, st) + 0.42 * arm) * lit, 0.0, 1.0);
  // Accents: short lime / orange segments riding the arms, carried round with them.
  vec2 rs = vec2(cos(spin), sin(spin));
  float sm = snoise(vec3(rs * 3.2, lr * 3.4));
  float strip = smoothstep(0.42, 0.58, sm) * smoothstep(0.35, 0.8, arm) * cover;
  float stripI = snoise(vec3(rs * 1.3 + 9.0, lr * 1.6)) > 0.0 ? 1.0 : 2.0;   // lime / orange
  // Depth: the walls darken as they go down; the throat is black.
  float dark = prof * sink;
  float throat = (1.0 - smoothstep(${f(WHIRL.throat * 0.6)}, ${f(WHIRL.throat * 2.2)}, r)) * open;
  float h = -${f(WHIRL.depth)} * prof * sink - 1.5 * throat + 0.12 * st * cover * (1.0 - prof);
  return Wp(h, vw, cover, max(dark, throat), strip, stripI, arm * cover);
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

  // The whirlpool first: it winds up the plasma that gets sampled below.
#ifdef LITE
  Wp wp = Wp(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);   // the first frame (Origin): no events, a much smaller shader
#else
  Wp wp = whirlpool(p, pp, uWhirlW, uWhirlPhase);
#endif

  vec2 fl = pp + uFlow;
  vec2 q = warpQ(fl);
  vec2 w = fl + q * WARP;
  float raw = plasmaRaw(pp, w, q);
  v = clamp(raw, 0.0, 1.0);
  if (full) v = mix(fbm3(vec3(w * 0.1, uMorph)) * 0.75 + 0.5, v, PMIX);
  v = smoothstep(0.04, 1.0, v); // hero preset threshold / softness
  float relief = PAMP * (softSat(raw) - 0.5) * uAmp;

#ifndef LITE
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
  // Projects: the same low, rolling sea as the calm water, with a little more height, so the
  // islands stand clear of it and it still moves.
  if (uIsleSea > 0.001) {
    float swl = sin(p.y * 0.55 + p.x * 0.12 + uTime * 0.6) * 0.55
              + sin(p.x * 0.27 - p.y * 0.18 - uTime * 0.31) * 0.3
              + sin(dot(p, vec2(0.6, 0.8)) * 0.9 + uTime * 0.9) * 0.15;
    relief *= 1.0 - 0.7 * uIsleSea;
    h += 0.4 * swl * uIsleSea;
    // The bands follow the swell, so its long crests read as rows rolling in, as in 05.
    v = mix(v, 0.42 + 0.24 * swl + 0.16 * (v - 0.5), uIsleSea);
  }
#endif
  h += relief;

#ifndef LITE
  // Swell: three long crests, one per company. Each forms as you fly toward it; the field's own
  // relief is smoothed out on the crests so they read as clean waves. The foam along each top
  // (a contour accent, so it traces the crest's band edges) is that company's colour.
  if (uSwellW > 0.001) {
    float lat = (1.0 - smoothstep(${f(SWELL.reach * 0.6)}, ${f(SWELL.reach)}, abs(p.x - ${f(SWELL.x)}))) * uSwellW;
    float s = 0.0;
    float on = 0.0;
    ${SWELL.crests
      .map(
        (zc, k) => `{
      float d = (p.y - ${f(zc)} - 0.7 * sin(p.x * 0.13 + ${f(k * 1.7)})) / ${f(SWELL.width)};
      // Peaked like a real swell: a broad body with a sharp top.
      float g = 0.55 * exp(-d * d) + 0.45 * exp(-abs(d) * 3.2);
      float b = 0.8 + 0.2 * uCrestB[${k}];   // keep in step with world.ts swellAt
      s += g * b * (0.95 + 0.05 * sin(uTime * 0.5 + ${f(k * 2.1)}));
      on = max(on, g);
      accent(ct, ${f(SWELL.colors[k])}, (1.0 - smoothstep(0.12, 0.45, abs(d))) * lat * uCrest[${k}]);
    }`,
      )
      .join("\n    ")}
    h -= 0.6 * relief * on * lat;
    h += ${f(SWELL.height)} * s * lat;
    // The crests brighten so each wave stands out; the water between them is left as it is.
    v = clamp(v + 0.32 * s * lat, 0.0, 1.0);
  }

  // Currents: three lanes of long streaks flowing south, toward the camera, each in its skill
  // group's colour and meandering slowly; the water around them goes quiet.
  if (uCurW > 0.001) {
    float zm = smoothstep(${f(CURRENTS.z0)}, ${f(CURRENTS.z0 + 10)}, p.y) * (1.0 - smoothstep(${f(CURRENTS.z1 - 5)}, ${f(CURRENTS.z1)}, p.y));
    float rx = (p.x - ${f(CURRENTS.x)}) / ${f(CURRENTS.gap * 2.4)};
    float region = exp(-rx * rx) * smoothstep(${f(CURRENTS.z0)}, ${f(CURRENTS.z0 + 10)}, p.y) * uCurW;
    // The open water beside the lanes is dragged along: faint streaks, slower and fading with
    // distance from the nearest lane, so the strong currents visibly pull the sea around them.
    float dl = min(min(abs(p.x - ${f(CURRENTS.x - CURRENTS.gap)}), abs(p.x - ${f(CURRENTS.x)})), abs(p.x - ${f(CURRENTS.x + CURRENTS.gap)}));
    float drag = exp(-max(0.0, dl - ${f(CURRENTS.width)}) / 2.2) * smoothstep(${f(CURRENTS.z0)}, ${f(CURRENTS.z0 + 10)}, p.y) * uCurW;
    vec2 qd = vec2(p.x * 1.3, (p.y - uTime * 1.6 * drag) * 0.2);
    float nd = snoise(vec3(qd, uTime * 0.05));
    v = mix(v, 0.1 + (v - 0.5) * 0.15, region * (1.0 - drag));
    v = mix(v, clamp(0.3 + 0.4 * nd, 0.0, 1.0), 0.7 * drag);
    h *= 1.0 - 0.8 * region;
    ${CURRENTS.speeds
      .map(
        (spd, i) => `{
      float xc = ${f(CURRENTS.x + (i - 1) * CURRENTS.gap)} + 0.6 * sin(p.y * 0.11 + ${f(i * 2.3)} - uTime * 0.25);
      float lx = (p.x - xc) / ${f(CURRENTS.width)};
      float m = exp(-lx * lx * lx * lx) * zm * uCurW;   // flat-topped: a defined lane, soft edges
      if (m > 0.01) {
        // Streaks: stretched along the flow, thin across it, carried toward the camera.
        vec2 q = vec2(p.x * 1.9 + ${f(i * 7)}, (p.y - uTime * ${f(spd)}) * 0.16);
        float n = snoise(vec3(q, uTime * 0.04)) * 0.7 + snoise(vec3(q * vec2(1.7, 2.3), uTime * 0.06 + 3.0)) * 0.3;
        v = mix(v, clamp(0.66 + 0.5 * n, 0.0, 1.0), m);
        h += 0.08 * n * m;
        accent(ac, ${f(CURRENTS.colors[i])}, m * (0.35 + 0.65 * smoothstep(-0.25, 0.4, n)));
      }
    }`,
      )
      .join("\n    ")}
  }



  // Islands: each project's island forms out of the sea. Its peak breaks the surface first,
  // then the land spreads out to the coast. Every island has its own character from its seed:
  // a sheer cliff coast on one side (rock strata on the face, surf at its foot, sea stacks
  // offshore), a beach on the sheltered side, a cove cut into the coast, and a rugged, ridged
  // interior with more than one peak. The land's elevation bands are its contour lines (a
  // topographic map, in the field's own bands), traced in the island's colour.
  for (int i = 0; i < ${MAX_ISLE}; i++) {
    float w = uIsle[i].z;
    if (w < 0.001) continue;
    vec2 d = p - uIsle[i].xy;
    float r = length(d);
    if (r > ${f(ISLE.r * 1.7)}) continue;
    float sd = uIsle[i].w;
    float sel = uIsleHi < -0.5 || abs(uIsleHi - float(i)) < 0.5 ? 1.0 : 0.3;
    vec2 dir = d / max(r, 1e-3);
    float ang = atan(d.y, d.x);
    // Which side faces the open sea (cliffs; roughly south, toward where the camera looks from,
    // turned per island) and where the cove is, both from the seed.
    float cliffA = 1.5708 + 0.9 * sin(sd * 2.3);
    float cliffW = smoothstep(0.1, 0.75, cos(ang - cliffA));
    float coveD = abs(mod(ang - (cliffA + 2.4) + 3.14159265, 6.2831853) - 3.14159265);
    float cove = exp(-coveD * coveD / 0.09);
    // Sea stacks: two pillars of rock just off the cliffs.
    for (int j = 0; j < 2; j++) {
      float sa = cliffA + (j == 0 ? -0.45 : 0.35);
      vec2 sc = vec2(cos(sa), sin(sa)) * ${f(ISLE.r)} * (1.22 + 0.08 * float(j));
      float ds = length(d - sc) / (j == 0 ? 0.38 : 0.28);
      if (ds < 1.0) {
        h = max(h, ${f(ISLE.height)} * w * (j == 0 ? 0.55 : 0.4) * sqrt(1.0 - ds * ds));
        v = mix(v, 0.4 + 0.25 * step(0.5, fract(h * 7.0)), smoothstep(1.0, 0.7, ds) * w);
      } else if (ds < 1.6) {
        v = mix(v, 0.78, (1.0 - smoothstep(1.0, 1.6, ds)) * w * (0.6 + 0.4 * sin(uTime * 2.6 + ds * 9.0)));
      }
    }
    // Organic coastline: the radius wobbles with direction (two scales), minus the cove.
    float n = 0.7 * snoise(vec3(dir * 1.1 + sd, sd)) + 0.3 * snoise(vec3(dir * 2.7 + sd * 2.0, 3.0));
    float lv0 = 1.0 - r / (${f(ISLE.r)} * (1.0 + 0.28 * n) * (1.0 - 0.32 * cove));   // 1 at the peak, 0 at the coast
    // Forming: the sea line drops from above the peak to the coast as w goes 0 → 1.
    float sea = 1.0 - w;
    float lv = (lv0 - sea) / max(1e-3, 1.0 - sea);
    if (lv < 0.0) {
      float off = -lv;
      // Shore waves rolling in toward the beach; on the cliff side, surf breaking white.
      float ring = sin(off * 22.0 + uTime * 2.4);
      float near = (1.0 - smoothstep(0.0, 0.55, off)) * w * (1.0 - 0.6 * cliffW);
      v = mix(v, 0.62, smoothstep(0.55, 1.0, ring) * near * 0.85);
      float surf = (1.0 - smoothstep(0.0, 0.1, off)) * cliffW * w;
      v = mix(v, 0.88, surf * (0.65 + 0.35 * sin(uTime * 3.1 + ang * 11.0)));
      // The breaker right at the waterline.
      v = mix(v, 0.7, (1.0 - smoothstep(0.0, 0.05, off)) * w);
      continue;
    }
    // Rugged terrain: sharp ridges running out from the high ground, and a second summit.
    float rough = snoise(vec3(d * 0.95 + sd * 3.0, sd));
    float ridge = 1.0 - abs(snoise(vec3(d * 0.7 + sd * 5.0, sd * 0.5)));
    vec2 p2 = vec2(cos(sd * 3.1), sin(sd * 3.1)) * ${f(ISLE.r * 0.45)};
    float peak2 = 0.35 * exp(-dot(d - p2, d - p2) / 0.9);
    float elev = clamp(lv * (1.0 + 0.3 * rough) + 0.18 * ridge * ridge * lv + peak2 * smoothstep(0.1, 0.4, lv), 0.0, 1.1);
    float land = smoothstep(0.0, 0.02, lv);
    // The shore: a sheer cliff up to a plateau on the sea side, a gentle rise from the beach elsewhere.
    float shore = mix(0.12 * smoothstep(0.0, 0.08, lv), 0.5 * smoothstep(0.0, 0.03, lv), cliffW);
    float hl = ${f(ISLE.height)} * w * (shore + (0.85 - 0.3 * cliffW) * pow(elev, 0.8));
    h = mix(h, hl, land);
    // The cliff face: grey rock in strata (bands by height); then the coloured contours above.
    float face = cliffW * (1.0 - smoothstep(0.03, 0.09, lv));
    float beach = (1.0 - smoothstep(0.05, 0.11, lv)) * (1.0 - cliffW);
    float landV = clamp(0.48 + 0.5 * elev + 0.04 * (v - 0.5), 0.0, 1.0);
    landV = mix(landV, 0.36, beach);
    landV = mix(landV, 0.42 + 0.3 * step(0.5, fract(hl * 6.0)), face);
    v = mix(v, landV, land);
    accent(ct, ISLE_COL[i], land * (1.0 - beach) * (1.0 - face) * (0.85 + 0.15 * w) * sel);
  }

  // The whirlpool: the water's relief flattens into the funnel's walls, its streaks and arms
  // take over, and everything darkens with depth (more so as you fall in).
  h = mix(h, h * 0.3, wp.cover) + wp.h;
  float stage = smoothstep(0.1, 0.6, uWhirlW);
  v = mix(v, mix(v, wp.v, stage), wp.cover);
  accent(ac, wp.stripI, wp.strip * stage * (1.0 - 0.6 * wp.dark));
  v *= 1.0 - smoothstep(0.35, 1.0, wp.dark) * (0.45 + 0.55 * uDive);
#endif
  // Strips riding the contours, as on the live homepage: where they show is decided in the
  // same flowing (and, in the whirlpool, wound) coordinates as the plasma, so they move with it.
  {
    vec2 fc = pp + uFlow;
    float m = snoise(vec3(fc * 0.32, uTime * 0.07));
    float thr = 0.62;
    float amt = smoothstep(thr, thr + 0.12, m) * uAmbient * (1.0 - wp.cover);   // the whirlpool has its own
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

/** Pass 1: one texel per glyph cell of one level (lite: no events, for a fast first frame). r = band, g = height, b = accent index, a = accent amount. */
export const fieldFS = (lite = false) => `#version 300 es
${lite ? "#define LITE" : ""}
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
export const surfaceVS = (lite = false) => `#version 300 es
${lite ? "#define LITE" : ""}
precision highp float;
${NOISE}
${FIELD}
in vec2 aGrid;          // [-1, 1]^2
uniform vec2 uCenter;
uniform float uRadius;
uniform mat4 uVP;
uniform float uDeep;    // under the sea: the surface overhead wavers, as seen through water
out vec3 vW;
void main() {
  vec2 c = aGrid;
  vec2 p = uCenter + (0.12 * c + 0.88 * c * abs(c)) * uRadius;
  float h = field(p, false).x;
  vW = vec3(p.x, h, p.y);
  gl_Position = uVP * vec4(vW, 1.0);
  gl_Position.xy += uDeep * 0.007 * gl_Position.w
    * vec2(sin(p.y * 0.55 + uTime * 1.1), sin(p.x * 0.45 - uTime * 0.9));
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
uniform vec3  uAcc[12];          // accent palette (--ocean-a1..12)
uniform float uGain;
uniform float uTime;
uniform vec3  uSunDir;
uniform float uSunAmt;           // glitter path toward the sun
uniform float uWhirlW;           // the whirlpool takes the glitter where it forms
uniform vec2  uFog;              // fade start, end (world distance)
uniform float uGlyph;            // smallest glyph relative to native
uniform vec2  uRes;
uniform vec4  uQuiet[${MAX_QUIET}];  // device px, top-left origin: x0, y0, x1, y1
uniform float uQuietA[${MAX_QUIET}];
uniform int   uQuietN;
uniform float uFeather;
uniform float uDeep;             // under the sea: premultiplied output over the deep pass
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

  // The sun's reflection: a column on the water as wide as the sun, gold in the middle and
  // orange at its edges like the disc. Out by the horizon it is almost solid; toward the camera
  // the waves break it into flickering glints, which sit on the wave tops (brighter bands).
  if (uSunAmt > 0.001) {
    vec2 cc = uOrig[k] + (vec2(id) + 0.5) * uCell * s;
    vec2 rel = cc - uCam.xz;
    vec2 dv = normalize(rel);
    vec2 sd = normalize(uSunDir.xz);
    float cr = abs(dv.x * sd.y - dv.y * sd.x);              // angle off the sun's bearing
    float ahead = step(0.0, dot(dv, sd));
    float core = 1.0 - smoothstep(0.05, 0.11, cr);          // the disc's width (R = 0.085)
    float glow = exp(-cr * cr / 0.02);                      // its glow, wider and fainter
    float far = smoothstep(4.0, 30.0, length(rel));
    float tw = fract(hash12(vec2(id) + float(k) * 31.0) + uTime * (0.25 + 0.5 * hash12(vec2(id.yx))));
    float crest = smoothstep(1.0, 5.0, band);
    float on = step(1.0 - (0.35 + 0.55 * far) * (0.5 + 0.5 * crest) * max(core, 0.45 * glow), tw);
    float g = max(core, 0.5 * glow) * on * ahead * uSunAmt;
    g *= 1.0 - smoothstep(0.0, 0.45, uWhirlW) * (1.0 - smoothstep(${f(WHIRL.R * 0.6)}, ${f(WHIRL.R * 1.4)}, length(cc - vec2(${f(WHIRL.c[0])}, ${f(WHIRL.c[1])}))));
    if (g > accA) {
      accA = g;
      accI = core > 0.5 ? 3.0 : 2.0;
      band = max(band, 2.0 + floor(5.0 * max(core * (0.6 + 0.4 * far), 0.4 * glow)));
    }
  }

  if (accA > 0.3) band = max(band, 3.0);
  if (band < 1.0) return vec4(0.0);
  float a = min(1.0, pow(band / L, ${f(LEVEL_GAMMA)}) * ${f(BRIGHTNESS)} * uGain);
  vec3 col = mix(uLo, uHi, smoothstep(${f(RAMP[0])}, ${f(RAMP[1])}, a));
  if (accA > 0.001) {
    vec3 ac = accI > 12.5 ? uHi : uAcc[clamp(int(accI + 0.5) - 1, 0, 11)];
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
  // Size by the larger on-screen dimension: at grazing angles a cell is wide but squashed, and
  // sizing by the average would blow distant glyphs up wider than the near ones.
  float rel = max(wpx / uNative.x, hpx / uNative.y);

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

  if (uDeep > 0.5) {
    // Seen from below: lit from above, so the surface reads brighter / denser than the water.
    float al = mix(g0.a, g1.a, tk);
    vec3 pm = g0.rgb * g0.a * (1.0 - tk) + g1.rgb * g1.a * tk;
    // Snell's window: overhead (within ~49° of straight up) you see out through the surface,
    // bright and sharp; further out it mirrors the dark below and goes dim.
    vec3 vd = normalize(vW - uCam);
    float win = smoothstep(0.52, 0.72, vd.y);
    float ring = exp(-pow((vd.y - 0.66) / 0.04, 2.0));   // the bright rim of the window
    float k = fade * (0.22 + 0.78 * win + 0.4 * ring) * (0.85 + 0.15 * sin(uTime * 1.7 + vW.x * 0.9 + vW.z * 0.6));
    o = vec4(pm * k, al * k);
    return;
  }
  vec3 a = mix(uBg, g0.rgb, g0.a);
  vec3 b = mix(uBg, g1.rgb, g1.a);
  o = vec4(mix(uBg, mix(a, b, tk), fade), 1.0);
}`;

/** Sky: a setting sun with its rays, and the horizon, drawn in glyphs (screen-locked cells), only when uSunAmt > 0. */
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
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uNative);
  vec2 cc = (cell + 0.5) * uNative;
  vec2 ndc = cc / uRes * 2.0 - 1.0;
  vec3 dir = normalize(uCamF + ndc.x * uTanHalf * (uRes.x / uRes.y) * uCamR + ndc.y * uTanHalf * uCamU);

  // Sun-relative angles: az (along the horizon), el (above the horizon).
  float el = asin(clamp(dir.y, -1.0, 1.0));
  float sunEl = asin(uSunDir.y);
  float rowH = 2.0 * uTanHalf / uRes.y * uNative.y;   // one glyph row (rad)
  float rows = el / rowH;                              // cell rows above the horizon
  float az = atan(dir.x, -dir.z) - atan(uSunDir.x, -uSunDir.z);
  az = mod(az + 3.14159265, 6.2831853) - 3.14159265;
  // Heat shimmer: rows close to the water waver sideways.
  az += (1.0 - smoothstep(0.0, 8.0, rows)) * 0.004 * sin(cell.y * 1.9 + uTime * 2.2);

  // A realistic low sun, as light: everything below adds up to a luminance L, and the glyph
  // ramp then follows L, so brighter means denser glyphs.
  const float R = 0.085;                             // disc radius (rad)
  vec2 d = vec2(az, (el - sunEl) * 1.12) / R;        // disc units; flattened a touch near the horizon
  float r = length(d);
  float th = atan(d.y, d.x);
  // How directly the camera looks into the sun: glare and flares grow as it does.
  float facing = smoothstep(0.55, 0.97, dot(uCamF, uSunDir));
  float shimmer = 0.94 + 0.06 * sin(uTime * 3.1 + hash12(cell) * 6.28);

  float L = 0.0;
  float heatC = 0.0;   // 1 = white-hot, 0 = cool (sets the colour)
  if (r < 1.0) {
    // The disc, with limb darkening (dimmer and redder toward its edge) and a slow boil.
    float mu = sqrt(1.0 - r * r);
    float boil = vnoise(cell * vec2(0.55, 1.0) + vec2(uTime * 0.3, -uTime * 0.5)) - 0.5;
    L = 0.95 + 0.3 * mu + 0.08 * boil;
    heatC = 0.45 + 0.5 * mu;
  } else {
    float e = r - 1.0;
    // Bloom: a tight bright glow, then a wide soft one.
    float bloom = 0.6 * exp(-e * 3.2) + 0.13 * exp(-e * 0.6);
    // Light shafts: soft beams of light through the haze, shifting slowly.
    float sh = vnoise(vec2(th * 26.0 + uTime * 0.05, uTime * 0.1)) * 0.6
             + vnoise(vec2(th * 61.0 - uTime * 0.07, 3.0 + uTime * 0.17)) * 0.4;
    float shafts = smoothstep(0.55, 0.85, sh) * exp(-e * 0.45) * 0.26 * step(-0.2, rows);
    // Anamorphic streak: a long horizontal line through the sun.
    float streak = exp(-abs(d.y) * 10.0) * exp(-abs(d.x) * 0.45);
    L = bloom + shafts + 0.3 * streak * (0.45 + 0.55 * facing);
    L *= shimmer;
    heatC = clamp(0.9 * exp(-e * 0.9), 0.0, 1.0);
  }

  // Sky: the sunset, warm along the horizon near the sun, to rose higher up.
  float warm = exp(-abs(az) / 0.28);
  // The horizon glows where the sun is going down: a warm band spreading out along the water.
  float horizon = 0.32 * exp(-max(rows, 0.0) / 1.6) * exp(-abs(az) / 0.32) * step(-0.5, rows);
  // Only around the sun: away from it the sky stays dark.
  float sky = horizon + (0.1 * exp(-max(rows, 0.0) / 4.0) + 0.055 * exp(-max(rows, 0.0) / 12.0)) * warm * step(-0.5, rows);
  float mist = vnoise(vec2(az * 7.0 + uTime * 0.04, cell.y * 0.35 - uTime * 0.02));
  sky *= 0.85 + 0.3 * mist;
  float skyT = clamp(rows / 26.0, 0.0, 1.0);   // 0 horizon .. 1 high
  L += sky;

  // Colour: pale gold core → gold → orange → rose, then the sky's own colour.
  bool darkBg = dot(uBg, vec3(0.299, 0.587, 0.114)) < 0.5;
  vec3 rose = darkBg ? vec3(0.95, 0.42, 0.5) : vec3(0.75, 0.22, 0.35);
  vec3 white = darkBg ? vec3(1.0, 0.9, 0.62) : uSunCore * 0.85;   // a low sun is warm, never white
  vec3 col = heatC > 0.75 ? mix(uSunCore, white, (heatC - 0.75) / 0.25)
           : (heatC > 0.4 ? mix(uSunCol, uSunCore, (heatC - 0.4) / 0.35)
           : mix(rose, uSunCol, heatC / 0.4));
  // Away from the sun the light takes the sky's colour: orange low down, rose higher.
  vec3 skyCol = mix(uSunCol, rose, smoothstep(0.0, 0.35, skyT) * (1.0 - 0.5 * warm));
  float sunShare = clamp((L - sky) / max(L, 1e-3), 0.0, 1.0);
  col = mix(skyCol, col, sunShare);

  // Glyph density follows the light: " .:-=+*#%@".
  float layer = -1.0;
  float a = 0.0;
  if (L > 0.05) {
    float q = clamp(L, 0.0, 1.0);
    layer = min(floor(q * 9.0), 8.0);
    a = clamp((0.15 + 0.85 * q) * (darkBg ? 1.0 : 1.5), 0.0, 1.0);   // glyphs on paper need more ink
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
  float cov = layer >= 0.0 ? textureLod(uGlyphS, vec3(uv, layer), 0.0).r : 0.0;
  o = vec4(mix(uBg, col, a * cov), 1.0);
}`;

/** First atlas layer of the bubble glyphs (after the bands and the sun's): ° o. */
export const BUBBLE_FROM = GLYPHS.length + SUN_GLYPHS.length;
/** First atlas layer of the ray strokes: | / \\. */
const RAY_FROM = BUBBLE_FROM + BUBBLE_GLYPHS.length;

const QUIET_FN = `
uniform vec4  uQuiet[${MAX_QUIET}];
uniform float uQuietA[${MAX_QUIET}];
uniform int   uQuietN;
uniform float uFeather;
float quietAt(vec2 px) {
  float q = 1.0;
  for (int i = 0; i < ${MAX_QUIET}; i++) {
    if (i >= uQuietN) break;
    vec4 r = uQuiet[i];
    vec2 dd = max(max(r.xy - px, px - r.zw), 0.0);
    q *= 1.0 - (1.0 - smoothstep(0.0, uFeather, length(dd))) * uQuietA[i];
  }
  return q;
}`;

/**
 * Under the sea, behind everything (screen-locked glyph cells): the water itself. Lighter toward
 * the surface, falling off into the deep; light shafts fanning down from overhead, swaying; a
 * slow fall of specks. Opaque: it replaces the clear; the surface is blended over it.
 */
export const DEEP_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uGlyphS;
uniform vec2  uNative;
uniform vec2  uRes;
uniform vec3  uCamR;
uniform vec3  uCamU;
uniform vec3  uCamF;
uniform float uTanHalf;
uniform float uTime;
uniform vec3  uBg;
uniform vec3  uLo;
uniform vec3  uHi;
uniform float uDeep;
${QUIET_FN}
out vec4 o;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uNative);
  vec2 cc = (cell + 0.5) * uNative;
  vec2 ndc = cc / uRes * 2.0 - 1.0;
  vec3 dir = normalize(uCamF + ndc.x * uTanHalf * (uRes.x / uRes.y) * uCamR + ndc.y * uTanHalf * uCamU);

  // Light from above: bright toward the surface, gone in the deep.
  float up = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  float amb = pow(up, 2.2);
  bool darkBg = dot(uBg, vec3(0.299, 0.587, 0.114)) < 0.5;

  // Shafts: rays from a point high overhead (slightly ahead), by angle round it, swaying.
  vec3 ld = normalize(vec3(0.15, 1.0, -0.3));
  vec3 a1 = normalize(cross(ld, vec3(1.0, 0.0, 0.0)));
  vec3 a2 = cross(ld, a1);
  float ang = atan(dot(dir, a2), dot(dir, a1));
  float toward = dot(dir, ld);
  float sway = 0.05 * sin(uTime * 0.3) + 0.025 * sin(uTime * 0.19 + 1.7);
  float s = vnoise(vec2((ang + sway) * 9.0, uTime * 0.1)) * 0.6 + vnoise(vec2((ang - sway * 0.7) * 23.0 + 9.0, uTime * 0.16)) * 0.4;
  // Strongest just under the surface, dissolving on the way down.
  float beam = smoothstep(0.42, 0.8, s) * smoothstep(-0.6, 0.55, toward);
  float shafts = beam * (0.15 + 0.85 * smoothstep(0.0, 0.75, dir.y));

  // Each cell's stroke follows its ray on screen: from the light's vanishing point outward.
  float tf = dot(ld, uCamF);
  vec2 lp = vec2(dot(ld, uCamR), dot(ld, uCamU)) / max(tf, 0.05) / uTanHalf;
  lp.x /= uRes.x / uRes.y;
  vec2 rv = (ndc - lp) * uRes;
  float rayLayer = abs(rv.x) < abs(rv.y) * 0.3 ? ${f(RAY_FROM)} : (rv.x * rv.y < 0.0 ? ${f(RAY_FROM + 1)} : ${f(RAY_FROM + 2)});

  // Specks: drifting down slowly (one row every ~1.4 s), wandering sideways.
  float row = floor(uTime * 0.7);
  vec2 sc = vec2(cell.x + floor(sin(cell.y * 0.13 + uTime * 0.2) * 1.5), cell.y + row);
  float speck = step(0.996, hash12(sc * vec2(1.0, 0.71)));
  // The water's own grain: sparse, scattered (never a grid), slowly changing; on paper denser
  // into the deep (ink = dark), on black denser toward the light.
  float deepT = 1.0 - smoothstep(-0.15, 0.6, dir.y);   // 0 toward the surface .. 1 down in the deep
  float grainP = darkBg ? 0.015 + 0.09 * (1.0 - deepT) : 0.01 + 0.3 * deepT * deepT;
  float grain = step(hash12(cell + floor(uTime * 0.25) * 17.0), grainP);

  float layer = -1.0;
  float a = 0.0;
  float h = hash12(cell * 1.37 + floor(uTime * 3.0 + hash12(cell) * 4.0));
  if (h < shafts * 0.7) {
    // The core of a shaft is a stroke along it; its edges are dots.
    layer = shafts > 0.45 ? rayLayer : 1.0;
    a = 0.3 + 0.5 * shafts;
  } else if (speck > 0.5) {
    layer = 0.0;
    a = 0.8;
  } else if (grain > 0.5) {
    layer = 0.0;
    a = 0.45;
  }
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float qz = quietAt(px);
  a *= qz * uDeep;
  vec2 uv = (gl_FragCoord.xy - cell * uNative) / uNative;
  uv.y = 1.0 - uv.y;
  float cov = layer >= 0.0 ? textureLod(uGlyphS, vec3(uv, layer), 0.0).r : 0.0;
  // The water's tone (grey only, the site's palette): darker into the deep, the shafts paler
  // wedges through it. On black: lifted toward the surface and in the shafts.
  vec3 water = darkBg
    ? uBg + vec3(0.075) * (1.0 - deepT) + vec3(0.06) * beam * (1.0 - 0.6 * deepT)
    : uBg * (1.0 - 0.17 * deepT) + (vec3(1.0) - uBg) * 0.55 * beam * (1.0 - 0.5 * deepT);
  water = mix(uBg, water, uDeep);
  // Behind text: a shadow. On black, near black; on paper, clean paper (no tone, no shafts).
  water = mix(water, darkBg ? uBg * 0.25 : uBg * 1.02, (1.0 - qz) * 0.92 * uDeep);
  vec3 col = mix(uLo, uHi, 0.25 + shafts * 0.5);
  o = vec4(mix(water, col, a * cov), 1.0);
}`;

export const BUBBLES = 900;

/**
 * Bubbles: ASCII glyphs rising through the water (world space, so they sit in the scene and
 * pass the camera), in streams from below and on their own. Size picks the glyph: . ° o.
 * They wobble as they rise and are gone at the surface.
 */
export const BUBBLE_VS = `#version 300 es
precision highp float;
uniform mat4  uVP;
uniform vec3  uCam;
uniform vec3  uFwd;      // camera forward, flattened
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uNative;
uniform float uDeep;
out float vLayer;
out float vAlpha;
out float vAccent;

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

void main() {
  float i = float(gl_VertexID);
  float h1 = hash(i + 0.1), h2 = hash(i + 7.3), h3 = hash(i + 13.7), h4 = hash(i + 21.1);
  // A box of water ahead of the camera, 70 wide, 60 deep, from 34 below the surface up to it.
  vec3 right = vec3(-uFwd.z, 0.0, uFwd.x);
  vec2 base = uCam.xz + uFwd.xz * 26.0;
  float stream = floor(h1 * 22.0);            // most bubbles belong to one of the streams
  bool inStream = h4 < 0.55;
  float sx = inStream ? hash(stream + 3.0) : h2;
  float sz = inStream ? hash(stream + 5.0) : h3;
  vec2 xz = base + right.xz * (sx - 0.5) * 70.0 + uFwd.xz * (sz - 0.5) * 60.0;
  // Size: mostly small, a few big; big ones rise faster.
  float r = inStream ? mix(0.07, 0.28, h2 * h2) : mix(0.08, 0.55, pow(h3, 2.5));
  float speed = 0.9 + r * 5.0 + h2 * 0.4;
  float span = 34.0;
  float y = -span + mod(h1 * span * 7.0 + (inStream ? h2 * 3.0 : 0.0) + uTime * speed, span);
  // Wobble, more for the big ones.
  float wob = 0.12 + r * 0.9;
  xz += right.xz * wob * sin(uTime * (0.9 + h3 * 0.8) + i) + uFwd.xz * wob * 0.6 * cos(uTime * 0.7 + i * 1.3);
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 cp = uVP * vec4(p, 1.0);
  // Each bubble keeps its glyph (by its own size): . ° o. On screen it scales smoothly with
  // distance (never smaller than a native cell), and moves smoothly (no grid snapping).
  vLayer = r < 0.13 ? 0.0 : (r < 0.24 ? 1.0 : 2.0);
  float px = (2.0 * r) / max(cp.w, 0.01) * uRes.y * 1.1;
  float d = cp.w;
  vAlpha = (1.0 - smoothstep(-2.5, -0.4, y)) * smoothstep(-span, -span + 4.0, y) * (1.0 - smoothstep(30.0, 70.0, d)) * smoothstep(0.6, 2.0, d) * uDeep;
  vAccent = step(0.94, hash(i + 31.0));
  gl_Position = cp;
  gl_PointSize = clamp(px, uNative.y, uNative.y * 2.6);
  if (cp.w < 0.3) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

export const BUBBLE_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uGlyphL;
uniform vec2  uNative;
uniform vec2  uRes;
uniform vec3  uHi;
uniform vec3  uLo;
uniform vec3  uAcc[12];
${QUIET_FN}
in float vLayer;
in float vAlpha;
in float vAccent;
out vec4 o;
void main() {
  // The point is square (cell height); the glyph is a cell wide.
  vec2 pc = gl_PointCoord;
  float asp = uNative.x / uNative.y;
  float x = (pc.x - 0.5) / asp + 0.5;
  if (x < 0.0 || x > 1.0) discard;
  float layer = vLayer < 0.5 ? 0.0 : ${f(BUBBLE_FROM)} + vLayer - 1.0;
  float cov = texture(uGlyphL, vec3(x, pc.y, layer)).r;
  cov = smoothstep(0.15, 0.6, cov);
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float a = cov * vAlpha * quietAt(px);
  if (a < 0.01) discard;
  vec3 col = vAccent > 0.5 ? uAcc[0] : mix(uLo, uHi, 0.75);
  o = vec4(col * a, a);
}`;

/** A fade to the background: the bottom of the whirlpool, and cuts (jumping to a stop). */
export const FADE_FS = `#version 300 es
precision highp float;
uniform vec3  uBg;
uniform float uBlack;
out vec4 o;
void main() {
  o = vec4(uBg * uBlack, uBlack);
}`;

export const MAX_PROBE = 512;

/** Probe pass: the water's height at a list of world points (one texel each), for overlays. */
export const PROBE_FS = `#version 300 es
precision highp float;
${NOISE}
${FIELD}
uniform sampler2D uPts;   // RG32F: world x, z per texel
out vec4 o;
void main() {
  vec2 p = texelFetch(uPts, ivec2(gl_FragCoord.x, 0), 0).rg;
  o = vec4(field(p, false).x, 0.0, 0.0, 1.0);
}`;
