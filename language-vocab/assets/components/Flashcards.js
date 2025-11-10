// assets/components/Flashcards.js
import { applyFilters, Prog, sortWords, State, subscribe } from '../state.js';

export function mountFlashcards(container) {
  container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  const topr = document.createElement('div');
  topr.className = 'topright';
  const foot = document.createElement('div');
  foot.className = 'footmeta';
  card.appendChild(topr);
  card.appendChild(foot);

  // bottom bar
  const bar = document.createElement('div');
  bar.className = 'bottombar';
  const prev = document.createElement('button');
  prev.className = 'bigbtn';
  prev.textContent = '←';
  const next = document.createElement('button');
  next.className = 'bigbtn';
  next.textContent = '→';
  const count = document.createElement('span');
  count.className = 'counter';
  count.textContent = '1/1';
  bar.append(prev, count, next);
  document.body.appendChild(bar);
  document.body.classList.add('pad-bottom');

  let showFront = true;
  let index = 0;
  let view = [];
  let suppressNextCardClick = false;  // <-- hard guard

  function computeView() {
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);

    if (State.order && State.order.length) {
      const byId = new Map(sorted.map(w => [w.id, w]));
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
        if (ordered.length < sorted.length) {
          sorted.forEach(w => {
            if (seen.has(w.id)) return;
            ordered.push(w);
          });
        }
        return ordered;
      }
    }

    return sorted;
  }

  function fmtTagsComma(s) {
    if (!s) return '';
    return String(s)
      .split(/[|,;]+/g)
      .map(t => t.trim())
      .filter(Boolean)
      .join(', ');
  }

  function render() {
    const oldId = view[index]?.id;
    view = computeView();

    // keep index stable relative to same id if possible
    if (oldId) {
      const newIdx = view.findIndex(w => w.id === oldId);
      if (newIdx !== -1) index = newIdx;
    }
    if (index >= view.length) index = Math.max(0, view.length - 1);

    const w = view[index];
    if (!w) {
      card.textContent = 'No cards match your filters.';
      count.textContent = `0 / 0`;
      return;
    }

    // main text
    card.textContent = showFront ? (w.es || '') : (w.en || '');
    card.appendChild(topr);
    card.appendChild(foot);

    // --- top-right controls ---
    topr.innerHTML = '';

    const star = document.createElement('button');
    star.className = 'iconbtn';
    star.title = 'Star';
    star.style.fontSize = '22px';
    star.style.lineHeight = '1';
    star.style.padding = '4px 8px';

    const setStar = () => {
      const on = Prog.star(w.id);
      star.textContent = on ? '★' : '☆';
      star.setAttribute('aria-pressed', String(on));
      star.style.color = on ? 'var(--accent)' : 'var(--fg-dim)';
      star.style.borderColor = on ? 'var(--accent)' : '#4a5470';
    };
    setStar();

    // stop the next card click AND re-render after toggle
    const swallow = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      suppressNextCardClick = true;
    };
    star.addEventListener('pointerdown', swallow);
    star.addEventListener('click', (e) => {
      swallow(e);
      Prog.setStar(w.id, !Prog.star(w.id));
      // if Only★ is ON, current card may exit the view; render to update counter & position
      render();
    });
    topr.appendChild(star);

    // Weight dots
    const dots = document.createElement('span');
    dots.className = 'dots';
    const v = Prog.weight(w.id);
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('button');
      d.className = 'dot' + (i <= v ? ' active' : '');
      d.title = 'Weight ' + i;
      d.addEventListener('pointerdown', swallow);
      d.addEventListener('click', (e) => {
        swallow(e);
        Prog.setWeight(w.id, i);
        render();
      });
      dots.appendChild(d);
    }
    const lab = document.createElement('span');
    lab.className = 'weight-label';
    lab.textContent =
      ['New', 'Shaky', 'OK', 'Strong', 'Mastered'][v] || 'New';
    dots.appendChild(lab);
    topr.appendChild(dots);

    // Also block stray bubbling from the topr container
    topr.addEventListener('click', (e) => e.stopPropagation());

    // footer meta + optional translation
    const tagsComma = fmtTagsComma(w.tags);
    const parts = [w.pos, w.cefr];
    if (tagsComma) parts.push(tagsComma);

    foot.innerHTML = `
      <div class="meta-line">${parts.filter(Boolean).join(' • ')}</div>
      ${State.ui.showTranslation ? `<div class="translation">${w.en || ''}</div>` : ''}
    `;

    // counter
    count.textContent = `${view.length ? index + 1 : 0} / ${view.length}`;
  }

  function prevCard() {
    if (index > 0) {
      index--;
      showFront = true;
      render();
    }
  }
  function nextCard() {
    if (index < view.length - 1) {
      index++;
      showFront = true;
      render();
    }
  }
  function flipCard() {
    showFront = !showFront;
    render();
  }

  // Buttons
  prev.onclick = prevCard;
  next.onclick = nextCard;

  // Guarded card click
  function onCardClick(e) {
    if (suppressNextCardClick) {
      suppressNextCardClick = false; // consume the suppression
      return;
    }
    if (e.target.closest('.topright')) return;
    flipCard();
  }
  card.addEventListener('click', onCardClick);

  // Touch flip (guarded)
  let touchStartedInsideTopr = false;
  card.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      touchStartedInsideTopr = !!(el && el.closest('.topright'));
      card.dataset.tX = t.clientX;
      card.dataset.tY = t.clientY;
      card.dataset.tT = Date.now();
    },
    { passive: true }
  );
  card.addEventListener('touchend', (e) => {
    if (touchStartedInsideTopr) return;
    const dx = Math.abs(
      e.changedTouches[0].clientX - (parseFloat(card.dataset.tX) || 0)
    );
    const dy = Math.abs(
      e.changedTouches[0].clientY - (parseFloat(card.dataset.tY) || 0)
    );
    const dt = Date.now() - (parseInt(card.dataset.tT) || 0);
    if (dx < 10 && dy < 10 && dt < 300) flipCard();
  });

  // Keyboard navigation (ignore when a control has focus)
  function handleKey(e) {
    const ae = document.activeElement;
    const tag = ae?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
    if (ae && ae.closest('.topright')) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevCard();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCard();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipCard();
    }
  }
  window.addEventListener('keydown', handleKey);

  // Cleanup when leaving view
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('keydown', handleKey);
    card.removeEventListener('click', onCardClick);
    if (bar.parentNode) {
      bar.remove();
    }
    document.body.classList.remove('pad-bottom');
  }

  container.appendChild(card);
  render();
  const unsubscribe = subscribe(() => render());
  return () => {
    cleanup();
    unsubscribe();
  };
}
