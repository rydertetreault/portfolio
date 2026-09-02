/**
 * ─────────────────────────────────────────────────────────────
 *  ASCII plasma / topography field: parameters / presets
 *  Everything here is numeric so the engine can ease between
 *  states smoothly. Tune freely.
 * ─────────────────────────────────────────────────────────────
 */

export type FieldParams = {
  /* ── plasma (classic sum-of-sines field, like asciiart.eu's "ASCII Plasma") ── */
  /** 0 = pure noise clouds, 1 = pure plasma. In between: plasma bands bent by terrain noise. */
  plasma: number;
  /** Plasma spatial frequency multiplier (relative to `scale`). Higher = tighter bands. */
  plasmaFreq: number;
  /** Plasma phase speed multiplier (relative to `speed`). */
  plasmaSpeed: number;
  /** Plasma distortion (0 = clean sines, 1 = heavily warped, like the page's "distortion"). */
  plasmaDistortion: number;
  /** Plasma contrast (like the page's slider): stretches the field so more bands are reached. */
  plasmaContrast: number;

  /* ── near layer (noise terrain: the main masses / the warp for the plasma) ── */
  /** Noise spatial frequency, per CSS px at a 1000px-wide viewport (scales with width). Lower = larger banks. */
  scale: number;
  /** Domain-warp strength (0 = smooth blobs, 1 = very billowy/curly). */
  warp: number;
  /** Morph speed (how fast the shapes evolve). */
  speed: number;
  /** Density cut-off in [0, 1]. Higher = more empty sky between banks. */
  threshold: number;
  /** Width of the density ramp above the threshold (softness of cloud edges). */
  softness: number;
  /** Density curve exponent (>1 = punchier cores). */
  contrast: number;
  /** Volumetric shading strength from the density gradient (0..1). */
  shading: number;
  /** Constant drift of the near layer, in px/second at a 1000px-wide viewport (scales with width). */
  driftX: number;
  driftY: number;

  /* ── far cloud layer (faint depth haze behind) ── */
  farScale: number;
  farAlpha: number;
  farThreshold: number;
  farDrift: number;

  /* ── shared ── */
  /**
   * Number of discrete elevation bands (0 = continuous). Each band gets its own
   * grey level and glyph, so the field reads as stacked topographic layers.
   */
  levels: number;
  /**
   * Alpha curve across bands: alpha = (band / levels) ^ levelGamma. 1 = linear;
   * >1 makes the outer bands much fainter than the peak (wide dim lowlands).
   */
  levelGamma: number;
  /** Fraction of peak-band cells drawn in the accent palette (0 = monochrome). */
  paletteAmount: number;
  /** Fraction of mid-band cells drawn in the accent palette (sparser sprinkle). */
  paletteMid: number;
  /** Accent strips: how many short coloured strips spawn per second on average (0 = none). */
  stripRate: number;
  /** Seconds a strip lives (fades in and out over this time). */
  stripLife: number;
  /** Strip length in cells: min / max. */
  stripMin: number;
  stripMax: number;
  /** Global max opacity (0..1). Peaks reach this; the quiet mask protects text. */
  brightness: number;
  /** Fraction of mid-density cells that use directional texture glyphs (/ \ | _). */
  texture: number;
  /** 0..1 how strongly the clouds are dimmed behind the content column. */
  quiet: number;
  /** Cursor parallax: whole field shifts by this fraction of cursor offset. */
  parallax: number;
};

export type PresetName = "hero" | "calm" | "clouds" | "projects" | "resume";

/** Shared terrain-noise settings used by the plasma presets. */
const PLASMA_BASE: FieldParams = {
  // Slow, broad, gently flowing contours: low frequency, little distortion,
  // slow phase/morph speeds and a lazy drift so bands glide instead of churn.
  plasma: 0.85,
  plasmaFreq: 10,
  plasmaSpeed: 9, // waves visibly travel…
  plasmaDistortion: 0.3, // …but stay coherent (low distortion = no jumble)
  plasmaContrast: 2.0,

  scale: 0.0011,
  warp: 0.3,
  speed: 0.05,
  threshold: 0.04,
  softness: 0.96,
  contrast: 1.0,
  shading: 0.18,
  driftX: -40, // a clear, steady glide across the screen
  driftY: -5,

  farScale: 0.0008,
  farAlpha: 0,
  farThreshold: 0.6,
  farDrift: -6,

  levels: 7,
  levelGamma: 0.75,
  paletteAmount: 0,
  paletteMid: 0,
  stripRate: 1.2, // spawns/s (some spawns are clusters of 2–3)
  stripLife: 2.8,
  stripMin: 5,
  stripMax: 15,
  brightness: 0.62,
  texture: 0, // no directional glyph noise inside the bands
  quiet: 0.9,
  parallax: 0.015,
};

export const PRESETS: Record<PresetName, FieldParams> = {
  /**
   * Refined "ASCII Plasma" with topographic flow: layered sine waves bent by
   * terrain noise, quantized into seven grey elevation bands that drift slowly.
   */
  hero: { ...PLASMA_BASE },

  /** Projects: tighter, faster-flowing contours — a busier "data" texture. */
  projects: {
    ...PLASMA_BASE,
    plasmaFreq: 13,
    plasmaSpeed: 10,
    plasmaDistortion: 0.4,
    scale: 0.0013,
    speed: 0.05,
    driftX: -44,
    driftY: 4,
    levels: 6,
    brightness: 0.58,
    quiet: 0.9,
  },

  /** Resume: wide, slow, calm contour sheets. */
  /**
   * Resume: a wider, slower field. The route change eases between this and the
   * home field over several seconds (see config.paramSmoothing) — a gentle morph.
   */
  resume: {
    ...PLASMA_BASE,
    stripRate: 0.35,
    plasmaFreq: 8,
    plasmaSpeed: 6,
    plasmaDistortion: 0.25,
    scale: 0.0009,
    speed: 0.035,
    driftX: -40, // same idle glide as the overview
    driftY: -3,
    brightness: 0.55,
    quiet: 0.92,
  },

  /** Same field, slower and dimmer. */
  calm: {
    ...PLASMA_BASE,
    speed: 0.03,
    plasmaSpeed: 5,
    driftX: -20,
    brightness: 0.5,
    quiet: 0.92,
  },

  /**
   * Matched to the "ASCII Cyber Clouds 2" reference recording: large soft banks
   * drifting left (~5% of the width per second), a wide dim haze layer, thin
   * mid ring and small bright cores, four grey bands, peak grey ≈ #d4d4d4.
   */
  clouds: {
    plasma: 0,
    plasmaFreq: 14,
    plasmaSpeed: 9,
    plasmaDistortion: 0.5,
    plasmaContrast: 1,

    scale: 0.0012,
    warp: 0.35,
    speed: 0.055,
    threshold: 0.54,
    softness: 0.35,
    contrast: 1.0,
    shading: 0.25,
    driftX: -52,
    driftY: -6,

    farScale: 0.00086,
    farAlpha: 0.6,
    farThreshold: 0.58,
    farDrift: -20,

    levels: 4,
    levelGamma: 0.2,
    paletteAmount: 0,
    paletteMid: 0,
    stripRate: 0,
    stripLife: 2,
    stripMin: 5,
    stripMax: 12,
    brightness: 0.55,
    texture: 0.03,
    quiet: 0.88,
    parallax: 0.02,
  },
};

/** Overrides applied below the mobile breakpoint (see config.mobile). */
export const MOBILE_OVERRIDES: Partial<Record<PresetName, Partial<FieldParams>>> = {
  hero: { quiet: 0.8, parallax: 0 },
  calm: { quiet: 0.85, parallax: 0 },
  clouds: { quiet: 0.8, parallax: 0 },
  projects: { quiet: 0.85, parallax: 0 },
  resume: { quiet: 0.85, parallax: 0 },
};

export function lerpParams(a: FieldParams, b: FieldParams, t: number): FieldParams {
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof FieldParams)[]) {
    out[key] = a[key] + (b[key] - a[key]) * t;
  }
  return out;
}
