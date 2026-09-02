"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { normalizePathname } from "@/lib/utils";
import { AsciiFieldEngine } from "./engine";
import { asciiFieldStore } from "./store";
import { DEFAULT_CONFIG, type AsciiFieldConfig } from "./config";
import { PRESETS, MOBILE_OVERRIDES, type FieldParams, type PresetName } from "./presets";

type Props = {
  /** Which preset to run (see presets.ts). Overrides `routePresets` when set. */
  preset?: PresetName;
  /**
   * Route → preset map (longest matching prefix wins). Lets the same canvas persist
   * across pages while the field morphs per route; navigation fires a shockwave.
   */
  routePresets?: Record<string, PresetName>;
  /**
   * CSS selector for elements that must stay readable; the clouds dim to near-black
   * behind each one (with a soft edge). An element may set `data-ascii-quiet="0.5"`
   * to dim only partially (e.g. behind a frosted panel). Re-measured on scroll/resize.
   */
  quietZoneSelector?: string;
  /** Optional config overrides (character sets, density, speed, pointer, colours…). */
  config?: Partial<AsciiFieldConfig>;
  /** "auto" = WebGL2 when available, else Canvas 2D. */
  backend?: "auto" | "canvas2d";
  className?: string;
};

function readVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Resolve the mono font family from the Next.js font CSS variable. */
function resolveMonoFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
  const base = "ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace";
  return v ? `${v}, ${base}` : base;
}

// While the homepage intro overlay is up, HomeShell sets `data-intro-active` on
// <body>; globals.css hides the field canvas for that window and fades it back in
// for the overview. Keeping "/" in the map means the field never unmounts when
// navigating between routes.
const DEFAULT_ROUTE_PRESETS: Record<string, PresetName> = {
  "/": "hero",
  "/projects": "hero", // same field as home: the projects transition never touches the background
  "/resume": "resume",
};

function presetForPath(path: string, map: Record<string, PresetName>): PresetName | null {
  let best = "";
  for (const key of Object.keys(map)) {
    const match = key === "/" ? path === "/" : path === key || path.startsWith(key + "/");
    if (match && key.length > best.length) best = key;
  }
  return best ? map[best] : null;
}

export default function AsciiBackground({
  preset,
  routePresets = DEFAULT_ROUTE_PRESETS,
  quietZoneSelector,
  config,
  backend = "auto",
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLCanvasElement>(null);
  const pathname = normalizePathname(usePathname());
  const routePreset = presetForPath(pathname, routePresets);
  // Routes outside the map (e.g. legal pages with opaque backgrounds) get no canvas at all.
  const active = preset !== undefined || routePreset !== null;
  const activePreset: PresetName = preset ?? routePreset ?? "calm";
  const presetRef = useRef(activePreset);
  presetRef.current = activePreset;
  const engineRef = useRef<AsciiFieldEngine | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Route change: morph to the route's preset and fire a shockwave from the click point.
  const mountedPath = useRef<string | null>(null);
  useEffect(() => {
    const engine = engineRef.current;
    if (mountedPath.current === null) {
      mountedPath.current = pathname;
      return;
    }
    if (mountedPath.current === pathname) return;
    mountedPath.current = pathname;
    if (!engine || !active) return;
    const base = PRESETS[activePreset];
    const ov = window.innerWidth < (config?.mobile?.breakpoint ?? DEFAULT_CONFIG.mobile.breakpoint)
      ? MOBILE_OVERRIDES[activePreset]
      : undefined;
    engine.setParams(ov ? { ...base, ...ov } : base);
    engine.setScroll(window.scrollY);
    const toSection = /^#(about|experience|projects|skills|education|resume|contact)$/.test(window.location.hash);
    if (!(window as unknown as { __asciiTransition?: boolean }).__asciiTransition && !toSection) {
      // Plain navigation (back/forward, direct link): a simple shockwave from the last click.
      // Section tabs (/#experience …) get no shockwave: the field should stay calm under the load-in.
      const p = lastPointer.current ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
      engine.pulse(p.x, p.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    // Only one instance drives the field (see store.ts). Extra instances stay inert.
    let evicted = false;
    let teardown: (() => void) | null = null;
    const inst = {
      primary: preset === undefined,
      evict: () => {
        evicted = true;
        teardown?.();
      },
    };
    if (!asciiFieldStore.claim(inst)) return;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileBreakpoint = config?.mobile?.breakpoint ?? DEFAULT_CONFIG.mobile.breakpoint;

    let engine: AsciiFieldEngine | null = null;
    let disposed = false;
    let innerScroll = 0;

    const resolveParams = (): FieldParams => {
      const name = presetRef.current;
      const base = PRESETS[name];
      const ov = window.innerWidth < mobileBreakpoint ? MOBILE_OVERRIDES[name] : undefined;
      return ov ? { ...base, ...ov } : base;
    };

    const measureQuiet = () => {
      if (!engine) return;
      if (!quietZoneSelector) {
        engine.setQuietRects([]);
        return;
      }
      const rects: number[] = [];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(quietZoneSelector).forEach((el) => {
        // Skip elements that are currently faded out (e.g. inactive scroll-story chapters).
        // Skip anything faded out or hidden (e.g. the homepage intro overlay while it is
        // being skipped) — otherwise its text blocks darken the field for no reason.
        if (
          typeof el.checkVisibility === "function" &&
          !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })
        )
          return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.bottom < -200 || r.top > vh + 200 || r.right < -200 || r.left > vw + 200) return;
        // data-ascii-quiet="0.5" → dim only half as much behind this element (e.g. frosted panels)
        const strength = parseFloat(el.dataset.asciiQuiet ?? "");
        rects.push(r.left, r.top, r.right, r.bottom, Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 1);
      });
      engine.setQuietRects(rects);
    };

    const applyColors = () => {
      if (!engine) return;
      const c = { ...DEFAULT_CONFIG.colors, ...config?.colors };
      engine.setColors(readVar(c.loVar, "#7a7a7a"), readVar(c.hiVar, "#ffffff"));
      engine.setGain(parseFloat(readVar("--ascii-gain", "1")));
      engine.setBackdropColor(readVar("--background", "#050505"));
    };

    const pushScroll = () => {
      engine?.setScroll(window.scrollY + innerScroll);
      measureQuiet(); // text blocks move with scroll (sticky intro, inner panel)
    };

    const init = () => {
      if (disposed) return;
      engine = new AsciiFieldEngine(canvas, {
        config,
        fontFamily: resolveMonoFamily(),
        staticMode: reduceMq.matches,
        forceCanvas2D: backend === "canvas2d",
      });
      engineRef.current = engine;
      engine.attachBackdrop(backdropRef.current, readVar("--background", "#050505"));
      asciiFieldStore.set(engine, canvas, backdropRef.current);
      // Live handle for tuning from the console, e.g.
      //   __asciiField.setParams({ ...__asciiField.target, threshold: 0.6 })
      (window as unknown as { __asciiField?: AsciiFieldEngine }).__asciiField = engine;
      if (process.env.NODE_ENV !== "production") {
        // Dev convenience: tune live from the console, e.g.
        //   __asciiField.setParams({ ...__asciiField.target, waveAmp: 60 })
        (window as unknown as { __asciiField?: AsciiFieldEngine }).__asciiField = engine;
      }
      applyColors();
      measureQuiet();
      pushScroll();
      engine.setParamsImmediate(resolveParams());
      engine.start();

      // Once the webfont is actually available, rebuild the atlas with it.
      document.fonts
        ?.load(`13px ${resolveMonoFamily()}`)
        .then(() => {
          if (!disposed && engine) engine.setFontFamily(resolveMonoFamily());
        })
        .catch(() => {});
    };

    // ── scroll (window + the homepage's inner scroll panel) ──
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        pushScroll();
      });
    };
    const onInnerScroll = (e: Event) => {
      innerScroll = (e as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
      onScroll();
    };

    // ── resize ──
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!engine) return;
        engine.resize();
        measureQuiet();
        engine.setParams(resolveParams());
      }, 80);
    };
    const bodyObserver = new ResizeObserver(() => measureQuiet());
    bodyObserver.observe(document.body);
    // Safety net: layout can settle after mount (fade-in animations, fonts, data) without
    // a scroll/resize, so re-measure the readability rects at a low cadence.
    const remeasureTimer = window.setInterval(measureQuiet, 600);
    let domRaf = 0;
    const domObserver = new MutationObserver(() => {
      if (domRaf) return;
      domRaf = requestAnimationFrame(() => {
        domRaf = 0;
        measureQuiet();
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-intro-active", "style", "class"] });

    // ── pointer ──
    const onPointerMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
      engine?.setPointer(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerLeave = () => engine?.clearPointer();

    // ── theme changes (html.dark / html.light) ──
    const themeObserver = new MutationObserver(applyColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // ── scene tuning (multi-scene intro overrides the current preset) ──
    const onTune = (e: Event) => {
      if (!engine) return;
      const detail = (e as CustomEvent<Partial<FieldParams>>).detail;
      if (!detail) return;
      engine.setParams({ ...resolveParams(), ...detail });
    };
    const onResetTune = () => {
      engine?.setParams(resolveParams());
    };
    // Snap straight to a route's preset (no easing). Page transitions use this while
    // the screen is covered, so the field is already "there" when it is revealed.
    const onSnap = (e: Event) => {
      if (!engine) return;
      const path = (e as CustomEvent<{ path?: string }>).detail?.path;
      const name = path ? presetForPath(path, routePresets) : null;
      if (!name) return;
      const base = PRESETS[name];
      const ov = window.innerWidth < mobileBreakpoint ? MOBILE_OVERRIDES[name] : undefined;
      engine.setParamsImmediate(ov ? { ...base, ...ov } : base);
    };
    window.addEventListener("ascii-field:tune", onTune);
    window.addEventListener("ascii-field:reset", onResetTune);
    window.addEventListener("ascii-field:snap", onSnap);

    // ── tab visibility ──
    const onVisibility = () => {
      if (!engine) return;
      if (document.hidden) engine.stop();
      else engine.start();
    };

    // ── reduced-motion preference toggled live ──
    const onReduceChange = () => {
      engine?.destroy();
      engine = null;
      init();
    };

    init();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("portfolio-scroll", onInnerScroll);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMq.addEventListener("change", onReduceChange);

    teardown = () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      window.clearInterval(remeasureTimer);
      domObserver.disconnect();
      if (domRaf) cancelAnimationFrame(domRaf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("portfolio-scroll", onInnerScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMq.removeEventListener("change", onReduceChange);
      window.removeEventListener("ascii-field:tune", onTune);
      window.removeEventListener("ascii-field:reset", onResetTune);
      window.removeEventListener("ascii-field:snap", onSnap);
      bodyObserver.disconnect();
      themeObserver.disconnect();
      engine?.destroy();
      engine = null;
      engineRef.current = null;
      if (!evicted) asciiFieldStore.set(null, null);
    };

    return () => {
      teardown?.();
      asciiFieldStore.release(inst);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Opaque backdrop for page transitions (lifted with the field canvas; otherwise empty) */}
      <canvas ref={backdropRef} aria-hidden className="ascii-field-canvas pointer-events-none fixed inset-0 z-0 h-full w-full" />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`ascii-field-canvas pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`}
      />
    </>
  );
}
