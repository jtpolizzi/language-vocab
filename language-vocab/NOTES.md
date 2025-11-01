# Notes

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

## D) Progress – Toggle + Import/Export

**Goal:** Control + portability.

- **Track progress** toggle (when off, no writes to LocalStorage).
- **Export** stars/weights JSON; **Import** to restore.
   **Accept:** Round-trip test succeeds (export → clear → import restores).

## E) (Optional) Dataset Selector

**Goal:** Multi-list workflow.

- Add dataset dropdown; namespace LocalStorage keys per dataset.
   **Accept:** Switching datasets swaps progress, filters, and views cleanly.

