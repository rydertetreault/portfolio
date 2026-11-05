/**
 * The ocean: one world, shared by the GLSL (baked in as constants) and the CPU
 * (camera placement), so both always agree.
 *
 * World units are the live field's plasma radians: at the Origin the screen spans
 * `SPAN` units across, exactly like the live background. +y is up; the Origin camera
 * looks straight down with -z ("north") at the top of the screen.
 *
 * Top view (north up):
 *
 *   I0  I1  I2  I3            islands (z -97 .. -102)
 *                             swell 3 (z -74)
 *                                     currents (x 18 .. 30, z -124 .. -72)
 *     E2                      swell 2 (z -62)
 *       E3                    swell 1 (z -50)
 *    maelstrom
 *    calm water, sun ↓
 *                             origin (0, 0)
 */

export type Vec2 = [number, number];

/* ── the live field (ascii-field hero preset, in world units) ── */

/** World units across the screen at the Origin (live field: plasmaFreq 10 × scale 0.0011 × 1000 px). */
export const SPAN = 11;
export const FONT_SIZE = 8;
export const LINE_HEIGHT = 1.25;
/** Elevation bands, alpha curve, peak opacity, colour ramp (hero preset / config). */
export const LEVELS = 7;
export const LEVEL_GAMMA = 0.75;
export const BRIGHTNESS = 0.62;
export const RAMP: Vec2 = [0.1, 0.95];
/** Band k → glyph (the live ramp " .:-=+*#%@", bands 1..7). */
export const GLYPHS = [".", ":", "-", "=", "+", "*", "#"];
/** The sun's brightest glyphs (atlas layers after GLYPHS): the ramp continues " .:-=+*#%@". */
export const SUN_GLYPHS = ["%", "@"];
/** Bubbles (atlas layers after SUN_GLYPHS), small to big; the smallest is GLYPHS[0], the biggest an `o` drawn over 2-3 cells. */
export const BUBBLE_GLYPHS = ["°", "o"];
/** Light shafts under the sea (atlas layers after BUBBLE_GLYPHS): strokes along the ray. */
export const RAY_GLYPHS = ["|", "/", "\\"];
/** How much the field dims behind text (hero preset `quiet`). */
export const QUIET = 0.8;

export const PLASMA_DIST = 0.66;
export const PLASMA_NORM = 0.37;
export const PLASMA_WARP = 3.0;
export const PLASMA_MIX = 0.85;
/** Peak-to-trough height of the plasma once it has relief (world units). */
export const PLASMA_AMP = 0.9;

export const PHASE_SPEED = 0.45;
export const MORPH_SPEED = 0.05;
export const FLOW_SPEED: Vec2 = [-0.15, -0.02];

/* ── the events (one per stop) ── */

/** Accent palette (CSS vars --ocean-a1..12, read by the engine and used by the text): a1..a4 the
 * route's items, a5..a12 the All-projects chains. Indices elsewhere are 1-based. */
export const ACCENTS = Array.from({ length: 12 }, (_, i) => `--ocean-a${i + 1}`);

/** Skills: three currents side by side, one per skill group (after the swell), running from the
 * horizon toward the camera and ending in the calm water where their group's text sits. */
export const CURRENTS = {
  /** Middle lane's x; lane i is at x + (i - 1) * gap (the first group on the left). */
  x: 24,
  gap: 6.0,
  width: 1.5,
  /** Far (north) and near ends of the lanes. */
  z0: -124,
  z1: -72,
  speeds: [2.4, 3.2, 2.8],
  /** Accent per lane (1-based palette index), matching the skill group headings. */
  colors: [1, 2, 3],
};

/** Experience: three long crests running east-west, one per company. */
export const SWELL = {
  crests: [-50, -62, -74],
  x: 4,
  height: 1.35,
  width: 3.4,
  /** Crests fade out this far east / west of `x`. */
  reach: 34,
  colors: [1, 2, 3],
};

/** Projects: the four featured projects as a chain of islands in a gentle arc, each in its own
 * accent; they form one at a time as you scroll. */
export const ISLANDS: { c: Vec2; color: number; seed: number }[] = [
  { c: [-24, -98], color: 1, seed: 1.3 },
  { c: [-16, -102], color: 2, seed: 4.7 },
  { c: [-8, -102], color: 3, seed: 8.1 },
  { c: [0, -98], color: 4, seed: 11.9 },
];
/** All projects: two more chains east of the featured one, seen from above. The front (south)
 * row is Professional (greens), the one behind it Personal (reds, pinks, orange, purple); each
 * island has its own colour from its chain's set. */
export const CHAINS = [
  { label: "Professional", z: -92, color: 5, colors: [1, 5, 7, 6, 8, 5] },
  { label: "Personal", z: -108, color: 12, colors: [9, 12, 2, 10, 11, 4] },
] as const;
/** Centre x of both chains, spacing between islands, islands per chain at most. */
export const CHAIN = { x: 30, gap: 8, max: 6 };
/** Island i of n in chain `row`: evenly spaced around CHAIN.x, gently staggered. */
export function chainIsle(row: number, i: number, n: number): Vec2 {
  return [CHAIN.x + (i - (n - 1) / 2) * CHAIN.gap, CHAINS[row].z + 0.8 * Math.sin(i * 1.9 + row * 2.4)];
}
/** Every island: the featured four, then CHAIN.max slots per chain. */
export const ISLE_COUNT = ISLANDS.length + CHAINS.length * CHAIN.max;
export function isleColor(k: number): number {
  if (k < ISLANDS.length) return ISLANDS[k].color;
  const j = k - ISLANDS.length;
  return CHAINS[Math.floor(j / CHAIN.max)].colors[j % CHAIN.max];
}
export const isleSeed = (k: number) => (k < ISLANDS.length ? ISLANDS[k].seed : 20 + k * 3.7);
/** Island k's centre, given how many projects each chain has. */
export function isleCentre(k: number, chainN: readonly number[]): Vec2 {
  if (k < ISLANDS.length) return ISLANDS[k].c;
  const j = k - ISLANDS.length;
  const row = Math.floor(j / CHAIN.max);
  return chainIsle(row, j % CHAIN.max, chainN[row] ?? 0);
}

/** Island radius and peak height (world units). */
export const ISLE = { r: 3.0, height: 3.0 };

/** Education: calm open water out to the horizon, a low sun ahead. */
export const CALM = { c: [-50, -30] as Vec2, r: 45, sunYaw: -180, sunElev: 1.1 };

/**
 * Contact: the whirlpool. It forms out of the calm water ahead of the Education camera, between
 * it and the sun. A funnel (depth ∝ a² / (r² + a²), like a real vortex) out to radius R, with a
 * throat at the centre that the camera falls through.
 */
export const WHIRL = { c: [-45, -36] as Vec2, R: 26, a: 5.5, depth: 9, throat: 1.6, arms: 5 };

/** 0..1 how deep the funnel is at radius r (1 at the centre, 0 at R); mirrors the shader. */
export function whirlProfile(r: number): number {
  const { a, R } = WHIRL;
  const f = (x: number) => (a * a) / (x * x + a * a);
  return Math.max(0, (f(r) - f(R)) / (1 - f(R)));
}

/** How far the funnel has sunk for a whirl event weight w (mirrors the shader). */
export const whirlSink = (w: number) => smoothstep(0.25, 0.9, w);

/** Water height of the funnel at (x, z), ignoring ripples and the throat. */
export function whirlH(x: number, z: number, w = 1): number {
  return -WHIRL.depth * whirlProfile(Math.hypot(x - WHIRL.c[0], z - WHIRL.c[1])) * whirlSink(w);
}

/* ── CPU mirrors (camera placement) ── */

/** Swell height at (x, z), ignoring the breathing (|Δ| < 6%). */
/** The swell's crest profile: a broad body with a sharp top (mirrors the shader). */
export const crestProfile = (d: number) => 0.55 * Math.exp(-d * d) + 0.45 * Math.exp(-Math.abs(d) * 3.2);

/**
 * Swell height at (x, z), mirroring the shader (minus the slight breathing). `build` is how
 * formed each crest is (0..1, see route.ts crestBuild); fully formed by default. `smooth` uses a
 * rounded crest (no sharp top), for lines laid over the water.
 */
export function swellAt(x: number, z: number, build: readonly number[] = [1, 1, 1], smooth = false): number {
  const lat = 1 - smoothstep(SWELL.reach * 0.6, SWELL.reach, Math.abs(x - SWELL.x));
  let h = 0;
  SWELL.crests.forEach((zc, k) => {
    const d = (z - zc - 0.7 * Math.sin(x * 0.13 + k * 1.7)) / SWELL.width;
    h += SWELL.height * (smooth ? Math.exp(-d * d) : crestProfile(d)) * (0.8 + 0.2 * (build[k] ?? 1));
  });
  return h * lat;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Lane i's centre x (see CURRENTS). */
export const laneX = (i: number) => CURRENTS.x + (i - 1) * CURRENTS.gap;
