/**
 * SVG emission for the baked ASCII field: theme palettes (from globals.css),
 * per-band colour/opacity CSS mirroring the WebGL shader, and the frame stack
 * driven by a `step-end` CSS animation (GitHub renders CSS animations in SVGs).
 */

import { readFileSync } from "node:fs";
import { smoothstep } from "./field.mjs";

/** Site palettes (src/app/globals.css). `bg` is GitHub's page colour, used for frosted panels. */
export const THEMES = {
  dark: {
    lo: "#5c5c5c",
    hi: "#cfcfcf",
    gain: 1,
    palette: ["#a3e635", "#d8fb74", "#cdcf5f", "#bad366", "#d3b75b", "#a77a4b", "#62a74a"],
    fg: "#ededed",
    muted: "#a3a3a3",
    faint: "#737373",
    accent: "#a3e635",
    border: "rgba(38,38,38,0.6)",
    bg: "#0d1117",
  },
  light: {
    lo: "#6a6a6a",
    hi: "#111111",
    gain: 1.55, // --ascii-gain: grey-on-light needs the boost
    palette: ["#4d7c0f", "#65a30d", "#5f8a2a", "#6a8f2f", "#7a7a26", "#7c5a2e", "#3f7a2a"],
    fg: "#121212",
    muted: "#3d3d3d",
    faint: "#5c5c5c",
    accent: "#4d7c0f",
    border: "rgba(170,170,170,0.65)",
    bg: "#ffffff",
  },
};

export function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("");
}

/** Per-band (× quiet tier) colour + opacity, exactly as the shader computes it. */
export function bandCss(theme, p, cfg) {
  const levels = Math.round(p.levels);
  const brightness = Math.min(1, p.brightness * theme.gain);
  const { rampLo, rampHi } = cfg.colors;
  let css = "";
  for (let b = 1; b <= levels; b++) {
    for (const q of [0, 4, 6, 8]) {
      const qm = q === 0 ? 1 : q / 10;
      const d = Math.pow(b / levels, p.levelGamma) * brightness * qm;
      if (q !== 0 && d < 0.05) continue;
      const t = smoothstep(rampLo, rampHi, d);
      css += `.b${b}${q ? "q" + q : ""}{fill:${mixHex(theme.lo, theme.hi, t)};fill-opacity:${d.toFixed(3)}}`;
    }
  }
  // Deeply dimmed cells (under the panels) share one class per quiet tier: at ≤ 10%
  // opacity the per-band nuance is invisible, and merging halves the tspan count.
  for (let q = 1; q <= 2; q++) {
    const d = Math.pow((levels - 1) / levels, p.levelGamma) * brightness * (q / 10);
    const t = smoothstep(rampLo, rampHi, d);
    css += `.d${q}{fill:${mixHex(theme.lo, theme.hi, t)};fill-opacity:${d.toFixed(3)}}`;
  }
  for (let k = 1; k <= theme.palette.length; k++) css += `.p${k}{fill:${theme.palette[k - 1]}}`;
  for (let a = 7; a <= 10; a++) css += `.a${a}{fill-opacity:${(a / 10).toFixed(1)}}`;
  return css;
}

/**
 * Frame k visible during [k/fps, (k+1)/fps) of each period. `.f` is the full-rate
 * stack; `.s` the sub-sampled stack (every `sub`-th frame, held `sub` frames).
 * Static first frame under reduced motion.
 */
export function animCss(N, fps, sub = 1) {
  const period = N / fps;
  return (
    `text{dominant-baseline:central}` +
    `.f,.s{visibility:hidden;animation:show ${period.toFixed(3)}s step-end infinite}` +
    `.s{animation-name:shows}` +
    `@keyframes show{0%{visibility:visible}${(100 / N).toFixed(4)}%{visibility:hidden}100%{visibility:hidden}}` +
    `@keyframes shows{0%{visibility:visible}${((100 * sub) / N).toFixed(4)}%{visibility:hidden}100%{visibility:hidden}}` +
    `@media (prefers-reduced-motion:reduce){.f,.s{animation:none}.f:first-child,.s:first-child{visibility:visible}}`
  );
}

export function fontFace(family, file, weight = "400") {
  const b64 = readFileSync(file).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight}}`;
}

/**
 * The animated glyph grid. Each frame is one <g>; each row one <text>; runs of
 * equal class are <tspan>s. Cells are placed by the embedded mono font's advance
 * (0.6em), so rows need no per-glyph x positions.
 *
 * Cells are split into two stacks: the visible field (quiet tier 0 or ≥ 5) at full
 * rate, and the deeply dimmed cells under the panels at 1/`sub` the rate (they sit
 * at ≤ 10% opacity, so the lower cadence is imperceptible and the DOM shrinks ~4×).
 */
export function framesMarkup(frames, field, fps, fontSize, sub = 1) {
  const N = frames.length;
  if (N % sub !== 0) throw new Error(`frame count ${N} must be divisible by sub ${sub}`);
  const isSlow = (fr, idx) => fr.quiet[idx] !== 0 && fr.quiet[idx] < 5 && !fr.pal[idx];
  let body = `<g font-family="GM" font-size="${fontSize}">`;
  body += stack(frames, field, fps, "f", (fr, idx) => !isSlow(fr, idx), 1);
  if (sub > 1) body += stack(frames, field, fps, "s", isSlow, sub);
  else body += stack(frames, field, fps, "f", isSlow, 1);
  return body + `</g>`;
}

function stack(frames, field, fps, cls, keep, sub) {
  const { cols, rows, cellW, cellH } = field;
  const GAP = 6; // empty cells that split a row into separate <text> segments
  let body = "";
  for (let k = 0; k < frames.length; k += sub) {
    const fr = frames[k];
    body += `<g class="${cls}" style="animation-delay:${(k / fps).toFixed(3)}s">`;
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * cellH;
      const cellClass = (col) => {
        const idx = row * cols + col;
        if (fr.glyph[idx] === " " || !keep(fr, idx)) return null;
        if (fr.pal[idx]) return `p${fr.pal[idx]} a${Math.max(7, Math.min(10, Math.round(fr.alpha[idx] * 10)))}`;
        if (fr.quiet[idx] === 0) return `b${fr.band[idx]}`;
        if (fr.quiet[idx] <= 2) return `d${fr.quiet[idx]}`;
        return `b${fr.band[idx]}q${fr.quiet[idx]}`;
      };
      let col = 0;
      while (col < cols) {
        // next inked cell
        while (col < cols && cellClass(col) === null) col++;
        if (col >= cols) break;
        const start = col;
        // extend the segment until a gap of ≥ GAP empty cells
        let end = col;
        let gap = 0;
        for (let c2 = col; c2 < cols; c2++) {
          if (cellClass(c2) === null) {
            if (++gap >= GAP) break;
          } else {
            gap = 0;
            end = c2;
          }
        }
        let line = "";
        let cur = null;
        let run = "";
        const flush = () => {
          if (!run) return;
          line += cur === null ? esc(run) : `<tspan class="${cur}">${esc(run)}</tspan>`;
          run = "";
        };
        for (let c2 = start; c2 <= end; c2++) {
          const c = cellClass(c2);
          if (c !== cur) {
            flush();
            cur = c;
          }
          run += c === null ? " " : fr.glyph[row * cols + c2];
        }
        flush();
        body += `<text x="${(start * cellW).toFixed(2)}" y="${y.toFixed(2)}">${line}</text>`;
        col = end + 1;
      }
    }
    body += `</g>`;
  }
  return body;
}

export function svgDocument({ width, height, style, body, label }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
    `xml:space="preserve" role="img" aria-label="${esc(label)}">` +
    `<style>${style}</style>${body}</svg>`
  );
}

export function stats(svg) {
  return `${(svg.length / 1024).toFixed(0)} KB, ${(svg.match(/<tspan/g) || []).length} tspans, ${(svg.match(/<text/g) || []).length} text rows`;
}
