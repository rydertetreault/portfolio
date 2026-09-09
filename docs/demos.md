# Public concept demos

The complete Praxis demo snapshot is served at `/demos` via Next.js rewrites,
independent of the portfolio's React layout. All 14 concept pages (v1 and v2),
the hub, assets, research link, and bundled PRIA prototype are included.

## Refresh the snapshot

From this portfolio repository in WSL:

```sh
node scripts/import-demos.mjs /home/ryder/PraxisAI/praxis-website/demo-site
npm run build
```

The source demo needs its npm dependencies installed. The importer builds in a
temporary directory; it does not change the original demo or copy credentials.
Commit `public/demos`, `scripts/import-demos.mjs`, `next.config.ts`, and this file.
Production builds use the committed snapshot and do not require the demo repo.

## Public behavior

- Embedded product captures work without localhost or authenticated staging access.
- Links that formerly opened the local PRIA bridge open the bundled prototype.
- The prototype is a design demo, not the authenticated production PRIA app.
- Unimplemented marketing links show a concept-only notice instead of navigating
  into nonexistent portfolio pages.
- No authentication or privacy protection is configured.

## URLs after deployment

- Hub: https://rydertetreault.dev/demos
- Original Shopify study: https://rydertetreault.dev/demos/shopify
- Branded Shopify concept: https://rydertetreault.dev/demos/v2/shopify

Deploy through the portfolio's normal Vercel/Git workflow. A local build alone
never publishes these URLs.
