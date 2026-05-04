# Aktualizováno (frontend)

Astro static site pro **aktualizovano.cz** — multi-niche CZ magazín. Fetchuje články z central CMS (`obhypfuzmknvmknskdwh.supabase.co`, site_id `63253275-f6ac-4c50-8755-c8d385b758ff`), buildí static HTML, deployuje přes GH Actions FTPS na Hostinger.

## Stack

- Astro 6.x (static, trailingSlash: 'always')
- Tailwind v4 (Vite plugin)
- @supabase/supabase-js (anon key, RLS-protected)
- @astrojs/sitemap
- sanitize-html

## Brand

**Placeholder** — Direction A (Editorial Modern) z `~/aktualizovano-brainstorm/docs/superpowers/specs/2026-05-04-phase-1c-brand-exploration.md`. Swap přes:

- `site.config.ts` → `colors` block
- `src/styles/global.css` → `:root` CSS custom properties + `@import` font URL
- `public/favicon.svg` → finální logo

Nic není hard-coded ve šablonách (vše via CSS vars).

## Lokální vývoj

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # astro check
npm run build    # static dist/
npm run preview  # preview built site
```

## Deploy

Auto-deploy z `master` branch + daily 7:30 UTC cron. Vyžaduje GH Actions secrets:

- `FTP_HOST` — Hostinger FTP host
- `FTP_USER` — FTP uživatel
- `FTP_PASSWORD` — FTP heslo

Setup po `gh repo create matsamec-hash/aktualizovano --public --source .`:

```bash
gh secret set FTP_HOST --body "..."
gh secret set FTP_USER --body "..."
gh secret set FTP_PASSWORD --body "..."
git push -u origin master
```

## Struktura

```
src/
├── components/   Header, Footer, ArticleCard, HeroArticle, SEOHead, Newsletter, CookieConsent
├── layouts/      Base.astro, Article.astro
├── lib/          supabase.ts, content.ts, auto-linker.ts, types.ts
├── pages/        index, [slug], kategorie/[cat], 404, o-nas, cookies, zasady-ochrany, podminky
└── styles/       global.css (Tailwind import + brand vars)
```

## Phase 1D status

- [x] Astro repo skeleton + Tailwind v4
- [x] Site config + categories
- [x] Base components + layouts (brand-agnostic via CSS vars)
- [x] Pages: index, article detail, category hub, 404, legal stubs
- [x] robots.txt + llms.txt + favicon placeholder
- [x] GH Actions deploy workflow (FTPS)
- [ ] Phase 1C brand pick → swap CSS vars + logo
- [ ] GH repo create + Hostinger FTP secrets (manual user action)
- [ ] Phase 2: Pagefind search index, RSS feed, AdSense slots
- [ ] Phase 3: WP migration script
- [ ] Phase 4: Cloudflare DNS cutover, GSC submit, AdSense review

## Tested

- `npm install` ✓
- `npm run build` ✓ — buildí prázdné kategorie+homepage (no published articles yet)

Nepřesouvejte produkce před Phase 4 launch checklist.
