import { describe, it, expect } from 'vitest';
import { termKey, stableId, mapRaw } from '../../assets/state/data.ts';

describe('state/data utilities', () => {
  it('builds canonical term keys', () => {
    expect(termKey('Hola', 'Noun')).toBe('hola|noun');
    expect(termKey('  ', 'Verb')).toBe('unknown|verb');
    expect(termKey('Gracias', '')).toBe('gracias|unknown');
  });

  it('creates stable ids for identical pairs', () => {
    const first = stableId('hola', 'hello');
    const second = stableId('hola', 'hello');
    const different = stableId('hola', 'hi');
    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });

  it('maps raw entries with fallbacks', () => {
    const raw = [
      { word: 'hola', definition: 'hello', POS: 'noun', CEFR: 'A1', Tags: 'greeting' },
      { Spanish: 'adios', English: 'goodbye' }
    ];
    const mapped = mapRaw(raw);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      word: 'hola',
      definition: 'hello',
      pos: 'noun',
      cefr: 'A1',
      tags: 'greeting'
    });
    expect(mapped[1]).toMatchObject({
      word: 'adios',
      definition: 'goodbye',
      pos: '',
      cefr: ''
    });
  });
});
