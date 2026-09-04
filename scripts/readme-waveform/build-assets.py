#!/usr/bin/env python3
"""
Build the font assets embedded in the README poster SVG.

  geist-sans.woff2        Geist (variable, wght 100–900) subset to Basic Latin + a few
                          typographic extras: the UI text of the poster.
  geist-mono-field.woff2  Geist Mono subset to the ASCII field's glyphs.
  metrics.json            Advance widths (per 1000 upem) for the sans subset at the
                          weights the poster uses, so the generator can word-wrap.
  profile.jpg             public/profile.jpg resized to 192 px (2× the 96 px avatar).

Sources: the Geist fonts Next.js bundles for its devtools (OFL-1.1, embedding allowed).
Run from the repo root:  python3 scripts/readme-waveform/build-assets.py
"""
import io, json, os, subprocess, sys
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
NEXT_FONTS = os.path.join(HERE, "../../node_modules/next/dist/next-devtools/server/font")

SANS_CHARS = "".join(chr(c) for c in range(0x20, 0x7F)) + "·™©—–’“”…"
FIELD_CHARS = " .:-=+*#%@_\\|/<>^"
WEIGHTS = [400, 500, 600]


def subset_font(src, text, dst, keep_var=True):
    f = TTFont(src)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.hinting = False
    opts.desubroutinize = True
    opts.layout_features = ["kern"] if keep_var else []
    opts.name_IDs = []
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    f.flavor = "woff2"
    f.save(dst)
    return os.path.getsize(dst)


def metrics(src, text, weights):
    out = {"upem": 1000, "weights": {}}
    base = TTFont(src)
    out["upem"] = base["head"].unitsPerEm
    for w in weights:
        f = instancer.instantiateVariableFont(TTFont(src), {"wght": w}, inplace=False)
        cmap = f.getBestCmap()
        hmtx = f["hmtx"]
        adv = {}
        for ch in text:
            g = cmap.get(ord(ch))
            if g:
                adv[ch] = hmtx[g][0]
        out["weights"][str(w)] = adv
    return out


os.makedirs(OUT, exist_ok=True)
sans_src = os.path.join(NEXT_FONTS, "geist-latin.woff2")
mono_src = os.path.join(NEXT_FONTS, "geist-mono-latin.woff2")

n = subset_font(sans_src, SANS_CHARS, os.path.join(OUT, "geist-sans.woff2"))
print(f"geist-sans.woff2        {n/1024:.1f} KB")
n = subset_font(mono_src, FIELD_CHARS, os.path.join(OUT, "geist-mono-field.woff2"), keep_var=False)
print(f"geist-mono-field.woff2  {n/1024:.1f} KB")
m = metrics(sans_src, SANS_CHARS, WEIGHTS)
with open(os.path.join(OUT, "metrics.json"), "w") as fh:
    json.dump(m, fh, separators=(",", ":"))
print(f"metrics.json            {len(m['weights'])} weights × {len(m['weights']['400'])} glyphs")

from PIL import Image
im = Image.open(os.path.join(HERE, "../../public/profile.jpg")).convert("RGB").resize((192, 192), Image.LANCZOS)
dst = os.path.join(OUT, "profile.jpg")
im.save(dst, "JPEG", quality=82, optimize=True, progressive=False)
print(f"profile.jpg             {os.path.getsize(dst)/1024:.1f} KB")
