import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import WordMatch from '../../src/svelte/WordMatch.svelte';
import { State, setFilters, setOrder, setSort } from '../../assets/state.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../assets/state/persistence.ts';
import type { VocabEntry } from '../../assets/state/data.ts';

const SAMPLE_WORDS: VocabEntry[] = [
  { id: 'a', termKey: 'uno|n', word: 'uno', definition: 'one', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'b', termKey: 'dos|n', word: 'dos', definition: 'two', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'c', termKey: 'tres|n', word: 'tres', definition: 'three', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'd', termKey: 'cuatro|n', word: 'cuatro', definition: 'four', pos: 'n', cefr: 'A1', tags: '' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  State.set('words', []);
}

describe('WordMatch component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetState();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows empty state when not enough words are available', async () => {
    State.set('words', SAMPLE_WORDS.slice(0, 1));
    const { container, unmount } = render(WordMatch);
    await tick();
    const empty = container.querySelector('.match-empty');
    expect(empty?.textContent).toContain('Need at least two filtered words');
    unmount();
  });

  it('clears matched cards after selecting the correct pair', async () => {
    State.set('words', SAMPLE_WORDS);
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container, unmount } = render(WordMatch);
    await tick();

    const leftCard = container.querySelector<HTMLButtonElement>('.match-column:first-child .match-card');
    expect(leftCard).toBeTruthy();
    leftCard!.click();
    const pairId = leftCard!.dataset.pairId;
    const rightCard = container.querySelector<HTMLButtonElement>(
      `.match-card[data-column="right"][data-pair-id="${pairId}"]`
    );
    expect(rightCard).toBeTruthy();
    rightCard!.click();

    vi.advanceTimersByTime(600);
    await tick();
    expect(leftCard!.classList.contains('is-cleared')).toBe(true);
    expect(rightCard!.classList.contains('is-cleared')).toBe(true);

    unmount();
  });
});
