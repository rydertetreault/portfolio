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
 *    I0  I1  I2  I3           islands (z -100)
 *                             swell 3 (z -74)      currents (x 24, z -116 .. -56)
 *     E2                      swell 2 (z -62)
 *       E3                    swell 1 (z -50)
 *    maelstrom
 *    calm water, sun ↓
 *                             origin (0, 0)
 */

import { EXPERIENCES } from "@/data/profile";

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
/** How much the field dims behind text (hero preset `quiet`). */
export const QUIET = 0.9;

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

/** Accent palette indices (CSS vars --ocean-a1..3, read by the engine and used by the text). */
export const ACCENTS = ["--ocean-a1", "--ocean-a2", "--ocean-a3"] as const;

/** Skills: three currents flowing north, side by side, one per skill group (after the swell). */
export const CURRENTS = {
  x: 24,
  gap: 6.0,
  width: 1.6,
  /** Far end (north) and near end of the lanes. */
  z0: -116,
  z1: -56,
  speeds: [2.2, 3.1, 2.6],
  /** Accent per lane (1-based palette index), matching the skill group headings. */
  colors: [1, 2, 3],
};

/** Experience: three long crests running east-west, one per company (newest nearest). */
export const SWELL = {
  crests: [-50, -62, -74],
  x: 4,
  height: 2.0,
  width: 2.4,
  /** Crests fade out this far east / west of `x`. */
  reach: 34,
  colors: [1, 2, 3],
};

/* ── the timeline: time runs west → east along the swell ── */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const today = new Date();
/** Months since year 0, now. */
export const NOW_M = today.getFullYear() * 12 + today.getMonth();
/** "Jun 2026" → months since year 0 (start of that month); anything else ("Present") → now. */
export function month(s: string): number {
  const m = s.trim().match(/^([A-Za-z]{3})\w*\s+(\d{4})$/);
  return m ? Number(m[2]) * 12 + MONTHS.indexOf(m[1].toLowerCase()) : NOW_M;
}
/** "Jun 2026 - Present" → [start, end) in months; an ongoing span ends at the present. */
export function span(date: string): [number, number] {
  const [a, b = "Present"] = date.split(/\s+-\s+/);
  const end = month(b);
  return [month(a), end === NOW_M ? NOW_M + today.getDate() / 31 : end + 1];
}

const SPANS = EXPERIENCES.map((e) => span(e.date));
/** The months the axis covers, and where it lies along the crests (world x). */
export const TIME = {
  m0: Math.min(...SPANS.map((s) => s[0])),
  m1: Math.max(...SPANS.map((s) => s[1])),
  x0: -12,
  x1: 1,
};
export const timeX = (m: number) => TIME.x0 + ((m - TIME.m0) / (TIME.m1 - TIME.m0)) * (TIME.x1 - TIME.x0);
export const NOW_X = timeX(NOW_M + today.getDate() / 31);

/** Each crest only stands where its company does: [x start, x end, promotions (x)], ongoing ones break at now. */
export const TENURE = EXPERIENCES.map((e, k) => ({
  x0: timeX(SPANS[k][0]),
  x1: timeX(SPANS[k][1]),
  ongoing: month(e.date.split(/\s+-\s+/)[1] ?? "Present") === NOW_M,
  promos: e.roles.slice(0, -1).map((r) => timeX(span(r.date)[0])),
}));
/** Height of crest k left outside its span (a ghost of the swell, so the water still reads). */
export const GHOST = 0.12;
/** How sharply a crest rises at its start / falls at its end (world units). */
export const EDGE = 0.9;

/** Projects: the four featured projects as islands rising out of the water, in a row. */
export const ISLANDS: { c: Vec2; color: number; seed: number }[] = [
  { c: [-24, -100], color: 1, seed: 1.3 },
  { c: [-16, -100], color: 2, seed: 4.7 },
  { c: [-8, -100], color: 3, seed: 8.1 },
  { c: [0, -100], color: 1, seed: 11.9 },
];
/** Island radius, top height, terrace steps. */
export const ISLE = { r: 3.3, height: 1.6 };

/** Education: calm open water out to the horizon, a low sun ahead. */
export const CALM = { c: [-50, -30] as Vec2, r: 45, sunYaw: -180, sunElev: 3.2 };

/** Contact: the whirlpool. */
/** Contact: the maelstrom. */
export const WHIRL = { c: [-44, -44] as Vec2, r: 13, depth: 7 };

/* ── CPU mirrors (camera placement) ── */

/** Crest k's share of its height at x: GHOST outside its span, 1 inside. */
export function tenureAt(k: number, x: number): number {
  const t = TENURE[k];
  const m = smoothstep(t.x0 - EDGE, t.x0 + EDGE, x) * (1 - smoothstep(t.x1 - EDGE, t.x1 + EDGE, x));
  return GHOST + (1 - GHOST) * m;
}

/** Swell height at (x, z), ignoring the breathing (|Δ| < 6%) and the promotion notches. */
export function swellAt(x: number, z: number): number {
  const lat = 1 - smoothstep(SWELL.reach * 0.6, SWELL.reach, Math.abs(x - SWELL.x));
  let h = 0;
  SWELL.crests.forEach((zc, k) => {
    const d = (z - zc - 0.7 * Math.sin(x * 0.13 + k * 1.7)) / SWELL.width;
    h += SWELL.height * Math.exp(-d * d) * tenureAt(k, x);
  });
  return h * lat;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
