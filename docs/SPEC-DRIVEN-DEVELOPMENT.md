# Spec-driven development v Kuželkátoru

Specifikace je verzovaná dohoda o pozorovatelném chování změny. Vzniká před implementací, vede výběr testů a aktualizuje se při změně požadavků. Hotová změna musí mít u každého akceptačního kritéria důkaz nebo výslovné omezení. Dokumentace ani zaškrtnuté úkoly samy funkčnost neprokazují.

Závazná pravidla větví, uživatelského ověření, PR review a autorizace zůstávají v [AGENTS.md](../AGENTS.md). Produkční postup je v [RELEASE-PROCESS.md](RELEASE-PROCESS.md). Skills na ně odkazují; nevytvářejí nové oprávnění k externím akcím.

## Dostupné skills

| Skill                                                                   | Použít pro                                                        | Výstup                                                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [kuzelkator-spec](../.agents/skills/kuzelkator-spec/SKILL.md)           | Novou funkci, změnu chování, opravu nebo aktualizaci požadavků.   | Specifikace s AC, datovými předpoklady a plánem ověření.                   |
| [kuzelkator-implement](../.agents/skills/kuzelkator-implement/SKILL.md) | Realizaci dohodnuté změny.                                        | Kód, relevantní testy a aktualizovaná specifikace k uživatelskému ověření. |
| [kuzelkator-cka-data](../.agents/skills/kuzelkator-cka-data/SKILL.md)   | Nové datové dotazy, statistiky a nejistý význam údajů.            | Doložený datový kontrakt, omezení a hraniční scénáře.                      |
| [kuzelkator-verify](../.agents/skills/kuzelkator-verify/SKILL.md)       | Kontrolu výsledku proti AC.                                       | Výsledky ověření a návod k vyzkoušení.                                     |
| [kuzelkator-review](../.agents/skills/kuzelkator-review/SKILL.md)       | Nezávislé review PR.                                              | Záznam pro konkrétní head SHA a stav jeho uložení v PR.                    |
| [kuzelkator-release](../.agents/skills/kuzelkator-release/SKILL.md)     | Přípravu vydání, autorizovaný release, hotfix nebo synchronizaci. | Kandidát a důkazy podle release procesu, případně ověřené nasazení.        |

## Umístění a aktivace

Skills jsou verzované v `.agents/skills` v tomto repozitáři. Každý má vlastní SKILL.md s názvem, popisem použití a postupem. Šablony jsou u příslušného skillu v assets; další pomocné skripty ani globální instalace nejsou potřeba. Skills jsou záměrně vázané na toto repo a jejich relativní odkazy předpokládají zachování struktury checkoutu.

Codex podporující repozitářové skills prohledává `.agents/skills` mezi pracovním adresářem a kořenem repa. Skill lze vyvolat přes `$kuzelkator-spec` nebo jej může agent vybrat podle popisu. Viz [oficiální dokumentace](https://learn.chatgpt.com/docs/build-skills). Pokud se nový skill neobjeví, otevři novou relaci v checkoutu s těmito soubory; podle hostitele může být potřeba restart.

Air ani jinému hostiteli nepředpokládej automatické načtení bez ověření. Pokud jména v seznamu skills nejsou, požádej agenta přímo: „Přečti .agents/skills/kuzelkator-spec/SKILL.md a postupuj podle něj.“ Jde o použití instrukcí ze souboru, nikoli důkaz registrace skillu v hostiteli. Odkazy v AGENTS.md umožňují stejné použití i agentům bez nativního katalogu. Nekopíruj samostatné adresáře globálně: jejich odkazy na repo by přestaly fungovat a vznikly by dvě verze instrukcí.

## Běžný průchod změnou

1. Agent prozkoumá zadání a současnou implementaci. Na vyhrazené větvi založené podle AGENTS.md vytvoří jednu specifikaci v `docs/specs/YYYY-MM-DD-kratky-nazev.md` ze [šablony](../.agents/skills/kuzelkator-spec/assets/spec-template.md). Datum je datum založení dokumentu; ID AC zůstávají stabilní při dalších úpravách.
2. Je-li funkce závislá na nových nebo nejistých datech, ověří proveditelnost. Zaznamená doložená fakta, omezení a otevřené otázky. Nedostupnost pole neřeší vymyšleným údajem.
3. Ujasní požadované chování. Již explicitní zadání nebo dohoda v konverzaci stačí; není nutné znovu schvalovat tentýž text. Nevyřešené produktové rozhodnutí blokuje závislou implementaci, nikoli průzkum a nezávislou práci. Samotný požadavek na návrh neznamená souhlas s implementací.
4. Při autorizované realizaci implementuje podle AC, načte relevantní lokální dokumentaci Next.js a doplní přiměřené testy. Významnou změnu požadavků promítne zpět do specifikace a vyřeší s uživatelem. Technické volby uvnitř rozsahu rozhoduje samostatně.
5. Ověří skutečné chování, doplní důkazy a předloží konkrétní uživatelský scénář. Mockované testy a živá data eviduje odděleně. Neprovedený test není úspěšný test.
6. Po uživatelském ověření a výslovném schválení commitu/pushe pokračuje přes PR a nezávislé review podle AGENTS.md. Schválení specifikace není schválení těchto operací. Vydání do produkce probíhá samostatně podle release procesu.

Specifikace se mění ve stejném PR jako implementace. PR popis odkazuje na specifikaci, shrnuje ověření a podstatné odchylky. Již přijaté specifikace nemažeme; při pozdější změně chování založíme novou změnovou specifikaci s odkazem na původní. Není nutné zpětně sepisovat všechny dosavadní funkce.

## Rozsah a stavy specifikace

- **Návrh:** dosud zbývá produktová otázka nebo jde pouze o návrh bez zadání implementace.
- **Připraveno:** chování je dohodnuté a kritéria ověřitelná. Stav sám není oprávněním provést externí akci.
- **Implementováno:** kód je připravený, probíhá nebo zbývá ověření.
- **Ověřeno:** AC mají skutečné výsledky, včetně jasně uvedených omezení. Uživatelské schválení a PR review se evidují odděleně.
- **Nahrazeno:** pozdější specifikace mění chování; uveď odkaz.

U malé opravy stačí reprodukce, očekávané chování, jedno či několik AC a ověření. U čisté dokumentace nebo úpravy skillu stačí stručné zadání a kontrola dokumentů; samostatná produktová specifikace není povinná. Větší funkce využije celou šablonu. Stav ani délka dokumentu nenahrazují důkazy.

## Příklady zadání

- „Použij $kuzelkator-spec a navrhni porovnání dvou hráčů v jedné sezóně. Zatím pouze specifikaci.“
- „Použij $kuzelkator-cka-data a ověř, zda lze spolehlivě zobrazovat počet střídání. Výsledek zapiš do rozpracované specifikace.“
- „Použij $kuzelkator-implement a implementuj specifikaci, na které jsme se dohodli. Připrav ji k mému ověření.“
- „Použij $kuzelkator-verify a ověř změnu proti AC, včetně telefonu a sdíleného odkazu.“
- „Použij $kuzelkator-review pro aktuální head PR. Dodrž odlišný model a ověř uložení záznamu do PR.“
- „Použij $kuzelkator-release a připrav příští verzi k ověření.“

[Ukázka specifikace](specs/examples/qualification.md) popisuje malý výsek existující kvalifikace hráčů. Je vzdělávací, není novým zadáním ani potvrzením testů či oficiálního sportovního pravidla.

## Údržba a ověření skills

Úpravy skills procházejí stejnými pravidly větví a uživatelského ověření jako ostatní dokumentace. Měň instrukce podle skutečných opakovaných problémů; nepřidávej obecné příkazy ani duplicitní release pravidla. Odkazy na konkrétní kód aktualizuj při přesunu souborů.

Při změně zkontroluj YAML frontmatter (name a description), shodu názvu s adresářem, odkazy, formátování a konzistenci s AGENTS.md. Pokud je dostupný skill-creator, spusť jeho scripts/quick_validate.py nad každým změněným adresářem skillu. Tento validátor ověřuje strukturu, nikoli správnost rozhodování.

Pro obsahovou kontrolu projdi následující scénáře; případný samostatný agentní test musí být read-only bez PR komentářů, commitu, pushe nebo produkčních akcí. Zaznamenej, zda šlo o ruční průchod instrukcemi nebo skutečné spuštění jiného agenta.

| Zadání / situace                                    | Očekávané chování                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Pouze navrhni novou funkci.                         | Specifikace a otázky; žádná implementace.                                                  |
| Jednoznačné zadání opravy s povolením implementace. | Krátká specifikace, implementace a ověření bez opakovaného schvalování stejného zadání.    |
| API neposkytuje spolehlivý počet střídání.          | Omezení a produktové rozhodnutí, žádný vymyšlený součet.                                   |
| Čistá změna šířky hlavičky zápasu.                  | Relevantní vizuální kontrola; žádný automatický sběr dat ani povinný nový unit test.       |
| E2E procházejí pouze s mocky.                       | Testy doloženy, živá integrace samostatně označena jako neověřená.                         |
| Implementující model není znám.                     | Není deklarováno nezávislé schválení; příprava může pokračovat, merge čeká.                |
| Air vrátí pouze lokální ID komentáře.               | Nejde o důkaz persistence v PR; kontrola cílového PR nebo manuální postup podle AGENTS.md. |
| Připrav release bez souhlasu s nasazením.           | Hotový kandidát k ověření, žádný merge do main, deployment či publikace tagu.              |
| Po schválení se změní kandidát.                     | Obnovení příslušné validace, review a uživatelského ověření.                               |

První skutečné použití na produktové změně ověří kvalitu celého SDD toku. Samotná instalace skills tento provozní důkaz neposkytuje.
