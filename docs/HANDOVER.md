# Handover Notes – v2.14.1

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.
- Step B kicked off: Svelte (+ plugin) is now in the toolchain with a `#/svelte-list` route and a state-bridged Word List prototype that shares the existing store/actions.
- The Svelte Word List is now the default route (`#/svelte-list` / “Word List” nav item) while the legacy view lives under “Word List (Legacy)” for side-by-side comparisons.

## Upcoming Step B Items
1. **Render the Svelte table** – bring the filtered/sorted rows into the prototype, then layer sorting controls, star/weight toggles, and row-selection parity.
2. **Document findings** – record DX/perf learnings from the prototype in NOTES/ARCHITECTURE to guide the go/no-go decision.
3. **Tooling follow-ups** – if Svelte becomes permanent, extend ESLint/Prettier/Vitest configs accordingly; otherwise continue vanilla cleanups once the evaluation wraps.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
- Prep a parity checklist + work plan for the next Svelte migration target (likely Top Bar or Flashcards) before coding so we can avoid dozens of back-and-forth iterations. Checklist should cover layout constraints, typography, interactions (keyboard/touch), and edge cases.
- Agree on the store contract the new Svelte view will consume/emit and decide which shared styles remain global vs. move into the component.
- Once the plan is approved, implement the component in larger, deliberate batches (functionality first, styling second) and only then retire the duplicate CSS when the legacy view goes away.

### Svelte Top Bar – Parity Checklist & Store Contract
**Layout / visual**
- Preserve existing stacking order: fixed header → chip row → filters/search/accessory buttons; width constrained by `content` wrapper with responsive wrapping under 420 px.
- Typography: keep current font sizes (title 18 px, chip labels 14 px) and spacing tokens (8 px gap between chips, 16 px sections). Ensure SVG icons align vertically with labels.
- Sticky behavior + body scroll locking must match legacy (Word List locks body, other routes free scroll).

**Interactions**
- Keyboard: `Tab` order mirrors legacy (Only★ → Shuffle → Filters → Search → Settings); `Enter/Space` toggles chips, `Esc` dismisses filters popover or search focus.
- Pointer/touch: long-press on Filters chip should still open popover, swipe gestures stay scoped to Flashcards.
- Search retains input debouncing (150 ms), arrow keys move within text, `Cmd/Ctrl+K` focus shortcut remains.
- Filters popover parity: multi-select chips, clear buttons, live count updates, outside-click + `Esc` dismissal.
- Settings modal button triggers same mount helper; top bar updates global selection state when toggles change.

**Data contract**
- Inputs from store bridge: `State.filters`, `State.order`, `State.ui` (search text, star-only flag, shuffle), totals from `applyFilters`.
- Events emitted: `setFilters`, `toggleOnlyStar`, `toggleShuffle`, `openFiltersPopover`, `setSearchTerm`, `openSettings`, `setRowSelectionMode`.
- Derived helpers: filter result count, chip active states, disabled states during loading.

**Shared styling**
- Keep design tokens (colors, spacing, typography) in `assets/styles.css`; move structural/top-bar-specific rules into `TopBar.svelte` to reduce duplication once legacy view retires.
- Reuse chip + popover utility classes via shared CSS module or extracted mixins to keep both implementations visually identical during overlap.
