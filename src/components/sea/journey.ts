/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: the journey (single source of truth for the site)
 *
 *  A journey is a list of *beats*. Each beat is one camera rest
 *  (a place you stop and read), reached by travelling from the
 *  previous beat. Everything else is derived from this list:
 *    · the camera keys (timeline.ts samples them)
 *    · when each content panel is visible
 *    · transit labels, HUD stop nav, waypoints, map markers
 *    · deep links (/#experience …)
 *
 *  To add a section: add a beat (and, if it needs its own water,
 *  a region in world.ts), then render its id in SeaExperience.
 * ─────────────────────────────────────────────────────────────
 */

import { SHOT_BASE, type Key, type Shot, type Vec3 } from "./timeline";
import { BEACONS } from "./world";

export type StopId = "origin" | "surface" | "swell" | "waypoints" | "current" | "harbor" | "map" | "deep";

export type Stop = { id: StopId; code: string; name: string; hash: string };

export const STOPS: Stop[] = [
  { id: "origin", code: "00", name: "Origin", hash: "" },
  { id: "surface", code: "01", name: "The Surface", hash: "about" },
  { id: "swell", code: "02", name: "The Swell", hash: "experience" },
  { id: "waypoints", code: "03", name: "Waypoints", hash: "projects" },
  { id: "current", code: "04", name: "The Current", hash: "skills" },
  { id: "harbor", code: "05", name: "The Harbor", hash: "education" },
  { id: "map", code: "06", name: "The Map", hash: "map" },
  { id: "deep", code: "07", name: "The Deep", hash: "contact" },
];

export type Beat = {
  id: string;
  stop: StopId;
  /** Camera on arrival. */
  shot: Shot;
  /** Camera at the end of the rest (a slow drift while reading). */
  drift?: Partial<Shot>;
  /** Viewport heights spent at rest. */
  hold: number;
  /** Viewport heights of travel from the previous beat. */
  travel?: number;
  /** Fly-through shots on the way in. */
  via?: Shot[];
  /** HUD label while travelling in. */
  label?: string;
  /** World point the HUD waypoint marker points at (and the map marker sits on). */
  target?: Vec3;
  /** Short label for the waypoint / map marker. */
  mark?: string;
  /** Region / beacon id this beat sits in (colours its markers). */
  region?: string;
};

/* ───────────── shot helpers ───────────── */

const SEA = { ...SHOT_BASE, shade: 0.8, fog: 0.03, sway: 1, stars: 1, ocean: 1, lit: 0.55, ride: 0.2 };

const d2r = Math.PI / 180;

/**
 * A shot looking at `target` (xz) along `heading` (deg), from `dist` back, at `alt`.
 * `off` turns the camera so the target sits that many degrees right of centre.
 */
function aim(
  target: [number, number],
  heading: number,
  dist: number,
  alt: number,
  o: Partial<Shot> & { off?: number } = {},
): Shot {
  const { off = 0, ...rest } = o;
  const fx = Math.sin(heading * d2r);
  const fz = -Math.cos(heading * d2r);
  return {
    ...SEA,
    pos: [target[0] - fx * dist, alt, target[1] - fz * dist],
    yaw: heading - off,
    pitch: -6,
    fov: 58,
    ...rest,
  };
}

/** Same shot, nudged forward along its heading (the drift while reading). */
function ahead(s: Shot, by: number, yawBy = 0): Partial<Shot> {
  const fx = Math.sin(s.yaw * d2r);
  const fz = -Math.cos(s.yaw * d2r);
  return { pos: [s.pos[0] + fx * by, s.pos[1], s.pos[2] + fz * by], yaw: s.yaw + yawBy };
}

const beacon = (id: string): [number, number] => BEACONS.find((b) => b.id === id)!.pos;
const at = (p: [number, number], y = 0): Vec3 => [p[0], y, p[1]];

/* ───────────── the beats ───────────── */

const HERO: Shot = { ...SHOT_BASE, pos: [0, 0, 0], yaw: 0, pitch: -90, fov: 30, span: 11 };

const SURFACE: Shot = { ...SEA, pos: [1.8, 0.85, -3.8], yaw: 22, pitch: -7, fov: 56 };

const SWELL_SHOT = { ...SEA, ride: 1, pitch: -7, fov: 58, fog: 0.032, shade: 0.9 };

const EXP0: Shot = { ...SWELL_SHOT, pos: [3.6, 1.85, -30], yaw: 8, roll: 2 };
const EXP1: Shot = { ...SWELL_SHOT, pos: [8.0, 1.9, -39], yaw: -14, roll: -2 };
const EXP2: Shot = { ...SWELL_SHOT, pos: [5.5, 1.9, -49], yaw: -38 };

const P = ["p-glass", "p-cross", "p-terrace", "p-ping", "p-scan", "p-ice"] as const;
const PROJ_HEADINGS = [-40, -60, -120, -153, -187, -215];
const PROJ_SHOTS: Shot[] = P.map((id, i) =>
  aim(beacon(id), PROJ_HEADINGS[i], 9.5, 1.35, { off: i % 2 ? -11 : 11, pitch: -5 }),
);

const SKILLS: Shot = { ...SEA, pos: [-25, 0.95, -9], yaw: -225, pitch: -6, fov: 64, lit: 0.5 };
const HARBOR: Shot = aim(beacon("harbor"), -220, 10, 1.6, { off: 12, pitch: -4, fov: 56 });

const MAP: Shot = {
  ...SHOT_BASE,
  pos: [-16, 0, -30],
  yaw: -90,
  portraitYaw: 0,
  pitch: -90,
  fov: 40,
  span: 112,
  spanFit: "long",
  shade: 0.35,
  fog: 0.002,
  ocean: 1,
  lit: 0.3,
  chart: 1,
};

const DEEP: Shot = {
  ...SEA,
  pos: [-16, -4.2, -36],
  yaw: -90,
  pitch: 24,
  fov: 62,
  fog: 0.0,
  sway: 0.8,
  stars: 0,
  ride: 0,
  snow: 1,
};

export const BEATS: Beat[] = [
  { id: "hero", stop: "origin", shot: HERO, hold: 0.15 },
  {
    id: "about",
    stop: "surface",
    travel: 1.4,
    label: "Descending // The Surface",
    // Insertion: a fast satellite-style dive, banking as it drops…
    via: [{ ...SHOT_BASE, pos: [1.0, 3.2, -1.7], yaw: 14, pitch: -58, roll: -7, fov: 44, shade: 0.45, fog: 0.01, ocean: 0.6, lit: 0.3 }],
    shot: SURFACE,
    drift: { pos: [2.3, 0.9, -6.2], yaw: 26 },
    hold: 1.0,
  },
  {
    id: "exp-0",
    stop: "swell",
    travel: 1.25,
    label: "En route // The Swell",
    via: [{ ...SURFACE, pos: [0.6, 0.95, -18], yaw: -6, pitch: -4, roll: -9, fov: 66, sway: 0.4 }],
    shot: EXP0,
    drift: ahead(EXP0, 3, -4),
    hold: 0.9,
  },
  { id: "exp-1", stop: "swell", travel: 0.6, label: "Riding the swell", shot: EXP1, drift: ahead(EXP1, 3, -4), hold: 0.9 },
  { id: "exp-2", stop: "swell", travel: 0.6, label: "Riding the swell", shot: EXP2, drift: ahead(EXP2, 2.5, -6), hold: 0.9 },
  ...PROJ_SHOTS.map(
    (s, i): Beat => ({
      id: `proj-${i}`,
      stop: "waypoints",
      travel: i === 0 ? 0.95 : 0.75,
      label: i === 0 ? "Waypoints // 6 signals detected" : `Next waypoint // ${String(i + 1).padStart(2, "0")} of 06`,
      shot: s,
      drift: ahead(s, 2.2, i % 2 ? 3 : -3),
      hold: 0.9,
      target: at(beacon(P[i]), 0.5),
      mark: `03.${i + 1}`,
      region: P[i],
    }),
  ),
  {
    id: "skills",
    stop: "current",
    travel: 0.85,
    label: "Caught in the current",
    shot: SKILLS,
    drift: ahead(SKILLS, 2.5, -4),
    hold: 1.0,
  },
  {
    id: "education",
    stop: "harbor",
    travel: 0.85,
    label: "Returning to harbor",
    shot: HARBOR,
    drift: ahead(HARBOR, 2, 3),
    hold: 0.95,
    target: at(beacon("harbor"), 1.5),
    mark: "05",
    region: "harbor",
  },
  {
    id: "map",
    stop: "map",
    travel: 1.05,
    label: "Ascending // Charting the sea",
    via: [{ ...SEA, pos: [-10, 9, -4], yaw: -160, pitch: -52, fov: 50, shade: 0.6, fog: 0.012, stars: 0.5, sway: 0, ride: 0 }],
    shot: MAP,
    hold: 1.15,
  },
  {
    id: "deep",
    stop: "deep",
    travel: 1.1,
    label: "Descending // The Deep",
    via: [
      { ...MAP, span: undefined, spanFit: undefined, pos: [-16, 14, -34], pitch: -88, fov: 50, chart: 0.2, lit: 0.5 },
      { ...SEA, pos: [-16, -1.4, -35], yaw: -90, pitch: -40, fov: 60, stars: 0, sway: 0, ride: 0, snow: 0.5 },
    ],
    shot: DEEP,
    drift: { pos: [-16.6, -4.7, -37], pitch: 30 },
    hold: 1.25,
    target: [-16, -4.2, -42],
  },
];

/* ───────────── derived timeline ───────────── */

export type BeatWindow = {
  beat: number;
  /** Scroll position (vh) of arrival and of leaving. */
  arrive: number;
  leave: number;
  /** Travel into this beat, [start, end]. */
  travelFrom: number;
};

function unwrapYaw(prev: number, yaw: number): number {
  let y = yaw;
  while (y - prev > 180) y -= 360;
  while (y - prev < -180) y += 360;
  return y;
}

function buildKeys(beats: Beat[]): { keys: Key[]; windows: BeatWindow[] } {
  const keys: Key[] = [];
  const windows: BeatWindow[] = [];
  let u = 0;
  let lastYaw = beats[0].shot.yaw;
  const fix = (s: Shot): Shot => {
    const yaw = unwrapYaw(lastYaw, s.yaw);
    lastYaw = yaw;
    const portraitYaw = s.portraitYaw === undefined ? undefined : unwrapYaw(yaw, s.portraitYaw);
    return { ...s, yaw, portraitYaw };
  };
  beats.forEach((b, i) => {
    const travelFrom = u;
    if (i > 0) {
      const travel = b.travel ?? 0.75;
      const via = b.via ?? [];
      // The rest key that ends the previous beat starts the travel: accelerate out.
      if (via.length) keys[keys.length - 1].ease = "in";
      via.forEach((s, j) => {
        keys.push({
          at: u + (travel * (j + 1)) / (via.length + 1),
          shot: fix(s),
          pass: true,
          ease: j === via.length - 1 ? "out" : "linear",
        });
      });
      u += travel;
    }
    const arrive = u;
    const shot = fix(b.shot);
    keys.push({ at: u, shot, beat: i });
    u += b.hold;
    const end = fix({ ...shot, ...b.drift });
    keys.push({ at: u, shot: end, beat: i });
    windows.push({ beat: i, arrive, leave: u, travelFrom });
  });
  return { keys, windows };
}

const built = buildKeys(BEATS);
export const KEYS = built.keys;
export const WINDOWS = built.windows;

/** Total scroll length of the page in viewport heights (last key + one screen). */
export const TRACK_VH = KEYS[KEYS.length - 1].at + 1;

export function beatIndex(id: string): number {
  return BEATS.findIndex((b) => b.id === id);
}

export function stopIndex(id: StopId): number {
  return STOPS.findIndex((s) => s.id === id);
}

/** Scroll position (vh) where a stop's first beat arrives. */
export function stopArriveU(stop: StopId): number {
  const i = BEATS.findIndex((b) => b.stop === stop);
  return i >= 0 ? WINDOWS[i].arrive : 0;
}

/** Deep-link hash (#experience …) → stop. "resume" lands on contact. */
export function stopForHash(hash: string): StopId | null {
  const h = hash.replace(/^#/, "");
  if (!h) return null;
  if (h === "resume") return "deep";
  return STOPS.find((s) => s.hash === h)?.id ?? null;
}
