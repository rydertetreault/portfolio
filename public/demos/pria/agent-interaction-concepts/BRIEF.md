# Agent Interaction Concepts — build brief

Goal: 5 standalone demo pages showing Zapier/n8n-style DIRECT MANIPULATION of
agent cards on the Living Map workspace canvas. The user picks one direction to
implement in the real prototype.

## Shared foundation

All files live in `prototypes/agent-interaction-concepts/`:
- `shared.css` — design tokens (dark theme). Use ONLY these CSS custom props
  for colors: --indigo --violet --blue-2 --cyan --success --warning --danger
  --bg --surface --surface-2 --surface-3 --border --border-soft --text
  --text-soft --text-faint --accent-text --radius --radius-sm --shadow.
- `data.js` — window.WS_PLANS / WS_ALL_AGENTS / WS_EVENTS mock run data.
- `_base-dag.html` — the working pan/zoom DAG canvas (plans → tasks → agents,
  cubic SVG edges, click-agent → inspector panel, live tickers). START FROM A
  COPY OF THIS FILE. Do not regress: pan/zoom, edge drawing, selection,
  tickers must keep working.

## Rules

1. Single self-contained HTML file per concept (inline <style> + <script>),
   referencing ./shared.css and ./data.js like the base does.
2. Keep the `embedded` iframe guard line and the cc-topbar header, but update
   the topbar: brand links to ./index.html, crumb names the concept, nav pills
   A–E link to ./concept-a-config-flip.html, ./concept-b-edge-palette.html,
   ./concept-c-run-controls.html, ./concept-d-data-mapping.html,
   ./concept-e-template-blocks.html (mark self as active).
3. Add a `.ws-explain` strip under the topbar (see base pages in
   ../workspace-concepts for markup shape): concept name + one-sentence pitch +
   a "Try:" hint listing the 2–3 interactions to attempt.
4. Everything is mock/simulated — no network. Interactions must FEEL real:
   animate state changes, push synthetic feed/ticker updates, etc.
5. Don't hijack pointer events: canvas drag must ignore presses on buttons,
   cards' interactive children, drawers, palettes (extend the existing
   `.closest()` guard).
6. Test your page loads without console errors: you can run
   `python3 -m http.server 3500` in the folder is ALREADY running (do not
   start another server). Verify with playwright if available at
   `~/synaps-skills/web-tools-plugin/scripts/browser/` or with
   `node -e` + jsdom-free checks, or at minimum `node --check` on the extracted
   script and a curl for 200.
