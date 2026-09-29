import type { Competition } from "./models";

export function searchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs")
    .trim();
}
export const levels = [
  ["all", "Všechny úrovně"],
  ["district", "Okresní"],
  ["regional", "Krajské"],
  ["division", "Divize"],
  ["national", "Ligové"],
] as const;
// The API distinguishes league/regional competitions, but not regional tiers.
// Infer only familiar names; unfamiliar competitions remain in “all”.
export function competitionLevel(item: Competition): string {
  const name = searchText(item.name);
  if (item.category === "LEAGUE_COMPETITION") return "national";
  if (/\bdivize\b/.test(name)) return "division";
  if (/\bop\b|okresni|prebor domazlicka|sdruzeny prebor/.test(name))
    return "district";
  if (/krajsk|mistrovstvi prahy|vychodocesk.*(prebor|soutez)/.test(name))
    return "regional";
  return "other";
}
export function discoverCompetitions(
  items: Competition[],
  area: string,
  level: string,
  query: string,
) {
  const words = searchText(query).split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (!area || item.regions?.some((region) => String(region.id) === area)) &&
      (level === "all" || competitionLevel(item) === level) &&
      words.every((word) =>
        searchText(
          [
            item.name,
            ...(item.regions ?? []).map((region) => region.name),
          ].join(" "),
        ).includes(word),
      ),
  );
}
