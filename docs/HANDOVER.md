# Handover Notes – v2.14.0

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.
- Step B kicked off: Svelte (+ plugin) is now in the toolchain with a `#/svelte-list` route and a state-bridged Word List prototype that shares the existing store/actions.

## Upcoming Step B Items
1. **Render the Svelte table** – bring the filtered/sorted rows into the prototype, then layer sorting controls, star/weight toggles, and row-selection parity.
2. **Document findings** – record DX/perf learnings from the prototype in NOTES/ARCHITECTURE to guide the go/no-go decision.
3. **Tooling follow-ups** – if Svelte becomes permanent, extend ESLint/Prettier/Vitest configs accordingly; otherwise continue vanilla cleanups once the evaluation wraps.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
Continue Step B by rendering the Word List table in Svelte (using the new store bridge), then note early DX/perf impressions for the docs.
