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
  leftW: 400, // site: 420–460 px intro panel
  padLeft: 40,
  padRight: 52,
  quiet: 0.9, // panel dimming (site: 0.7 + a 45% background wash; the wash is drawn separately)
  wash: 0.3,
};

/**
 * Lay out the content; returns everything the generator needs:
 *   height, quietRects, and a `render(theme)` producing the panel + text markup.
 */
export async function layoutPoster(c, opts = {}) {
  const P = { ...POSTER, ...opts };
  const W = P.width;
  const x0 = P.marginX;
  const x1 = W - P.marginX;
  const xSplit = x0 + P.leftW;
  const top = P.marginY;

  // Geometry only depends on text, not theme: compute positions once, and keep a
  // list of draw ops that get coloured per theme.
  const ops = []; // { kind, ... }
  const T = (x, y, text, size, weight, color, extra = {}) => ops.push({ kind: "text", x, y, text, size, weight, color, ...extra });

  /* ── left panel ── */
  const lx = x0 + P.padLeft;
  const lw = P.leftW - 2 * P.padLeft;
  let ly = top + 56;

  ops.push({ kind: "photo", x: lx, y: ly, size: 96 });
  ly += 96 + 28;

  T(lx, ly + 21, c.name, 42, 600, "fg", { tracking: -0.025 });
  ly += 42 + 16;
  T(lx, ly + 8, c.tagline, 16.5, 500, "accent");
  ly += 16.5 + 16;
  for (const line of wrap(c.blurb, 16, 400, lw)) {
    T(lx, ly + 8, line, 16, 400, "faint");
    ly += 16 * 1.65;
  }
  ly += 36;

  for (const l of c.links) {
    ops.push({ kind: "icon", name: l.icon, x: lx, y: ly, size: 18, color: "faint" });
    T(lx + 18 + 14, ly + 9, l.label, 14, 400, "faint");
    ly += 18 + 16;
  }
  ly += 40 - 16;

  // EDUCATION & CERTIFICATIONS (section header in the site's style, compact rows)
  T(lx, ly + 6.5, "EDUCATION & CERTIFICATIONS", 12, 500, "faint", { tracking: 0.3 });
  ly += 12 + 12;
  ops.push({ kind: "hline", x: lx, y: ly, w: lw, color: "border" });
  ly += 1 + 24;
  c.education.forEach((ed, i) => {
    if (i > 0) ly += 24;
    ops.push({ kind: "icon", name: ed.icon, x: lx, y: ly + 1, size: 18, color: "faint" });
    T(lx + 30, ly + 7, ed.date, 14, 400, "faint");
    ly += 14 + 7;
    for (const line of wrap(ed.title, 17, 600, lw - 30)) {
      T(lx + 30, ly + 9, line, 17, 600, "fg");
      ly += 17 + 5;
    }
    for (const line of wrap(ed.sub, 14, 400, lw - 30)) {
      T(lx + 30, ly + 7, line, 14, 400, "muted");
      ly += 14 + 5;
    }
    ly -= 5;
  });
  const leftBottom = ly + 56;

  /* ── right panel ── */
  const rx = xSplit + P.padRight;
  const rw = x1 - P.padRight - rx;
  let ry = top + 56;

  const sectionHeader = (title) => {
    T(rx, ry + 6.5, title, 13, 500, "faint", { tracking: 0.3 });
    ry += 13 + 12;
    ops.push({ kind: "hline", x: rx, y: ry, w: rw, color: "border" });
    ry += 1 + 28;
  };
  const GAP = 56;

  // ABOUT
  sectionHeader("ABOUT");
  for (const line of wrap(c.about, 16.5, 400, rw)) {
    T(rx, ry + 8, line, 16.5, 400, "muted");
    ry += 16.5 * 1.7;
  }
  ry += GAP - 16.5 * 0.7;

  // EXPERIENCE (timeline: 2px rail, dot per entry, 32px indent)
  sectionHeader("EXPERIENCE");
  const railX = rx + 1;
  const railTop = ry;
  const ex = rx + 32;
  const ew = rw - 32;
  c.experience.forEach((e, i) => {
    if (i > 0) ry += 24;
    ops.push({ kind: "dot", x: railX, y: ry + 8 });
    T(ex, ry + 8, e.date, 15, 400, "faint");
    ry += 15 + 10;
    T(ex, ry + 11, e.company, 21, 600, "fg");
    ry += 21 + 8;
    T(ex, ry + 8, e.role, 15, 400, "accent");
    ry += 15 + 14;
    for (const line of wrap(e.description, 15.5, 400, Math.min(ew, 512))) {
      T(ex, ry + 8, line, 15.5, 400, "muted");
      ry += 15.5 * 1.6;
    }
    ry -= 15.5 * 0.6;
    if (i < c.experience.length - 1) ry += 24;
  });
  ops.push({ kind: "rail", x: railX, y0: railTop, y1: ry, color: "border" });
  const rightBottom = ry + 56;

  const bottom = Math.max(leftBottom, rightBottom);
  const height = Math.ceil(bottom + P.marginY);
  const panelBottom = height - P.marginY;

  const quietRects = [x0, top, xSplit, panelBottom, 1, xSplit, top, x1, panelBottom, 1];

  async function render(theme, photoFile) {
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

  return { width: W, height, quietRects, quiet: P.quiet, quietZone: P.quietZone, render, panels: { x0, x1, xSplit, top, bottom: panelBottom } };
}
