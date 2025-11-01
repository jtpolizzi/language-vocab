// assets/components/WordList.js
import { applyFilters, Prog, sortWords, State, subscribe } from '../state.js';

export function mountWordList(container) {
  container.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

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
  container.appendChild(table);

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

    // Respect State.order if present so Shuffle affects Word List
    let rows;
    if (State.order && State.order.length) {
      const byId = new Map(filtered.map(w => [w.id, w]));
      rows = State.order.map(id => byId.get(id)).filter(Boolean);
      if (!rows.length) rows = sortWords(filtered);
    } else {
      rows = sortWords(filtered);
    }

    tbody.innerHTML = '';
    for (const w of rows) {
      const tr = document.createElement('tr');
      tr.appendChild(tdStar(w.id));
      tr.appendChild(tdWeight(w.id));
      tr.appendChild(tdText(w.es));
      tr.appendChild(tdText(w.en));
      tr.appendChild(tdText(w.pos));
      tr.appendChild(tdText(w.cefr));
      tr.appendChild(tdTags(w.tags));
      tbody.appendChild(tr);
    }

    updateHeaderIndicators();
    applyColumnVisibility(table);
    setStickyOffset();
  }

  render();
  return subscribe(render);
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
