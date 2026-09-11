#!/usr/bin/env node
/**
 * Obnoví soupis obrázků, které web používá, a nahlásí ty bez doloženého
 * původu.
 *
 * Proč to existuje: 10. 9. 2026 přišla na svetovestadiony.cz advokátní výzva
 * (2 169,95 EUR) za fotku pod CC BY-SA, u které bylo uvedeno jen „Foto:
 * Wikimedia Commons" — tedy zdroj místo autora. Na aktualizovano.cz mělo
 * 131 ze 142 článků jako autora vyplněno doslova „archiv".
 *
 *   node scripts/kontrola-fotek.mjs
 *       Sáhne do CMS, projde publikované články, přepíše
 *       `src/data/photo-inventory.json` a vypíše obrázky bez kreditu.
 *
 *   node scripts/kontrola-fotek.mjs --jen-vypis
 *       Totéž, ale soupis nepřepisuje.
 *
 * Kredity samotné skript nedohledává — to je ruční práce, postup je
 * v `docs/prava-k-fotkam.md`. Že soupis a tabulka kreditů sedí a že počet
 * nedoložených fotek neroste, hlídá `npm test`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const KOREN = join(dirname(fileURLToPath(import.meta.url)), "..");
const CESTA_KREDITY = join(KOREN, "src/data/photo-credits.json");
const CESTA_SOUPIS = join(KOREN, "src/data/photo-inventory.json");

const kredity = JSON.parse(readFileSync(CESTA_KREDITY, "utf8"));
const soupis = JSON.parse(readFileSync(CESTA_SOUPIS, "utf8"));

/** Stejná normalizace jako `normalizeImageKey` v `src/lib/photo-credits.ts`. */
function klic(url) {
  return String(url ?? "")
    .split(/[?#]/)[0]
    .replace(/__v-w\d+(?=\.[a-z0-9]+$)/i, "");
}

// Přístup se bere z téhož místa, odkud ho bere web — tím je jisté, že se
// kontroluje databáze, ze které se web opravdu renderuje. `.env.local`
// v CMS míří na jinou (cloudovou) instanci.
const klientSrc = readFileSync(join(KOREN, "src/lib/supabase.ts"), "utf8");
const URL_CMS = /SUPABASE_URL\s*=\s*"([^"]+)"/.exec(klientSrc)?.[1];
const KEY_CMS = /SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(klientSrc)?.[1];
const SITE_ID = /siteId:\s*"([^"]+)"/.exec(readFileSync(join(KOREN, "site.config.ts"), "utf8"))?.[1];
if (!URL_CMS || !KEY_CMS || !SITE_ID) {
  console.error("nepodařilo se přečíst přístup k CMS z src/lib/supabase.ts a site.config.ts");
  process.exit(2);
}

console.log(`čtu z ${URL_CMS} (site ${SITE_ID})`);
const supabase = createClient(URL_CMS, KEY_CMS);
const { data, error } = await supabase
  .from("articles")
  .select("slug,featured_image_url,featured_image_credit,content")
  .eq("site_id", SITE_ID)
  .eq("status", "published");
if (error) {
  console.error("čtení z CMS selhalo:", error.message);
  process.exit(2);
}

const pouzite = new Map();
const pridej = (url, slug) => {
  const k = klic(url);
  if (!k) return;
  pouzite.set(k, (pouzite.get(k) ?? new Set()).add(slug));
};
for (const a of data) {
  if (a.featured_image_url) pridej(a.featured_image_url, a.slug);
  // Vlastní média v těle: obrázky i videa ze souboru na CDN. Promo znělka
  // Discovery v <video> se takhle poprvé našla až v hotovém buildu.
  for (const m of String(a.content ?? "").matchAll(
    /<(?:img|video|source)[^>]+src=["']([^"']+)["']/gi,
  )) {
    pridej(m[1], a.slug);
  }
}

const sKreditem = [];
const bezKreditu = {};
for (const u of [...pouzite.keys()].sort()) {
  if (kredity[u]) sKreditem.push(u);
  else bezKreditu[u] = soupis.bezKreditu?.[u] ?? "původ se nepodařilo doložit";
}

console.log(
  `článků: ${data.length} | obrázků: ${pouzite.size} | ` +
    `s kreditem: ${sKreditem.length} | bez kreditu: ${Object.keys(bezKreditu).length}`,
);

const drive = Object.keys(soupis.bezKreditu ?? {}).length;
const ted = Object.keys(bezKreditu).length;
if (ted > drive) {
  console.error(`\n❌ nedoložených fotek PŘIBYLO: ${drive} → ${ted}`);
  for (const u of Object.keys(bezKreditu).filter((u) => !soupis.bezKreditu?.[u])) {
    console.error(" nová:", u, "—", [...(pouzite.get(u) ?? [])].join(", "));
  }
} else if (ted < drive) {
  console.log(`\n✅ nedoložených fotek ubylo: ${drive} → ${ted}`);
  console.log(`   sniž LIMIT_NEDOLOZENYCH_V_CMS v src/data/photo-credits.test.ts na ${ted}`);
}

if (!process.argv.includes("--jen-vypis")) {
  writeFileSync(
    CESTA_SOUPIS,
    JSON.stringify(
      { porizeno: new Date().toISOString().slice(0, 10), pouziteObrazky: pouzite.size, sKreditem, bezKreditu },
      null,
      1,
    ) + "\n",
  );
  console.log(`soupis přepsán: ${CESTA_SOUPIS}`);
}

process.exit(ted > drive ? 1 : 0);
