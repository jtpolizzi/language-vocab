import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import MultipleChoice from '../../src/svelte/MultipleChoice.svelte';
import { State, setFilters, setOrder, setSort } from '../../src/state/index.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../src/state/persistence.ts';
import type { VocabEntry } from '../../src/state/data.ts';

const SAMPLE_WORDS: VocabEntry[] = [
  { id: 'w1', termKey: 'uno|n', word: 'uno', definition: 'one', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w2', termKey: 'dos|n', word: 'dos', definition: 'two', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w3', termKey: 'tres|n', word: 'tres', definition: 'three', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w4', termKey: 'cuatro|n', word: 'cuatro', definition: 'four', pos: 'n', cefr: 'A1', tags: '' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  State.set('words', []);
}

describe('MultipleChoice component', () => {
  beforeEach(() => {
    resetState();
    State.set('words', SAMPLE_WORDS);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders a question and accepts the correct answer', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // keep shuffle deterministic
    const { container, unmount } = render(MultipleChoice);
    await tick();

    const questionText = container.querySelector('.choice-question-text')!;
    const promptWord = questionText.textContent || '';
    expect(SAMPLE_WORDS.some((entry) => entry.word === promptWord)).toBe(true);

    const feedback = container.querySelector('.choice-feedback')!;
    const targetEntry = SAMPLE_WORDS.find((entry) => entry.word === promptWord)!;
    const correctBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('.choice-answer')).find(
      (btn) => btn.textContent?.includes(targetEntry.definition)
    );
    expect(correctBtn).toBeTruthy();
    correctBtn!.click();
    await tick();
    expect(feedback.textContent).toBe('Correct!');

    vi.runOnlyPendingTimers();
    unmount();
  });

  it('shows the continue button after a wrong answer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container, unmount } = render(MultipleChoice);
    await tick();

    const wrongBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('.choice-answer')).find(
      (btn) => !btn.textContent?.includes('one')
    );
    expect(wrongBtn).toBeTruthy();
    wrongBtn!.click();
    await tick();

    const feedback = container.querySelector('.choice-feedback')!;
    expect(feedback.textContent).toContain('Not quite');
    const continueBtn = container.querySelector('.choice-continue') as HTMLButtonElement;
    expect(continueBtn.hidden).toBe(false);
    expect(continueBtn.disabled).toBe(false);

    unmount();
  });
});
