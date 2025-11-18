import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import TopBar from '../../src/svelte/TopBar.svelte';
import { State, setFilters, setOrder, setSort, setFilterSets } from '../../src/state/index.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../src/state/persistence.ts';
import type { RawWord } from '../../src/state/data.ts';
import { mapRaw } from '../../src/state/data.ts';

const RAW_WORDS: RawWord[] = [
  { word: 'uno', definition: 'one', POS: 'n', CEFR: 'A1', Tags: 'number' },
  { word: 'dos', definition: 'two', POS: 'n', CEFR: 'A1', Tags: 'number' },
  { word: 'hola', definition: 'hello', POS: 'int', CEFR: 'A1', Tags: 'greeting' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  setFilterSets([]);
  State.set('words', []);
}

describe('TopBar component', () => {
  beforeEach(() => {
    resetState();
    State.set('words', mapRaw(RAW_WORDS));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
    vi.unstubAllGlobals();
  });

  it('triggers shuffle and clears sort', () => {
    setSort({ key: 'word', dir: 'desc' });
    const { container, unmount } = render(TopBar);
    const shuffle = container.querySelector<HTMLButtonElement>('.chip');
    expect(shuffle).toBeTruthy();
    shuffle!.click();
    expect(State.sort.key).toBe('');
    expect(State.order.length).toBe(State.words.length);
    unmount();
  });

  it('saves and loads filter sets', async () => {
    const { container, unmount } = render(TopBar);

    // open popover
    const filtersChip = container.querySelector<HTMLButtonElement>('#filters-chip')!;
    const toggleFilters = async () => {
      filtersChip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
    };
    await toggleFilters();

    let popover = container.querySelector('.popover');
    if (!popover) {
      await toggleFilters();
      popover = container.querySelector('.popover');
    }
    expect(popover).toBeTruthy();
    const saveButton = popover!.querySelector<HTMLButtonElement>('button[aria-label*="Save"]')!;
    const loadButton = popover!.querySelector<HTMLButtonElement>('button[aria-label*="Load"]')!;
    const updateButton = popover!.querySelector<HTMLButtonElement>('button[aria-label*="Update"]')!;

    vi.stubGlobal('prompt', () => 'Test set');
    setFilters({ ...State.filters, starred: true });
    saveButton.click();
    await tick();
    const select = popover.querySelector('select')!;
    const options = Array.from(select.querySelectorAll('option')).filter((opt) => opt.value);
    expect(options.length).toBeGreaterThan(0);
    select.value = options[0].value;
    select.dispatchEvent(new Event('change'));
    loadButton.click();
    expect(State.filters.starred).toBe(true);

    setFilters({ ...State.filters, starred: false });
    updateButton.click();
    expect(State.filters.starred).toBe(false);

    unmount();
  });
});
