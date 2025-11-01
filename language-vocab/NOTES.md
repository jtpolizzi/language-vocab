# Plan overview (v2.4)

## ~~A) Top Bar: unified, reusable, minimal~~

~~What lives in the top bar across **both** views:~~

- ~~**Only ★** (toggle)~~
- ~~**Weight chips W0–W4** (multi-select; fixes your “does nothing” issue)~~
- ~~**Search** (text box: searches Spanish + English)~~
- ~~**Filters menu** (popover/mini-panel) with:~~
  - ~~POS multi-select~~
  - ~~CEFR multi-select~~
  - ~~Tags multi-select (comma lists normalized)~~
- ~~**Shuffle** (context-aware; see D)~~
- ~~**Settings (gear)** opens settings modal~~

~~Styling: small, rounded chips, consistent spacing, shows active counts (e.g., “Tags (3)”).~~

## B) Settings (gear) — restore and simplify

The modal should let you:

- Toggle visible columns (Word List) — uses existing `State.columns`
- Default view (Word List or Flashcards) on load (optional)
- Translation toggle default (for Flashcards)
- Reset filters/order (one click)

Persist in `State.ui` (we already added that for showTranslation).

## C) Filters: behavior & state

We’ll make `applyFilters()` the *single* source of truth. Updates:

- **Only ★**: include only starred ids.
- **Weights W0–W4**: multi-select set. (Fix current no-op.)
- **Search**: case-insensitive, trims, matches `es` OR `en`.
- **POS/CEFR/Tags**: each is a set (OR within a category, AND across categories).
   Example: POS={verb,noun} AND CEFR={A1,A2} AND Tags={glue,time}.

Data sources for chips:

- POS/CEFR from distinct values of current data.
- Tags: split on `[|,;\\s]+`, lowercased, unique.

Performance: debounce search (200ms), and cap unique tags shown (e.g., top 100 by frequency) with a “More…” expander if needed.

## D) Shuffle: consistent semantics

- **Flashcards**: “Shuffle” = compute `State.order` from the **currently filtered + sorted** set, then **stay** on Flashcards (or navigate there if you’re already in Flashcards—no change). This is how it works now.
- **Word List**: “Shuffle” should also randomize the **current filtered set**, store to `State.order`, and **stay on Word List**. The Word List renderer will respect `State.order` (see E).
   (Right now it navigates to Flashcards— we’ll stop that.)

## E) Respect `State.order` in Word List

Today, Word List always shows `sortWords(filtered)`. We’ll change render to:

- If `State.order` is non-empty, show rows in that order **but only** for ids present in the current filtered set (ignore missing).
- If empty, fall back to sorted order.
   This makes shuffle visible in the list without touching the actual file order.

## F) Visual polish (low-risk wins)

- Active chips highlighted (filled or bordered).
- Show small count pills in the Filters menu for active POS/CEFR/Tags.
- Show ▲/▼ arrow + bold header already done; add subtle column background for the sorted column (optional).
- Keep sticky header as is (Edge quirk acceptable) and avoid risky table changes.

# State changes (small)

- `State.filters` gains:
  - `search: ''`
  - `pos: []`
  - `cefr: []`
  - `tags: []`
     (Keep `starred` and `weight` as today.)
- `State.ui` already exists; add:
  - `defaultView?: 'list'|'cards'` (optional)
  - `lastView?: ...` (optional convenience for initial route)

# File-by-file impact (tight scope)

- `assets/components/TopBar.js`
  - Add Search input.
  - Add Filters popover (POS/CEFR/Tags).
  - Fix W0–W4 toggles to mutate `filters.weight`.
  - Make Shuffle behavior context-aware.
  - Add gear button (opens settings).
- `assets/components/WordList.js`
  - Respect `State.order` when present (new `applyOrder()` inside render).
- `assets/components/Flashcards.js`
  - No change needed (already respects `State.order`).
- `assets/components/SettingsModal.js`
  - Restore/implement gear modal with the options above.
- `assets/state.js`
  - Extend `filters` and `ui` defaults; persist on `State.set`.

# Acceptance checklist

- Toggling W0–W4 actually filters the set in **both** views.
- Search filters Spanish/English in both views (debounced).
- Filters menu: POS/CEFR/Tags multi-select work; counts visible.
- Shuffle on Word List randomizes the visible list but **stays on the list**.
- Shuffle on Flashcards randomizes cards and stays in Flashcards.
- Settings gear opens; column visibility toggles still work; translation default and reset work; values persist.
- No accidental navigation or loss of keyboard behavior on Flashcards.

# Proposed micro-iterations (to keep merges tiny)

1. **TopBar basics**: wire up Search, fix W0–W4, fix Shuffle per-view.
2. **Filters popover**: POS/CEFR/Tags multi-select (with counts).
3. **Word List**: respect `State.order` in render.
4. **Settings gear**: modal with columns, translation default, reset.
5. **Visual pass**: chip styles, active counts, optional sorted column tint.

If this breakdown looks right, I’ll start with **Step 1 (TopBar basics)** and give you only the changed files (likely just `TopBar.js` + tiny `state.js` tweak).
