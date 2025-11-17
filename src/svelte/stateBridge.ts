import { readable, type Readable } from 'svelte/store';
import {
  State,
  subscribe as subscribeToState,
  applyFilters,
  sortWords,
  setSort,
  clearOrder,
  setCurrentWordId,
  setRowSelectionMode,
  isRowSelectionModeEnabled,
  setFilters,
  setFilterSets,
  setOrder,
  type VocabEntry,
  type SortState,
  type ColumnsState,
  type Filters,
  type FilterSet
} from '../../assets/state.ts';

export interface WordListSnapshot {
  rows: VocabEntry[];
  sort: SortState;
  columns: ColumnsState;
  selectionEnabled: boolean;
  currentWordId: string;
  totalFiltered: number;
}

function reorderByShuffle(rows: VocabEntry[]): VocabEntry[] {
  const order = Array.isArray(State.order) ? State.order : [];
  if (!order.length) return rows;
  const byId = new Map(rows.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const ordered: VocabEntry[] = [];
  order.forEach((id) => {
    if (seen.has(id)) return;
    const entry = byId.get(id);
    if (entry) {
      ordered.push(entry);
      seen.add(id);
    }
  });
  if (ordered.length) {
    rows.forEach((w) => {
      if (seen.has(w.id)) return;
      ordered.push(w);
    });
    return ordered;
  }
  return rows;
}

function getSnapshot(): WordListSnapshot {
  const filtered = applyFilters(State.words);
  const sorted = sortWords(filtered);
  const ordered = reorderByShuffle(sorted);
  return {
    rows: ordered,
    sort: State.sort,
    columns: State.columns,
    selectionEnabled: isRowSelectionModeEnabled(),
    currentWordId: State.ui?.currentWordId || '',
    totalFiltered: filtered.length
  };
}

export const wordListStore: Readable<WordListSnapshot> = readable(getSnapshot(), (set) => {
  const sync = () => set(getSnapshot());
  sync();
  const unsubscribe = subscribeToState(sync);
  return () => unsubscribe();
});

export const wordListActions = {
  setSort,
  clearOrder,
  setCurrentWordId,
  setRowSelectionMode
};

export interface TopBarSnapshot {
  filters: Filters;
  filterSets: FilterSet[];
  resultCount: number;
  posValues: string[];
  cefrValues: string[];
  tagValues: string[];
}

function collectFacetValues(words: VocabEntry[] = []) {
  const pos = new Set<string>();
  const cefr = new Set<string>();
  const tags = new Map<string, number>();
  const addTag = (tag: string) => {
    const key = tag.toLowerCase();
    tags.set(key, (tags.get(key) || 0) + 1);
  };
  for (const w of words) {
    if (w.pos) pos.add(w.pos);
    if (w.cefr) cefr.add(w.cefr);
    if (w.tags) {
      String(w.tags)
        .split(/[|,;]+|\s+/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach(addTag);
    }
  }
  const tagValues = [...tags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 150)
    .map(([key]) => key);
  return {
    posValues: [...pos].sort(),
    cefrValues: [...cefr].sort(),
    tagValues
  };
}

function getTopBarSnapshot(): TopBarSnapshot {
  const filters = State.filters;
  const { posValues, cefrValues, tagValues } = collectFacetValues(State.words);
  const filtered = applyFilters(State.words);
  return {
    filters,
    filterSets: Array.isArray(State.filterSets) ? [...State.filterSets] : [],
    resultCount: filtered.length,
    posValues,
    cefrValues,
    tagValues
  };
}

export const topBarStore: Readable<TopBarSnapshot> = readable(getTopBarSnapshot(), (set) => {
  const sync = () => set(getTopBarSnapshot());
  sync();
  const unsubscribe = subscribeToState(sync);
  return () => unsubscribe();
});

export const topBarActions = {
  setFilters,
  setFilterSets,
  setSort,
  setOrder
};

export interface FlashcardsSnapshot {
  cards: VocabEntry[];
  currentWordId: string;
  showTranslation: boolean;
}

function getFlashcardsSnapshot(): FlashcardsSnapshot {
  const filtered = applyFilters(State.words);
  const sorted = sortWords(filtered);
  const ordered = reorderByShuffle(sorted);
  return {
    cards: ordered,
    currentWordId: State.ui?.currentWordId || '',
    showTranslation: !!State.ui?.showTranslation
  };
}

export const flashcardsStore: Readable<FlashcardsSnapshot> = readable(getFlashcardsSnapshot(), (set) => {
  const sync = () => set(getFlashcardsSnapshot());
  sync();
  const unsubscribe = subscribeToState(sync);
  return () => unsubscribe();
});

export const flashcardsActions = {
  setCurrentWordId
};

export interface WordMatchSnapshot {
  words: VocabEntry[];
}

function getWordMatchSnapshot(): WordMatchSnapshot {
  const filtered = applyFilters(State.words);
  return {
    words: filtered
  };
}

export const wordMatchStore: Readable<WordMatchSnapshot> = readable(getWordMatchSnapshot(), (set) => {
  const sync = () => set(getWordMatchSnapshot());
  sync();
  const unsubscribe = subscribeToState(sync);
  return () => unsubscribe();
});
