<script lang="ts">
  import { onMount } from 'svelte';
  import { flashcardsStore, flashcardsActions } from '../state/stores';
  import { Prog, type VocabEntry } from '../state';
  import WeightSparkControl from './ui/WeightSparkControl.svelte';

  interface PointerGesture {
    id: number;
    x: number;
    y: number;
    t: number;
  }

  type WeightValue = 1 | 2 | 3 | 4 | 5;

  const WEIGHT_COLORS: Record<WeightValue, string> = {
    1: 'var(--weight-1)',
    2: 'var(--weight-2)',
    3: 'var(--weight-3)',
    4: 'var(--weight-4)',
    5: 'var(--weight-5)'
  };

  const WEIGHT_DESCRIPTIONS: Record<WeightValue, string> = {
    1: 'Hide almost completely',
    2: 'Show rarely',
    3: 'Default cadence',
    4: 'Show more often',
    5: 'Show constantly'
  };

  const flashcards = flashcardsStore;
  const { setCurrentWordId } = flashcardsActions;

  let cards: VocabEntry[] = [];
  let showTranslation = false;
  let sharedCurrentId = '';

  let showFront = true;
  let index = 0;
  let pendingWordId: string | null = null;
  let currentWord: VocabEntry | null = null;
  let suppressNextCardClick = false;
  let pointerGesture: PointerGesture | null = null;
  let isSliderDrag = false;
  let sliderValue = '0';
  let sliderMin = '0';
  let sliderMax = '0';
  let sliderDisabled = true;
  let progressLabel = '0 / 0';
  let cardElement: HTMLDivElement | null = null;

  $: cards = $flashcards.cards;
  $: sharedCurrentId = $flashcards.currentWordId || '';
  $: showTranslation = $flashcards.showTranslation;
  $: {
    cards;
    sharedCurrentId;
    updateCurrentWord();
  }

  onMount(() => {
    document.body.classList.add('pad-bottom');
    const handleKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
      if (active && active.closest('.topright')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevCard();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextCard();
      } else if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        flipCard();
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        toggleStarForCurrent();
      } else if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        setWeightForCurrent(Number(event.key) as WeightValue);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('pad-bottom');
    };
  });

  function updateCurrentWord() {
    const previousId = currentWord?.id || '';
    let desiredId = pendingWordId;
    pendingWordId = null;
    if (!desiredId && sharedCurrentId) desiredId = sharedCurrentId;
    if (!desiredId && previousId) desiredId = previousId;
    if (desiredId) {
      const foundIndex = cards.findIndex((word) => word.id === desiredId);
      if (foundIndex !== -1) {
        index = foundIndex;
      }
    }
    if (index >= cards.length) index = Math.max(0, cards.length - 1);
    currentWord = cards[index] ?? null;
    if (!currentWord) {
      if (previousId) setCurrentWordId('');
    } else if (currentWord.id !== previousId) {
      setCurrentWordId(currentWord.id);
    }
    updateProgress();
  }

  function updateProgress() {
    const total = cards.length;
    if (!total) {
      progressLabel = '0 / 0';
      sliderDisabled = true;
      sliderValue = '0';
      sliderMin = '0';
      sliderMax = '0';
      return;
    }
    sliderDisabled = false;
    sliderMin = '1';
    sliderMax = String(total);
    if (!isSliderDrag) {
      sliderValue = String(index + 1);
    }
    progressLabel = `Card ${index + 1} / ${total}`;
  }

  function jumpToIndex(nextIndex: number) {
    if (!cards.length) return;
    const clamped = Math.max(0, Math.min(cards.length - 1, nextIndex));
    index = clamped;
    pendingWordId = cards[clamped]?.id ?? null;
    showFront = true;
    updateCurrentWord();
  }

  function prevCard() {
    if (index > 0) {
      jumpToIndex(index - 1);
    }
  }

  function nextCard() {
    if (index < cards.length - 1) {
      jumpToIndex(index + 1);
    }
  }

  function flipCard() {
    if (!cards.length) return;
    showFront = !showFront;
  }

  function handleTapZone(clientX: number, clientY: number) {
    if (!cardElement || !cards.length) return;
    const rect = cardElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    if (relY >= 0.75) {
      if (relX < 0.5) {
        prevCard();
      } else {
        nextCard();
      }
    } else {
      flipCard();
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if ((event.target as Element | null)?.closest('.topright')) {
      pointerGesture = null;
      return;
    }
    pointerGesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      t: Date.now()
    };
    try {
      cardElement?.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture issues
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerGesture || pointerGesture.id !== event.pointerId) return;
    const dx = event.clientX - pointerGesture.x;
    const dy = event.clientY - pointerGesture.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - pointerGesture.t;
    pointerGesture = null;

    const swipeThreshold = 60;
    if (adx > ady && adx >= swipeThreshold) {
      if (dx > 0) {
        prevCard();
      } else {
        nextCard();
      }
      try {
        cardElement?.releasePointerCapture(event.pointerId);
      } catch {
        // ignore release issues
      }
      return;
    }

    const tapMove = 35;
    const tapTime = 450;
    if (adx <= tapMove && ady <= tapMove && dt <= tapTime) {
      if (!suppressNextCardClick) {
        handleTapZone(event.clientX, event.clientY);
      }
    }
    suppressNextCardClick = false;
    try {
      cardElement?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release issues
    }
  }

  function handlePointerCancel(event: PointerEvent) {
    pointerGesture = null;
    try {
      cardElement?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release issues
    }
  }

  function toggleStarForCurrent() {
    if (!currentWord) return;
    Prog.setStar(currentWord.termKey, !Prog.star(currentWord.termKey));
    updateCurrentWord();
  }

  function setWeightForCurrent(weight: WeightValue) {
    if (!currentWord) return;
    Prog.setWeight(currentWord.termKey, weight);
    updateCurrentWord();
  }

  function clampWeight(value: number): WeightValue {
    const clamped = Math.min(5, Math.max(1, Math.round(value)));
    return clamped as WeightValue;
  }

  function changeWeight(delta: number) {
    if (!currentWord) return;
    const current = clampWeight(Prog.weight(currentWord.termKey));
    const next = clampWeight(current + delta);
    if (next === current) return;
    Prog.setWeight(currentWord.termKey, next);
    updateCurrentWord();
  }

  function handleSliderInput(event: Event) {
    if (sliderDisabled) return;
    const target = event.currentTarget as HTMLInputElement;
    const nextIndex = Number(target.value) - 1;
    if (!Number.isNaN(nextIndex)) {
      jumpToIndex(nextIndex);
    }
  }

  function handleSliderPointerDown() {
    if (sliderDisabled) return;
    isSliderDrag = true;
  }

  function handleSliderPointerUp() {
    isSliderDrag = false;
    updateProgress();
  }

  function handleTopControlPointerDown(event: PointerEvent | MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    suppressNextCardClick = true;
  }

  function fmtTagsComma(tags?: string) {
    if (!tags) return '';
    return String(tags)
      .split(/[|,;]+/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  $: weightValue = clampWeight(currentWord ? Prog.weight(currentWord.termKey) : 3);
  $: starActive = currentWord ? !!Prog.star(currentWord.termKey) : false;
</script>

<section class="flashcards-view">
  <div class="choice-progress flash-progress">
    <span class="choice-progress-label">{progressLabel}</span>
    <input
      class="flash-progress-slider"
      type="range"
      min={sliderMin}
      max={sliderMax}
      bind:value={sliderValue}
      disabled={sliderDisabled}
      aria-label="Card position"
      on:input={handleSliderInput}
      on:pointerdown={handleSliderPointerDown}
      on:pointerup={handleSliderPointerUp}
      on:pointercancel={handleSliderPointerUp}
      on:pointerleave={(event) => {
        if (event.buttons === 0) handleSliderPointerUp();
      }}
    />
  </div>

  <div
    class="card"
    bind:this={cardElement}
    on:pointerdown={handlePointerDown}
    on:pointerup={handlePointerUp}
    on:pointercancel={handlePointerCancel}
  >
    {#if currentWord}
      <div class="topright">
        <button
          class="iconbtn"
          aria-pressed={starActive}
          title="Star"
          style={`font-size:22px; line-height:1; padding:4px 8px; color:${starActive ? 'var(--accent)' : 'var(--fg-dim)'}; border-color:${starActive ? 'var(--accent)' : '#4a5470'};`}
          on:pointerdown={handleTopControlPointerDown}
          on:click={() => {
            toggleStarForCurrent();
          }}
        >
          {starActive ? '★' : '☆'}
        </button>
        <WeightSparkControl
          value={weightValue}
          color={WEIGHT_COLORS[weightValue]}
          title={WEIGHT_DESCRIPTIONS[weightValue]}
          stopPointerEvents={false}
          on:pointerdown={handleTopControlPointerDown}
          on:change={(event) => {
            changeWeight(event.detail.delta);
            if (event.detail.source === 'wheel') {
              suppressNextCardClick = true;
            }
          }}
        />
      </div>

      <div class="card-content">
        {showFront ? currentWord.word : currentWord.definition}
      </div>

      <div class="footmeta">
        <div class="meta-line">
          {[currentWord.pos, currentWord.cefr, fmtTagsComma(currentWord.tags)].filter(Boolean).join(' • ')}
        </div>
        {#if showTranslation}
          <div class="translation">{currentWord.definition}</div>
        {/if}
      </div>
    {:else}
      <div>No cards match your filters.</div>
    {/if}
  </div>

  <div class="bottombar">
    <button
      class="bigbtn"
      type="button"
      on:click={prevCard}
      disabled={index <= 0 || !cards.length}
      title="Previous card"
    >
      ←
    </button>
    <button class="bigbtn" type="button" on:click={flipCard} disabled={!cards.length} title="Flip card">
      Flip
    </button>
    <button
      class="bigbtn"
      type="button"
      on:click={nextCard}
      disabled={index >= cards.length - 1 || !cards.length}
      title="Next card"
    >
      →
    </button>
  </div>
</section>

<style>
  :global(body.pad-bottom) {
    padding-bottom: 72px;
  }

  .card {
    position: relative;
    max-width: 720px;
    width: min(100%, 720px);
    margin: 40px auto;
    background: #1b2137;
    border-radius: 20px;
    padding: 40px 32px;
    min-height: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 44px;
    line-height: 1.2;
    transition: all 0.2s ease-in-out;
    touch-action: pan-y;
    user-select: none;
  }

  .card:hover {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .topright {
    position: absolute;
    right: 20px;
    top: 16px;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .footmeta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 40px;
    text-align: center;
    color: var(--fg-dim);
    font: 500 14px system-ui;
  }

  .meta-line {
    margin-bottom: 6px;
  }

  .translation {
    font-size: 20px;
    opacity: 0.7;
    margin-top: 2px;
  }

  .bottombar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 18, 32, 0.9);
    backdrop-filter: saturate(1.2) blur(8px);
    border-top: 1px solid var(--line);
    padding: 10px;
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    z-index: 999;
  }

  .bigbtn {
    flex: 1 1 110px;
    min-width: 110px;
    max-width: 160px;
    padding: 14px 22px;
    border-radius: 14px;
    border: 1px solid #56608a;
    background: #1f2440;
    color: var(--fg);
    font: 600 17px system-ui;
    cursor: pointer;
  }

  .flash-progress {
    max-width: 520px;
    margin: 0 auto 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .choice-progress-label {
    text-align: center;
    font-size: 14px;
    color: var(--fg-dim);
  }

  .flash-progress-slider {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    border-radius: 999px;
    background: #1c1f30;
    outline: none;
    cursor: pointer;
  }

  .flash-progress-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid #050814;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  }

  .flash-progress-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid #050814;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  }

  .flash-progress-slider:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
