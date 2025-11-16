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
  type VocabEntry,
  type SortState,
  type ColumnsState
} from '../../assets/state.ts';

export interface WordListSnapshot {
  rows: VocabEntry[];
  sort: SortState;
  columns: ColumnsState;
  selectionEnabled: boolean;
  currentWordId: string;
  totalFiltered: number;
}

function getSnapshot(): WordListSnapshot {
  const filtered = applyFilters(State.words);
  const sorted = sortWords(filtered);
  return {
    rows: sorted,
    sort: State.sort,
    columns: State.columns,
    selectionEnabled: isRowSelectionModeEnabled(),
    currentWordId: State.ui?.currentWordId || '',
    totalFiltered: filtered.length
  };
}

export const wordListStore: Readable<WordListSnapshot> = readable(getSnapshot(), (set) => {
  const unsubscribe = subscribeToState(() => set(getSnapshot()));
  return () => unsubscribe();
});

export const wordListActions = {
  setSort,
  clearOrder,
  setCurrentWordId,
  setRowSelectionMode
};
