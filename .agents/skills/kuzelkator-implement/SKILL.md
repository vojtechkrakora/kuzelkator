---
name: kuzelkator-implement
description: Implementuj dohodnutou specifikaci nebo opravu Kuželkátoru a propoj změny s akceptačními kritérii; použij při realizaci, ne při samotném návrhu nebo vydání.
---

# Implementace podle specifikace

Přečti [AGENTS.md](../../../AGENTS.md), [SDD postup](../../../docs/SPEC-DRIVEN-DEVELOPMENT.md) a konkrétní specifikaci změny.

1. Ověř stav větve, diff a základ develop (u kritického hotfixu main). Dodrž AGENTS.md; při cizí rozpracované práci použij samostatný worktree. Neresetuj ji a nepřenášej ji do svého PR.
2. Najdi specifikaci a potvrď rozsah z konverzace. Pokud chybí, vytvoř přiměřeně stručnou specifikaci postupem [spec](../kuzelkator-spec/SKILL.md). Nečekej na nové schválení již dohodnutých požadavků. Otevřenou otázku, která mění chování, vyřeš před závislou implementací; nezávislá práce může pokračovat.
3. Před psaním aplikačního kódu načti relevantní dokumentaci instalované verze Next.js podle AGENTS.md. Chybějící závislosti připrav ze zamčených verzí; nepoužívej paměť starších Next.js API jako náhradu dokumentace.
4. Prozkoumej dotčenou cestu: domain → server → aplikační API / serverová stránka → komponenty. Výpočty drž v doméně, upstream validaci na hranici. Serverové stránky nemají volat vlastní HTTP API. Existující konvence ověř v kódu.
5. Implementuj po ucelených kritériích. U datové změny použij [ČKA data](../kuzelkator-cka-data/SKILL.md), u regrese přidej smysluplný reprodukční test. Testuj očekávané chování, ne opis implementace. Drobné textové a vizuální změny nevyžadují nový unit test.
6. Pokud zjištění mění požadované chování nebo rozsah, aktualizuj specifikaci a vyřeš produktové rozhodnutí. Neupravuj kritéria jen proto, aby prošel aktuální kód. Technické rozhodnutí v dohodnutém rozsahu zaznamenej a pokračuj.
7. Použij [ověření](../kuzelkator-verify/SKILL.md), aktualizuj dokumentaci chování a důkazy u AC. Běžná změna nezvyšuje verzi aplikace.

Předej změny uživateli s odkazem na specifikaci, výsledky ověření, omezeními a konkrétním postupem vyzkoušení. Commit a push čekají na ověření a výslovné schválení podle AGENTS.md. Změny po schválení vyžadují nové ověření. Implementační kontrola nenahrazuje nezávislé review PR.
