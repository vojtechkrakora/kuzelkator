# Kompaktní úvod a ovládání přehledu

- Stav: ověřeno; připraveno k uživatelskému vyzkoušení.
- Zadání: uživatel 10. 11. 2026 schválil implementaci menšího úvodního bloku a požádal o náhled.
- Rozšíření zadání 10. 11. 2026: zkompaktnit také ovládání přehledu, dát sezónu a výběr soutěže na společný řádek a zmenšit předchozí/následující zápasy.
- Navazuje na [změnu značky](2026-11-05-mojekuzelky-branding.md); aktuální text „Moje kuželky. Moje výsledky.“ zůstává zachován na počítači. Tato specifikace nahrazuje požadavek na velký úvod a doprovodný odstavec z předchozí změny.

## Reprodukce a očekávání

Úvodní ilustrace má na počítači výšku 198 px, velký nadpis je na dvou řádcích a doprovodný odstavec s mezerami odsouvá zápasy dolů. Také telefon zobrazuje slogan a vysvětlující text před přehledem.

Na počítači bude menší slogan kolem 30 px na jednom řádku, drobná ilustrace kuželek a úvod vysoký přibližně 70–90 px bez vnějších mezer. Na užším displeji se text smí přirozeně zalomit. Doprovodný odstavec odstraníme. Na telefonu do 740 px úvod vynecháme a ponecháme nadpis přehledu či vybraného týmu. Zachováme dostupný hlavní nadpis pro čtečky. Popisek a sdílení se vejdou do společného řádku; případné ruční kopírování odkazu zůstane dostupné pod ním.

Neměníme společné logo, datové dotazy, oblíbené, URL, navigaci ani verzi aplikace.

Ovládání data na telefonu zkrátíme ze dvou řádků na jeden, tlačítko Dnes přesuneme vedle nadpisu. Sezóna a zavřený výběr soutěže budou vedle sebe, rozbalená mapa a hledání přes celou šířku pod nimi. Odstraníme velké rámečky a mezery kolem sezóny. Předchozí/následující zápasy budou dvě menší tlačítka na jednom řádku, s datem a úplným přístupným názvem; na nejmenším telefonu může viditelný text nahradit šipka s datem. Dotykové cíle zůstanou alespoň 44 px, čitelné mobilní vstupy 16 px.

## Akceptační kritéria

| ID    | Situace                                                   | Očekávaný výsledek                                                                                                                                                        | Ověření                                                         |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| AC-01 | Počítač 1280 a 1440 px                                    | Slogan na jednom řádku, drobná ilustrace, úvod 70–90 px bez vnějších mezer; bez doprovodného odstavce.                                                                    | Rozměry DOM a vizuální kontrola v prohlížeči.                   |
| AC-02 | Telefon 320, 390 a 740 px; mezilehlá šířka 768 a 1024 px  | Na telefonu bez reklamního úvodu a ilustrace; nadpis přehledu/týmu, sdílení a navigace dostupné. Bez vodorovného přetečení; na širších displejích čitelný kompaktní úvod. | Prohlížeč v uvedených šířkách, existující mobilní E2E.          |
| AC-03 | Přehled, oblíbený tým a sdílení včetně ručního kopírování | Nadále fungují filtry, oblíbené, obnovení, sdílení a klávesnice; úprava neovlivní loading/empty/error stavy.                                                              | Existující E2E přehledu a sdílení; kontrola klávesnice a stavů. |

| ID    | Situace                                                                            | Očekávaný výsledek                                                                                                                                                                                    | Ověření                                                                              |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AC-04 | Telefon od 320 px i počítač; otevřený/zavřený výběr soutěže a dlouhý název soutěže | Sezóna a spouštěč soutěže na jednom řádku (běžná výška 44–48 px), rozbalený obsah přes celou šířku. Sezónu i soutěž lze změnit, plný název zůstává dostupný. Bez přetečení.                           | Mobilní a desktopové rozměry, existující E2E sezóny a soutěží.                       |
| AC-05 | Datum a předchozí/následující zápasy na telefonu i počítači                        | Šipky a datum na jednom řádku, Dnes vedle nadpisu; skoky na sousední hrací dny na společném řádku, běžná výška 44 px. Kalendář, změna data, filtry a klávesnice fungují; dotykové cíle alespoň 44 px. | Rozměry a vizuální kontrola, upravený existující mobilní E2E podle nového očekávání. |

## Ověření

Ověřena větev `feature/compact-dashboard-intro`, HEAD `540fa023101034e0386902b6e8e1345401c2962f` a necommitnutý pracovní diff této změny. Samostatný worktree zachovává rozpracované reporty v původním checkoutu. Kontroly proběhly 10. 11. 2026 s Node.js 22.23.4 proti produkčnímu buildu na portu 43127. Pro čistě vizuální změnu nevznikl nový unit test.

| AC    | Stav    | Důkaz / výsledek                                                                                                                                                                                                                                                                                                   | Omezení                                                                          |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| AC-01 | Splněno | Úvod dál měří 72 px, desktopový nadpis je na jednom řádku, ilustrace 96 × 72 px. Screenshot na 1280 px a měření DOM po rozšíření změny.                                                                                                                                                                            | Chromium.                                                                        |
| AC-02 | Splněno | Kontrola 320, 390, 430, 740, 768, 1024, 1280 a 1440 px bez vodorovného přetečení. Screenshoty na 320/390/1280 px, původní mobilní úvod zůstává skrytý.                                                                                                                                                             | Bez fyzického telefonu a Safari.                                                 |
| AC-03 | Splněno | Znovu prošlo všech 28 E2E přehledu a sdílení: oblíbené, tým, filtry, reload, prázdné zápasy, zotavení z chyby a ruční kopírování. Živý přehled načetl 100 karet.                                                                                                                                                   | E2E mockují API; živá kontrola neověřuje správnost sportovních dat.              |
| AC-04 | Splněno | Na všech osmi šířkách sezóna a soutěž vedle sebe, obě pole 48 px; otevřený panel odpovídá celé šířce filtrů a nepřekrývá sezónu. Dlouhý název se zkrátí výpustkou, celý zůstane v textu a title. Klávesnicí Enter se panel otevře; změna sezóny zruší soutěž a nastaví historické datum podle stávajícího chování. | Dlouhý název a přepnutí sezóny ověřeny s mockovaným API.                         |
| AC-05 | Splněno | Datum a šipky na telefonu na společném řádku vysokém 44 px. Skoky mezi hracími dny 44 px, vedle sebe, bez přetečení. Upravené E2E na 320/390/430 px ověřují kompaktní rozměry, změnu data, kalendář, Escape a navigaci; kalendářní dny zachovávají původní velikost.                                               | Na 320 px mají skoky viditelnou šipku a datum; úplné názvy poskytuje aria-label. |

Kontroly:

- `npm run build` a `npm run typecheck`: úspěch.
- `TEST_BASE_URL=http://localhost:43127 npm run test:e2e -- tests/e2e/dashboard.spec.ts tests/e2e/sharing.spec.ts --workers=4 --reporter=line`: 28 úspěšných scénářů.
- Screenshoty a přímá kontrola rozměrů v Chromiu. Živý browser skript nezachytil pageerror; v Air náhledu byl při restartu serveru dočasný ERR_CONNECTION_REFUSED, po obnovení se přehled úspěšně načetl.
- `git diff --check` a Prettier nad změněnými soubory: bez chyb.

## Uživatelské vyzkoušení

Otevřít [lokální náhled s výsledky ze 7. listopadu](http://localhost:43127/?date=2026-11-07) na počítači a telefonu, zkontrolovat úvod a polohu zápasů. Sezóna a Najít soutěž mají být vedle sebe, šipky a datum na jednom řádku, předchozí/následující zápasy menší. Rozbalit soutěže a ověřit šířku panelu, změnit sezónu, vyzkoušet datum, Dnes, výběr týmu a sdílení. Commit a push čekají na uživatelské ověření a výslovné schválení podle AGENTS.md. Uživatelské ověření, nezávislé PR review ani produkční nasazení zatím neproběhly.
