---
name: kuzelkator-review
description: Proveď nebo připrav nezávislé review PR Kuželkátoru proti specifikaci a testům, včetně záznamu pro konkrétní SHA a ověření jeho uložení do PR.
---

# Nezávislé review PR

Autoritativní pravidla modelů, schválení a persistence jsou v [AGENTS.md](../../../AGENTS.md); nejprve je načti. Tento skill lze použít pro přípravu review i jako instrukci nezávislému reviewerovi. Příprava ani sebekontrola nejsou nezávislé schválení.

## Připrav podklady a reviewera

- Zjisti cílové PR, base branch a aktuální head SHA. Předej skutečný diff vůči cíli, specifikaci, relevantní kontext a výsledky validace s omezeními. Release se kontroluje celý proti main; synchronizační PR potřebuje také kontrolu.
- Před spuštěním reviewera jednou ověř dostupné agentní nástroje, podporované volby modelu a identifikátor implementujícího modelu z runtime metadat nebo explicitní konfigurace. Branding ani tvrzení samotného agenta nestačí.
- Explicitně nakonfiguruj jiný podporovaný model a zaznamenej zdroj obou identit. Je-li model implementátora neznámý nebo nelze jiný model zvolit, použij postup nedostupného reviewera v AGENTS.md. Neopakuj sondování, nenahrazuj ho jiným názvem agenta a neblokuj tím autorizovanou implementaci či přípravu PR. PR zůstane nesloučené.

## Proveď kontrolu

Zkontroluj AC proti skutečnému kódu, regresní rizika, úplnost dat, náklady API, chybové stavy, přístupnost a relevantní testy. Rozsah přizpůsob diffu. Při release ověř také zvýšení verze, celý kandidát a validaci přesného SHA. Uváděj konkrétní reprodukovatelné nálezy se závažností a souborem; neprezentuj neověřenou domněnku jako chybu. Reviewer v tomto režimu změny pouze posuzuje.

Použij [šablonu záznamu](assets/review-template.md). Verdict schvaluje jen skutečně posouzenou revizi. Po opravě blokujících nálezů vyžádej nové review aktualizovaného diffu; změny po uživatelském schválení vyžadují i nové uživatelské ověření před commitem/pushem.

## Zaznamenej výsledek

Použij dostupný Air komentář, pokud se hodí pro aktuální režim, jinak poskytni záznam v chatu. Před merge musí být záznam také v cílovém GitHub PR. Ověř PR URL/ID komentáře či review a head SHA; obecné „success“ nebo Air-local ID nestačí. Při nejistotě nejdříve jednou přečti komentáře/reviews cílového PR, než budeš zápis opakovat.

Pokud nelze uložení potvrdit, poskytni kompletní záznam k vložení a požádej o manuální zveřejnění s odkazem. Merge čeká na potvrzení dle AGENTS.md; pokračuj v ostatní autorizované práci. Připravený záznam s neznámým modelem nebo neprovedenou kontrolou nikdy neoznačuj jako approved.

Výstup: záznam review, stav persistence a blokující položky. Merge běžného PR je možný až po nezávislém schválení aktuální revize a povinných kontrolách; release/hotfix do main navíc vyžaduje explicitní schválení vydání přesné revize.
