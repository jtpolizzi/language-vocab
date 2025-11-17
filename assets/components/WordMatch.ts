import { mountSvelteWordMatch } from '../../src/svelte/mountWordMatch.ts';

type Destroyable = { destroy: () => void };

export function mountWordMatch(container: HTMLElement): Destroyable {
  const teardown = mountSvelteWordMatch(container);
  return {
    destroy() {
      teardown();
    }
  };
}
