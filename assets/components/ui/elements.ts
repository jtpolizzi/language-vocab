// assets/components/ui/elements.ts

interface ChipOptions {
  pressed?: boolean;
  onClick?: (ev: MouseEvent) => void;
  className?: string;
  title?: string;
  icon?: string;
}

interface IconChipOptions extends ChipOptions {
  disabled?: boolean;
}

export function createChip(label: string, options: ChipOptions = {}): HTMLButtonElement {
  const { pressed = false, onClick, className = '', title, icon } = options;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ['chip', className].filter(Boolean).join(' ');
  if (icon) {
    const span = document.createElement('span');
    span.textContent = icon;
    span.setAttribute('aria-hidden', 'true');
    btn.appendChild(span);
  }
  if (label) {
    const textNode = document.createElement('span');
    textNode.textContent = label;
    btn.appendChild(textNode);
  }
  btn.setAttribute('aria-pressed', String(!!pressed));
  if (title) btn.title = title;
  if (typeof onClick === 'function') btn.onclick = onClick;
  return btn;
}

export function createIconChip(symbol: string, label: string, options: IconChipOptions = {}): HTMLButtonElement {
  const btn = createChip('', { className: 'chip--icon', onClick: options.onClick, title: options.title || label, icon: symbol });
  btn.setAttribute('aria-label', label);
  btn.disabled = !!options.disabled;
  return btn;
}
