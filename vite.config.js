import { defineConfig } from 'vite';

export default defineConfig({
  base: '/language-vocab/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
