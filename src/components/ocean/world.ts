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
 *        E1      E0         swell 3 (z -48)
 *     E2                    swell 2 (z -36)
 *       E3                  swell 1 (z -24)
 *    currents
 *    still water            origin (0, 0)
 *          whirlpool
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

/** Experience: three long crests running east-west, one per role. */
export const SWELL = {
  crests: [-24, -36, -48],
  x: 4,
  height: 2.0,
  width: 3.4,
  /** Crests fade out this far east / west of `x`. */
  reach: 34,
};

/** Projects: one eddy per featured project. arms < 0 turns the other way. */
export const EDDIES: { c: Vec2; arms: number }[] = [
  { c: [-6, -64], arms: 3 },
  { c: [-21, -72], arms: -2 },
  { c: [-36, -67], arms: 4 },
  { c: [-46, -54], arms: -3 },
];
export const EDDY_R = 4.2;
export const EDDY_DEPTH = 0.9;

/** Skills: three currents flowing south, side by side. */
export const CURRENTS = {
  x: -50,
  gap: 4.4,
  width: 1.35,
  z0: -58,
  z1: -8,
  speeds: [2.2, 3.1, 2.6],
};

/** Education: still water. */
export const STILL = { c: [-49, 2] as Vec2, r: 16 };

/** Contact: the whirlpool. */
export const WHIRL = { c: [-30, 18] as Vec2, r: 6.5, depth: 3.2, eye: 2.2, arms: 5, tight: 11 };

/* ── CPU mirrors (camera placement) ── */

/** Swell height at (x, z), ignoring the breathing (|Δ| < 6%). */
export function swellAt(x: number, z: number): number {
  const lat = 1 - smoothstep(SWELL.reach * 0.6, SWELL.reach, Math.abs(x - SWELL.x));
  let h = 0;
  SWELL.crests.forEach((zc, k) => {
    const d = (z - zc - 0.7 * Math.sin(x * 0.13 + k * 1.7)) / SWELL.width;
    h += SWELL.height * Math.exp(-d * d);
  });
  return h * lat;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
