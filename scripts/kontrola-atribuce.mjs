// Hlídka atribuce: projde vyrenderovaný web (dist/**/*.html) a ohlásí každou
// stránku, která ukazuje fotku, aniž by na TÉŽE stránce stálo jméno jejího
// autora. CC BY / CC BY-SA to vyžadují — odkaz na zdroj ani „Wikimedia
// Commons" atribuci nesplní.
//
// Proč nad HTML a ne nad daty: `npm test` hlídá, že každá použitá fotka MÁ
// kredit v registru. Tenhle skript hlídá o krok dál — že se ten kredit taky
// VYKRESLÍ. Přesně tahle díra způsobila, že kredity „byly hotové", a na
// homepage nebyl ani jeden: kredit uměla jen šablona detailu, kdežto karty
// ve výpisech braly `featured_image_url` přímo.
//
//   npm run build && npm run kontrola-atribuce
//
// Volitelný argument = jiná složka s výstupem (`npm run kontrola-atribuce -- dist-2`).
// Konec 0 = čisté, 1 = některá stránka atribuci nemá, 2 = není co kontrolovat.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, process.argv[2] ?? "dist");
if (!existsSync(DIST)) {
  console.error(`${DIST} neexistuje — nejdřív \`npm run build\`.`);
  process.exit(2);
}

const CREDITS = JSON.parse(readFileSync(join(ROOT, "src/data/photo-credits.json"), "utf8"));

/**
 * Táž fotka se na webu vyskytuje v několika šířkách (`…__v-w1600.webp`)
 * a s dotazem za otazníkem. Stejná normalizace jako `normalizeImageKey`
 * v src/lib/photo-credits.ts — kredit patří fotce, ne variantě.
 */
const normalizeImageKey = (url) => {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  const bezDotazu = raw.split(/[?#]/)[0];
  return bezDotazu.replace(/__v-w\d+(?=\.[a-z0-9]+$)/i, "");
};

/**
 * Astro při buildu obrázek přegeneruje do `/_astro/<jméno>_<hash>.webp`
 * (jiný hash pro každou šířku v srcsetu) — původní adresa v HTML nezbude,
 * zůstane jen jméno souboru. Klíč = jméno bez přípony, bez Astro hashe
 * a bez sufixu šířkové varianty.
 */
const basenameKey = (nazevSouboru) =>
  nazevSouboru
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_[A-Za-z0-9]{4,10}$/, "")
    .replace(/__v-w\d+$/i, "");

const podleUrl = new Map();
const podleJmena = new Map();
const kolizeJmen = new Set();
for (const [url, credit] of Object.entries(CREDITS)) {
  podleUrl.set(normalizeImageKey(url), credit);
  const jmeno = basenameKey(normalizeImageKey(url).split("/").pop() ?? "");
  // Dvě různé fotky se stejným jménem souboru by se přes `_astro` nedaly
  // rozlišit — takové jméno radši nehlásíme jako doložené.
  if (podleJmena.has(jmeno) && podleJmena.get(jmeno).author !== credit.author) {
    kolizeJmen.add(jmeno);
  }
  podleJmena.set(jmeno, credit);
}
for (const j of kolizeJmen) podleJmena.delete(j);

/** Jména jdou do HTML s entitami („Giovanni Dall&#39;Orto“) — porovnáváme dekódovaně. */
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const stranky = [];
const projdi = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      // Vyhledávací index Pagefindu a zabalená aktiva nejsou stránky.
      if (e.name === "pagefind" || e.name === "_astro") continue;
      projdi(p);
    } else if (e.name.endsWith(".html")) stranky.push(p);
  }
};
projdi(DIST);

/**
 * Adresy obrázků, které stránka doopravdy UKAZUJE.
 *
 * Jen `<img>`, `<video>` a `<source>` — `og:image` v hlavičce ani obrázek
 * ve schema.org JSON-LD se nevykresluje, atribuci u nich neřešíme.
 * Bere se i `srcset`, protože varianty jsou samostatné soubory.
 */
function zobrazeneObrazky(html) {
  const out = new Set();
  for (const tag of html.match(/<(?:img|video|source)\b[^>]*>/gi) ?? []) {
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
    if (src) out.add(decode(src));
    const srcset = /\bsrcset=["']([^"']+)["']/i.exec(tag)?.[1];
    if (srcset) {
      for (const kus of srcset.split(",")) {
        const adr = kus.trim().split(/\s+/)[0];
        if (adr) out.add(decode(adr));
      }
    }
  }
  return [...out];
}

/** Kredit k jedné zobrazené adrese; null, když ho v registru neumíme najít. */
function kreditProAdresu(adresa) {
  if (/^data:/i.test(adresa)) return { preskocit: true };
  const primy = podleUrl.get(normalizeImageKey(adresa));
  if (primy) return { credit: primy };
  if (adresa.startsWith("/_astro/")) {
    const jmeno = basenameKey(adresa.split("/").pop() ?? "");
    const c = podleJmena.get(jmeno);
    return c ? { credit: c } : { chybi: jmeno };
  }
  // Vlastní grafika webu (logo, OG podklad, ikony) v `public/` není cizí dílo.
  if (!/^https?:\/\//i.test(adresa)) return { preskocit: true };
  return { chybi: adresa };
}

const spatne = [];
let sFotkou = 0;
let zkontrolovanoFotek = 0;

for (const soubor of stranky) {
  const html = readFileSync(soubor, "utf8");
  const adresy = zobrazeneObrazky(html);
  if (!adresy.length) continue;
  const text = decode(html);
  const bezKreditu = new Set();
  const bezJmena = new Set();
  let naStrance = 0;

  for (const adresa of adresy) {
    const v = kreditProAdresu(adresa);
    if (v.preskocit) continue;
    naStrance++;
    if (v.chybi) {
      bezKreditu.add(v.chybi);
      continue;
    }
    if (!text.includes(v.credit.author)) bezJmena.add(v.credit.author);
  }

  if (!naStrance) continue;
  sFotkou++;
  zkontrolovanoFotek += naStrance;
  if (bezKreditu.size || bezJmena.size) {
    spatne.push({
      stranka: `/${relative(DIST, soubor).replace(/index\.html$/, "")}`,
      celkem: naStrance,
      bezKreditu: [...bezKreditu],
      bezJmena: [...bezJmena],
    });
  }
}

console.log(
  `stránek: ${stranky.length}, z toho s fotkou: ${sFotkou} (${zkontrolovanoFotek} zobrazených souborů)`,
);

if (!spatne.length) {
  console.log("✓ každá zobrazená fotka má na své stránce uvedeného autora");
  process.exit(0);
}

console.error(`✗ ${spatne.length} stránek bez atribuce:`);
for (const s of spatne.slice(0, 40)) {
  if (s.bezKreditu.length) {
    console.error(
      `  ${s.stranka} — ${s.bezKreditu.length} z ${s.celkem} fotek nemá kredit v registru: ${s.bezKreditu.slice(0, 5).join(", ")}`,
    );
  }
  if (s.bezJmena.length) {
    console.error(
      `  ${s.stranka} — jméno autora chybí v HTML: ${s.bezJmena.slice(0, 5).join(", ")}`,
    );
  }
}
if (spatne.length > 40) console.error(`  … a dalších ${spatne.length - 40}`);
process.exit(1);
