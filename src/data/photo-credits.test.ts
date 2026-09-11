import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PHOTO_CREDITS } from "./photo-credits";
import soupis from "./photo-inventory.json";
import {
  articleCredits,
  coverCredits,
  creditFor,
  creditFromDb,
  isDocumentedCredit,
  isRealAuthorName,
  mayShowImage,
  normalizeImageKey,
  showableImage,
  stripUncreditedImages,
} from "../lib/photo-credits";

/**
 * Rohatka na práva k fotkám.
 *
 * 10. 9. 2026 přišla na svetovestadiony.cz advokátní výzva (2 169,95 EUR) za
 * fotku pod CC BY-SA, u které bylo uvedeno jen „Foto: Wikimedia Commons" —
 * tedy zdroj místo autora. Na aktualizovano.cz mělo 131 ze 142 článků jako
 * autora vyplněno doslova „archiv".
 *
 * ‼️ LIMIT smí jen KLESAT. Kdo ho zvedá, obchází pojistku.
 */

/**
 * Kolik obrázků ještě visí v článcích v CMS bez doloženého původu.
 *
 * Na web se nedostanou — `src/lib/supabase.ts` zahodí úvodní fotku bez
 * kreditu a `stripUncreditedImages` vyhodí obrázky z těla článku. Tohle číslo
 * měří úklid v CMS a klesne na nulu, až se ty řádky vyprázdní
 * (podklad: `docs/prava-k-fotkam.md`).
 */
const LIMIT_NEDOLOZENYCH_V_CMS = 237;

describe("tabulka kreditů", () => {
  it("každý kredit pojmenuje autora, licenci i odkaz na její znění", () => {
    const zaznamy = Object.entries(PHOTO_CREDITS);
    expect(zaznamy.length).toBeGreaterThan(50);
    for (const [url, c] of zaznamy) {
      expect(isRealAuthorName(c.author), url).toBe(true);
      expect(c.license, url).toBeTruthy();
      expect(c.licenseUrl, url).toMatch(/^https:\/\//);
      expect(c.sourceUrl, url).toMatch(/^https:\/\//);
    }
  });

  it("klíč je normalizovaná adresa, ne varianta šířky", () => {
    for (const url of Object.keys(PHOTO_CREDITS)) {
      expect(url, url).toBe(normalizeImageKey(url));
    }
  });
});

describe("rohatka", () => {
  it("počet fotek bez doloženého původu neroste", () => {
    const bez = Object.keys(soupis.bezKreditu);
    expect(bez.length).toBeLessThanOrEqual(LIMIT_NEDOLOZENYCH_V_CMS);
  });

  it("co soupis vede jako doložené, má kredit v tabulce", () => {
    for (const url of soupis.sKreditem) {
      expect(creditFor(url), url).toBeTruthy();
    }
  });

  it("ani jedna fotka bez doloženého původu neprojde na web", () => {
    for (const url of Object.keys(soupis.bezKreditu)) {
      expect(mayShowImage(url), url).toBe(false);
    }
  });
});

describe("co se počítá jako doložený kredit", () => {
  it('„archiv" a spol. nejsou jméno autora', () => {
    for (const vymluva of ["archiv", "Archiv", "redakce", "Wikimedia Commons", "own work", "unknown", "-", ""]) {
      expect(isRealAuthorName(vymluva), vymluva).toBe(false);
    }
    expect(isRealAuthorName("Jan Novák")).toBe(true);
  });

  it('kredit z CMS s „archiv" se zahazuje', () => {
    expect(
      isDocumentedCredit({ provider: "upload", photographer_name: "archiv", source_url: "" }),
    ).toBe(false);
    expect(creditFromDb({ provider: "upload", photographer_name: "archiv" })).toBeNull();
  });

  it("u Unsplash/Pexels stačí odkaz na originál, jméno licence nevyžaduje", () => {
    const c = creditFromDb({
      provider: "pexels",
      photographer_name: "Pexels",
      source_url: "https://www.pexels.com/photo/2166/",
    });
    expect(c).not.toBeNull();
    expect(c!.license).toBe("Pexels License");
    expect(c!.licenseUrl).toBe("https://www.pexels.com/license/");
  });

  it("kredit s pojmenovaným autorem projde i bez poskytovatele", () => {
    const c = creditFromDb({
      provider: "upload",
      photographer_name: "Jimmy Chan",
      source_url: "https://www.pexels.com/photo/2105927/",
    });
    expect(c!.author).toBe("Jimmy Chan");
  });
});

describe("normalizace adresy", () => {
  it("zahodí dotaz i sufix šířkové varianty", () => {
    expect(normalizeImageKey("https://cdn.x.cz/a__v-w1600.webp")).toBe("https://cdn.x.cz/a.webp");
    expect(normalizeImageKey("https://cdn.x.cz/a.jpg?auto=compress&w=940")).toBe("https://cdn.x.cz/a.jpg");
    expect(normalizeImageKey(null)).toBe("");
  });

  it("kredit najde i přes jinou šířkovou variantu téže fotky", () => {
    const [klic] = Object.keys(PHOTO_CREDITS).filter((u) => u.endsWith(".webp"));
    if (klic) {
      const varianta = klic.replace(/\.webp$/, "__v-w800.webp");
      expect(creditFor(varianta)).toEqual(PHOTO_CREDITS[klic]);
    }
  });
});

describe("vyhazování nedoložených obrázků z těla článku", () => {
  const doloz = Object.keys(PHOTO_CREDITS)[0]!;

  it("obrázek bez kreditu zmizí i s obalem, doložený zůstane", () => {
    const html =
      `<p>text</p>` +
      `<figure><img src="https://cdn.samecdigital.com/aktualizovano/2021/04/36848_099.jpg" alt=""><figcaption>x</figcaption></figure>` +
      `<img src="${doloz}" alt="ok">`;
    const { html: out, removed } = stripUncreditedImages(html);
    expect(removed).toEqual(["https://cdn.samecdigital.com/aktualizovano/2021/04/36848_099.jpg"]);
    expect(out).not.toContain("36848_099.jpg");
    expect(out).toContain(doloz);
    expect(out).toContain("<p>text</p>");
  });

  it("odkaz obalující jen nedoložený obrázek jde pryč celý", () => {
    const html = `<a href="/velka.jpg"><img src="https://cdn.samecdigital.com/nic.jpg"></a>`;
    const { html: out } = stripUncreditedImages(html);
    expect(out.trim()).toBe("");
  });

  it("po odebrání obrázku nezbude prázdný odstavec", () => {
    const html = `<p><img src="https://cdn.samecdigital.com/nic.jpg"></p><p>text</p>`;
    const { html: out } = stripUncreditedImages(html);
    expect(out).toBe("<p>text</p>");
  });

  it("hotlink na cizí server neprojde", () => {
    const html = `<img src="https://lh6.googleusercontent.com/abc">`;
    expect(stripUncreditedImages(html).html.trim()).toBe("");
  });

  // Promo znělka Discovery v <video> přežila první kolo úklidu a našla se
  // až v hotovém buildu — video ze souboru má stejná práva jako fotka.
  it("video ze souboru bez doložených práv jde pryč taky", () => {
    const html = `<video controls src="https://cdn.samecdigital.com/aktualizovano/2021/04/OG100-Awareness_sub_cz.mp4"></video>`;
    expect(stripUncreditedImages(html).html.trim()).toBe("");
  });

  it("vložené YouTube se netýká — je na serveru provozovatele", () => {
    const html = `<iframe src="https://www.youtube.com/embed/abc"></iframe>`;
    expect(stripUncreditedImages(html).html).toContain("youtube.com/embed/abc");
  });
});

/**
 * Tělo článku čte víc míst než jen šablona — RSS feed veze celý obsah
 * včetně `<img>` a čtečky ho rozšíří dál. Když někdo přidá další výstup
 * a zapomene na filtr, fotka bez práv vyteče ven a na stránce to nebude
 * vidět. Test hlídá, že každé místo, které sahá na `content`, jde přes
 * `stripUncreditedImages`.
 */
describe("kdo všechno sahá na tělo článku", () => {
  const KOREN = join(import.meta.dirname, "..");
  /**
   * Čtení, které obsah nevykresluje, a tak z něj nic vytéct nemůže:
   * odhad doby čtení z délky textu. Cokoli jiného musí projít filtrem.
   */
  const NEVYKRESLUJE = /\.content\?\.length\b/;

  function soubory(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return soubory(p);
      return /\.(astro|ts)$/.test(e.name) && !e.name.endsWith(".test.ts") ? [p] : [];
    });
  }

  it("každé čtení `.content` buď prochází filtrem, nebo je na výjimce", () => {
    const hrichy: string[] = [];
    for (const p of soubory(KOREN)) {
      const rel = p.slice(KOREN.length + 1);
      if (rel.startsWith("lib/photo-credits")) continue;
      const src = readFileSync(p, "utf8");
      const cte = [...src.matchAll(/^.*\b(?:a|art|article)\.content\b.*$/gm)].map((m) => m[0].trim());
      if (!cte.length) continue;
      const filtruje = src.includes("stripUncreditedImages");
      for (const radek of cte) {
        if (filtruje) continue;
        if (NEVYKRESLUJE.test(radek)) continue;
        hrichy.push(`${rel}: ${radek}`);
      }
    }
    expect(hrichy).toEqual([]);
  });
});

describe("blok Fotografie", () => {
  it("uvede kredit k úvodní fotce i k fotkám v textu, bez duplicit", () => {
    const [a, b] = Object.keys(PHOTO_CREDITS);
    const credits = articleCredits({
      featured_image_url: a,
      featured_image_credit: null,
      content: `<img src="${b}"><img src="${a}"><img src="https://cdn.samecdigital.com/nic.jpg">`,
    });
    expect(credits.length).toBe(2);
    expect(credits.map((c) => c.author)).toEqual([PHOTO_CREDITS[a!]!.author, PHOTO_CREDITS[b!]!.author]);
  });

  it("článek bez doložené fotky nemá co uvést", () => {
    expect(
      articleCredits({
        featured_image_url: "https://cdn.samecdigital.com/nic.jpg",
        featured_image_credit: { provider: "upload", photographer_name: "archiv" },
        content: "<p>text</p>",
      }),
    ).toEqual([]);
  });
});

/**
 * Karty ve výpisech (homepage, rubriky, „mohlo by vás zajímat").
 *
 * 11. 9. 2026 měla homepage 18 cover fotek a nula jmen autorů: kredit uměla
 * jen šablona detailu a karty sahaly na `featured_image_url` přímo. Fotka na
 * kartě je přitom stejné užití díla jako fotka v článku.
 */
describe("karty ve výpisech", () => {
  const doloz = Object.keys(PHOTO_CREDITS)[0]!;

  it("karta bez doloženého kreditu obrázek nevykreslí", () => {
    expect(
      showableImage({
        featured_image_url: "https://cdn.samecdigital.com/nic.jpg",
        featured_image_credit: null,
      }),
    ).toBeNull();
    // „archiv" v CMS není jméno — fotka se nesmí objevit ani na kartě.
    expect(
      showableImage({
        featured_image_url: "https://cdn.samecdigital.com/nic.jpg",
        featured_image_credit: { provider: "upload", photographer_name: "archiv" },
      }),
    ).toBeNull();
    expect(showableImage({ featured_image_url: null })).toBeNull();
    expect(showableImage(null)).toBeNull();
  });

  it("karta s doloženým kreditem obrázek vykreslí", () => {
    expect(showableImage({ featured_image_url: doloz, featured_image_credit: null })).toBe(doloz);
    expect(
      showableImage({
        featured_image_url: "https://cdn.samecdigital.com/nic.jpg",
        featured_image_credit: {
          provider: "pexels",
          photographer_name: "Jimmy Chan",
          source_url: "https://www.pexels.com/photo/2105927/",
        },
      }),
    ).toBe("https://cdn.samecdigital.com/nic.jpg");
  });

  it("blok Fotografie pod výpisem uvede každého autora jednou", () => {
    const [a, b] = Object.keys(PHOTO_CREDITS);
    const credits = coverCredits([
      { featured_image_url: a, featured_image_credit: null },
      { featured_image_url: b, featured_image_credit: null },
      { featured_image_url: a, featured_image_credit: null },
      { featured_image_url: "https://cdn.samecdigital.com/nic.jpg", featured_image_credit: null },
      null,
    ]);
    expect(credits.map((c) => c.author)).toEqual([
      PHOTO_CREDITS[a!]!.author,
      PHOTO_CREDITS[b!]!.author,
    ]);
  });

  it("každý kredit ve výpisu nese jméno, licenci i odkaz na její znění", () => {
    const credits = coverCredits(
      Object.keys(PHOTO_CREDITS).map((u) => ({ featured_image_url: u, featured_image_credit: null })),
    );
    expect(credits.length).toBeGreaterThan(0);
    for (const c of credits) {
      expect(isRealAuthorName(c.author)).toBe(true);
      expect(c.licenseUrl).toMatch(/^https:\/\//);
    }
  });
});

/**
 * Pojistka na vstupu nesmí zůstat rozkopírovaná „skoro všude".
 *
 * Šablona detailu fotku bez doloženého autora nepustí, ale karty ji braly
 * z `featured_image_url` napřímo — dokud data filtroval jen `src/lib/supabase.ts`,
 * stačil jeden nový zdroj dat a fotka bez práv byla na webu.
 */
describe("kdo sahá na úvodní fotku", () => {
  const KOREN = join(import.meta.dirname, "..");

  function soubory(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return soubory(p);
      return /\.(astro|ts)$/.test(e.name) && !e.name.endsWith(".test.ts") ? [p] : [];
    });
  }

  it("žádná šablona nepošle `featured_image_url` rovnou do <img>", () => {
    const hrichy: string[] = [];
    for (const p of soubory(KOREN)) {
      const rel = p.slice(KOREN.length + 1);
      const src = readFileSync(p, "utf8");
      // Značkovací část .astro souboru — nad `---` je jen TypeScript.
      const sablona = rel.endsWith(".astro") ? src.split(/^---$/m).slice(2).join("---") : "";
      if (!sablona) continue;
      for (const m of sablona.matchAll(/^.*src=\{[^}]*featured_image_url[^}]*\}.*$/gm)) {
        hrichy.push(`${rel}: ${m[0].trim()}`);
      }
    }
    expect(hrichy).toEqual([]);
  });

  it("každá stránka s kartami vykresluje blok Fotografie", () => {
    const KARTY = /\b(ArticleCard|CategoryBlock|RailStory|FloatingCard|HeroCarousel|RecentCarousel)\b/;
    const hrichy: string[] = [];
    for (const p of [...soubory(join(KOREN, "pages")), ...soubory(join(KOREN, "layouts"))]) {
      const src = readFileSync(p, "utf8");
      if (!KARTY.test(src)) continue;
      if (!src.includes("PhotoCredits")) hrichy.push(p.slice(KOREN.length + 1));
    }
    expect(hrichy).toEqual([]);
  });
});
