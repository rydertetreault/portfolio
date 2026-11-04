/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: world definition (single source of truth)
 *
 *  World units are the plasma's radians: at the hero shot the
 *  screen spans 11 units, exactly like the old 2D field. +y is up,
 *  the hero camera looks straight down with -z at the top of the
 *  screen ("north").
 *
 *  The constants here are injected into the GLSL (see shaders.ts)
 *  AND used on the CPU (camera riding the swell, HUD markers), so
 *  both sides always agree on where the waves are.
 * ─────────────────────────────────────────────────────────────
 */

/* ── the original plasma (ported from ascii-field/engine.ts, hero preset) ── */

/** Plasma distortion: preset plasmaDistortion (0.3) * 2.2. */
export const PLASMA_DIST = 0.66;
/** Plasma contrast normalisation: preset plasmaContrast (2) / 5.4. */
export const PLASMA_NORM = 0.37;
/** Domain-warp strength in world units (preset warp / scale, converted to radians). */
export const PLASMA_WARP = 3.0;
/** Weight of the plasma vs. terrain noise in the band value (preset `plasma`). */
export const PLASMA_MIX = 0.85;
/** Geometric amplitude of the plasma waves (peak-to-trough, world units). */
export const PLASMA_AMP = 0.8;

/** Phase / morph / flow speeds (per second), matched to the hero preset at ~1920px. */
export const PHASE_SPEED = 0.45; // speed 0.05 * plasmaSpeed 9
export const MORPH_SPEED = 0.05;
export const FLOW_SPEED: [number, number] = [-0.15, -0.02];

/* ── regions: each stop of the journey sits in its own kind of water ── */

/**
 * The swell: long, rolling ocean swells (the "02" stop). Weight is 1 inside
 * `inner`, fading to 0 at `outer`, so you can see it rising on the horizon
 * from the surface stop and the boundary is visible from orbit.
 */
export const SWELL = {
  center: [5, -44] as [number, number],
  inner: 10,
  outer: 34,
  /** Plasma chop is damped to this fraction inside the swell (big waves, small ripples). */
  chop: 0.45,
};

/** Long-period swell components: direction (unit xz), wavenumber, angular speed, amplitude, phase. */
export const SWELLS: { d: [number, number]; k: number; w: number; a: number; ph: number }[] = [
  { d: [0.28, 0.96], k: 0.55, w: 0.9, a: 0.42, ph: 0.0 },
  { d: [-0.64, 0.77], k: 0.83, w: 1.15, a: 0.26, ph: 1.7 },
  { d: [0.92, 0.39], k: 1.3, w: 1.5, a: 0.14, ph: 4.1 },
];

/**
 * Chop: short travelling waves layered on top once the camera tilts (scaled by the
 * shot's `shade`, so the top-down hero is exactly the old field). Direction,
 * wavenumber, angular speed, relative amplitude, phase.
 */
export const CHOP: { d: [number, number]; k: number; w: number; a: number; ph: number }[] = [
  { d: [0.8, 0.6], k: 6.2, w: 2.6, a: 1.0, ph: 0.0 },
  { d: [-0.5, 0.87], k: 8.9, w: 3.3, a: 0.7, ph: 1.3 },
  { d: [0.96, -0.28], k: 12.7, w: 4.1, a: 0.45, ph: 2.9 },
];
export const CHOP_AMP = 0.085;

/** Upper bound of |height| anywhere (plasma + swell + ripples); the raymarch starts here. */
export const MAX_HEIGHT = 1.9;

/** Light direction (normalised in the shader): from upper-left, slightly behind the hero view. */
export const LIGHT: [number, number, number] = [-0.5, 0.45, 0.35];

/** Low sun ahead of the flight path: glitter on the water + a dawn glow on the horizon. */
export const SUN: [number, number, number] = [0.2, 0.12, -1.0];

/* ── CPU mirrors of the shader functions ── */

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function swellWeight(x: number, z: number): number {
  const dx = x - SWELL.center[0];
  const dz = z - SWELL.center[1];
  return 1 - smoothstep(SWELL.inner, SWELL.outer, Math.sqrt(dx * dx + dz * dz));
}

/** Swell height at (x, z), unweighted. Mirrors `swellH` in the shader. */
export function swellHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const s of SWELLS) h += s.a * Math.sin((s.d[0] * x + s.d[1] * z) * s.k - t * s.w + s.ph);
  return h;
}

/* ── named places (HUD markers on the map view) ── */

export type Landmark = { id: string; label: string; pos: [number, number, number]; accent: "lime" | "orange" };

export const LANDMARKS: Landmark[] = [
  { id: "origin", label: "00 / ORIGIN", pos: [0, 0, 0], accent: "lime" },
  { id: "surface", label: "01 / THE SURFACE", pos: [2.2, 0, -11], accent: "lime" },
  { id: "swell", label: "02 / THE SWELL", pos: [SWELL.center[0], 0, SWELL.center[1]], accent: "orange" },
];

/** World → fake geo coordinates for the HUD (the origin is Auburn, AL). */
export const GEO_ORIGIN = { lat: 32.6099, lon: -85.4808, degPerUnit: 0.0042 };
