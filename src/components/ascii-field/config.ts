/**
 * ─────────────────────────────────────────────────────────────
 *  ASCII cyber clouds: global configuration
 *  Visual/perf knobs that are not part of a preset.
 *  Per-preset behaviour lives in `presets.ts`.
 * ─────────────────────────────────────────────────────────────
 */

export type AsciiFieldConfig = {
  chars: {
    /** Brightness ramp for cloud density (index 0 = empty sky, last = densest core). */
    ramp: string;
    /**
     * Directional texture glyphs for 8 angles in screen space (y down):
     * 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°. Sprinkled into mid-density cells
     * following the cloud's local contour.
     */
    flow: string[];
    /** Glyphs pointing away from the cursor: right, left, up, down. */
    pointer: string[];
  };

  /** Grid cell metrics (CSS px). Height = fontSize * lineHeight. */
  cell: {
    fontSize: number;
    lineHeight: number;
    /** Multiplier on the measured glyph advance. */
    widthScale: number;
  };

  /** Opacity steps baked into the glyph atlas. */
  alphaTiers: number;

  /**
   * Cells below this density are drawn stochastically (probability = density / thinBelow).
   * Produces a dithered, airy edge and cuts blit count. 0 disables.
   */
  thinBelow: number;

  /** Global speed multiplier. 1 = preset speeds as authored. */
  timeScale: number;

  /** Scrolling advances the animation by this many seconds per px scrolled. */
  scrollTimeWarp: number;

  /** How quickly parameters ease toward their target (per second). */
  paramSmoothing: number;

  pointer: {
    /** Influence radius in CSS px. */
    radius: number;
    /** How far the clouds are pushed away from the cursor (px). */
    warp: number;
    /** Brightness boost at the cursor centre (0..1). */
    glow: number;
    /** Smoothing rate of the cursor position (per second). */
    smoothing: number;
    /** Seconds after the last move before the influence fades out. */
    idleFade: number;
    /**
     * Contour highlight: the band edge nearest the cursor lights up along the curve,
     * this many cells in each direction (0 = off). Uses `traceColor` (1-based index
     * into colors.palette).
     */
    trace: number;
    traceColor: number;
  };

  colors: {
    /**
     * CSS custom property names read from :root (theme-aware).
     * Glyph colour ramps from `lo` (faint lowlands) to `hi` (dense peaks).
     */
    loVar: string;
    hiVar: string;
    /** Brightness range over which the colour ramps lo → hi (0..1). */
    rampLo: number;
    rampHi: number;
    /**
     * Accent palette (≤ 8 colours) sprinkled into the field — see preset
     * `paletteAmount` / `paletteMid`. Colours are clustered into patches by a slow
     * noise so they read like the intro reel's neon glints, not confetti.
     */
    palette: string[];
    /** Spatial size of the colour patches (per CSS px). Lower = larger patches. */
    paletteScale: number;
  };

  /** Readability mask around `data-ascii-quiet` elements. */
  quietZone: {
    /** Extra padding around each element (CSS px). */
    padding: number;
    /** Soft edge width (CSS px). */
    feather: number;
  };

  perf: {
    maxDevicePixelRatio: number;
    /** Frame cap. 0 = uncapped (vsync). */
    maxFps: number;
    /** Noise octaves for the near cloud layer (3 = billowy detail). */
    octaves: number;
    /**
     * Noise is evaluated on a coarser lattice (every N cells) and bilinearly
     * interpolated; clouds are smooth so 2 is visually lossless and ~4× cheaper.
     */
    latticeStep: number;
    /**
     * Adaptive quality: if smoothed per-frame work exceeds `budgetMs` for ~1s,
     * step down (DPR 1 → larger cells → 30 FPS cap). Never steps back up.
     */
    adaptive: boolean;
    budgetMs: number;
  };

  /** Overrides applied on small/touch screens. */
  mobile: {
    breakpoint: number;
    fontSize: number;
    lineHeight: number;
    maxDevicePixelRatio: number;
    maxFps: number;
    octaves: number;
  };
};

export const DEFAULT_CONFIG: AsciiFieldConfig = {
  chars: {
    ramp: " .:-=+*#%@",
    flow: ["_", "\\", "|", "/", "_", "\\", "|", "/"],
    pointer: [">", "<", "^", "_"],
  },

  cell: {
    fontSize: 8,
    lineHeight: 1.25,
    widthScale: 1.0,
  },

  alphaTiers: 10,
  thinBelow: 0.3,
  timeScale: 1,
  scrollTimeWarp: 0, // scrolling never drives the animation (no jumps between pages)
  paramSmoothing: 0.12, // route morph: a long, gentle leftward glide (≈ idle pace)

  pointer: {
    radius: 220,
    warp: 0, // no geometric distortion: the terrain is never pushed around the cursor
    glow: 0.14, // a soft light lift only
    smoothing: 7,
    idleFade: 2.5,
    trace: 14,
    traceColor: 1, // lime
  },

  colors: {
    loVar: "--ascii-lo",
    hiVar: "--ascii-hi",
    rampLo: 0.1,
    rampHi: 0.95,
    // Site lime + the hues baked into the intro's face reel (after its brightening)
    palette: ["#a3e635", "#d8fb74", "#cdcf5f", "#bad366", "#d3b75b", "#a77a4b", "#62a74a"],
    paletteScale: 0.0022,
  },

  quietZone: {
    padding: 28,
    feather: 70,
  },

  perf: {
    maxDevicePixelRatio: 1.5,
    maxFps: 0,
    octaves: 3,
    latticeStep: 3,
    adaptive: true,
    budgetMs: 11,
  },

  mobile: {
    breakpoint: 768,
    fontSize: 8,
    lineHeight: 1.25,
    maxDevicePixelRatio: 1.5,
    maxFps: 30,
    octaves: 2,
  },
};
