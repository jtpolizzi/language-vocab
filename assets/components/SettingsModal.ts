// @ts-nocheck
// assets/components/SettingsModal.js
import { State, resetPersistentState, setFilters, setOrder, setSort } from '../state.ts';
import { createChip } from './ui/elements.ts';

export function openSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,.5)', zIndex: '2000',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  });

  const modal = document.createElement('div');
  modal.className = 'modal';
  Object.assign(modal.style, {
    width: 'min(720px, 96vw)', background: '#151a31', color: 'var(--fg)',
    border: '1px solid var(--line)', borderRadius: '16px', padding: '16px',
    boxShadow: '0 24px 60px rgba(0,0,0,.45)'
  });

  const h = document.createElement('h2');
  h.textContent = 'Settings';
  h.style.margin = '0 0 12px 0';

  // Columns (Word List)
  const colsWrap = document.createElement('div');
  const colsH = document.createElement('div');
  colsH.textContent = 'Columns (Word List)';
  colsH.style.fontWeight = '700';
  colsH.style.marginBottom = '6px';

  const colsBox = document.createElement('div');
  Object.assign(colsBox.style, { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' });

  const colKeys = ['star', 'weight', 'word', 'definition', 'pos', 'cefr', 'tags'];
  colKeys.forEach(k => {
    const lab = document.createElement('label');
    lab.style.display = 'flex'; lab.style.alignItems = 'center'; lab.style.gap = '8px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!State.columns[k];
    cb.onchange = () => {
      const next = { ...State.columns, [k]: cb.checked };
      State.set('columns', next);
    };
    const span = document.createElement('span');
    span.textContent = k[0].toUpperCase() + k.slice(1);
    lab.append(cb, span);
    colsBox.appendChild(lab);
  });
  colsWrap.append(colsH, colsBox);

  // Flashcards defaults
  const fcWrap = document.createElement('div');
  fcWrap.style.marginTop = '12px';
  const fcH = document.createElement('div');
  fcH.textContent = 'Flashcards';
  fcH.style.fontWeight = '700';
  fcH.style.marginBottom = '6px';

  const fcRow = document.createElement('label');
  fcRow.style.display = 'flex'; fcRow.style.alignItems = 'center'; fcRow.style.gap = '8px';
  const fcCb = document.createElement('input');
  fcCb.type = 'checkbox';
  fcCb.checked = !!State.ui.showTranslation;
  fcCb.onchange = () => {
    const ui = { ...State.ui, showTranslation: !!fcCb.checked };
    State.set('ui', ui);
  };
  const fcSpan = document.createElement('span'); fcSpan.textContent = 'Show translation by default';
  fcRow.append(fcCb, fcSpan);
  fcWrap.append(fcH, fcRow);

  const debugRow = document.createElement('label');
  debugRow.style.display = 'flex'; debugRow.style.alignItems = 'center'; debugRow.style.gap = '8px';
  const debugCb = document.createElement('input');
  debugCb.type = 'checkbox';
  debugCb.checked = !!State.ui.debugPanel;
  debugCb.onchange = () => {
    const ui = { ...State.ui, debugPanel: !!debugCb.checked };
    State.set('ui', ui);
  };
  const debugSpan = document.createElement('span'); debugSpan.textContent = 'Show debug panel';
  debugRow.append(debugCb, debugSpan);
  fcWrap.appendChild(debugRow);

  // Reset
  const resetWrap = document.createElement('div');
  resetWrap.style.marginTop = '12px';
  resetWrap.style.display = 'flex';
  resetWrap.style.flexDirection = 'column';
  resetWrap.style.gap = '8px';

  const resetRow = document.createElement('div');
  const resetBtn = createChip('Reset filters & order', {
    onClick: () => {
      setFilters({ starred: false, weight: [1, 2, 3, 4, 5], search: '', pos: [], cefr: [], tags: [] });
      setOrder([]);
      setSort({ key: 'word', dir: 'asc' });
    }
  });
  resetRow.append(resetBtn);

  const clearRow = document.createElement('div');
  const clearBtn = createChip('Clear all saved data');
  clearBtn.style.background = '#6b192c';
  clearBtn.style.borderColor = '#ff4d7d';
  clearBtn.style.color = '#fff';
  clearBtn.onclick = () => {
    const ok = window.confirm('This will remove all saved filters, stars, weights, and preferences on this device. Continue?');
    if (!ok) return;
    resetPersistentState();
    alert('All saved data cleared. Reload your words to start fresh.');
  };
  clearRow.append(clearBtn);

  resetWrap.append(resetRow, clearRow);

  // Footer
  const footer = document.createElement('div');
  Object.assign(footer.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' });
  const close = createChip('Close', { onClick: () => overlay.remove() });
  footer.append(close);

  modal.append(h, colsWrap, fcWrap, resetWrap, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/* Guarded route handler: only opens modal if URL hash is '#settings' */
export function mountSettings(container) {
  const isSettingsRoute = (location.hash || '').toLowerCase() === '#settings';
  if (!isSettingsRoute) { if (container) container.innerHTML = ''; return; }
  openSettingsModal();
  if (container) container.innerHTML = ''; // keep route container empty behind modal
}
