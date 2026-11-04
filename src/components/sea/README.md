# The Sea

The homepage: one continuous ASCII ocean. Scrolling flies a camera through it, and every
section of the site is a stop on the journey. The top-down hero is your original plasma
waveform; once the camera tilts, it resolves into rolling ocean waves.

```
sea/
├── journey.ts        THE SITE: stops, beats (camera shots), timing → keys, panel windows, nav
├── world.ts          the world: plasma constants, ocean waves, regions, beacons, CPU mirrors
├── timeline.ts       Shot / Camera types, Hermite sampling of the keys
├── shaders.ts        GLSL: scene (4 variants), cursor trace, resolve, glyph stamp
├── SeaEngine.ts      WebGL2 engine: passes, camera, pointer, ripples, adaptive quality
├── SeaCanvas.tsx     React wrapper (fixed canvas, events, theme, reduced motion) + seaStore
├── SeaExperience.tsx the page: panels bound to journey windows, deep links
├── hud.tsx           HUD chrome, telemetry, stop nav, transit labels, waypoint, map overlay
├── cards.tsx         the content cards (reads src/data/profile.ts + GitHub projects)
└── HudText.tsx       CoD-style decode-in text
```

## The journey

`journey.ts` → `BEATS` is the site. Each beat is a camera rest (where you stop and read),
reached by travelling from the previous one:

| Stop | Beats | Water (`world.ts` region) |
| --- | --- | --- |
| 00 Origin | hero (top-down plasma) | the original field |
| 01 The Surface | about | open ocean |
| 02 The Swell | 3 × experience | `swell`: long rolling swells, the camera rides them |
| 03 Waypoints | 6 × projects | one region each: `p-glass`, `p-cross`, `p-terrace`, `p-ping`, `p-scan`, `p-ice` |
| 04 The Current | skills | `current`: fast streaming streaks |
| 05 The Harbor | education | `harbor`: calm, lighthouse beam |
| 06 The Map | map | chart view of everything; the cursor scans the live sea |
| 07 The Deep | contact | `deep`: underwater |

Everything else is derived from `BEATS`: camera keys, when each panel shows, transit
labels, HUD nav, waypoint markers, map markers, deep links (`/#experience` etc.).

**Add a section:** add a beat (camera `shot`, `hold`, `travel`, optional `via` fly-through
shots, `label`, `target`), optionally a region in `world.ts`, then render a `<Panel>` for
its id in `SeaExperience.tsx`. **Change pacing:** `hold` / `travel` (viewport heights).

## Rendering

1. **Scene** (one fragment per glyph cell, 2 targets): raymarches the heightfield. Height =
   `mix(plasma, ocean + regions, shot.ocean)`. Value (→ glyph) = `mix(height band, lighting,
   shot.lit)`, so 3D views shade by light instead of hard height stripes. Distant water is
   filtered to a flat texture by cell footprint; marching is cone-stepped. Four compiled
   variants (plasma-only for the hero, ocean-only, mixed for the dive, underwater) are
   picked per frame.
2. **Trace** (29 fragments): GPU port of the old field's cursor contour trace: the band edge
   nearest the cursor, followed ±14 cells (lime, fades along the curve, 2.5 s idle fade).
3. **Resolve** (per cell): glyph, colour, alpha: accents, trace, cursor glow, map tint /
   borders / grid, beacons, particles, quiet zones behind text, glitches.
4. **Glyph** (per pixel): stamps the atlas. Cheap at any resolution.

## Shot parameters (`timeline.ts`)

| Param | Effect |
| --- | --- |
| `pos`, `yaw`, `pitch`, `roll`, `fov` | camera (`span` = top-down framing by visible width) |
| `ocean` | 0 = original plasma, 1 = ocean waves |
| `lit` | 0 = height bands (2D look), 1 = glyphs follow light |
| `shade` | lighting / chop strength |
| `fog` | fog density + horizon glow |
| `ride`, `sway` | camera bobs on the swell / hand-held drift |
| `chart` | nautical-chart map look (cursor = scanner lens) |
| `stars`, `snow` | sky stars / underwater particles |

## Common tweaks

| Want to… | Change |
| --- | --- |
| Calmer / bigger ocean waves | `OCEAN` amplitudes / wavenumbers in `world.ts` |
| A region's character | its entry in `REGIONS` (`amp`, `swell`, `terrace`, `cross`, `scan`, `ice`, `flow`, `ping`, `spec`, `beam`) |
| Accent colours | `SEA_CONFIG.palette` (`SeaEngine.ts`): 3 lime family, 2 warm |
| Brightness / grey ramp | `SEA_CONFIG.brightness`, `gamma`, `--ascii-lo/hi` in `globals.css` |
| Camera follow tightness | `SEA_CONFIG.scrollFollow` |
| Cursor glow / trace | `SEA_CONFIG.pointerGlow`, `pointerRadius`, `TRACE_N` (`shaders.ts`) |
| Scanner lens size | `SEA_CONFIG.lensRadius` |
| Content | `src/data/profile.ts`; featured projects = `FEATURED_PROJECTS` |

## Behaviour

- Reduced motion: no flights. The camera cuts between rests, and time is frozen.
- Adaptive quality: DPR → 1, then fewer march steps, if frames stay slow.
- Survives WebGL context loss; no WebGL2 → the text still works (no canvas).
- Inactive panels are `inert`, so keyboard and screen-reader order follows the journey.
- Dev console: `__sea` (engine), `__sea.debugDump(4, 2)` (scene as text), `__sea.debugTrace()`,
  `__sea.profile = { scene: 0, trace: 0, ascii: 0 }` (per-pass GPU ms), `__seaBeats` (arrivals).
