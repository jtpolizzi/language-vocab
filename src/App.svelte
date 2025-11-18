<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import TopBar from './svelte/TopBar.svelte';
  import WordList from './svelte/WordList.svelte';
  import Flashcards from './svelte/Flashcards.svelte';
  import WordMatch from './svelte/WordMatch.svelte';
  import MultipleChoice from './svelte/MultipleChoice.svelte';
  import AppHeader from './svelte/AppHeader.svelte';
  import { openSettingsModal, openSettingsRouteIfNeeded } from './svelte/openSettingsModal.ts';
  import { State, subscribe, onStateEvent } from './state';
  import { startWordsLoader } from './data/words.ts';

  type Route = 'list' | 'cards' | 'match' | 'choice';

  const WORDS_URL = `${import.meta.env.BASE_URL}data/words.tsv`;

  let currentHash = typeof window !== 'undefined' && window.location.hash ? window.location.hash : '#/list';
  let route: Route = resolveRoute(currentHash);
  let hasWords = Array.isArray(State.words) && State.words.length > 0;
  let loaderMessage = 'Loading words...';

  let cleanupDebugPanel: () => void = () => {};
  let offDebugToggle: (() => void) | null = null;
  let offStateSubscription: (() => void) | null = null;
  let pagehideHandler: (() => void) | null = null;

  $: syncWordListBody(route);

  onMount(() => {
    if (typeof window === 'undefined') return;

    offStateSubscription = subscribe(() => {
      hasWords = Array.isArray(State.words) && State.words.length > 0;
    });

    window.addEventListener('hashchange', handleHashChange);
    openSettingsRouteIfNeeded(currentHash);
    void startWordsLoader({
      url: WORDS_URL,
      onUpdate: ({ message }) => {
        loaderMessage = message;
      }
    });

    cleanupDebugPanel = mountDebugPanel();
    offDebugToggle = onStateEvent('uiChanged', () => {
      cleanupDebugPanel();
      cleanupDebugPanel = mountDebugPanel();
    });
    pagehideHandler = () => {
      offDebugToggle?.();
      offDebugToggle = null;
    };
    window.addEventListener('pagehide', pagehideHandler);
  });

  onDestroy(() => {
    if (typeof window === 'undefined') return;
    offStateSubscription?.();
    offStateSubscription = null;
    window.removeEventListener('hashchange', handleHashChange);
    if (pagehideHandler) {
      window.removeEventListener('pagehide', pagehideHandler);
      pagehideHandler = null;
    }
    cleanupDebugPanel();
    offDebugToggle?.();
    offDebugToggle = null;
    document.body.classList.remove('wordlist-lock');
  });

  function handleHashChange() {
    currentHash = window.location.hash || '#/list';
    route = resolveRoute(currentHash);
    openSettingsRouteIfNeeded(currentHash);
  }

  function syncWordListBody(currentRoute: Route) {
    if (typeof document === 'undefined') return;
    if (currentRoute === 'list') {
      document.querySelectorAll('.bottombar').forEach((el) => el.remove());
      document.body.classList.remove('pad-bottom');
      document.body.classList.add('wordlist-lock');
    } else {
      document.body.classList.remove('wordlist-lock');
    }
  }

  function resolveRoute(hash: string): Route {
    const normalized = (hash || '#/list').toLowerCase();
    if (normalized.startsWith('#/cards')) return 'cards';
    if (normalized.startsWith('#/match')) return 'match';
    if (normalized.startsWith('#/choice')) return 'choice';
    return 'list';
  }

  function mountDebugPanel() {
    const debug = (window as typeof window & { __LV_DEBUG__?: any }).__LV_DEBUG__;
    if (!debug || !State.ui?.debugPanel) return () => {};
    const panel = document.createElement('div');
    panel.className = 'debug-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '12px',
      right: '12px',
      background: 'rgba(0,0,0,0.75)',
      color: '#fff',
      fontSize: '12px',
      padding: '8px 12px',
      borderRadius: '8px',
      zIndex: '4000',
      lineHeight: '1.4',
      maxWidth: '240px'
    });

    const statusLine = document.createElement('div');
    const eventsLine = document.createElement('div');
    panel.append(statusLine, eventsLine);
    document.body.appendChild(panel);

    const refresh = () => {
      const meta = debug.State.meta || {};
      const counts: Map<string, number> =
        debug.eventCounts instanceof Map ? debug.eventCounts : new Map<string, number>();
      const entries: Array<[string, number]> = Array.from(counts.entries());
      entries.sort(([, aVal], [, bVal]) => bVal - aVal);
      statusLine.textContent = `Loader: ${meta.loaderStatus || 'idle'} • Source: ${meta.wordsSource || 'n/a'}`;
      const eventsText = entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(', ') : 'none';
      eventsLine.textContent = `Events: ${eventsText}`;
    };
    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      clearInterval(interval);
      panel.remove();
    };
  }

</script>

<div class="stacked-header">
  <AppHeader {route} />
  <div id="topbar">
    <TopBar />
  </div>
</div>

<section id="view">
  {#if hasWords}
    {#if route === 'list'}
      <WordList />
    {:else if route === 'cards'}
      <Flashcards />
    {:else if route === 'match'}
      <WordMatch />
    {:else if route === 'choice'}
      <MultipleChoice />
    {/if}
  {:else}
    <div class="loader-status">{loaderMessage}</div>
  {/if}
</section>

<style>
  .stacked-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .stacked-header :global(.app-header) {
    position: relative;
    z-index: 2;
  }

  .stacked-header #topbar {
    position: relative;
    z-index: 1;
  }
</style>
