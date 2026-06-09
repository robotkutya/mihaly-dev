import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.mihaly.dev',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  server: {
    port: 1337
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
