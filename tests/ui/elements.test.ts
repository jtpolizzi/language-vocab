import { describe, it, expect } from 'vitest';
import { createChip, createIconChip } from '../../assets/components/ui/elements.ts';
import { createPopover } from '../../assets/components/ui/popover.ts';

describe('ui/elements helpers', () => {
  it('creates a chip with label and pressed state', () => {
    const onClick = vi.fn();
    const chip = createChip('Test', { pressed: true, onClick });
    expect(chip.className).toContain('chip');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    chip.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('creates an icon chip with accessible label', () => {
    const chip = createIconChip('⚙︎', 'Settings');
    expect(chip.className).toContain('chip--icon');
    expect(chip.getAttribute('aria-label')).toBe('Settings');
    expect(chip.textContent?.includes('⚙︎')).toBe(true);
  });

  it('creates a popover that stops propagation', () => {
    const pop = createPopover();
    const handler = vi.fn();
    const evt = new Event('click', { bubbles: true });
    pop.addEventListener('click', handler);
    pop.dispatchEvent(evt);
    expect(handler).toHaveBeenCalled();
  });
});
