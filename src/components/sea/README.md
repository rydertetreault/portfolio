# The Sea

The homepage: one continuous ASCII ocean. Scrolling flies a camera through it, and every
section of the site is a stop on the journey. The top-down hero is your original plasma
waveform; once the camera tilts, it resolves into rolling ocean waves.

```
sea/
├── journey.ts        THE SITE: stops, beats (camera shots), timing → keys, panel windows, nav
├── world.ts          the world: plasma constants, ocean waves, groundswell, regions, beacons, CPU mirrors
├── chart.ts          the map: one territory per section, one plot per sub-detail (Voronoi sites)
├── detours.ts        side trips off the journey: dossier coves, the archive waters
├── timeline.ts       Shot / Camera types, Hermite sampling of the keys
├── shaders.ts        GLSL: scene (4 variants), cursor trace, resolve, glyph stamp
├── SeaEngine.ts      WebGL2 engine: passes, camera, pointer, ripples, adaptive quality
├── SeaCanvas.tsx     React wrapper (fixed canvas, events, theme, reduced motion) + seaStore
├── SeaExperience.tsx the page: panels bound to journey windows, deep links
├── hud.tsx           HUD chrome, telemetry, stop nav, transit labels, waypoint, map overlay
├── cards.tsx         the content cards (reads src/data/profile.ts + GitHub projects)
├── dossier.tsx       detour panels: a project's full dossier, the archive of every project
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
| 04 The Current | now (live roles, latest pushes, toolkit ticker) | `current`: fast streaming streaks |
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
   `mix(plasma, ocean + regions, shot.ocean)`. On the ocean the glyph follows the light
   (`shot.lit`): a camera-relative key light rakes across the waves, slopes exaggerated for
   shading only (`uRelief`), crests lifted, plus a fine moving chop texture. Distant water is
   filtered flat by cell footprint; marching is cone-stepped.
2. **Trace** (29 fragments): GPU port of the old field's cursor contour trace.
3. **Resolve** (per cell): glyph, colour, alpha: accents, trace, cursor glow, chart, beams,
   particles, quiet zones behind text, glitches.
4. **Glyph** (per pixel): stamps the atlas. Cheap at any resolution.

**Accents move with the water.** On the plasma they ride its flow (as on the old field). On
the ocean, lime is foam: a thin line along each crest of the dominant wave train (computed
from that train's phase, so it travels exactly with the crests), broken up by noise drifting
at the waves' phase velocity. Warm is sparse sun glints flickering across the faces.

**Beams** (`updateBeams` in the engine): only the waypoint you're heading to / at has one.
It falls out of the sky as you scroll toward it, strikes the water as you arrive (ripple +
ring of light + flash, in the beacon's accent), settles into a short standing beam and fades
once you leave. Detours get one too.

**The map** (`chart.ts`): a warped Voronoi over sites placed where the journey visits each
piece of content. A section's plots together form its territory; the resolve pass draws
coasts `~`, section borders `-` `|` `/` `\`, dotted plot borders, and `+` graticule marks.
`MapOverlay` labels sections and plots and places the labels so they don't collide.

**Shader compile.** Only the hero variant (no raymarch: it hits the plane directly) and the
small passes compile up front; the ocean / dive / underwater variants compile in the
background (`KHR_parallel_shader_compile`, or deferred until the hero has painted). Loop
bounds are uniforms (`uSteps`, `uNReg`, `uThree` …) so ANGLE's HLSL compiler (Windows
Chrome / Edge / Firefox) can't unroll them: unrolled, the old shaders froze the first ~15 s.
Dev logs `[sea] scene/N ready in … ms`; `?sea-sync` simulates no background compile.

## Detours

Project "full dossier", "Latest pushes" in The Current, and the HUD "Projects" link no
longer leave the page: the camera lifts off the scroll path and swoops out to a side area
(`detours.ts`): a cove beside the project's waypoint, or the archive waters for every other
repo. A beam strikes there, and the dossier / archive opens over the sea. Scrolling is
paused; Esc, the return button or browser Back fly back to exactly where you were. Deep
links: `/#dossier/<repo>`, `/#archive`.

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
| Swell shape / sets | `SWELLS`, `SWELL_ALONG` in `world.ts` |
| Wave relief in shading | `uRelief` (`SeaEngine.ts`), light direction in `updateCamera` |
| Beam timing / size | `updateBeams` (`SeaEngine.ts`) |
| Map layout | `CHART_SITES`, `CHART_REACH` (`chart.ts`); camera `MAP` in `journey.ts` |
| Dossier locations | `waypointDetour`, `archiveDetour`, `ARCHIVE_AT` (`detours.ts`) |
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
- Dev console: `__sea` (engine), `__sea.debugDump(4, 2)` (scene as text), `__sea.debugCells(2, 1)`
  (final frame as text: glyphs, `L`/`O` accents), `__sea.debugTrace()`,
  `__sea.profile = { scene: 0, trace: 0, ascii: 0 }` (per-pass GPU ms), `__seaBeats` (arrivals).
