// assets/components/WordMatch.js
import { applyFilters, LS, State, subscribe } from '../state.js';

const PREF_KEY = 'v24:matchPrefs';
const DEFAULT_PREFS = { size: 10, direction: 'es-en', collapseMatches: false };
const MIN_SET = 4;
const MAX_SET = 15;
const MIN_PLAYABLE = 2;
const MATCH_CLEAR_DELAY = 480;

const DIRECTIONS = [
  { key: 'es-en', label: 'ES->EN' },
  { key: 'en-es', label: 'EN->ES' },
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
  let quickPlay = false;

  const statusText = document.createElement('span');
  statusText.className = 'match-status-text';
  statusText.textContent = 'Loading...';

  const wrap = document.createElement('div');
  wrap.className = 'match-wrap';

  const controls = buildToolbar();
  wrap.appendChild(controls.root);

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

  wrap.appendChild(board);
  container.appendChild(wrap);

  function loadPrefs() {
    const stored = LS.get(PREF_KEY, {});
    const dir = DIRECTIONS.some((d) => d.key === stored?.direction) ? stored.direction : DEFAULT_PREFS.direction;
    return {
      size: clampSize(stored?.size ?? DEFAULT_PREFS.size),
      direction: dir,
      collapseMatches: !!stored?.collapseMatches
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

  function updateCompactMode() {
    board.classList.toggle('compact-matches', !!prefs.collapseMatches);
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
    if (quickPlay) {
      setTimeout(() => autoSelectTopLeft(), 0);
    }
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
        : 'Tap Play Again to shuffle a new set.';
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

    const isLeftCol = card.column === 'left';
    const isTopLeft = isLeftCol && isTopLeftCard(card);

    if (!quickPlay && isTopLeft) {
      quickPlay = true;
    }

    if (quickPlay && isLeftCol && !isTopLeft) {
      quickPlay = false;
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      syncAllCardStates();
      return;
    }

    if (isTopLeft) {
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      syncAllCardStates();
      return;
    }

    if (!selection) {
      selection = { uid: card.uid, pairId: card.pairId, column: card.column };
      syncAllCardStates();
      return;
    }

    if (selection.uid === card.uid) {
      if (!quickPlay) {
        selection = null;
        syncAllCardStates();
      }
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
      if (quickPlay) {
        setTimeout(() => autoSelectTopLeft(), 0);
      }
    }, MATCH_CLEAR_DELAY);
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
      if (quickPlay) {
        setTimeout(() => autoSelectTopLeft(), 0);
      }
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
      controls.setRoundComplete(false);
      return;
    }
    statusText.textContent = `${remainingPairs} pair${remainingPairs === 1 ? '' : 's'} left | Using ${Math.min(prefs.size, available.length)} of ${available.length}`;
    controls.setRoundComplete(remainingPairs === 0 && boardColumns.left.length > 0);
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

  function buildToolbar() {
    const root = document.createElement('div');
    root.className = 'match-toolbar panel match-toolbar--lean';

    const statusWrap = document.createElement('div');
    statusWrap.className = 'match-toolbar-item match-status-wrap';
    statusWrap.appendChild(statusText);

    const actions = document.createElement('div');
    actions.className = 'match-toolbar-actions';

    const playAgainBtn = document.createElement('button');
    playAgainBtn.type = 'button';
    playAgainBtn.className = 'match-play-again';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.addEventListener('click', () => startRound());

    const optionsAnchor = document.createElement('div');
    optionsAnchor.className = 'options-anchor';
    const optionsBtn = document.createElement('button');
    optionsBtn.type = 'button';
    optionsBtn.className = 'chip chip--icon match-options-btn';
    optionsBtn.setAttribute('aria-label', 'Match options');
    optionsBtn.textContent = '⚙︎';
    optionsBtn.setAttribute('aria-expanded', 'false');
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover) {
        closeOptions();
      } else {
        openOptions();
      }
    });
    optionsAnchor.appendChild(optionsBtn);

    actions.appendChild(playAgainBtn);
    actions.appendChild(optionsAnchor);

    root.append(statusWrap, actions);

    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'match-select';
    for (let n = MIN_SET; n <= MAX_SET; n++) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = String(n);
      sizeSelect.appendChild(opt);
    }
    sizeSelect.value = String(prefs.size);

    const directionSelect = document.createElement('select');
    directionSelect.className = 'match-select';
    DIRECTIONS.forEach(({ key, label }) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      directionSelect.appendChild(opt);
    });
    directionSelect.value = prefs.direction;

    const collapseToggle = document.createElement('input');
    collapseToggle.type = 'checkbox';
    collapseToggle.checked = !!prefs.collapseMatches;

    const sizeHint = document.createElement('div');
    sizeHint.className = 'match-hint options-hint';
    sizeHint.hidden = true;

    let popover = null;

    function buildOptionsPopover() {
      const pop = document.createElement('div');
      pop.className = 'options-popover';

      const title = document.createElement('div');
      title.className = 'options-popover-title';
      title.textContent = 'Match options';

      const sizeRow = document.createElement('div');
      sizeRow.className = 'options-row';
      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = 'Set size';
      const sizeValue = document.createElement('div');
      sizeValue.className = 'options-value';
      const sizeSuffix = document.createElement('span');
      sizeSuffix.className = 'match-size-suffix';
      sizeSuffix.textContent = 'words';
      sizeValue.append(sizeSelect, sizeSuffix);
      sizeRow.append(sizeLabel, sizeValue);

      const dirRow = document.createElement('div');
      dirRow.className = 'options-row';
      const dirLabel = document.createElement('span');
      dirLabel.textContent = 'Direction';
      const dirValue = document.createElement('div');
      dirValue.className = 'options-value';
      dirValue.append(directionSelect);
      dirRow.append(dirLabel, dirValue);

      const collapseRow = document.createElement('div');
      collapseRow.className = 'options-row options-row--toggle';
      const collapseText = document.createElement('span');
      collapseText.textContent = 'Collapse matches';
      const collapseValue = document.createElement('div');
      collapseValue.className = 'options-value';
      collapseValue.append(collapseToggle);
      collapseRow.append(collapseText, collapseValue);

      pop.append(title, sizeRow, dirRow, collapseRow, sizeHint);
      pop.addEventListener('click', (ev) => ev.stopPropagation());
      return pop;
    }

    function openOptions() {
      popover = buildOptionsPopover();
      optionsAnchor.appendChild(popover);
      document.addEventListener('click', handleOutside, true);
      window.addEventListener('keydown', handleEscape);
      optionsBtn.setAttribute('aria-expanded', 'true');
    }

    function closeOptions() {
      if (!popover) return;
      popover.remove();
      popover = null;
      document.removeEventListener('click', handleOutside, true);
      window.removeEventListener('keydown', handleEscape);
      optionsBtn.setAttribute('aria-expanded', 'false');
    }

    function handleOutside(ev) {
      if (!popover) return;
      if (popover.contains(ev.target) || optionsBtn.contains(ev.target)) return;
      closeOptions();
    }

    function handleEscape(ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        closeOptions();
      }
    }

    function commitSize() {
      prefs.size = clampSize(sizeSelect.value);
      sizeSelect.value = String(prefs.size);
      savePrefs({ ...prefs });
      updateAvailabilityHint();
    }
    sizeSelect.addEventListener('input', commitSize);
    sizeSelect.addEventListener('change', commitSize);

    directionSelect.addEventListener('change', () => {
      prefs.direction = directionSelect.value;
      savePrefs({ ...prefs });
    });

    collapseToggle.addEventListener('change', () => {
      prefs.collapseMatches = collapseToggle.checked;
      savePrefs({ ...prefs });
      updateCompactMode();
    });

    function updateAvailabilityHint() {
      const desired = prefs.size;
      const usable = Math.min(desired, available.length);
      let msg = '';
      if (available.length < MIN_PLAYABLE) {
        msg = 'Need at least two filtered words.';
      } else if (usable < desired) {
        msg = `Only ${available.length} available; using ${usable}.`;
      }
      sizeHint.textContent = msg;
      sizeHint.hidden = !msg;
      playAgainBtn.disabled = available.length < MIN_PLAYABLE;
    }

    return {
      root,
      updateAvailabilityHint,
      setRoundComplete(isComplete) {
        playAgainBtn.classList.toggle('is-celebrate', !!isComplete);
        if (isComplete) {
          playAgainBtn.disabled = false;
        }
      },
      destroy: closeOptions
    };
  }

  controls.updateAvailabilityHint();
  updateCompactMode();
  startRound();

  const unsubscribe = subscribe(() => handleStateChange());
  return () => {
    controls.destroy?.();
    unsubscribe();
  };

  function findTopLeftCandidate() {
    return boardColumns.left.find(
      (card) => !matchedPairs.has(card.pairId) && !clearedCards.has(card.uid)
    );
  }

  function isTopLeftCard(card) {
    const candidate = findTopLeftCandidate();
    return !!candidate && candidate.uid === card.uid;
  }

  function autoSelectTopLeft() {
    if (!quickPlay) return;
    const candidate = findTopLeftCandidate();
    if (!candidate) {
      quickPlay = false;
      selection = null;
      syncAllCardStates();
      return;
    }
    selection = { uid: candidate.uid, pairId: candidate.pairId, column: candidate.column };
    syncAllCardStates();
  }
}



