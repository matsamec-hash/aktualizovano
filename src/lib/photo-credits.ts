/**
 * Kdo fotku vyfotil, pod jakou licencí a kde leží originál.
 *
 * Proč to má vlastní modul: 10. 9. 2026 přišla advokátní výzva za fotku pod
 * CC BY-SA, u které bylo napsáno jen „Foto: Wikimedia Commons" — tedy zdroj
 * místo autora. Splněná atribuce je **jméno autora + název licence + odkaz na
 * licenci**. Rozhodnutí „je tenhle kredit dost?" proto nesmí být rozepsané
 * v každé šabloně zvlášť; testuje se tady na jednom místě.
 *
 * Na aktualizovano.cz mělo 131 ze 142 článků jako autora vyplněno doslova
 * „archiv". To není jméno, je to výmluva — a šablona to vypisovala na web
 * jako „Foto: archiv". Takové kredity se zahazují a fotka bez doloženého
 * původu jde z článku pryč.
 */
import { PHOTO_CREDITS } from "../data/photo-credits";

export interface PhotoCredit {
  /**
   * Jméno autora. U licencí, které autora nevyžadují (Unsplash, Pexels,
   * Pixabay), tu smí být jméno poskytovatele — u nich to je splněná atribuce.
   */
  author: string;
  /** Název licence, pod kterou fotku smíme použít. */
  license: string;
  /** Odkaz na plné znění licence. U CC je povinný. */
  licenseUrl: string;
  /** Odkaz na originál fotky u zdroje. */
  sourceUrl: string;
  /** Odkaz na profil autora, když ho zdroj nabízí. */
  authorUrl?: string;
  provider: "unsplash" | "pexels" | "pixabay" | "nasa" | "commons";
}

/** Kredit uložený v CMS u úvodní fotky (jsonb `articles.featured_image_credit`). */
export interface DbCredit {
  provider?: string | null;
  photographer_name?: string | null;
  photographer_url?: string | null;
  source_url?: string | null;
  license?: string | null;
  license_url?: string | null;
}

/**
 * Texty, které vypadají jako jméno autora, ale nikoho nepojmenovávají.
 * „archiv" je nejčastější, „Wikimedia Commons" je přesně ta vada,
 * za kterou přišla výzva.
 */
const NEJMENA = new Set([
  "archiv",
  "archive",
  "archiv redakce",
  "redakce",
  "wikimedia",
  "wikimedia commons",
  "commons",
  "wikipedia",
  "own work",
  "vlastní dílo",
  "vlastni dilo",
  "neznámý",
  "neznamy",
  "neznámý autor",
  "unknown",
  "unknown author",
  "anonymous",
  "hand-out",
  "handout",
  "n/a",
  "-",
  "",
]);

/** Poskytovatelé, u kterých licence jméno autora nevyžaduje. */
const BEZ_POVINNE_ATRIBUCE = new Set(["pexels", "unsplash", "pixabay", "ai"]);

/**
 * Jméno fotobanky není jméno fotografa. „Pexels" atribuci u téhle licence
 * sice splní, ale když máme dohledané jméno člověka, patří na web ono.
 */
export function jeJenPoskytovatel(name: unknown): boolean {
  const v = String(name ?? "").trim().toLowerCase();
  return BEZ_POVINNE_ATRIBUCE.has(v) || NEJMENA.has(v);
}

/** Je tenhle text jménem, nebo jen výmluvou? */
export function isRealAuthorName(name: unknown): boolean {
  const v = String(name ?? "").trim();
  if (v.length < 2) return false;
  return !NEJMENA.has(v.toLowerCase());
}

/**
 * Adresa téhož souboru se na webu vyskytuje v několika šířkách
 * (`…__v-w1600.webp`). Kredit patří fotce, ne variantě — klíč se proto
 * zbavuje sufixu varianty i dotazu za otazníkem.
 */
export function normalizeImageKey(url: string | null | undefined): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  const bezDotazu = raw.split(/[?#]/)[0]!;
  return bezDotazu.replace(/__v-w\d+(?=\.[a-z0-9]+$)/i, "");
}

/** Kredit k jedné adrese obrázku z tabulky dohledaných kreditů. */
export function creditFor(url: string | null | undefined): PhotoCredit | undefined {
  const key = normalizeImageKey(url);
  return key ? PHOTO_CREDITS[key] : undefined;
}

/**
 * Je kredit z CMS doložený natolik, že ho smíme vypsat?
 * Samotné „Foto: archiv" na webu nemá co dělat — čtenáři to neřekne nic
 * a autorovi to atribuci nesplní.
 */
export function isDocumentedCredit(c: DbCredit | null | undefined): boolean {
  if (!c) return false;
  const provider = String(c.provider ?? "").trim().toLowerCase();
  if (isRealAuthorName(c.photographer_name)) return true;
  // Unsplash/Pexels/Pixabay atribuci nevyžadují — stačí odkaz na originál.
  return BEZ_POVINNE_ATRIBUCE.has(provider) && Boolean(c.source_url);
}

/** Kredit z CMS převedený na společný tvar; null, když není doložený. */
export function creditFromDb(c: DbCredit | null | undefined): PhotoCredit | null {
  if (!isDocumentedCredit(c)) return null;
  const provider = String(c!.provider ?? "").trim().toLowerCase();
  const jmeno = isRealAuthorName(c!.photographer_name)
    ? String(c!.photographer_name).trim()
    : POSKYTOVATELE[provider]?.author ?? provider;
  return {
    author: jmeno,
    license: c!.license?.trim() || POSKYTOVATELE[provider]?.license || "",
    licenseUrl: c!.license_url?.trim() || POSKYTOVATELE[provider]?.licenseUrl || "",
    sourceUrl: c!.source_url?.trim() || "",
    authorUrl: c!.photographer_url?.trim() || undefined,
    provider: (POSKYTOVATELE[provider]?.provider ?? "commons") as PhotoCredit["provider"],
  };
}

/** Licenční podmínky poskytovatelů, u kterých je známe napevno. */
export const POSKYTOVATELE: Record<
  string,
  { author: string; license: string; licenseUrl: string; provider: PhotoCredit["provider"] }
> = {
  unsplash: {
    author: "Unsplash",
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    provider: "unsplash",
  },
  pexels: {
    author: "Pexels",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
    provider: "pexels",
  },
  pixabay: {
    author: "Pixabay",
    license: "Pixabay Content License",
    licenseUrl: "https://pixabay.com/service/license-summary/",
    provider: "pixabay",
  },
  nasa: {
    author: "NASA/JPL-Caltech",
    license: "Public domain (NASA)",
    licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    provider: "nasa",
  },
};

/**
 * Smí tahle fotka na web?
 *
 * Jediné kritérium: umíme u ní doložit autora, licenci a odkaz na originál.
 * Kredit z CMS má přednost (redaktor ho mohl doplnit ručně), jinak se hledá
 * v tabulce dohledaných kreditů v repu.
 */
export function mayShowImage(
  url: string | null | undefined,
  dbCredit?: DbCredit | null,
): boolean {
  if (!url) return false;
  return Boolean(creditFromDb(dbCredit) ?? creditFor(url));
}

/** Minimum, které o článku potřebuje karta ve výpisu. */
export interface CoverSource {
  featured_image_url?: string | null;
  featured_image_credit?: DbCredit | null;
}

/**
 * Adresa úvodní fotky, kterou smíme vykreslit — jinak null.
 *
 * Karty ve výpisech (homepage, rubriky, „mohlo by vás zajímat") sahaly na
 * `featured_image_url` přímo, takže pojistka držela jen na jednom místě
 * (`src/lib/supabase.ts`). Kdo přidá další zdroj dat, obejde ji. Tenhle
 * pomocník je poslední brána před `<img>`: bez doloženého kreditu vrátí null
 * a karta vykreslí prázdné místo místo obrázku.
 */
export function showableImage(a: CoverSource | null | undefined): string | null {
  const url = a?.featured_image_url ?? null;
  if (!url) return null;
  return mayShowImage(url, a?.featured_image_credit) ? url : null;
}

/**
 * Kredit k úvodní fotce — z CMS, jinak z tabulky dohledaných kreditů.
 *
 * ‼️ Vyhrává ten, kdo skutečně pojmenuje autora. CMS u fotek z fotobank často
 * drží jen `provider` bez jména fotografa, takže by z něj vypadlo „Pexels" —
 * a jméno „Gustavo Fring", které máme dohledané v `PHOTO_CREDITS`, by se na
 * web nikdy nedostalo. Pexels atribuci sice nevyžaduje, ale uvést fotobanku
 * místo člověka je přesně ta vada, za kterou přišla výzva PhotoClaim.
 */
export function coverCredit(a: CoverSource | null | undefined): PhotoCredit | null {
  if (!showableImage(a)) return null;
  const zDb = creditFromDb(a!.featured_image_credit);
  const zRegistru = creditFor(a!.featured_image_url) ?? null;
  if (zDb && jeJenPoskytovatel(zDb.author) && zRegistru && !jeJenPoskytovatel(zRegistru.author)) {
    return zRegistru;
  }
  return zDb ?? zRegistru;
}

/** Sběrač kreditů bez duplicit — tentýž autor + licence + zdroj se vypíše jednou. */
function sberacKreditu() {
  const out: PhotoCredit[] = [];
  const videno = new Set<string>();
  return {
    pridej(c: PhotoCredit | null | undefined) {
      if (!c) return;
      const klic = `${c.author}|${c.license}|${c.sourceUrl}`;
      if (videno.has(klic)) return;
      videno.add(klic);
      out.push(c);
    },
    hotovo: () => out,
  };
}

/**
 * Kredity k úvodním fotkám celého výpisu — homepage, rubrika, „mohlo by vás
 * zajímat" — bez duplicit.
 *
 * Fotka na kartě je stejné užití díla jako fotka v článku. 11. 9. 2026 bylo
 * na homepage 18 fotek a nula kreditů, protože kredit uměla jen šablona
 * detailu.
 */
export function coverCredits(
  articles: (CoverSource | null | undefined)[] | null | undefined,
): PhotoCredit[] {
  const s = sberacKreditu();
  for (const a of articles ?? []) s.pridej(coverCredit(a));
  return s.hotovo();
}

/**
 * Vyhodí z těla článku každý `<img>`, u kterého neumíme doložit původ,
 * i s obalem (`<figure>`, odkaz na plnou velikost, prázdný odstavec).
 *
 * Proč to nestačí opravit v databázi: fotku tam může kdykoli vrátit redaktor
 * přes CMS. Tenhle filtr je poslední brána před vykreslením, takže
 * nedoložená fotka se na web nedostane, ani když se do CMS vrátí.
 */
export function stripUncreditedImages(html: string | null | undefined): {
  html: string;
  removed: string[];
} {
  const vstup = String(html ?? "");
  if (!vstup) return { html: "", removed: [] };
  const removed: string[] = [];

  const zahod = (cely: string, src: string) => {
    if (mayShowImage(src)) return cely;
    removed.push(src);
    return "";
  };

  let out = vstup;
  // <figure>…<img>…</figure> — i s popiskem, ať po fotce nezůstane sirotčí text.
  out = out.replace(
    /<figure\b[^>]*>[\s\S]*?<\/figure>/gi,
    (blok) => {
      const m = /<img[^>]+src=["']([^"']+)["']/i.exec(blok);
      return m ? zahod(blok, m[1]!) : blok;
    },
  );
  // Odkaz obalující jen obrázek (WordPress „klikni pro plnou velikost").
  out = out.replace(
    /<a\b[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/a>/gi,
    (cely, src: string) => zahod(cely, src),
  );
  // Holý <img>.
  out = out.replace(
    /<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi,
    (cely, src: string) => zahod(cely, src),
  );
  // Vlastní video souboru na CDN. Platí pro něj totéž co pro fotku —
  // v článku o Eurosportu takhle zůstala viset promo znělka Discovery.
  // (Vložená YouTube/Vimeo videa přes <iframe> se netýkají, ta jsou na
  // serveru provozovatele a řídí se jeho podmínkami vkládání.)
  out = out.replace(
    /<video\b[^>]*>[\s\S]*?<\/video>|<video\b[^>]*\/?>/gi,
    (blok) => {
      const m = /src=["']([^"']+)["']/i.exec(blok);
      return m ? zahod(blok, m[1]!) : blok;
    },
  );
  // Odstavce, ze kterých po odebrání obrázku zbyla prázdná skořápka.
  out = out.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");

  return { html: out, removed };
}

/**
 * Adresy všech vlastních médií v těle článku (obrázky i videa ze souboru),
 * v pořadí výskytu a bez duplicit.
 */
export function inlineImageUrls(html: string | null | undefined): string[] {
  const out: string[] = [];
  const videno = new Set<string>();
  for (const m of String(html ?? "").matchAll(
    /<(?:img|video|source)[^>]+src=["']([^"']+)["']/gi,
  )) {
    const u = m[1]!;
    if (!videno.has(u)) {
      videno.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Kredity ke všem fotkám článku — úvodní i těm v textu — bez duplicit.
 * Úvodní fotka má přednost kreditu z CMS; fotky v textu žádné pole v CMS
 * nemají, ty se dohledávají v tabulce kreditů v repu.
 */
export function articleCredits(article: {
  featured_image_url?: string | null;
  featured_image_credit?: DbCredit | null;
  content?: string | null;
}): PhotoCredit[] {
  // Obsah se sem dává syrový: obrázek bez kreditu do seznamu stejně nepřibude
  // a zároveň se ze stránky vyhazuje týmž pravidlem (stripUncreditedImages),
  // takže seznam sedí s tím, co je vidět.
  const s = sberacKreditu();
  s.pridej(coverCredit(article));
  for (const u of inlineImageUrls(article.content)) s.pridej(creditFor(u));
  return s.hotovo();
}
