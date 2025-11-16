import { mount, unmount } from 'svelte';
import WordListPrototype from './WordListPrototype.svelte';

export function mountSvelteWordList(container: HTMLElement) {
  container.innerHTML = '';

  document.querySelectorAll('.bottombar').forEach((el) => el.remove());
  document.body.classList.remove('pad-bottom');
  document.body.classList.add('wordlist-lock');

  const instance = mount(WordListPrototype, {
    target: container
  });

  return () => {
    void unmount(instance);
    document.body.classList.remove('wordlist-lock');
  };
}
