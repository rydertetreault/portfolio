/** How many ocean routes this tab has visited (a lightbox closes with Back when > 1). */
export const oceanNav = { depth: 0 };

/** World → screen (CSS px, plus depth) for the current frame; `frame` subscribers run after each camera update. */
export const oceanView = {
  project: null as null | ((p: [number, number, number]) => [number, number, number] | null),
  frame: new Set<() => void>(),
};
