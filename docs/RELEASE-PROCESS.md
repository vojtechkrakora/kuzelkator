# Vydávání Kuželkátoru

Cílem je stabilní provoz během zápasů a možnost průběžně připravovat změny bez každodenního nasazování. Používáme jediný produkční web na Renderu. Testování probíhá lokálně v Dockeru; nezřizujeme testovací web ani náhledové služby pro PR na Renderu.

## Větve a schvalování

- `main` obsahuje schválená vydání. Produkce sleduje pouze tuto větev. Skutečně nasazenou revizi ověřujeme samostatně, protože nasazení může selhat.
- `develop` shromažďuje změny pro příští vydání. Její změny nespouštějí produkční nasazení.
- Běžné změny vznikají ve větvích `feature/<popis>` nebo `bug/<popis>` založených z `develop`. Jejich PR míří do `develop`.
- Produkční vydání má vlastní PR `develop` → `main`. Kritická oprava má výjimečně PR z větve `bug/<popis>` založené z `main` přímo do `main`.

Před každým commitem a pushem musí uživatel ověřit aktuální změny a výslovně je schválit. Každé PR vyžaduje nezávislou kontrolu agentem s jiným modelem podle AGENTS.md a úspěšné relevantní kontroly. To platí i pro dokumentaci, přípravu verze, vydání a synchronizaci větví.

Schválení commitu a pushe není schválení nasazení. Před sloučením do `main` uživatel navíc výslovně schválí vydání konkrétní otestované revize. Pokud se kandidát změní, aktualizujeme kontroly i nezávislou revizi a vyžádáme nové ověření uživatelem.

## Termín vydání

Běžně vydáváme nejvýše jednou týdně, přednostně v úterý v časovém pásmu Europe/Prague. Předem zkontrolujeme zápasy a vybereme klidný čas. Termín je možnost, nikoli automatický časovač: pokud změny nejsou připravené nebo ověřené, vydání vynecháme.

Od pátku 00:00 do neděle 23:59 včetně neprovádíme běžná produkční nasazení. Ve stejném období neplánujeme provozní změny vyžadující restart aplikace. Výjimkou je kritická oprava podle postupu níže. Tento režim omezuje riziko způsobené našimi změnami; nezaručuje dostupnost Renderu ani ČKA API.

## Běžná práce během týdne

1. Z aktuálního `develop` založíme větev pro jednu změnu.
2. Změnu implementujeme a provedeme relevantní kontroly. Uživatelské změny předvedeme lokálně, zejména na telefonu.
3. Po ověření a výslovném souhlasu uživatele provedeme commit, push a otevřeme PR do `develop`.
4. Nezávislý agent zkontroluje aktuální revizi; záznam kontroly uložíme do GitHub PR podle AGENTS.md. Po schválení a úspěšných kontrolách lze PR sloučit do `develop`.

Tyto kroky nemění produkci a běžná PR nezvyšují verzi aplikace.

## Příprava a vydání verze

1. Vybereme dokončené změny v `develop` a sestavíme stručný český seznam změn. Nedokončenou práci ponecháváme mimo tuto větev; pokud obsahuje blokující problém, vydání odložíme nebo problém vyřešíme přes PR.
2. Na větvi `feature/release-<verze>` z `develop` zvýšíme verzi v `package.json` i `package-lock.json`. Toto přípravné PR projde stejným ověřením uživatelem a nezávislou kontrolou jako ostatní PR a sloučí se do `develop`.
3. Otevřeme release PR `develop` → `main` s verzí, seznamem změn, výsledky kontrol a případnými omezeními. Po dobu ověřování do `develop` neslučujeme další změny. Další práci lze připravovat v samostatných větvích.
4. Otestujeme přesný head commit release PR lokálně v Dockeru. Nezávislý agent zkontroluje celé vydání proti `main`, včetně verze a výsledků kontrol. Před nasazením znovu ověříme, že se head PR ani cílová větev nezměnily; při změně kandidáta kontroly a schválení obnovíme.
5. Uživatel ověří kandidáta a výslovně schválí jeho vydání s uvedením verze a commit SHA. Teprve potom lze release PR sloučit do `main` a nasadit. Pokud Render automaticky nasazuje z `main`, samotné sloučení už představuje pokyn k nasazení.
6. Ověříme dokončení nasazení, skutečný nasazený SHA, verzi v aplikaci, dostupnost a základní průchod produkcí. Do release PR zaznamenáme verzi, nasazený SHA, čas nasazení s časovým pásmem a výsledek ověření.
7. Přes zkontrolované synchronizační PR `main` → `develop` přeneseme historii vydání zpět, pokud se větve rozešly. Synchronizace stejného vydání nezvyšuje verzi. Poté obnovíme běžné slučování do `develop`.

Verzi zvyšujeme jednou za celé produkční vydání podle nejsilnější změny: patch pro opravy, dokumentaci a malé úpravy; minor pro nové zpětně kompatibilní funkce; major pro nekompatibilní změny. Kritická oprava má vlastní zvýšení verze. Nezvyšujeme ji znovu při synchronizaci větví nebo opakovaném sestavení stejného kandidáta.

## Lokální ověření

Na přesné revizi kandidáta provedeme:

```sh
npm ci
npm run typecheck
npm test
npm run build
KUZELKATOR_PORT=43128 docker compose -p kuzelkator-release-check up --build -d
TEST_BASE_URL=http://localhost:43128 npm run test:e2e
```

Docker daemon musí běžet a pro browser testy musí být nainstalovaný Playwright Chromium, případně lze použít nastavení pro Chrome popsané v README. Používáme stejný Docker context pro spuštění i zastavení. Port 43128 a samostatný Compose projekt umožňují ponechat jiné kontejnery spuštěné; pokud je port obsazený, zvolíme jiný a upravíme i adresu testů.

V prohlížeči otevřeme [lokálního kandidáta](http://localhost:43128). Zkontrolujeme přehled zápasů, datum a filtry, oblíbené, detail zápasu, týmu a hráče, tabulky a konkrétní změněné funkce. Vyzkoušíme úzký telefonní displej i desktop. Browser testy používají mockovaná data, proto zvlášť ověříme i načtení skutečných dat ČKA. Oblíbené jsou vázané na původ stránky, takže jiný port má vlastní seznam.

Po ověření ukončíme pouze tento testovací projekt:

```sh
docker compose -p kuzelkator-release-check down
```

Lokální kontrola nenahrazuje ověření nasazené aplikace v prostředí Renderu. Pokud kontrolu nelze dokončit, uvedeme omezení a kandidáta nepovažujeme za připraveného k běžnému vydání.

## Kritická oprava a návrat k funkční verzi

Kritická oprava řeší například nefunkční přehled nebo detail zápasu, zásadně chybné výsledky způsobené aplikací či bezpečnostní problém. Nová funkce nebo drobná vizuální úprava počká na běžné vydání.

Opravnou větev založíme z aktuálního `main`, nikoli z rozpracovaného `develop`. Zahrneme pouze nezbytnou opravu a odpovídající zvýšení verze. Provedeme relevantní testy, lokální Docker kontrolu, ověření uživatelem před commitem a pushem a nezávislou kontrolu PR. Nasazení i během pátečního až nedělního zákazu vyžaduje výslovný souhlas uživatele s kritickým vydáním. Po nasazení přeneseme opravu i verzi do `develop` přes PR; případné konflikty vyřešíme před dalším vydáním.

Pokud nové vydání způsobí vážnou regresi, navrhneme návrat k poslední známé funkční nasazené revizi. Po explicitním schválení uživatelem provedeme návrat, ověříme produkci a zaznamenáme nasazený SHA i důvod. Nepřepisujeme historii Git větví. Pokud produkce po návratu neodpovídá `main`, zaznamenáme tento stav a připravíme opravné nebo revertovací PR; další běžné vydání počká na vyřešení. Konkrétní možnost návratu ověříme v aktuálním nastavení Renderu před nasazením, nespoléháme na neověřenou dostupnost starého artefaktu.

## Jednorázové zavedení

Tento dokument popisuje dohodnutý režim. Jeho vytvoření samo nemění nastavení GitHubu ani Renderu.

- Ověřit aktuální produkční SHA a stav `main`. Po schválení vytvořit vzdálený `develop` ze schváleného `main`; první dokumentační větev tohoto přechodu proto může vycházet z `main`, její běžné PR už bude cílit do `develop`.
- Ověřit, že jediná existující produkční služba Renderu sleduje výhradně `main` a nevytváří PR preview služby. Nepřidávat další hostovaný web.
- Zkontrolovat automatické nasazování: současný Blueprint obsahuje `autoDeployTrigger: commit` a neurčuje větev. Pokud automatické nasazování ponecháme, schválení produkčního vydání musí vždy předcházet merge do `main`. Živá nastavení nelze dovodit pouze ze souboru v repozitáři.
- Nastavit či ověřit ochranu `main` a `develop`, vyžadované PR a dostupné kontroly. Nezávislou kontrolu a schválení vydání nadále evidovat podle AGENTS.md; samotná ochrana větví nedokazuje jejich splnění.
- Při zakládání PR vždy výslovně určit cílovou větev, aby výchozí nastavení GitHubu omylem neposlalo běžnou změnu do produkce.

Provozní nastavení a vytvoření vzdálených větví provedeme jako samostatný schválený krok. První běžné vydání zahrnující tuto dokumentaci už použije nové pravidlo: jedno zvýšení verze za celé vydání.
