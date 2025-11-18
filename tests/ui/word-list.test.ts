import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import WordListPrototype from '../../src/svelte/WordListPrototype.svelte';
import { State, setFilters, setOrder, setSort } from '../../assets/state.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../assets/state/persistence.ts';
import type { VocabEntry } from '../../assets/state/data.ts';

const SAMPLE_WORDS: VocabEntry[] = [
  { id: 'a', termKey: 'hola|int', word: 'hola', definition: 'hello', pos: 'int', cefr: 'A1', tags: '' },
  { id: 'b', termKey: 'adios|int', word: 'adiós', definition: 'bye', pos: 'int', cefr: 'A1', tags: '' },
  { id: 'c', termKey: 'gracias|int', word: 'gracias', definition: 'thanks', pos: 'int', cefr: 'A1', tags: '' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  State.set('words', []);
}

describe('WordList component', () => {
  beforeEach(() => {
    resetState();
    State.set('words', SAMPLE_WORDS);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
  });

  it('sorts when clicking header', async () => {
    const { container, unmount } = render(WordListPrototype);
    await tick();
    const weightHeader = container.querySelector('th[data-key="word"]')!;
    weightHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(State.sort.key).toBe('word');
    expect(State.sort.dir).toBe('desc');
    unmount();
  });

  it('enters selection mode after pointer interaction', async () => {
    const { container, unmount } = render(WordListPrototype);
    await tick();
    const firstRow = container.querySelector<HTMLTableRowElement>('tbody tr')!;
    vi.useFakeTimers();
    firstRow.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    vi.advanceTimersByTime(700);
    expect(State.ui.rowSelectionMode).toBe(true);
    vi.useRealTimers();
    unmount();
  });
});
