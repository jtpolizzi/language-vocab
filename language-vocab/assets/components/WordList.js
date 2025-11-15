// assets/components/WordList.js
import { applyFilters, Prog, setCurrentWordId, setRowSelectionMode, isRowSelectionModeEnabled, sortWords, State, subscribe } from '../state.js';
import { createWeightControl, createSparkIcon } from './WeightControl.js';

function syncSelectionIfEnabled(wordId) {
  if (!wordId) return;
  if (!isRowSelectionModeEnabled()) return;
  setCurrentWordId(wordId);
}

export function mountWordList(container) {
  container.innerHTML = '';

  // Defensive cleanup in case the previous flashcard view didn't teardown
  document.querySelectorAll('.bottombar').forEach((el) => el.remove());
  document.body.classList.remove('pad-bottom');
  document.body.classList.add('wordlist-lock');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  let cleaned = false;
  const LONG_PRESS_DELAY = 600;
  const LONG_PRESS_TOLERANCE = 12;
  let longPressInfo = null;

  const cols = [
    { key: 'star', label: '★' },
    { key: 'weight', label: 'Weight' },
    { key: 'word', label: 'Word' },
    { key: 'definition', label: 'Definition' },
    { key: 'pos', label: 'POS' },
    { key: 'cefr', label: 'CEFR' },
    { key: 'tags', label: 'Tags' },
  ];

  // ---- header (with sort indicators) ----
  const trh = document.createElement('tr');
  const headerEls = new Map();

  cols.forEach(c => {
    const th = document.createElement('th');
    th.dataset.key = c.key;

    const label = document.createElement('span');
    if (c.key === 'weight') {
      label.appendChild(createSparkIcon('weight-header-icon'));
    } else {
      label.textContent = c.label;
    }

    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow';

    th.append(label, arrow);
    th.onclick = () => {
      const nextDir = (State.sort.key === c.key && State.sort.dir === 'asc') ? 'desc' : 'asc';
      State.set('order', []);                         // <-- clear Shuffle order
      State.set('sort', { key: c.key, dir: nextDir }); //     then apply sort
    };

    trh.appendChild(th);
    headerEls.set(c.key, { th, arrow });
  });

  thead.appendChild(trh);
  table.appendChild(thead);
  table.appendChild(tbody);
  const wrap = document.createElement('div');
  wrap.className = 'wordlist-view';
  const scrollRegion = document.createElement('div');
  scrollRegion.className = 'wordlist-scroll';
  scrollRegion.appendChild(table);
  wrap.appendChild(scrollRegion);
  container.appendChild(wrap);

  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    if (e.target.closest('button')) return;
    row.focus();
  });
  tbody.addEventListener('keydown', handleRowKeydown, true);
  tbody.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const wordId = row.dataset.wordId;
    if (!wordId) return;
    syncSelectionIfEnabled(wordId);
    startLongPressWatch(e, row, wordId);
  }, true);
  tbody.addEventListener('pointermove', (e) => {
    if (!longPressInfo) return;
    if (longPressInfo.pointerId != null && e.pointerId != null && e.pointerId !== longPressInfo.pointerId) return;
    const dx = e.clientX - longPressInfo.startX;
    const dy = e.clientY - longPressInfo.startY;
    if (Math.abs(dx) > LONG_PRESS_TOLERANCE || Math.abs(dy) > LONG_PRESS_TOLERANCE) {
      cancelLongPressWatch();
    }
  }, true);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => {
    tbody.addEventListener(evt, cancelLongPressWatch, true);
  });

  function startLongPressWatch(e, row, wordId) {
    cancelLongPressWatch();
    if (!row) return;
    if (!wordId) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    const timer = setTimeout(() => {
      const pendingWordId = longPressInfo?.wordId;
      longPressInfo = null;
      if (pendingWordId) handleRowLongPress(pendingWordId);
    }, LONG_PRESS_DELAY);
    longPressInfo = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      wordId,
      timer
    };
  }

  function cancelLongPressWatch(e) {
    if (!longPressInfo) return;
    if (e && longPressInfo.pointerId != null && e.pointerId != null && e.pointerId !== longPressInfo.pointerId) return;
    clearTimeout(longPressInfo.timer);
    longPressInfo = null;
  }

  function handleRowLongPress(wordId) {
    if (!wordId) return;
    if (!isRowSelectionModeEnabled()) {
      setRowSelectionMode(true);
      setCurrentWordId(wordId);
      return;
    }
    const currentId = State.ui?.currentWordId || '';
    if (currentId === wordId) {
      setRowSelectionMode(false);
      setCurrentWordId('');
      return;
    }
    setCurrentWordId(wordId);
  }

  function fmtTagsComma(s) {
    if (!s) return '';
    return String(s)
      .split(/[|,;]+|\s+/g)
      .map(t => t.trim())
      .filter(Boolean)
      .join(', ');
  }

  function updateHeaderIndicators() {
    const { key, dir } = State.sort;
    headerEls.forEach(({ th, arrow }) => {
      th.classList.remove('sorted', 'asc', 'desc');
      arrow.textContent = '';
    });
    if (!key) return; // ← nothing highlighted if sort cleared (e.g., after Shuffle)
    const h = headerEls.get(key);
    if (!h) return;
    h.th.classList.add('sorted', dir);
    h.arrow.textContent = dir === 'asc' ? '▲' : '▼';
  }

  function render() {
    const filtered = applyFilters(State.words);
    let rows = sortWords(filtered);
    const selectionEnabled = isRowSelectionModeEnabled();
    const currentId = selectionEnabled ? (State.ui?.currentWordId || '') : '';

    // Respect State.order for Shuffle but never drop matching rows
    if (State.order && State.order.length) {
      const byId = new Map(rows.map(w => [w.id, w]));
      const ordered = [];
      const seen = new Set();
      State.order.forEach(id => {
        if (seen.has(id)) return;
        const hit = byId.get(id);
        if (hit) {
          ordered.push(hit);
          seen.add(id);
        }
      });
      if (ordered.length) {
        if (ordered.length < rows.length) {
          rows.forEach(w => {
            if (seen.has(w.id)) return;
            ordered.push(w);
          });
        }
        rows = ordered;
      }
    }

    tbody.innerHTML = '';
    let focusedRow = null;
    for (const w of rows) {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.dataset.wordId = w.id;
      tr.appendChild(tdStar(w.id));
      tr.appendChild(tdWeight(w.id));
      tr.appendChild(tdText(w.es));
      tr.appendChild(tdText(w.en));
      tr.appendChild(tdText(w.pos));
      tr.appendChild(tdText(w.cefr));
      tr.appendChild(tdTags(w.tags));
      tr.addEventListener('focus', () => syncSelectionIfEnabled(w.id));
      if (selectionEnabled && currentId && currentId === w.id) {
        tr.classList.add('is-current');
        tr.setAttribute('aria-current', 'true');
        focusedRow = tr;
      } else {
        tr.classList.remove('is-current');
        tr.removeAttribute('aria-current');
      }
      tr.addEventListener('click', () => syncSelectionIfEnabled(w.id));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          syncSelectionIfEnabled(w.id);
        }
      });
      tbody.appendChild(tr);
    }

    if (focusedRow) {
      requestAnimationFrame(() => {
        focusedRow.focus({ preventScroll: true });
        focusedRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }

    updateHeaderIndicators();
    applyColumnVisibility(table);
  }

  render();
  const unsubscribe = subscribe(render);
  return () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('wordlist-lock');
    unsubscribe();
  };
}

/* --- cells --- */
function tdText(text) {
  const td = document.createElement('td');
  td.textContent = text || '';
  return td;
}

function tdTags(tags) {
  const td = document.createElement('td');
  td.textContent = fmt(tags);
  return td;

  function fmt(s) {
    if (!s) return '';
    return String(s)
      .split(/[|,;]+|\s+/g)
      .map(t => t.trim())
      .filter(Boolean)
      .join(', ');
  }
}

function tdStar(id) {
  const td = document.createElement('td');
  const b = document.createElement('button');
  b.className = 'iconbtn';
  b.title = 'Star';
  b.style.fontSize = '20px';
  b.style.lineHeight = '1';
  b.style.padding = '4px 8px';

  const setIcon = () => {
    const on = Prog.star(id);
    b.textContent = on ? '★' : '☆';
    b.setAttribute('aria-pressed', String(on));
    b.style.color = on ? 'var(--accent)' : 'var(--fg-dim)';
    b.style.borderColor = on ? 'var(--accent)' : '#4a5470';
    b.title = on ? 'Starred' : 'Not starred';
  };
  setIcon();

  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopImmediatePropagation(); });
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    Prog.setStar(id, !Prog.star(id));
    setIcon();
  });

  td.appendChild(b);
  return td;
}

function tdWeight(id) {
  const td = document.createElement('td');
  const control = createWeightControl({
    value: Prog.weight(id),
    onChange: (next) => Prog.setWeight(id, next),
    ariaLabel: 'Adjust weight',
    compact: true
  });
  td.appendChild(control);
  return td;
}

/* --- column visibility per Settings --- */
function applyColumnVisibility(table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  Object.keys(State.columns).forEach((key) => {
    const idx = headers.findIndex(th => th.dataset.key === key);
    if (idx === -1) return;
    const show = !!State.columns[key];
    table.querySelectorAll(`thead th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`)
      .forEach(el => el.classList.toggle('hide', !show));
  });
}

function handleRowKeydown(e) {
  const target = e.target;
  const row = target.closest('tr');
  if (!row) return;
  const wordId = row.dataset.wordId;
  if (!wordId) return;
  if (target.closest('button')) {
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = row.nextElementSibling;
    if (next) {
      next.focus();
      syncSelectionIfEnabled(next.dataset.wordId || '');
      next.scrollIntoView({ block: 'nearest' });
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = row.previousElementSibling;
    if (prev) {
      prev.focus();
      syncSelectionIfEnabled(prev.dataset.wordId || '');
      prev.scrollIntoView({ block: 'nearest' });
    }
    return;
  }
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    Prog.setStar(wordId, !Prog.star(wordId));
    syncSelectionIfEnabled(wordId);
    return;
  }
  if (/^[1-5]$/.test(e.key)) {
    e.preventDefault();
    Prog.setWeight(wordId, Number(e.key));
    syncSelectionIfEnabled(wordId);
  }
}
