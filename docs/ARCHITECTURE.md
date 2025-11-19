# Architecture Blueprint

> Canonical guide for how the app is built today and how we should extend it tomorrow. Release notes live in `CHANGELOG.md`; day-to-day work lives in `docs/NOTES.md`.

## Core Stack & Build
- Svelte 5 single-page app served by Vite/TypeScript. Every route (Word List, Flashcards, Word Match, Multiple Choice, Settings) mounts through `src/App.svelte`.
- `src/state` owns the singleton store (filters, deck order, UI prefs) plus derived readable stores (`wordListStore`, `flashcardsStore`, etc.). All new features should either extend the store or build their own derived readable to avoid ad-hoc globals.
- Static data loader lives in `src/data/words.ts` and hydrates from `public/data/words.tsv`. Future data sources should slot into that module so App stays dumb.
- Build commands (`npm run dev/test/build`) and GitHub Pages deployment stay unchanged; keep the bundle static until a PWA/export story justifies SvelteKit.

## UI & Layout Conventions
- Each `.svelte` file owns its markup + styles. `assets/styles.css` only houses tokens (colors, spacing, typography) and truly shared shell rules (app header, body scroll locks).
- When designing new layouts, respect the sticky stack: App header at the top, then Top Bar (`panel--topbar`), then the scrollable view. Use `--stack-stick-offset` for any additional sticky elements so the stacking order stays predictable.
- Components intended for reuse (chips, weight control, popovers) live under `src/svelte/ui`. Build new shared primitives there instead of reverting to DOM helpers.
- Accessibility defaults: keyboard navigation, focus-visible styles, and high-contrast feedback states are required. New widgets should expose ARIA labels and avoid color-only signaling.

## Data & State Patterns
- Keep all state mutations inside `src/state/store.ts`; components call action helpers (e.g., `setFilters`, `setRowSelectionMode`). Type additions should extend `WritableState`.
- Derived stores (`wordListStore`, `topBarStore`, etc.) are the entry point for components. When adding a feature that needs a fresh slice of state, build a new readable in `src/state/stores.ts` instead of subscribing directly to `State`.
- For async data (TSV or future APIs), surface loader updates via the provided helper (`startWordsLoader`) so app chrome can keep a single status indicator.

## Tooling & Tests
- Run `npm run check:svelte` and `npm test` before merging. Add component-level Vitest suites for any complex interaction (Top Bar filters, Word Match board, etc.).
- ESLint/Prettier already cover `.svelte` and `.ts`; new lint rules should land in `eslint.config.mjs`.
- Prefer Testing Library (`@testing-library/svelte`) for UI tests rather than DOM helpers; it mirrors user interactions and keeps tests resilient.

## Active Focus / Future Work
- **Formatting polish** – The migration left some layout/sticky refinements (Word List headers, button alignments). Any new work should continue to consolidate formatting inside the owning component.
- **Component tests** – Add interaction tests for Top Bar, Flashcards gestures, Match and Multiple Choice option menus.
- **Export/import & TTS** – Next feature families (progress sync, speech) should hook into the shared store and data loader modules rather than bypassing them.

Use this doc as the design baseline; add new sections when we introduce non-obvious architecture decisions so future work stays cohesive.
