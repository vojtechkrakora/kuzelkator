# Kompaktní řádky tabulek družstev

- Stav: ověřeno včetně vystředění indikátorů; připraveno k uživatelskému vyzkoušení.
- Zadání: uživatel 10. 11. 2026 požaduje kompaktnější tabulky družstev s nižšími řádky. Navazuje na [kompaktní přehled](2026-11-10-kompaktni-uvod.md).
- Rozsah: tabulka pořadí v záložce Družstva, v pohledech Celkem / Doma / Venku. Úprava je pouze vizuální; nemění data, pořadí, odkazy, oblíbené ani další tabulky.

## Reprodukce a očekávání

V soutěži 2. KLM A na datu 7. 11. 2026 mají běžné řádky na počítači přibližně 71 px, na telefonu 390 px přibližně 66 px. Buňky mají svislé odsazení 13, respektive 10 px; změna pořadí přidává další mezeru. Dlouhé názvy na 320 px se zalamují a řádky dále zvětšují.

Zmenšit svislé odsazení buněk, hlavičky a odznak změny pořadí. Zachovat velikost písma a čitelné oddělení řádků. Cílit přibližně na 40 px na počítači a 49 px na telefonu pro běžný řádek; dlouhé názvy smí řádek přirozeně zvětšit, musí zůstat celé. Na telefonu zachovat alespoň 44px výšku klikatelného názvu a hvězdičky.

Doplnění uživatele: indikátory pohybu mají být uprostřed řádku. Číslo pořadí a odznak budou vedle sebe, oba svisle vystředěné i při zalomeném názvu týmu.

## Akceptační kritéria

| ID    | Situace                                                     | Očekávání                                                                                                 | Ověření                                                  |
| ----- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| AC-01 | Tabulka družstev na 1280 px                                 | Běžný řádek kolem 40 px, nejvýše 44 px; čitelný název, logo, statistiky a změna pořadí.                   | Rozměry DOM a screenshot, existující standings E2E.      |
| AC-02 | Tabulka na 320 a 390 px včetně dlouhých názvů               | Běžný řádek nejvýše 50 px, dlouhý název celý a bez přetečení. Název i hvězdička mají výšku alespoň 44 px. | Prohlížeč, kontrola celé živé tabulky a mobilní E2E.     |
| AC-03 | Celkem / Doma / Venku, výběr kola, oblíbené a otevření týmu | Data i ovládání fungují jako dosud, změna stylu nezasahuje ostatní tabulky.                               | Existující E2E tabulek a přehledu, kontrola rozsahu CSS. |

| AC-04 | Indikátor pohybu na počítači a telefonu | Odznak vedle čísla pořadí, svisle uprostřed řádku i při zalomeném názvu; bez zvětšení běžných řádků. | DOM středy řádků a odznaků, screenshot a existující E2E. |

## Ověření a uživatelské vyzkoušení

Ověřeno 10. 11. 2026 na HEAD `c6a0e7d3f02d051847860d0050a47564da2efa23` větve `feature/compact-dashboard-intro` a pracovním diffu této změny. Node.js 22.23.4, produkční build na portu 43127. Předchozí commit a push se vztahují pouze k předchozí změně. Tato úprava zůstane v pracovním diffu do nového uživatelského ověření a výslovného schválení commitu/pushe. Nevznikl nový unit test; doplněny kontroly rozměrů a dotykových cílů v existujícím browser testu.

| AC    | Stav    | Důkaz a omezení                                                                                                                                                                                                                                                            |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Splněno | Živá tabulka na 1280 px: běžný řádek 39 px místo 71 px; vizuální kontrola screenshotu. Písmo názvu a statistik zůstává 12 px, kompaktní odznak změny pořadí má 11 px.                                                                                                      |
| AC-02 | Splněno | Na 390 a 740 px řádky 49 px místo 66 px; na 320 px dlouhé názvy zvětší čtyři řádky na cca 56 px, ostatní mají 49 px. Názvy a hvězdičky mají výšku 44 px. Bez přetečení mobilní tabulky i stránky; vizuální kontrola 320/390 px v Chromiu. Bez fyzického telefonu a Safari. |
| AC-03 | Splněno | Všech 26 E2E přehledu a detailu tabulek prošlo, včetně Celkem/Doma/Venku a porovnání kol. Živě ověřeno sledování/odhlášení týmu a otevření detailu klávesnicí. CSS je omezené na `.standings`; jiné tabulky nepřebírají úpravu. E2E používají mocky.                       |

| AC-04 | Splněno | Číslo pořadí a indikátor jsou vedle sebe. Na živé tabulce při šířkách 320, 390, 740, 768 a 1280 px je odchylka středu odznaku od středu řádku nejvýše 0,25 px, včetně čtyř vyšších řádků na 320 px. Existující E2E ověřují vystředění i u dlouhého názvu týmu. |

Kontroly: `npm run build`, `npm run typecheck`, Prettier a `git diff --check` úspěšné. `TEST_BASE_URL=http://localhost:43127 npm run test:e2e -- tests/e2e/standings-details.spec.ts tests/e2e/dashboard.spec.ts --workers=4 --reporter=line`: 26 úspěšných scénářů před doplněním vystředění. Po změně markup a zarovnání znovu prošel build, typecheck a všechny 4 scénáře `tests/e2e/standings-details.spec.ts` na 320, 390 a 1280 px, včetně Celkem/Doma/Venku.

Rozměry aktuální živé tabulky zkontrolovány na 320, 390, 740, 768 a 1280 px, bez přetečení celé stránky a bez zachycených pageerror. Vizuálně ověřeny screenshoty na 320 a 1280 px. Vnitřní vodorovný posun tabulky v úzkém desktopovém rozložení byl přítomen již před úpravou; všechny sloupce zůstávají přístupné posunem.

V [lokálním náhledu](http://localhost:43127/?date=2026-11-07&competition=16&season=20) otevřít záložku Družstva, zkontrolovat hustší tabulku na počítači a telefonu, ověřit odznaky vedle pořadí uprostřed řádků i u dlouhých názvů, přepnout Doma/Venku a vyzkoušet hvězdičku i odkaz na tým.
