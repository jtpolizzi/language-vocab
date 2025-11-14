// assets/components/SettingsModal.js
import { Prog, State, forceStateUpdate } from '../state.js';

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

  // Reset
  const resetWrap = document.createElement('div');
  resetWrap.style.marginTop = '12px';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'chip';
  resetBtn.textContent = 'Reset filters & order';
  resetBtn.onclick = () => {
    State.set('filters', { starred: false, weight: [1, 2, 3, 4, 5], search: '', pos: [], cefr: [], tags: [] });
    State.set('order', []);
    State.set('sort', { key: 'word', dir: 'asc' });
  };
  resetWrap.append(resetBtn);

  const migrationWrap = document.createElement('div');
  migrationWrap.style.marginTop = '12px';
  const migrationInfo = document.createElement('p');
  migrationInfo.textContent = 'One-time weight migration: set everything to 3 unless starred (4).';
  migrationInfo.style.margin = '0 0 6px 0';
  migrationInfo.style.fontSize = '13px';
  migrationInfo.style.color = 'var(--fg-dim)';
  const migrationStatus = document.createElement('div');
  migrationStatus.style.fontSize = '12px';
  migrationStatus.style.color = 'var(--fg-dim)';
  migrationStatus.style.marginTop = '4px';
  const migrationBtn = document.createElement('button');
  migrationBtn.className = 'chip';
  const MIGRATION_FLAG = 'v23:weight-migrated-v2';
  const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG) === '1';
  migrationBtn.textContent = alreadyMigrated ? 'Weights already migrated' : 'Apply weight migration';
  migrationBtn.disabled = alreadyMigrated;
  migrationStatus.textContent = alreadyMigrated ? 'Already migrated on this device.' : '';
  migrationBtn.onclick = () => {
    migrationBtn.disabled = true;
    migrationBtn.textContent = 'Migrating…';
    migrationStatus.textContent = 'Updating weights…';
    requestAnimationFrame(() => {
      let touched = 0;
      State.words.forEach(word => {
        const target = Prog.star(word.id) ? 4 : 3;
        Prog.setWeight(word.id, target, { silent: true });
        touched += 1;
      });
      forceStateUpdate();
      localStorage.setItem(MIGRATION_FLAG, '1');
      migrationBtn.textContent = 'Weights migrated';
      migrationStatus.textContent = touched ? `Updated ${touched} words.` : 'Nothing to update.';
    });
  };
  migrationWrap.append(migrationInfo, migrationBtn, migrationStatus);

  // Footer
  const footer = document.createElement('div');
  Object.assign(footer.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' });
  const close = document.createElement('button');
  close.className = 'chip';
  close.textContent = 'Close';
  close.onclick = () => overlay.remove();
  footer.append(close);

  modal.append(h, colsWrap, fcWrap, resetWrap, migrationWrap, footer);
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
