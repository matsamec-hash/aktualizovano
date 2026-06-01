/**
 * Z holé YouTube/Vimeo URL vyrobí responzivní iframe.
 * Ošetří i poškozené YouTube ID, kde typografický processor převedl `x`
 * na `×` (znak násobení) — např. `...3×0Q` → `...3x0Q`. Vrací null, pokud
 * URL není podporované video.
 */
function urlToEmbed(rawUrl: string): string | null {
  const url = rawUrl.trim();
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w×-]{6,})/i,
  );
  if (yt) {
    const id = yt[1].replace(/×/g, "x");
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  const vimeo = url.match(/vimeo\.com\/(\d{6,})/i);
  if (vimeo) {
    return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" loading="lazy" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  return null;
}

/**
 * Převede holé YouTube/Vimeo URL na responzivní vložené video.
 * Pokrývá WordPress embed bloky (`<figure class="wp-block-embed">…`),
 * holé `<div class="wp-block-embed__wrapper">` i samostatné `<p>`.
 */
function embedVideos(html: string): string {
  // WordPress Gutenberg embed blok — zachová případný <figcaption>
  let out = html.replace(
    /<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>\s*<div[^>]*class="[^"]*wp-block-embed__wrapper[^"]*"[^>]*>\s*(?:<a[^>]*>)?\s*(https?:\/\/[^\s<]+)\s*(?:<\/a>)?\s*<\/div>\s*(<figcaption[^>]*>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi,
    (match, url: string, caption: string | undefined) => {
      const embed = urlToEmbed(url);
      return embed ? embed + (caption ? `\n<p class="video-caption">${caption.replace(/<\/?figcaption[^>]*>/gi, "")}</p>` : "") : match;
    },
  );

  // Samostatný odstavec jen s URL (příp. obalený <a>)
  out = out.replace(
    /<p[^>]*>\s*(?:<a[^>]*>)?\s*(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\/[^\s<]+)\s*(?:<\/a>)?\s*<\/p>/gi,
    (match, url: string) => urlToEmbed(url) ?? match,
  );

  return out;
}

export function preprocessContent(html: string): string {
  let out = embedVideos(html);

  out = out.replace(
    /<p(?![^>]*class=)>\s*(<strong>\s*\[OBR[ÁA]ZEK:[^<]*\]\s*<\/strong>)\s*<\/p>/gi,
    '<p class="image-placeholder">$1</p>',
  );

  out = out.replace(/<img\b([^>]*?)>/gi, (_match, attrs) => {
    const lower = attrs.toLowerCase();
    let next = attrs;
    if (!/\bloading\s*=/.test(lower)) next += ' loading="lazy"';
    if (!/\bdecoding\s*=/.test(lower)) next += ' decoding="async"';
    if (!/\bfetchpriority\s*=/.test(lower)) next += ' fetchpriority="low"';
    if (!/\bwidth\s*=/.test(lower)) next += ' width="1200"';
    if (!/\bheight\s*=/.test(lower)) next += ' height="675"';
    return `<img${next}>`;
  });

  return out;
}