// assets/state.ts
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
} from './state/persistence.ts';

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
} from './state/store.ts';

export {
  termKey,
  stableId,
  mapRaw,
  normalizeTagsList,
  type VocabEntry,
  type RawWord
} from './state/data.ts';

export {
  applyFilters,
  sortWords,
  shuffledIds
} from './state/selectors.ts';
