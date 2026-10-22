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

## ✅ Úklid v CMS a na CDN (ověřeno 2026-10-22)

- V databázi už žádná nedoložená fotka není: `featured_image_url`
  i `<img>` v `articles.content` obsahují jen adresy s kreditem v registru.
- Všech 235 souborů z `docs/fotky-k-odstraneni.txt` vrací na
  `cdn.samecdigital.com` 404.
- `LIMIT_NEDOLOZENYCH_V_CMS` je proto 0.

‼️ Úklid z 11. 9. nechal v textech pár osiřelých značek Gutenbergu
(`<!-- /wp:image --></figure>`, `<!-- /wp:gallery -->` bez otevírací
značky) — u galerií vyhodil jen první `<figure>`. Na webu nejsou vidět
(sanitizer je zahodí), ale kdo text strojově rozebírá po blocích, musí
osiřelé uzavírací značky přeskočit.

## Doplněné fotky (2026-10-20 až 22)

Na místa po vyhozených fotkách přišly nové s doloženou licencí:

- **úvodní fotka u všech 83 článků**, které ji ztratily (142/142 má fotku),
- **57 fotek do textu ve 44 článcích**, vložených za týž odstavec, kde stála
  původní (pozice z buildu z 1. 6. 2026). Kde šlo o snímek obrazovky, graf,
  fotku konkrétního člověka nebo produktu pod nadpisem s jeho jménem,
  místo zůstalo prázdné — náhrada ze stocku by čtenáře klamala.

Zdroje: Pexels a Pixabay (fotky stažené z API, autor ověřený u zdroje),
z Commons jen volná díla (NASA, U.S. Air Force, `PD-self`). CC BY / CC BY-SA
se schválně nepoužívaly. Tři původní fotky se vrátily, protože jejich
Pixabay ID v názvu souboru jde doložit (Bajkal, sněžný hotel v Kirkenes,
vánoční fotka). Segovia z účtu Pixabay „WikimediaImages“ ne — ten přebaluje
fotky z Commons a licence nemusí sedět.

Kredit každé fotky je v registru (`src/data/photo-credits.json`)
i v knihovně CMS (`images`, sloupce `license` a `license_url`).

## ✅ Jména autorů u fotek z Unsplash (2026-10-23)

Posledních pět fotek, u kterých byl v kreditu jen poskytovatel („Unsplash"),
má jméno autora dotažené z Unsplash API. Jméno se **nedohaduje** ze slugu
v názvu souboru — `aleksi-raisa` je ve skutečnosti Aleksi Räisä a špatně
napsané jméno je horší než žádné (demo klíč API dává 50 dotazů za hodinu).

## ‼️ Unsplash+ není Unsplash License

Šestá z nich — `getty-images-6y6DGYcuQNo` (úvodní fotka článku o s.r.o.
a OSVČ) — je z placené sbírky **Unsplash+**: API u ní vrací
`urls.raw` na `plus.unsplash.com`, ne na `images.unsplash.com`. Na takovou
fotku se volná Unsplash License nevztahuje a předplatné doložit neumíme.
Nahrazena fotkou z Pexels (Kindel Media), kredit v registru.

Kontrola pro každou fotku z Unsplash: `GET https://api.unsplash.com/photos/<id>`
→ `urls.raw` musí ležet na `images.unsplash.com`. Názvy souborů
`getty-images-…` jsou podezřelé vždycky.
