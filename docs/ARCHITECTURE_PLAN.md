# Architecture & Modernization Plan

> **Purpose & scope** – canonical reference for how the app is built: modernization phases, technical decisions, component conventions, and tooling/test strategies. Product snapshots and release history live in `docs/NOTES.md` and `CHANGELOG.md`.

## 1. Current Modernization Status
- ✅ **TypeScript/Vite build (v2.13.x)** – repo lives at the root, strict typings + Vitest coverage are in place, and GitHub Pages deploys the Vite `dist/` output automatically (`npm run dev/test/build`).
- ✅ **Phase 3 review work** – state split, shared UI helpers, loader instrumentation, and the debug overlay are all landed.
- 🚧 **v2.14 – Svelte migration** – Svelte 5 + plugin integrated into Vite, every user-facing route now runs through a Svelte component backed by the shared store/actions, and the remaining work targets CSS colocation + tooling/tests so the legacy DOM/CSS can be retired cleanly.

## 2. v2.14 – Svelte Migration (in progress)
1. Finish migrating every route (Word List, Top Bar, Flashcards, Word Match, Multiple Choice, Settings) onto Svelte while keeping the shared store contract intact. ✅
2. Pull view-specific CSS (`wordlist`, `topbar`, `chip`, `popover`, cards, match board, etc.) out of `assets/styles.css` and colocate it with the owning `.svelte` file while leaving tokens/utilities global. ✅ (global stylesheet now holds only tokens/app chrome/shared primitives.)
3. Expand lint/test/tooling coverage for `.svelte` files so the new stack is first-class (ESLint/Prettier rules, Vitest + `@testing-library/svelte` harness).
4. Capture migration lessons (perf, DX, bundle impact) inside NOTES/HANDOVER to guide future enhancements.

**Key observations**
- Colocating TS/markup/styles drastically reduced iteration time; the store bridge avoided logic duplication.
- Duplicated CSS used to be the main pain point; now that view-specific rules live beside their components we can keep `assets/styles.css` limited to design tokens, layout chrome, and shared primitives.
- Before each new view migration, align on a parity checklist (layout, typography, interactions, keyboard/touch, edge cases) and a store contract to minimize back-and-forth.
- Word List prototype showed parity without perf regressions; the Svelte rows reuse the existing store data, long-press + weight controls stay in sync with legacy logic, and per-row handlers trimmed the manual event plumbing.
- Remaining gaps: shared styling story (table styles live in both `assets/styles.css` + `.svelte`), lint/test coverage for `.svelte` files, and a standardized approach for scroll-lock + layout utilities once additional views migrate.
- Top Bar now runs through Svelte as well (shuffle/search/filter popover/saved sets/settings), so every view consumes the same bridge; CSS/shared styles are the only legacy pieces left.
- Once a view is migrated and the legacy counterpart is gone, move its CSS out of `assets/styles.css` and into the `.svelte` file so each component becomes self-contained (Flashcards + Match board CSS are next to extract).

## 3. Post-migration polish (future)
1. Trim any leftover legacy helpers once CSS colocation lands (scroll locks, DOM-specific utilities, dead component mounts).
2. Layer ESLint/Vitest enforcement for `.svelte` files into CI and add representative component tests (Top Bar, Flashcards interactions, etc.).
3. Keep the final build as a static Vite bundle (no SvelteKit adapter needed yet) but revisit once we have PWA/export work in scope.

## 4. Active Cleanup Items
- Add linting/formatting coverage for the new Svelte files.
- Define/testing strategy for Svelte components (Vitest + `@testing-library/svelte` or similar).
- Remove the duplicated Word List CSS from `assets/styles.css` once the legacy view is retired.

## 5. Svelte Component Conventions
- **Local styles first** – every `.svelte` file owns the layout/visual rules for the DOM it renders. Keep styles inside the component’s `<style>` block (except for shared tokens/utilities) so markup + CSS travel together.
- **Semantic class names** – even though Svelte scopes selectors, pick names that match the component (`.choice-toolbar`, `.filters-grid`) and avoid references to other views (no “match” prefixes inside Multiple Choice, etc.).
- **Minimal inline styles** – reserve inline `style=""` attributes for true one-offs; anything multi-line or reused should become a class defined in the `<style>` block.
- **Global CSS = shared primitives** – `assets/styles.css` keeps only tokens, app chrome, and intentionally shared helpers (chips, weight spark, modal overlay) until those primitives are encapsulated as components.
- **Shared primitives graduate to components** – when multiple views share markup + behavior (chips, weight spark), wrap them in a dedicated Svelte component so both the HTML and CSS stay DRY and easy to evolve.
