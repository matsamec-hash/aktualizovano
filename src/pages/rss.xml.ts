import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';
import { siteConfig } from '../../site.config';
import { getPublishedArticles } from '../lib/supabase';

export async function GET(context: APIContext) {
  const articles = await getPublishedArticles();
  const siteUrl = context.site?.toString() ?? `https://${siteConfig.domain}`;
  const categoryLabel = (slug: string | null) =>
    siteConfig.categories.find((c) => c.slug === slug)?.label ?? slug ?? '';

  return rss({
    title: siteConfig.name,
    description: siteConfig.tagline,
    site: siteUrl,
    items: articles
      .filter((a) => a.published_at)
      .slice(0, 50)
      .map((a) => ({
        title: a.title,
        pubDate: new Date(a.published_at as string),
        description: a.perex,
        link: `${siteUrl.replace(/\/$/, '')}/${a.slug}/`,
        categories: [categoryLabel(a.category), ...(a.tags ?? [])].filter(Boolean),
        content: sanitizeHtml(a.content, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h2', 'figure', 'figcaption']),
          allowedAttributes: { a: ['href'], img: ['src', 'alt'] },
          allowedSchemes: ['http', 'https', 'mailto'],
        }),
      })),
    customData: '<language>cs-CZ</language>',
  });
}
