import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const SITE = 'https://aktualizovano.cz';
const SUPABASE_URL = 'https://obhypfuzmknvmknskdwh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaHlwZnV6bWtudm1rbnNrZHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjYyNDEsImV4cCI6MjA5MjIwMjI0MX0.rjcXZpE7Kqcbt6prqxT0UXFCnrDYAvlCldUwtKnX0to';
const SITE_ID = '63253275-f6ac-4c50-8755-c8d385b758ff';

// Build sitemap lastmod map z reálných dat článků (ne build-time new Date(),
// které Google časem ignoruje). lastmod = last_updated_at || published_at.
const lastmodByUrl = new Map();
const newestByCategory = new Map();
let siteNewest = null;
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?site_id=eq.${SITE_ID}&status=eq.published&select=slug,category,published_at,last_updated_at`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  if (res.ok) {
    for (const a of await res.json()) {
      const iso = a.last_updated_at || a.published_at;
      if (!iso || !a.slug) continue;
      lastmodByUrl.set(`${SITE}/${a.slug}/`, iso);
      if (!siteNewest || iso > siteNewest) siteNewest = iso;
      if (a.category) {
        const prev = newestByCategory.get(a.category);
        if (!prev || iso > prev) newestByCategory.set(a.category, iso);
      }
    }
  }
} catch {
  // Síťová chyba při buildu → sitemap prostě vynechá lastmod (lepší než fake datum).
}

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  image: {
    // Autorizace remote CDN, ze které build-time optimalizujeme obrázky (sharp).
    // CDN sám resize neumí → varianty generujeme lokálně do dist/_astro/.
    // Pexels: featured foto z auto-generace se ukládá jako přímá images.pexels.com URL
    // → build ji stáhne a zoptimalizuje lokálně (žádný SFTP/CDN upload z orchestrátoru).
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.samecdigital.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
  integrations: [
    sitemap({
      changefreq: 'daily',
      serialize(item) {
        const url = item.url;
        const catMatch = url.match(/\/kategorie\/([^/]+)\/$/);
        if (url === `${SITE}/`) {
          item.priority = 1.0;
          item.changefreq = 'daily';
          if (siteNewest) item.lastmod = siteNewest;
        } else if (catMatch) {
          item.priority = 0.9;
          item.changefreq = 'daily';
          const newest = newestByCategory.get(catMatch[1]);
          if (newest) item.lastmod = newest;
        } else if (/\/(zasady-ochrany|podminky|cookies|o-nas)/.test(url)) {
          item.priority = 0.3;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.7;
          item.changefreq = 'weekly';
          const lastmod = lastmodByUrl.get(url);
          if (lastmod) item.lastmod = lastmod;
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
