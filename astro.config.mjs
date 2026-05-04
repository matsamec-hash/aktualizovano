import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://aktualizovano.cz',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      changefreq: 'daily',
      lastmod: new Date(),
      serialize(item) {
        const url = item.url;
        if (url === 'https://aktualizovano.cz/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (/\/kategorie\/[^/]+\/$/.test(url)) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        } else if (/\/(zasady-ochrany|podminky|cookies|o-nas)/.test(url)) {
          item.priority = 0.3;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.7;
          item.changefreq = 'weekly';
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});