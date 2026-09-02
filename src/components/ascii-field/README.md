# ASCII plasma / topography background

Full-screen animated ASCII field behind the homepage. The default `hero` preset is a
refined "ASCII Plasma" (layered sines, as on asciiart.eu) bent by terrain noise and
quantized into grey elevation bands, so it reads as slowly flowing topographic
contours. A `clouds` preset (matched to the "ASCII Cyber Clouds 2" recording) is
also available.

```
ascii-field/
├── config.ts           global knobs: character sets, cell size, pointer, colours, perf
├── presets.ts          cloud parameters ("hero", "calm") + mobile overrides
├── noise.ts            3D simplex noise + fbm + cell hash
├── engine.ts           the simulation (framework-agnostic)
├── renderer.ts         WebGL2 instanced renderer + Canvas 2D fallback
├── AsciiBackground.tsx React wrapper: resize / pointer / theme / reduced-motion / scroll
└── index.ts
```

## Usage

Mounted once in `app/layout.tsx` so the canvas persists across routes. The preset is
picked per route (`routePresets`, longest prefix wins: `/` → hero, `/projects` →
projects, `/resume` → resume); routes outside the map render no canvas. On navigation
the field eases to the new preset and fires `engine.pulse(x, y)` — an expanding ASCII
shockwave from the click point.

```tsx
<AsciiBackground
  preset="hero"                          // see presets.ts
  quietZoneSelector="[data-ascii-quiet]" // elements that must stay readable (clouds go near-black behind them)
  config={{ pointer: { radius: 300 } }}  // optional overrides
/>
```

## How it works

1. **Lattice pass** – the field is evaluated on a coarse lattice (every
   `perf.latticeStep` cells). The *near* layer is domain-warped fbm; with `plasma > 0`
   a classic plasma (sines in x, y, diagonal, a travelling radial term and a
   distortion term) is sampled through the same warp and mixed in, so the bands
   flow like plasma but bend like terrain. A faint *far* layer adds depth haze for
   the cloud preset. The cursor pushes the sample coordinates outward and the whole
   field parallaxes slightly with it.
2. **Cell pass** – the lattice is bilinearly interpolated to every cell, the density
   is thresholded into masses, and a light from the upper-left shades each mass from
   its density gradient (bright lit edges, darker undersides).
3. **Draw pass** – brightness → glyph on `chars.ramp` (` .:+*#@`) with per-cell jitter;
   a few mid-density cells use contour-following texture glyphs (`_ / | \`); cells
   near the cursor use `< > ^ _`. With `levels > 0` the brightness is quantized into
   that many **elevation bands**, each a distinct grey and glyph (`.` `:` `+` `*` `#` `@`),
   so the field reads as stacked topographic layers. Colour follows "height": glyphs
   ramp from `--ascii-lo` (lowlands, dim grey) to `--ascii-hi` (peaks, light grey) across
   `colors.rampLo → rampHi`.
4. **Renderer** – every glyph is an instance in one WebGL2 draw call (measured 75 FPS
   at 2560×1440 on an RTX 2060; the Canvas 2D path was ~37 FPS at 1080p). Falls back to
   Canvas 2D atlas blits when WebGL2 is unavailable.

Scrolling (window and the homepage's inner panel) advances the animation
(`scrollTimeWarp`), so the clouds morph as you move through the page.

## Page transitions (`ascii-ui/PageTransition.tsx`)

Internal links to the two tabs are intercepted and choreographed with the *same*
field canvas (lifted above the page with an opaque backdrop layer underneath):

- **/projects — text corrupt → surge → wipe → decode** (the background field is
  never touched): the page's text degrades into symbols (450 ms) → a front sweeps
  across from the click side; characters surge into dense symbols and are blanked
  behind it, with element heights locked so nothing reflows (700 ms) → the route
  swaps while `html.ascii-arriving` hides the new page → the projects text starts as
  garbage and slowly decodes into place, left → right (1.8 s). Direct loads of
  `/projects` get the same decode via `<DecodeOnMount>`. Helpers: `ascii-ui/corrupt.ts`.
- **/resume — terminal collapse**: page + field squash CRT-style into a bright dot
  (`startFx("collapse")`, 360 ms) → a terminal types `ryder --open resume` and
  "executes" it while the route loads → the screen opens from the centre line onto
  the new page (`startFx("expand")`, 320 ms).

Add `data-no-transition` to a link to opt out; reduced motion navigates plainly.

## Common tweaks

| Want to…                         | Change                                                   |
| -------------------------------- | -------------------------------------------------------- |
| Different characters             | `config.chars.ramp` / `flow` / `pointer`                 |
| Plasma vs. clouds                | preset `plasma` (0 = noise clouds, 1 = pure plasma)      |
| Tighter / looser plasma bands    | preset `plasmaFreq`; `plasmaContrast` spreads the bands  |
| Plasma flow speed / warping      | preset `plasmaSpeed`, `plasmaDistortion`                 |
| Bigger / smaller features        | preset `scale` (lower = larger)                          |
| More empty sky / denser cover    | preset `threshold` (higher = sparser), `softness`        |
| Curlier / smoother shapes        | preset `warp`                                            |
| Faster / slower                  | preset `speed`, `driftX/Y`, or global `timeScale`        |
| Flatter / more 3D                | preset `shading`                                         |
| Number of elevation bands        | preset `levels` (0 = smooth/continuous)                  |
| Depth haze                       | preset `farAlpha`, `farScale`, `farThreshold`            |
| Cursor reaction                  | `config.pointer` (`radius`, `warp`, `glow`), preset `parallax` |
| Overall opacity                  | preset `brightness`                                      |
| Colours (lowlands → peaks)       | `--ascii-lo` / `--ascii-hi` in `globals.css`, `config.colors.rampLo/rampHi` |
| Darkness behind text             | preset `quiet` (0..1), `config.quietZone.padding/feather`; tag elements with `data-ascii-quiet` (optionally `="0.5"` for partial dimming behind frosted panels) |
| Glyph size / grid resolution     | `config.cell.fontSize`, `config.mobile.fontSize`         |
| Performance ceiling              | `config.perf` (`maxDevicePixelRatio`, `maxFps`, `octaves`, `latticeStep`, `adaptive`, `budgetMs`) |

## Behaviour

- `prefers-reduced-motion: reduce` → renders one static frame, no rAF loop.
- Pauses when the tab is hidden; rebuilds the grid on resize / DPR change; survives
  WebGL context loss (rebuilds the atlas on restore).
- Mobile: smaller grid, DPR ≤ 1.5, 30 FPS cap, larger features (`MOBILE_OVERRIDES`).
- Adaptive quality: if per-frame work stays above `budgetMs`, steps down
  (DPR 1 → larger cells → 30 FPS) so weak machines never stutter.
- In development the engine is exposed as `window.__asciiField` for live tuning, e.g.
  `__asciiField.setParams({ ...__asciiField.target, threshold: 0.6 })`;
  `__asciiField.backend` tells you which renderer is active.
