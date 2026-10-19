// Published releases, newest first. See docs/RELEASE-PROCESS.md.
export const releases = [
  {
    version: "0.15.0",
    date: "2026-10-19",
    changes: [
      "Výsledky hráčů jsou v detailu zápasu přehledně proti sobě, hned pod hlavičkou. Vítězné výkony mají zelený podklad, nejvyšší úplný výkon zlatý.",
      "Klepnutím na dvojici rozbalíte jednotlivé dráhy, plné, dorážku, chyby, střídání a odkazy na profily hráčů.",
      "Všechny duely lze rozbalit nebo sbalit najednou. Vysvětlivky a další ovládání najdete pod výsledky; samostatná karta pro screenshot zůstává zachovaná.",
    ],
  },
  {
    version: "0.14.0",
    date: "2026-10-16",
    changes: [
      "Vedle sdílení v detailu zápasu najdete ikonku obrázku. Otevře kompaktní kartu se skóre a výsledky hráčů pro screenshot na sociální sítě.",
      "Výkony jsou vedle jmen skutečných soupeřů. Vítězné výkony mají zelené podbarvení, nejvyšší úplný výkon zlaté podbarvení a pohár.",
      "Karta zachovává střídání a půlbody, uvádí průběžný stav i čas dat a během pořizování screenshotu se sama nemění.",
    ],
  },
  {
    version: "0.13.0",
    date: "2026-10-16",
    changes: [
      "U soutěže si můžete otevřít nejlepší samostatné výkony sezóny a přejít na hráče nebo zápas. Přehled nezahrnuje střídání ani nedohraná utkání.",
      "Zápas, hráče, tým i vybraný přehled výsledků snadno nasdílíte nebo zkopírujete odkaz. Odkaz zachová vybrané datum a soutěžní kontext.",
      "Při procházení hráčů si aplikace pamatuje zvolenou sezónu po dobu otevřené relace prohlížeče.",
      "U tabulek a statistik najdete rozbalovací vysvětlivky zkratek, bodů a průměrů, pohodlně dostupné i na telefonu.",
      "Přes verzi v zápatí otevřete tento přehled novinek a oprav v jednotlivých vydáních.",
    ],
  },
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
