---
name: kuzelkator-spec
description: Navrhni nebo aktualizuj specifikaci funkce či opravy Kuželkátoru před implementací; vyjasni chování, datové předpoklady a akceptační kritéria.
---

# Specifikace změny

Přečti [pravidla repa](../../../AGENTS.md) a [SDD postup](../../../docs/SPEC-DRIVEN-DEVELOPMENT.md). Pracuj v kořeni příslušného checkoutu; odkazy zde jsou relativní k tomuto souboru.

1. Prozkoumej zadání, existující kód, relevantní testy a dokumentaci. ARCHITECTURE.md je cílový návrh, nikoli důkaz implementace. Rozliš současné chování, požadované chování a neověřené předpoklady.
2. Před zápisem dodrž pravidla větví a zachovej cizí rozpracované změny. Vytvoř nebo aktualizuj jednu specifikaci v docs/specs ve formátu YYYY-MM-DD-kratky-nazev.md podle [šablony](assets/spec-template.md). Nezakládej duplicitní specifikaci stejné změny.
3. Popiš pozorovatelný výsledek, rozsah a co do něj nepatří. Dej kritériím stabilní ID AC-01 atd. Každé kritérium musí mít vstup/situaci, očekávaný výsledek a způsob ověření; nepředepisuj implementační detail bez důvodu.
4. U statistik a nových datových požadavků nejprve ověř proveditelnost postupem [ČKA data](../kuzelkator-cka-data/SKILL.md). Nedostupné údaje neslibuj a nenahrazuj nulu za neznámou hodnotu. Zapiš zdroj, datum kontroly a omezení dat.
5. Zohledni pouze relevantní stavy: prázdná, neúplná či zastaralá data, výpadek, sezóna/kolo, mobil, URL a lokální preference. Dotazy uživateli omez na nevyřešená rozhodnutí ovlivňující výsledek; fakta nejprve vyhledej.
6. Technický plán odvoď od aktuálního kódu a navrhni nejmenší smysluplné testy. U malé opravy stačí reprodukce, očekávání a regresní scénář; nepřidávej prázdné oddíly.

Výstup: odkaz na specifikaci, stručný návrh chování a případné blokující otázky. Zaznamenej již dohodnutá rozhodnutí z konverzace; nevyžaduj jejich opětovné schválení. Samotný požadavek na návrh neopravňuje k implementaci. Při autorizované implementaci a jasném zadání pokračuj bez dalšího ceremoniálu; podstatnou nevyřešenou produktovou volbu nehádej.
