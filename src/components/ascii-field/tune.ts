import type { FieldParams } from "./presets";

/**
 * Temporarily override the ASCII field's parameters. Values not provided
 * fall back to the currently active preset. AsciiBackground eases toward
 * the new target, so morphs are smooth.
 *
 * Called by multi-scene intros to reshape the background per scene.
 */
export function tuneAsciiField(params: Partial<FieldParams>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ascii-field:tune", { detail: params }));
}

/** Reset the field back to its resolved preset (undo any tune). */
export function resetAsciiField(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ascii-field:reset"));
}
