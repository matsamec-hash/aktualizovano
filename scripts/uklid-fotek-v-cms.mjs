#!/usr/bin/env node
/**
 * Vyprázdní v CMS fotky bez doložených práv.
 *
 * Web už je nevykresluje (`src/lib/supabase.ts` + `stripUncreditedImages`),
 * ale v databázi pořád jsou — takže je vidí náhled v CMS a soubory zůstávají
 * na veřejné adrese CDN. Tenhle skript uklidí databázi; samotné soubory
 * na CDN je potřeba smazat zvlášť (seznam: `docs/fotky-k-odstraneni.txt`).
 *
 * Co dělá:
 *   1. `featured_image_url`, `featured_image_credit` a `featured_image_alt`
 *      na NULL u článků, jejichž úvodní fotka nemá doložený původ.
 *   2. Doplní k ponechaným úvodním fotkám plný kredit (autor, licence,
 *      odkaz na znění licence, odkaz na originál).
 *   3. Odebere z `content` `<img>` bez doloženého původu i s obalem.
 *
 * ‼️ PÍŠE DO PRODUKČNÍ DATABÁZE. Bez `--opravdu` jen ukáže, co by udělal.
 * ‼️ Potřebuje zapisovací klíč: `SUPABASE_SERVICE_ROLE_KEY` v prostředí.
 *    Anonymní klíč, kterým web čte, na zápis nestačí.
 *
 *   node scripts/uklid-fotek-v-cms.mjs                  # nanečisto
 *   SUPABASE_SERVICE_ROLE_KEY=… node scripts/uklid-fotek-v-cms.mjs --opravdu
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const KOREN = join(dirname(fileURLToPath(import.meta.url)), "..");
const kredity = JSON.parse(readFileSync(join(KOREN, "src/data/photo-credits.json"), "utf8"));

const OPRAVDU = process.argv.includes("--opravdu");

function klic(url) {
  return String(url ?? "")
    .split(/[?#]/)[0]
    .replace(/__v-w\d+(?=\.[a-z0-9]+$)/i, "");
}
const kreditPro = (url) => (url ? kredity[klic(url)] : undefined);

/** Stejné vyhazování jako `stripUncreditedImages` v `src/lib/photo-credits.ts`. */
function bezNedolozenych(html) {
  const odebrane = [];
  const zahod = (cely, src) => {
    if (kreditPro(src)) return cely;
    odebrane.push(src);
    return "";
  };
  let out = String(html ?? "");
  out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (blok) => {
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(blok);
    return m ? zahod(blok, m[1]) : blok;
  });
  out = out.replace(/<a\b[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/a>/gi, (c, s) => zahod(c, s));
  out = out.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (c, s) => zahod(c, s));
  out = out.replace(/<video\b[^>]*>[\s\S]*?<\/video>|<video\b[^>]*\/?>/gi, (blok) => {
    const m = /src=["']([^"']+)["']/i.exec(blok);
    return m ? zahod(blok, m[1]) : blok;
  });
  out = out.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  return { html: out, odebrane };
}

// Adresa se bere z téhož místa jako web — ať je jisté, do které databáze se píše.
const klientSrc = readFileSync(join(KOREN, "src/lib/supabase.ts"), "utf8");
const URL_CMS = /SUPABASE_URL\s*=\s*"([^"]+)"/.exec(klientSrc)?.[1];
const ANON = /SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(klientSrc)?.[1];
const SITE_ID = /siteId:\s*"([^"]+)"/.exec(readFileSync(join(KOREN, "site.config.ts"), "utf8"))?.[1];
const ZAPIS = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (OPRAVDU && !ZAPIS) {
  console.error("chybí SUPABASE_SERVICE_ROLE_KEY — anonymní klíč na zápis nestačí");
  process.exit(2);
}
console.log(`${OPRAVDU ? "ZÁPIS" : "nanečisto"} · ${URL_CMS} · site ${SITE_ID}`);

const supabase = createClient(URL_CMS, ZAPIS ?? ANON);
const { data, error } = await supabase
  .from("articles")
  .select("id,slug,featured_image_url,featured_image_credit,featured_image_alt,content")
  .eq("site_id", SITE_ID)
  .eq("status", "published");
if (error) {
  console.error("čtení selhalo:", error.message);
  process.exit(2);
}

let heroPryc = 0;
let heroKredit = 0;
let telUpraveno = 0;
let obrazkuZTel = 0;
const chyby = [];

for (const a of data) {
  const zmena = {};
  const c = kreditPro(a.featured_image_url);

  if (a.featured_image_url && !c) {
    // Úvodní fotka bez doloženého původu: pryč i s kreditem a alt textem,
    // aby po ní nezůstal popisek k obrázku, který tam není.
    zmena.featured_image_url = null;
    zmena.featured_image_credit = null;
    // ‼️ `featured_image_alt` je v schématu NOT NULL — na NULL ho nastavit nelze.
    // Prázdný řetězec je správný výsledek: obrázek zmizel, tak nemá co popisovat.
    zmena.featured_image_alt = "";
    heroPryc++;
  } else if (c) {
    const novy = {
      provider: c.provider,
      photographer_name: c.author,
      photographer_url: c.authorUrl ?? "",
      source_url: c.sourceUrl,
      license: c.license,
      license_url: c.licenseUrl,
    };
    // ‼️ Porovnávat se musí nezávisle na pořadí klíčů — Postgres vrací jsonb
    // s vlastním pořadím, takže prosté JSON.stringify hlásí rozdíl navěky
    // a skript pak tvrdí, že má 59 kreditů co doplnit, i když už jsou uložené.
    const shodne = (x, y) => {
      const a = Object.fromEntries(Object.entries(x ?? {}).sort());
      const b = Object.fromEntries(Object.entries(y ?? {}).sort());
      return JSON.stringify(a) === JSON.stringify(b);
    };
    if (!shodne(a.featured_image_credit, novy)) {
      zmena.featured_image_credit = novy;
      heroKredit++;
    }
  }

  const { html, odebrane } = bezNedolozenych(a.content);
  if (odebrane.length) {
    zmena.content = html;
    telUpraveno++;
    obrazkuZTel += odebrane.length;
  }

  if (!Object.keys(zmena).length) continue;
  if (!OPRAVDU) {
    console.log(
      ` ${a.slug}: ${Object.keys(zmena).join(", ")}` +
        (odebrane.length ? ` (${odebrane.length} obr. z textu)` : ""),
    );
    continue;
  }
  const { error: e2 } = await supabase.from("articles").update(zmena).eq("id", a.id);
  if (e2) chyby.push(`${a.slug}: ${e2.message}`);
}

console.log(
  `\núvodní fotka pryč: ${heroPryc} | kredit doplněn: ${heroKredit} | ` +
    `těl upraveno: ${telUpraveno} (${obrazkuZTel} obrázků)`,
);
if (chyby.length) {
  console.error("chyby:", chyby.length);
  for (const ch of chyby.slice(0, 20)) console.error(" -", ch);
  process.exit(1);
}
if (!OPRAVDU) console.log("\n(nanečisto — spusť s --opravdu, až to bude sedět)");
