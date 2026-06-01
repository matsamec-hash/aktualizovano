import type { APIContext } from "astro";
import { siteConfig } from "../../site.config";
import { getPublishedArticles } from "../lib/supabase";

// Google News sitemap: jen články publikované za posledních 48 h
// (https://support.google.com/news/publisher-center/answer/9606710).
// Pozn.: dokud běží jen migrovaný (backdated) archiv, bude prázdný — aktivuje
// se sám, jakmile CMS cron přidá články s aktuálním published_at.
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(context: APIContext) {
  const articles = await getPublishedArticles();
  const siteUrl = (context.site?.toString() ?? `https://${siteConfig.domain}/`).replace(/\/$/, "");
  const now = Date.now();

  const fresh = articles.filter((a) => {
    if (!a.published_at) return false;
    const t = new Date(a.published_at).getTime();
    return Number.isFinite(t) && now - t <= NEWS_WINDOW_MS;
  });

  const urls = fresh
    .map((a) => {
      const loc = `${siteUrl}/${a.slug}/`;
      const pubDate = new Date(a.published_at as string).toISOString();
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(siteConfig.name)}</news:name>
        <news:language>cs</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
