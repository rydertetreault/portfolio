# The ocean

The whole site. The live site's ASCII plasma field becomes a 3D ocean, and scrolling flies a
camera across it. Each section is a spot in the ocean with its own water event; every other
page (`/projects`, `/projects/[slug]`, `/resume`, `/contact`) opens as a waveform lightbox
over it (`app/(ocean)/layout.tsx` mounts the ocean once, so it never reloads). Only the
SnapShift App Store pages live outside it.

```
ocean/
├── world.ts        the field's constants (live hero preset) + where each event sits
├── route.ts        THE SITE: stops, camera shots, pacing → keys, text windows, event strength
├── timeline.ts     Shot / Camera types, Hermite sampling of the keys
├── shaders.ts      GLSL: the field (plasma + events + accents), the surface, the sky (sun)
├── OceanEngine.ts  WebGL2 renderer
├── OceanCanvas.tsx React wrapper: scroll, theme, reduced motion, quiet zones
├── Ocean.tsx       the page: header, scroll track, one <Stop> per beat, blackout, lightbox slot
├── stops.tsx       the text of each stop + the contact lightbox (reads src/data/profile.ts)
├── WaveBox.tsx     the waveform lightbox (and WaveFrame, its animated ASCII border)
├── project-isles.tsx 04: island columns, close-ups, All projects (two chains)
└── jump.ts         jumpTo(u): a cut through black to a stop (Back to the surface, header name)
```

## The route

| Stop | Water | Its item (accent) |
| --- | --- | --- |
| 00 Origin | the live background from straight above | — |
| 01 About | the camera dives; the field rises into waves | — |
| 02 Experience | the swell, one crest per company | the crest's foam lights up in the company's colour |
| 03 Skills | three currents streaming north | one lane per skill group, lime / orange / gold |
| 04 Projects | a chain of four islands rising one at a time from a low rolling sea; "All projects" flies right and up over two more chains | each island's contours |
| 05 Education | calm water to the horizon | an ASCII sunset cresting the horizon, its reflection |
| Contact | a whirlpool forms between the camera and the sun; the camera rises to look into it | lime / orange contour strips wound into it |
| → | pulled in: a banking, descending orbit (`HELIX`), down the throat into black | — |
| 06 Contact | out of the bottom of the throat into deep water (`DEEP_IN` → `DEEP`): the surface overhead with the funnel hanging down, light shafts, bubbles; text on the left | `deep` |

**Text ↔ water:** the accents are CSS vars `--ocean-a1..12` (a1..a4 the route, a5..a12 the All-projects chains) (`globals.css`), read by the engine
and by the text, so each heading is in the same colour as its item. Ambient lime / orange
strips ride the contours everywhere, as on the live homepage: contour accents are only drawn
on band edges and placed in the plasma's own flowing coordinates, so they move with it.

An event builds while the camera travels to its stop and fades as it leaves, so only the
current stop's water is active. Text fades in as the camera settles; the water dims behind
it (`data-ocean-quiet`).

**Change pacing:** `travel` / `hold` in `route.ts` (viewport heights).
**Move a shot:** edit its `Shot` in `route.ts`; `aim()` frames a point from a heading.
**Move an event / recolour an item:** `world.ts` (the GLSL picks the constants up).

## Rendering

1. **Field pass**: the plasma (ported from `ascii-field`) plus the events and their accents,
   evaluated once per glyph cell into a texture array, for 5 nested levels (cell ×1 … ×16) centred
   where the camera looks.
2. **Sky pass** (Education only): the sun, in screen-locked glyph cells.
3. **Surface pass**: a camera-centred heightfield mesh. Each fragment finds its glyph cell in
   world space and stamps that cell's band glyph, so glyphs lie on the water. The level is
   chosen so glyphs stay at least `shot.glyph` × native size (crisp, never shrunk into grey).

At the Origin the camera is pinned to whole device pixels, so it matches the live field.

In development: `__ocean` (engine; `debugCam`, `debugField()`) and `__route` on `window`.

## Status (sea-v3, uncommitted work since 0a5dfda; backup of the pre-whirlpool state in `git stash list`)

**Locked:** 00–03 are approved; don't touch them except for copy. 01 and 02 keep small ocean
glyphs (`glyph: 0.9` on their shots). Re-screenshot them after any shared shader change.

**Done**
- 05 ASCII sun, 04 islands + All projects (see git history / earlier notes).
- **Whirlpool** (`whirlpool()` in shaders.ts, `WHIRL` / `whirlProfile` in world.ts, replaced the
  hurricane): funnel depth ∝ a²/(r²+a²); grey foam arms + inward streaks; Ryder wants NO big
  coloured bands, only the site's short lime / orange contour strips. Sun + calm water stay
  through Contact (`calm` spans education..contact).
- **06 under the sea** (`DEEP` / `DEEP_IN` in route.ts, `deep` event; replaced the aerial view):
  `DEEP_FS` paints the water behind everything (grey tone darker into the deep, paler shaft wedges,
  `| / \` strokes along each shaft, sparse grain, sinking specks); the surface is blended over it
  with Snell's window (bright within ~49° of straight up) and a slight waver; `BUBBLE_VS/FS` are
  world-space ASCII bubbles (`. ° o`, big `o` over 2-3 cells), in streams and on their own, gone at
  the surface. Earlier underwater tries (glyph density only) didn't read as underwater: the grey
  tone + shafts + bubbles are what sell it.
- **Back to the surface** / the header name (when deep in the route):
  `jumpTo(u)` cuts through black. **Skip the animation** on 00 → `/classic`.
- First frame: a LITE field (no events) compiles first; the full one compiles in the background.

**Next**
1. 06: Ryder to review the underwater scene. Text is `DeepStop`: a guide (route gauge + floating cards).
2. Light theme check of the whirlpool; regression shots of 00–05.
3. Mobile: the 05 sun is off-screen at 390px; the All-projects chains are clipped at 390px.
4. Old: probe-readback perf warning (headless only); lint error in `Lightbox.tsx`.

**Testing:** `Q='?end=b' TAG=b- node /tmp/oc/shoot.mjs <u list> <w> <h> <theme> <wait>` for screenshots
at scroll positions (`u` 0 prints the route windows); `/tmp/oc/tile.py` tiles them. /tmp is wiped
on reboot: playwright is at ~/.npm/_npx/e41f203b7505f1fb, chrome at ~/.cache/ms-playwright/chromium-1234.
Headless runs at a few fps, so waits are long. Never `git add -A` without reading the diff.
