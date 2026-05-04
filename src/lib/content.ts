export function preprocessContent(html: string): string {
  let out = html.replace(
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