// Published releases, newest first. See docs/RELEASE-PROCESS.md.
export const releases = [
  {
    version: "0.12.0",
    date: "2026-10-15",
    changes: [
      "OBS panely si přizpůsobíte vlastní šířkou, výškou, velikostí textu a mezerami. Nastavení se uloží i pro další zápasy a výsledek rovnou uvidíte v náhledu.",
      "Čtyři dráhy jsou uspořádané po dvou nad sebou, aby panel zabíral méně místa na šířku. U disciplíny 100 HS zůstávají dvě dráhy.",
      "Celá plocha OBS panelů je neprůhledná pro lepší čitelnost nad obrazem kamery.",
    ],
  },
  {
    version: "0.11.0",
    date: "2026-10-14",
    changes: [
      "V soutěži najdete pořadí hráčů podle průměru i oficiální pořadí ČKA. Můžete přepnout na domácí či venkovní výkony a vyhledat hráče nebo tým.",
      "Na detailu týmu přibyla záložka Příští soupeř s termínem, kuželnou, navigací, formou a průměry soupeře.",
      "U soutěže jsou dostupné oficiální dokumenty a poslední zprávy ČKA.",
    ],
  },
  {
    version: "0.10.1",
    date: "2026-10-13",
    changes: [
      "Bodové skóre ve spodní OBS liště zůstává přesně uprostřed. Pod celkovými kuželkami nově vidíte, o kolik domácí nebo hosté vedou.",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-10-12",
    changes: [
      "Pořadatelé mohou přidat výsledky do přenosu přes tři samostatné OBS panely: domácí, hosté a celkové skóre. Nastavení najdete v sekci Pro pořadatele na konci detailu zápasu.",
      "OBS panely automaticky obnovují výsledky, zobrazují střídání a barevně rozlišují výsledky drah. U disciplíny 100 HS ukazují dvě dráhy.",
      "Tabulka soutěže je přehlednější bez rozklikávacích podrobností. Ukazatele posunu pořadí i odkazy na týmy zůstávají.",
      "Po zavření mobilních oblíbených lze stránku opět posouvat, i při rychlém otevření a zavření.",
    ],
  },
] as const;
