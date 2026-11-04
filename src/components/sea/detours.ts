/**
 * ─────────────────────────────────────────────────────────────
 *  The Sea: detours (side trips off the journey)
 *
 *  Opening a project's dossier doesn't leave for another page: the
 *  camera peels off the scroll path to a cove beside that
 *  project's waypoint, a beam strikes the water there, and the
 *  dossier opens over the sea. Projects that aren't waypoints
 *  live in The Archive, a stretch of open water east of the swell.
 *  Closing flies the camera back to exactly where you left.
 * ─────────────────────────────────────────────────────────────
 */

import { P, PROJ_HEADINGS, aim } from "./journey";
import type { Shot } from "./timeline";
import { BEACONS } from "./world";

export type DetourTarget = { shot: Shot; focus: { x: number; z: number; color: number } };

const d2r = Math.PI / 180;

/** The archive: open water east of the swell, away from every stop. */
export const ARCHIVE_AT: [number, number] = [26, -58];

/** Dossier for waypoint k: a cove off to the side of its beacon (the camera looks away from the path). */
export function waypointDetour(k: number): DetourTarget {
  const b = BEACONS.find((x) => x.id === P[k])!;
  const h = PROJ_HEADINGS[k];
  // Perpendicular to the approach heading, 12 units out.
  const rx = Math.cos(h * d2r);
  const rz = Math.sin(h * d2r);
  const side = k % 2 ? -1 : 1;
  const cove: [number, number] = [b.pos[0] + rx * 12 * side, b.pos[1] + rz * 12 * side];
  const heading = h + 90 * side;
  return {
    shot: aim(cove, heading, 8.5, 2.7, { off: -17, pitch: -12, fov: 58, sway: 0.6 }),
    focus: { x: cove[0], z: cove[1], color: b.color },
  };
}

/** Dossier for an archive project (index into the archive list): neighbouring spots in the archive waters. */
export function archiveDetour(i: number): DetourTarget {
  const a = (i * 137.5) % 360;
  const r = 3 + (i % 4) * 1.6;
  const at: [number, number] = [ARCHIVE_AT[0] + Math.cos(a * d2r) * r, ARCHIVE_AT[1] + Math.sin(a * d2r) * r];
  return {
    shot: aim(at, 20 + (i % 3) * 14, 8.5, 2.9, { off: -17, pitch: -13, fov: 58, sway: 0.6 }),
    focus: { x: at[0], z: at[1], color: i % 2 ? 4 : 1 },
  };
}

/** The archive overview: a higher shot over the whole stretch of water. */
export function archiveOverview(): DetourTarget {
  return {
    shot: aim(ARCHIVE_AT, 30, 13, 6.5, { off: -16, pitch: -24, fov: 60, sway: 0.5 }),
    focus: { x: ARCHIVE_AT[0], z: ARCHIVE_AT[1], color: 4 },
  };
}
