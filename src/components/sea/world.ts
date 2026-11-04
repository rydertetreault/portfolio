/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: world definition (single source of truth)
 *
 *  World units are the plasma's radians: at the hero shot the
 *  screen spans 11 units, exactly like the old 2D field. +y is up,
 *  the hero camera looks straight down with -z at the top of the
 *  screen ("north").
 *
 *  Everything here is baked into the GLSL as constants (see
 *  shaders.ts) AND used on the CPU (camera riding the swell, HUD
 *  waypoints, map markers), so both sides always agree.
 *
 *  Layout (top view, north up):
 *
 *            P2 cross        swell (experience)
 *       P3 terrace    P1 glass
 *     P4 ping                       ·
 *     P5 scan      deep (contact)   ·  surface (about)
 *       P6 ice                      ·
 *         current (skills)       origin (hero)
 *               harbor (education)
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

/* ── the open ocean (what the plasma resolves into once the camera tilts) ── */

/**
 * A few long, coherent wave trains rolling toward the camera (+z), sharp-crested.
 * Direction (unit xz), wavenumber, angular speed, amplitude, phase.
 * Deliberately few and long: coherent swells, not interference ripples.
 */
export const OCEAN: { d: [number, number]; k: number; w: number; a: number; ph: number }[] = [
  { d: [0.12, 0.99], k: 0.62, w: 0.78, a: 0.3, ph: 0.0 },
  { d: [-0.45, 0.89], k: 0.95, w: 0.97, a: 0.11, ph: 2.1 },
  { d: [0.55, 0.83], k: 1.45, w: 1.2, a: 0.05, ph: 4.4 },
  { d: [-0.2, 0.98], k: 2.3, w: 1.52, a: 0.022, ph: 1.2 },
];
/** Band value = 0.5 + height / OCEAN_RANGE (≈ trough → crest across the 7 bands). */
export const OCEAN_RANGE = 1.0;

/**
 * Groundswell (the experience region): long-crested, near-parallel trains rolling toward
 * the camera, sharp-crested. Slightly different wavenumbers so the crests group into sets.
 * Each crest line also swells and fades along its length (SWELL_ALONG).
 */
export const SWELLS: { d: [number, number]; k: number; w: number; a: number; ph: number }[] = [
  { d: [0.1, 0.995], k: 0.62, w: 0.92, a: 0.46, ph: 0.0 },
  { d: [-0.07, 0.998], k: 0.78, w: 1.05, a: 0.2, ph: 1.7 },
];
/** 0..1 how much each swell crest varies in height along its length. */
export const SWELL_ALONG = 0.35;

/** Fine chop: shading detail only (never moves the contours). */
export const CHOP: { d: [number, number]; k: number; w: number; a: number; ph: number }[] = [
  { d: [0.8, 0.6], k: 6.2, w: 2.6, a: 1.0, ph: 0.0 },
  { d: [-0.5, 0.87], k: 8.9, w: 3.3, a: 0.6, ph: 1.3 },
];
export const CHOP_AMP = 0.03;

/** Upper bound of |height| anywhere; the raymarch starts here. */
export const MAX_HEIGHT = 1.9;

/** Light direction (normalised in the shader): from upper-left, slightly behind the hero view. */
export const LIGHT: [number, number, number] = [-0.5, 0.45, 0.35];
/** Low sun ahead of the flight path: glitter on the water + a dawn glow on the horizon. */
export const SUN: [number, number, number] = [0.2, 0.12, -1.0];

/* ── regions: every stop of the journey sits in its own kind of water ── */

export type Region = {
  id: string;
  center: [number, number];
  inner: number;
  outer: number;
  /** Ocean amplitude multiplier (1 = open sea). */
  amp?: number;
  /** Long swell amplitude. */
  swell?: number;
  /** 0..1 stepped / terraced heights (archive strata). */
  terrace?: number;
  /** Amplitude of a second wave train crossing at 90° (interference "cross sea"). */
  cross?: number;
  /** OCR scanline sweeping the water. */
  scan?: number;
  /** 0..1 frozen surface with cracks. */
  ice?: number;
  /** Streaming current: fast streaks flowing past. */
  flow?: number;
  /** Radar ping rings expanding from the centre. */
  ping?: number;
  /** Specular multiplier (glassy water). */
  spec?: number;
  /** Lighthouse beam sweeping the water. */
  beam?: number;
  /** Palette index used for the map tint (1–3 lime family, 4–5 warm). */
  color: number;
};

export const REGIONS: Region[] = [
  { id: "swell", center: [6, -42], inner: 9, outer: 26, amp: 0.55, swell: 1, color: 4 },
  { id: "p-glass", center: [-8, -66], inner: 5, outer: 11, amp: 0.22, spec: 2.6, color: 1 },
  { id: "p-cross", center: [-22, -74], inner: 5, outer: 11, amp: 0.7, cross: 0.85, color: 4 },
  { id: "p-terrace", center: [-36, -66], inner: 5, outer: 11, terrace: 1, color: 2 },
  { id: "p-ping", center: [-44, -50], inner: 5, outer: 11, amp: 0.45, ping: 1, color: 5 },
  { id: "p-scan", center: [-42, -33], inner: 5, outer: 11, amp: 0.6, scan: 1, color: 1 },
  { id: "p-ice", center: [-32, -19], inner: 5, outer: 11, ice: 1, color: 3 },
  { id: "current", center: [-20, -4], inner: 6, outer: 13, amp: 0.5, flow: 1, color: 2 },
  { id: "harbor", center: [-6, 12], inner: 4, outer: 10, amp: 0.35, beam: 1, color: 5 },
  { id: "deep", center: [-16, -36], inner: 6, outer: 14, amp: 1.1, swell: 0.45, color: 3 },
];

/** Light pillars marking the waypoints (palette index: 1 lime, 4 warm). */
export type Beacon = { id: string; pos: [number, number]; color: number };

export const BEACONS: Beacon[] = [
  { id: "p-glass", pos: [-8, -66], color: 1 },
  { id: "p-cross", pos: [-22, -74], color: 4 },
  { id: "p-terrace", pos: [-36, -66], color: 1 },
  { id: "p-ping", pos: [-44, -50], color: 4 },
  { id: "p-scan", pos: [-42, -33], color: 1 },
  { id: "p-ice", pos: [-32, -19], color: 4 },
  { id: "harbor", pos: [-6, 14], color: 4 },
];

export const PILLAR_HEIGHT = 40;

/* ── CPU mirrors of the shader functions (camera riding the swell) ── */

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function regionWeight(r: Region, x: number, z: number): number {
  const dx = x - r.center[0];
  const dz = z - r.center[1];
  return 1 - smoothstep(r.inner, r.outer, Math.sqrt(dx * dx + dz * dz));
}

const crest = (x: number) => {
  const s = 0.5 + 0.5 * Math.sin(x);
  return s * s * 1.6 - 0.55;
};

/** Swell height at (x, z) including each region's swell weight. Mirrors the shader. */
export function swellAt(x: number, z: number, t: number): number {
  let amp = 0;
  for (const r of REGIONS) if (r.swell) amp += r.swell * regionWeight(r, x, z);
  if (amp <= 0) return 0;
  let h = 0;
  for (const s of SWELLS) {
    const along = 1 - SWELL_ALONG + SWELL_ALONG * Math.sin((s.d[1] * x - s.d[0] * z) * 0.16 + t * 0.07 + s.ph);
    h += s.a * crest((s.d[0] * x + s.d[1] * z) * s.k - t * s.w + s.ph) * along;
  }
  return h * amp;
}

/** World → fake geo coordinates for the HUD (the origin is Auburn, AL). */
export const GEO_ORIGIN = { lat: 32.6099, lon: -85.4808, degPerUnit: 0.0042 };
