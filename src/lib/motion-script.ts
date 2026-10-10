/**
 * Server-safe constants for the no-motion preference (no React imports, so the
 * root layout can inline the pre-paint script). See ./motion.ts.
 */
export const MOTION_STORAGE_KEY = "motion";
export const REDUCE_MOTION_CLASS = "reduce-motion";

/** Inline (pre-paint) script body; keep in sync with `effectiveReduce()` in motion.ts. */
export const MOTION_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${MOTION_STORAGE_KEY}");if(m==="reduce"||(m!=="full"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)){document.documentElement.classList.add("${REDUCE_MOTION_CLASS}")}}catch(e){}})()`;
