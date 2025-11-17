# Handover Notes – v2.14.6

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.
- Step B kicked off: Svelte (+ plugin) is now in the toolchain with a state-bridged Word List prototype that shares the existing store/actions.
- The Svelte Word List is now the sole implementation (`#/list` nav item); the legacy view has been retired.
- The shared Top Bar now ships as a Svelte component (shuffle, search, filters popover, saved sets, weight/facet toggles, settings modal) while every route still runs on the legacy logic.
- Flashcards run through Svelte too—the centered card layout, sticky star/weight controls, fixed bottom nav, progress slider, tap zones, swipe gestures, keyboard shortcuts, and `setCurrentWordId` sync all mirror the legacy experience.
- Word Match moved to Svelte; prefs (set size/direction/collapse), quick-play automation, and match/mismatch animations now live in the component while sharing the same filtered word pool as other routes.

## Upcoming Step B Items
1. **Migrate remaining views** – continue the Svelte rollout with Multiple Choice, Settings/overlays, then CSS colocation once every view is native.
2. **Document findings** – record DX/perf learnings from the migrations in NOTES/ARCHITECTURE to guide the go/no-go decision.
3. **Tooling follow-ups** – extend ESLint/Prettier/Vitest coverage for `.svelte` files once all migrations land, then trim any legacy helpers.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
- Prep a parity checklist + work plan for the next Svelte migration target (Word Match is the most bespoke view with custom layout, animations, and prefs). Checklist should cover layout, typography, board spacing, compact mode, quick-play toggles, keyboard/touch selection, and edge cases.
- Agree on the store contract and persistence strategy the new Svelte view will consume/emit (filtered pool, shuffle order, size/direction/collapse prefs, quick play flag) and decide which shared styles remain global vs. move into the component.
- Once the plan is approved, implement the component in deliberate batches (data/prefs bridge → board rendering → interactions/animations) and only then retire the duplicate CSS when the legacy view goes away.

### Svelte Flashcards – Parity Checklist & Store Contract
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
- Inputs from the store bridge: filtered/shuffled card list, current index, flip state, `Prog` star/weight values, and UI prefs (show translation, debug panel).
- Events emitted: `setCurrentWordId` (to sync with other views), `Prog.setStar`, `Prog.setWeight`, navigation actions (prev/next), and `State.set('ui', ...)` when settings toggles update.
- Derived helpers: formatted counter text, disabled states for nav buttons, whether translation text renders, and whether the overlays should show weight chips or spark icons.

**Shared styling**
- Keep design tokens (colors, spacing, typography) in `assets/styles.css`; move card-specific layout into the `.svelte` file so we can remove the legacy CSS once Flashcards migrates.
- Reuse shared chip/overlay styles where possible so the Svelte and legacy views stay visually interchangeable until the legacy code is deleted; once the legacy view is gone, lift those Flashcards rules out of `assets/styles.css` and colocate them inside `Flashcards.svelte` so the component is fully self-contained.

### Svelte Word Match – Parity Checklist & Store Contract
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
