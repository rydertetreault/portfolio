"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Types its `[data-line]` descendants out character by character like terminal
 * output. A block cursor rides the character being written. The total budget is
 * time-based (`durationMs`), so the typing rate adapts to how much text there is.
 *
 * A line marked `data-progress` acts as a live progress readout: its
 * `[data-progress-dots]` fill in as the transcript prints and
 * `[data-progress-ok]` appears when everything is done.
 *
 * If a page transition is in progress the printing waits for it to finish (so the
 * text appears after the screen has opened), otherwise it starts on mount.
 * Reduced motion → everything is simply shown.
 */
export default function TerminalPrint({
  children,
  charsPerSecond = 420,
  linePauseMs = 70,
  typeLines = Infinity,
  streamLinesPerSecond = 40,
  maxDurationMs,
  follow = true,
  className = "",
}: {
  children: ReactNode;
  /** hard cap on the whole load: speeds are scaled up as needed to finish in time */
  maxDurationMs?: number;
  /** typing speed (characters per second) */
  charsPerSecond?: number;
  /** pause at the end of every line, like a terminal drawing breath */
  linePauseMs?: number;
  /** only the first N lines are typed character by character… */
  typeLines?: number;
  /** …the rest stream in whole, this many lines per second (like a file loading) */
  streamLinesPerSecond?: number;
  /** keep the line being typed in view (until the user scrolls themselves) */
  follow?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
    if (lines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Collect every text node per line (in document order) and blank them.
    type L = { el: HTMLElement; nodes: { node: Text; text: string }[]; chars: number; progress: boolean };
    const plan: L[] = lines.map((el) => {
      const nodes: { node: Text; text: string }[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = (n as Text).data;
        if (t.length) nodes.push({ node: n as Text, text: t });
      }
      const progress = el.hasAttribute("data-progress");
      return { el, nodes, chars: nodes.reduce((s, x) => s + x.text.length, 0), progress };
    });
    const total = plan.reduce((s, l) => s + (l.progress ? 0 : l.chars), 0);
    const progressLine = plan.find((l) => l.progress);
    const dotsEl = progressLine?.el.querySelector<HTMLElement>("[data-progress-dots]") ?? null;
    const okEl = progressLine?.el.querySelector<HTMLElement>("[data-progress-ok]") ?? null;
    const dotsFull = dotsEl?.textContent ?? "";
    const okText = okEl?.textContent ?? "";

    const hideAll = () => {
      for (const l of plan) {
        l.el.style.visibility = "hidden";
        for (const x of l.nodes) x.node.data = "";
      }
      if (okEl) okEl.textContent = "";
    };
    const showAll = () => {
      for (const l of plan) {
        l.el.style.visibility = "";
        l.el.classList.remove("tp-cursor");
        for (const x of l.nodes) x.node.data = x.text;
      }
      if (okEl) okEl.textContent = okText;
    };
    hideAll();

    let cancelled = false;
    let raf = 0;
    const timers: number[] = [];

    // The user takes over scrolling as soon as they scroll/touch/key; then we stop following.
    let userScrolled = false;
    const onUser = () => {
      userScrolled = true;
    };
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("keydown", onUser);

    const type = () => {
      if (cancelled) return;
      // Effective speeds. With a hard cap, the typed header gets ~35% of the budget
      // and the streamed remainder is paced to land exactly on the deadline.
      let rate = charsPerSecond;
      let pause = linePauseMs;
      let lps = streamLinesPerSecond;
      if (maxDurationMs && maxDurationMs > 0) {
        const typed = plan.slice(0, typeLines);
        const typedChars = typed.reduce((n, l) => n + (l.progress ? 0 : l.chars), 0);
        const typedBudget = maxDurationMs * 0.35;
        const natural = (typedChars / rate) * 1000 + typed.length * pause;
        if (natural > typedBudget) {
          const k = natural / typedBudget;
          rate *= k;
          pause /= k;
        }
        const remaining = plan.length - typed.length;
        const streamBudget = maxDurationMs - Math.min(natural, typedBudget);
        if (remaining > 0 && streamBudget > 0) lps = Math.max(lps, remaining / (streamBudget / 1000));
      }
      const t0 = performance.now();
      let li = 0; // current line
      let written = 0; // chars written in the current line
      let printedTotal = 0;
      let pauseUntil = 0; // end-of-line pause
      let lastFollow = 0;
      let streamStart = 0; // when the streaming phase began
      let streamed = 0; // lines streamed so far
      const step = (now: number) => {
        if (cancelled) return;
        if (now < pauseUntil) {
          raf = requestAnimationFrame(step);
          return;
        }
        let budget = Math.max(1, Math.floor(((now - t0) / 1000) * rate) - printedTotal);
        if (li >= typeLines) budget = Number.POSITIVE_INFINITY; // streaming is line-paced, not char-paced
        // Advance through lines, spending the character budget.
        while (budget > 0 && li < plan.length) {
          const l = plan[li];
          if (l.el.style.visibility === "hidden") {
            l.el.style.visibility = "";
            plan[li - 1]?.el.classList.remove("tp-cursor");
            l.el.classList.add("tp-cursor");
          }
          // Streaming phase: whole lines land at a fixed cadence (several per frame if needed).
          if (li >= typeLines) {
            if (!streamStart) streamStart = now;
            const due = Math.floor(((now - streamStart) / 1000) * lps) + 1;
            if (streamed >= due) break; // next line isn't due yet
            for (const x of l.nodes) x.node.data = x.text;
            streamed++;
            li++;
            written = 0;
            continue;
          }
          if (l.progress) {
            // Progress line: type its label instantly (dots/ok are driven below), move on.
            for (const x of l.nodes) x.node.data = x.text;
            if (dotsEl) dotsEl.textContent = "";
            li++;
            written = 0;
            continue;
          }
          if (l.chars === 0) {
            li++;
            continue;
          }
          // Write `take` more characters of this line across its text nodes.
          const take = Math.min(budget, l.chars - written);
          let target = written + take;
          for (const x of l.nodes) {
            const len = x.text.length;
            if (target <= 0) break;
            const show = Math.min(len, target);
            if (x.node.data.length !== show) x.node.data = x.text.slice(0, show);
            target -= len;
          }
          written += take;
          printedTotal += take;
          budget -= take;
          if (written >= l.chars) {
            li++;
            written = 0;
            // Breathe at the end of the line (and don't let the pause "owe" characters).
            if (pause > 0) {
              pauseUntil = now + pause;
              printedTotal = Math.floor(((now + pause - t0) / 1000) * rate);
              break;
            }
          }
        }
        // Follow the cursor line like a terminal would, unless the user has taken over.
        if (follow && !userScrolled && now - lastFollow > 120) {
          const cur = plan[Math.min(li, plan.length - 1)]?.el;
          if (cur) {
            const r = cur.getBoundingClientRect();
            const bottomGap = window.innerHeight * 0.28;
            if (r.bottom > window.innerHeight - bottomGap) {
              window.scrollBy({ top: r.bottom - (window.innerHeight - bottomGap), behavior: "instant" });
            }
          }
          lastFollow = now;
        }
        // Live progress readout.
        if (dotsEl) {
          const p = total ? Math.min(1, printedTotal / total) : 1;
          dotsEl.textContent = dotsFull.slice(0, Math.round(p * dotsFull.length));
        }
        if (li < plan.length) {
          raf = requestAnimationFrame(step);
        } else {
          if (dotsEl) dotsEl.textContent = dotsFull;
          if (okEl) okEl.textContent = okText;
          root.classList.remove("tp-typing");
          timers.push(window.setTimeout(() => plan[plan.length - 1]?.el.classList.remove("tp-cursor"), 300));
          // Finished: return to the top of the page (unless the user took over scrolling).
          if (follow && !userScrolled) {
            timers.push(window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 350));
          }
        }
      };
      raf = requestAnimationFrame(step);
    };

    // Click anywhere on the transcript to finish instantly.
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      showAll();
      root.classList.remove("tp-typing");
    };
    root.classList.add("tp-typing");
    root.addEventListener("click", finish);
    window.addEventListener("tp:finish", finish);

    const w = window as unknown as { __asciiTransition?: boolean };
    let started = false;
    const onDone = () => {
      if (started) return;
      started = true;
      window.removeEventListener("ascii-transition:done", onDone);
      type();
    };
    if (w.__asciiTransition) {
      window.addEventListener("ascii-transition:done", onDone);
      timers.push(window.setTimeout(onDone, 6000)); // never leave the page blank
    } else {
      timers.push(window.setTimeout(onDone, 60)); // direct load: after first paint
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("ascii-transition:done", onDone);
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("keydown", onUser);
      root.removeEventListener("click", finish);
      window.removeEventListener("tp:finish", finish);
      root.classList.remove("tp-typing");
      showAll();
    };
  }, [charsPerSecond, linePauseMs, typeLines, streamLinesPerSecond, maxDurationMs, follow]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
