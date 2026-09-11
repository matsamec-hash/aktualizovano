# Práva k fotkám na aktualizovano.cz

Stav k 2026-09-11.

## Proč

10. 9. 2026 přišla na svetovestadiony.cz advokátní výzva (Robert Fechner /
PhotoClaim za fotografa Arne Müselera, případ 52-06966, **2 169,95 EUR**) za
dvě fotky pod CC BY-SA, u kterých bylo napsáno jen „Foto: Wikimedia Commons"
— tedy **zdroj místo autora**. Audit ukázal, že jde o systémovou vadu napříč
portfoliem, ne o dvě URL.

Na aktualizovano.cz mělo **131 ze 142 článků** jako autora úvodní fotky
vyplněno doslova `archiv` a šablona to vypisovala na web jako „Foto: archiv".
Dalších **180 obrázků uvnitř článků** nemělo záznam o původu vůbec.

## Co se počítá jako splněná atribuce

Jméno autora **+** název licence **+** odkaz na plné znění licence
(a u úprav poznámka, že se upravovalo). Nic z toho nenahradí „Wikimedia
Commons", „archiv" ani odkaz na soubor. U public domain / CC0 se atribuce
nevyžaduje, jen se uvede licence. Unsplash, Pexels a Pixabay atribuci
nevyžadují — u nich stačí licence a odkaz na originál.

## Jak je to zařízené v kódu

| soubor | co dělá |
| --- | --- |
| `src/data/photo-credits.json` | dohledané kredity, klíč = adresa obrázku |
| `src/lib/photo-credits.ts` | rozhoduje, jestli je kredit doložený |
| `src/lib/supabase.ts` | úvodní fotku bez kreditu zahodí hned u zdroje dat |
| `stripUncreditedImages` | vyhodí z těla článku obrázky bez kreditu |
| `src/components/PhotoCredits.astro` | blok „Fotografie" pod článkem |
| `src/data/photo-credits.test.ts` | rohatka — počet nedoložených smí jen klesat |
| `scripts/kontrola-fotek.mjs` | obnoví soupis z CMS a nahlásí nové nedoložené |

‼️ Fotka bez kreditu se **nevykreslí nikde** — ani na kartě v rubrice, ani
v `og:image`, ani ve schématu. Hlídá se to na jednom místě (`src/lib/supabase.ts`),
protože `featured_image_url` čte osm různých komponent a jedna zapomenutá by
stačila.

## Čísla

| | počet |
| --- | ---: |
| obrázků v publikovaných článcích | 315 |
| z toho s doloženým kreditem | 78 |
| z toho bez doloženého původu (nevykreslují se) | 237 |
| článků, které přišly o úvodní fotku | 81 |
| článků, kterým zmizel obrázek z textu | 62 |

Ponechané fotky podle poskytovatele: unsplash 52, pexels 22, pixabay 3, nasa 1.

## Proč která fotka šla pryč

| důvod | počet |
| --- | ---: |
| původ se nepodařilo doložit | 166 |
| cizí autor přímo v metadatech, licence nedoložená | 15 |
| PR/klientská fotka bez doloženého svolení | 10 |
| snímek obrazovky cizího webu/aplikace bez doloženého svolení | 7 |
| BMW PressClub — tisková fotka bez doloženého svolení | 7 |
| Shutterstock — „No use without permission“ přímo v metadatech | 5 |
| Unsplash — fotka už na Unsplash není (404), původ nelze doložit | 5 |
| tisková fotka firmy bez doloženého svolení | 5 |
| Discovery Communications — užití omezené na propagaci pořadu | 4 |
| Daria Ostapenko — licence nedohledatelná (na Commons není), navíc rozpoznatelné osoby | 4 |
| Lukas Wagneter — „All Rights Reserved“ přímo v metadatech | 3 |
| Pexels — fotka už na Pexels není (404), licenci nelze doložit | 2 |
| Adobe Stock — placená licence, kterou nemáme doloženou | 2 |
| Getty/iStock — placená licence, kterou nemáme doloženou | 1 |
| Envato Elements — placená licence, kterou nemáme doloženou | 1 |

## ⏳ Zbývá: úklid v CMS a na CDN

Na webu už nedoložené fotky nejsou, ale **v databázi pořád jsou**
— `articles.featured_image_url` a `<img>` v `articles.content`. Dokud se
nevyprázdní, bude je vidět náhled v CMS a soubory zůstanou na veřejné
adrese CDN.

1. Vyprázdnit `featured_image_url` + `featured_image_credit` u 81 článků
   a odebrat nedoložené `<img>` z těl 62 článků.
   Podklad: `docs/fotky-k-odstraneni.txt`, hotový skript
   `scripts/uklid-fotek-v-cms.mjs` (píše do produkční databáze, proto se
   pouští ručně a s rozmyslem).
2. Smazat soubory z `cdn.samecdigital.com` — seznam je v
   `docs/fotky-k-odstraneni.txt`. Samotné odstranění z databáze nestačí,
   dokud soubor visí na veřejné URL.
3. Po úklidu spustit `npm run kontrola-fotek` a snížit
   `LIMIT_NEDOLOZENYCH_V_CMS` v `src/data/photo-credits.test.ts`.

## ⏳ Zbývá: jména autorů u fotek z Unsplash

Unsplash License atribuci nevyžaduje, takže u fotek, kterým se nepodařilo
dotáhnout jméno fotografa, je v kreditu uveden poskytovatel („Unsplash")
a ověřený odkaz na originál. Jméno se **nedohaduje** ze slugu v názvu
souboru — `aleksi-raisa` je ve skutečnosti Aleksi Räisä a špatně napsané
jméno je horší než žádné. Dotáhnout jde přes Unsplash API
(demo klíč dává 50 dotazů za hodinu).
