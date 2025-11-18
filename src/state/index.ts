// src/state/index.ts
export {
  LS,
  sanitizeFilters,
  filtersEqual,
  filtersKey,
  type Filters,
  type FilterSet,
  type UIState,
  type SortState,
  type ColumnsState
} from './persistence.ts';

export {
  State,
  subscribe,
  forceStateUpdate,
  Prog,
  setCurrentWordId,
  setRowSelectionMode,
  isRowSelectionModeEnabled,
  hydrateWords,
  on as onStateEvent,
  resetPersistentState,
  setFilters,
  setFilterSets,
  setSort,
  setColumns,
  setOrder,
  clearOrder,
  setLoaderStatus,
  type LoaderStatus
} from './store.ts';

export {
  termKey,
  stableId,
  mapRaw,
  normalizeTagsList,
  type VocabEntry,
  type RawWord
} from './data.ts';

export {
  applyFilters,
  sortWords,
  shuffledIds
} from './selectors.ts';

export * from './stores.ts';
