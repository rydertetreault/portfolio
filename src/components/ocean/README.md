# The ocean

The homepage. The live site's ASCII plasma field becomes a 3D ocean, and scrolling flies a
camera across it. Each section of the site is a spot in the ocean with its own water event.

```
ocean/
├── world.ts        the field's constants (live hero preset) + where each event sits
├── route.ts        THE SITE: stops, camera shots, pacing → keys, text windows, event strength
├── timeline.ts     Shot / Camera types, Hermite sampling of the keys
├── shaders.ts      GLSL: the field (plasma + events) and the surface pass
├── OceanEngine.ts  WebGL2 renderer
├── OceanCanvas.tsx React wrapper: scroll, theme, reduced motion, quiet zones
├── Ocean.tsx       the page: header, scroll track, one <Stop> per beat
└── stops.tsx       the text of each stop (reads src/data/profile.ts)
```

## The route

| Stop | Water |
| --- | --- |
| 00 Origin | the live background, seen from straight above (flat, native glyph size) |
| 01 About | the camera dives; the field rises into rolling waves |
| 02 Experience | the swell: one long crest per company, the camera rides over each |
| 03 Projects | one turning eddy per featured project (first 4 of `FEATURED_PROJECTS`) |
| 04 Skills | three currents streaming side by side |
| 05 Education | still water, slow rings |
| 06 Contact | the whirlpool; the camera pulls up overhead, text sits in the calm eye |

An event builds while the camera travels to its stop and fades as it leaves, so only the
current stop's water is ever active. Text fades in as the camera settles and is dimmed out
of the water behind it (`data-ocean-quiet`).

**Change pacing:** `travel` / `hold` in `route.ts` (viewport heights).
**Move a shot:** edit its `Shot` in `route.ts`; `aim()` frames a point from a heading.
**Move an event:** `world.ts` (the GLSL picks the constants up).

## Rendering

1. **Field pass**: the plasma (ported from `ascii-field`) plus the events, evaluated once
   per glyph cell into a texture array, for 4 nested levels (cell ×1, ×2, ×4, ×8) centred
   where the camera looks.
2. **Surface pass**: a camera-centred heightfield mesh. Each fragment finds its glyph cell in
   world space and stamps that cell's band glyph, so glyphs lie on the water. The level is
   chosen so glyphs stay at least `shot.glyph` × native size (crisp, never shrunk into grey).

At the Origin the camera is pinned to whole device pixels, so it matches the live field.

In development: `__ocean` (engine; `debugCam`, `debugField()`) and `__route` on `window`.
