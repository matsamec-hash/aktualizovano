/**
 * Dohledané kredity k fotkám na aktualizovano.cz.
 *
 * ‼️ DATA SE NEPÍŠOU RUČNĚ — leží v `photo-credits.json` a obnovuje je
 * `node scripts/kontrola-fotek.mjs --obnovit`, který projde publikované
 * články v CMS a u každého obrázku dohledá původ.
 *
 * Co v tabulce není, na web nesmí: `src/lib/supabase.ts` zahodí úvodní fotku
 * bez kreditu a `stripUncreditedImages` vyhodí z těla článku obrázky bez
 * kreditu. Že počet nedoložených fotek neroste, hlídá `npm test`.
 *
 * Stav k 2026-09-11: 78 obrázků s doloženým kreditem,
 * 237 obrázků bez doloženého původu (ty se nevykreslují).
 */
import type { PhotoCredit } from "../lib/photo-credits";
import credits from "./photo-credits.json";

export const PHOTO_CREDITS = credits as Record<string, PhotoCredit>;
