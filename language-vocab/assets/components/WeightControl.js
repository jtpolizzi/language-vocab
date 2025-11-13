// assets/components/WeightControl.js
const COLOR_TOKENS = {
  1: 'var(--weight-1)',
  2: 'var(--weight-2)',
  3: 'var(--weight-3)',
  4: 'var(--weight-4)',
  5: 'var(--weight-5)'
};

export const WEIGHT_DESCRIPTIONS = {
  1: 'Hide almost completely',
  2: 'Show rarely',
  3: 'Default cadence',
  4: 'Show more often',
  5: 'Show constantly'
};

export const WEIGHT_SHORT_LABELS = {
  1: 'Hide',
  2: 'Rare',
  3: 'Default',
  4: 'More',
  5: 'Max'
};

let spriteInjected = false;

function ensureSprite() {
  if (spriteInjected) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';

  const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
  symbol.setAttribute('id', 'spark-icon');
  symbol.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute(
    'd',
    'M9 4.5c.335 0 .629.222.721.544l.813 2.846c.356 1.246 1.33 2.219 2.576 2.575l2.846.814c.322.092.544.386.544.721s-.222.629-.544.721l-2.846.813c-1.246.356-2.22 1.33-2.576 2.576l-.813 2.846c-.092.322-.386.544-.721.544s-.629-.222-.721-.544l-.813-2.846c-.356-1.246-1.33-2.22-2.576-2.576l-2.846-.813C2.222 12.629 2 12.335 2 12s.222-.629.544-.721l2.846-.814c1.246-.356 2.22-1.33 2.576-2.575l.813-2.846C8.371 4.722 8.665 4.5 9 4.5Zm9-3c.344 0 .644.234.728.568l.259 1.035c.235.94.97 1.675 1.91 1.91l1.035.259c.334.083.568.383.568.728s-.234.644-.568.727l-1.035.259c-.94.235-1.675.97-1.91 1.91l-.259 1.035A.75.75 0 0 1 18 10.5a.75.75 0 0 1-.728-.568l-.259-1.035c-.235-.94-.97-1.675-1.91-1.91l-1.035-.259A.75.75 0 0 1 13.5 6c0-.345.234-.645.568-.728l1.035-.259c.94-.235 1.675-.97 1.91-1.91l.259-1.035A.75.75 0 0 1 18 1.5Zm-1.5 13.5c.323 0 .61.206.712.513l.394 1.183c.149.448.501.8.949.949l1.183.394c.306.102.512.389.512.712s-.206.61-.512.712l-1.183.394a1.5 1.5 0 0 0-.949.949l-.394 1.183a.75.75 0 0 1-1.424 0l-.394-1.183a1.5 1.5 0 0 0-.949-.949l-1.183-.394A.75.75 0 0 1 12.75 18c0-.323.206-.61.512-.712l1.183-.394a1.5 1.5 0 0 0 .949-.949l.394-1.183a.75.75 0 0 1 .712-.513Z'
  );
  symbol.appendChild(path);
  svg.appendChild(symbol);
  document.body.appendChild(svg);
  spriteInjected = true;
}

export function clampWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}

export function createSparkIcon(className = '') {
  ensureSprite();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  if (className) svg.classList.add(className);
  svg.setAttribute('role', 'presentation');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#spark-icon');
  use.setAttribute('href', '#spark-icon');
  svg.appendChild(use);
  return svg;
}

export function createWeightControl({ value = 3, onChange, ariaLabel = 'Adjust weight', compact = false } = {}) {
  ensureSprite();
  let current = clampWeight(value);

  const root = document.createElement('div');
  root.className = 'weight-spark';
  if (compact) root.classList.add('weight-spark--compact');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ariaLabel);

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'weight-spark__btn';
  minus.setAttribute('aria-label', 'See less often');
  minus.textContent = '−';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'weight-spark__btn';
  plus.setAttribute('aria-label', 'See more often');
  plus.textContent = '+';

  const core = document.createElement('div');
  core.className = 'weight-spark__core';
  const icon = createSparkIcon('weight-spark__icon');
  core.appendChild(icon);

  const setColor = () => {
    root.dataset.value = String(current);
    root.style.setProperty('--weight-spark-color', COLOR_TOKENS[current] || COLOR_TOKENS[3]);
    core.title = WEIGHT_DESCRIPTIONS[current] || '';
  };

  const commit = (next) => {
    const clamped = clampWeight(next);
    if (clamped === current) return;
    current = clamped;
    setColor();
    if (typeof onChange === 'function') onChange(current);
  };

  minus.addEventListener('click', (e) => {
    e.preventDefault();
    commit(current - 1);
  });
  plus.addEventListener('click', (e) => {
    e.preventDefault();
    commit(current + 1);
  });

  root.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    commit(current + delta);
  }, { passive: false });

  root.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  root.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  root.append(minus, core, plus);
  setColor();
  return root;
}
