# Public Praxis demo

The Praxis story site is served at `/demos` via Next.js rewrites, independent of
the portfolio's React layout. It replaces the earlier concept lab.

- `/demos` — story page (the Praxis home page concept)
- `/demos/company` — company page
- `/demos/pria` — bundled PRIA prototype (linked from the story page)

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

- The live "Chat with Pria" panel needs the local PRIA bridge (staging sign-in),
  so on the public site it shows as offline.
- Links that formerly opened the local PRIA bridge open the bundled prototype.
- Links to pages that are not part of the demo show a concept-only notice
  instead of navigating into the portfolio.
- No authentication or privacy protection is configured.

Deploy through the portfolio's normal Vercel/Git workflow. A local build alone
never publishes these URLs.
