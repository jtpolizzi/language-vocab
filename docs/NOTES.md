# Vocab Mini-App Notes (v2.15.1)

> **Purpose & scope** – living snapshot of the product: what features exist today, how they behave, and which improvements we’re considering next. Implementation details and release-by-release histories live in `ARCHITECTURE_PLAN.md` and `CHANGELOG.md` respectively.

## Snapshot
- SPA written in vanilla HTML/CSS/JS; routes driven via hash (`#/list`, `#/cards`, `#/match`, `#/choice`).
- Vocabulary loaded from `data/words.tsv` (preferred) or `data/words.json`, then normalized through `mapRaw()` into `State.words`.
- Global `State` persists filters, stars, weights, and UI prefs in `localStorage`; `subscribe()` notifies mounted views.
- Components live under `src/svelte/` and are mounted by `App.svelte`, so every view (and the shared top bar/settings modal) now runs through the same Svelte entrypoint.

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
- `State` fields: `words`, `filters`, `order` (shuffle), `ui` prefs, plus derived helpers in `src/state`.
- User progress lives under the `Prog` namespace (stars + weights) and syncs across all views.
- Filters and shuffle order survive reloads; resetting happens via Settings → “Reset filters & order”.

## Next Targets / Ideas
1. Progress export/import (JSON) for stars + weights.
2. Optional TTS button + auto-speak toggle on flashcards.
3. Enhanced filter UX (clear-all, select-all weights) and Edge sticky-header workaround.
4. Hosting story (GitHub Pages) and/or packaging as a simple PWA.

## Document Map
- **Architecture details** – see `docs/ARCHITECTURE_PLAN.md` for modernization phases, component conventions, and technical decisions.
- **Release history** – see `CHANGELOG.md` for version-by-version bullet points from v2.5 onward.

## Current Focus
- Tooling polish: now that the shared stores live under `src/state` and the legacy DOM helpers are gone, focus shifts to running `npm run check:svelte` (svelte-check) and broadening Svelte component tests/linting.
- Shared UI primitives (`ChipButton`, `WeightSparkControl`, `Popover`) are the baseline; future UI tweaks should extend those components instead of reintroducing global CSS or vanilla DOM helpers.
