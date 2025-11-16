import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyFilters, sortWords, shuffledIds } from '../../assets/state/selectors.ts';
import { State, Prog } from '../../assets/state/store.ts';

const baseWords = [
  { id: '1', termKey: 'hola|noun', word: 'Hola', definition: 'Hello', pos: 'noun', cefr: 'A1', tags: 'greeting' },
  { id: '2', termKey: 'adios|noun', word: 'Adios', definition: 'Goodbye', pos: 'noun', cefr: 'A2', tags: 'farewell' },
  { id: '3', termKey: 'comer|verb', word: 'Comer', definition: 'To eat', pos: 'verb', cefr: 'A2', tags: 'verb,food' }
];

describe('state/selectors', () => {
  beforeEach(() => {
    State.filters = { starred: false, weight: [1, 2, 3, 4, 5], search: '', pos: [], cefr: [], tags: [] };
    State.sort = { key: 'word', dir: 'asc' };
    vi.spyOn(Prog, 'star').mockImplementation(() => false);
    vi.spyOn(Prog, 'weight').mockImplementation(() => 3);
  });

  it('filters by starred flag', () => {
    Prog.star.mockImplementation((key) => key === 'hola|noun');
    State.filters.starred = true;
    const filtered = applyFilters(baseWords);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('filters by search, pos, cefr, tags', () => {
    State.filters.search = 'ad';
    State.filters.pos = ['noun'];
    State.filters.cefr = ['a2'];
    State.filters.tags = ['farewell'];
    const filtered = applyFilters(baseWords);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('sorts words by selected key and direction', () => {
    State.sort = { key: 'definition', dir: 'desc' };
    const sorted = sortWords(baseWords);
    expect(sorted[0].id).toBe('3'); // "To eat" comes after "Goodbye" / "Hello" descending
    State.sort = { key: 'word', dir: 'asc' };
    const sortedAsc = sortWords(baseWords);
    expect(sortedAsc[0].id).toBe('2'); // Adios
  });

  it('shuffles ids without dropping any', () => {
    const ids = shuffledIds(baseWords);
    expect(ids).toHaveLength(baseWords.length);
    expect(new Set(ids).size).toBe(baseWords.length);
  });
});
