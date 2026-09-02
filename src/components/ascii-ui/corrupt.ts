/**
 * Text corruption + element "load-in" effects shared by page transitions and
 * section deep links. All DOM mutations are restored afterwards, so React-owned
 * nodes are left exactly as they were.
 */

const GARBLE = "#%&@=+*_~<>/\\|?0123";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Corruption cadence: how often the garble updates, and how much of it re-rolls per tick.
 *  Slow + sticky reads as creeping corruption; fast re-rolls read as a buzz. */
const TICK_MS = 110;
const REROLL = 0.35;
const isGarble = (c: string) => GARBLE.includes(c);
const garble = () => GARBLE[Math.floor(Math.random() * GARBLE.length)];

function textNodes(roots: Element[], viewportOnly = true): { node: Text; orig: string }[] {
  const out: { node: Text; orig: string }[] = [];
  const vh = window.innerHeight;
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const t = n.textContent ?? "";
        if (!t.trim()) return NodeFilter.FILTER_REJECT;
        const el = n.parentElement;
        if (!el || el.closest("script,style,canvas,[data-no-corrupt]")) return NodeFilter.FILTER_REJECT;
        if (viewportOnly) {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh || r.width === 0) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n: Node | null;
    while ((n = walker.nextNode()) && out.length < 800) out.push({ node: n as Text, orig: (n as Text).data });
  }
  return out;
}

/**
 * Garble the text inside `roots` for `ms`, then restore.
 * `ratio` is the fraction of characters garbled; with `resolve` it decays to 0
 * over the window so the text "decodes" into place.
 */
export function corruptText(
  roots: Element | Element[],
  ms: number,
  ratio = 0.28,
  resolve = false,
  rampIn = false,
): Promise<void> {
  const list = (Array.isArray(roots) ? roots : [roots]).filter(Boolean);
  const nodes = textNodes(list, !resolve);
  if (nodes.length === 0) return sleep(ms);
  const t0 = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    const r = resolve ? ratio * (1 - p) * (1 - p) : rampIn ? ratio * (0.15 + 0.85 * p * p) : ratio;
    for (const { node, orig } of nodes) {
      const prev = node.data.length === orig.length ? node.data : orig;
      let out = "";
      for (let i = 0; i < orig.length; i++) {
        const c = orig[i];
        // Once resolving, characters lock in left → right.
        const locked = resolve && i / orig.length < p * 1.15;
        if (c === " " || c === "\n" || locked) {
          out += c;
          continue;
        }
        const wasGarbled = isGarble(prev[i]) && prev[i] !== c;
        if (wasGarbled) {
          // Sticky: mostly keep the current symbol; occasionally re-roll or heal.
          out += Math.random() < REROLL ? (Math.random() < r * 1.6 ? garble() : c) : prev[i];
        } else {
          out += Math.random() < r * REROLL ? garble() : c;
        }
      }
      node.data = out;
    }
  };
  tick();
  const iv = window.setInterval(tick, TICK_MS);
  return sleep(ms).then(() => {
    clearInterval(iv);
    for (const { node, orig } of nodes) node.data = orig;
  });
}

let activeReveal: { cancel: () => void } | null = null;

/**
 * Load a section in block by block: each block pops in staggered, decodes out of
 * corruption, and some of them glitch (CSS slice/jitter). Cancels any reveal in
 * progress. No-op under prefers-reduced-motion.
 */
export async function revealSection(
  section: Element,
  opts: { stagger?: number; corruptMs?: number; glitchChance?: number; maxBlocks?: number } = {},
): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { stagger = 80, corruptMs = 260, glitchChance = 0.22, maxBlocks = 12 } = opts;

  activeReveal?.cancel();

  // Blocks: the section's direct children, expanded one level for list/grid wrappers.
  const blocks: HTMLElement[] = [];
  for (const c of Array.from(section.children) as HTMLElement[]) {
    const kids = Array.from(c.children) as HTMLElement[];
    if (kids.length > 1 && kids.length <= 12 && !c.matches("h1,h2,h3,p,a,button")) blocks.push(...kids);
    else blocks.push(c);
    if (blocks.length >= maxBlocks) break;
  }
  if (blocks.length === 0) return;

  let cancelled = false;
  const timers: number[] = [];
  const restore = () => {
    for (const b of blocks) {
      b.style.removeProperty("opacity");
      b.style.removeProperty("transition");
      b.classList.remove("ascii-glitch");
    }
  };
  activeReveal = {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      restore();
    },
  };

  for (const b of blocks) {
    b.style.transition = "none";
    b.style.opacity = "0";
  }
  // Force the hidden state to apply before we start showing things.
  void section.getBoundingClientRect();

  await Promise.all(
    blocks.map(
      (b, i) =>
        new Promise<void>((done) => {
          const t = window.setTimeout(async () => {
            if (cancelled) return done();
            b.style.transition = "opacity 140ms ease-out";
            b.style.opacity = "1";
            if (Math.random() < glitchChance) {
              b.classList.add("ascii-glitch");
              window.setTimeout(() => b.classList.remove("ascii-glitch"), 300);
            }
            await corruptText(b, corruptMs, 0.5, true);
            done();
          }, i * stagger + (Math.random() * 40) | 0);
          timers.push(t);
        }),
    ),
  );
  if (!cancelled) restore();
  activeReveal = null;
}

const SURGE = "@#%&$8W";

/**
 * Wipe the page's text away with a moving front (the background is untouched):
 * characters ahead of the front keep corrupting, those inside the band surge into
 * dense symbols, and everything behind it is blanked. Element heights are locked
 * for the duration so the disappearing text doesn't reflow the layout.
 * Resolves when the front has passed the whole viewport; call `restore()` if the
 * page is not being replaced.
 */
export function wipeText(
  roots: Element | Element[],
  ms: number,
  dir: 1 | -1 = 1,
): { done: Promise<void>; restore: () => void } {
  const list = (Array.isArray(roots) ? roots : [roots]).filter(Boolean);
  const nodes = textNodes(list, true).map((n) => {
    const r = n.node.parentElement!.getBoundingClientRect();
    return { ...n, left: r.left, width: Math.max(1, r.width) };
  });
  // Lock heights of the text containers so blanking never shifts layout.
  const locked = new Map<HTMLElement, string[]>();
  for (const { node } of nodes) {
    const el = node.parentElement as HTMLElement | null;
    if (!el || locked.has(el)) continue;
    locked.set(el, [el.style.height, el.style.overflow]);
    el.style.height = `${el.getBoundingClientRect().height}px`;
    el.style.overflow = "hidden";
  }
  const restore = () => {
    for (const { node, orig } of nodes) node.data = orig;
    for (const [el, [h, o]] of locked) {
      el.style.height = h;
      el.style.overflow = o;
    }
  };

  const W = window.innerWidth;
  const band = W * 0.16;
  const t0 = performance.now();
  let iv = 0;
  const done = new Promise<void>((resolve) => {
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      const front = dir > 0 ? -band + p * (W + 2 * band) : W + band - p * (W + 2 * band);
      for (const { node, orig, left, width } of nodes) {
        const prev = node.data.length === orig.length ? node.data : orig;
        let out = "";
        const n = orig.length;
        for (let i = 0; i < n; i++) {
          const c = orig[i];
          if (c === "\n") {
            out += c;
            continue;
          }
          const x = left + ((i + 0.5) / n) * width;
          const d = dir > 0 ? front - x : x - front;
          if (d > band) out += "\u00a0"; // wiped
          else if (d > 0) {
            // surging: dense symbols, mostly sticky between ticks
            const keep = SURGE.includes(prev[i]) && Math.random() > REROLL;
            out += c === " " ? " " : keep ? prev[i] : SURGE[Math.floor(Math.random() * SURGE.length)];
          } else {
            // corrupting ahead of the front: sticky garble
            const wasGarbled = isGarble(prev[i]) && prev[i] !== c;
            if (c === " ") out += c;
            else if (wasGarbled) out += Math.random() < REROLL ? (Math.random() < 0.7 ? garble() : c) : prev[i];
            else out += Math.random() < 0.45 * REROLL ? garble() : c;
          }
        }
        node.data = out;
      }
      if (p >= 1) {
        clearInterval(iv);
        resolve();
      }
    };
    tick();
    // The front still moves every frame's worth of time; only the symbol churn is slower.
    iv = window.setInterval(tick, 70);
  });
  return { done, restore };
}

/**
 * Slow decode of a freshly mounted page: starts as near-total garbage and resolves
 * into the real text left → right over `ms`. Runs the first garbled frame
 * synchronously so the page can be unhidden without a flash of clean text.
 */
export function decodePage(root: Element | Element[], ms = 1800): Promise<void> {
  return corruptText(root, ms, 0.95, true);
}
