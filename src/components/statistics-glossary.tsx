import { Info } from "lucide-react";

const terms = {
  rank: ["# / Pořadí", "Umístění v právě zobrazeném pořadí."],
  matches: [
    "Zápasy",
    "Počet zápasů započítaných do zobrazené tabulky družstev.",
  ],
  outcomes: ["V / R / P", "Počet výher, remíz a proher družstva."],
  tablePoints: [
    "Body družstva v tabulce",
    "Tabulkové body za výsledky utkání podle pravidel soutěže. Nejde o skóre jednotlivého zápasu ani počet poražených kuželek.",
  ],
  movement: [
    "Posun pořadí",
    "Šipka a číslo ukazují směr a počet míst oproti srovnávací tabulce uvedené nad pořadím. Nejde o změnu po každém jednotlivém zápase.",
  ],
  full: [
    "Plné",
    "Počet kuželek poražených při hře do plných, kdy se před každým hodem staví celá sestava kuželek.",
  ],
  spare: [
    "Dorážka",
    "Počet kuželek poražených při dorážení zbývajících kuželek. Po shození celé sestavy se staví znovu.",
  ],
  errors: [
    "Chyby",
    "Počet hodů bez poražené kuželky evidovaných ve výsledku. V tabulce průměrů jde o průměr chyb, nikoli jejich součet.",
  ],
  total: ["Celkem / Kuželky", "Celkový výkon: plné a dorážka dohromady."],
  playerPoints: [
    "Body hráče",
    "Body získané hráčem v souboji se soupeřem, které se započítávají do skóre družstva. Ve statistikách jde o jejich součet za zvolený kontext.",
  ],
  setPoints: [
    "Dílčí body",
    "Body za jednotlivé dílčí souboje na drahách. Jsou oddělené od výsledného bodu hráče za celý souboj.",
  ],
  average: [
    "Průměr / Průměr výkonů",
    "Součet započítaných výkonů dělený jejich počtem. Například 600 a 620 na jedné kuželně a 550 na druhé: (600 + 620 + 550) ÷ 3 = 590.",
  ],
  venueAverage: [
    "Průměr průměrů",
    "Nejprve průměr na každé kuželně, pak průměr těchto hodnot. Každá kuželna má stejnou váhu. Ve stejném příkladu: (610 + 550) ÷ 2 = 580.",
  ],
  officialAverage: [
    "Průměr v pořadí ČKA",
    "Průměr přebíraný z oficiální hráčské tabulky pro vybranou soutěž, kolo a pohled. Výběr řazení určuje, zda vidíte pořadí podle průměru, nebo oficiální pořadí ČKA.",
  ],
  starts: [
    "Starty / Odehrané zápasy",
    "Počet startů evidovaný ČKA v daném kontextu. Nemusí se shodovat s počtem samostatných výkonů v grafu, který vynechává střídání a nedohrané zápasy.",
  ],
  position: [
    "Pozice v sestavě",
    "Pořadí, na kterém hráč nastoupil v družstvu, nikoli číslo dráhy ani umístění v žebříčku.",
  ],
  homeAway: [
    "Doma / Venku",
    "Rozlišení podle domácí nebo hostující role družstva v utkání, nikoli podle adresy konkrétní kuželny.",
  ],
  missing: [
    "Pomlčka —",
    "Údaj není dostupný. Nula je skutečná zveřejněná hodnota a nezaměňujeme ji s chybějícím údajem.",
  ],
} as const;
export type StatisticTerm = keyof typeof terms;
export function StatisticsGlossary({
  context,
  items,
}: {
  context: string;
  items: StatisticTerm[];
}) {
  return (
    <details className="statistics-glossary">
      <summary aria-label={`Vysvětlivky: ${context}`}>
        <Info size={16} aria-hidden="true" /> Vysvětlivky
      </summary>
      <dl>
        {items.map((key) => (
          <div key={key}>
            <dt>{terms[key][0]}</dt>
            <dd>{terms[key][1]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
