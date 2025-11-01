// assets/components/TopBar.js
import { applyFilters, shuffledIds, sortWords, State, subscribe } from '../state.js';
import { openSettingsModal } from './SettingsModal.js';

export function mountTopBar(container) {
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.id = 'topbar';
  panel.style.position = 'relative';

  const row = document.createElement('div');
  row.className = 'row';

  // Only ★
  const only = chip('Only ★', !!State.filters.starred, () => {
    State.set('filters', { ...State.filters, starred: !State.filters.starred });
  });
  row.appendChild(only);

  // Shuffle (stay on current view) + clear sort indicators
  const sh = chip('Shuffle', false, () => {
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);
    State.set('order', shuffledIds(sorted));
    State.set('sort', { key: '', dir: 'asc' }); // ← clear sort UI after shuffle
  });
  row.appendChild(sh);

  // Filters (popover)
  const filtersChip = chip('Filters', hasActiveFilters(), toggleFilters);
  filtersChip.id = 'filters-chip';
  row.appendChild(filtersChip);

  // spacer
  const sp = document.createElement('span'); sp.className = 'spacer';
  row.appendChild(sp);

  // Results count
  const resultCount = document.createElement('span');
  resultCount.className = 'countpill';
  Object.assign(resultCount.style, { opacity: .85, fontWeight: '700', marginRight: '8px' });
  row.appendChild(resultCount);

  // Gear (Settings)
  const gear = document.createElement('button');
  gear.className = 'chip';
  gear.title = 'Settings';
  gear.textContent = '⚙︎';
  gear.onclick = () => openSettingsModal();
  row.appendChild(gear);

  // Search
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search…';
  search.value = State.filters.search || '';
  search.className = 'search';
  search.autocapitalize = 'off';
  search.autocomplete = 'off';
  search.spellcheck = false;

  let t = 0;
  search.oninput = () => {
    clearTimeout(t);
    const val = search.value;
    t = setTimeout(() => {
      State.set('filters', { ...State.filters, search: val });
    }, 200);
  };
  row.appendChild(search);

  panel.appendChild(row);
  container.appendChild(panel);

  // ---- Filters popover (unchanged from your working version) ----
  let pop = null;
  function toggleFilters(e) {
    e?.stopPropagation();
    if (pop) { closePop(); return; }
    pop = buildFiltersPopover();
    panel.appendChild(pop);
    positionPopover(pop, filtersChip);
    setTimeout(() => window.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(ev) {
    if (!pop) return;
    if (pop.contains(ev.target) || ev.target === filtersChip) return;
    closePop();
  }
  function closePop() {
    if (pop?._unsub) pop._unsub();
    pop?.remove(); pop = null;
    window.removeEventListener('click', onDocClick);
  }

  function buildFiltersPopover() {
    const el = document.createElement('div');
    el.className = 'popover';
    Object.assign(el.style, {
      position: 'absolute', right: '12px', top: '56px',
      border: '1px solid var(--line)', borderRadius: '12px',
      padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,.35)', zIndex: '1000',
      width: 'min(720px, 96vw)'
    });
    el.addEventListener('click', (e) => e.stopPropagation());

    const grid = document.createElement('div');
    Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' });

    const { posValues, cefrValues, tagValues } = collectFacetValues(State.words);

    grid.appendChild(sectionChecks('POS', posValues, State.filters.pos || [], next => {
      State.set('filters', { ...State.filters, pos: next });
    }));
    grid.appendChild(sectionChecks('CEFR', cefrValues, State.filters.cefr || [], next => {
      State.set('filters', { ...State.filters, cefr: next });
    }));
    grid.appendChild(sectionChecks('Tags', tagValues, State.filters.tags || [], next => {
      State.set('filters', { ...State.filters, tags: next });
    }));

    // Weight row (buttons) with live UI refresh
    const weightWrap = document.createElement('div');
    weightWrap.style.gridColumn = '1 / -1';
    const wTitle = document.createElement('div');
    wTitle.textContent = 'Weight';
    Object.assign(wTitle.style, { fontWeight: '700', marginTop: '8px', marginBottom: '6px' });
    const wRow = document.createElement('div');
    Object.assign(wRow.style, { display: 'flex', gap: '8px', flexWrap: 'wrap' });

    const weightBtns = [];
    const refreshWeightBtns = () => {
      const set = new Set(State.filters.weight || [0, 1, 2, 3, 4]);
      weightBtns.forEach(btn => {
        const n = parseInt(btn.dataset.weight, 10);
        btn.setAttribute('aria-pressed', String(set.has(n)));
      });
    };
    for (let n = 0; n <= 4; n++) {
      const b = chip('W' + n, false, () => {
        const set = new Set(State.filters.weight || [0, 1, 2, 3, 4]);
        set.has(n) ? set.delete(n) : set.add(n);
        State.set('filters', { ...State.filters, weight: [...set].sort((a, b) => a - b) });
        refreshWeightBtns();
      });
      b.dataset.weight = String(n);
      weightBtns.push(b);
      wRow.appendChild(b);
    }
    weightWrap.append(wTitle, wRow);

    el.appendChild(grid);
    el.appendChild(weightWrap);

    const footer = document.createElement('div');
    Object.assign(footer.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' });

    const clear = document.createElement('button');
    clear.className = 'chip';
    clear.textContent = 'Clear';
    clear.onclick = () => {
      State.set('filters', { ...State.filters, pos: [], cefr: [], tags: [], weight: [0, 1, 2, 3, 4] });
      refreshWeightBtns();
    };

    const close = document.createElement('button');
    close.className = 'chip';
    close.textContent = 'Close';
    close.onclick = closePop;

    footer.append(clear, close);
    el.appendChild(footer);

    el._unsub = subscribe(() => refreshWeightBtns());
    refreshWeightBtns();
    return el;

    function sectionChecks(title, values = [], selected = [], onChange) {
      const wrap = document.createElement('div');
      const h = document.createElement('div');
      h.textContent = title;
      h.style.fontWeight = '700';
      h.style.marginBottom = '6px';
      wrap.appendChild(h);

      const box = document.createElement('div');
      Object.assign(box.style, { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '40vh', overflow: 'auto' });

      const selLower = (selected || []).map(s => s.toLowerCase());
      (values || []).forEach(v => {
        const lab = document.createElement('label');
        lab.style.display = 'flex'; lab.style.alignItems = 'center'; lab.style.gap = '8px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selLower.includes(v.toLowerCase());
        cb.onchange = () => {
          const set = new Set((State.filters[title.toLowerCase()] || []).map(s => s.toLowerCase()));
          if (cb.checked) set.add(v.toLowerCase()); else set.delete(v.toLowerCase());
          onChange([...set]);
        };
        const span = document.createElement('span'); span.textContent = v;
        lab.append(cb, span);
        box.appendChild(lab);
      });
      wrap.appendChild(box);
      return wrap;
    }
  }

  function positionPopover(popover, anchor) {
    popover.style.top = (anchor.offsetTop + anchor.offsetHeight + 8) + 'px';
    popover.style.right = '12px';
  }

  function collectFacetValues(words = []) {
    const pos = new Set(), cefr = new Set(), tags = new Map();
    const addTag = (t) => { const k = t.toLowerCase(); tags.set(k, (tags.get(k) || 0) + 1); };
    for (const w of words) {
      if (w.pos) pos.add(w.pos);
      if (w.cefr) cefr.add(w.cefr);
      if (w.tags) {
        String(w.tags).split(/[|,;]+|\s+/g).map(s => s.trim()).filter(Boolean).forEach(addTag);
      }
    }
    const tagValues = [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 150).map(([k]) => k);
    return { posValues: [...pos].sort(), cefrValues: [...cefr].sort(), tagValues };
  }

  function hasActiveFilters() {
    const f = State.filters || {};
    const filterCount =
      (f.starred ? 1 : 0) +
      (Array.isArray(f.weight) && f.weight.length < 5 ? 1 : 0) +
      (f.pos?.length || 0) + (f.cefr?.length || 0) + (f.tags?.length || 0);
    return filterCount > 0;
  }

  // Subscribe to keep UI in sync
  const unsub = subscribe(() => {
    only.setAttribute('aria-pressed', String(!!State.filters.starred));
    if (document.activeElement !== search) search.value = State.filters.search || '';

    const f = State.filters || {};
    const count =
      (f.starred ? 1 : 0) +
      (Array.isArray(f.weight) && f.weight.length < 5 ? 1 : 0) +
      (f.pos?.length || 0) + (f.cefr?.length || 0) + (f.tags?.length || 0);
    filtersChip.textContent = count ? `Filters (${count})` : 'Filters';
    filtersChip.setAttribute('aria-pressed', String(!!count));

    const n = applyFilters(State.words).length;
    resultCount.textContent = `${n} result${n === 1 ? '' : 's'}`;
  });

  panel.appendChild(row);
  return () => { unsub(); };
}

function chip(label, pressed, onClick) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(!!pressed));
  b.onclick = onClick;
  return b;
}
