/**
 * Route-level Suspense fallback. Intentionally empty: the persistent ASCII
 * field keeps animating underneath while a page's data resolves, so a
 * "Loading…" message would only flash between the section transitions.
 */
export default function Loading() {
  return <main className="min-h-screen" aria-busy="true" />;
}
