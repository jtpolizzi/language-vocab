# Vocab Mini-App Notes (v2.14.4)

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
4. Step A (v2.13.0 completed): TypeScript + Vite build landed; repo now lives at the root (`language-vocab`). Remaining work: tighten component typings and add linting/prettier.

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

### Step A (v2.13.0 ✅ Completed)
- Vite + TypeScript build added (`npm run dev` / `npm run build`) with app code converted to `.ts` modules and shared interfaces for state/data/utilities.
- Vitest suites run across state/data plus every UI view (Word List, Flashcards, Word Match, Multiple Choice, TopBar, Settings); linting/formatting handled via ESLint + Prettier.
- GitHub Pages workflow builds/deploys from `dist/`. Repo root matches the deployed app so local paths map 1:1 to production.
- All components now run typed (no `@ts-nocheck`) and the tooling is in place for future migrations/tests. Next up is Step B (Svelte prototype) to evaluate a framework migration.

### Step B (v2.14.4 In Progress)
- Added `svelte` + `@sveltejs/vite-plugin-svelte` to the Vite build and exposed a compatibility bridge (`wordListStore`) so Svelte components consume the existing typed store/actions.
- Introduced a dedicated Word List route (`#/list`) that now points to the Svelte implementation; the legacy view has been retired.
- Rebuilt the Word List UI in Svelte with feature/item parity (sorting, stars/weights, long-press row selection) driven by the existing store, and mirrored the vanilla styling so the two lists are visually interchangeable.
- Rebuilt the shared Top Bar in Svelte so shuffle, search, saved filter sets, weight/Facet toggles, and the settings modal all ride through the same store/actions while the rest of the views stay vanilla.
- Flashcards now run as a Svelte view: same filtered/shuffled cards, centered layout, sticky top-right star/weight controls, fixed bottom nav (`← Flip →`), progress slider, tap zones, swipe gestures, keyboard shortcuts, and `setCurrentWordId` sync so other views highlight the same word.
- Svelte 5 APIs are the default (using the `mount/unmount` helpers), so the evaluation reflects the latest ergonomics/perf expectations and we avoid legacy compatibility flags.
- Observation: colocating TS/markup/styles made small adjustments faster and easier to reason about; the store bridge kept logic de-duped, but duplicating CSS per component highlighted where we need a plan for shared tokens vs. view-specific rules.
- **Prototype takeaways (Word List)**
  - Rendering perf stayed flat (same store + DOM structure) but interaction latency improved because long-press + wheel handlers are scoped to each row instance instead of delegated through manual listeners.
  - Bridge store kept business logic centralized; all Svelte-specific work was view code + DOM orchestration, so the migration risk stayed low.
  - DX wins: slotting TS + markup together reduced “jumping between files,” and Svelte’s declarative class toggles made column-visibility + selection states trivial.
  - DX pain: duplicated CSS is already unwieldy—need a plan to share tokens/mixins or move canonical table styles during the next view migration.
  - Testing gap: no component-level tests exist; before more Svelte views land we should pick a Vitest + `@testing-library/svelte` story or similar.

## Next Targets / Ideas
1. Progress export/import (JSON) for stars + weights.
2. Optional TTS button + auto-speak toggle on flashcards.
3. Enhanced filter UX (clear-all, select-all weights) and Edge sticky-header workaround.
4. Hosting story (GitHub Pages) and/or packaging as a simple PWA.
