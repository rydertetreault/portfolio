/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: camera timeline
 *
 *  Scroll position is measured in viewport heights (`u`). Each key
 *  pins a camera *shot* at a value of u; between keys the camera is
 *  eased along a Hermite spline. Keys marked `pass` are fly-through
 *  points (the path curves through them without stopping), every
 *  other key is a rest point (zero velocity: a "stop").
 *
 *  To add a stop: add its shots here, a <Stop> window in
 *  SeaExperience.tsx, and (optionally) a region in world.ts.
 * ─────────────────────────────────────────────────────────────
 */

export type Vec3 = [number, number, number];

export type Shot = {
  /** World position. y is ignored when `span` is set. */
  pos: Vec3;
  /** Degrees. 0 = facing -z (north), positive = turning right. */
  yaw: number;
  /** Degrees. -90 = straight down, 0 = level. */
  pitch: number;
  /** Degrees, banking. */
  roll: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /**
   * Top-down framing: altitude is chosen so this much world width is visible,
   * whatever the viewport aspect (the old field always spanned 11 units).
   */
  span?: number;
  /** What `span` fits: the screen width (default, like the old field) or its longer side. */
  spanFit?: "width" | "long";
  /** Yaw override on portrait screens (e.g. turn the map so the journey runs bottom → top). */
  portraitYaw?: number;
  /** 0 = pure topographic bands (the old 2D look), 1 = fully lit 3D waves. */
  shade: number;
  /** Exponential fog density per world unit. Also fades in the horizon glow. */
  fog: number;
  /** 0..1: how much the camera rides (bobs with) the swell under it. */
  ride: number;
  /** 0..1: idle hand-held drift. */
  sway: number;
  /** 0..1: stars in the sky. */
  stars: number;
  /** 0..1: topographic-map look (band interiors fade, contour lines stay). */
  contour: number;
};

export type Ease = "inOut" | "in" | "out" | "linear";

export type Key = {
  at: number;
  shot: Shot;
  /** Easing of the segment that *starts* at this key. */
  ease?: Ease;
  /** Fly-through key: the path keeps its velocity here instead of stopping. */
  pass?: boolean;
  /** Stop index this key belongs to (rest keys only), for HUD + arrival pulses. */
  stop?: number;
};

const base = { roll: 0, shade: 0, fog: 0, ride: 0, sway: 0, stars: 0, contour: 0 };

const HERO: Shot = { ...base, pos: [0, 0, 0], yaw: 0, pitch: -90, fov: 30, span: 11 };

const SURFACE: Shot = {
  ...base,
  pos: [1.8, 0.85, -3.8],
  yaw: 22,
  pitch: -7,
  fov: 56,
  shade: 0.8,
  fog: 0.03,
  ride: 0.2,
  sway: 1,
  stars: 1,
};

const SWELL: Shot = {
  ...base,
  pos: [4.6, 1.85, -39],
  yaw: 10,
  pitch: -7,
  roll: 2,
  fov: 58,
  shade: 0.9,
  fog: 0.032,
  ride: 1,
  sway: 1,
  stars: 1,
};

const ORBIT: Shot = {
  ...base,
  // Journey axis (origin → swell, along -z) runs left → right across the screen.
  pos: [2.5, 0, -22],
  yaw: -90,
  portraitYaw: 0,
  pitch: -90,
  fov: 40,
  span: 62,
  spanFit: "long",
  shade: 0.35,
  fog: 0.002,
  contour: 0.85,
};

export const KEYS: Key[] = [
  { at: 0, shot: HERO, stop: 0 },
  { at: 0.15, shot: HERO, ease: "in", stop: 0 },
  // Insertion: a fast satellite-style dive, banking as it drops…
  {
    at: 0.95,
    pass: true,
    ease: "out",
    shot: { ...base, pos: [1.0, 3.2, -1.7], yaw: 14, pitch: -58, roll: -7, fov: 44, shade: 0.45, fog: 0.01 },
  },
  // …then levels out just above the water: the horizon reveal.
  { at: 1.55, shot: SURFACE, stop: 1 },
  { at: 2.55, shot: { ...SURFACE, pos: [2.3, 0.9, -6.2], yaw: 26 }, ease: "in", stop: 1 },
  // Transit: a low, banking run across open water toward the swell.
  {
    at: 3.2,
    pass: true,
    ease: "out",
    shot: { ...SURFACE, pos: [0.6, 0.95, -22], yaw: -6, pitch: -4, roll: -9, fov: 66, sway: 0.4 },
  },
  { at: 3.9, shot: SWELL, stop: 2 },
  { at: 4.9, shot: { ...SWELL, pos: [5.2, 1.85, -43], yaw: 6 }, ease: "in", stop: 2 },
  // Pull-up: climb to orbit and see the whole sea.
  {
    at: 5.55,
    pass: true,
    ease: "out",
    shot: { ...base, pos: [4.5, 9, -36], yaw: -35, pitch: -55, roll: 0, fov: 50, shade: 0.6, fog: 0.012, stars: 0.5 },
  },
  { at: 6.2, shot: ORBIT, stop: 3 },
  { at: 7.0, shot: ORBIT, stop: 3 },
];

/** Total scroll length of the page in viewport heights (last key + one screen). */
export const TRACK_VH = KEYS[KEYS.length - 1].at + 1;

export const STOPS = [
  { index: 0, code: "00", name: "ORIGIN" },
  { index: 1, code: "01", name: "THE SURFACE" },
  { index: 2, code: "02", name: "THE SWELL" },
  { index: 3, code: "03", name: "THE MAP" },
];

/* ───────────── sampling ───────────── */

export type Camera = {
  pos: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  shade: number;
  fog: number;
  ride: number;
  sway: number;
  stars: number;
  contour: number;
  /** Index of the stop whose rest window contains u, or -1 while travelling. */
  stop: number;
};

function ease(t: number, e: Ease): number {
  switch (e) {
    case "linear":
      return t;
    case "in":
      return t * t;
    case "out":
      return 1 - (1 - t) * (1 - t);
    default:
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/** Altitude needed to see `span` world units across at this aspect / fov. */
function spanAltitude(s: Shot, aspect: number): number {
  const tanHalf = Math.tan((s.fov * Math.PI) / 360);
  const k = s.spanFit === "long" ? Math.max(1, aspect) : Math.max(0.1, aspect);
  return (s.span ?? 10) / 2 / (k * tanHalf);
}

function resolvePos(k: Key, aspect: number): Vec3 {
  const s = k.shot;
  return s.span ? [s.pos[0], spanAltitude(s, aspect), s.pos[2]] : s.pos;
}

function resolveYaw(s: Shot, aspect: number): number {
  return aspect < 1 && s.portraitYaw !== undefined ? s.portraitYaw : s.yaw;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hermite tangent at key i (zero at rest keys, Catmull-Rom at pass keys). */
function tangent(i: number, aspect: number, axis: number): number {
  const k = KEYS[i];
  if (!k.pass || i === 0 || i === KEYS.length - 1) return 0;
  const p0 = resolvePos(KEYS[i - 1], aspect)[axis];
  const p2 = resolvePos(KEYS[i + 1], aspect)[axis];
  return (p2 - p0) * 0.5;
}

/** Camera for scroll position `u` (viewport heights). Writes into `out`. */
export function sampleCamera(u: number, aspect: number, out: Camera): Camera {
  const n = KEYS.length;
  let i = 0;
  while (i < n - 2 && u >= KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const raw = Math.min(1, Math.max(0, (u - a.at) / Math.max(1e-6, b.at - a.at)));
  const t = ease(raw, a.ease ?? "inOut");

  // Position: cubic Hermite (smooth through pass keys, stopping at rest keys).
  const pa = resolvePos(a, aspect);
  const pb = resolvePos(b, aspect);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  for (let ax = 0; ax < 3; ax++) {
    out.pos[ax] = h00 * pa[ax] + h10 * tangent(i, aspect, ax) + h01 * pb[ax] + h11 * tangent(i + 1, aspect, ax);
  }

  const sa = a.shot;
  const sb = b.shot;
  out.yaw = lerp(resolveYaw(sa, aspect), resolveYaw(sb, aspect), t);
  out.pitch = lerp(sa.pitch, sb.pitch, t);
  out.roll = lerp(sa.roll, sb.roll, t);
  out.fov = lerp(sa.fov, sb.fov, t);
  out.shade = lerp(sa.shade, sb.shade, t);
  out.fog = lerp(sa.fog, sb.fog, t);
  out.ride = lerp(sa.ride, sb.ride, t);
  out.sway = lerp(sa.sway, sb.sway, t);
  out.stars = lerp(sa.stars, sb.stars, t);
  out.contour = lerp(sa.contour, sb.contour, t);
  out.stop = a.stop !== undefined && a.stop === b.stop ? a.stop : -1;
  return out;
}

export function newCamera(): Camera {
  return {
    pos: [0, 10, 0],
    yaw: 0,
    pitch: -90,
    roll: 0,
    fov: 30,
    shade: 0,
    fog: 0,
    ride: 0,
    sway: 0,
    stars: 0,
    contour: 0,
    stop: 0,
  };
}

/** Reduced motion: no flights, the camera cuts to the stop nearest to `u`. */
export function nearestRestU(u: number): number {
  let best = 0;
  let bestD = Infinity;
  for (const k of KEYS) {
    if (k.pass) continue;
    const d = Math.abs(k.at - u);
    if (d < bestD) {
      bestD = d;
      best = k.at;
    }
  }
  return best;
}
