import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        analytics: 'analytics.html',
        data: 'data.html',
        blog: 'blog.html'
      }
    }
  }
});
