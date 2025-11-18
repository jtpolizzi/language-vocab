<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let route: 'list' | 'cards' | 'match' | 'choice' = 'list';

  let headerEl: HTMLElement | null = null;
  let headerObserver: ResizeObserver | null = null;

  onMount(() => {
    updateHeaderHeight();
    if (typeof ResizeObserver === 'undefined' || !headerEl) return;
    headerObserver = new ResizeObserver(() => updateHeaderHeight());
    headerObserver.observe(headerEl);
  });

  onDestroy(() => {
    headerObserver?.disconnect();
    headerObserver = null;
  });

  function updateHeaderHeight() {
    if (typeof document === 'undefined') return;
    const height = headerEl?.getBoundingClientRect().height ?? 0;
    document.documentElement.style.setProperty('--app-header-height', `${height}px`);
  }
</script>

<header class="app-header" bind:this={headerEl}>
  <h1>Vocab Mini‑App v2.15.1</h1>
  <nav>
    <a href="#/list" class:active={route === 'list'} aria-current={route === 'list' ? 'page' : undefined}>
      Word List
    </a>
    <a href="#/cards" class:active={route === 'cards'} aria-current={route === 'cards' ? 'page' : undefined}>
      Flashcards
    </a>
    <a href="#/match" class:active={route === 'match'} aria-current={route === 'match' ? 'page' : undefined}>
      Word Match
    </a>
    <a href="#/choice" class:active={route === 'choice'} aria-current={route === 'choice' ? 'page' : undefined}>
      Multiple Choice
    </a>
  </nav>
</header>
