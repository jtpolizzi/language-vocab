// assets/state/persistence.js
export const STORAGE_PREFIX = 'lv:';
function withPrefix(key) {
  return STORAGE_PREFIX + key;
}

export const LS = {
  get(k, d) {
    try {
      const raw = localStorage.getItem(withPrefix(k));
      if (raw == null) return d;
      return JSON.parse(raw);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(withPrefix(k), JSON.stringify(v));
    } catch {
      // swallow quota/security issues
    }
  },
  remove(k) {
    try {
      localStorage.removeItem(withPrefix(k));
    } catch {
      // noop
    }
  }
};

export function clearStorageNamespace() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) doomed.push(key);
    }
    doomed.forEach(key => localStorage.removeItem(key));
  } catch {
    // ignore storage issues to avoid masking user actions
  }
}

export const DEFAULT_FILTERS = {
  starred: false,
  weight: [1, 2, 3, 4, 5],
  search: '',
  pos: [],
  cefr: [],
  tags: []
};

export const DEFAULT_WEIGHT = [...DEFAULT_FILTERS.weight];
export const DEFAULT_UI = { showTranslation: false, currentWordId: '', rowSelectionMode: false };
export const DEFAULT_SORT = { key: 'word', dir: 'asc' };
export const DEFAULT_COLUMNS = {
  star: true,
  weight: true,
  word: true,
  definition: true,
  pos: true,
  cefr: true,
  tags: true
};

export function toNewWeight(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 5) return n;
  if (n >= 0 && n <= 4) return n + 1;
  return null;
}

function normalizeList(list = []) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach(item => {
    const raw = typeof item === 'string' ? item.trim() : '';
    if (!raw) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function normalizeWeight(list = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach(item => {
    const n = toNewWeight(item);
    if (n == null) return;
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
  });
  return out.length ? out.sort((a, b) => a - b) : [...DEFAULT_WEIGHT];
}

export function sanitizeFilters(filters = {}) {
  const base = { ...DEFAULT_FILTERS };
  base.starred = !!filters.starred;
  base.weight = normalizeWeight(filters.weight);
  base.search = typeof filters.search === 'string' ? filters.search : '';
  base.pos = normalizeList(filters.pos);
  base.cefr = normalizeList(filters.cefr);
  base.tags = normalizeList(filters.tags);
  return base;
}

function canonicalFiltersShape(filters = {}) {
  const clean = sanitizeFilters(filters || {});
  const normList = (list = []) => [...(list || [])]
    .map(v => typeof v === 'string' ? v.toLowerCase() : '')
    .filter(Boolean)
    .sort();
  const normWeight = (list = []) => [...(list || [])]
    .map(n => Number(n))
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
  return {
    starred: !!clean.starred,
    search: typeof clean.search === 'string' ? clean.search : '',
    weight: normWeight(clean.weight),
    pos: normList(clean.pos),
    cefr: normList(clean.cefr),
    tags: normList(clean.tags)
  };
}

export function filtersKey(filters = {}) {
  return JSON.stringify(canonicalFiltersShape(filters));
}

export function filtersEqual(a, b) {
  return filtersKey(a) === filtersKey(b);
}

export function sanitizeFilterSets(list = []) {
  if (!Array.isArray(list)) return [];
  const usedIds = new Set();
  return list.map((entry, idx) => {
    let id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    if (!id) id = `fs_${idx}`;
    while (usedIds.has(id)) id = `${id}_${idx}`;
    usedIds.add(id);
    const name = typeof entry?.name === 'string' && entry.name.trim() ? entry.name.trim() : `Set ${idx + 1}`;
    return {
      id,
      name,
      filters: sanitizeFilters(entry?.filters || {})
    };
  });
}

export function sanitizeUI(ui = {}) {
  return {
    showTranslation: !!ui.showTranslation,
    currentWordId: typeof ui.currentWordId === 'string' ? ui.currentWordId : '',
    rowSelectionMode: !!ui.rowSelectionMode
  };
}

const SORT_KEYS = new Set(['star', 'weight', 'word', 'definition', 'pos', 'cefr', 'tags']);

export function sanitizeSort(sort = DEFAULT_SORT) {
  const next = typeof sort === 'object' && sort ? { ...DEFAULT_SORT, ...sort } : { ...DEFAULT_SORT };
  if (!SORT_KEYS.has(next.key)) next.key = DEFAULT_SORT.key;
  next.dir = next.dir === 'desc' ? 'desc' : 'asc';
  return next;
}

export function sanitizeColumns(columns = DEFAULT_COLUMNS) {
  const next = { ...DEFAULT_COLUMNS };
  if (!columns || typeof columns !== 'object') return next;
  Object.entries(columns).forEach(([key, value]) => {
    if (key in next) next[key] = !!value;
  });
  return next;
}

export function loadFilters() {
  const stored = LS.get('filters', DEFAULT_FILTERS);
  return sanitizeFilters(stored || DEFAULT_FILTERS);
}

export function loadFilterSets() {
  const stored = LS.get('filterSets', []);
  return sanitizeFilterSets(stored || []);
}

export function loadUI() {
  const stored = LS.get('ui', DEFAULT_UI);
  return sanitizeUI(stored || DEFAULT_UI);
}

export function loadSort() {
  const stored = LS.get('sort', DEFAULT_SORT);
  return sanitizeSort(stored);
}

export function loadColumns() {
  const stored = LS.get('columns', DEFAULT_COLUMNS);
  return sanitizeColumns(stored);
}

export function loadOrder() {
  const raw = LS.get('order', []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(id => typeof id === 'string');
}
