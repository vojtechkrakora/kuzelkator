# Přechod značky na mojekuzelky.cz

- Stav: ověřeno; připraveno k uživatelskému ověření
- Kontext: [task #98](https://github.com/vojtechkrakora/kuzelkator/issues/98), uživatelské zadání z 5. 11. 2026: „Měníme branding na mojekuzelky.cz, udělej task a přizpůsob tomu webovky (úvod, logo atd).“
- Dohodnuté rozhodnutí: veřejná značka je mojekuzelky.cz; zadání zahrnuje založení tasku a implementaci webu. Uživatelské ověření, commit, push a vydání se řeší samostatně.

## Problém a rozsah

Web dnes používá název Kuželkátor a v hlavičce obecnou kruhovou ikonu. Nová značka má být rozpoznatelná na úvodní stránce, ve společné hlavičce a zápatí, titulcích stránek, sdílení, kartě výsledku a tiskovém přehledu.

Použijeme název **mojekuzelky.cz**, slovní motiv **Moje kuželky. Moje výsledky.** a logo s kuželkou a koulí, sladěné s faviconou a současnou zelenou paletou. Úvod stručně představí sledování týmů, hráčů a výsledků bez registrace. Logo vede na úvod a musí být čitelné i na úzkém telefonu.

Rozsah nezahrnuje DNS, změnu domény služby na Renderu, přesměrování, produkční nasazení, přejmenování repozitáře či technických identifikátorů. Zachováváme klíče uložených oblíbených, sezón a OBS, API i cestování mezi stránkami. Úložiště prohlížeče je vázané na origin; při skutečném přechodu na jinou doménu se oblíbené samy nepřenesou. Historické release notes a názvy vývojových pravidel nepřepisujeme.

## Akceptační kritéria

| ID    | Situace a očekávaný výsledek                                                                                                                                          | Ověření                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AC-01 | Při otevření přehledu se zobrazí nové logo, název mojekuzelky.cz, úvod „Moje kuželky. Moje výsledky.“ a vysvětlení nabídky. Hlavička i zápatí používají novou značku. | Prohlížeč na desktopu a telefonu; favicon se úspěšně načte.                |
| AC-02 | Běžné stránky, novinky, OBS, karta pro sdílení a tisk mají titulky a aktuální značku mojekuzelky.cz. Nativní sdílení přehledu a hráče odesílá nový název.             | Kontrola zdrojů a metadat; existující E2E sdílení, sociální karty a tisku. |
| AC-03 | Při šířce 320 px a na desktopu značka nepřetéká; ovládací prvky zůstávají dostupné. Logo je přístupný odkaz na přehled, dostupný klávesnicí.                          | Kontrola rozměrů a ovládání v prohlížeči; existující mobilní E2E.          |
| AC-04 | Uživatel se stávajícími oblíbenými může dál přehled procházet, filtrovat, obnovit a sdílet v původním kontextu.                                                       | Existující E2E přehledu, oblíbených a sdílení; typecheck a build.          |

## Implementace a ověření

Relevantní dokumentace instalovaného Next.js: metadata, konvence app icons a globální CSS. Použijeme stávající SVG favicon jako základ sjednoceného vektorového loga, bez externích obrázků, fontů nebo nové služby. Drobné vizuální a textové změny nevyžadují nové unit testy; ověření stojí na existujících browser scénářích a kontrole skutečného UI.

### Výsledky

Ověřována větev `feature/mojekuzelky-branding`, základ `develop` na HEAD `91b279a2b6397e65f2832e9091913662e5515577` a necommitnutý pracovní diff této změny. Samostatný worktree zachovává rozpracované reporty v původním checkoutu. Kontroly běžely s Node.js 22.23.4 proti produkčnímu buildu na portu 43129.

| ID    | Výsledek | Důkaz a omezení                                                                                                                                                                                                                                                                                                                                    |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Splněno  | V prohlížeči ověřen název, nadpis, úvod, společné logo a zápatí; vizuální kontrola screenshotů na 320 a 1280 px. SVG favicon vrací HTTP 200 a `image/svg+xml`; logo se načítá ze stejného assetu.                                                                                                                                                  |
| AC-02 | Splněno  | Přímá browser kontrola titulků a `application-name` na přehledu, hráčích, profilu, novinkách, sociální kartě, OBS a tisku. Nativní sdílení přehledu odeslalo `mojekuzelky.cz – výsledky`, hráče `Jiří Semerád – mojekuzelky.cz`. Sociální karta a tisk obsahují nový název; v aktuálním UI není stará značka.                                      |
| AC-03 | Splněno  | Přímá kontrola rozměrů na 320, 390, 740, 768, 1024, 1280 a 1440 px: bez vodorovného přetečení, logo i odkaz ČKA v hlavičce se vejdou. Dvě stisknutí Tab z novinek zaměří logo, Enter otevře přehled. Žádné zachycené chyby konzole. Po poslední úpravě mobilního zalomení znovu ověřeny obě celé věty na vlastních řádcích a čtyři relevantní E2E. |
| AC-04 | Splněno  | Existující E2E ověřily týmy, hráče a soutěže v oblíbených, obnovení, filtry, sdílení, mobilní dialog, tisk včetně PDF i OBS. Klíče úložišť a technická konfigurace jsou beze změn. Testy API odpovědí v prohlížeči používají mocky; neověřují migraci dat mezi doménami.                                                                           |

Kontroly:

- `npm run typecheck`: úspěch.
- `npm test`: 159 testů ve 30 souborech, vše úspěšné.
- `npm run build`: úspěch, včetně opakování po poslední změně mobilního CSS.
- `TEST_BASE_URL=http://localhost:43129 npm run test:e2e -- tests/e2e/dashboard.spec.ts tests/e2e/sharing.spec.ts tests/e2e/social-match.spec.ts tests/e2e/competition-print.spec.ts tests/e2e/mobile-dialog.spec.ts tests/e2e/obs-overlay.spec.ts tests/e2e/players.spec.ts --workers=4 --reporter=line`: 65 úspěšných scénářů. Po úpravě mobilního zalomení opakovány testy `phone .*px|native sharing`: 4 úspěšné scénáře.
- `git diff --check`: bez chyb; Prettier úspěšně zkontroloval změněné TSX, CSS a Markdown. SVG zachovává ručně čitelný formát (Prettier pro příponu SVG nemá implicitní parser).

### Uživatelské vyzkoušení

1. Otevřít [lokální náhled](http://localhost:43129), zkontrolovat logo, nový úvod a zápatí na počítači i telefonu.
2. Otevřít novinky a vrátit se přes logo. Volitelně ověřit návrat i klávesnicí Tab a Enter.
3. Vyzkoušet sdílení přehledu a profilu hráče, kartu výsledku pro screenshot a tisk soutěže; zkontrolovat název mojekuzelky.cz.
4. Ověřit oblíbené v dosavadním prohlížeči. Jiný lokální port nebo doména mají vlastní úložiště.

Uživatelské schválení ani nezávislé PR review zatím neproběhly. Změny nejsou commitnuté, pushnuté ani nasazené; verze zůstává 0.17.0. DNS a skutečný přechod produkce na doménu nejsou součástí tohoto tasku.
