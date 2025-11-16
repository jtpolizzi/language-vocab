<script lang="ts">
  import { wordListStore } from './stateBridge';

  export let title = 'Word List Prototype';
  const wordState = wordListStore;
</script>

<section class="svelte-wordlist-proto">
  <header>
    <h2>{title}</h2>
    <p>This route hosts the new Svelte version of the Word List view.</p>
    <p>Current filtered count: {$wordState.totalFiltered}</p>
  </header>

  <div class="placeholder">
    <p>Prototype coming soon. Existing vanilla view remains available under <code>#/list</code>.</p>
  </div>
</section>

<style>
  .svelte-wordlist-proto {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .svelte-wordlist-proto h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .placeholder {
    border: 1px dashed var(--border-color, #ccc);
    border-radius: 12px;
    padding: 24px;
    background: rgba(255, 255, 255, 0.05);
  }
</style>
