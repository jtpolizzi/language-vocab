// assets/state/store.js
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
  DEFAULT_UI
} from './persistence.js';
import { mapRaw } from './data.js';

const KEY_EVENTS = {
  filters: 'filtersChanged',
  filterSets: 'filterSetsChanged',
  sort: 'sortChanged',
  columns: 'columnsChanged',
  order: 'orderChanged',
  ui: 'uiChanged',
  words: 'wordsChanged',
  progress: 'progressChanged'
};

const subscribers = new Set();
const eventHandlers = new Map();

function emit(eventName, payload) {
  const handlers = eventHandlers.get(eventName);
  if (!handlers?.size) return;
  handlers.forEach(fn => fn(payload, State));
}

function emitByKey(key, payload) {
  const evt = KEY_EVENTS[key];
  if (evt) emit(evt, payload);
  emit('stateChanged', { key, payload });
}

function notifySubscribers(key, payload) {
  subscribers.forEach(fn => fn());
  emitByKey(key, payload);
}

function shallowArrayEqual(a = [], b = []) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function serialize(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

export const State = {
  words: [],
  filters: loadFilters(),
  filterSets: loadFilterSets(),
  sort: loadSort(),
  columns: loadColumns(),
  order: loadOrder(),
  ui: loadUI(),
  meta: {
    wordsSource: '',
    wordsLoadedAt: 0
  },
  set(key, value) {
    updateState(key, value);
  }
};

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function on(eventName, handler) {
  if (!eventHandlers.has(eventName)) {
    eventHandlers.set(eventName, new Set());
  }
  const set = eventHandlers.get(eventName);
  set.add(handler);
  return () => {
    set.delete(handler);
    if (!set.size) eventHandlers.delete(eventName);
  };
}

State.on = on;

export function forceStateUpdate() {
  subscribers.forEach(fn => fn());
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

function updateState(key, value) {
  switch (key) {
    case 'filters':
      return updateFilters(value);
    case 'filterSets':
      return updateFilterSets(value);
    case 'sort':
      return updateSort(value);
    case 'columns':
      return updateColumns(value);
    case 'order':
      return updateOrder(value);
    case 'ui':
      return updateUI(value);
    case 'words':
      return updateWords(Array.isArray(value) ? value : []);
    default:
      State[key] = value;
      notifySubscribers(key, { value });
  }
}

function updateFilters(nextFilters) {
  const merged = sanitizeFilters(nextFilters || {});
  if (filtersEqual(State.filters, merged)) return;
  State.filters = merged;
  LS.set('filters', merged);
  notifySubscribers('filters', merged);
  setCurrentWordId('');
}

function updateFilterSets(nextSets) {
  const sanitized = sanitizeFilterSets(nextSets || []);
  if (serialize(State.filterSets) === serialize(sanitized)) return;
  State.filterSets = sanitized;
  LS.set('filterSets', sanitized);
  notifySubscribers('filterSets', sanitized);
}

function updateSort(nextSort) {
  const clean = sanitizeSort(nextSort);
  if (State.sort.key === clean.key && State.sort.dir === clean.dir) return;
  State.sort = clean;
  LS.set('sort', clean);
  notifySubscribers('sort', clean);
}

function updateColumns(nextColumns) {
  const clean = sanitizeColumns(nextColumns);
  if (serialize(State.columns) === serialize(clean)) return;
  State.columns = clean;
  LS.set('columns', clean);
  notifySubscribers('columns', clean);
}

function updateOrder(nextOrder) {
  const list = Array.isArray(nextOrder) ? nextOrder.filter(id => typeof id === 'string') : [];
  if (shallowArrayEqual(State.order, list)) return;
  State.order = list;
  LS.set('order', list);
  notifySubscribers('order', list);
}

function updateUI(nextUi) {
  const clean = sanitizeUI(nextUi || {});
  if (serialize(State.ui) === serialize(clean)) return;
  State.ui = clean;
  LS.set('ui', clean);
  notifySubscribers('ui', clean);
}

function updateWords(list, meta) {
  State.words = list;
  notifySubscribers('words', meta || { count: list.length });
}

export function hydrateWords(raw, meta = {}) {
  const mapped = mapRaw(raw || []);
  State.meta = {
    ...State.meta,
    wordsSource: typeof meta.source === 'string' ? meta.source : (meta.source ?? ''),
    wordsLoadedAt: typeof meta.loadedAt === 'number' ? meta.loadedAt : Date.now()
  };
  updateWords(mapped, { count: mapped.length, meta: { ...State.meta } });
}

export const Prog = {
  star(key) {
    return LS.get('star:' + key, false);
  },
  setStar(key, v) {
    LS.set('star:' + key, !!v);
    notifySubscribers('progress', { type: 'star', key, value: !!v });
  },
  weight(key) {
    const raw = LS.get('wt:' + key, null);
    if (raw == null) return 3;
    const converted = toNewWeight(raw);
    return converted == null ? 3 : converted;
  },
  setWeight(key, v, options = {}) {
    const num = Number(v);
    const safe = Number.isFinite(num) ? num : 3;
    const clamped = Math.min(5, Math.max(1, safe));
    LS.set('wt:' + key, clamped);
    if (!options?.silent) {
      notifySubscribers('progress', { type: 'weight', key, value: clamped });
    }
  }
};

export function setCurrentWordId(wordId) {
  const next = typeof wordId === 'string' ? wordId : '';
  if ((State.ui.currentWordId || '') === next) return;
  updateUI({ ...State.ui, currentWordId: next });
}

export function setRowSelectionMode(enabled) {
  const want = !!enabled;
  if (!!State.ui?.rowSelectionMode === want) return;
  updateUI({ ...State.ui, rowSelectionMode: want });
}

export function isRowSelectionModeEnabled() {
  return !!State.ui?.rowSelectionMode;
}
