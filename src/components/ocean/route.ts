/**
 * The route: every stop on the site, the camera shot that frames it, and which water
 * event belongs to it. Everything else (camera keys, when text shows, event strength,
 * nav targets) is derived from BEATS.
 *
 * Pacing is in viewport heights of scroll: `travel` to get there, `hold` while you read.
 */
import { EDDIES, SWELL, WHIRL, swellAt, type Vec2 } from "./world";
import type { Key, Shot, Vec3 } from "./timeline";

export type Section = "origin" | "about" | "experience" | "projects" | "skills" | "education" | "contact";

export type Beat = {
  id: string;
  section: Section;
  shot: Shot;
  /** Fly-through shots on the way in. */
  via?: Shot[];
  travel: number;
  hold: number;
  /** Where the text sits; the camera frames the event on the other side. */
  side: "left" | "right" | "center";
};

const SEA: Omit<Shot, "pos" | "yaw" | "pitch" | "fov"> = { roll: 0, amp: 1, fog: 60, glyph: 1.7 };

const rad = (d: number) => (d * Math.PI) / 180;
const fwd = (yaw: number): Vec2 => [Math.sin(rad(yaw)), -Math.cos(rad(yaw))];
const right = (yaw: number): Vec2 => [Math.cos(rad(yaw)), Math.sin(rad(yaw))];

/** Frame `target`: camera `dist` behind it along `yaw`, `height` up, shifted `side` to the right. */
function aim(target: Vec2, yaw: number, dist: number, height: number, side: number, extra: Partial<Shot> = {}): Shot {
  const f = fwd(yaw);
  const r = right(yaw);
  const pos: Vec3 = [target[0] - f[0] * dist + r[0] * side, height, target[1] - f[1] * dist + r[1] * side];
  const pitch = -(Math.atan2(height, Math.hypot(dist, side)) * 180) / Math.PI;
  return { ...SEA, pos, yaw, pitch, fov: 52, ...extra };
}

/* ── the shots ── */

const ORIGIN: Shot = { pos: [0, 0, 0], yaw: 0, pitch: -90, roll: 0, fov: 30, span: 11, amp: 0, fog: 500, glyph: 0.75 };

const DIVE: Shot = { pos: [0.8, 4.2, -1.2], yaw: 6, pitch: -52, roll: -5, fov: 44, amp: 0.55, fog: 120, glyph: 1.2 };
const ABOUT: Shot = { ...SEA, pos: [1.4, 1.75, -4], yaw: 8, pitch: -11, fov: 55 };

const EXP_X = [SWELL.x - 1, SWELL.x + 2, SWELL.x - 2];
const EXP_YAW = [4, -6, 6];
const EXP: Shot[] = SWELL.crests.map((zc, k) => {
  const z = zc + 2.4;
  return { ...SEA, pos: [EXP_X[k], swellAt(EXP_X[k], z) + 1.75, z], yaw: EXP_YAW[k], pitch: -14, fov: 58 };
});
/** Down into the trough before each crest. */
const trough = (k: number): Shot => {
  const z = k === 0 ? -13 : (SWELL.crests[k - 1] + SWELL.crests[k]) / 2 + 2;
  return { ...SEA, pos: [EXP_X[k], 1.3, z], yaw: EXP_YAW[k], pitch: -6, fov: 60 };
};

const PROJ_YAW = [-35, -75, -120, -160];
const PROJ: Shot[] = EDDIES.map((e, k) =>
  aim(e.c, PROJ_YAW[k], 6.5, 7.5, k % 2 ? -4.2 : 4.2, { fov: 54 }),
);

const SKILLS: Shot = { ...SEA, pos: [-43.5, 8.5, -47], yaw: -150, pitch: -36, fov: 56 };
const EDUCATION: Shot = { ...SEA, pos: [-45.5, 3.2, -8], yaw: -172, pitch: -15, fov: 52, fog: 70 };

const WHIRL_APPROACH = aim(WHIRL.c, -215, 14, 7.5, 0, { fov: 56, fog: 80 });
const CONTACT: Shot = {
  pos: [WHIRL.c[0], 0, WHIRL.c[1]],
  yaw: -180,
  pitch: -90,
  roll: 0,
  fov: 34,
  span: 19,
  amp: 1,
  fog: 500,
  glyph: 1.0,
};

export const BEATS: Beat[] = [
  { id: "origin", section: "origin", shot: ORIGIN, travel: 0, hold: 0.25, side: "left" },
  { id: "about", section: "about", via: [DIVE], shot: ABOUT, travel: 1.5, hold: 1.0, side: "left" },
  ...EXP.map(
    (s, k): Beat => ({
      id: `exp-${k}`,
      section: "experience",
      via: [trough(k)],
      shot: s,
      travel: k === 0 ? 1.4 : 1.0,
      hold: 1.0,
      side: "right",
    }),
  ),
  ...PROJ.map(
    (s, k): Beat => ({
      id: `proj-${k}`,
      section: "projects",
      shot: s,
      travel: k === 0 ? 1.3 : 1.0,
      hold: 1.0,
      side: k % 2 ? "left" : "right",
    }),
  ),
  { id: "skills", section: "skills", shot: SKILLS, travel: 1.3, hold: 1.1, side: "left" },
  { id: "education", section: "education", shot: EDUCATION, travel: 1.2, hold: 1.0, side: "left" },
  { id: "contact", section: "contact", via: [WHIRL_APPROACH], shot: CONTACT, travel: 1.8, hold: 0.6, side: "center" },
];

/* ── derived timing ── */

export type Window = { start: number; arrive: number; leave: number };

/** start = leaves the previous stop, arrive / leave = the rest window. */
export const WINDOWS: Window[] = (() => {
  let u = 0;
  return BEATS.map((b) => {
    const start = u;
    const arrive = u + b.travel;
    const leave = arrive + b.hold;
    u = leave;
    return { start, arrive, leave };
  });
})();

/** Scroll length of the whole route (viewport heights). */
export const TRACK = WINDOWS[WINDOWS.length - 1].leave;

export const KEYS: Key[] = (() => {
  const keys: Key[] = [];
  BEATS.forEach((b, i) => {
    const w = WINDOWS[i];
    const via = b.via ?? [];
    via.forEach((s, j) => keys.push({ at: w.start + (b.travel * (j + 1)) / (via.length + 1.4), shot: s, pass: true }));
    keys.push({ at: w.arrive, shot: b.shot });
    if (b.hold > 0) keys.push({ at: w.leave, shot: b.shot });
  });
  return keys;
})();

export const beatIndex = (id: string) => BEATS.findIndex((b) => b.id === id);

/** First beat of each section (nav + deep links). */
export const SECTIONS: { id: Section; label: string; u: number }[] = (
  [
    ["about", "About"],
    ["experience", "Experience"],
    ["projects", "Projects"],
    ["skills", "Skills"],
    ["education", "Education"],
    ["contact", "Contact"],
  ] as [Section, string][]
).map(([id, label]) => ({ id, label, u: WINDOWS[BEATS.findIndex((b) => b.section === id)].arrive }));

const ramp = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Strength of the event that belongs to beats [i0, i1]: builds on the way in, fades on the way out. */
function eventWeight(u: number, i0: number, i1: number, stays = false): number {
  const a = WINDOWS[i0];
  const b = WINDOWS[i1];
  const tin = BEATS[i0].travel;
  const inW = smooth(ramp(u, a.start + tin * 0.15, a.arrive - tin * 0.15));
  if (stays || i1 === BEATS.length - 1) return inW;
  const tout = BEATS[i1 + 1].travel;
  const outW = 1 - smooth(ramp(u, b.leave + tout * 0.1, b.leave + tout * 0.65));
  return inW * outW;
}

export type Events = { swell: number; eddies: number[]; currents: number; still: number; whirl: number };

export function eventsAt(u: number): Events {
  const e0 = beatIndex("exp-0");
  const p0 = beatIndex("proj-0");
  return {
    swell: eventWeight(u, e0, e0 + 2),
    eddies: EDDIES.map((_, k) => eventWeight(u, p0 + k, p0 + k)),
    currents: eventWeight(u, beatIndex("skills"), beatIndex("skills")),
    still: eventWeight(u, beatIndex("education"), beatIndex("education")),
    whirl: eventWeight(u, beatIndex("contact"), beatIndex("contact"), true),
  };
}

/** Opacity of a beat's text at u: in as the camera settles, out as it leaves. */
export function textOpacity(u: number, i: number): number {
  const w = WINDOWS[i];
  if (i === 0) return 1 - smooth(ramp(u, w.leave, w.leave + 0.35));
  const fin = smooth(ramp(u, w.arrive - 0.3, w.arrive - 0.02));
  if (i === BEATS.length - 1) return fin;
  return fin * (1 - smooth(ramp(u, w.leave + 0.02, w.leave + 0.3)));
}
