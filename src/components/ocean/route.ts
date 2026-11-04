/**
 * The route: every stop on the site, the camera shot that frames it, and which water
 * event belongs to it. Everything else (camera keys, when text shows, event strength,
 * nav targets) is derived from BEATS.
 *
 * Pacing is in viewport heights of scroll: `travel` to get there, `hold` while you read.
 */
import { CALM, CURRENTS, ISLANDS, SWELL, TIME, WHIRL, type Vec2 } from "./world";
import type { Key, Shot, Vec3 } from "./timeline";

export type Section = "origin" | "about" | "experience" | "skills" | "projects" | "education" | "contact" | "directory";

export type Beat = {
  id: string;
  section: Section;
  shot: Shot;
  /** Fly-through shots on the way in. */
  via?: Shot[];
  travel: number;
  hold: number;
  /** Where the text sits; the camera frames the event on the other side. */
  side: "left" | "right" | "center" | "split";
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
/** About: low over open water. */
const ABOUT: Shot = { ...SEA, pos: [1.4, 1.75, -4], yaw: 8, pitch: -11, fov: 55 };

/** Skills: looking north up the three currents from their near end. */
const SKILLS: Shot = { ...SEA, pos: [CURRENTS.x, 6.2, CURRENTS.z1 - 3.5], yaw: 0, pitch: -24, fov: 56, fog: 75 };
/** Swing out of the swell and round to the currents. */
const TO_SKILLS: Shot = { ...SEA, pos: [CURRENTS.x - 8, 4.5, -66], yaw: 30, pitch: -16, roll: 4, fov: 60 };

/** Experience: back off each crest far enough to read its whole span of the time axis, which
 * lies on the left of the screen (the text is on the right). */
const EXP_X = TIME.x1 + 0.5;
const EXP: Shot[] = SWELL.crests.map((zc) => ({ ...SEA, pos: [EXP_X, 12, zc + 10], yaw: 0, pitch: -40, fov: 60, fog: 90 }));
/** Down into the trough before each crest. */
const trough = (k: number): Shot => {
  const z = k === 0 ? SWELL.crests[0] + 16 : (SWELL.crests[k - 1] + SWELL.crests[k]) / 2 + 7;
  return { ...SEA, pos: [EXP_X - 1.5 + 3 * (k % 2), 2.6, z], yaw: k % 2 ? -5 : 5, pitch: -7, fov: 62 };
};

/** Projects: high enough to see the whole row of islands at once. */
const PROJECTS: Shot = { ...SEA, pos: [-12, 8.5, -87], yaw: 0, pitch: -30, fov: 58, fog: 80 };

/** Education: low over calm water, the sun on the horizon to the right of the text. */
const EDUCATION: Shot = { ...SEA, pos: [-50, 1.15, -64], yaw: CALM.sunYaw - 16, pitch: 1.5, fov: 50, fog: 400 };

const WHIRL_YAW = -200;
const WHIRL_APPROACH = aim(WHIRL.c, WHIRL_YAW, 30, 15, 0, { fov: 56, fog: 120 });
const CONTACT: Shot = {
  pos: [WHIRL.c[0], 0, WHIRL.c[1]],
  yaw: WHIRL_YAW,
  pitch: -90,
  roll: 0,
  fov: 34,
  span: 44,
  amp: 1,
  fog: 500,
  glyph: 1.0,
};
/** Down the funnel, corkscrewing, into the dark. */
const DIVE_IN: Shot = { ...CONTACT, span: undefined, pos: [WHIRL.c[0], -WHIRL.depth * 0.75, WHIRL.c[1]], yaw: WHIRL_YAW + 260, fov: 80, glyph: 1.3 };

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
  { id: "skills", section: "skills", via: [TO_SKILLS], shot: SKILLS, travel: 1.6, hold: 1.2, side: "split" },
  { id: "projects", section: "projects", shot: PROJECTS, travel: 1.5, hold: 1.6, side: "split" },
  { id: "education", section: "education", shot: EDUCATION, travel: 1.4, hold: 1.1, side: "left" },
  { id: "contact", section: "contact", via: [WHIRL_APPROACH], shot: CONTACT, travel: 1.8, hold: 0.6, side: "center" },
  { id: "directory", section: "directory", shot: DIVE_IN, travel: 1.6, hold: 1.0, side: "center" },
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
    ["skills", "Skills"],
    ["projects", "Projects"],
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

export type Events = {
  currents: number;
  swell: number;
  crest: [number, number, number];
  /** Each island's rise (staggered left to right). */
  islands: number[];
  calm: number;
  whirl: number;
  /** 0..1 down the whirlpool. */
  dive: number;
  /** 0..1 the screen going black at the bottom. */
  blackout: number;
  /** 0..1 the swirling field gathering into the directory's boxes. */
  form: number;
};

export function eventsAt(u: number): Events {
  const e0 = beatIndex("exp-0");
  const pj = beatIndex("projects");
  const di = beatIndex("directory");
  const dw = WINDOWS[di];
  const dt = BEATS[di].travel;
  return {
    currents: eventWeight(u, beatIndex("skills"), beatIndex("skills")),
    swell: eventWeight(u, e0, e0 + 2),
    crest: [0, 1, 2].map((k) => textOpacity(u, e0 + k)) as [number, number, number],
    islands: ISLANDS.map((_, k) => {
      const w = WINDOWS[pj];
      const t = BEATS[pj].travel;
      const rise = smooth(ramp(u, w.start + t * (0.35 + 0.13 * k), w.start + t * (0.75 + 0.13 * k)));
      const sink = u > w.leave ? eventWeight(u, pj, pj) : 1; // all sink together on the way out
      return Math.min(rise, sink);
    }),
    calm: eventWeight(u, beatIndex("education"), beatIndex("education")),
    whirl: eventWeight(u, beatIndex("contact"), beatIndex("contact"), true),
    dive: smooth(ramp(u, dw.start, dw.arrive)),
    blackout: smooth(ramp(u, dw.start + dt * 0.55, dw.arrive - dt * 0.05)),
    form: smooth(ramp(u, dw.arrive - dt * 0.15, dw.arrive + 0.45)),
  };
}

/** Sun direction for the Education horizon. */
export const SUN_DIR: Vec3 = (() => {
  const y = rad(CALM.sunYaw);
  const e = rad(CALM.sunElev);
  return [Math.sin(y) * Math.cos(e), Math.sin(e), -Math.cos(y) * Math.cos(e)];
})();

/** Opacity of something shown across beats [i0, i1] (e.g. the experience timeline). */
export function spanOpacity(u: number, i0: number, i1: number): number {
  const a = WINDOWS[i0];
  const b = WINDOWS[i1];
  return smooth(ramp(u, a.arrive - 0.3, a.arrive - 0.02)) * (1 - smooth(ramp(u, b.leave + 0.02, b.leave + 0.3)));
}

/** Opacity of a beat's text at u: in as the camera settles, out as it leaves. */
export function textOpacity(u: number, i: number): number {
  const w = WINDOWS[i];
  if (i === 0) return 1 - smooth(ramp(u, w.leave, w.leave + 0.35));
  const fin = smooth(ramp(u, w.arrive - 0.3, w.arrive - 0.02));
  if (i === BEATS.length - 1) return fin;
  return fin * (1 - smooth(ramp(u, w.leave + 0.02, w.leave + 0.3)));
}
