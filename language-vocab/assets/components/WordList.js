// assets/components/WordList.js
import { applyFilters, Prog, setCurrentWordId, sortWords, State, subscribe } from '../state.js';

export function mountWordList(container) {
  container.innerHTML = '';

  // Defensive cleanup in case the previous flashcard view didn't teardown
  document.querySelectorAll('.bottombar').forEach((el) => el.remove());
  document.body.classList.remove('pad-bottom');

  const info = document.createElement('div');
  info.className = 'panel current-word-banner';
  const infoText = document.createElement('span');
  infoText.textContent = 'Tap a row to set the current word for Flashcards.';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'chip';
  clearBtn.textContent = 'Clear selection';
  clearBtn.hidden = true;
  clearBtn.type = 'button';
  clearBtn.addEventListener('click', () => setCurrentWordId(''));
  info.append(infoText, clearBtn);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  let cleaned = false;

  const cols = [
    { key: 'star', label: '★' },
    { key: 'weight', label: 'Weight' },
    { key: 'spanish', label: 'Spanish' },
    { key: 'english', label: 'English' },
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
    label.textContent = c.label;

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
  container.appendChild(info);
  container.appendChild(table);

  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    if (e.target.closest('button')) return;
    row.focus();
  });
  tbody.addEventListener('keydown', handleRowKeydown, true);

  // sticky offset (under app header)
  function setStickyOffset() {
    const appHeader = document.querySelector('.app-header');
    const offset = appHeader ? appHeader.offsetHeight : 0;
    document.documentElement.style.setProperty('--sticky-offset', `${offset}px`);
  }
  setStickyOffset();
  window.addEventListener('resize', setStickyOffset);
  window.addEventListener('hashchange', setStickyOffset);

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
    const currentId = State.ui?.currentWordId || '';

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
    let currentWord = null;
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
      tr.addEventListener('focus', () => setCurrentWordId(w.id));
      if (currentId && currentId === w.id) {
        tr.classList.add('is-current');
        tr.setAttribute('aria-current', 'true');
        currentWord = w;
        focusedRow = tr;
      } else {
        tr.removeAttribute('aria-current');
      }
      tr.addEventListener('click', () => setCurrentWordId(w.id));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setCurrentWordId(w.id);
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

    if (currentWord) {
      infoText.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = 'Current word';
      const detail = document.createElement('span');
      detail.textContent = ` ${currentWord.es || '—'} • ${currentWord.en || '—'}`;
      infoText.append(strong, detail);
      clearBtn.hidden = false;
    } else {
      infoText.textContent = 'Tap a row to set the current word for Flashcards.';
      clearBtn.hidden = true;
    }

    updateHeaderIndicators();
    applyColumnVisibility(table);
    setStickyOffset();
  }

  render();
  const unsubscribe = subscribe(render);
  return () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('resize', setStickyOffset);
    window.removeEventListener('hashchange', setStickyOffset);
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
  const wrap = document.createElement('span');
  wrap.className = 'dots';
  const v = Prog.weight(id);

  for (let i = 0; i < 5; i++) {
    const d = document.createElement('button');
    d.className = 'dot' + (i <= v ? ' active' : '');
    d.title = 'Weight ' + i;
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopImmediatePropagation(); });
    d.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      Prog.setWeight(id, i);
      for (let j = 0; j < wrap.children.length; j++) {
        const ch = wrap.children[j];
        if (ch.classList) ch.classList.toggle('active', j <= i);
      }
      lab.textContent = ['New', 'Shaky', 'OK', 'Strong', 'Mastered'][Prog.weight(id)] || 'New';
    });
    wrap.appendChild(d);
  }

  const lab = document.createElement('span');
  lab.className = 'weight-label';
  lab.textContent = ['New', 'Shaky', 'OK', 'Strong', 'Mastered'][v] || 'New';
  wrap.appendChild(lab);

  td.appendChild(wrap);
  return td;
}

/* --- column visibility per Settings --- */
function applyColumnVisibility(table) {
  const map = { star: '★', weight: 'weight', spanish: 'spanish', english: 'english', pos: 'pos', cefr: 'cefr', tags: 'tags' };
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.replace(/[▲▼]/g, '').trim().toLowerCase());
  Object.entries(map).forEach(([k, needle]) => {
    const idx = headers.findIndex(h => h.includes(needle));
    if (idx < 0) return;
    const show = !!State.columns[k];
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
      setCurrentWordId(next.dataset.wordId || '');
      next.scrollIntoView({ block: 'nearest' });
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = row.previousElementSibling;
    if (prev) {
      prev.focus();
      setCurrentWordId(prev.dataset.wordId || '');
      prev.scrollIntoView({ block: 'nearest' });
    }
    return;
  }
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    Prog.setStar(wordId, !Prog.star(wordId));
    setCurrentWordId(wordId);
    return;
  }
  if (/^[0-4]$/.test(e.key)) {
    e.preventDefault();
    Prog.setWeight(wordId, Number(e.key));
    setCurrentWordId(wordId);
  }
}
