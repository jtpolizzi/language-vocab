# Vocab Mini-App Notes (v2.13.0)

## Snapshot
- SPA written in vanilla HTML/CSS/JS; routes driven via hash (`#/list`, `#/cards`, `#/match`, `#/choice`).
- Vocabulary loaded from `data/words.tsv` (preferred) or `data/words.json`, then normalized through `mapRaw()` into `State.words`.
- Global `State` persists filters, stars, weights, and UI prefs in `localStorage`; `subscribe()` notifies mounted views.
- Components live in `assets/components/` and mount/unmount via `mount*` helpers; shared top bar + settings modal stay resident.

## Current Views
### Word List
- Sortable table with sticky header and columns for ⭐, weight, Spanish, English, POS, CEFR, Tags.
- Filter/search chips in the shared top bar (Only★, Shuffle, Filters popover, Search, Settings).
- Filters offer multi-select for POS/CEFR/Tags/Weights plus quick clear; result count shown live.

### Flashcards
- Large center card plus persistent bottom nav (← counter →) with keyboard + touch parity.
- Click/tap center to flip; left/right tap zones or horizontal swipes move prev/next.
- Keyboard: ←/→ prev/next, Space/Enter/↑/↓ flip, `s` toggles star, digits `0`-`4` set weight.
- Top-right overlays expose ⭐ toggle, weight chips, and optional translation line tied to settings.

### Match & Multiple Choice
- Word Match pairs Spanish ↔ English tiles with progress tracking.
- Multiple Choice generates lightweight quizzes pulling from the filtered word pool.

## Data & Persistence
- `State` fields: `words`, `filters`, `order` (shuffle), `ui` prefs, plus derived helpers in `state.js`.
- User progress lives under the `Prog` namespace (stars + weights) and syncs across all views.
- Filters and shuffle order survive reloads; resetting happens via Settings → “Reset filters & order”.

## Recent Additions (v2.5 → v2.9)
1. Unified top bar + settings modal shared by every view.
2. Flashcard refinements: guarded controls, translation toggle, improved touch targets, keyboard helpers.
3. New learning modes (Match, Multiple Choice) alongside the list/cards staples.
4. TSV-first loading pipeline with JSON fallback plus better tag formatting.

## v2.10 Highlights
1. Word List tap-to-select: every pointer interaction on a row (including weight/star controls) now syncs the current word selection so other views stay in lockstep.
2. Shuffle/sort state hygiene: pointer suppression + focus restoration tweaks keep keyboard navigation sharp after sorting or randomizing.
3. Styling polish: refreshed accent tokens, spark icon usage, and darker chips for better contrast on the list/filters.

## v2.11.x Refinements
1. Word List layout overhaul so the entire top stack (header + filters + table head) stays fixed while only the rows scroll; shuffle order respected via dedicated scroll container.
2. Tightened spacing between the top bar, column headers, and list rows to match the Match/Choice views; table rows now slide neatly under the sticky header without “jumping”.
3. Flashcards regained their full-width sizing inside the new layout (`width: min(100%, 720px)`), preventing narrow cards when the body switches flex modes.
4. Body scroll locking now activates only while the list view is mounted, so Flashcards, Word Match, and Multiple Choice retain their original column/flow layouts.
5. Word List row selection moved into an explicit long-press mode: only when enabled do rows highlight and sync with flashcards, and a long-press on the selected row exits the mode.

## v2.12.x Cleanup Roadmap
1. Phase 1 (v2.12.2): remove the legacy weight-migration UI/logic and reset the localStorage prefix so upcoming changes start from a clean slate.
2. Phase 2 (v2.12.3): introduce canonical term keys (word + POS) for persisted progress, letting overlapping data files share stars/weights.
3. Phase 3 (v2.12.4+): deep architectural/code review with targeted refactors for state management, shared utilities, and event handling.
4. Step A (v2.13.0 in progress): TypeScript + Vite build landed; repo now lives at the root (`language-vocab`). Remaining work: tighten component typings and add linting/prettier.

### Phase 1 (v2.12.2 ✅ Completed)
- Removed the one-time “weight migration” helper from Settings now that every install picked it up.
- Swapped all `localStorage` keys to the new `lv:` prefix and aggressively purge the old `v23:` entries on load so future term-key changes start clean.

### Phase 2 (v2.12.3 ✅ Completed)
- Added canonical `termKey`s (normalized word + POS) to every word so multiple source files recognize the same vocab entry.
- Stars/weights now persist against the `termKey`, letting overlapping rows share user progress while table rows keep their original hashes for UI focus/shuffle.

### Phase 3 (v2.12.4 ✅ Completed)
- v2.12.4: finalized the store split by introducing a namespace-wide “Clear all saved data” action, dropped the JSON data fallback, and removed legacy sort/column migrations now that every device uses the modern schema.
- v2.12.4: Finished the Phase 3 refactors—state actions + event map, shared chip/popover helpers, TSV loader events with a toggleable debug panel, and a Vitest + happy-dom harness covering data, selectors, loader, and UI utilities.
- Architectural/code review complete; see `ARCHITECTURE_PLAN.md` for the modernization roadmap (TypeScript build → Svelte evaluation → potential migration).

### Step A (v2.13.0 🚧 In Progress)
- Vite + TypeScript build added (`npm run dev` / `npm run build`) with app code converted to `.ts` modules and shared interfaces for state/data/utilities.
- Vitest suites now run against the TypeScript sources; loader events + UI helpers have direct coverage.
- GitHub Pages workflow added to build and deploy from `dist/`. Repo root now matches the deployed app (no nested `language-vocab/`).
- TODO: remove `@ts-nocheck` from components, introduce ESLint/Prettier, expand component tests.

## Next Targets / Ideas
1. Progress export/import (JSON) for stars + weights.
2. Optional TTS button + auto-speak toggle on flashcards.
3. Enhanced filter UX (clear-all, select-all weights) and Edge sticky-header workaround.
4. Hosting story (GitHub Pages) and/or packaging as a simple PWA.
