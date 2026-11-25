/**
 * Značka pro měření návštěvnosti — vlastní Umami na `analytika.samecdigital.com`.
 *
 * ‼️ Proč vedle Google Analytics: GA4 se tu spouští až po souhlasu v liště
 *   (`CookieConsent.astro`). Návštěvník, který lištu odmítne nebo ignoruje, je
 *   pro GA neviditelný, takže čísla v přehledech jsou zlomek skutečnosti.
 *   Umami nepoužívá cookies ani úložiště prohlížeče a IP adresu neukládá,
 *   souhlas tedy nepotřebuje a měří všechny.
 *
 * ‼️ Tahle značka NESMÍ sahat do cookies ani localStorage. Kdyby začala,
 *   musí se přesunout za souhlas v liště a změnit zásady.
 *
 * ‼️ Umami zahazuje headless prohlížeče (odpoví `{"beep":"boop"}`), takže se
 *   zápis neověří Playwrightem — jen ručním `POST /api/send` s běžnou
 *   hlavičkou UA. Skutečný zápis poznáš podle odpovědi s `{"cache": "…"}`.
 *
 * Text značky je tady, a ne přímo v layoutu, aby na něj dosáhly testy.
 */

export const UMAMI_SKRIPT = 'https://analytika.samecdigital.com/script.js';

/** Není tajné — v HTML je stejně vidět a slouží jen k rozlišení webu. */
export const UMAMI_WEB_ID = '6e84d338-14d1-4eb9-96c8-a86b8999e2ad';

/** Měří se jen na ostré doméně — lokální vývoj a preview do statistik nepatří. */
export const UMAMI_DOMENY = 'aktualizovano.cz,www.aktualizovano.cz';

/** Načítá se až po `load`, ať nesoutěží o pásmo s obsahem stránky. */
export const UMAMI_ZNACKA = [
  'addEventListener("load",function(){',
  'var s=document.createElement("script");',
  's.defer=true;',
  `s.src="${UMAMI_SKRIPT}";`,
  `s.dataset.websiteId="${UMAMI_WEB_ID}";`,
  `s.dataset.domains="${UMAMI_DOMENY}";`,
  'document.head.appendChild(s)})',
].join('');
