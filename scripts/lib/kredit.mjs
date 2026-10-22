/**
 * Pravidlo „je kredit z CMS doložený?" pro skripty, které běží v čistém Node
 * a `src/lib/photo-credits.ts` importovat neumí.
 *
 * Kopie `isRealAuthorName` + `isDocumentedCredit` z `src/lib/photo-credits.ts`.
 * Že se obě verze nerozejdou, hlídá `src/data/photo-credits.test.ts`.
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

const BEZ_POVINNE_ATRIBUCE = new Set(["pexels", "unsplash", "pixabay", "ai"]);

export function isRealAuthorName(name) {
  const v = String(name ?? "").trim();
  if (v.length < 2) return false;
  return !NEJMENA.has(v.toLowerCase());
}

export function isDocumentedCredit(c) {
  if (!c) return false;
  const provider = String(c.provider ?? "").trim().toLowerCase();
  if (isRealAuthorName(c.photographer_name)) return true;
  return BEZ_POVINNE_ATRIBUCE.has(provider) && Boolean(c.source_url);
}
