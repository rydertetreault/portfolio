/** Jump the ocean to scroll position u (viewport heights) through a quick cut to black. */
export function jumpTo(u: number): void {
  window.dispatchEvent(new CustomEvent("ocean:jump", { detail: u }));
}
