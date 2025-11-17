# Architecture & Modernization Plan

## 1. Current Modernization Status
- ✅ **TypeScript/Vite build (v2.13.x)** – repo lives at the root, strict typings + Vitest coverage are in place, and GitHub Pages deploys the Vite `dist/` output automatically (`npm run dev/test/build`).
- ✅ **Phase 3 review work** – state split, shared UI helpers, loader instrumentation, and the debug overlay are all landed.
- ✅ **Step B kickoff (v2.14.6)** – Svelte 5 + plugin integrated into Vite, the Word List/Top Bar/Flashcards/Word Match now run through Svelte with full parity, and the bridge pattern (stores + actions) keeps every view in sync with the existing state/actions.

## 2. Step B – Svelte Evaluation (in progress)
1. Rebuild representative views in Svelte using the existing typed store/actions to gauge DX/perf and bundle impact.
2. Keep the legacy implementations live until each Svelte view reaches parity so regressions are easy to spot.
3. Document findings (pros/cons, migration playbook) once the Word List + next candidates are solid.

**Key observations**
- Colocating TS/markup/styles drastically reduced iteration time; the store bridge avoided logic duplication.
- Duplicating CSS per component is acceptable short term, but we should plan how/when to retire the global rules once the legacy view is gone.
- Before each new view migration, align on a parity checklist (layout, typography, interactions, keyboard/touch, edge cases) and a store contract to minimize back-and-forth.
- Word List prototype showed parity without perf regressions; the Svelte rows reuse the existing store data, long-press + weight controls stay in sync with legacy logic, and per-row handlers trimmed the manual event plumbing.
- Remaining gaps: shared styling story (table styles live in both `assets/styles.css` + `.svelte`), lint/test coverage for `.svelte` files, and a standardized approach for scroll-lock + layout utilities once additional views migrate.
- Top Bar now runs through Svelte as well (shuffle/search/filter popover/saved sets/settings), so every view consumes the same bridge; next migrations can reuse that pattern while we decide when to extract shared chip/popover styles from the legacy CSS.
- Once a view is migrated and the legacy counterpart is gone, move its CSS out of `assets/styles.css` and into the `.svelte` file so each component becomes self-contained (Flashcards is first in line once Word List CSS is retired).

## 3. Step C – Conditional Svelte Migration (future)
If Svelte continues to prove out:
1. Plan the order of remaining view migrations (TopBar, Flashcards, Match, Choice, Settings) with shared store considerations.
2. Move view-specific styles into their `.svelte` files while keeping design tokens/global utilities centralized.
3. Ensure the final build still targets static GitHub Pages output (pure Vite build or SvelteKit static adapter if/when needed).

## 4. Active Cleanup Items
- Add linting/formatting coverage for the new Svelte files.
- Define/testing strategy for Svelte components (Vitest + `@testing-library/svelte` or similar).
- Remove the duplicated Word List CSS from `assets/styles.css` once the legacy view is retired.
