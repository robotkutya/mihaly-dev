import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.mihaly.dev',
  integrations: [mdx(), sitemap()],
  server: {
    port: 1337
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
