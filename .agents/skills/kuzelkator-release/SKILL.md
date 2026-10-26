---
name: kuzelkator-release
description: Připrav nebo proveď schválené vydání Kuželkátoru, hotfix či synchronizaci po vydání podle release procesu; nepoužívej pro běžnou implementaci funkce.
---

# Příprava a vydání

Nejprve přečti [AGENTS.md](../../../AGENTS.md) a celý [RELEASE-PROCESS.md](../../../docs/RELEASE-PROCESS.md). Tyto dokumenty jsou autoritativní; tento skill je navigace a formát důkazů, nikoli jejich náhrada.

1. Urči požadovanou fázi: příprava verze, validace kandidáta, vydání, hotfix, ověření produkce nebo synchronizace. Rozsah oprávnění převezmi z konverzace. Požadavek „připrav release“ sám nepovoluje deployment, tag ani publikaci GitHub Release.
2. Zkontroluj stav větví a předchozího nasazení. Verzi a datum nepovažuj za potvrzené jen podle merge či changelogu. Pro zvolený režim dodrž větvení, termín v Europe/Prague a kontrolu zápasů z release procesu.
3. Připrav požadované změny včetně verzí a českých poznámek podle procesu, na vyhrazené větvi. Běžná PR verzi nemění. Před commitem/pushem předej hotový výsledek uživateli k ověření podle AGENTS.md.
4. Sestav důkazy pro přesný kandidát: SHA, relevantní místní kontroly, povinný nativní Linux amd64 Docker běh v GitHub Actions, uživatelské ověření a [nezávislé review](../kuzelkator-review/SKILL.md) uložené v PR. Nekompatibilní lokální Docker popiš jako omezení podle procesu. Nevytvářej staging ani preview službu.
5. Před merge do main ověř, že kandidát a cíl odpovídají testovanému a schválenému stavu. Při změně obnov potřebné kontroly a schválení. U automatického deploye Renderu je merge pokyn k nasazení; vyžaduje výslovný souhlas s vydáním přesné revize.
6. Po autorizovaném nasazení ověř skutečný produkční SHA, verzi a uživatelské průchody podle procesu. Health nebo merge samy úspěšné nasazení nedokazují. Pak připrav reviewed synchronizaci main → develop a, s potřebným oprávněním, neměnný anotovaný tag a český GitHub Release na skutečně nasazeném commitu. Existující tag nepřesouvej.

Do release PR průběžně zapisuj: verzi; kandidátní SHA; odkazy na validaci a review; schválení uživatele s rozsahem; skutečně nasazený SHA; čas a pásmo; výsledek produkční kontroly; synchronizační PR; tag a GitHub Release. Neprovedené kroky označ jako čekající, nevymýšlej důkazy.

Chybějící přístup nebo oprávnění oznám jednou, dokonči dostupnou přípravu a přesně popiš zbývající krok. Při regresi použij postup rollbacku z RELEASE-PROCESS.md; neprováděj neautorizované změny produkce.
