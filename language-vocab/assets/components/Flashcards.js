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

  // progress bar (reuse multiple-choice styles)
  const progress = document.createElement('div');
  progress.className = 'choice-progress flash-progress';
  const progressLabel = document.createElement('span');
  progressLabel.className = 'choice-progress-label';
  progressLabel.textContent = 'Loading...';
  const progressBar = document.createElement('div');
  progressBar.className = 'choice-progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'choice-progress-fill';
  progressBar.appendChild(progressFill);
  progress.append(progressLabel, progressBar);

  // bottom bar
  const bar = document.createElement('div');
  bar.className = 'bottombar';
  const prev = document.createElement('button');
  prev.className = 'bigbtn';
  prev.textContent = '←';
  const next = document.createElement('button');
  next.className = 'bigbtn';
  next.textContent = '→';
  bar.append(prev, next);
  document.body.appendChild(bar);
  document.body.classList.add('pad-bottom');

  let showFront = true;
  let index = 0;
  let view = [];
  let currentWord = null;
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
    currentWord = w || null;
    if (!w) {
      card.textContent = 'No cards match your filters.';
      updateProgress(0, 0);
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

    updateProgress(index + 1, view.length);
  }

  function updateProgress(current, total) {
    if (!total) {
      progressLabel.textContent = '0 / 0';
      progressFill.style.width = '0%';
      return;
    }
    progressLabel.textContent = `Card ${current} / ${total}`;
    const pct = Math.min(100, Math.max(0, (current / total) * 100));
    progressFill.style.width = `${pct}%`;
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

  function handleTapZone(clientX, clientY) {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    if (relY >= 0.75) {
      if (relX < 0.5) {
        prevCard();
      } else {
        nextCard();
      }
    } else {
      flipCard();
    }
  }

  function toggleStarForCurrent() {
    if (!currentWord) return;
    Prog.setStar(currentWord.id, !Prog.star(currentWord.id));
    render();
  }

  function setWeightForCurrent(weight) {
    if (!currentWord) return;
    Prog.setWeight(currentWord.id, weight);
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
    handleTapZone(e.clientX, e.clientY);
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
    if (touchStartedInsideTopr) {
      touchStartedInsideTopr = false;
      return;
    }
    const startX = parseFloat(card.dataset.tX) || 0;
    const startY = parseFloat(card.dataset.tY) || 0;
    const startT = parseInt(card.dataset.tT, 10) || 0;
    const endTouch = e.changedTouches[0];
    const dx = endTouch.clientX - startX;
    const dy = endTouch.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - startT;

    const swipeThreshold = 60;
    if (adx > ady && adx >= swipeThreshold) {
      if (dx > 0) {
        prevCard();
      } else {
        nextCard();
      }
      return;
    }

    const tapMove = 35;
    const tapTime = 450;
    if (adx <= tapMove && ady <= tapMove && dt <= tapTime) {
      handleTapZone(endTouch.clientX, endTouch.clientY);
    }
    touchStartedInsideTopr = false;
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
    } else if (
      e.key === ' ' ||
      e.key === 'Enter' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      flipCard();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleStarForCurrent();
    } else if (/^[0-4]$/.test(e.key)) {
      e.preventDefault();
      setWeightForCurrent(Number(e.key));
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
    container.innerHTML = '';
    if (bar.parentNode) {
      bar.remove();
    }
    document.body.classList.remove('pad-bottom');
  }

  container.appendChild(progress);
  container.appendChild(card);
  render();
  const unsubscribe = subscribe(() => render());
  return () => {
    cleanup();
    unsubscribe();
  };
}
