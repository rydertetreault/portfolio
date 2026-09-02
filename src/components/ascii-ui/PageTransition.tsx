"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { asciiFieldStore } from "@/components/ascii-field/store";
import { corruptText, wipeText, decodePage } from "./corrupt";
import "./terminal.css";

/**
 * ─────────────────────────────────────────────────────────────
 *  Page transitions driven by the ASCII field.
 *
 *  Intercepts internal link clicks and choreographs:
 *
 *  cloud (Projects, Home, default)
 *    NORMAL → CORRUPTION (~150 ms: page text garbles, field tears)
 *           → CLOUD SURGE (~300 ms: a dense cloud front sweeps across)
 *           → FULL COVER (~100 ms: screen buried in @@%%## — route swaps here)
 *           → REVEAL (~300 ms: the front sweeps on, uncovering the new page)
 *
 *  terminal (Resume)
 *    NORMAL → COLLAPSE (~350 ms: CRT-style, page + field squash to a line)
 *           → TERMINAL (a command types and "executes": loads the page)
 *           → EXPAND (~300 ms: the line opens back up onto the new page)
 *
 *  Reduced motion → plain navigation.
 * ─────────────────────────────────────────────────────────────
 */

type Kind = "cloud" | "terminal";

/** Only the two tabs get choreography; other internal links navigate normally. */
function kindFor(path: string): Kind | null {
  if (path === "/resume" || path.startsWith("/resume/")) return "terminal";
  if (path === "/projects") return "cloud";
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const TERMINAL_SCRIPT = (href: string) => ({
  command: `ryder --open ${href.replace(/^\//, "")}`,
  lines: [
    ["resolving profile", "", "ok"],
    ["loading sections", "[5/5]", "ok"],
    ["rendering", href, "ok"],
  ] as [string, string, string][],
});

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const busy = useRef(false);
  const pathWaiters = useRef<{ target: string; resolve: () => void }[]>([]);

  const [term, setTerm] = useState<{
    open: boolean;
    closing: boolean;
    typed: string;
    lines: [string, string, string][];
    done: boolean;
  } | null>(null);

  // Resolve navigation waiters when the route actually changes.
  useEffect(() => {
    pathWaiters.current = pathWaiters.current.filter((w) => {
      if (w.target === pathname) {
        w.resolve();
        return false;
      }
      return true;
    });
  }, [pathname]);

  const waitForPath = useCallback(
    (target: string) =>
      new Promise<void>((resolve) => {
        if (target === pathname) return resolve();
        const timeout = window.setTimeout(resolve, 4000);
        pathWaiters.current.push({
          target,
          resolve: () => {
            clearTimeout(timeout);
            resolve();
          },
        });
      }),
    [pathname],
  );

  const runCloud = useCallback(
    async (href: string, clickX: number) => {
      const engine = asciiFieldStore.get();
      if (!engine) {
        router.push(href);
        return;
      }
      const dir: 1 | -1 = clickX < window.innerWidth / 2 ? 1 : -1;
      const roots = [document.querySelector("main"), document.querySelector("nav")].filter(Boolean) as Element[];

      // 1. CORRUPTION (~450 ms): the page's text degrades into symbols (ramping up).
      //    The field is left untouched throughout: no row-tear, no shockwave.
      await corruptText(roots, 450, 0.55, false, true);

      // 2. TEXT SURGE + WIPE (~700 ms): a front sweeps across; characters surge into
      //    dense symbols and are blanked behind it. The background field is untouched.
      const wipe = wipeText(roots, 700, dir);
      router.prefetch(href);
      await wipe.done;

      // 3. SWAP: navigate under a hidden state so the new page never flashes clean.
      document.documentElement.classList.add("ascii-arriving");
      const arrived = waitForPath(href);
      router.push(href);
      await arrived;
      // The route can resolve to its loading boundary first (async data); wait for the
      // real page (marked data-ascii-decode) so we decode the actual content.
      const main = await new Promise<Element | null>((resolve) => {
        const t0 = performance.now();
        const poll = () => {
          const el = document.querySelector("main[data-ascii-decode]");
          if (el || performance.now() - t0 > 4000) resolve(el ?? document.querySelector("main"));
          else requestAnimationFrame(poll);
        };
        poll();
      });
      await new Promise(requestAnimationFrame);
      window.scrollTo(0, 0);
      // The nav persists across routes: put its real text back before decoding it
      // together with the new page (the old page's nodes are detached by now).
      wipe.restore();

      // 4. DECODE (~1.8 s): the new page (and the nav) start as garbage and slowly
      //    resolve into the projects text.
      const nav = document.querySelector("nav");
      if (main) {
        const decoding = decodePage([main, nav].filter(Boolean) as Element[], 1800); // first garbled frame is synchronous
        document.documentElement.classList.remove("ascii-arriving");
        await decoding;
      } else {
        document.documentElement.classList.remove("ascii-arriving");
      }
    },
    [router, waitForPath],
  );

  const runTerminal = useCallback(
    async (href: string) => {
      const engine = asciiFieldStore.get();
      if (!engine) {
        router.push(href);
        return;
      }
      const main = document.querySelector("main") as HTMLElement | null;

      // 1. COLLAPSE — page squashes to a line with the field.
      asciiFieldStore.setLayer("front");
      if (main) {
        main.style.transformOrigin = "50% 50%";
        main.style.transition = "transform 340ms cubic-bezier(.7,0,.3,1), filter 340ms ease, opacity 340ms ease";
        main.style.transform = "scaleY(0.004) scaleX(1.04)";
        main.style.filter = "brightness(2.5)";
        main.style.opacity = "0.9";
      }
      await engine.startFx("collapse", 360);
      // Screen is black now: switch the field to the resume look instantly, so there is
      // no morph after the terminal opens onto the page.
      window.dispatchEvent(new CustomEvent("ascii-field:snap", { detail: { path: href } }));

      // 2. TERMINAL — type the command, "execute" it (route loads underneath).
      const script = TERMINAL_SCRIPT(href);
      setTerm({ open: true, closing: false, typed: "", lines: [], done: false });
      await sleep(80);
      for (let i = 1; i <= script.command.length; i++) {
        setTerm((t) => (t ? { ...t, typed: script.command.slice(0, i) } : t));
        await sleep(script.command[i - 1] === " " ? 40 : 14 + Math.random() * 22);
      }
      await sleep(120);
      router.push(href);
      const navDone = waitForPath(href);
      for (const line of script.lines) {
        setTerm((t) => (t ? { ...t, lines: [...t.lines, line] } : t));
        await sleep(130);
      }
      await navDone;
      await new Promise(requestAnimationFrame);
      window.scrollTo(0, 0);
      setTerm((t) => (t ? { ...t, done: true } : t));
      await sleep(180);

      // 3. EXPAND — terminal opens from the centre line onto the new page.
      setTerm((t) => (t ? { ...t, closing: true } : t));
      await engine.startFx("expand", 320);
      await sleep(60);
      setTerm(null);
      asciiFieldStore.setLayer("back");
    },
    [router, waitForPath],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const href = url.pathname.replace(/\/+$/, "") || "/";
      if (href === location.pathname.replace(/\/+$/, "")) return;
      const kind = kindFor(href);
      if (!kind) return;
      if (reduce.matches || busy.current || !asciiFieldStore.get()) return;

      e.preventDefault();
      e.stopPropagation();
      busy.current = true;
      (window as unknown as { __asciiTransition?: boolean }).__asciiTransition = true;
      const run = kind === "terminal" ? runTerminal(href) : runCloud(href, e.clientX);
      run
        .catch(() => router.push(href))
        .finally(() => {
          document.documentElement.classList.remove("ascii-arriving");
          busy.current = false;
          (window as unknown as { __asciiTransition?: boolean }).__asciiTransition = false;
          asciiFieldStore.get()?.resetFx();
          asciiFieldStore.setLayer("back");
          // Pages that print/animate their own entrance wait for this.
          window.dispatchEvent(new Event("ascii-transition:done"));
        });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, runCloud, runTerminal]);

  if (!term) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-background"
      style={{
        clipPath: term.closing ? "inset(50% 0 50% 0)" : "inset(0 0 0 0)",
        transition: term.closing ? "clip-path 320ms cubic-bezier(.2,.8,.2,1)" : "none",
      }}
    >
      <div className="term-window mx-6 w-full max-w-2xl font-mono text-[12px]">
        <div className="term-bar">
          <div className="term-dots" aria-hidden>
            <span /><span /><span />
          </div>
          <div className="term-tab">
            <span className="text-accent">$</span>
            <span>bash</span>
            <span className="text-text-faint">— ryder@dev: ~</span>
          </div>
          <span className="ml-auto hidden text-text-faint sm:inline">{term.done ? "exit 0" : "running"}</span>
        </div>

        <div className="min-h-[13rem] px-5 py-5 text-[13px] leading-7 text-text-muted sm:px-7">
          <p>
            <span className="text-accent">$</span> <span className="text-foreground">{term.typed}</span>
            {!term.done && term.lines.length === 0 && (
              <span className="ml-0.5 inline-block h-3.5 w-[8px] translate-y-[2px] bg-accent/90 animate-caret" />
            )}
          </p>
          {term.lines.map(([label, arg, status], i) => (
            <p key={i}>
              <span className="text-text-faint">{">"}</span> {label}{" "}
              <span className="text-foreground">{arg}</span>
              <span className="text-text-faint"> {".".repeat(Math.max(2, 28 - label.length - arg.length))} </span>
              <span className="text-accent">{status}</span>
            </p>
          ))}
          {term.done && (
            <p>
              <span className="text-accent">$</span>
              <span className="ml-2 inline-block h-3.5 w-[8px] translate-y-[2px] bg-accent/90 animate-caret" />
            </p>
          )}
        </div>

        <div className="term-status text-[11px] uppercase tracking-[0.18em]">
          <span>
            <span className="text-accent">●</span> {term.done ? "done" : "loading"}
          </span>
          <span>{term.lines.length} / 3 steps</span>
          <span className="ml-auto normal-case tracking-normal">{term.typed || "\u00a0"}</span>
        </div>
      </div>
    </div>
  );
}
