/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: the chart (map view) layout
 *
 *  The map is carved into one territory per section of the site
 *  (00 Origin … 07 The Deep), and each territory is pieced
 *  together from its sub-details: one plot per company in The
 *  Swell, per project in Waypoints, per item in The Current, per
 *  credential in The Harbor. Plots are the cells of a (warped)
 *  Voronoi diagram over the sites below, so neighbouring plots
 *  share borders like a real chart. The shader draws the water,
 *  the coastlines and the borders; hud.tsx labels the plots.
 *
 *  Sites sit where the journey actually visits that content, so
 *  the dashed flight path threads through the territories in order.
 * ─────────────────────────────────────────────────────────────
 */

import { BEACONS } from "./world";
import type { StopId } from "./journey";

export type ChartSection = {
  stop: StopId;
  /** Palette index (1–3 lime family, 4–5 warm). */
  color: number;
  /** Small caption under the section name on the chart. */
  caption: string;
};

/** In stop order; the map stop itself has no territory. */
export const CHART_SECTIONS: ChartSection[] = [
  { stop: "origin", color: 2, caption: "Start" },
  { stop: "surface", color: 3, caption: "About" },
  { stop: "swell", color: 4, caption: "Experience" },
  { stop: "waypoints", color: 1, caption: "Projects" },
  { stop: "current", color: 2, caption: "Now" },
  { stop: "harbor", color: 5, caption: "Education" },
  { stop: "deep", color: 3, caption: "Contact" },
];

export type ChartSite = {
  /** Section (index into CHART_SECTIONS via stop). */
  stop: StopId;
  /** Beat the plot jumps to when selected. */
  beat: string;
  /** Which sub-detail of the section this plot is (company / project / item index). */
  sub: number;
  pos: [number, number];
};

const beacon = (id: string): [number, number] => BEACONS.find((b) => b.id === id)!.pos;
const PROJ = ["p-glass", "p-cross", "p-terrace", "p-ping", "p-scan", "p-ice"];

export const CHART_SITES: ChartSite[] = [
  { stop: "origin", beat: "hero", sub: 0, pos: [1, 4] },
  { stop: "surface", beat: "about", sub: 0, pos: [5, -11] },
  { stop: "swell", beat: "exp-0", sub: 0, pos: [3, -26] },
  { stop: "swell", beat: "exp-1", sub: 1, pos: [11, -37] },
  { stop: "swell", beat: "exp-2", sub: 2, pos: [4, -48] },
  ...PROJ.map((id, i): ChartSite => ({ stop: "waypoints", beat: `proj-${i}`, sub: i, pos: beacon(id) })),
  { stop: "current", beat: "skills", sub: 0, pos: [-29, -4] },
  { stop: "current", beat: "skills", sub: 1, pos: [-21, -10] },
  { stop: "current", beat: "skills", sub: 2, pos: [-20, 0] },
  { stop: "harbor", beat: "education", sub: 0, pos: [-11, 12] },
  { stop: "harbor", beat: "education", sub: 1, pos: [-4, 21] },
  { stop: "deep", beat: "deep", sub: 0, pos: [-16, -38] },
];

/** A plot extends at most this far from its site (beyond it: open sea, past the coast). */
export const CHART_REACH = 10.5;

export const sectionIndex = (stop: StopId) => CHART_SECTIONS.findIndex((s) => s.stop === stop);

/** Centroid of a section's sites (where its name goes on the chart). */
export function sectionCenter(stop: StopId): [number, number] {
  const ss = CHART_SITES.filter((s) => s.stop === stop);
  const x = ss.reduce((a, s) => a + s.pos[0], 0) / ss.length;
  const z = ss.reduce((a, s) => a + s.pos[1], 0) / ss.length;
  return [x, z];
}
