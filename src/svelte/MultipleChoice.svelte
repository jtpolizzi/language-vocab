<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { LS, type VocabEntry } from '../state';
  import { filteredWordsStore } from '../state/stores';
  import ChipButton from './ui/ChipButton.svelte';

  const PREF_KEY = 'v24:choicePrefs';
  const DEFAULT_PREFS = { size: 10, direction: 'word-definition', answers: 4 } as const;
  const MIN_SET = 4;
  const MAX_SET = 15;
  const MIN_PLAYABLE = 2;
  const MIN_ANSWERS = 2;
  const MAX_ANSWERS = 6;
  const CORRECT_ADVANCE_DELAY = 1000;

  type DirectionKey = 'word-definition' | 'definition-word' | 'random';
  type PromptField = 'word' | 'definition';

  interface ChoicePrefs {
    size: number;
    direction: DirectionKey;
    answers: number;
  }

  interface AnswerOption {
    id: string;
    text: string;
    isCorrect: boolean;
  }

  interface ChoiceQuestion {
    word: VocabEntry;
    promptField: PromptField;
    answerField: PromptField;
    prompt: string;
    answers: AnswerOption[];
    correctId: string;
    mode: DirectionKey;
  }

  const filteredWords = filteredWordsStore;

let prefs = loadPrefs();
let sizeSelectValue = prefs.size;
let directionValue: DirectionKey = prefs.direction;
let answersSelectValue = prefs.answers;

let available: VocabEntry[] = [];
let availableKey = '';
let initialized = false;
  let roundWords: VocabEntry[] = [];
  let questionIndex = 0;
  let currentQuestion: ChoiceQuestion | null = null;
  let awaitingContinue = false;
  let questionLocked = false;
  let feedbackText = '';
  let showContinue = false;
  let continueDisabled = true;
  let continueLabel = 'Continue';
  let statusText = 'Loading...';
  let sizeHint = '';
  let playAgainDisabled = true;
  let progressLabel = '';
  let progressPercent = 0;
  let promptVisible = true;
  let answerStates = new Map<string, 'correct' | 'wrong'>();
  let timers = new Set<number>();
  let windowKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  let showOptions = false;
  let optionsAnchor: HTMLDivElement | null = null;

  $: {
    const words = $filteredWords?.words || [];
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
    updateStatusText();
    if (!initialized) {
      initialized = true;
      startRound();
    }
  }

  $: sizeSelectValue = prefs.size;
  $: directionValue = prefs.direction;
  $: answersSelectValue = prefs.answers;

  onMount(() => {
    const handler = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener('keydown', handler);
    windowKeyHandler = handler;
    return () => {
      window.removeEventListener('keydown', handler);
    };
  });

  onDestroy(() => {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    if (windowKeyHandler) {
      window.removeEventListener('keydown', windowKeyHandler);
      windowKeyHandler = null;
    }
  });

  function loadPrefs(): ChoicePrefs {
    const stored = LS.get<Partial<ChoicePrefs>>(PREF_KEY, {});
    const direction = normalizeDirection(stored?.direction);
    return {
      size: clampSize(stored?.size ?? DEFAULT_PREFS.size),
      direction,
      answers: clampAnswers(stored?.answers ?? DEFAULT_PREFS.answers)
    };
  }

  function savePrefs(next: ChoicePrefs) {
    LS.set(PREF_KEY, next);
  }

  function normalizeDirection(value: unknown): DirectionKey {
    if (value === 'es-en') return 'word-definition';
    if (value === 'en-es') return 'definition-word';
    if (value === 'word-definition' || value === 'definition-word' || value === 'random') {
      return value;
    }
    return DEFAULT_PREFS.direction;
  }

  function clampSize(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.size;
    return Math.max(MIN_SET, Math.min(MAX_SET, Math.round(num)));
  }

  function clampAnswers(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.answers;
    return Math.max(MIN_ANSWERS, Math.min(MAX_ANSWERS, Math.round(num)));
  }

  function shuffle<T>(list: T[]): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function computeAvailable(words: VocabEntry[]): VocabEntry[] {
    return words.filter((w) => (w.word || '').trim() && (w.definition || '').trim());
  }

  function handleAvailableChange(prevCount: number) {
    const couldPlayBefore = prevCount >= MIN_PLAYABLE;
    const canPlayNow = available.length >= MIN_PLAYABLE;
    if (!canPlayNow) {
      roundWords = [];
      currentQuestion = null;
      questionIndex = 0;
      showUnavailableState();
      return;
    }
    if (!couldPlayBefore && canPlayNow && roundWords.length === 0) {
      startRound();
      return;
    }
    updateStatusText();
  }

  function resetTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function startRound() {
    resetTimers();
    awaitingContinue = false;
    questionLocked = false;
    feedbackText = '';
    showContinue = false;
    continueDisabled = true;
    answerStates = new Map();

    if (available.length < MIN_PLAYABLE) {
      showUnavailableState();
      return;
    }

    const desired = clampSize(prefs.size);
    const usable = Math.min(desired, available.length);
    roundWords = shuffle([...available]).slice(0, usable);
    questionIndex = 0;
    nextQuestion();
    updateStatusText();
  }

  function showUnavailableState() {
    progressLabel = 'Not enough words';
    progressPercent = 0;
    promptVisible = false;
    currentQuestion = null;
    questionIndex = 0;
    roundWords = [];
    feedbackText = '';
    showContinue = false;
    continueDisabled = true;
  }

  function nextQuestion() {
    resetTimers();
    awaitingContinue = false;
    questionLocked = false;
    feedbackText = '';
    showContinue = false;
    continueDisabled = true;
    answerStates = new Map();
    promptVisible = true;

    if (!roundWords.length) {
      showUnavailableState();
      return;
    }

    if (questionIndex >= roundWords.length) {
      renderRoundComplete();
      return;
    }

    const word = roundWords[questionIndex];
    const question = buildQuestion(word);
    if (!question) {
      questionIndex++;
      nextQuestion();
      return;
    }
    currentQuestion = question;
    renderQuestion();
  }

  function buildQuestion(word: VocabEntry): ChoiceQuestion | null {
    const mode: DirectionKey =
      prefs.direction === 'random'
        ? Math.random() < 0.5
          ? 'word-definition'
          : 'definition-word'
        : prefs.direction;
    const promptField: PromptField = mode === 'word-definition' ? 'word' : 'definition';
    const answerField: PromptField = promptField === 'word' ? 'definition' : 'word';

    const prompt = (word[promptField] || '').trim();
    const correctText = (word[answerField] || '').trim();
    if (!prompt || !correctText) return null;

    const candidatePool = roundWords
      .filter((entry) => entry.id !== word.id)
      .filter((entry) => (entry[answerField] || '').trim());

    const maxAnswers = Math.max(
      MIN_ANSWERS,
      Math.min(prefs.answers, candidatePool.length + 1, MAX_ANSWERS)
    );

    const answers: AnswerOption[] = [
      { id: word.id, text: correctText, isCorrect: true }
    ];
    const usedTexts = new Set([correctText.toLowerCase()]);

    shuffle(candidatePool).some((candidate) => {
      if (answers.length >= maxAnswers) return true;
      const text = (candidate[answerField] || '').trim();
      if (!text || usedTexts.has(text.toLowerCase())) return false;
      answers.push({ id: candidate.id, text, isCorrect: false });
      usedTexts.add(text.toLowerCase());
      return false;
    });

    if (answers.length < MIN_ANSWERS) return null;

    return {
      word,
      promptField,
      answerField,
      prompt,
      answers: shuffle(answers),
      correctId: word.id,
      mode
    };
  }

  function renderQuestion() {
    if (!currentQuestion) return;
    const total = roundWords.length || 1;
    progressLabel = `Question ${Math.min(questionIndex + 1, total)} / ${total}`;
    progressPercent = Math.floor((questionIndex / total) * 100);
  }

  function renderRoundComplete() {
    currentQuestion = null;
    progressLabel = `Complete • ${roundWords.length} / ${roundWords.length}`;
    progressPercent = 100;
    feedbackText = '';
    promptVisible = false;
    showContinue = false;
    continueDisabled = true;
  }

  function selectAnswer(answerId: string) {
    if (!currentQuestion || awaitingContinue || questionLocked) return;
    questionLocked = true;
    const isCorrect = answerId === currentQuestion.correctId;
    highlightAnswers(answerId, currentQuestion.correctId);

    if (isCorrect) {
      feedbackText = 'Correct!';
      const timer = window.setTimeout(() => {
        questionIndex++;
        nextQuestion();
        timers.delete(timer);
      }, CORRECT_ADVANCE_DELAY);
      timers.add(timer);
    } else {
      feedbackText = 'Not quite, review the correct answer.';
      awaitingContinue = true;
      showContinue = true;
      continueDisabled = false;
      continueLabel = questionIndex + 1 >= roundWords.length ? 'Finish' : 'Continue';
    }
  }

  function highlightAnswers(selectedId: string, correctId: string) {
    const next = new Map<string, 'correct' | 'wrong'>(answerStates);
    next.set(correctId, 'correct');
    if (selectedId !== correctId) {
      next.set(selectedId, 'wrong');
    }
    answerStates = next;
  }

  function advanceQuestion() {
    if (!awaitingContinue) return;
    awaitingContinue = false;
    showContinue = false;
    continueDisabled = true;
    questionIndex++;
    nextQuestion();
  }

  function handleKey(event: KeyboardEvent) {
    if (currentQuestion && !awaitingContinue) {
      if (/^[1-6]$/.test(event.key)) {
        const idx = Number(event.key);
        const answer = currentQuestion.answers[idx - 1];
        if (answer) {
          selectAnswer(answer.id);
          return;
        }
      }
    }
    if (awaitingContinue && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      advanceQuestion();
    }
  }

  function updateStatusText() {
    if (available.length < MIN_PLAYABLE) {
      statusText = 'Need at least two filtered words.';
      playAgainDisabled = true;
      return;
    }
    const usable = Math.min(prefs.size, available.length);
    statusText = `${usable} question${usable === 1 ? '' : 's'} • Using ${available.length} filtered words`;
    playAgainDisabled = false;
  }

  function updateAvailabilityHint() {
    if (available.length < MIN_PLAYABLE) {
      sizeHint = 'Need at least two filtered words.';
      playAgainDisabled = true;
      return;
    }
    const usable = Math.min(prefs.size, available.length);
    sizeHint = usable < prefs.size ? `Only ${available.length} available; using ${usable}.` : '';
  }

  function handleOptionsToggle(event: MouseEvent) {
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

  function commitSize(value: number | string) {
    prefs = { ...prefs, size: clampSize(value) };
    savePrefs(prefs);
    updateAvailabilityHint();
    updateStatusText();
  }

  function commitDirection(value: DirectionKey) {
    prefs = { ...prefs, direction: value };
    savePrefs(prefs);
  }

  function commitAnswers(value: number | string) {
    prefs = { ...prefs, answers: clampAnswers(value) };
    savePrefs(prefs);
  }
</script>

<section class="choice-wrap">
  <div class="choice-toolbar panel choice-toolbar--lean">
    <div class="choice-toolbar-item choice-status">
      <span class="choice-status-text">{statusText}</span>
    </div>
    <div class="choice-toolbar-actions">
      <ChipButton
        class="choice-play-again"
        data-celebrate={currentQuestion === null && roundWords.length > 0 ? 'true' : null}
        on:click={startRound}
        disabled={playAgainDisabled}
      >
        Play Again
      </ChipButton>
      <div class="options-anchor" bind:this={optionsAnchor}>
        <ChipButton
          class="choice-options-btn"
          icon
          aria-label="Choice options"
          aria-expanded={showOptions}
          on:click={handleOptionsToggle}
        >
          ⚙︎
        </ChipButton>
        {#if showOptions}
          <div
            class="options-popover"
            role="dialog"
            aria-label="Choice options"
            tabindex="-1"
          >
            <div class="options-popover-title">Choice options</div>
            <div class="options-row">
              <span>Set size</span>
              <div class="options-value">
                <select
                  class="choice-select"
                  bind:value={sizeSelectValue}
                  on:change={() => commitSize(sizeSelectValue)}
                >
                  {#each Array.from({ length: MAX_SET - MIN_SET + 1 }, (_, idx) => idx + MIN_SET) as sizeOption}
                    <option value={sizeOption}>{sizeOption}</option>
                  {/each}
                </select>
                <span class="choice-size-suffix">words</span>
              </div>
            </div>
            <div class="options-row">
              <span>Direction</span>
              <div class="options-value">
                <select
                  class="choice-select"
                  bind:value={directionValue}
                  on:change={() => commitDirection(directionValue)}
                >
                  <option value="word-definition">Word → Definition</option>
                  <option value="definition-word">Definition → Word</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
            <div class="options-row">
              <span># answers</span>
              <div class="options-value">
                <select
                  class="choice-select"
                  bind:value={answersSelectValue}
                  on:change={() => commitAnswers(answersSelectValue)}
                >
                  {#each Array.from({ length: MAX_ANSWERS - MIN_ANSWERS + 1 }, (_, idx) => idx + MIN_ANSWERS) as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              </div>
            </div>
            {#if sizeHint}
              <div class="choice-hint options-hint">{sizeHint}</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="choice-board panel">
    <div class="choice-progress">
      <span class="choice-progress-label">{progressLabel}</span>
      <div class="choice-progress-bar">
        <div class="choice-progress-fill" style={`width: ${progressPercent}%`}></div>
      </div>
    </div>

    {#if currentQuestion}
      <div class="choice-question">
        <span class="choice-question-lang">
          {currentQuestion.promptField === 'word' ? 'Word' : 'Definition'}
        </span>
        <div class="choice-question-text">{currentQuestion.prompt}</div>
      </div>
      <div class="choice-subtitle" style:visibility={promptVisible ? 'visible' : 'hidden'}>
        Choose the answer
      </div>
      <div class="choice-answers">
        {#each currentQuestion.answers as answer, idx (answer.id)}
          <button
            type="button"
            class="choice-answer"
            class:is-disabled={questionLocked}
            class:is-correct={answerStates.get(answer.id) === 'correct'}
            class:is-wrong={answerStates.get(answer.id) === 'wrong'}
            data-id={answer.id}
            data-index={idx + 1}
            on:click={() => selectAnswer(answer.id)}
          >
            <span class="choice-answer-index">{idx + 1}</span>
            <span class="choice-answer-text">{answer.text || '—'}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="choice-question">
        <div class="choice-question-text">{available.length < MIN_PLAYABLE ? 'Need at least two entries with both word and definition to play.' : 'Nice work! Hit Play Again to load a new set.'}</div>
      </div>
      <div class="choice-answers"></div>
    {/if}

    <div class="choice-feedback">{feedbackText}</div>
    <button
      type="button"
      class="choice-continue"
      hidden={!showContinue}
      disabled={continueDisabled}
      on:click={advanceQuestion}
    >
      {continueLabel}
    </button>
  </div>
</section>

<style>
  .choice-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .choice-board {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .choice-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
  }

  .choice-toolbar-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .choice-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .options-anchor {
    position: relative;
    display: flex;
  }

  .options-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: min(320px, 80vw);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 12px;
    background: #151a31;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    z-index: 40;
  }

  .options-popover-title {
    font-weight: 700;
    margin-bottom: 8px;
  }

  .options-row {
    display: grid;
    grid-template-columns: minmax(120px, auto) minmax(0, 1fr);
    gap: 12px;
    font-size: 13px;
    margin-bottom: 10px;
    align-items: center;
  }

  .options-value {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .options-hint {
    font-size: 12px;
    color: var(--accent);
  }

  .choice-select {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: var(--fg);
    padding: 4px 8px;
    font: inherit;
    min-width: 80px;
  }

  .choice-size-suffix {
    color: var(--fg-dim);
    font-size: 12px;
  }

  .choice-hint {
    margin-top: 4px;
  }

  .choice-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .choice-progress-label {
    font-weight: 600;
    font-size: 14px;
    color: var(--fg-dim);
  }

  .choice-progress-bar {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .choice-progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s ease;
  }

  .choice-question {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .choice-question-lang {
    font-size: 12px;
    text-transform: uppercase;
    color: var(--fg-dim);
    letter-spacing: 0.08em;
  }

  .choice-question-text {
    font-size: 28px;
    font-weight: 600;
    color: var(--fg);
  }

  .choice-subtitle {
    font-size: 14px;
    color: var(--fg-dim);
  }

  .choice-answers {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .choice-answer {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--fg);
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    font-size: 16px;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  }

  .choice-answer:hover:not(.is-disabled) {
    border-color: var(--accent);
    transform: translateX(2px);
  }

  .choice-answer-index {
    font-weight: 700;
    font-size: 14px;
    color: var(--fg-dim);
    width: 28px;
    text-align: center;
  }

  .choice-answer-text {
    flex: 1 1 auto;
  }

  .choice-answer.is-disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .choice-answer.is-correct {
    border-color: var(--weight-4);
    background: rgba(100, 255, 150, 0.1);
  }

  .choice-answer.is-wrong {
    border-color: #ea5f6b;
    background: rgba(234, 95, 107, 0.1);
  }

  .choice-feedback {
    font-size: 16px;
    font-weight: 600;
    min-height: 24px;
  }

  .choice-continue {
    align-self: flex-end;
    min-width: 140px;
    padding: 10px 18px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.05);
    color: var(--fg);
    cursor: pointer;
  }

  .choice-continue:disabled,
  .choice-continue[hidden] {
    opacity: 0.5;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .choice-question-text {
      font-size: 22px;
    }

    .choice-board {
      padding: 16px;
    }
  }
</style>
