// assets/state.js
const STORAGE_PREFIX = 'lv:';
const LEGACY_PREFIX = 'v23:';
const LEGACY_PURGE_FLAG = `${STORAGE_PREFIX}purged-v23`;

function purgeLegacyStorage() {
  try {
    if (localStorage.getItem(LEGACY_PURGE_FLAG) === '1') return;
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(LEGACY_PURGE_FLAG, '1');
  } catch {
    // ignore storage issues; app will fall back to defaults
  }
}
purgeLegacyStorage();

function withPrefix(key) {
  return STORAGE_PREFIX + key;
}

export const LS = {
  get(k, d) {
    try { return JSON.parse(localStorage.getItem(withPrefix(k))) ?? d; } catch { return d; }
  },
  set(k, v) { localStorage.setItem(withPrefix(k), JSON.stringify(v)); },
  remove(k) { localStorage.removeItem(withPrefix(k)); }
};

const subs = new Set();

// ---- safe default filters (merge with any old stored object) ----
const DEFAULT_FILTERS = {
  starred: false,
  weight: [1, 2, 3, 4, 5],
  search: "",
  pos: [],
  cefr: [],
  tags: []
};

const DEFAULT_WEIGHT = [...DEFAULT_FILTERS.weight];
const DEFAULT_UI = { showTranslation: false, currentWordId: '', rowSelectionMode: false };
const DEFAULT_SORT = { key: 'word', dir: 'asc' };
const DEFAULT_COLUMNS = { star: true, weight: true, word: true, definition: true, pos: true, cefr: true, tags: true };

function toNewWeight(raw) {
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
    .map((v) => typeof v === 'string' ? v.toLowerCase() : '')
    .filter(Boolean)
    .sort();
  const normWeight = (list = []) => [...(list || [])]
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

export function filtersKey(filters = {}) {
  return JSON.stringify(canonicalFiltersShape(filters));
}

export function filtersEqual(a, b) {
  return filtersKey(a) === filtersKey(b);
}

function sanitizeFilterSets(list = []) {
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

function loadFilters() {
  const stored = LS.get('filters', {});
  return sanitizeFilters(stored || {});
}

function loadFilterSets() {
  const stored = LS.get('filterSets', []);
  return sanitizeFilterSets(stored || []);
}

function sanitizeUI(ui = {}) {
  return {
    showTranslation: !!ui.showTranslation,
    currentWordId: typeof ui.currentWordId === 'string' ? ui.currentWordId : '',
    rowSelectionMode: !!ui.rowSelectionMode
  };
}

function loadUI() {
  const stored = LS.get('ui', DEFAULT_UI);
  return sanitizeUI(stored || DEFAULT_UI);
}

function migrateSort(sort = DEFAULT_SORT) {
  const keyMap = { spanish: 'word', english: 'definition' };
  const next = typeof sort === 'object' && sort ? { ...sort } : { ...DEFAULT_SORT };
  const rawKey = next.key || DEFAULT_SORT.key;
  const mappedKey = keyMap[rawKey] || rawKey;
  const allowedKeys = new Set(['star', 'weight', 'word', 'definition', 'pos', 'cefr', 'tags']);
  const key = allowedKeys.has(mappedKey) ? mappedKey : DEFAULT_SORT.key;
  const dir = next.dir === 'desc' ? 'desc' : 'asc';
  return { key, dir };
}

function migrateColumns(columns = DEFAULT_COLUMNS) {
  const next = { ...DEFAULT_COLUMNS };
  if (!columns || typeof columns !== 'object') return next;
  Object.entries(columns).forEach(([key, value]) => {
    const mapped = key === 'spanish' ? 'word' : key === 'english' ? 'definition' : key;
    if (mapped in next) next[mapped] = !!value;
  });
  return next;
}

function loadSort() {
  return migrateSort(LS.get('sort', DEFAULT_SORT));
}

function loadColumns() {
  return migrateColumns(LS.get('columns', DEFAULT_COLUMNS));
}

export const State = {
  words: [],
  filters: loadFilters(),
  filterSets: loadFilterSets(),
  sort: loadSort(),
  columns: loadColumns(),
  order: LS.get('order', []),
  ui: loadUI(),

  set(k, v) {
    // ensure we never lose default keys when updating filters
    if (k === 'filters') {
      const prevFilters = this.filters;
      const merged = sanitizeFilters(v || {});
      const changed = !filtersEqual(prevFilters, merged);
      this.filters = merged;
      LS.set('filters', merged);
      if (changed) setCurrentWordId('');
    } else if (k === 'filterSets') {
      const next = sanitizeFilterSets(v || []);
      this.filterSets = next;
      LS.set('filterSets', next);
    } else if (k === 'sort') {
      const next = migrateSort(v);
      this.sort = next;
      LS.set('sort', next);
    } else if (k === 'columns') {
      const next = migrateColumns(v);
      this.columns = next;
      LS.set('columns', next);
    } else if (k === 'ui') {
      const next = sanitizeUI(v || {});
      this.ui = next;
      LS.set('ui', next);
    } else {
      this[k] = v;
      if (['order', 'words', 'ui'].includes(k)) LS.set(k, v);
    }
    subs.forEach(fn => fn());
  }
};

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function forceStateUpdate() { subs.forEach(fn => fn()); }

export const Prog = {
  star(key) { return LS.get('star:' + key, false); },
  setStar(key, v) { LS.set('star:' + key, !!v); subs.forEach(fn => fn()); },
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
    if (!options?.silent) subs.forEach(fn => fn());
  }
};

function normalizeTermPart(value, fallback) {
  const norm = String(value || '').trim().toLowerCase();
  return norm || fallback;
}

export function termKey(word, pos) {
  const baseWord = normalizeTermPart(word, 'unknown');
  const basePos = normalizeTermPart(pos, 'unknown');
  return baseWord + '|' + basePos;
}

export function stableId(es, en) {
  const s = (es || '') + '|' + (en || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'w_' + (h >>> 0).toString(16);
}

export function mapRaw(raw) {
  return raw.map(w => {
    const es = (w.Spanish || w.es || w.word || '').trim();
    const en = (w.English || w.en || w.gloss || '').trim();
    const pos = (w.POS || w.pos || '').trim();
    const cefr = (w.CEFR || w.cefr || '').trim();
    const tags = (w.Tags || w.tags || '').trim();
    return {
      id: stableId(es, en),
      termKey: termKey(es, pos),
      es,
      en,
      pos,
      cefr,
      tags
    };
  });
}

function normTags(s) {
  if (!s) return [];
  return String(s)
    .split(/[|,;]+|\s+/g)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

// ---- filtering & sorting ----
export function applyFilters(list) {
  let out = [...list];

  // Only starred
  if (State.filters.starred) out = out.filter(w => Prog.star(w.termKey));

  // Weight chips (W0–W4)
  const allowed = new Set((State.filters.weight || [1, 2, 3, 4, 5]));
  out = out.filter(w => allowed.has(Prog.weight(w.termKey)));

  // Text search
  const q = (State.filters.search || "").trim().toLowerCase();
  if (q) {
    out = out.filter(w =>
      (w.es && w.es.toLowerCase().includes(q)) ||
      (w.en && w.en.toLowerCase().includes(q))
    );
  }

  // POS / CEFR / Tags multi-select (all guarded)
  const posSet = new Set((State.filters.pos || []).map(s => s.toLowerCase()));
  const cefrSet = new Set((State.filters.cefr || []).map(s => s.toLowerCase()));
  const tagSet = new Set((State.filters.tags || []).map(s => s.toLowerCase()));

  if (posSet.size) out = out.filter(w => w.pos && posSet.has(w.pos.toLowerCase()));
  if (cefrSet.size) out = out.filter(w => w.cefr && cefrSet.has(w.cefr.toLowerCase()));
  if (tagSet.size) out = out.filter(w => normTags(w.tags).some(t => tagSet.has(t)));

  return out;
}

export function setCurrentWordId(wordId) {
  const next = typeof wordId === 'string' ? wordId : '';
  if ((State.ui.currentWordId || '') === next) return;
  State.set('ui', { ...State.ui, currentWordId: next });
}

export function setRowSelectionMode(enabled) {
  const want = !!enabled;
  if (!!State.ui?.rowSelectionMode === want) return;
  State.set('ui', { ...State.ui, rowSelectionMode: want });
}

export function isRowSelectionModeEnabled() {
  return !!State.ui?.rowSelectionMode;
}

export function sortWords(list) {
  const { key, dir } = State.sort;
  const m = dir === 'asc' ? 1 : -1;
  const get = (w) => {
    if (key === 'star') return Prog.star(w.termKey) ? 1 : 0;
    if (key === 'weight') return Prog.weight(w.termKey);
    if (key === 'word') return (w.es || '').toLowerCase();
    if (key === 'definition') return (w.en || '').toLowerCase();
    return (w[key] || '').toLowerCase();
  };
  return [...list].sort((a, b) => get(a) > get(b) ? m : get(a) < get(b) ? -m : 0);
}

export function shuffledIds(list) {
  const ids = list.map(w => w.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
