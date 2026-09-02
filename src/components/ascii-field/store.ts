/**
 * Tiny singleton so page-transition choreography can reach the live engine
 * (and its canvas) without prop drilling. Set by <AsciiBackground>, read by
 * <PageTransition>.
 */
import type { AsciiFieldEngine } from "./engine";

let engine: AsciiFieldEngine | null = null;
let canvas: HTMLCanvasElement | null = null;
let backdrop: HTMLCanvasElement | null = null;

/**
 * Ownership: only one <AsciiBackground> may drive the field. The layout-level
 * instance (route-driven, no explicit `preset`) is "primary" and evicts any
 * page-level instance, so the canvas that persists across routes always wins.
 */
export type FieldOwner = { primary: boolean; evict: () => void };
let owner: FieldOwner | null = null;

export const asciiFieldStore = {
  set(e: AsciiFieldEngine | null, c: HTMLCanvasElement | null, b: HTMLCanvasElement | null = null): void {
    engine = e;
    canvas = c;
    backdrop = b;
  },
  get(): AsciiFieldEngine | null {
    return engine;
  },
  claim(inst: FieldOwner): boolean {
    if (owner === inst) return true;
    if (!owner) {
      owner = inst;
      return true;
    }
    if (inst.primary && !owner.primary) {
      const prev = owner;
      owner = inst;
      prev.evict();
      return true;
    }
    return false;
  },
  release(inst: FieldOwner): void {
    if (owner === inst) owner = null;
  },
  /** Lift the canvas above the page (for full-cover transitions) or drop it back behind. */
  setLayer(layer: "front" | "back"): void {
    if (canvas) canvas.style.zIndex = layer === "front" ? "70" : "";
    if (backdrop) backdrop.style.zIndex = layer === "front" ? "69" : "";
  },
};
