# Handover Notes – v2.13.0

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.

## Outstanding Step A Items
1. **TypeScript strictness** – remove `// @ts-nocheck` from component files and add explicit props/types. Suggested order: WordList → TopBar → Flashcards → Match → Choice → Settings → WeightControl.
2. **Tooling polish** – add ESLint + Prettier configs once the TypeScript conversions settle.
3. **Docs/testing** – continue expanding Vitest coverage (components/event helpers) and keep NOTES/ARCHITECTURE in sync when Step A completes.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
Focus on Step A conversions (typed components) and introduce linting. Once components are typed and tests cover the critical flows, mark Step A complete in NOTES/ARCHITECTURE and plan Step B (Svelte eval).
