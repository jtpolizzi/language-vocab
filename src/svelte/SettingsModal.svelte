<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    State,
    resetPersistentState,
    setFilters,
    setOrder,
    setSort,
    type ColumnsState
  } from '../../assets/state.ts';

  type ColumnKey = keyof ColumnsState;
  const columnKeys: ColumnKey[] = ['star', 'weight', 'word', 'definition', 'pos', 'cefr', 'tags'];

  export let onClose: () => void = () => {};

  let columns: ColumnsState = { ...State.columns };
  let showTranslation = !!State.ui.showTranslation;
  let showDebugPanel = !!State.ui.debugPanel;

  function toggleColumn(key: ColumnKey, checked: boolean) {
    columns = { ...columns, [key]: checked };
    State.set('columns', columns);
  }

  function toggleTranslation(value: boolean) {
    showTranslation = value;
    State.set('ui', { ...State.ui, showTranslation: value });
  }

  function toggleDebug(value: boolean) {
    showDebugPanel = value;
    State.set('ui', { ...State.ui, debugPanel: value });
  }

  function resetFiltersAndOrder() {
    setFilters({ starred: false, weight: [1, 2, 3, 4, 5], search: '', pos: [], cefr: [], tags: [] });
    setOrder([]);
    setSort({ key: 'word', dir: 'asc' });
  }

  function clearAllData() {
    const confirmed = window.confirm('This will remove all saved filters, stars, weights, and preferences on this device. Continue?');
    if (!confirmed) return;
    resetPersistentState();
    window.alert('All saved data cleared. Reload your words to start fresh.');
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  function close() {
    onClose?.();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKey, true);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKey, true);
  });
</script>

<div class="modal-overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-label="Settings">
    <h2>Settings</h2>

    <section>
      <h3>Columns (Word List)</h3>
      <div class="columns-grid">
        {#each columnKeys as key}
          <label>
            <input
              type="checkbox"
              checked={!!columns[key]}
              on:change={(event) => toggleColumn(key, (event.currentTarget as HTMLInputElement).checked)}
            />
            <span>{key[0]?.toUpperCase()}{key.slice(1)}</span>
          </label>
        {/each}
      </div>
    </section>

    <section>
      <h3>Flashcards</h3>
      <label>
        <input
          type="checkbox"
          checked={showTranslation}
          on:change={(event) => toggleTranslation((event.currentTarget as HTMLInputElement).checked)}
        />
        <span>Show translation by default</span>
      </label>
      <label>
        <input
          type="checkbox"
          checked={showDebugPanel}
          on:change={(event) => toggleDebug((event.currentTarget as HTMLInputElement).checked)}
        />
        <span>Show debug panel</span>
      </label>
    </section>

    <section>
      <div class="reset-actions">
        <button type="button" class="chip" on:click={resetFiltersAndOrder}>Reset filters &amp; order</button>
        <button type="button" class="chip chip--danger" on:click={clearAllData}>Clear all saved data</button>
      </div>
    </section>

    <div class="modal-footer">
      <button type="button" class="chip" on:click={close}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: min(720px, 96vw);
    background: #151a31;
    color: var(--fg);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }

  h2 {
    margin: 0 0 12px 0;
  }

  section {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 16px;
  }

  .columns-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .reset-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.07);
    color: var(--fg);
    cursor: pointer;
  }

  .chip--danger {
    background: #6b192c;
    border-color: #ff4d7d;
    color: #fff;
  }
</style>
