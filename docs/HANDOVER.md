# Handover Notes – v2.15.0

> **Purpose & scope** – quick-start briefing for whoever picks up the repo next: latest release status, deployment steps, and the immediate priorities for the next session. Technical details live in `ARCHITECTURE_PLAN.md`; full history lives in `CHANGELOG.md`.

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.
- v2.14 Svelte migration is complete: Svelte (+ plugin) is now part of the Vite toolchain and every surface consumes the shared store/actions via the shared `src/state` helpers.
- The Svelte Word List is now the sole implementation (`#/list` nav item); the legacy view has been retired.
- Global CSS audit finished: `assets/styles.css` now only keeps tokens, app shell styles, and shared primitives while each Svelte view owns its scoped styles.
- The shared Top Bar ships as a Svelte component (shuffle, search, filters popover, saved sets, weight/facet toggles, settings modal).
- Flashcards run through Svelte too—the centered card layout, sticky star/weight controls, fixed bottom nav, progress slider, tap zones, swipe gestures, keyboard shortcuts, and `setCurrentWordId` sync all mirror the legacy experience.
- Word Match moved to Svelte; prefs (set size/direction/collapse), quick-play automation, and match/mismatch animations now live in the component while sharing the same filtered word pool as other routes.
- Multiple Choice is now Svelte-based: progress UI, answer feedback, keyboard shortcuts, and the LS-backed size/direction/answers prefs all ride through the shared store/actions.
- Settings modal and overlays (debug toggle, column selection, reset/clear actions) now run through Svelte, keeping the `#settings` route + Top Bar trigger intact while sharing the same component logic.

## Upcoming v2.14 Tasks
1. **Legacy helper cleanup** – finish wiring the Svelte `WeightSparkControl` everywhere and retire the old `assets/components/WeightControl.ts` helper/tests so only the new component is authoritative.
2. **Tooling follow-ups** – extend ESLint/Prettier/Vitest coverage for `.svelte` files, then trim any remaining vanilla DOM helpers once the shared components are in place.
3. **State polish** – now that the state modules live under `src/state`, capture any refactor follow-ups (typed stores, derived helpers) needed before we introduce new features.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
- Remove the unused `assets/components/WeightControl.ts` + tests after verifying every view uses the Svelte `WeightSparkControl`.
- Outline the lint/test/tooling updates needed now that the CSS + state cleanup has landed (ESLint plugin for Svelte, Prettier config, Vitest component harness + component tests).

### Svelte Flashcards – Parity Checklist & Store Contract (reference)
**Layout / visual**
- Preserve the centered card stack (`width: min(100%, 720px)`), bottom nav counter, and the persistent overlays in the top-right corner. Respect current spacing tokens so cards sit flush under the header/top bar.
- Typography: keep the card word/definition sizes, the nav counter font (16 px bold), and the overlay chip sizes. Translation line still uses the muted style that toggles via settings.
- Layout must flex between portrait/landscape and small widths without collapsing the swipe targets or nav buttons.
- Keep the existing progress bar UI (`choice-progress` label + range slider), and continue applying `.pad-bottom` on `<body>` so content above the fixed bottom bar doesn’t get covered.

**Interactions**
- Keyboard: `←/→` move prev/next, `Space/Enter/↑/↓` flip, `s` toggles star, digits `0`-`4` (or `1`-`5` if we keep the new scale) set the weight, `Esc` cancels any pending action without moving cards.
- Pointer/touch: tap center to flip, left/right tap zones for prev/next, horizontal swipe gestures for navigation, and long-press on the overlays should not steal focus from the card.
- Overlays (star toggle, weight chips, translation toggle) must remain clickable/tappable even while the card is mid-animation.
- Bottom nav buttons must stay disabled/enabled in sync with the available prev/next cards and preserve the focus ring order.
- Progress slider needs the drag guard (pointer down disables auto-sync until release) and should keep its live “Card X / N” label in sync with `State.order`/filters even when the active card drops out (Only★ etc.).
- Suppression flag should prevent the next tap from advancing when pointer/touch events originate in the `.topright` controls.

**Data contract**
- Inputs from the shared store helpers: filtered/shuffled card list, current index, flip state, `Prog` star/weight values, and UI prefs (show translation, debug panel).
- Events emitted: `setCurrentWordId` (to sync with other views), `Prog.setStar`, `Prog.setWeight`, navigation actions (prev/next), and `State.set('ui', ...)` when settings toggles update.
- Derived helpers: formatted counter text, disabled states for nav buttons, whether translation text renders, and whether the overlays should show weight chips or spark icons.

**Shared styling**
- Keep design tokens (colors, spacing, typography) in `assets/styles.css`; move card-specific layout into the `.svelte` file so we can remove the legacy CSS once Flashcards migrates.
- Reuse shared chip/overlay styles where possible so the Svelte and legacy views stay visually interchangeable until the legacy code is deleted; once the legacy view is gone, lift those Flashcards rules out of `assets/styles.css` and colocate them inside `Flashcards.svelte` so the component is fully self-contained.

### Svelte Word Match – Parity Checklist & Store Contract (reference)
**Layout / visual**
- Preserve the current toolbar stack (status pill, quick play toggle, size slider, direction selector, collapse toggle) plus the two-column board with consistent spacing, divider line, and the compact-matches class that collapses cleared rows.
- Maintain the empty state (“Adjust your filters to load words.”), the match/mismatch animations, and the cleared-card collapse so the board doesn’t jitter when pairs disappear.
- Options popovers and chips should keep using the existing popover/chip design tokens, including icons and typography.

**Interactions**
- Card selection supports mouse/touch taps and keyboard focus; mismatches should shake and briefly lock input before resetting, while matches should collapse or fade according to the “collapse matches” preference.
- Quick Play mode auto-selects the first left-column card; keyboard shortcuts (arrows/Enter) should keep working so the view stays accessible without a mouse.
- Toolbar controls (size slider, direction menu, collapse toggle, “New set”, “Restart”) must immediately persist to `localStorage` and restart/shuffle the board exactly like the legacy implementation.

**Data contract**
- Inputs: filtered word pool (respecting Word List filters/shuffle order), stored prefs (`size`, `direction`, `collapseMatches`, `quickPlay`), and any derived quick-play state.
- Events emitted: pref updates (persisted via LS), board restart/shuffle triggers, quick-play toggles, and completion/mismatch counters so other views could react later.
- Derived helpers: computed left/right columns with `pairId`s, selection state, “pairs remaining” status text, quick-play automation, and flags for when there aren’t enough words to start a round.

**Shared styling**
- Keep toolbar + popover + chip styles in `assets/styles.css`; move board/tile-specific layout and animations into the `.svelte` file (or colocated CSS) so the legacy selectors can be removed once the migration is complete.
- Reuse palette tokens (`--line`, accent, background gradients) so the board looks identical during the overlap period.

## Sequenced Roadmap
1. **v2.14.6 – Multiple Choice migration**: Rebuild the quiz view in Svelte, reusing the filtered pool + shared actions, and retire the vanilla implementation.
2. **v2.14.7 – Settings + overlays**: Port the settings modal (and always-mounted helpers like the debug panel/body locks) into Svelte so every surface uses the same stack.
3. **v2.14.8 – CSS colocation**: After every view is Svelte-native, move view-specific styles from `assets/styles.css` into their `.svelte` files, leaving only tokens/global resets globally.
4. **v2.14.9 – Tooling/tests polish**: Expand ESLint/Vitest coverage for the Svelte files (component tests, lint rules) and tidy any remaining automation gaps.
