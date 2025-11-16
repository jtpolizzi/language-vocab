// assets/components/ui/popover.ts

interface PopoverOptions {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}

const BASE_POPOVER_STYLE: Partial<CSSStyleDeclaration> = {
  border: '1px solid var(--line)',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  marginTop: '12px',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  background: '#11172b'
};

export function createPopover({ className = 'popover', style = {} }: PopoverOptions = {}): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  Object.assign(el.style, BASE_POPOVER_STYLE, style);
  el.addEventListener('click', (e) => e.stopPropagation());
  return el;
}
