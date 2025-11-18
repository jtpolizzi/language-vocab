# Changelog

All notable changes to this project are documented here. Older entries were consolidated from the historical notes so `docs/NOTES.md` can stay focused on the current product snapshot.

## v2.15.0
- Replaced the legacy DOM router with `src/App.svelte`, so hash navigation, loader state, and the settings modal now live entirely in Svelte.
- Deleted the interim `assets/components/*` mount wrappers and ported every test to mount the real Svelte components through Testing Library.
- Moved the shared state modules into `src/state` (exposing typed Svelte-readable stores) and updated docs to reflect the Svelte-first architecture.

## v2.14.9
- Introduced shared Svelte primitives (`ChipButton`, `WeightSparkControl`) so chip and weight controls no longer rely on global CSS.
- Normalized the Top Bar, Multiple Choice, and Word Match components by moving inline styles into their `<style>` blocks and colocation their view-specific CSS.
- Added documentation scope sections plus this changelog to keep NOTES/HANDOVER/ARCHITECTURE focused.

## v2.14.8 – Svelte Migration (in progress)
- Added `svelte` + `@sveltejs/vite-plugin-svelte` to the build and exposed the store bridge so components consume the existing typed actions.
- Migrated Word List, Top Bar, Flashcards, Word Match, Multiple Choice, and the Settings modal to Svelte with feature parity.
- Observed DX wins (colocated markup/logic/styles, scoped event handlers) and flagged remaining gaps (CSS duplication, missing component tests).

## v2.14.7 – Settings & overlays
- Ported the settings modal, debug toggle, column selection, and reset/clear helpers into Svelte so every view now relies on the same component/event plumbing.
- Preserved the `#settings` hash route and Top Bar trigger while sharing the Svelte component logic.

## v2.14.6 – Multiple Choice migration
- Rebuilt the quiz experience in Svelte, reusing the filtered word pool + shared progress state, and retired the vanilla implementation.
- Maintained progress UI, answer feedback, keyboard shortcuts, and LS-backed prefs (size/direction/answers).

## v2.13.0 – Step A (TypeScript/Vite build)
- Converted the entire repo to TypeScript, added Vite for dev/build, and ensured GitHub Pages ships the `dist/` output.
- Added Vitest + happy-dom suites across data, state, and UI views; linting via ESLint + Prettier; removed `@ts-nocheck`.

## v2.12.4 – Phase 3 cleanup
- Finalized the state split with namespace-wide “Clear all saved data”, removed the JSON fallback, and deleted legacy sort/column migrations.
- Added shared chip/popover helpers, TSV loader instrumentation with a toggleable debug panel, and broadened Vitest coverage.

### v2.12.3 – Phase 2
- Introduced canonical `termKey`s (normalized word + POS) for persisted progress so overlapping data sources share stars/weights.
- Table rows retain their original hashes for UI focus/shuffle while progress syncs against the shared key.

### v2.12.2 – Phase 1
- Removed the one-time “weight migration” helper from Settings after every install picked it up.
- Reset all persistence keys to the `lv:` prefix and purged the old namespaces so future schema tweaks start clean.

## v2.11.x
- Overhauled the Word List layout so the top stack stays fixed while rows scroll; shuffle order respected via a dedicated scroll container.
- Tightened spacing to match other views, restored Flashcards full-width sizing, and revamped scroll locking per route.
- Added a long-press row selection mode and restored smooth keyboard navigation after sorting/shuffling.

## v2.10
- Made every row interaction sync the current word selection, keeping views in lockstep.
- Hardened shuffle/sort state (pointer suppression + focus restoration) and refreshed styling (accent tokens, spark usage, chip contrast).

## v2.5 → v2.9
- Unified the top bar + settings modal across every view.
- Shipped flashcard refinements (guarded controls, translation toggle, better touch targets, keyboard helpers).
- Added Word Match + Multiple Choice modes alongside the list/cards staples.
- Switched to a TSV-first loading pipeline with JSON fallback and improved tag formatting.
