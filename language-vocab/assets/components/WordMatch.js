// assets/components/WordMatch.js
import { applyFilters, LS, State, subscribe } from '../state.js';

const PREF_KEY = 'v24:matchPrefs';
const DEFAULT_PREFS = { size: 10, direction: 'es-en' };
const MIN_SET = 4;
const MAX_SET = 15;
const MIN_PLAYABLE = 2;

const DIRECTIONS = [
  { key: 'es-en', label: 'ES -> EN' },
  { key: 'en-es', label: 'EN -> ES' },
  { key: 'random', label: 'Random' }
];

export function mountWordMatch(container) {
  container.innerHTML = '';

  document.querySelectorAll('.bottombar').forEach((el) => el.remove());
  document.body.classList.remove('pad-bottom');

  const prefs = loadPrefs();
  let available = computeAvailable();
  let lastAvailableCount = available.length;
  let boardColumns = { left: [], right: [] };
  let selection = null;
  let matchedPairs = new Set();
  let clearedCards = new Set();
  let shakingCards = new Set();
  let interactionLocked = false;
  let remainingPairs = 0;

  const wrap = document.createElement('div');
  wrap.className = 'match-wrap';

  const controls = buildControls();

  const statusStrip = document.createElement('div');
  statusStrip.className = 'match-status panel';
  const statusText = document.createElement('span');
  statusText.textContent = 'Loading...';
  statusStrip.appendChild(statusText);

  const board = document.createElement('div');
  board.className = 'match-board panel';

  const leftCol = document.createElement('div');
  const rightCol = document.createElement('div');
  leftCol.className = 'match-column';
  rightCol.className = 'match-column';
  board.append(leftCol, rightCol);

  const emptyState = document.createElement('div');
  emptyState.className = 'match-empty';
  emptyState.textContent = 'Adjust your filters to load words.';
  board.appendChild(emptyState);

  wrap.append(controls.root, statusStrip, board);
  container.appendChild(wrap);

  function loadPrefs() {
    const stored = LS.get(PREF_KEY, {});
    const dir = DIRECTIONS.some((d) => d.key === stored?.direction) ? stored.direction : DEFAULT_PREFS.direction;
    return {
      size: clampSize(stored?.size ?? DEFAULT_PREFS.size),
      direction: dir
    };
  }

  function savePrefs(next) {
    LS.set(PREF_KEY, next);
  }

  function computeAvailable() {
    const filtered = applyFilters(State.words || []);
    return filtered.filter((w) => (w.es || '').trim() && (w.en || '').trim());
  }

  function clampSize(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_PREFS.size;
    return Math.max(MIN_SET, Math.min(MAX_SET, Math.round(num)));
  }

  function buildControls() {
    const root = document.createElement('div');
    root.className = 'match-controls panel';

    const sizeControl = document.createElement('div');
    sizeControl.className = 'match-control';
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Set Size';
    sizeLabel.htmlFor = 'match-size-input';
    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = String(MIN_SET);
    sizeInput.max = String(MAX_SET);
    sizeInput.step = '1';
    sizeInput.id = 'match-size-input';
    sizeInput.value = String(prefs.size);
    const sizeValue = document.createElement('span');
    sizeValue.className = 'match-size-value';
    sizeValue.textContent = `${prefs.size} words`;
    const sizeHint = document.createElement('div');
    sizeHint.className = 'match-hint';

    sizeInput.addEventListener('input', () => {
      prefs.size = clampSize(sizeInput.value);
      sizeValue.textContent = `${prefs.size} words`;
      savePrefs({ ...prefs });
      updateAvailabilityHint();
    });

    sizeControl.append(sizeLabel, sizeInput, sizeValue, sizeHint);

    const directionControl = document.createElement('div');
    directionControl.className = 'match-direction';
    const dirLabel = document.createElement('span');
    dirLabel.textContent = 'Direction';
    const dirButtonsWrap = document.createElement('div');
    dirButtonsWrap.className = 'match-direction-buttons';
    const dirButtons = new Map();

    DIRECTIONS.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(prefs.direction === key));
      btn.addEventListener('click', () => {
        prefs.direction = key;
        dirButtons.forEach((node, entryKey) => {
          node.setAttribute('aria-pressed', String(entryKey === key));
        });
        savePrefs({ ...prefs });
      });
      dirButtons.set(key, btn);
      dirButtonsWrap.appendChild(btn);
    });
    directionControl.append(dirLabel, dirButtonsWrap);

    const infoControl = document.createElement('div');
    infoControl.className = 'match-info';
    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'chip chip--icon';
    infoButton.innerHTML = '<span>?</span>';
    infoButton.title = 'How to play';
    const infoPanel = document.createElement('div');
    infoPanel.className = 'match-info-panel';
    infoPanel.innerHTML = `
      <p>Tap any card, then tap its translation in the opposite column. Correct pairs flash and fade; mismatches shake.</p>
      <p>Use Play Again after adjusting the controls. Your latest size and direction are saved for next time.</p>
    `;
    infoPanel.hidden = true;
    infoButton.addEventListener('click', () => {
      infoPanel.hidden = !infoPanel.hidden;
    });
    infoControl.append(infoButton, infoPanel);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.type = 'button';
    playAgainBtn.className = 'chip match-play-again';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.addEventListener('click', () => startRound());

    root.append(sizeControl, directionControl, infoControl, playAgainBtn);

    function updateAvailabilityHint() {
      const desired = prefs.size;
      const usable = Math.min(desired, available.length);
      if (available.length < MIN_PLAYABLE) {
        sizeHint.textContent = 'Need at least two filtered words to start a round.';
      } else if (usable < desired) {
        sizeHint.textContent = `Only ${available.length} filtered words available; using ${usable}.`;
      } else {
        sizeHint.textContent = '';
      }
      playAgainBtn.disabled = available.length < MIN_PLAYABLE;
    }

    return { root, updateAvailabilityHint };
  }

  function startRound() {
    if (available.length < MIN_PLAYABLE) {
      boardColumns = { left: [], right: [] };
      selection = null;
      matchedPairs = new Set();
      clearedCards = new Set();
      shakingCards = new Set();
      interactionLocked = false;
      remainingPairs = 0;
      renderBoard();
      updateStatus();
      return;
    }

    const desired = clampSize(prefs.size);
    const usable = Math.min(desired, available.length);
    const pool = shuffle([...available]).slice(0, usable);
    const nextColumns = { left: [], right: [] };

    pool.forEach((word) => {
      const placeSpanishLeft =
        prefs.direction === 'es-en' ? true :
        prefs.direction === 'en-es' ? false :
        Math.random() < 0.5;

      if (prefs.direction === 'random') {
        if (placeSpanishLeft) {
          nextColumns.left.push(createCard(word, 'es', 'left'));
          nextColumns.right.push(createCard(word, 'en', 'right'));
        } else {
          nextColumns.left.push(createCard(word, 'en', 'left'));
          nextColumns.right.push(createCard(word, 'es', 'right'));
        }
      } else if (prefs.direction === 'es-en') {
        nextColumns.left.push(createCard(word, 'es', 'left'));
        nextColumns.right.push(createCard(word, 'en', 'right'));
      } else {
        nextColumns.left.push(createCard(word, 'en', 'left'));
        nextColumns.right.push(createCard(word, 'es', 'right'));
      }
    });

    shuffle(nextColumns.left);
    shuffle(nextColumns.right);

    boardColumns = nextColumns;
    remainingPairs = pool.length;
    selection = null;
    matchedPairs = new Set();
    clearedCards = new Set();
    shakingCards = new Set();
    interactionLocked = false;

    renderBoard();
    updateStatus();
  }

  function createCard(word, lang, column) {
    return {
      uid: `${lang}-${word.id}-${column}`,
      pairId: word.id,
      lang,
      text: lang === 'es' ? word.es : word.en,
      column
    };
  }

  function renderBoard() {
    leftCol.innerHTML = '';
    rightCol.innerHTML = '';

    if (!boardColumns.left.length) {
      emptyState.hidden = false;
      emptyState.textContent = available.length < MIN_PLAYABLE
        ? 'Need at least two filtered words. Adjust your filters and try again.'
        : 'Hit Play Again to start a fresh round.';
      return;
    }

    emptyState.hidden = true;

    boardColumns.left.forEach((card) => leftCol.appendChild(buildCard(card)));
    boardColumns.right.forEach((card) => rightCol.appendChild(buildCard(card)));
  }

  function buildCard(card) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'match-card';
    btn.dataset.uid = card.uid;
    btn.dataset.pairId = card.pairId;
    btn.dataset.column = card.column;
    btn.innerHTML = `
      <span class="match-card-text">${card.text}</span>
      <span class="match-card-lang">${card.lang === 'es' ? 'ES' : 'EN'}</span>
    `;
    btn.addEventListener('click', () => handleCardClick(card));
    syncCardState(btn);
    return btn;
  }

  function handleCardClick(card) {
    if (interactionLocked) return;
    if (matchedPairs.has(card.pairId)) return;
    if (clearedCards.has(card.uid)) return;

    if (!selection) {
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      syncAllCardStates();
      return;
    }

    if (selection.uid === card.uid) {
      selection = null;
      syncAllCardStates();
      return;
    }

    if (selection.column === card.column || selection.pairId !== card.pairId) {
      triggerMismatch(card.uid, selection.uid);
      return;
    }

    handleMatch(card.uid, selection.uid, card.pairId);
  }

  function handleMatch(uidA, uidB, pairId) {
    matchedPairs.add(pairId);
    remainingPairs = Math.max(0, remainingPairs - 1);
    const affected = [uidA, uidB];
    selection = null;
    syncAllCardStates();
    setTimeout(() => {
      affected.forEach((uid) => clearedCards.add(uid));
      syncAllCardStates();
    }, 240);
    updateStatus();
  }

  function triggerMismatch(uidA, uidB) {
    interactionLocked = true;
    shakingCards.add(uidA);
    shakingCards.add(uidB);
    syncAllCardStates();
    setTimeout(() => {
      shakingCards.delete(uidA);
      shakingCards.delete(uidB);
      selection = null;
      interactionLocked = false;
      syncAllCardStates();
    }, 500);
  }

  function syncAllCardStates() {
    board.querySelectorAll('.match-card').forEach(syncCardState);
  }

  function syncCardState(node) {
    const uid = node.dataset.uid;
    const pairId = node.dataset.pairId;
    node.classList.toggle('is-selected', selection?.uid === uid);
    node.classList.toggle('is-matched', matchedPairs.has(pairId));
    node.classList.toggle('is-cleared', clearedCards.has(uid));
    node.classList.toggle('is-shaking', shakingCards.has(uid));
  }

  function updateStatus() {
    if (available.length < MIN_PLAYABLE) {
      statusText.textContent = 'Pick at least two filtered words to start a round.';
      return;
    }
    statusText.textContent = `${remainingPairs} pair${remainingPairs === 1 ? '' : 's'} left | Using ${Math.min(prefs.size, available.length)} of ${available.length} filtered words`;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function handleStateChange() {
    const prevCount = lastAvailableCount;
    available = computeAvailable();
    lastAvailableCount = available.length;
    controls.updateAvailabilityHint();

    const couldPlayBefore = prevCount >= MIN_PLAYABLE;
    const canPlayNow = available.length >= MIN_PLAYABLE;
    if (!couldPlayBefore && canPlayNow && !boardColumns.left.length) {
      startRound();
      return;
    }
    updateStatus();
  }

  controls.updateAvailabilityHint();
  startRound();

  const unsubscribe = subscribe(() => handleStateChange());
  return () => unsubscribe();
}
