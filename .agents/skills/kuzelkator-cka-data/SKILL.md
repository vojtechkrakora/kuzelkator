---
name: kuzelkator-cka-data
description: Ověř data ČKA pro statistiky, pořadí, střídání, sezóny nebo nové API dotazy v Kuželkátoru; použij při změně datového významu či integrace, ne pro čistě vizuální úpravu.
---

# Datový kontrakt ČKA

Přečti [AGENTS.md](../../../AGENTS.md) a specifikaci změny. Vstupem je konkrétní metrika nebo datový požadavek; výstupem je doložený datový kontrakt v téže specifikaci.

## Kde začít

- [models.ts](../../../src/domain/models.ts): hranice dat a Zod schémata.
- [cka.ts](../../../src/server/cka.ts) a [cache.ts](../../../src/server/cache.ts): upstream dotazy, stránkování, limity, deduplikace a stale fallback.
- [route.ts](../../../src/app/api/data/route.ts): povolené aplikační dotazy.
- Relevantní výpočet v src/domain, služba v src/server a jejich testy. Historické API poznámky v ARCHITECTURE.md mají datum; nejsou dokladem aktuální dostupnosti.

## Postup

1. Rozliš oficiální údaj ČKA a odvozenou metriku aplikace. U výpočtu definuj jednotky, jmenovatel, zaokrouhlení, shody, časový/sezónní rozsah a filtry. Názvy podobných polí nejsou důkaz stejného významu.
2. U nového nebo nejistého kontraktu zkontroluj aktuální [veřejnou dokumentaci ČKA](https://kuzelky.cz/api/docs/) a malý reprezentativní vzorek odpovědí. Použij veřejné read-only API přes existující adaptér, kde to jde; neprováděj plošný sběr sezón. Zaznamenej endpoint, parametry, datum, význam polí a omezení. Neukládej přihlašovací údaje ani zbytečná osobní data.
3. Zkontroluj dostupné include vztahy, stránkování a úplnost výsledku. Zahrň relevantní hraniční případy: střídání, nedohraný zápas, kontumaci, předehrávku/dohrávku, chybějící kuželnu, více týmů hráče, HOME/AWAY/ALL. Pravidla odvozuj ze specifikace a ověřených zdrojů, ne z univerzálního předpokladu.
4. Rozliš 0, null, chybějící pole a prázdnou kolekci. Při nedostatečných datech navrhni označení neznámé hodnoty nebo nezobrazení metriky. Nespočítej zdánlivě přesný souhrn z neúplného vzorku.
5. Posuď počet upstream dotazů, souběh, cache klíče, TTL, ETag, cooldown a stale metadata podle existujícího kódu. Vyhni se N+1 dotazům; drahá data načítej až při potřebě. Nedovol libovolné upstream URL ani neobcházej limity při chybách.
6. Připrav malé syntetické nebo minimalizované fixtures a testy pro význam dat, chybějící hodnoty a regresi. Mock test neprokazuje dostupnost živého API. Při nedostupném zdroji uveď neověřené předpoklady a pokračuj jen v práci, která na nich nezávisí.

Zapiš do specifikace rozhodnutí „podloženo / s omezením / zatím neověřeno“, důkazy, chování při nedostatku dat a plán validace. Samotný datový průzkum neopravňuje změnit produktové chování.
