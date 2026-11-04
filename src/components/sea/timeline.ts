/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: camera shots + timeline sampling
 *
 *  Scroll position is measured in viewport heights (`u`). Each key
 *  pins a camera *shot* at a value of u; between keys the camera is
 *  eased along a Hermite spline. Keys marked `pass` are fly-through
 *  points (the path curves through them without stopping), every
 *  other key is a rest point (zero velocity).
 *
 *  The keys themselves are generated from the journey (journey.ts).
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
  /** Top-down framing: altitude is chosen so this much world width is visible. */
  span?: number;
  /** What `span` fits: the screen width (default, like the old field) or its longer side. */
  spanFit?: "width" | "long";
  /** Yaw override on portrait screens. */
  portraitYaw?: number;
  /** 0..1 lighting strength (0 = flat bands, like the old 2D field). */
  shade: number;
  /** Exponential fog density per world unit. Also fades in the horizon glow. */
  fog: number;
  /** 0..1 how much the camera rides (bobs with) the swell under it. */
  ride: number;
  /** 0..1 idle hand-held drift. */
  sway: number;
  /** 0..1 stars in the sky. */
  stars: number;
  /** 0..1 the plasma resolves into the open ocean (coherent rolling waves). */
  ocean: number;
  /** 0..1 glyphs follow the light (3D shading) instead of hard height bands. */
  lit: number;
  /** 0..1 nautical-chart look (map view); the cursor scans the live sea through it. */
  chart: number;
  /** 0..1 drifting particles (underwater). */
  snow: number;
};

export type Ease = "inOut" | "in" | "out" | "linear";

export type Key = {
  at: number;
  shot: Shot;
  /** Easing of the segment that *starts* at this key. */
  ease?: Ease;
  /** Fly-through key: the path keeps its velocity here instead of stopping. */
  pass?: boolean;
  /** Beat index this key belongs to (rest keys only): HUD + arrival pulses. */
  beat?: number;
};

export const SHOT_BASE = {
  roll: 0,
  shade: 0,
  fog: 0,
  ride: 0,
  sway: 0,
  stars: 0,
  ocean: 0,
  lit: 0,
  chart: 0,
  snow: 0,
};

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
  ocean: number;
  lit: number;
  chart: number;
  snow: number;
  /** Beat whose rest window contains u, or -1 while travelling. */
  beat: number;
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
function tangent(keys: Key[], i: number, aspect: number, axis: number): number {
  const k = keys[i];
  if (!k.pass || i === 0 || i === keys.length - 1) return 0;
  const p0 = resolvePos(keys[i - 1], aspect)[axis];
  const p2 = resolvePos(keys[i + 1], aspect)[axis];
  return (p2 - p0) * 0.5;
}

/** Camera for scroll position `u` (viewport heights). Writes into `out`. */
export function sampleCamera(keys: Key[], u: number, aspect: number, out: Camera): Camera {
  const n = keys.length;
  let i = 0;
  while (i < n - 2 && u >= keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
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
    out.pos[ax] =
      h00 * pa[ax] + h10 * tangent(keys, i, aspect, ax) + h01 * pb[ax] + h11 * tangent(keys, i + 1, aspect, ax);
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
  out.ocean = lerp(sa.ocean, sb.ocean, t);
  out.lit = lerp(sa.lit, sb.lit, t);
  out.chart = lerp(sa.chart, sb.chart, t);
  out.snow = lerp(sa.snow, sb.snow, t);
  out.beat = a.beat !== undefined && a.beat === b.beat ? a.beat : -1;
  return out;
}

export function newCamera(): Camera {
  return {
    pos: [0, 10, 0],
    yaw: 0,
    pitch: -90,
    fov: 30,
    ...SHOT_BASE,
    beat: 0,
  };
}

/** Reduced motion: no flights, the camera cuts to the rest key nearest to `u`. */
export function nearestRestU(keys: Key[], u: number): number {
  let best = 0;
  let bestD = Infinity;
  for (const k of keys) {
    if (k.pass) continue;
    const d = Math.abs(k.at - u);
    if (d < bestD) {
      bestD = d;
      best = k.at;
    }
  }
  return best;
}
