# 📘 Vocab Mini-App — Project Handover Document

**Project Name:**  
Spanish Vocabulary Mini-App (Offline HTML + JS)

**Current Version:**  
v2.1 — Fully working core release (2025-10-31)

**Package to upload:**  
`vocab-mini-app-v2.1-full.zip`

---

## 🧩 Codebase Overview

**Structure:**
```
/index.html
/list.html
/flashcards.html
/css/styles.css
/js/idb.js
/js/state-v2.js
/js/filters.js
/js/utils.js
/data/sample.tsv
```
All files are static — no build process or dependencies required.

**Technologies:**
- HTML, CSS, Vanilla JS
- IndexedDB for local data persistence
- 100% offline, runs in browser

**Core Components:**
- **index.html:** load/export TSV, manage filters, annotation import/export
- **list.html:** word list with ⭐ and score buttons
- **flashcards.html:** interactive deck view with shuffle, ⭐, scores
- **idb.js:** minimal IndexedDB helper
- **state-v2.js:** data model and CRUD logic
- **filters.js:** filter menus and persistence
- **utils.js:** TSV parsing/stringify and download helpers
- **styles.css:** dark theme layout and responsive design

**Data model example:**
```tsv
spanish	english	pos	cefr	tags	⭐	score
hola	hello	interj	A1.1	greetings|basics	1	1
```
- Primary key: `spanish|english|pos` (lowercase)
- Annotations and filters stored separately in IndexedDB (`ann`, `meta` stores)

---

## ✅ Features Implemented (v2.1)

- Load TSV → store in IndexedDB
- Export full or filtered TSV
- ⭐ and score (-2…+2) annotations, stored and synced
- Import/export annotations.json
- Shared filters (search, POS, CEFR, Tags) with selection counts
- Flashcards view with shuffle, click-to-flip, keyboard & swipe navigation
- “Only ⭐” and “Hide translation” modes
- Filter persistence and tag cache

---

## 🚀 Next Phase — v2.2 Goals

1. **Inline edit / add / delete rows**
   - Editable table cells (Spanish, English, POS, CEFR, Tags)
   - Add new word / delete existing word
   - Preserve annotations when ID changes

2. **Filter summary chips**
   - Display active filters as removable chips (POS, CEFR, Tags, Search)

3. **Text-to-Speech (Spanish)**
   - Use Web Speech API
   - “Slow” toggle and optional auto-speak on flashcards

4. **Sorting + Bulk Actions**
   - Sort by columns
   - Bulk ⭐ / score reset
   - Bulk tag add/remove

5. **UX polish**
   - Improve dropdown position and highlight when active
   - Compact, balanced flashcard layout
   - Show clearer feedback for filters

---

## 🔮 Optional for Later (v2.3+)

- Virtualized word list for large datasets (5k+ rows)
- Spaced repetition mode (weighted by score)
- Settings page (voice speed, defaults, theme)
- PWA packaging (installable offline app)

---

## 🧭 Instructions for the Next Assistant

1. Load `vocab-mini-app-v2.1-full.zip` uploaded by user.
2. Keep folder layout identical.
3. Implement items under “Next Phase — v2.2 Goals”.
4. Return updates as a new zip named `vocab-mini-app-v2.2.zip`.
5. If only minor edits, return changed files individually; otherwise, include the full build.
6. Use friendly, explicit code — no minification or framework magic.

---

**Author’s Note (from Jim):**  
This mini-app is a clean, standalone tool for Spanish vocabulary study with offline storage and flexible filtering. The next version should emphasize usability improvements, editing, and voice practice integration.

---
