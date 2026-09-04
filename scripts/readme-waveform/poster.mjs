/**
 * Poster layout: the homepage's two-panel composition (fixed intro panel on the
 * left, sections on the right) rendered as SVG text over the animated field. The
 * panels are `data-ascii-quiet` zones: the field dims beneath them (feathered),
 * with a frosted page-colour wash on top, exactly like the site's
 * `bg-background/45` panels.
 *
 * All sizes are in viewBox px at WIDTH = 1200. GitHub shows the README at about
 * 896 px, so on-screen sizes are ≈ 0.75× these.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "./svg.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const metrics = JSON.parse(readFileSync(resolve(HERE, "assets/metrics.json"), "utf8"));

/* ───────────── text measurement (Geist metrics.json, no kerning → 1.5% slack) ───────────── */

function textWidth(str, size, weight = 400, tracking = 0) {
  const adv = metrics.weights[String(weight)] ?? metrics.weights["400"];
  let w = 0;
  for (const ch of str) w += (adv[ch] ?? adv["n"]) / metrics.upem + tracking;
  return w * size * 1.015;
}

function wrap(str, size, weight, maxWidth, tracking = 0) {
  const words = str.split(/\s+/);
  const lines = [];
  let line = "";
  for (const wd of words) {
    const cand = line ? `${line} ${wd}` : wd;
    if (textWidth(cand, size, weight, tracking) <= maxWidth || !line) line = cand;
    else {
      lines.push(line);
      line = wd;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ───────────── lucide icons (same set the site uses) ───────────── */

async function icon(name, x, y, size, stroke, opacity = 1) {
  const mod = await import(`lucide-react/dist/esm/icons/${name}.js`);
  const nodes = mod.__iconNode;
  const s = size / 24;
  let g = `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${s.toFixed(4)})" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">`;
  for (const [tag, attrs] of nodes) {
    g += `<${tag}`;
    for (const [k, v] of Object.entries(attrs)) if (k !== "key") g += ` ${k}="${v}"`;
    g += "/>";
  }
  return g + "</g>";
}

/* ───────────── layout ───────────── */

export const POSTER = {
  width: 1200,
  marginX: 112, // field visible around the panels
  marginY: 96,
  // Tighter than the site's quietZone (28/70): the margins are narrow, so the field
  // must come back to full brightness within a few cells of the panel edge.
  quietZone: { padding: 4, feather: 36 },
  leftW: null, // null = pick the split (400–560) that balances the two columns
  padLeft: 44,
  padRight: 52,
  quiet: 0.9, // panel dimming (site: 0.7 + a 45% background wash; the wash is drawn separately)
  wash: 0.3,
};

/**
 * Lay out the content; returns everything the generator needs:
 *   height, quietRects, and a `render(theme)` producing the panel + text markup.
 *
 * Left panel: tagline + EXPERIENCE (timeline). Right panel: ABOUT, EDUCATION &
 * CERTIFICATIONS, CONTACT. Avatar / name / blurb are intentionally absent: GitHub's
 * own profile sidebar already shows them next to the README.
 */
export async function layoutPoster(c, opts = {}) {
  const P = { ...POSTER, ...opts };
  if (P.leftW === null) {
    let best = null;
    for (let w = 400; w <= 560; w += 20) {
      const L = layoutOnce(c, { ...P, leftW: w });
      if (!best || L.height < best.height) best = L;
    }
    return finish(best, c);
  }
  return finish(layoutOnce(c, P), c);
}

function layoutOnce(c, P) {
  const W = P.width;
  const x0 = P.marginX;
  const x1 = W - P.marginX;
  const xSplit = x0 + P.leftW;
  const top = P.marginY;

  const ops = [];
  const T = (x, y, text, size, weight, color, extra = {}) => ops.push({ kind: "text", x, y, text, size, weight, color, ...extra });
  const header = (x, y, w, title, size = 13) => {
    T(x, y + size / 2, title, size, 500, "faint", { tracking: 0.3 });
    y += size + 12;
    ops.push({ kind: "hline", x, y, w, color: "border" });
    return y + 1 + 28;
  };
  const GAP = 56;
  const PAD_TOP = 56;

  /* ── left panel: tagline + experience timeline ── */
  const lx = x0 + P.padLeft;
  const lw = P.leftW - 2 * P.padLeft;
  let ly = top + PAD_TOP;

  T(lx, ly + 9, c.tagline, 18, 500, "accent");
  ly += 18 + 40;

  ly = header(lx, ly, lw, "EXPERIENCE");
  const railX = lx + 1;
  const railTop = ly;
  const ex = lx + 32;
  const ew = lw - 32;
  c.experience.forEach((e, i) => {
    if (i > 0) ly += 24;
    ops.push({ kind: "dot", x: railX, y: ly + 8 });
    T(ex, ly + 8, e.date, 15, 400, "faint");
    ly += 15 + 10;
    for (const line of wrap(e.company, 21, 600, ew)) {
      T(ex, ly + 11, line, 21, 600, "fg");
      ly += 21 + 6;
    }
    ly += 2;
    T(ex, ly + 8, e.role, 15, 400, "accent");
    ly += 15 + 14;
    for (const line of wrap(e.description, 15.5, 400, ew)) {
      T(ex, ly + 8, line, 15.5, 400, "muted");
      ly += 15.5 * 1.6;
    }
    ly -= 15.5 * 0.6;
    if (i < c.experience.length - 1) ly += 24;
  });
  ops.push({ kind: "rail", x: railX, y0: railTop, y1: ly, color: "border" });
  const leftBottom = ly + PAD_TOP;

  /* ── right panel: about, education, contact ── */
  const rx = xSplit + P.padRight;
  const rw = x1 - P.padRight - rx;
  let ry = top + PAD_TOP;

  ry = header(rx, ry, rw, "ABOUT");
  for (const line of wrap(c.about, 16.5, 400, rw)) {
    T(rx, ry + 8, line, 16.5, 400, "muted");
    ry += 16.5 * 1.7;
  }
  ry += GAP - 16.5 * 0.7;

  ry = header(rx, ry, rw, "EDUCATION & CERTIFICATIONS");
  c.education.forEach((ed, i) => {
    if (i > 0) ry += 28;
    ops.push({ kind: "icon", name: ed.icon, x: rx, y: ry + 2, size: 18, color: "faint" });
    T(rx + 32, ry + 8, ed.date, 15, 400, "faint");
    ry += 15 + 8;
    T(rx + 32, ry + 10, ed.title, 19, 600, "fg");
    ry += 19 + 8;
    T(rx + 32, ry + 8, ed.sub, 15, 400, "muted");
    ry += 15;
  });
  ry += GAP;

  ry = header(rx, ry, rw, "CONTACT");
  for (const l of c.links) {
    ops.push({ kind: "icon", name: l.icon, x: rx, y: ry, size: 18, color: "faint" });
    T(rx + 18 + 14, ry + 9, l.label, 15, 400, "muted");
    ry += 18 + 18;
  }
  ry -= 18;
  const rightBottom = ry + PAD_TOP;

  const bottom = Math.max(leftBottom, rightBottom);
  const height = Math.ceil(bottom + P.marginY);
  const panelBottom = height - P.marginY;
  const quietRects = [x0, top, xSplit, panelBottom, 1, xSplit, top, x1, panelBottom, 1];

  return { P, W, ops, x0, x1, xSplit, top, panelBottom, height, quietRects, leftBottom, rightBottom };
}

function finish(L, c) {
  const { P, W, ops, x0, x1, xSplit, top, panelBottom, height, quietRects } = L;

  async function render(theme, photoFile = null) {
    const col = (k) => theme[k];
    let out = "";
    // Frosted panels (page colour wash) + hairline borders, as on the site.
    out += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${panelBottom - top}" fill="${theme.bg}" fill-opacity="${P.wash}"/>`;
    out += `<rect x="${x0 + 0.5}" y="${top + 0.5}" width="${x1 - x0 - 1}" height="${panelBottom - top - 1}" fill="none" stroke="${theme.border}"/>`;
    out += `<line x1="${xSplit + 0.5}" y1="${top}" x2="${xSplit + 0.5}" y2="${panelBottom}" stroke="${theme.border}"/>`;

    for (const op of ops) {
      switch (op.kind) {
        case "text": {
          const ls = op.tracking ? ` letter-spacing="${(op.tracking * op.size).toFixed(2)}"` : "";
          out += `<text x="${op.x.toFixed(2)}" y="${op.y.toFixed(2)}" font-size="${op.size}" font-weight="${op.weight}" fill="${col(op.color)}"${ls}>${esc(op.text)}</text>`;
          break;
        }
        case "hline":
          out += `<rect x="${op.x}" y="${op.y.toFixed(2)}" width="${op.w}" height="1" fill="${col(op.color)}"${op.opacity !== undefined ? ` fill-opacity="${op.opacity}"` : ""}/>`;
          break;
        case "rail":
          out += `<rect x="${op.x - 1}" y="${op.y0.toFixed(2)}" width="2" height="${(op.y1 - op.y0).toFixed(2)}" fill="${col(op.color)}"/>`;
          break;
        case "dot":
          out += `<circle cx="${op.x}" cy="${op.y.toFixed(2)}" r="8" fill="${theme.bg}"/><circle cx="${op.x}" cy="${op.y.toFixed(2)}" r="4" fill="${theme.faint}"/>`;
          break;
        case "icon":
          out += await icon(op.name, op.x, op.y, op.size, col(op.color));
          break;
        case "photo": {
          const b64 = readFileSync(photoFile).toString("base64");
          const r = op.size / 2;
          const cx = op.x + r, cy = op.y + r;
          out += `<clipPath id="pf"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
          out += `<image href="data:image/jpeg;base64,${b64}" x="${op.x}" y="${op.y}" width="${op.size}" height="${op.size}" clip-path="url(#pf)" preserveAspectRatio="xMidYMid slice"/>`;
          out += `<circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="${theme.border}"/>`;
          break;
        }
      }
    }
    return `<g font-family="GS">${out}</g>`;
  }

  return { width: W, height, quietRects, quiet: P.quiet, quietZone: P.quietZone, render, leftW: P.leftW, panels: { x0, x1, xSplit, top, bottom: panelBottom } };
}
