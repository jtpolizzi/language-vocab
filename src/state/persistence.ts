// src/state/persistence.ts

export const STORAGE_PREFIX = 'lv:';

export interface Filters {
  starred: boolean;
  weight: number[];
  search: string;
  pos: string[];
  cefr: string[];
  tags: string[];
}

export interface FilterSet {
  id: string;
  name: string;
  filters: Filters;
}

export interface UIState {
  showTranslation: boolean;
  currentWordId: string;
  rowSelectionMode: boolean;
  debugPanel: boolean;
}

export type SortKey = '' | 'star' | 'weight' | 'word' | 'definition' | 'pos' | 'cefr' | 'tags';
export interface SortState { key: SortKey; dir: 'asc' | 'desc'; }

export interface ColumnsState {
  star: boolean;
  weight: boolean;
  word: boolean;
  definition: boolean;
  pos: boolean;
  cefr: boolean;
  tags: boolean;
}

function withPrefix(key: string): string {
  return STORAGE_PREFIX + key;
}

export const LS = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(withPrefix(key));
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(withPrefix(key), JSON.stringify(value));
    } catch {
      // swallow quota/security issues
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(withPrefix(key));
    } catch {
      // noop
    }
  }
};

export function clearStorageNamespace() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage issues to avoid masking user actions
  }
}

export const DEFAULT_FILTERS: Filters = {
  starred: false,
  weight: [1, 2, 3, 4, 5],
  search: '',
  pos: [],
  cefr: [],
  tags: []
};

export const DEFAULT_WEIGHT = [...DEFAULT_FILTERS.weight];
export const DEFAULT_UI: UIState = { showTranslation: false, currentWordId: '', rowSelectionMode: false, debugPanel: false };
export const DEFAULT_SORT: SortState = { key: 'word', dir: 'asc' };
export const DEFAULT_COLUMNS: ColumnsState = {
  star: true,
  weight: true,
  word: true,
  definition: true,
  pos: true,
  cefr: true,
  tags: true
};

export function toNewWeight(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 5) return n;
  if (n >= 0 && n <= 4) return n + 1;
  return null;
}

function normalizeList(list: unknown = []): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  (Array.isArray(list) ? list : []).forEach((item) => {
    const raw = typeof item === 'string' ? item.trim() : '';
    if (!raw) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function normalizeWeight(list: unknown = []): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const n = toNewWeight(item);
    if (n == null) return;
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
  });
  return out.length ? out.sort((a, b) => a - b) : [...DEFAULT_WEIGHT];
}

export function sanitizeFilters(filters: Partial<Filters> = {}): Filters {
  const base: Filters = { ...DEFAULT_FILTERS };
  base.starred = !!filters.starred;
  base.weight = normalizeWeight(filters.weight);
  base.search = typeof filters.search === 'string' ? filters.search : '';
  base.pos = normalizeList(filters.pos);
  base.cefr = normalizeList(filters.cefr);
  base.tags = normalizeList(filters.tags);
  return base;
}

function canonicalFiltersShape(filters: Partial<Filters> = {}): Filters {
  const clean = sanitizeFilters(filters || {});
  const normList = (list: string[] = []) => [...list]
    .map((v) => v.toLowerCase())
    .filter(Boolean)
    .sort();
  const normWeight = (list: number[] = []) => [...list]
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
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

export function filtersKey(filters: Partial<Filters> = {}): string {
  return JSON.stringify(canonicalFiltersShape(filters));
}

export function filtersEqual(a: Partial<Filters> = {}, b: Partial<Filters> = {}): boolean {
  return filtersKey(a) === filtersKey(b);
}

export function sanitizeFilterSets(list: unknown = []): FilterSet[] {
  if (!Array.isArray(list)) return [];
  const usedIds = new Set<string>();
  return list.map((entry, idx) => {
    const typed = entry as Partial<FilterSet>;
    let id = typeof typed?.id === 'string' ? typed.id.trim() : '';
    if (!id) id = `fs_${idx}`;
    while (usedIds.has(id)) id = `${id}_${idx}`;
    usedIds.add(id);
    const name = typeof typed?.name === 'string' && typed.name.trim() ? typed.name.trim() : `Set ${idx + 1}`;
    return {
      id,
      name,
      filters: sanitizeFilters(typed?.filters || {})
    };
  });
}

export function sanitizeUI(ui: Partial<UIState> = {}): UIState {
  return {
    showTranslation: !!ui.showTranslation,
    currentWordId: typeof ui.currentWordId === 'string' ? ui.currentWordId : '',
    rowSelectionMode: !!ui.rowSelectionMode,
    debugPanel: !!ui.debugPanel
  };
}

const SORT_KEYS = new Set<SortKey>(['', 'star', 'weight', 'word', 'definition', 'pos', 'cefr', 'tags']);

export function sanitizeSort(sort: Partial<SortState> = DEFAULT_SORT): SortState {
  const next = typeof sort === 'object' && sort ? { ...DEFAULT_SORT, ...sort } : { ...DEFAULT_SORT };
  if (!SORT_KEYS.has(next.key)) next.key = DEFAULT_SORT.key;
  next.dir = next.dir === 'desc' ? 'desc' : 'asc';
  return next;
}

export function sanitizeColumns(columns: Partial<ColumnsState> = DEFAULT_COLUMNS): ColumnsState {
  const next: ColumnsState = { ...DEFAULT_COLUMNS };
  if (!columns || typeof columns !== 'object') return next;
  Object.entries(columns).forEach(([key, value]) => {
    if (key in next) (next as Record<string, boolean>)[key] = !!value;
  });
  return next;
}

export function loadFilters(): Filters {
  const stored = LS.get<Filters>('filters', DEFAULT_FILTERS);
  return sanitizeFilters(stored || DEFAULT_FILTERS);
}

export function loadFilterSets(): FilterSet[] {
  const stored = LS.get<FilterSet[]>('filterSets', []);
  return sanitizeFilterSets(stored || []);
}

export function loadUI(): UIState {
  const stored = LS.get<UIState>('ui', DEFAULT_UI);
  return sanitizeUI(stored || DEFAULT_UI);
}

export function loadSort(): SortState {
  const stored = LS.get<SortState>('sort', DEFAULT_SORT);
  return sanitizeSort(stored);
}

export function loadColumns(): ColumnsState {
  const stored = LS.get<ColumnsState>('columns', DEFAULT_COLUMNS);
  return sanitizeColumns(stored);
}

export function loadOrder(): string[] {
  const raw = LS.get<unknown>('order', []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}
