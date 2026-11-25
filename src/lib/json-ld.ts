// JSON do <script type="application/ld+json" set:html=...>. Samotné JSON.stringify nechá `</script>`
// v textu (titulek článku, popis z CMS) ukončit skript a vložit vlastní HTML (uložené XSS).
// `<` zapsané jako unicode escape (u003c) je v JSON platné a vyhledávače ho čtou stejně.
const LS = new RegExp('\\u2028', 'g');
const PS = new RegExp('\\u2029', 'g');

export function safeJsonLd(value: unknown, replacer?: any, space?: string | number): string {
  return (JSON.stringify(value, replacer, space) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029');
}
