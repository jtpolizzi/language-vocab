<script lang="ts">
  import { onDestroy } from 'svelte';
  import { LS, type VocabEntry } from '../../assets/state.ts';
  import { wordMatchStore } from './stateBridge';

  const PREF_KEY = 'v24:matchPrefs';
  const DEFAULT_PREFS = { size: 10, direction: 'word-definition', collapseMatches: false } as const;
  const MIN_SET = 4;
  const MAX_SET = 15;
  const MIN_PLAYABLE = 2;
  const MATCH_CLEAR_DELAY = 480;

  const matchSnapshot = wordMatchStore;

  type DirectionKey = 'word-definition' | 'definition-word' | 'random';
  type ColumnSide = 'left' | 'right';
  type CardLang = 'word' | 'definition';

  interface MatchPrefs {
    size: number;
    direction: DirectionKey;
    collapseMatches: boolean;
  }

  interface MatchCard {
    uid: string;
    pairId: string;
    lang: CardLang;
    text: string;
    column: ColumnSide;
  }

  interface MatchColumns {
    left: MatchCard[];
    right: MatchCard[];
  }

  interface SelectedCard {
    uid: string;
    pairId: string;
    column: ColumnSide;
  }

  const DIRECTIONS: Array<{ key: DirectionKey; label: string }> = [
    { key: 'word-definition', label: 'Word → Definition' },
    { key: 'definition-word', label: 'Definition → Word' },
    { key: 'random', label: 'Random' }
  ];

  let prefs = loadPrefs();
  let sizeSelectValue = prefs.size;
  let directionValue: DirectionKey = prefs.direction;
  let collapseValue = prefs.collapseMatches;

  let available: VocabEntry[] = [];
  let availableKey = '';
  let board: MatchColumns = { left: [], right: [] };
  let selection: SelectedCard | null = null;
  let matchedPairs = new Set<string>();
  let clearedCards = new Set<string>();
  let shakingCards = new Set<string>();
  let interactionLocked = false;
  let remainingPairs = 0;
  let quickPlay = false;
  let statusText = 'Loading...';
  let sizeHint = '';
  let playAgainDisabled = true;
  let celebrateWin = false;
  let showOptions = false;
  let emptyMessage = 'Adjust your filters to load words.';

  let optionsAnchor: HTMLDivElement | null = null;

  const timers = new Set<number>();

  $: {
    const words = $matchSnapshot?.words || [];
    const next = computeAvailable(words);
    const nextKey = next.map((w) => w.id).join('|');
    if (nextKey !== availableKey) {
      const prevCount = available.length;
      available = next;
      availableKey = nextKey;
      handleAvailableChange(prevCount);
    } else {
      available = next;
    }
    updateAvailabilityHint();
  }

  function computeAvailable(words: VocabEntry[]): VocabEntry[] {
    return words.filter((w) => (w.word || '').trim() && (w.definition || '').trim());
  }

  function loadPrefs(): MatchPrefs {
    const stored = LS.get<Partial<MatchPrefs>>(PREF_KEY, {});
    const direction = normalizeDirection(stored?.direction);
    return {
      size: clampSize(stored?.size ?? DEFAULT_PREFS.size),
      direction,
      collapseMatches: !!stored?.collapseMatches
    };
  }

  function savePrefs(next: MatchPrefs) {
    LS.set(PREF_KEY, next);
  }

  function normalizeDirection(value: unknown): DirectionKey {
    if (value === 'es-en') return 'word-definition';
    if (value === 'en-es') return 'definition-word';
    const match = DIRECTIONS.find((dir) => dir.key === value);
    return match ? match.key : DEFAULT_PREFS.direction;
  }

  function clampSize(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.size;
    return Math.max(MIN_SET, Math.min(MAX_SET, Math.round(num)));
  }

  function handleAvailableChange(prevCount: number) {
    const couldPlayBefore = prevCount >= MIN_PLAYABLE;
    const canPlayNow = available.length >= MIN_PLAYABLE;
    if (!canPlayNow) {
      board = { left: [], right: [] };
      selection = null;
      matchedPairs = new Set();
      clearedCards = new Set();
      shakingCards = new Set();
      interactionLocked = false;
      remainingPairs = 0;
      emptyMessage = 'Need at least two filtered words. Adjust your filters and try again.';
      updateStatus();
      return;
    }
    if (!couldPlayBefore && canPlayNow && board.left.length === 0) {
      startRound();
      return;
    }
    updateStatus();
  }

  function startRound() {
    if (available.length < MIN_PLAYABLE) {
      board = { left: [], right: [] };
      emptyMessage = 'Need at least two filtered words. Adjust your filters and try again.';
      updateStatus();
      return;
    }
    const desired = clampSize(prefs.size);
    const usable = Math.min(desired, available.length);
    const pool = shuffle([...available]).slice(0, usable);
    const next: MatchColumns = { left: [], right: [] };

    pool.forEach((word) => {
      if (prefs.direction === 'random') {
        if (Math.random() < 0.5) {
          next.left.push(createCard(word, 'word', 'left'));
          next.right.push(createCard(word, 'definition', 'right'));
        } else {
          next.left.push(createCard(word, 'definition', 'left'));
          next.right.push(createCard(word, 'word', 'right'));
        }
      } else if (prefs.direction === 'word-definition') {
        next.left.push(createCard(word, 'word', 'left'));
        next.right.push(createCard(word, 'definition', 'right'));
      } else {
        next.left.push(createCard(word, 'definition', 'left'));
        next.right.push(createCard(word, 'word', 'right'));
      }
    });

    shuffle(next.left);
    shuffle(next.right);

    board = { left: next.left, right: next.right };
    remainingPairs = pool.length;
    selection = null;
    matchedPairs = new Set();
    clearedCards = new Set();
    shakingCards = new Set();
    interactionLocked = false;
    quickPlay = false;
    emptyMessage = 'Tap Play Again to shuffle a new set.';
    updateStatus();
  }

  function createCard(word: VocabEntry, lang: CardLang, column: ColumnSide): MatchCard {
    return {
      uid: `${lang}-${word.id}-${column}`,
      pairId: word.id,
      lang,
      text: (lang === 'word' ? word.word : word.definition) || '',
      column
    };
  }

  function shuffle<T>(list: T[]): T[] {
    for (let i = list.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function handleCardClick(card: MatchCard) {
    if (interactionLocked || matchedPairs.has(card.pairId) || clearedCards.has(card.uid)) return;
    const isLeftColumn = card.column === 'left';
    const isTopLeft = isLeftColumn && isTopLeftCard(card);

    if (!quickPlay && isTopLeft) {
      quickPlay = true;
    }

    if (quickPlay && isLeftColumn && !isTopLeft) {
      quickPlay = false;
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      return;
    }

    if (isTopLeft) {
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      return;
    }

    if (!selection) {
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      return;
    }

    if (selection.uid === card.uid) {
      if (!quickPlay) selection = null;
      return;
    }

    if (selection.column === card.column || selection.pairId !== card.pairId) {
      triggerMismatch(card.uid, selection.uid);
      return;
    }

    handleMatch(card.uid, selection.uid, card.pairId);
  }

  function isTopLeftCard(card: MatchCard) {
    const candidate = board.left.find(
      (c) => !matchedPairs.has(c.pairId) && !clearedCards.has(c.uid)
    );
    return !!candidate && candidate.uid === card.uid;
  }

  function queueAutoSelect() {
    const timer = window.setTimeout(() => {
      autoSelectTopLeft();
      timers.delete(timer);
    }, 0);
    timers.add(timer);
  }

  function autoSelectTopLeft() {
    if (!quickPlay) return;
    const candidate = board.left.find(
      (card) => !matchedPairs.has(card.pairId) && !clearedCards.has(card.uid)
    );
    if (!candidate) {
      quickPlay = false;
      selection = null;
      return;
    }
    selection = { uid: candidate.uid, pairId: candidate.pairId, column: candidate.column };
  }

  function handleMatch(uidA: string, uidB: string, pairId: string) {
    matchedPairs = new Set(matchedPairs).add(pairId);
    remainingPairs = Math.max(0, remainingPairs - 1);
    selection = null;
    const timer = window.setTimeout(() => {
      const nextCleared = new Set(clearedCards);
      nextCleared.add(uidA);
      nextCleared.add(uidB);
      clearedCards = nextCleared;
      timers.delete(timer);
      if (quickPlay) queueAutoSelect();
    }, MATCH_CLEAR_DELAY);
    timers.add(timer);
    updateStatus();
  }

  function triggerMismatch(uidA: string, uidB: string) {
    interactionLocked = true;
    const nextShake = new Set(shakingCards);
    nextShake.add(uidA);
    nextShake.add(uidB);
    shakingCards = nextShake;
    const timer = window.setTimeout(() => {
      const updated = new Set(shakingCards);
      updated.delete(uidA);
      updated.delete(uidB);
      shakingCards = updated;
      selection = null;
      interactionLocked = false;
      timers.delete(timer);
      if (quickPlay) queueAutoSelect();
    }, 500);
    timers.add(timer);
  }

  function updateStatus() {
    if (available.length < MIN_PLAYABLE) {
      statusText = 'Pick at least two filtered words to start a round.';
      celebrateWin = false;
      playAgainDisabled = true;
      return;
    }
    const usable = Math.min(prefs.size, available.length);
    statusText = `${remainingPairs} pair${remainingPairs === 1 ? '' : 's'} left | Using ${usable} of ${available.length}`;
    celebrateWin = remainingPairs === 0 && board.left.length > 0;
    playAgainDisabled = false;
  }

  function updateAvailabilityHint() {
    const desired = prefs.size;
    const usable = Math.min(desired, available.length);
    if (available.length < MIN_PLAYABLE) {
      sizeHint = 'Need at least two filtered words.';
      playAgainDisabled = true;
      return;
    }
    if (usable < desired) {
      sizeHint = `Only ${available.length} available; using ${usable}.`;
    } else {
      sizeHint = '';
    }
  }

  function commitSize(value: number | string) {
    const clamped = clampSize(value);
    prefs = { ...prefs, size: clamped };
    savePrefs(prefs);
    sizeSelectValue = prefs.size;
    updateAvailabilityHint();
  }

  function commitDirection(value: DirectionKey) {
    prefs = { ...prefs, direction: value };
    savePrefs(prefs);
    directionValue = prefs.direction;
  }

  function toggleCollapse(next: boolean) {
    prefs = { ...prefs, collapseMatches: next };
    savePrefs(prefs);
    collapseValue = prefs.collapseMatches;
  }

  function toggleOptions(event: MouseEvent) {
    event.stopPropagation();
    if (showOptions) {
      closeOptions();
    } else {
      openOptions();
    }
  }

  function openOptions() {
    showOptions = true;
    document.addEventListener('click', handleOutside, true);
    window.addEventListener('keydown', handleEscape);
  }

  function closeOptions() {
    showOptions = false;
    document.removeEventListener('click', handleOutside, true);
    window.removeEventListener('keydown', handleEscape);
  }

  function handleOutside(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) return;
    if (optionsAnchor?.contains(target)) return;
    closeOptions();
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeOptions();
    }
  }

  onDestroy(() => {
    closeOptions();
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  });
</script>

<section class="match-wrap">
  <div class="match-toolbar panel match-toolbar--lean">
    <div class="match-toolbar-item match-status-wrap">
      <span class="match-status-text">{statusText}</span>
    </div>
    <div class="match-toolbar-actions">
      <button
        type="button"
        class="chip match-play-again"
        class:is-celebrate={celebrateWin}
        on:click={startRound}
        disabled={playAgainDisabled}
      >
        Play Again
      </button>
      <div class="options-anchor" bind:this={optionsAnchor}>
        <button
          type="button"
          class="chip chip--icon match-options-btn"
          aria-label="Match options"
          aria-expanded={showOptions}
          on:click={toggleOptions}
        >
          ⚙︎
        </button>
        {#if showOptions}
          <div
            class="options-popover"
            role="dialog"
            aria-label="Match options"
            tabindex="-1"
          >
            <div class="options-popover-title">Match options</div>
            <div class="options-row">
              <span>Set size</span>
              <div class="options-value">
                <select
                  class="match-select"
                  bind:value={sizeSelectValue}
                  on:change={() => commitSize(sizeSelectValue)}
                >
                  {#each Array.from({ length: MAX_SET - MIN_SET + 1 }, (_, idx) => idx + MIN_SET) as sizeOption}
                    <option value={sizeOption}>{sizeOption}</option>
                  {/each}
                </select>
                <span class="match-size-suffix">words</span>
              </div>
            </div>
            <div class="options-row">
              <span>Direction</span>
              <div class="options-value">
                <select
                  class="match-select"
                  bind:value={directionValue}
                  on:change={() => commitDirection(directionValue)}
                >
                  {#each DIRECTIONS as dir}
                    <option value={dir.key}>{dir.label}</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="options-row options-row--toggle">
              <span>Collapse matches</span>
              <div class="options-value">
                <input
                  type="checkbox"
                  bind:checked={collapseValue}
                  on:change={() => toggleCollapse(collapseValue)}
                />
              </div>
            </div>
            {#if sizeHint}
              <div class="match-hint options-hint">{sizeHint}</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="match-board panel" class:compact-matches={prefs.collapseMatches}>
    {#if board.left.length === 0}
      <div class="match-empty">{emptyMessage}</div>
    {:else}
      <div class="match-column">
        {#each board.left as card (card.uid)}
          <button
            type="button"
            class="match-card"
            class:is-selected={selection?.uid === card.uid}
            class:is-matched={matchedPairs.has(card.pairId)}
            class:is-cleared={clearedCards.has(card.uid)}
            class:is-shaking={shakingCards.has(card.uid)}
            data-column={card.column}
            data-pair-id={card.pairId}
            on:click={() => handleCardClick(card)}
          >
            <span class="match-card-text">{card.text}</span>
            <span class="match-card-lang">{card.lang === 'word' ? 'WORD' : 'DEF'}</span>
          </button>
        {/each}
      </div>
      <div class="match-column">
        {#each board.right as card (card.uid)}
          <button
            type="button"
            class="match-card"
            class:is-selected={selection?.uid === card.uid}
            class:is-matched={matchedPairs.has(card.pairId)}
            class:is-cleared={clearedCards.has(card.uid)}
            class:is-shaking={shakingCards.has(card.uid)}
            data-column={card.column}
            data-pair-id={card.pairId}
            on:click={() => handleCardClick(card)}
          >
            <span class="match-card-text">{card.text}</span>
            <span class="match-card-lang">{card.lang === 'word' ? 'WORD' : 'DEF'}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>
