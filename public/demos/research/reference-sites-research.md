# Reference Site Research — Praxis AI Demo Site

Researched 13 sites. Grouped into (A) direct competitors / product-adjacent and (B) pure animation/design inspiration.
Each entry: what it is → stack → the specific patterns worth stealing → how it maps to Praxis.

---

## A. PRODUCT-ADJACENT (digital humans / conversational AI)

### 1. Convai — convai.com
**What:** Conversational 3D AI characters for games/XR.
**Stack:** Webflow + Lenis smooth scroll + Swiper + Lottie + Rive + Three.js. Black bg, neon accents (#36E36E green, #FF5CE1 pink, #46F3FF cyan, #CFFF73 lime).
**Patterns:**
- Hero with masked media (`h-hero__mask`) + "Scroll to discover" cue + numbered use-case slider (01/03, 02/03…)
- **Manifesto section** — giant h2 statement ("We humans understand the world through our body…") as a full section
- **3-step "How it works" with progress rail** (`h-visual__steps-progress`) — Craft Mind → Embody → Deploy, 1/3 2/3 3/3 counter
- **"Meet Jake" featured character card** — "Created by X / Start Experience" — single-character spotlight
- **3-column vertical marquee** (`h-marquee__col`, `--bottom` reverse direction) of character images with hover info overlay
- Parallax images inside feature cards (`h-features__image-parallax`)
- Animated SVG path Lottie ("Convai-path-animated-easing") — a line that draws between sections
- "Omnichannel" numbered grid (Websites 01 … AR 06)
- Big numbered use-case chapters (01. / 02. / 03.) each with its own h1
**→ Praxis:** Twin carousel → vertical multi-column marquee of twins. "Meet Jake" → "Meet Digital RAI" spotlight. 3-step rail → "Capture → Govern → Deploy" twin creation.

### 2. D-ID — d-id.com
**What:** AI video + interactive avatars (closest feature-set competitor).
**Stack:** WordPress (custom theme) + Swiper + Lottie + Three.js + HubSpot. Dark bg (#090604) w/ orange accent (#FF882E). Fonts: Manrope + Libre Franklin.
**Patterns:**
- **Vertical tabbed content block** (`b-tabbed-content`) — 6 personas (Marketing / Creators / L&D / Sales / Devs) with icon nav on left, media swaps on right
- **Accordion capability list** (12 items) — "Core capabilities" where opening one reveals description + media
- Heavy video use (290 `<video>` refs) — avatars talking in-loop as background media
- Trust strip → capability accordion → product trio → persona tabs → integrations → enterprise trust (Privacy/Security/Ethics/Support) → "Natural User Interface" closer
- Mega-menu nav with product/solution/tech/company columns
**→ Praxis:** Persona tabs = "For the Expert / Organization / Educator / Government". Accordion = "Nine Pillars of Middleware". Enterprise trust quad = PraxisShield / IP Vault / SOC2 / Audit.

### 3. Tavus — tavus.io
**What:** "Human computing" — real-time face-to-face AI PALs. Best brand voice of the set.
**Stack:** Webflow + GSAP ScrollTrigger + Typed.js + Swiper + Rive. Near-black bg (#140206) w/ pink/coral (#FB6182, #FFB4C5) + electric blue (#4D65FF). Monospace labels.
**Patterns:**
- **Typed.js word rotation in headline** — "What if you could talk to your computer like a [friend / coworker / …]"
- **"Speak with Charlie" live face-to-face video CTA** in hero — the product IS the hero
- **Account-type chooser modal** (Developer vs PALs) — two-card fork on "Get started"
- ALL-CAPS mono eyebrow labels ("FACE-TO-FACE VIDEO", "GENERATE MORE REVENUE") above every card
- **Use-case card grid** with eyebrow → category → narrative sentence (not bullet points)
- **Models section** — Phoenix [4], Raven [1], Sparrow [2] with bracketed version numbers and a poetic role label ("The Eyes and Ears", "The Rhythm")
- Hover color-shift cards (`color_card-hover-wrap`, `is-hover`)
- Section rhythm: Hero → logos → use cases → products → manifesto → models → CTA → careers
**→ Praxis:** Typed rotation: "Your expertise. [Preserved / Amplified / Scaled]." Named-tech section: "IP Vault™ / PraxisShield™ / Middleware" with bracketed labels. Live twin chat in hero ("Talk to Clarkey").

### 4. Inworld — inworld.ai
**What:** Realtime voice AI infra for consumer apps.
**Stack:** Next.js + Sanity CMS + Rive. Clean white/light, mono accents, deep green (#1B382A).
**Patterns:**
- **Price-comparison stat wall** — "$100 → $12.50" pairs with strikethrough-style before/after counters ("Every layer, against the alternative")
- **Customer status ticker** — "reached 1M users in 19 days" / "powers voice-first companions at scale" scrolling proof-points
- **Testimonial wall** with 7 long-form quotes, name + title + company
- Feature list with bolded lead phrase ("#1 Realtime TTS Quality", "Voice cloning", "200+ languages") + one-liner
- Vertical-tab product switcher (TTS / Realtime API / STT / LLM Routing) + industry switcher
**→ Praxis:** "Proof, Not Promises" → before/after pairs: "20% → 70% engagement", "Generic AI → Human-First". Status ticker of twin milestones.

---

## B. DESIGN / ANIMATION INSPIRATION

### 5. Linear — linear.app
**What:** The benchmark for dark, precise SaaS design.
**Stack:** Next.js, Inter Variable, pure CSS modules. Bg #08090A, text #E2E4E7, accents pink #F79CE0 / cyan #55CDFF.
**Patterns:**
- **Product-UI-as-hero** — an actual rendered app screenshot (issue view, activity feed, agent messages) instead of a stock image; feels alive
- **Grid loader / gridline system** (`_gridline`, `_gridLoader`, `grid-dot-4-4-pong`, `grid-dot-4-4-agent`) — a subtle dot-grid that animates (pong, up/down) as decoration
- **Glow + edge-glow** (`MwJdiW_glow`, `Fzcv4W_edgeGlow`) on cards — soft radial highlights that respond to hover
- **Background blur** (`gHBLUR` ×16) — layered blurred blobs for depth
- **Logo marquee** (`marqueeItem` ×14)
- **"Fig 0.1 / 0.2 / 0.3"** scientific-figure labeling of feature illustrations
- **Carousel cards w/ illustration** (`carouselCard`, `carouselIllustration`)
- Headline that collapses responsively: 4-line → 2-line → 1-line (three variants in DOM)
- Sparse copy, heavy whitespace, 1px borders, everything on a 4px grid
**→ Praxis:** Dot-grid background + glow cards for the "4 Pillars" section. "Fig." labels for architecture diagrams (Presentation/Middleware/Integration layer). Real dashboard-as-hero for the LXP page.

### 6. Mercury — mercury.com
**What:** Fintech; the standard for editorial, premium, illustrative motion.
**Stack:** Next.js, GSAP, Three.js. Off-black/indigo (#272735), warm neutral surfaces, serif+sans pairing.
**Patterns:**
- **Mega-menu with descriptions** — every nav item has a one-line subtitle
- **Hero with inline email capture + "Launch demo"** — interactive demo is a first-class CTA
- **Long-scroll narrative with punchy section headlines**: "Banking's been a headache. Now, it's a head start." / "Get started fast. And never stop moving."
- **Feature rows: headline + one sentence + product screenshot** with scroll-linked reveal (142 video elements — UI micro-demos as looping video)
- **Big-quote breaker** — single testimonial at huge size mid-page (Supabase CEO)
- **Stat quad**: 300K+ / 1 in 3 / $20B+ / 4.9
- Product screenshots that "float" with parallax and soft shadows
- Testimonials grouped by segment (SaaS / Ecommerce / Agency)
**→ Praxis:** Big-quote breaker for Ray Kurzweil. Stat quad for Proof section. Testimonials segmented by Education / Sports / Enterprise.

### 7. Join Talent — jointalent.net
**What:** RPO agency; corporate but with rich motion.
**Stack:** WordPress + Tailwind + Lottie + Rive + HubSpot. Blue (#1863DC) + purple (#B457F4) on dark (#212121).
**Patterns:**
- **Word-by-word hero reveal** (`word-part`) — "Where Talent / Meets / Innovation" split animation
- **Horizontal scroll section** (`horizontal-scroll-section`) — services slide sideways while page scrolls vertically
- **Stacked Lottie containers** (`lottie-stack-container`) — layered animated illustrations
- **Scroll-reveal groups** (`scroll-reveal-title / -description / -cta`) — staggered entrance per block
- Sticky sidebar + "Scroll for more" cue
- Team grid (12 people), then Clients / Awards / Accreditations logo bands
- Period-stopped headings: "Smart. Scalable. Strategic." / "How. It. Works." / "Our. Team."
**→ Praxis:** Horizontal scroll for Solutions (Middleware → Twin → LXP → Shield). Word-split hero for "Human-First in an AI-First world."

### 8. Shopify Editions Winter '26 — shopify.com/editions/winter2026
**What:** Product-release "magazine" — best-in-class long-form scroll storytelling.
**Stack:** Custom, Lenis smooth scroll, **Rive (1159 refs, 15+ .riv files)**, Spline 3D (320 refs), Tailwind. Deep purple (#1C004F) + violet (#7126FF), custom typeface.
**Patterns:**
- **Chapter navigation** — left rail (Sidekick / Agentic / Online / Retail / …) that tracks scroll position, plus previous-Editions switcher
- **One Rive animation per feature** — every product update has its own interactive illustration (pulse, flow, themes, dev dash…) that plays on scroll-into-view
- **Snap-scrolling horizontal carousels** (`snap-x snap-mandatory snap-center`)
- **Parallax "cloud cards"** (`cloud-card-parallax`)
- **Command palette / slash-command list** ("/editions", "/seo-optimization"…) as an interactive component
- **Prompt chips** — example prompts rendered as clickable pills
- Sticky section headers (h3) with h4 sub-features scrolling beneath
- Hierarchy: Edition title → theme name ("The Renaissance Edition") → 150+ updates in chapters
**→ Praxis:** Chapter rail for the long homepage. Rive/Lottie per-pillar illustrations. Prompt-chip list = "Ask a Twin: 'Explain CTE risk in youth football'". Editions-style page for Innovation Hub / product releases.

### 9. DappaSol "The Paper Pitch" — dappasol.com/film  ⭐ MOST UNIQUE
**What:** Agency site where "the website is the pitch" — a scroll-scrubbed hand-drawn film.
**Stack:** Vanilla + **GSAP ScrollTrigger + ScrollToPlugin + Draggable**, canvas. Paper cream (#FBF6EA), burnt orange (#E0592B), green (#3E9B4F). Fonts: Instrument Serif + Inter Tight + Space Mono.
**Patterns (from reading film.js):**
- **Scroll = video timeline** — 679-frame image sequence drawn to `<canvas>`, scrubbed LINEARLY by scroll via a single GSAP timeline (`scrub: 0.9`), spacer height = `TOTAL_T * 30vh`
- **Hold windows** — copy for each of 9 "slides" fades in only inside time-windows (`WINS[]` with `LEAD`/`TAIL`), no crossfades
- **Word-wrapped headline reveal** (`wrapWords`) + **scroll-typed subtitles** ("the line writes itself as you scroll, and un-writes on reverse")
- **Interactive props inside the film**: draggable magnifier loupe over the artwork, hover-to-extinguish fires, drag scraps into a funnel, count-up stats, frame-drop, confetti burst
- **Custom cursor** that grows on interactive targets; **magnetic buttons** (pointermove offsets)
- **Hairline progress bar** (`scaleX(progress)`) + "scroll the pitch / skip the pitch ↓" cue + "01 / 09" slide counter
- **Velocity-aware** (`self.getVelocity()`) — effects change with scroll speed
- `prefers-reduced-motion` → static stacked fallback; touch → different focus point per slide
- Closes with "The reel" (draggable frame strip) and "The menu" (numbered ITEM 01–04 matching the pitch)
**→ Praxis:** The ultimate storytelling format: "This website is a Digital Twin demo." Scroll-scrubbed sequence showing expert → capture → twin → deployed. Draggable "IP Vault" lock, hover-to-govern hallucinations (fires → extinguish), drag knowledge scraps into the twin.

### 10. Omega ClearSpace — omegawatches.com/world-of-omega/sustainability/clearspace
**What:** Award-winning brand storytelling page (ClearSpace-1 space-debris mission). *Site blocks non-browser fetches (Akamai) — described from known references.*
**Patterns:**
- **Full-bleed pinned video/3D scenes** that scrub with scroll (space → satellite capture → Earth)
- **Cinematic chapter structure** with numbered acts and a persistent side progress indicator
- **Large serif/display typography** fading in over dark imagery, text tracked out
- **Horizontal timeline** of mission milestones
- Sticky image with scrolling text column (image swaps per text block)
- Slow, weighty easing — everything moves like it has mass
**→ Praxis:** The Ray Kurzweil "Digital Legacy" section as a cinematic chapter. Mission timeline = Praxis history (Clemson origins → Stevie Gold → Geneva 2026).

### 11. Manual Labor Studio — manual-labor.com
**What:** Brand studio; playful, personality-driven.
**Stack:** Webflow + 13 Lottie animations + Plyr video + Google Optimize. Mint (#A5FFD6) on navy (#000033), cream (#FCFAF7).
**Patterns:**
- **Lottie-driven UI details** — nav hover ("Nav Over.json"), scribbly underline ("Green Line Scribbly.json"), intro animation, "say hello" wave
- **Sticky project headers** (`sticky-item-header-and-link`, `sticky-wwwd`) — service title pins while its case study scrolls
- **Slide-out navigation** (`navigation---slide-out`) full-screen overlay
- "Do Great Work With Good People" — 2-line brand statement as hero, no subtitle
- Services × case-study pairing: each service card immediately followed by one proof project (Boomi $4B exit, Spotify, Alef)
- Bright single accent color on dark, hand-drawn feel
**→ Praxis:** Scribble-underline on key words ("Human-First"). Service+proof pairing: Middleware ↔ Avaya, LXP ↔ Notre Dame, Twin ↔ Ray Kurzweil.

### 12. env.dev — env.dev
**What:** Developer reference/tools hub. Minimal, utility-first.
**Stack:** Static (Cloudflare), PostHog. Strict CSP. Dark mono-heavy.
**Patterns:**
- **⌘K search** front and center in header ("Search tools, guides… Ctrl+K")
- **Live terminal block in hero** — `curl env.dev/ip` with real output (your actual IP shown)
- **Card grids of tools** with one-line descriptions and → arrows on every link
- "Recently updated" feed with date stamps; "Featured Series" 5-part stepper
- Split wordmark "env" + ".dev" in two colors
**→ Praxis:** ⌘K search across twins/courses/docs. Live "terminal" showing an actual API call to a twin (`curl api.praxis-ai.com/twin/clarkey`). Docs page layout.

### 13. Warp — warp.dev
**What:** Agentic dev platform. Technical, blueprint-style aesthetic.
**Stack:** Next.js + Rive + custom fonts (Matter Mono). Near-black (#0B0B0B, #1F1F1F), lavender (#C7AEFF), purple (#373245).
**Patterns:**
- **Keyboard-shortcut section nav** — `[S] SDLC  [Q] Quality loop  [E] Enterprise  [L] Layers  [G] Governance  [W] Warp everywhere  [F] FAQ` — press the key to jump
- **"[ fig. 1 — the factory ]" figure captions** on every visual (blueprint / lab-notebook vibe)
- **Live config file as hero visual** — `factory.yaml` with syntax highlighting and "live · applied to all 112 agents" badge
- **Numbered feature list 01–06** each with its own `[ fig. 2 · … ]` code/diagram
- **Multi-tab code sample** (cli / api / sdk / mcp) in one block
- **Dashboard-style stat cards** — eval scores, benchmark bars ("1.00x / 0.94x / 0.89x"), run logs with timestamps
- **Hover mega-menu** with "3 links / 7 links / 14 links" counts and one-line descriptors
- **Marquee logo set** (`cu-marquee-set`), stats-grid, all-lowercase labels
- `>_` prompt glyph as decorative motif
**→ Praxis:** Keyboard nav for the demo site itself. "fig." captions for architecture. Live `twin.yaml` config as hero visual for Middleware page. Governance dashboard mock for PraxisShield (audit log w/ timestamps).

---

## MASTER LIST — Animation & Interaction Patterns to Demo

### Scroll-driven storytelling
1. **Scroll-scrubbed image/video sequence on canvas** (DappaSol, Omega) — scroll = timeline
2. **Pinned section w/ text swapping** — sticky media, scrolling copy (Omega, Manual Labor, Shopify)
3. **Horizontal scroll section** inside vertical page (Join Talent)
4. **Chapter rail / progress indicator** tracking scroll position (Shopify, Omega, DappaSol hairline)
5. **Hold-window copy reveals** — content appears only in scroll ranges, no crossfade (DappaSol)
6. **Scroll-typed text** — sentence writes itself as you scroll, unwrites in reverse (DappaSol)
7. **Snap-scroll carousels** (Shopify)
8. **Parallax layers** — floating screenshots/cards at different depths (Mercury, Convai, Shopify)
9. **Velocity-aware effects** — skew/blur based on scroll speed (DappaSol)
10. **Smooth scroll** via Lenis (Convai, Shopify)

### Text animation
11. **Word-by-word / char split reveal** on headlines (Join Talent, DappaSol)
12. **Typed.js word rotation** in hero headline (Tavus)
13. **Count-up numbers** on enter (DappaSol, Praxis current, Mercury)
14. **Before/after value pairs** — old strikes out, new counts in (Inworld)
15. **Scribble/hand-drawn Lottie underline** on key phrases (Manual Labor)
16. **Responsive headline collapse** — different line breaks per breakpoint (Linear)

### Hover / click micro-interactions
17. **Custom cursor** that scales on interactive targets (DappaSol)
18. **Magnetic buttons** (DappaSol)
19. **Glow / edge-glow cards** following mouse (Linear)
20. **Color-shift hover cards** (Tavus)
21. **Lottie nav hover** (Manual Labor)
22. **Draggable props** — loupe/magnifier, drag-to-funnel, drag-through film strip (DappaSol)
23. **Hover-to-trigger state change** — extinguish fires (DappaSol)
24. **Keyboard shortcuts** for section jumping `[S] [Q] [E]` (Warp) + ⌘K palette (env.dev)
25. **Confetti / celebratory burst** on CTA (DappaSol)

### Layout / component patterns
26. **Vertical tabbed content** — persona nav left, media right (D-ID)
27. **Accordion feature list** w/ media swap (D-ID)
28. **Multi-column vertical marquee** of images, alternating directions (Convai)
29. **Logo marquee** (Linear, Warp, Praxis current)
30. **Numbered chapter/feature list 01–06** w/ figure captions (Warp, Convai, DappaSol)
31. **Big-quote breaker** — one giant testimonial mid-page (Mercury)
32. **Stat quad / stat wall** (Mercury, Warp, Inworld)
33. **Command-palette / slash-command list** & prompt chips (Shopify)
34. **Step progress rail 1/3 → 3/3** (Convai)
35. **Account/persona fork modal** — two-card chooser (Tavus)
36. **Mega-menu w/ descriptions + link counts** (Mercury, Warp, D-ID)
37. **Slide-out full-screen nav** (Manual Labor)
38. **Live code/config/terminal block as hero visual** (Warp, env.dev)
39. **Product UI as hero** — real rendered app state (Linear, Mercury)
40. **Service ↔ proof pairing** — each capability followed by one case study (Manual Labor)
41. **Manifesto section** — a single giant statement (Convai, Tavus)
42. **Multi-tab code sample** (Warp)
43. **Dashboard mock w/ logs, bars, timestamps** (Warp)
44. **Testimonials segmented by industry** (Mercury)
45. **Reel / draggable frame strip** closer (DappaSol)

### Visual style ingredients
46. **Dot-grid / gridline backgrounds** that subtly animate (Linear)
47. **Layered blur blobs** for depth (Linear)
48. **Bracketed labels** `[ fig. 1 ]`, `Phoenix [4]`, `>_` (Warp, Tavus)
49. **ALL-CAPS mono eyebrows** above cards (Tavus, Warp)
50. **Period-stopped headings** "Smart. Scalable. Strategic." (Join Talent) — Praxis already does "Preserved. Amplified. Scaled."
51. **Rive/Lottie per-feature illustrations** playing on scroll-in (Shopify, Manual Labor, Join Talent)
52. **Looping UI micro-demo videos** instead of static screenshots (Mercury, D-ID)
53. **Single neon accent on near-black** (Convai, Tavus, Linear, Warp) — matches Praxis' current dark palette w/ coral #FF6B4A / blue #4A7FFF / purple #9B59FF
54. **prefers-reduced-motion** fallback + touch-specific behavior (DappaSol) — must-have

---

## Recommended stack for the localhost demo site
- **Vite + vanilla HTML/CSS/JS** (or Astro) — fast, no framework lock-in, easy to lift into the real build later
- **GSAP 3 + ScrollTrigger + Draggable** — covers #1–9, 11, 13, 17–23, 25
- **Lenis** for smooth scroll
- **Typed.js** (or a 20-line custom) for word rotation
- **Lottie-web** for any hand-drawn accents; **Rive** optional
- **Montserrat + Manrope** (Praxis brand) + a mono (JetBrains Mono / Space Mono) for eyebrows/figs
- Dark theme w/ Praxis palette; each demo lives at its own route (`/demos/scroll-film`, `/demos/marquee`, …) plus a `/styleguide` page

## Suggested demo pages
1. `/styleguide` — colors, type scale, buttons, cards, eyebrows, glow cards, dot-grid
2. `/layouts/home-a` — Linear/Mercury style (product-UI hero, stat quad, big quote, logo marquee)
3. `/layouts/home-b` — Tavus/Convai style (typed headline, twin marquee, numbered chapters, models section)
4. `/story/twin-film` — DappaSol/Omega style scroll-scrubbed narrative w/ interactive props
5. `/interactions` — gallery: custom cursor, magnetic buttons, glow cards, word-split, count-up, before/after, scribble underline, confetti
6. `/components` — vertical tabs, accordion, horizontal scroll, snap carousel, chapter rail, ⌘K palette, keyboard nav, persona-fork modal, terminal block

---

## C. ADDED SEP 2026

### 14. Attio — attio.com (homepage, "Welcome to agentic revenue." · 2026)
**What:** AI-native CRM. The current benchmark for a *light*, product-led SaaS homepage with restrained, physics-free motion.
**Stack (probed live):** Next.js + Tailwind v4 + Base UI (navigation-menu, accordion) + Framer Motion. Fonts: Inter / Inter Display (600, leading .95, tracking −.02em), Tiempos Text (quotes), JetBrains Mono. Palette: white `#fff` / `#fafafb` primary/secondary, black-scale text, one blue `#266df0`, hairline `subtle-stroke`. Dark sections invert (`.dark`). Native scroll — no Lenis.
**Easing tokens:** `--ease-out-cubic: cubic-bezier(.33,1,.68,1)` (the default), `--ease-in-out-cubic: cubic-bezier(.65,0,.35,1)`, `--ease-emphasized-in-out: cubic-bezier(.2,0,0,1)`. Durations 150 / 250 / 300 / 500ms. Buttons: `transition-colors 300ms ease-in-out; hover:duration-50` (snap in, ease out).
**Motion signatures (the ones worth copying):**
- **Blur-in reveal** — every element enters from `opacity:0; filter:blur(1.5px)` (+ tiny translate) to sharp. Staggered 60–100ms. This replaces the usual y-slide everywhere.
- **Blue-glow settle** — product chips enter with `filter: blur(1.5px) drop-shadow(0 0 7px rgba(38,109,240,.55))` and the glow decays to nothing as they land ("Live from day one" board).
- **Hero choreography** — sticky headline block (`top: header`) + product window shell scaling `.98→1` on load; side "desktop windows" (call transcript, Slack, terminal agent) enter from the bottom corners with `blur(3px)`. On first scroll the hero sets `data-hero-scrolling`: headline blurs out (`blur(2.5px), opacity 0`, 300ms), all windows scale to `.95` while scrolling and relax to `1` when idle; a sticky radial "spotlight" behind shrinks (`scaleX 1→.57, scaleY 1→.75`) over the first ~450px. Background = radial blue gradient at the bottom + 1px/8px vertical pinstripes.
- **Nav popup** — one shared popup whose `--popup-width/height` transition (150ms in-out-cubic); panel contents swap **direction-aware**: `navigation-enter-from-left/right` = `opacity 0, blur(8px), translateX(±200px) → 0`; exits mirror. Starting style `translateY(-4px) opacity 0`.
- **Logo cells** — hairline grid (`gap:1px; bg: stroke`), mono logos via `mask-image`; cells cross-fade to another logo with blur on a timer.
- **Platform scrollytelling** — 6.5k px section: sticky full-height left rail (Build pipeline / Convert leads / …) tracking 5 stacked features; each feature = `h3` "strong sentence. <dim continuation>" + product window masked to the right (`mask-image: linear-gradient(to right, #000 38%, transparent)`) + floating chips + `h4` sub-feature.
- **"Universal Context™" dark stage** — pinstripes, huge 2-word heading, a 1728px conic-gradient **horizon disc** (blurred ring 10px @ .45 + sharp ring 2px + black disc) rotating via `@property` angle; five "It logs itself." / one-liner pairs.
- **Signals accordion** — 3 items, auto-advancing with a `scaleX` progress bar; the open item's copy expands with blur; canvas visual on the right, masked at both edges.
- **Connectivity** — dark rounded tiles (`linear-gradient(-30deg,#1c1d1f,#2e3238)`) scattered by % coordinates, section masked left/right.
- **"SDK. API. MCP."** — a 24×8 hairline cell grid with content placed *in* the grid.
- **Quote** — sticky 100svh, word-by-word scroll-scrubbed reveal, section pulled up `-mt-[100svh]` so it slides over the dark section before it.
- **Stats** — `border-l-2 blue` blocks, blur-in; vertical centre hairline.
- **Customer stories** — 4 logo tab cells with a sliding highlight; content swaps with blur.
- **Changelog cards** — snap-x scroller; each card has a 21-tick "ruler" whose ticks grow on hover with `transition-delay: calc(var(--idx) * var(--stagger))` and a colour gradient across the ticks.
- **CTA** — pinstripes masked by `radial-gradient(ellipse 70% 50%, transparent 35%, #000)`; email "Send me a demo" inline form.
**→ Praxis (`/v2/attio/`):** "Welcome to Amplified Intelligence™." Hero = live PRIA + Convo-Mode meeting / Slack twin / MCP terminal windows. The platform rail deliberately uses four **different, purpose-built interfaces** rather than repeating PRIA screenshots: Human-First Digital Twin™ = expert knowledge + voice studio; AI Middleware = private data/RAG/tools → governed router → 100+ model providers; LXP = adaptive journey + AI instructor + labs; PraxisShield™ = purpose policy + live audit trail + IP controls. "IP Vault™" horizon follows as the shared protected-knowledge foundation. Build = SDK · API · MCP on the Middleware. Quote = DeVry. Stats = statQuad. Stories = DeVry / T20 / ISO / Alabama State. Changelog = current Praxis platform capabilities.
