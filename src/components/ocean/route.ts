/**
 * The route: every stop on the site, the camera shot that frames it, and which water
 * event belongs to it. Everything else (camera keys, when text shows, event strength,
 * nav targets) is derived from BEATS.
 *
 * Pacing is in viewport heights of scroll: `travel` to get there, `hold` while you read.
 */
import { CALM, CHAIN, CHAINS, CURRENTS, ISLANDS, SWELL, WHIRL, swellAt, whirlH, type Vec2 } from "./world";
import type { Key, Shot, Vec3 } from "./timeline";

export type Section = "origin" | "about" | "experience" | "skills" | "projects" | "education" | "whirlpool" | "contact";

export type Beat = {
  id: string;
  section: Section;
  shot: Shot;
  /** Fly-through shots on the way in. */
  via?: Shot[];
  travel: number;
  hold: number;
  /** Where the text sits; the camera frames the event on the other side. */
  side: "left" | "right" | "center" | "split" | "full";
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
/**
 * About: low over open water. Its glyphs are deliberately small (glyph 0.9, set here and only
 * here, not inherited from SEA): Ryder has asked for the smaller ocean font in 01 repeatedly.
 * Don't change this when tuning other stops.
 */
const ABOUT: Shot = { ...SEA, pos: [1.4, 1.75, -4], yaw: 8, pitch: -11, fov: 55, glyph: 0.9 };

/** Skills: looking up the three currents from just past their near ends, which end mid-screen. */
const SKILLS: Shot = { ...SEA, pos: [CURRENTS.x, 6.2, CURRENTS.z1 + 9.5], yaw: 0, pitch: -21, fov: 56, fog: 75 };
/** Swing out of the swell and round to the currents. */
const TO_SKILLS: Shot = { ...SEA, pos: [CURRENTS.x - 8, 4.5, -64], yaw: 30, pitch: -16, roll: 4, fov: 60 };

export const EXP_X = [SWELL.x - 1, SWELL.x, SWELL.x - 1];
/** How far back from its crest each Experience shot sits. */
export const EXP_BACK = 6.5;
export const EXP_YAW = [4, -3, 3];
/** Low in the trough before each crest, the crest (and the timeline on it) across the view. */
const EXP: Shot[] = SWELL.crests.map((zc, k) => {
  const z = zc + EXP_BACK;
  // Small ocean glyphs, set here explicitly (like ABOUT): Ryder wants the smaller font in 02 too.
  return { ...SEA, pos: [EXP_X[k], swellAt(EXP_X[k], z) + 2.0, z], yaw: EXP_YAW[k], pitch: -10, fov: 58, glyph: 0.9 };
});
/** Down into the trough before each crest. */
const trough = (k: number): Shot => {
  const z = k === 0 ? SWELL.crests[0] + 10 : (SWELL.crests[k - 1] + SWELL.crests[k]) / 2 + 2;
  return { ...SEA, pos: [EXP_X[k], 1.3, z], yaw: EXP_YAW[k], pitch: -6, fov: 60, glyph: 0.9 };
};

/** Projects: from the south, high enough to see the whole chain of islands. */
const PROJECTS: Shot = { ...SEA, pos: [-12, 13, -78], yaw: 0, pitch: -33, fov: 56, fog: 100, glyph: 1.05 };

/**
 * All projects (off the route, from the "All projects" button): to the right of the featured
 * chain and higher, looking down on both chains, Professional in front, Personal behind.
 */
export const ALL_PROJECTS: Shot = aim([CHAIN.x, (CHAINS[0].z + CHAINS[1].z) / 2 + 2.5], 0, 18, 33, 0, { fov: 52, fog: 140, glyph: 1.05 });

/** Education: low over calm water, the sun on the horizon to the right of the text. */
const EDUCATION: Shot = { ...SEA, pos: [-50, 1.15, -64], yaw: CALM.sunYaw - 16, pitch: 1.5, fov: 50, fog: 400 };

/** Contact: up off the water, looking down into the whirlpool as it forms; the sun beyond it. */
const WHIRL_YAW = -192;
const CONTACT: Shot = aim(WHIRL.c, WHIRL_YAW, 25, 11, 0, { fov: 58, fog: 160, glyph: 1.2 });

/**
 * Pulled in: the camera is caught by the water and carried round with it (+θ, as the shader's
 * flow), spiralling down the funnel wall, banking into the turn and looking ever more steeply
 * down toward the throat, then straight down it.
 */
const HELIX: Shot[] = (() => {
  const [cx, cz] = WHIRL.c;
  const p0 = CONTACT.pos;
  const th0 = Math.atan2(p0[2] - cz, p0[0] - cx);
  //            r     above   Δθ (deg)  look in   pitch  roll  fov
  const legs = [
    [17, 7.5, 55, 0.5, -32, -8, 60],
    [11.5, 6.5, 125, 0.6, -42, -14, 64],
    [8, 5.6, 195, 0.7, -54, -18, 68],
    [5.5, 4.8, 260, 0.8, -66, -18, 72],
    [3.5, 4.0, 320, 0.9, -78, -12, 76],
  ];
  let prevYaw = CONTACT.yaw;
  return legs.map(([r, above, dth, inw, pitch, roll, fov]) => {
    const th = th0 + rad(dth);
    const x = cx + r * Math.cos(th);
    const z = cz + r * Math.sin(th);
    // Look along the flow (tangent, +θ) and in toward the centre.
    const vx = -Math.sin(th) * (1 - inw) - Math.cos(th) * inw;
    const vz = Math.cos(th) * (1 - inw) - Math.sin(th) * inw;
    let yaw = (Math.atan2(vx, -vz) * 180) / Math.PI;
    while (yaw - prevYaw > 180) yaw -= 360;
    while (yaw - prevYaw < -180) yaw += 360;
    prevYaw = yaw;
    return { ...SEA, pos: [x, whirlH(x, z) + above, z] as Vec3, yaw, pitch, roll, fov, fog: 120, glyph: 1.2 };
  });
})();
/** Down the throat, into the dark. */
const DIVE_IN: Shot = {
  ...HELIX[HELIX.length - 1],
  pos: [WHIRL.c[0], -WHIRL.depth - 0.6, WHIRL.c[1]],
  yaw: HELIX[HELIX.length - 1].yaw + 70,
  pitch: -89,
  roll: 0,
  fov: 84,
};

/**
 * 06: under the sea. Out of the bottom of the throat into deep water, sinking away from it:
 * the surface is a ceiling overhead with the funnel hanging down out of it (right of the text),
 * light shafts and bubbles (the deep pass) all around.
 */
const DEEP: Shot = { ...SEA, pos: [WHIRL.c[0] - 9, -20, WHIRL.c[1] + 22], yaw: 2, pitch: 30, roll: 0, fov: 62, amp: 0.8, fog: 75, glyph: 1.1 };
/** Just below the throat, looking straight up the funnel, still turning with it. */
const DEEP_IN: Shot = { ...DEEP, pos: [WHIRL.c[0], -13, WHIRL.c[1] + 1], yaw: -300, pitch: 84, fov: 70 };

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
  { id: "skills", section: "skills", via: [TO_SKILLS], shot: SKILLS, travel: 1.6, hold: 1.4, side: "left" },
  { id: "projects", section: "projects", shot: PROJECTS, travel: 1.5, hold: 2.8, side: "left" },
  { id: "education", section: "education", shot: EDUCATION, travel: 1.4, hold: 1.1, side: "left" },
  { id: "whirlpool", section: "whirlpool", shot: CONTACT, travel: 1.6, hold: 0.7, side: "center" },
  { id: "dive", section: "whirlpool", via: HELIX, shot: DIVE_IN, travel: 3.0, hold: 0, side: "center" },
  // Out of the black, high over the whirlpool.
  { id: "deep", section: "contact", via: [DEEP_IN], shot: DEEP, travel: 1.4, hold: 1.2, side: "full" },
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
  /** How formed each crest is: builds while you fly toward it, stays once you've passed. */
  crestBuild: [number, number, number];
  /** How formed each island is (0 = under the sea, 1 = fully risen); one at a time. */
  islands: number[];
  /** The low rolling sea around the islands. */
  isleSea: number;
  calm: number;
  whirl: number;
  /** 0..1 down the whirlpool. */
  dive: number;
  /** 0..1 the screen going black at the bottom (and lifting again, high above the whirlpool). */
  blackout: number;
  /** 0..1 under the sea (switches while it's black). */
  deep: number;
};

export function eventsAt(u: number): Events {
  const e0 = beatIndex("exp-0");
  const di = beatIndex("dive");
  const dw = WINDOWS[di];
  const dt = BEATS[di].travel;
  const ci = beatIndex("deep");
  const cw = WINDOWS[ci];
  const ct = BEATS[ci].travel;
  // The black lifts as the camera sinks away from the throat (DEEP_IN is the key part of the way).
  const lift = smooth(ramp(u, cw.start + ct * 0.34, cw.start + ct * 0.52));
  return {
    currents: eventWeight(u, beatIndex("skills"), beatIndex("skills")),
    swell: eventWeight(u, e0, e0 + 2),
    crest: [0, 1, 2].map((k) => textOpacity(u, e0 + k)) as [number, number, number],
    crestBuild: [0, 1, 2].map((k) =>
      smooth(ramp(u, WINDOWS[e0 + k].start, WINDOWS[e0 + k].arrive - 0.15)),
    ) as [number, number, number],
    islands: ISLANDS.map((_, k) => isleRise(u, k)),
    isleSea: eventWeight(u, beatIndex("projects"), beatIndex("projects")),
    calm: eventWeight(u, beatIndex("education"), beatIndex("whirlpool")),
    whirl: eventWeight(u, beatIndex("whirlpool"), beatIndex("whirlpool"), true),
    // Back to 0 while it's black, so from above the whirlpool is lit like the rest of the sea.
    dive: smooth(ramp(u, dw.start, dw.arrive)) * (1 - smooth(ramp(u, cw.start, cw.start + ct * 0.25))),
    blackout: smooth(ramp(u, dw.start + dt * 0.8, dw.arrive - dt * 0.02)) * (1 - lift),
    deep: smooth(ramp(u, cw.start + ct * 0.1, cw.start + ct * 0.25)),
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

/** Island k's rise: one after another across the Projects stop, all sinking together on the way out. */
export function isleRise(u: number, k: number): number {
  const pj = beatIndex("projects");
  const w = WINDOWS[pj];
  const t0 = w.arrive - 0.35 + k * 0.62;
  const rise = smooth(ramp(u, t0, t0 + 0.55));
  return u > w.leave ? Math.min(rise, eventWeight(u, pj, pj)) : rise;
}

/** Opacity of a beat's text at u: in as the camera settles, out as it leaves. */
export function textOpacity(u: number, i: number): number {
  const w = WINDOWS[i];
  if (i === 0) return 1 - smooth(ramp(u, w.leave, w.leave + 0.35));
  const fin = smooth(ramp(u, w.arrive - 0.3, w.arrive - 0.02));
  if (i === BEATS.length - 1) return fin;
  return fin * (1 - smooth(ramp(u, w.leave + 0.02, w.leave + 0.3)));
}
