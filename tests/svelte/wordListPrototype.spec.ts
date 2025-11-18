import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import WordListPrototype from '../../src/svelte/WordListPrototype.svelte';
import {
  hydrateWords,
  setSort,
  clearOrder,
  setRowSelectionMode,
  type RawWord
} from '../../src/state/index.ts';

const sampleWords: RawWord[] = [
  {
    word: 'hola',
    definition: 'hello',
    pos: 'interj',
    cefr: 'A1',
    tags: 'greeting'
  },
  {
    word: 'adios',
    definition: 'goodbye',
    pos: 'interj',
    cefr: 'A1',
    tags: 'farewell'
  }
];

describe('WordListPrototype.svelte', () => {
  beforeEach(() => {
    localStorage.clear();
    hydrateWords(sampleWords, { source: 'test', loaderStatus: 'loaded' });
    setSort({ key: 'word', dir: 'asc' });
    clearOrder();
    setRowSelectionMode(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders rows from the shared store snapshot', () => {
    const { getByText } = render(WordListPrototype);
    expect(getByText('hola')).toBeTruthy();
    expect(getByText('adios')).toBeTruthy();
    expect(getByText('goodbye')).toBeTruthy();
  });

  it('updates the sort header direction when clicked', async () => {
    const { getAllByRole } = render(WordListPrototype);
    const headerCells = getAllByRole('columnheader');
    const wordHeader = headerCells.find((cell) => cell.textContent?.includes('Word'));
    expect(wordHeader?.getAttribute('aria-sort')).toBe('ascending');
    await fireEvent.click(wordHeader!);
    expect(wordHeader?.getAttribute('aria-sort')).toBe('descending');
  });
});
