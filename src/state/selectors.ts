// src/state/selectors.ts
import { State, Prog } from './store.ts';
import { normalizeTagsList, type VocabEntry } from './data.ts';

export function applyFilters(list: VocabEntry[] = []): VocabEntry[] {
  let out = Array.isArray(list) ? [...list] : [];

  if (State.filters.starred) {
    out = out.filter((w) => Prog.star(w.termKey));
  }

  const allowedWeights = new Set(State.filters.weight || [1, 2, 3, 4, 5]);
  out = out.filter((w) => allowedWeights.has(Prog.weight(w.termKey)));

  const q = (State.filters.search || '').trim().toLowerCase();
  if (q) {
    out = out.filter(
      (w) =>
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.definition && w.definition.toLowerCase().includes(q))
    );
  }

  const posSet = new Set((State.filters.pos || []).map((s) => s.toLowerCase()));
  const cefrSet = new Set((State.filters.cefr || []).map((s) => s.toLowerCase()));
  const tagSet = new Set((State.filters.tags || []).map((s) => s.toLowerCase()));

  if (posSet.size) out = out.filter((w) => w.pos && posSet.has(w.pos.toLowerCase()));
  if (cefrSet.size) out = out.filter((w) => w.cefr && cefrSet.has(w.cefr.toLowerCase()));
  if (tagSet.size) out = out.filter((w) => normalizeTagsList(w.tags).some((t) => tagSet.has(t)));

  return out;
}

export function sortWords(list: VocabEntry[] = []): VocabEntry[] {
  const { key, dir } = State.sort;
  const m = dir === 'asc' ? 1 : -1;
  const get = (w: VocabEntry): string | number => {
    if (key === 'star') return Prog.star(w.termKey) ? 1 : 0;
    if (key === 'weight') return Prog.weight(w.termKey);
    if (key === 'word') return (w.word || '').toLowerCase();
    if (key === 'definition') return (w.definition || '').toLowerCase();
    return (w as Record<string, string>)[key] ? (w as Record<string, string>)[key].toLowerCase() : '';
  };
  return [...list].sort((a, b) => (get(a) > get(b) ? m : get(a) < get(b) ? -m : 0));
}

export function shuffledIds(list: VocabEntry[] = []): string[] {
  const ids = list.map((w) => w.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
