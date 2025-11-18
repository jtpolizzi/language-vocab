<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { topBarStore, topBarActions } from './stateBridge';
  import {
    State,
    applyFilters,
    sortWords,
    shuffledIds,
    sanitizeFilters,
    filtersEqual,
    type Filters,
    type FilterSet
  } from '../../assets/state.ts';
  import { openSettingsModal } from './openSettingsModal.ts';
  import { WEIGHT_DESCRIPTIONS, WEIGHT_SHORT_LABELS } from '../../assets/components/WeightControl.ts';
  import ChipButton from './ui/ChipButton.svelte';

  const ALL_WEIGHTS = [1, 2, 3, 4, 5] as const;
  const SPARK_PATH =
    'M9 4.5c.335 0 .629.222.721.544l.813 2.846c.356 1.246 1.33 2.219 2.576 2.575l2.846.814c.322.092.544.386.544.721s-.222.629-.544.721l-2.846.813c-1.246.356-2.22 1.33-2.576 2.576l-.813 2.846c-.092.322-.386.544-.721.544s-.629-.222-.721-.544l-.813-2.846c-.356-1.246-1.33-2.22-2.576-2.576l-2.846-.813C2.222 12.629 2 12.335 2 12s.222-.629.544-.721l2.846-.814c1.246-.356 2.22-1.33 2.576-2.575l.813-2.846C8.371 4.722 8.665 4.5 9 4.5Zm9-3c.344 0 .644.234.728.568l.259 1.035c.235.94.97 1.675 1.91 1.91l1.035.259c.334.083.568.383.568.728s-.234.644-.568.727l-1.035.259c-.94.235-1.675.97-1.91 1.91l-.259 1.035A.75.75 0 0 1 18 10.5a.75.75 0 0 1-.728-.568l-.259-1.035c-.235-.94-.97-1.675-1.91-1.91l-1.035-.259A.75.75 0 0 1 13.5 6c0-.345.234-.645.568-.728l1.035-.259c.94-.235 1.675-.97 1.91-1.91l.259-1.035A.75.75 0 0 1 18 1.5Zm-1.5 13.5c.323 0 .61.206.712.513l.394 1.183c.149.448.501.8.949.949l1.183.394c.306.102.512.389.512.712s-.206.61-.512.712l-1.183.394a1.5 1.5 0 0 0-.949.949l-.394 1.183a.75.75 0 0 1-1.424 0l-.394-1.183a1.5 1.5 0 0 0-.949-.949l-1.183-.394A.75.75 0 0 1 12.75 18c0-.323.206-.61.512-.712l1.183-.394a1.5 1.5 0 0 0 .949-.949l.394-1.183a.75.75 0 0 1 .712-.513Z';

  const topBarState = topBarStore;
  const { setFilters, setFilterSets, setSort, setOrder } = topBarActions;

  let filters: Filters = State.filters;
  let filterSets: FilterSet[] = [];
  let filterCount = 0;
  let resultLabel = '';
  let posValues: string[] = [];
  let cefrValues: string[] = [];
  let tagValues: string[] = [];
  let showFilters = false;
  let filtersChipEl: HTMLButtonElement | null = null;
  let popoverEl: HTMLDivElement | null = null;
  let searchInput: HTMLInputElement | null = null;
  let searchValue = '';
  let searchFocused = false;
  let searchDebounce: number | null = null;
  let selectedSetId = '';
  let lastSelectedSetId = '';
  let statusMessage = '';
  let documentClickCleanup: (() => void) | null = null;
  let shortcutCleanup: (() => void) | null = null;

  $: filters = $topBarState.filters;
  $: filterSets = $topBarState.filterSets || [];
  $: filterCount = activeFilterCount(filters);
  $: resultLabel = `${$topBarState.resultCount} result${$topBarState.resultCount === 1 ? '' : 's'}`;
  $: posValues = $topBarState.posValues || [];
  $: cefrValues = $topBarState.cefrValues || [];
  $: tagValues = $topBarState.tagValues || [];

  $: if (!searchFocused) {
    searchValue = filters.search || '';
  }

  $: {
    const nextId = syncSelectedSetId(selectedSetId, filterSets, filters);
    if (nextId !== selectedSetId) {
      selectedSetId = nextId;
    }
  }

  $: statusMessage = computeSavedSetStatus(selectedSetId, filterSets, filters);

  $: if (showFilters) {
    setupDocumentClose();
  } else {
    teardownDocumentClose();
  }

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput?.focus();
      }
      if (event.key === 'Escape' && showFilters) {
        event.preventDefault();
        showFilters = false;
      }
    };
    window.addEventListener('keydown', handler);
    shortcutCleanup = () => window.removeEventListener('keydown', handler);
    return () => {
      shortcutCleanup?.();
      shortcutCleanup = null;
    };
  });

  onDestroy(() => {
    teardownDocumentClose();
    if (searchDebounce !== null) {
      window.clearTimeout(searchDebounce);
      searchDebounce = null;
    }
    shortcutCleanup?.();
  });

  function handleShuffle() {
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);
    setOrder(shuffledIds(sorted));
    setSort({ key: '', dir: 'asc' });
  }

  function toggleFilters(event?: MouseEvent) {
    event?.stopPropagation();
    showFilters = !showFilters;
  }

  function setupDocumentClose() {
    if (documentClickCleanup) return;
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!showFilters) return;
      if (
        target instanceof Node &&
        (popoverEl?.contains(target) || filtersChipEl === target || filtersChipEl?.contains(target))
      ) {
        return;
      }
      showFilters = false;
    };
    window.addEventListener('click', handler);
    documentClickCleanup = () => {
      window.removeEventListener('click', handler);
      documentClickCleanup = null;
    };
  }

  function teardownDocumentClose() {
    documentClickCleanup?.();
  }

  function handleSearchInput(value: string) {
    if (searchDebounce !== null) {
      window.clearTimeout(searchDebounce);
    }
    searchDebounce = window.setTimeout(() => {
      setFilters({ ...filters, search: value });
    }, 200);
  }

  function toggleStarred() {
    setFilters({ ...filters, starred: !filters.starred });
  }

  function toggleWeight(weight: number) {
    const set = new Set(filters.weight?.length ? filters.weight : ALL_WEIGHTS);
    if (set.has(weight)) {
      set.delete(weight);
    } else {
      set.add(weight);
    }
    const next = [...set].sort((a, b) => a - b);
    setFilters({ ...filters, weight: next.length ? next : [...ALL_WEIGHTS] });
  }

  function facetValuesList(key: keyof Filters): string[] {
    const values = filters[key];
    return Array.isArray(values) ? values.map((v) => v.toLowerCase()) : [];
  }

  function toggleFacet(key: 'pos' | 'cefr' | 'tags', value: string, checked: boolean) {
    const current = new Set(facetValuesList(key));
    const valueLower = value.toLowerCase();
    if (checked) {
      current.add(valueLower);
    } else {
      current.delete(valueLower);
    }
    setFilters({ ...filters, [key]: [...current] });
  }

  function handleClearFilters() {
    setFilters({ ...filters, pos: [], cefr: [], tags: [], weight: [...ALL_WEIGHTS] });
    selectedSetId = '';
    lastSelectedSetId = '';
  }

  function hasSelection() {
    return !!selectedSetId && filterSets.some((set) => set.id === selectedSetId);
  }

  function handleLoadSet() {
    if (!hasSelection()) return;
    const found = filterSets.find((set) => set.id === selectedSetId);
    if (!found) return;
    lastSelectedSetId = found.id;
    setFilters(sanitizeFilters(found.filters));
    showFilters = false;
  }

  function handleSaveSet() {
    const sets = filterSets;
    const defaultName =
      (selectedSetId && sets.find((set) => set.id === selectedSetId)?.name) || 'New filter set';
    const input = prompt('Save current filters as…', defaultName);
    if (input == null) return;
    const name = input.trim();
    if (!name) return;
    const filtersToSave = sanitizeFilters(filters);
    const existing = sets.find((set) => set.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const ok = confirm(`Replace the saved set “${existing.name}”?`);
      if (!ok) return;
      const next = sets.map((set) => (set.id === existing.id ? { ...set, name, filters: filtersToSave } : set));
      selectedSetId = existing.id;
      lastSelectedSetId = existing.id;
      setFilterSets(next);
      return;
    }
    const newSet: FilterSet = {
      id: newFilterSetId(),
      name,
      filters: filtersToSave
    };
    selectedSetId = newSet.id;
    lastSelectedSetId = newSet.id;
    setFilterSets([...sets, newSet]);
  }

  function handleUpdateSet() {
    if (!hasSelection()) return;
    const filtersToSave = sanitizeFilters(filters);
    const next = filterSets.map((set) =>
      set.id === selectedSetId ? { ...set, filters: filtersToSave } : set
    );
    lastSelectedSetId = selectedSetId;
    setFilterSets(next);
  }

  function handleDeleteSet() {
    if (!hasSelection()) return;
    const target = filterSets.find((set) => set.id === selectedSetId);
    if (!target) return;
    if (!confirm(`Delete the saved set “${target.name}”?`)) return;
    const next = filterSets.filter((set) => set.id !== selectedSetId);
    if (lastSelectedSetId === selectedSetId) {
      lastSelectedSetId = '';
    }
    selectedSetId = '';
    setFilterSets(next);
  }

  function syncSelectedSetId(currentId: string, sets: FilterSet[], currentFilters: Filters) {
    let nextId = currentId;
    const matchesCurrent = nextId && sets.some((set) => set.id === nextId);
    if (!matchesCurrent) {
      if (nextId && lastSelectedSetId === nextId) {
        lastSelectedSetId = '';
      }
      nextId = '';
    }
    if (!nextId) {
      if (lastSelectedSetId && sets.some((set) => set.id === lastSelectedSetId)) {
        nextId = lastSelectedSetId;
      } else {
        const matching = sets.find((set) => filtersEqual(currentFilters, set.filters));
        if (matching) {
          nextId = matching.id;
          lastSelectedSetId = matching.id;
        }
      }
    }
    return nextId;
  }

  function computeSavedSetStatus(currentId: string, sets: FilterSet[], currentFilters: Filters) {
    if (!sets.length) {
      return 'Save the current filters to reuse them later.';
    }
    const selected = sets.find((set) => set.id === currentId);
    const matching = sets.find((set) => filtersEqual(currentFilters, set.filters));
    if (selected) {
      return filtersEqual(currentFilters, selected.filters)
        ? `Current filters match “${selected.name}”.`
        : 'Current filters differ from the selected set.';
    }
    if (matching) {
      return `Current filters match “${matching.name}”.`;
    }
    return '';
  }

  function newFilterSetId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `fs_${Math.random().toString(36).slice(2, 10)}`;
  }

  function activeFilterCount(currentFilters: Filters) {
    const weightActive = currentFilters.weight.length < ALL_WEIGHTS.length ? 1 : 0;
    return (
      (currentFilters.starred ? 1 : 0) +
      weightActive +
      (currentFilters.pos?.length || 0) +
      (currentFilters.cefr?.length || 0) +
      (currentFilters.tags?.length || 0)
    );
  }

  function isFacetChecked(key: 'pos' | 'cefr' | 'tags', value: string) {
    const set = new Set(facetValuesList(key));
    return set.has(value.toLowerCase());
  }

  function isWeightChecked(weight: number) {
    const set = new Set(filters.weight?.length ? filters.weight : ALL_WEIGHTS);
    return set.has(weight);
  }

  function handleSelectChange(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    selectedSetId = select.value;
    lastSelectedSetId = selectedSetId || '';
  }
</script>

<section class="panel panel--topbar topbar--svelte">
  <div class="row">
    <ChipButton type="button" on:click={handleShuffle}>
      Shuffle
    </ChipButton>
    <ChipButton
      id="filters-chip"
      pressed={filterCount > 0}
      aria-expanded={showFilters}
      bind:el={filtersChipEl}
      on:click={toggleFilters}
    >
      {filterCount ? `Filters (${filterCount})` : 'Filters'}
    </ChipButton>
    <span class="spacer" aria-hidden="true"></span>
    <span class="countpill topbar-countpill">
      {resultLabel}
    </span>
    <ChipButton icon aria-label="Settings" title="Settings" on:click={() => openSettingsModal()}>
      <span aria-hidden="true">⚙︎</span>
    </ChipButton>
    <input
      class="search"
      type="search"
      placeholder="Search…"
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
      bind:this={searchInput}
      bind:value={searchValue}
      on:input={(event) => handleSearchInput((event.currentTarget as HTMLInputElement).value)}
      on:focus={() => (searchFocused = true)}
      on:blur={() => {
        searchFocused = false;
        searchValue = filters.search || '';
      }}
    />
  </div>

  {#if showFilters}
    <div class="popover filters-popover" bind:this={popoverEl}>
      <div class="filters-popover-header">
        <div class="filters-heading">Saved filter sets</div>
        <div class="saved-sets-row">
          <select
            class="saved-sets-select"
            bind:value={selectedSetId}
            on:change={handleSelectChange}
            disabled={!filterSets.length}
          >
            <option value="">
              {filterSets.length ? 'Select a saved set…' : 'No saved sets yet'}
            </option>
            {#each filterSets as set}
              <option value={set.id}>
                {set.name}
              </option>
            {/each}
          </select>
          <ChipButton
            icon
            aria-label="Load selected set"
            title="Load selected set"
            disabled={!hasSelection()}
            on:click={handleLoadSet}
          >
            <span aria-hidden="true">⇩</span>
          </ChipButton>
          <ChipButton
            icon
            aria-label="Update selected set"
            title="Update selected set"
            disabled={!hasSelection()}
            on:click={handleUpdateSet}
          >
            <span aria-hidden="true">⟳</span>
          </ChipButton>
          <ChipButton
            icon
            aria-label="Save current filters as new set"
            title="Save current filters as new set"
            on:click={handleSaveSet}
          >
            <span aria-hidden="true">＋</span>
          </ChipButton>
          <ChipButton
            icon
            aria-label="Delete selected set"
            title="Delete selected set"
            disabled={!hasSelection()}
            on:click={handleDeleteSet}
          >
            <span aria-hidden="true">🗑</span>
          </ChipButton>
        </div>
        {#if statusMessage}
          <div class="saved-status">
            {statusMessage}
          </div>
        {/if}
      </div>

      <div class="quick-filters-header">
        <div class="quick-filters-title">Quick filters</div>
        <ChipButton pressed={filters.starred} on:click={toggleStarred}>
          Only ★
        </ChipButton>
      </div>

      <div class="facet-columns">
        <div class="facet-column">
          <div class="facet-column-title">POS</div>
          <div class="facet-options">
            {#each posValues as value}
              <label class="facet-option">
                <input
                  type="checkbox"
                  checked={isFacetChecked('pos', value)}
                  on:change={(event) => toggleFacet('pos', value, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span>{value}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="facet-column">
          <div class="facet-column-title">CEFR</div>
          <div class="facet-options">
            {#each cefrValues as value}
              <label class="facet-option">
                <input
                  type="checkbox"
                  checked={isFacetChecked('cefr', value)}
                  on:change={(event) => toggleFacet('cefr', value, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span>{value}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="facet-column">
          <div class="facet-column-title">Tags</div>
          <div class="facet-options">
            {#if tagValues.length === 0}
              <span class="facet-empty">No tags detected yet.</span>
            {:else}
              {#each tagValues as value}
                <label class="facet-option">
                  <input
                    type="checkbox"
                    checked={isFacetChecked('tags', value)}
                    on:change={(event) => toggleFacet('tags', value, (event.currentTarget as HTMLInputElement).checked)}
                  />
                  <span>{value}</span>
                </label>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <div class="weight-section">
        <div class="facet-column-title">Weight</div>
        <div class="weight-chip-row">
          {#each ALL_WEIGHTS as weight}
            <button
              type="button"
              class={`weight-chip weight-chip--${weight}`}
              aria-pressed={isWeightChecked(weight)}
              title={WEIGHT_DESCRIPTIONS[weight]}
              on:click={() => toggleWeight(weight)}
            >
              <svg class="weight-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={SPARK_PATH} fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
              </svg>
              <span>{WEIGHT_SHORT_LABELS[weight]}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="filters-footer">
        <ChipButton on:click={handleClearFilters}>
          Clear
        </ChipButton>
        <ChipButton on:click={() => (showFilters = false)}>
          Close
        </ChipButton>
      </div>
    </div>
  {/if}
</section>

<style>
  .topbar-countpill {
    opacity: 0.85;
    font-weight: 700;
    margin-right: 8px;
  }

  .panel--topbar {
    margin: 8px 0 0;
    padding: 8px 16px 10px;
  }

  .popover {
    background: #151a31;
    color: var(--fg);
  }

  .popover label {
    color: var(--fg);
  }

  .popover input[type='checkbox'] {
    accent-color: var(--accent);
  }

  .popover select {
    background: #1a1f38;
    color: var(--fg);
    border: 1px solid #4a5470;
    border-radius: 10px;
    padding: 6px 10px;
    font: inherit;
    min-height: 32px;
  }

  .popover select:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .filters-popover {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    margin-top: 12px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .filters-popover-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
  }

  .filters-heading {
    font-weight: 700;
  }

  .saved-sets-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .saved-sets-select {
    flex: 1 1 220px;
    min-width: 200px;
  }

  .saved-status {
    font-size: 12px;
    color: var(--fg-dim);
  }

  .quick-filters-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .quick-filters-title {
    font-weight: 700;
  }

  .facet-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .facet-column {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .facet-column-title {
    font-weight: 700;
    margin-bottom: 2px;
  }

  .facet-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 40vh;
    overflow: auto;
  }

  .facet-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .facet-empty {
    color: var(--fg-dim);
    font-size: 12px;
  }

  .weight-section {
    grid-column: 1 / -1;
    margin-top: 12px;
  }

  .filters-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .weight-chip-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .weight-chip {
    border: 1px solid #3e4564;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 6px 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: var(--fg);
    font-weight: 600;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  }

  .weight-chip__icon {
    width: 18px;
    height: 18px;
    filter: drop-shadow(0 0 6px currentColor);
    color: currentColor;
  }

  .weight-chip[aria-pressed='true'] {
    background: rgba(255, 255, 255, 0.08);
    border-color: currentColor;
  }

  .weight-chip[aria-pressed='false'] {
    opacity: 0.45;
  }

  .weight-chip--1 {
    color: var(--weight-1);
  }

  .weight-chip--2 {
    color: var(--weight-2);
  }

  .weight-chip--3 {
    color: var(--weight-3);
  }

  .weight-chip--4 {
    color: var(--weight-4);
  }

  .weight-chip--5 {
    color: var(--weight-5);
  }
</style>
