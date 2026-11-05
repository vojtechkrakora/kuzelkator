# Ukázka: známá a neznámá kvalifikace hráče

Stav: vzdělávací příklad podle existující implementace, ne aktivní zadání. Nejde o nové schválení chování ani aktuálně provedenou validaci.

## Problém a rozsah

V odvozeném pořadí podle průměru chceme rozlišit splnění minima odehraných kuželen a neznámou kvalifikaci. Tato ukázka pokrývá pouze výpočet kvalifikace; nemění oficiální pořadí ČKA ani nepopisuje celé UI.

## Datový kontrakt

Výchozí chování je v [competition-player-standings.ts](../../../src/domain/competition-player-standings.ts). Pro tým a vybraný pohled ALL/HOME/AWAY se počítají různé kuželny z dokončených zápasů dané soutěže do vybraného kola včetně. Minimum je ceil(3 × počet kuželen / 5). Údaj venuesPlayed hráče se porovná s minimem. Toto je popis kódu, nikoli nezávislé ověření významu živých dat ČKA.

## Akceptační kritéria

| ID    | Situace                                                                 | Očekávaný výsledek                                          | Ověření                             |
| ----- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| AC-01 | Tým má 4 různé odehrané kuželny, hráč má venuesPlayed = 3.              | Minimum je 3 a kvalifikace splněna. Hráč se 2 ji nesplňuje. | Doménový test hranice.              |
| AC-02 | Tým hrál opakovaně na téže kuželně.                                     | Kuželna se započte jednou.                                  | Doménový test duplicity.            |
| AC-03 | Relevantní dokončený zápas nemá venue.id nebo hráči chybí venuesPlayed. | Kvalifikace je neznámá, nikoli nesplněná nebo nulová.       | Test obou chybějících údajů zvlášť. |
| AC-04 | Zápas je nedokončený, z budoucího kola nebo jiné soutěže.               | Neovlivní množinu odehraných kuželen.                       | Doménové scénáře vyloučení.         |

## Plán a ověření

Při skutečné změně nejdříve porovnej aktuální implementaci a [player-qualification.test.ts](../../../tests/player-qualification.test.ts), ověř relevantní datové předpoklady a doplň chybějící scénář. Nepiš nový výpočet pouze kvůli této ukázce.

| AC             | Stav                              | Důkaz                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------- |
| AC-01 až AC-04 | neověřeno v rámci tohoto příkladu | Odkaz na existující test není důkaz jeho aktuálního spuštění. |
