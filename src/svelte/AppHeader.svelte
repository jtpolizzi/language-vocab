<script lang="ts">
  export let route: 'list' | 'cards' | 'match' | 'choice' = 'list';
</script>

<header class="app-header">
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
