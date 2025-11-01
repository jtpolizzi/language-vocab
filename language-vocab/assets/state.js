// assets/state.js
export const LS = {
  get(k, d) {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const subs = new Set();

// ---- safe default filters (merge with any old stored object) ----
const DEFAULT_FILTERS = {
  starred: false,
  weight: [0, 1, 2, 3, 4],
  search: "",
  pos: [],
  cefr: [],
  tags: []
};
function loadFilters() {
  const stored = LS.get('v23:filters', {});
  const weight = Array.isArray(stored?.weight) ? stored.weight : DEFAULT_FILTERS.weight;
  return { ...DEFAULT_FILTERS, ...(stored || {}), weight };
}

export const State = {
  words: [],
  filters: loadFilters(),
  sort: LS.get('v23:sort', { key: 'spanish', dir: 'asc' }),
  columns: LS.get('v23:columns', { star: true, weight: true, spanish: true, english: true, pos: true, cefr: true, tags: true }),
  order: LS.get('v23:order', []),
  ui: LS.get('v23:ui', { showTranslation: false }),

  set(k, v) {
    // ensure we never lose default keys when updating filters
    if (k === 'filters') {
      const merged = { ...DEFAULT_FILTERS, ...(v || {}) };
      this.filters = merged;
      LS.set('v23:filters', merged);
    } else {
      this[k] = v;
      if (['sort', 'columns', 'order', 'words', 'ui'].includes(k)) LS.set('v23:' + k, v);
    }
    subs.forEach(fn => fn());
  }
};

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export const Prog = {
  star(id) { return LS.get('v23:star:' + id, false); },
  setStar(id, v) { LS.set('v23:star:' + id, !!v); subs.forEach(fn => fn()); },
  weight(id) {
    const v = LS.get('v23:wt:' + id, 0);
    return (v >= 0 && v <= 4) ? v : 0;
  },
  setWeight(id, v) {
    LS.set('v23:wt:' + id, Math.max(0, Math.min(4, v | 0)));
    subs.forEach(fn => fn());
  }
};

export function stableId(es, en) {
  const s = (es || '') + '|' + (en || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'w_' + (h >>> 0).toString(16);
}

export function mapRaw(raw) {
  return raw.map(w => ({
    id: stableId(w.Spanish || w.es || w.word, w.English || w.en || w.gloss),
    es: (w.Spanish || w.es || w.word || '').trim(),
    en: (w.English || w.en || w.gloss || '').trim(),
    pos: (w.POS || w.pos || '').trim(),
    cefr: (w.CEFR || w.cefr || '').trim(),
    tags: (w.Tags || w.tags || '').trim()
  }));
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
  if (State.filters.starred) out = out.filter(w => Prog.star(w.id));

  // Weight chips (W0–W4)
  const allowed = new Set((State.filters.weight || [0, 1, 2, 3, 4]));
  out = out.filter(w => allowed.has(Prog.weight(w.id)));

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

export function sortWords(list) {
  const { key, dir } = State.sort;
  const m = dir === 'asc' ? 1 : -1;
  const get = (w) => {
    if (key === 'star') return Prog.star(w.id) ? 1 : 0;
    if (key === 'weight') return Prog.weight(w.id);
    if (key === 'spanish') return (w.es || '').toLowerCase();
    if (key === 'english') return (w.en || '').toLowerCase();
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
