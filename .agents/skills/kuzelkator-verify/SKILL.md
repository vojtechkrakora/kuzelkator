---
name: kuzelkator-verify
description: Ověř změnu Kuželkátoru proti akceptačním kritériím, zvol relevantní testy a připrav uživatelské vyzkoušení; nenahrazuje nezávislé review PR ani schválení release.
---

# Ověření změny

Přečti [AGENTS.md](../../../AGENTS.md), specifikaci, skutečný diff a [README](../../../README.md). Neodvozuj úspěch pouze z autorova shrnutí.

1. Urči ověřovanou revizi: branch a HEAD; u necommitnuté práce výslovně uveď také pracovní diff. Starý úspěšný běh není důkaz pro novější změnu.
2. Pro každé AC zvol důkaz pozorovatelného chování. Použij existující testy a doplň pouze chybějící smysluplné scénáře. Při úpravě kódu dodrž implementační pravidla a obnov ověření dotčených kritérií.
3. Vyber kontroly podle dopadu z tabulky níže. Ověř aktuální skripty v package.json; nevymýšlej neexistující lint příkaz. Kontroly, které nelze spustit, označ jako neprovedené s důvodem.
4. U UI zkontroluj relevantní mobilní i desktopové chování, ovládání klávesnicí, čitelnost a loading/empty/error/stale stavy. U sdílení a sezón ověř prioritu URL, reload a nedostupné úložiště. U OBS a screenshot karet ověř rozměry, přetečení, střídání a pravidla obnovování podle specifikace.
5. Zaznamenej pro každé AC: splněno / nesplněno / neověřeno, příkaz nebo postup, výsledek a omezení. Nepřidávej čas či SHA, které jsi neověřil. Oprav známé chyby v autorizovaném rozsahu a zopakuj dotčené kontroly.

| Dopad                     | Vhodné ověření                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doménový výpočet nebo API | Cílené Vitest testy, npm run typecheck; při širším dopadu npm test a npm run build. U změny upstream kontraktu také omezená kontrola živých dat. |
| Interakce, URL, storage   | Relevantní Playwright scénáře proti běžící aplikaci; ruční kontrola změněného toku.                                                              |
| Čistě vizuální změna      | Prohlížeč na telefonu i desktopu, relevantní existující testy; nový unit test není automatická povinnost.                                        |
| Dokumentace a skills      | Struktura, odkazy, konzistence pravidel, formátování a realistické průchody instrukcemi; aplikační build obvykle není potřeba.                   |
| Produkční kandidát        | Úplný postup v docs/RELEASE-PROCESS.md včetně povinného Linux Docker běhu pro přesný SHA.                                                        |

Playwright konfigurace sama server nespouští. Před E2E připrav správnou aplikaci a nastav TEST_BASE_URL pro její port podle README; ověř, že netestuješ jiný checkout. Mockované browser testy nenahrazují kontrolu živých dat. Health endpoint neověřuje ČKA.

Výstup: tabulka AC s důkazy, souhrn kontrol a krátký reprodukovatelný návod pro uživatele. Úspěšné testy nejsou souhlas uživatele s commitem, pushem nebo nasazením.
