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
└── directory.tsx   the bottom of the whirlpool: `ls -l` → contact / projects / resume
```

## The route

| Stop | Water | Its item (accent) |
| --- | --- | --- |
| 00 Origin | the live background from straight above | — |
| 01 About | three currents streaming north | one lane per skill group, lime / orange / gold |
| 02 Experience | the swell, one crest per company | the crest's foam lights up in the company's colour |
| 03 Projects | one turning eddy per featured project | the eddy's spiral arms |
| 04 Education | calm water to the horizon | a low ASCII sun and its glitter path |
| 05 Contact | the whirlpool, from overhead | lime spiral arms |
| → | scroll on: dive down the funnel, black out | the directory |

**Text ↔ water:** the accents are CSS vars `--ocean-a1..3` (`globals.css`), read by the engine
and by the text, so each heading is in the same colour as its item, with a run of its
glyphs (`≈≈≈`, `~~~`, `@@@`, `***`) in front. Ambient lime / orange strips ride the
contours everywhere, as on the live homepage.

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
