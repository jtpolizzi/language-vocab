<script lang="ts">
  import { Prog, type ColumnsState } from '../state';
  import { wordListStore, wordListActions } from '../state/stores';
  import WeightSparkControl from './ui/WeightSparkControl.svelte';
  import { tick, onMount } from 'svelte';
  import { type WeightValue, WEIGHT_DESCRIPTIONS } from '../constants/weights.ts';

  const wordState = wordListStore;

  type ColumnKey = keyof ColumnsState;
  interface ColumnConfig {
    key: ColumnKey;
    label: string;
    icon?: boolean;
  }

  type SelectionSource = 'pointer' | 'keyboard' | 'programmatic';
  let lastSelectionSource: SelectionSource = 'programmatic';

  const columns: ColumnConfig[] = [
    { key: 'star', label: '★' },
    { key: 'weight', label: '', icon: true },
    { key: 'word', label: 'Word' },
    { key: 'definition', label: 'Definition' },
    { key: 'pos', label: 'POS' },
    { key: 'cefr', label: 'CEFR' },
    { key: 'tags', label: 'Tags' }
  ];

  function tagsList(tags?: string) {
    if (!tags) return '';
    return tags
      .split(/[|,;]+|\s+/g)
      .map((t) => t.trim())
      .filter(Boolean)
      .join(', ');
  }

  const WEIGHT_COLORS: Record<WeightValue, string> = {
    1: 'var(--weight-1)',
    2: 'var(--weight-2)',
    3: 'var(--weight-3)',
    4: 'var(--weight-4)',
    5: 'var(--weight-5)'
  };


const LONG_PRESS_DELAY = 350;
  const LONG_PRESS_TOLERANCE = 12;
  let longPressTimer: number | null = null;
  let longPressInfo: null | { pointerId: number | null; startX: number; startY: number; wordId: string } = null;

  function handleHeaderClick(column: ColumnKey) {
    const prev = $wordState.sort;
    const nextDir = prev.key === column && prev.dir === 'asc' ? 'desc' : 'asc';
    wordListActions.clearOrder();
    wordListActions.setSort({ key: column, dir: nextDir });
  }

  function syncSelection(wordId: string, source: SelectionSource = 'programmatic') {
    lastSelectionSource = source;
    if (!$wordState.selectionEnabled) return;
    wordListActions.setCurrentWordId(wordId);
  }

  function toggleSelectionMode(wordId: string) {
    if (!$wordState.selectionEnabled) {
      lastSelectionSource = 'pointer';
      wordListActions.setRowSelectionMode(true);
      wordListActions.setCurrentWordId(wordId);
      return;
    }
    if ($wordState.currentWordId === wordId) {
      wordListActions.setRowSelectionMode(false);
      wordListActions.setCurrentWordId('');
      return;
    }
    lastSelectionSource = 'pointer';
    wordListActions.setCurrentWordId(wordId);
  }

  function beginLongPress(event: PointerEvent, wordId: string) {
    if (event.button !== 0) return;
    lastSelectionSource = 'pointer';
    cancelLongPress(event);
    longPressTimer = window.setTimeout(() => {
      longPressTimer = null;
      toggleSelectionMode(wordId);
    }, LONG_PRESS_DELAY);
    longPressInfo = {
      pointerId: event.pointerId ?? null,
      startX: event.clientX,
      startY: event.clientY,
      wordId
    };
  }

  function cancelLongPress(event?: PointerEvent) {
    if (longPressTimer != null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (event && longPressInfo?.pointerId != null && event.pointerId != null && longPressInfo.pointerId !== event.pointerId) {
      return;
    }
    longPressInfo = null;
  }

  function trackLongPressMove(event: PointerEvent) {
    if (!longPressInfo) return;
    if (longPressInfo.pointerId != null && event.pointerId != null && longPressInfo.pointerId !== event.pointerId) return;
    const dx = Math.abs(event.clientX - longPressInfo.startX);
    const dy = Math.abs(event.clientY - longPressInfo.startY);
    if (dx > LONG_PRESS_TOLERANCE || dy > LONG_PRESS_TOLERANCE) {
      cancelLongPress(event);
    }
  }

  function handleRowKeydown(event: KeyboardEvent, wordId: string, termKey: string) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const row = event.currentTarget as HTMLTableRowElement | null;
      const next = event.key === 'ArrowDown' ? row?.nextElementSibling : row?.previousElementSibling;
      if (next instanceof HTMLTableRowElement) {
        next.focus();
        syncSelection(next.dataset.wordId || '', 'keyboard');
        next.scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      if (!termKey) return;
      Prog.setStar(termKey, !Prog.star(termKey));
      syncSelection(wordId, 'keyboard');
      return;
    }
    if (/^[1-5]$/.test(event.key)) {
      event.preventDefault();
      Prog.setWeight(termKey, Number(event.key));
      syncSelection(wordId, 'keyboard');
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      syncSelection(wordId, 'keyboard');
    }
  }

  function toggleStar(termKey: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    Prog.setStar(termKey, !Prog.star(termKey));
  }

  function clampWeight(value: number): WeightValue {
    const clamped = Math.min(5, Math.max(1, Math.round(value)));
    return clamped as WeightValue;
  }

  function changeWeight(termKey: string, delta: number) {
    const current = Prog.weight(termKey);
    const next = clampWeight(current + delta);
    if (next === current) return;
    Prog.setWeight(termKey, next);
  }

  let lastVisibleId = '';
  let lastKnownRows: string[] = [];

  function escapeSelectorValue(value: string) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/"/g, '\\"');
  }

  async function scrollRowIntoView(wordId: string) {
    if (!wordId) return;
    await tick();
    const selector = `.wordlist-view tbody tr[data-word-id="${escapeSelectorValue(wordId)}"]`;
    const row = document.querySelector<HTMLTableRowElement>(selector);
    if (row) {
      const isPointer = lastSelectionSource === 'pointer';
      const behavior: ScrollBehavior = isPointer ? 'auto' : 'smooth';
      const block: ScrollLogicalPosition = isPointer ? 'nearest' : 'center';
      row.scrollIntoView({ block, behavior });
    }
  }

  onMount(() => {
    lastSelectionSource = 'programmatic';
  });

  $: lastKnownRows = $wordState.rows.map((row) => row.id);

  $: if ($wordState.selectionEnabled) {
    const id = $wordState.currentWordId;
    if (id && !lastKnownRows.includes(id)) {
      wordListActions.setRowSelectionMode(false);
      wordListActions.setCurrentWordId('');
      lastVisibleId = '';
    } else if (id && id !== lastVisibleId) {
      lastVisibleId = id;
      scrollRowIntoView(id);
    }
  } else {
    lastVisibleId = '';
  }
</script>

<section class="wordlist-view wordlist-view--svelte">
  <div class="wordlist-scroll">
    <table>
      <thead>
        <tr>
          {#each columns as column (column.key)}
            <th
              data-key={column.key}
              class:hide={!$wordState.columns[column.key]}
              class:sorted={$wordState.sort.key === column.key}
              class:asc={$wordState.sort.key === column.key && $wordState.sort.dir === 'asc'}
              class:desc={$wordState.sort.key === column.key && $wordState.sort.dir === 'desc'}
              tabindex="0"
              aria-sort={$wordState.sort.key === column.key
                ? $wordState.sort.dir === 'asc' ? 'ascending' : 'descending'
                : 'none'}
              on:click={() => handleHeaderClick(column.key)}
              on:keydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleHeaderClick(column.key);
                }
              }}
            >
              <span>
                {#if column.icon}
                  <svg class="weight-header-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M9 4.5c.335 0 .629.222.721.544l.813 2.846c.356 1.246 1.33 2.219 2.576 2.575l2.846.814c.322.092.544.386.544.721s-.222.629-.544.721l-2.846.813c-1.246.356-2.22 1.33-2.576 2.576l-.813 2.846c-.092.322-.386.544-.721.544s-.629-.222-.721-.544l-.813-2.846c-.356-1.246-1.33-2.22-2.576-2.576l-2.846-.813C2.222 12.629 2 12.335 2 12s.222-.629.544-.721l2.846-.814c1.246-.356 2.22-1.33 2.576-2.575l.813-2.846C8.371 4.722 8.665 4.5 9 4.5Zm9-3c.344 0 .644.234.728.568l.259 1.035c.235.94.97 1.675 1.91 1.91l1.035.259c.334.083.568.383.568.728s-.234.644-.568.727l-1.035.259c-.94.235-1.675.97-1.91 1.91l-.259 1.035A.75.75 0 0 1 18 10.5a.75.75 0 0 1-.728-.568l-.259-1.035c-.235-.94-.97-1.675-1.91-1.91l-1.035-.259A.75.75 0 0 1 13.5 6c0-.345.234-.645.568-.728l1.035-.259c.94-.235 1.675-.97 1.91-1.91l.259-1.035A.75.75 0 0 1 18 1.5Zm-1.5 13.5c.323 0 .61.206.712.513l.394 1.183c.149.448.501.8.949.949l1.183.394c.306.102.512.389.512.712s-.206.61-.512.712l-1.183.394a1.5 1.5 0 0 0-.949.949l-.394 1.183a.75.75 0 0 1-1.424 0l-.394-1.183a1.5 1.5 0 0 0-.949-.949l-1.183-.394A.75.75 0 0 1 12.75 18c0-.323.206-.61.512-.712l1.183-.394a1.5 1.5 0 0 0 .949-.949l.394-1.183a.75.75 0 0 1 .712-.513Z"
                      fill="currentColor"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    />
                  </svg>
                {/if}
                {column.label}
              </span>
              <span class="sort-arrow" aria-hidden="true">
                {#if $wordState.sort.key === column.key}
                  {$wordState.sort.dir === 'asc' ? '▲' : '▼'}
                {/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#if !$wordState.rows.length}
          <tr>
            <td colspan={columns.length} class="empty">
              <p>No words match the current filters.</p>
            </td>
          </tr>
        {:else}
          {#each $wordState.rows as row (row.id)}
            {@const weightValue = clampWeight(Prog.weight(row.termKey))}
            <tr
              tabindex="0"
              data-word-id={row.id}
              data-term-key={row.termKey}
              class:is-current={$wordState.selectionEnabled && $wordState.currentWordId === row.id}
              on:click={() => syncSelection(row.id, 'pointer')}
              on:keydown={(event) => handleRowKeydown(event, row.id, row.termKey)}
              on:pointerdown={(event) => beginLongPress(event, row.id)}
              on:pointerup={cancelLongPress}
              on:pointerleave={cancelLongPress}
              on:pointercancel={cancelLongPress}
              on:pointermove={trackLongPressMove}
            >
              <td class:hide={!$wordState.columns.star}>
                <button
                  class="iconbtn"
                  aria-pressed={Prog.star(row.termKey)}
                  on:click={(event) => toggleStar(row.termKey, event)}
                  on:pointerdown={(event) => event.stopPropagation()}
                >
                  {Prog.star(row.termKey) ? '★' : '☆'}
                </button>
              </td>
              <td class:hide={!$wordState.columns.weight}>
                <WeightSparkControl
                  compact
                  value={weightValue}
                  color={WEIGHT_COLORS[weightValue]}
                  title={WEIGHT_DESCRIPTIONS[weightValue]}
                  on:change={(event) => changeWeight(row.termKey, event.detail.delta)}
                />
              </td>
              <td class:hide={!$wordState.columns.word}>{row.word}</td>
              <td class:hide={!$wordState.columns.definition}>{row.definition}</td>
              <td class:hide={!$wordState.columns.pos}>{row.pos}</td>
              <td class:hide={!$wordState.columns.cefr}>{row.cefr}</td>
              <td class:hide={!$wordState.columns.tags}>{tagsList(row.tags)}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</section>

<style>
  .wordlist-view,
  .wordlist-view--svelte {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 0;
  }

  .wordlist-view--svelte {
    padding: 0;
  }

  .wordlist-scroll {
    flex: 1;
    overflow: auto;
    padding: 6px 0 24px;
    scroll-padding-top: 0;
  }

  .wordlist-view--svelte table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 6px;
    position: relative;
    z-index: 1;
  }

  .wordlist-view--svelte thead th {
    font-weight: 700;
    color: var(--fg-dim);
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
    white-space: nowrap;
    text-align: center;
  }

  .wordlist-view--svelte thead th .sort-arrow {
    display: inline-block;
    margin-left: 6px;
    font-size: 12px;
    opacity: 0.95;
    vertical-align: middle;
  }

  .wordlist-view--svelte thead th.sorted {
    color: var(--fg);
  }

  .wordlist-view--svelte thead th[data-key='cefr'] {
    min-width: 84px;
  }

  .wordlist-view--svelte thead th[data-key='pos'] {
    min-width: 72px;
  }

  .wordlist-view--svelte thead th[data-key='tags'] {
    min-width: 120px;
  }

  .wordlist-view--svelte .wordlist-scroll thead {
    position: sticky;
    top: calc(var(--app-header-height, 0px) + var(--topbar-height, 0px));
    z-index: 6;
    background: #121631;
    box-shadow: 0 1px 0 0 var(--line) inset;
  }

  .wordlist-view--svelte tbody td {
    background: #1b2137;
    padding: 10px;
    border-top: 1px solid #2a345a;
    border-bottom: 1px solid #2a345a;
  }

  .wordlist-view--svelte tbody tr {
    cursor: pointer;
  }

  .wordlist-view--svelte tbody tr td:first-child {
    border-left: 1px solid #2a345a;
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
  }

  .wordlist-view--svelte tbody tr td:last-child {
    border-right: 1px solid #2a345a;
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .wordlist-view--svelte tbody tr:focus-visible td {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .wordlist-view--svelte tbody tr.is-current td {
    background: #252d4b;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px rgba(138, 164, 255, 0.35);
  }

  .wordlist-view--svelte .iconbtn {
    padding: 4px 8px;
    line-height: 1;
  }

  .wordlist-view--svelte td.empty {
    text-align: center;
    padding: 48px 0;
    color: var(--fg-muted);
  }

  .wordlist-view--svelte .weight-header-icon {
    width: 18px;
    height: 18px;
    color: var(--weight-3);
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.35));
  }

  .wordlist-view--svelte .hide {
    display: none;
  }

  :global(body.wordlist-lock) {
    overflow: hidden;
    height: 100vh;
  }
</style>
