/**
 * Camera shots + timeline sampling (the camera feel carried over from the previous build).
 *
 * Scroll position is measured in viewport heights (`u`). Each key pins a shot at a value
 * of u; between keys the camera is eased along a Hermite spline. `pass` keys are
 * fly-through points (the path keeps its speed through them), every other key is a
 * rest point.
 */

export type Vec3 = [number, number, number];

export type Shot = {
  pos: Vec3;
  /** Degrees. 0 = facing -z (north), positive = turning right. */
  yaw: number;
  /** Degrees. -90 = straight down, 0 = level. */
  pitch: number;
  roll: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Top-down framing: altitude is chosen so this many world units fit across the screen. */
  span?: number;
  /** 0..1 plasma relief (0 = flat, like the live background). */
  amp: number;
  /** Fade-out distance (world units). */
  fog: number;
  /** Smallest on-screen glyph, relative to the native cell (1 = the live field's size). */
  glyph: number;
};

export type Ease = "inOut" | "linear";

export type Key = { at: number; shot: Shot; ease?: Ease; pass?: boolean };

export type Camera = Omit<Shot, "span"> & { pos: Vec3 };

function ease(t: number, e: Ease): number {
  if (e === "linear") return t;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Altitude that fits `span` world units across the screen. */
export function spanAltitude(span: number, fov: number, aspect: number): number {
  return span / 2 / (aspect * Math.tan((fov * Math.PI) / 360));
}

function resolvePos(s: Shot, aspect: number): Vec3 {
  return s.span ? [s.pos[0], spanAltitude(s.span, s.fov, aspect), s.pos[2]] : s.pos;
}

function tangent(keys: Key[], i: number, aspect: number, axis: number): number {
  if (!keys[i].pass || i === 0 || i === keys.length - 1) return 0;
  return (resolvePos(keys[i + 1].shot, aspect)[axis] - resolvePos(keys[i - 1].shot, aspect)[axis]) * 0.5;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function sampleCamera(keys: Key[], u: number, aspect: number): Camera {
  const n = keys.length;
  let i = 0;
  while (i < n - 2 && u >= keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const raw = Math.min(1, Math.max(0, (u - a.at) / Math.max(1e-6, b.at - a.at)));
  // Segments into / out of a pass key ease on one side only, so the path keeps moving.
  let t = ease(raw, a.ease ?? "inOut");
  if (a.pass && !b.pass) t = 1 - Math.pow(1 - raw, 2);
  else if (!a.pass && b.pass) t = raw * raw;
  else if (a.pass && b.pass) t = raw;

  const pa = resolvePos(a.shot, aspect);
  const pb = resolvePos(b.shot, aspect);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const pos: Vec3 = [0, 0, 0];
  for (let ax = 0; ax < 3; ax++) {
    pos[ax] = h00 * pa[ax] + h10 * tangent(keys, i, aspect, ax) + h01 * pb[ax] + h11 * tangent(keys, i + 1, aspect, ax);
  }
  const sa = a.shot;
  const sb = b.shot;
  return {
    pos,
    yaw: lerp(sa.yaw, sb.yaw, t),
    pitch: lerp(sa.pitch, sb.pitch, t),
    roll: lerp(sa.roll, sb.roll, t),
    fov: lerp(sa.fov, sb.fov, t),
    amp: lerp(sa.amp, sb.amp, t),
    fog: lerp(sa.fog, sb.fog, t),
    glyph: lerp(sa.glyph, sb.glyph, t),
  };
}
