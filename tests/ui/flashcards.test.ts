import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import Flashcards from '../../src/svelte/Flashcards.svelte';
import { State, setFilters, setOrder, setSort } from '../../src/state/index.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../src/state/persistence.ts';
import type { VocabEntry } from '../../src/state/data.ts';

const SAMPLE_WORDS: VocabEntry[] = [
  { id: 'w1', termKey: 'uno|n', word: 'uno', definition: 'one', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w2', termKey: 'dos|n', word: 'dos', definition: 'two', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w3', termKey: 'tres|n', word: 'tres', definition: 'three', pos: 'n', cefr: 'A1', tags: '' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  State.set('words', []);
}

describe('Flashcards component', () => {
  beforeEach(() => {
    resetState();
    State.set('words', SAMPLE_WORDS);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
    vi.restoreAllMocks();
  });

  it('advances via keyboard shortcuts', async () => {
    const { container, unmount } = render(Flashcards);
    await tick();

    const progressLabel = container.querySelector('.choice-progress-label')!;
    expect(progressLabel.textContent).toContain('Card 1');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await tick();
    expect(progressLabel.textContent).toContain('Card 2');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // flip
    await tick();
    const card = container.querySelector('.card')!;
    expect(card.textContent?.trim().length).toBeGreaterThan(0);

    unmount();
  });

  it('adjusts progress slider and weight', async () => {
    const { container, unmount } = render(Flashcards);
    await tick();
    const slider = container.querySelector<HTMLInputElement>('.flash-progress-slider')!;
    slider.value = '2';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const progressLabel = container.querySelector('.choice-progress-label')!;
    expect(progressLabel.textContent).toContain('Card 2');

    const firstButton = container.querySelector<HTMLButtonElement>('.topright button.iconbtn');
    expect(firstButton).toBeTruthy();
    firstButton!.click();
    await tick();

    const weightControl = container.querySelector('.topright .weight-spark')!;
    const plus = weightControl.querySelectorAll<HTMLButtonElement>('button')[1];
    plus.click();
    plus.click();
    await tick();
    expect(weightControl.dataset.value).toBe('5');

    unmount();
  });
});
