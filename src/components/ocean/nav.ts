import type { Events } from "./route";

/** How many ocean routes this tab has visited (a lightbox closes with Back when > 1). */
export const oceanNav = { depth: 0 };

/** The ocean's camera for overlays placed in the world (set by OceanCanvas, ticked every frame). */
export const oceanView = {
  project: null as null | ((p: [number, number, number]) => [number, number, number] | null),
  /** The camera's world position this frame. */
  eye: null as null | (() => [number, number, number] | null),
  /** Request the water's live height at world points (x, z pairs); heights() returns the latest. */
  probe: null as null | ((xz: Float32Array | null) => void),
  heights: null as null | (() => Float32Array | null),
  /** This frame's events (swell strength etc.). */
  events: null as null | (() => Events | null),
  frame: new Set<() => void>(),
};
