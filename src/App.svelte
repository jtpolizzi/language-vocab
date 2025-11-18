<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import TopBar from './svelte/TopBar.svelte';
  import WordListPrototype from './svelte/WordListPrototype.svelte';
  import Flashcards from './svelte/Flashcards.svelte';
  import WordMatch from './svelte/WordMatch.svelte';
  import MultipleChoice from './svelte/MultipleChoice.svelte';
  import { openSettingsModal, openSettingsRouteIfNeeded } from './svelte/openSettingsModal.ts';
  import {
    State,
    subscribe,
    hydrateWords,
    setLoaderStatus,
    on as onStateEvent
  } from '../assets/state.ts';
  import { loadWords, onDataEvent } from '../assets/data/loader.ts';

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

  $: syncActiveNav(currentHash);
  $: syncWordListBody(route);

  onMount(() => {
    if (typeof window === 'undefined') return;

    offStateSubscription = subscribe(() => {
      hasWords = Array.isArray(State.words) && State.words.length > 0;
    });

    window.addEventListener('hashchange', handleHashChange);
    openSettingsRouteIfNeeded(currentHash);
    loadData();

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

  function syncActiveNav(hash: string) {
    if (typeof document === 'undefined') return;
    setActiveNav(hash || '#/list');
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

  function setActiveNav(hash: string) {
    const links = document.querySelectorAll('.app-header nav a');
    links.forEach((link) => {
      const target = link.getAttribute('href') || '';
      const isActive = target && hash.startsWith(target);
      link.classList.toggle('active', !!isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
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
      const counts = debug.eventCounts;
      const entries = Array.from(counts.entries());
      entries.sort((a, b) => b[1] - a[1]);
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

  function parseTSV(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split('\t').map((h) => h.trim());
    const idx = {
      word: headers.findIndex((h) => /^(word|spanish)$/i.test(h)),
      definition: headers.findIndex((h) => /^(definition|english)$/i.test(h)),
      POS: headers.findIndex((h) => /^pos$/i.test(h)),
      CEFR: headers.findIndex((h) => /^cefr$/i.test(h)),
      Tags: headers.findIndex((h) => /^tags?$/i.test(h))
    };
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.every((c) => !c || !c.trim())) continue;
      out.push({
        word: (idx.word >= 0 ? cols[idx.word] : '').trim(),
        definition: (idx.definition >= 0 ? cols[idx.definition] : '').trim(),
        POS: (idx.POS >= 0 ? cols[idx.POS] : '').trim(),
        CEFR: (idx.CEFR >= 0 ? cols[idx.CEFR] : '').trim(),
        Tags: (idx.Tags >= 0 ? cols[idx.Tags] : '').trim()
      });
    }
    return out;
  }

  async function loadData() {
    const offLoading = onDataEvent('loading', () => {
      setLoaderStatus('loading');
      loaderMessage = 'Loading words...';
    });
    const offLoaded = onDataEvent('loaded', ({ text }) => {
      const raw = parseTSV(text);
      setLoaderStatus('loaded');
      loaderMessage = `Loaded ${raw.length} words.`;
      hydrateWords(raw || [], {
        source: 'tsv',
        loadedAt: Date.now(),
        loaderStatus: 'loaded'
      });
    });
    const offError = onDataEvent('error', () => {
      setLoaderStatus('error');
      loaderMessage = 'Failed to load words. Check console for details.';
      hydrateWords([], {
        source: 'none',
        loadedAt: Date.now(),
        loaderStatus: 'error'
      });
    });

    try {
      await loadWords({ url: WORDS_URL });
    } finally {
      offLoading();
      offLoaded();
      offError();
    }
  }
</script>

<div id="topbar">
  <TopBar />
</div>

<section id="view">
  {#if hasWords}
    {#if route === 'list'}
      <WordListPrototype />
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
