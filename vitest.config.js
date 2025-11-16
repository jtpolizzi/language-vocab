import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser', 'module', 'import']
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: []
  }
});
