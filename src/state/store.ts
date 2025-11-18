// src/state/store.ts
import {
  LS,
  sanitizeFilters,
  filtersEqual,
  sanitizeFilterSets,
  sanitizeUI,
  sanitizeSort,
  sanitizeColumns,
  loadFilters,
  loadFilterSets,
  loadSort,
  loadColumns,
  loadUI,
  loadOrder,
  toNewWeight,
  clearStorageNamespace,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_COLUMNS,
  DEFAULT_UI,
  type Filters,
  type FilterSet,
  type UIState,
  type SortState,
  type ColumnsState
} from './persistence.ts';
import { mapRaw, type VocabEntry, type RawWord } from './data.ts';

const KEY_EVENTS = {
  filters: 'filtersChanged',
  filterSets: 'filterSetsChanged',
  sort: 'sortChanged',
  columns: 'columnsChanged',
  order: 'orderChanged',
  ui: 'uiChanged',
  words: 'wordsChanged',
  progress: 'progressChanged'
} as const;

type Subscriber = () => void;
type EventHandler = (payload: unknown, state: AppState) => void;

interface MetaState {
  wordsSource: string;
  wordsLoadedAt: number;
  loaderStatus: LoaderStatus;
}

export type LoaderStatus = 'idle' | 'loading' | 'loaded' | 'error';

type StateUpdatableKey = 'filters' | 'filterSets' | 'sort' | 'columns' | 'order' | 'ui' | 'words';

type WritableState = {
  words: VocabEntry[];
  filters: Filters;
  filterSets: FilterSet[];
  sort: SortState;
  columns: ColumnsState;
  order: string[];
  ui: UIState;
};

export interface AppState extends WritableState {
  meta: MetaState;
  set: <K extends StateUpdatableKey>(key: K, value: WritableState[K]) => void;
  on?: typeof on;
}

const subscribers = new Set<Subscriber>();
const eventHandlers = new Map<string, Set<EventHandler>>();
const eventCounts = new Map<string, number>();

function emit(eventName: string, payload: unknown) {
  const handlers = eventHandlers.get(eventName);
  if (!handlers?.size) return;
  eventCounts.set(eventName, (eventCounts.get(eventName) || 0) + 1);
  handlers.forEach((fn) => fn(payload, State));
}

function emitByKey(key: string, payload: unknown) {
  const evt = (KEY_EVENTS as Record<string, string>)[key];
  if (evt) emit(evt, payload);
  emit('stateChanged', { key, payload });
}

function notifySubscribers(key: string, payload: unknown) {
  subscribers.forEach((fn) => fn());
  emitByKey(key, payload);
}

function shallowArrayEqual(a: unknown = [], b: unknown = []): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function serialize(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

export const State: AppState = {
  words: [],
  filters: loadFilters(),
  filterSets: loadFilterSets(),
  sort: loadSort(),
  columns: loadColumns(),
  order: loadOrder(),
  ui: loadUI(),
  meta: {
    wordsSource: '',
    wordsLoadedAt: 0,
    loaderStatus: 'idle'
  },
  set(key, value) {
    updateState(key, value);
  }
};

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function on(eventName: string, handler: EventHandler) {
  if (!eventHandlers.has(eventName)) {
    eventHandlers.set(eventName, new Set());
  }
  const set = eventHandlers.get(eventName)!;
  set.add(handler);
  return () => {
    set.delete(handler);
    if (!set.size) eventHandlers.delete(eventName);
  };
}

State.on = on;

export function forceStateUpdate() {
  subscribers.forEach((fn) => fn());
}

export function setFilters(next: Filters) { State.set('filters', next); }
export function setFilterSets(next: FilterSet[]) { State.set('filterSets', next); }
export function setSort(next: SortState) { State.set('sort', next); }
export function setColumns(next: ColumnsState) { State.set('columns', next); }
export function setOrder(next: string[]) { State.set('order', next); }
export function clearOrder() { State.set('order', []); }
export function setLoaderStatus(status: LoaderStatus) {
  State.meta = { ...State.meta, loaderStatus: status };
}

export function resetPersistentState() {
  clearStorageNamespace();
  State.set('filters', DEFAULT_FILTERS);
  State.set('filterSets', []);
  State.set('sort', DEFAULT_SORT);
  State.set('columns', DEFAULT_COLUMNS);
  State.set('order', []);
  State.set('ui', DEFAULT_UI);
  State.meta = { ...State.meta };
}

function updateState<K extends StateUpdatableKey>(key: K, value: WritableState[K]) {
  switch (key) {
    case 'filters':
      return updateFilters(value as WritableState['filters']);
    case 'filterSets':
      return updateFilterSets(value as WritableState['filterSets']);
    case 'sort':
      return updateSort(value as WritableState['sort']);
    case 'columns':
      return updateColumns(value as WritableState['columns']);
    case 'order':
      return updateOrder(value as WritableState['order']);
    case 'ui':
      return updateUI(value as WritableState['ui']);
    case 'words':
      return updateWords(value as WritableState['words']);
  }
}

function updateFilters(nextFilters?: Filters) {
  const merged = sanitizeFilters(nextFilters || {});
  if (filtersEqual(State.filters, merged)) return;
  State.filters = merged;
  LS.set('filters', merged);
  notifySubscribers('filters', merged);
  setCurrentWordId('');
}

function updateFilterSets(nextSets?: FilterSet[]) {
  const sanitized = sanitizeFilterSets(nextSets || []);
  if (serialize(State.filterSets) === serialize(sanitized)) return;
  State.filterSets = sanitized;
  LS.set('filterSets', sanitized);
  notifySubscribers('filterSets', sanitized);
}

function updateSort(nextSort?: SortState) {
  const clean = sanitizeSort(nextSort);
  if (State.sort.key === clean.key && State.sort.dir === clean.dir) return;
  State.sort = clean;
  LS.set('sort', clean);
  notifySubscribers('sort', clean);
}

function updateColumns(nextColumns?: ColumnsState) {
  const clean = sanitizeColumns(nextColumns);
  if (serialize(State.columns) === serialize(clean)) return;
  State.columns = clean;
  LS.set('columns', clean);
  notifySubscribers('columns', clean);
}

function updateOrder(nextOrder?: string[]) {
  const list = Array.isArray(nextOrder) ? nextOrder.filter((id): id is string => typeof id === 'string') : [];
  if (shallowArrayEqual(State.order, list)) return;
  State.order = list;
  LS.set('order', list);
  notifySubscribers('order', list);
}

function updateUI(nextUi?: UIState) {
  const clean = sanitizeUI(nextUi || {});
  if (serialize(State.ui) === serialize(clean)) return;
  State.ui = clean;
  LS.set('ui', clean);
  notifySubscribers('ui', clean);
}

function updateWords(list: VocabEntry[], meta?: unknown) {
  State.words = list;
  notifySubscribers('words', meta || { count: list.length });
}

export function hydrateWords(raw: unknown[], meta: { source?: string; loadedAt?: number; loaderStatus?: LoaderStatus } = {}) {
  const mapped = mapRaw(raw as RawWord[]);
  State.meta = {
    ...State.meta,
    wordsSource: typeof meta.source === 'string' ? meta.source : (meta.source ?? ''),
    wordsLoadedAt: typeof meta.loadedAt === 'number' ? meta.loadedAt : Date.now(),
    loaderStatus: meta.loaderStatus || State.meta.loaderStatus
  };
  updateWords(mapped, { count: mapped.length, meta: { ...State.meta } });
}

export const Prog = {
  star(key: string) {
    return LS.get<boolean>('star:' + key, false);
  },
  setStar(key: string, value: boolean) {
    LS.set('star:' + key, !!value);
    notifySubscribers('progress', { type: 'star', key, value: !!value });
  },
  weight(key: string) {
    const raw = LS.get<unknown>('wt:' + key, null);
    if (raw == null) return 3;
    const converted = toNewWeight(raw);
    return converted == null ? 3 : converted;
  },
  setWeight(key: string, value: unknown, options: { silent?: boolean } = {}) {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 3;
    const clamped = Math.min(5, Math.max(1, safe));
    LS.set('wt:' + key, clamped);
    if (!options?.silent) {
      notifySubscribers('progress', { type: 'weight', key, value: clamped });
    }
  }
};

export function setCurrentWordId(wordId: unknown) {
  const next = typeof wordId === 'string' ? wordId : '';
  if ((State.ui.currentWordId || '') === next) return;
  updateUI({ ...State.ui, currentWordId: next });
}

export function setRowSelectionMode(enabled: boolean) {
  const want = !!enabled;
  if (!!State.ui?.rowSelectionMode === want) return;
  updateUI({ ...State.ui, rowSelectionMode: want });
}

export function isRowSelectionModeEnabled(): boolean {
  return !!State.ui?.rowSelectionMode;
}

declare global {
  interface Window {
    __LV_DEBUG__?: {
      State: AppState;
      Prog: typeof Prog;
      on: typeof on;
      eventCounts: Map<string, number>;
    };
  }
}

const DEBUG_HOOK_KEY = '__LV_DEBUG__';
if (typeof window !== 'undefined' && !window[DEBUG_HOOK_KEY]) {
  window[DEBUG_HOOK_KEY] = {
    State,
    Prog,
    on: State.on!,
    get eventCounts() {
      return new Map(eventCounts);
    }
  };
}
