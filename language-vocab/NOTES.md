# Notes



# Micro-iteration plan (in this order)

## 1) Data loader: add TSV support (app/state only)

**Scope:** `assets/app.js` (+ a tiny helper in `state.js` if needed)
 **What changes:**

- Load `data/words.tsv` instead of `words.json`.
- Parse TSV with headers: `Spanish<TAB>English<TAB>POS<TAB>CEFR<TAB>Tags`.
- Map to our internal shape with the same stable `id = hash(es|en)`.
- Keep JSON loader as a fallback (so you can swap easily), but prefer TSV if it exists.

**Acceptance:**

- App boots using `data/words.tsv`; all features still work.
- Diacritics and tabs parse correctly; no blank rows.
- Existing stars/weights in `localStorage` continue to match (same `id`).

------

## 2) Flashcards: restore keyboard navigation

**Scope:** `assets/components/Flashcards.js`
 **What changes:**

- Add key handlers:
  - **ArrowLeft** → previous
  - **ArrowRight** → next
  - **Space** or **Enter** → flip
- Guard: ignore keys if a text field is focused (future-proofing).
- Ensure handlers are added/removed on mount/unmount to avoid duplicates.

**Acceptance:**

- Keys work on desktop immediately after page load.
- No accidental double navigation; no interference with typing (if/when we add inputs).

------

## 3) Flashcards: translation under meta + top toggle

**Scope:** `assets/components/Flashcards.js` (+ a tiny flag in `state.js`)
 **What changes:**

- Add a small, muted **translation line** (English) under `POS • CEFR • Tags`.
- Add a **toggle** at the top of the page for this view:
  - A chip in the **Top bar only when on Flashcards**, labeled “Show translation”.
  - New state key: `ui.showTranslation` (persisted).
- Respect the toggle: show/hide the small translation line on the card.

**Acceptance:**

- On Flashcards, a toggle appears in the top bar.
- When ON: the small English translation shows under the meta.
- When OFF: it’s hidden.
- Setting persists across reloads.

------

## 4) Word List: make the Star clearly visible

**Scope:** `assets/components/WordList.js` + **minimal CSS** in `assets/styles.css`
 **What changes:**

- Increase star size and contrast.
- Use filled **★** with accent color when starred; **☆** when not starred.
- Add accessible label (`aria-pressed`, `title` shows “Starred / Not starred”).

**Acceptance:**

- Starred vs not starred is obvious at a glance.
- Clicking toggles instantly; keyboard focus states are clear.

------

# After these 4

We can return to the previously discussed items (each as one tiny PR-sized edit):

- **TopBar Filters Pack** (POS/CEFR/Tags chips + search)
- **Word List sort arrows**
- **Flashcards ✏️/🔊 placeholders or TTS**
- **Import/Export progress** (if you still want it later)





---

# Proposed sequence (you can reorder)

## A) TopBar – Filters Pack

**Goal:** Bring back filtering power without touching list/cards.

- Add: **POS**, **CEFR**, **Tags** multi-select chips; **Search** (Spanish/English).
- State: `filters.pos[]`, `filters.cefr[]`, `filters.tags[]`, `filters.q`.
- Pipeline: update a single `applyFilters()` only.
   **Accept:** Filtering updates both views instantly; persisted in LocalStorage.

## B) Flashcards – Display Polish

**Goal:** Match your Quizlet-like spec.

- Add bottom line: `2/232 — aun cuando • even when`.
- Option: make **Prev/Next** full-width halves.
- Top-right: add **✏️ Edit** (inactive for now) and **🔊 Speaker** (placeholder).
   **Accept:** Tap-to-flip works; counter correct; meta shows `POS • CEFR • Tags`.

## C) WordList – Sort Indicators

**Goal:** Clarity.

- Add ▲/▼ in the active header; subtle highlight for active column.
   **Accept:** Indicator flips with sort dir; persisted.

## D) Progress – Toggle + Import/Export

**Goal:** Control + portability.

- **Track progress** toggle (when off, no writes to LocalStorage).
- **Export** stars/weights JSON; **Import** to restore.
   **Accept:** Round-trip test succeeds (export → clear → import restores).

## E) (Optional) Dataset Selector

**Goal:** Multi-list workflow.

- Add dataset dropdown; namespace LocalStorage keys per dataset.
   **Accept:** Switching datasets swaps progress, filters, and views cleanly.

# Lightweight conventions (so changes stay tiny)

- **Component boundaries**: render from state → DOM (no DOM scraping).
- **No shared global UI state** inside components; everything flows through `state.js`.
- **Minimal CSS**: utility classes only; no layout churn between iterations.
- **Acceptance criteria** written up front (like above) for each tiny change.

