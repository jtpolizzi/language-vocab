# Architecture & Modernization Plan

## 1. Cleanup Status (v2.12.x)
- ✅ **Phase 1 (v2.12.2)** – Removed the legacy weight-migration helper and switched all `localStorage` keys to the `lv:` prefix while purging the old `v23:` entries.
- ✅ **Phase 2 (v2.12.3)** – Added canonical `termKey`s (word + POS) so overlapping data files share stars/weights; components now use `termKey` for persistence.
- ✅ **Phase 3 (v2.12.4)** – Completed the architectural/code review with shared state actions, event-driven components, common chip/popover helpers, loader events + debug panel, and a Vitest + happy-dom test harness.
- ✅ Repo restructure (v2.13.0) – `language-vocab` now lives at the repo root; Vite/TS build + Pages workflow deploy the app directly from `dist/`.

### Phase 3 Review Notes (working doc) (✅ Completed)
**State & persistence**

- `assets/state.js` now splits into `state/persistence.js`, `state/store.js`, and `state/selectors.js`. Store actions (`setFilters`, `setSort`, etc.) fan out through explicit events (`State.on('filtersChanged', …)`), so views update only when relevant data changes. Loader metadata (`State.meta.loaderStatus`) flows alongside hydrate events.

**Component boundaries**
- Every view mount returns `{ destroy }`, and `app.js` routes through a registry. Shared chip/popover helpers live under `components/ui/`, so TopBar, WordMatch, Choice, and Settings all consume the same DOM primitives. Word List still mixes rendering + gestures (future work when we move to TS/typed presenters).

**Effects & async work**
- TSV loading runs through `assets/data/loader.js`, emitting `loading/loaded/error` events. `app.js` shows a loading indicator/debug panel until data arrives, and the panel is toggleable in Settings. Long-lived components clean up timers/listeners inside their returned `destroy` handlers.

**Testing & instrumentation**
- A Vitest + happy-dom harness (`npm test`) covers state data mapping, selectors, loader events, and UI helpers. The debug overlay (opt-in via Settings) surfaces loader status and event counts for manual verification. Future TS work will expand coverage to typed modules/components.

## 2. Near-Term Modernization

### Step A – TypeScript + ES Modules (target v2.13.x)
1. Introduce a lightweight build (Vite + TypeScript) that outputs the same static assets for GitHub Pages.
2. Define types for `VocabEntry`, `TermKey`, `State`, `Prog`, etc., and convert existing JS files incrementally (`state.ts`, `components/*.ts`, utilities).
3. Keep the current DOM-driven UI while benefiting from type safety and clearer module boundaries.

**Status (v2.13.0 in progress)**
- Vite + TypeScript tooling is in place (`npm run dev`, `npm run build`, `npm run preview`). All state modules, shared UI helpers, loader, and tests now compile as `.ts` with shared interfaces.
- Repo root == app root, and the GitHub Actions workflow builds/deploys `dist/` to Pages automatically.
- Remaining work: convert the view modules from `// @ts-nocheck` to typed components, add ESLint/Prettier, and expand Vitest coverage.

**Implementation Plan (remaining work)**
- Conversion order
  1. Tighten typings for `assets/components/ui/*`, `data/loader`, and `state/*` (done).
  2. Convert view modules incrementally (WordList → TopBar → Flashcards → Match → Choice → Settings), replacing `@ts-nocheck` with typed props/events.
  3. Add ESLint/Prettier configs once TypeScript settles.
- Testing/Docs
  - Continue running `npm test` + `npm run build` after each conversion. Update `NOTES.md` once Step A fully lands.

### Step B – Svelte Evaluation (target v2.14.x)
1. Rebuild a single view (Word List) in Svelte using the typed stores to gauge ergonomics, bundle size, and complexity.
2. Document findings (pros/cons vs. vanilla) to decide whether a full migration is worthwhile.

### Step C – Conditional Svelte Migration (post-evaluation)
1. If Svelte proves valuable, plan a phased component migration (TopBar, WordList, Flashcards, Match, Choice, Settings).
2. Establish shared stores for global state, Drive/OPFS integration hooks, and PWA plumbing.
3. Ensure the build still emits static files for GitHub Pages (SvelteKit static adapter or Vite build).

## 3. Cross-Cutting Cleanup Items
- ✅ Complete the Phase 3 review with concrete recommendations (state organization, event handling, shared utilities, testing strategy).
- ✅ Consolidate naming (language-neutral field names, consistent module paths).
- Add linting/formatting + broader automated tests once the TS build is in place.

## 4. Version Milestones
- **v2.12.4+** – Publish the code-review findings and finalize Phase 3.
- **v2.13.x** – Land TypeScript + module build (Step A, in progress).
- **v2.14.x** – Prototype a Svelte view and decide on full migration (Step B).
- **v2.15.x+** – Execute the migration plan if approved (Step C), or extend the vanilla codebase with the review recommendations if not.
