import { mount, unmount } from 'svelte';
import WordMatch from './WordMatch.svelte';

export function mountSvelteWordMatch(container: HTMLElement) {
  container.innerHTML = '';
  const instance = mount(WordMatch, {
    target: container
  });
  return () => {
    void unmount(instance);
  };
}
