import type { Match } from "./models";

/** Date first, then favourite leagues, league name, start time and stable ID. */
export function orderMatchFeed(
  items: Match[],
  favourites: ReadonlySet<number>,
) {
  return [...items].sort(
    (a, b) =>
      (a.date?.slice(0, 10) ?? "9999").localeCompare(
        b.date?.slice(0, 10) ?? "9999",
      ) ||
      Number(favourites.has(b.competition?.id ?? -1)) -
        Number(favourites.has(a.competition?.id ?? -1)) ||
      (a.competition?.name ?? "Ostatní soutěže").localeCompare(
        b.competition?.name ?? "Ostatní soutěže",
        "cs",
        { numeric: true },
      ) ||
      (a.competition?.id ?? -1) - (b.competition?.id ?? -1) ||
      (a.time ?? "99:99").localeCompare(b.time ?? "99:99") ||
      a.id - b.id,
  );
}

export function groupMatchFeed(items: Match[]) {
  const days = new Map<string, Map<number, { name: string; items: Match[] }>>();
  for (const match of items) {
    const day = match.date?.slice(0, 10) ?? "";
    if (!days.has(day)) days.set(day, new Map());
    const leagues = days.get(day)!;
    const id = match.competition?.id ?? -1;
    if (!leagues.has(id))
      leagues.set(id, {
        name: match.competition?.name ?? "Ostatní soutěže",
        items: [],
      });
    leagues.get(id)!.items.push(match);
  }
  return days;
}

export function isFavouriteMatch(
  match: Match,
  leagues: ReadonlySet<number>,
  teams: ReadonlySet<number>,
) {
  return (
    leagues.has(match.competition?.id ?? -1) ||
    teams.has(match.homeTeam?.id ?? -1) ||
    teams.has(match.awayTeam?.id ?? -1)
  );
}

/** Prefer a pair from one league; keep the sample stable and in feed order. */
export function sampleDayMatches(items: Match[], seed: number) {
  const rank = (id: number) => {
    let value = (id ^ seed) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return (value ^ (value >>> 16)) >>> 0;
  };
  const leagues = new Map<number, Match[]>();
  for (const item of items) {
    if (!item.competition) continue;
    const id = item.competition.id;
    leagues.set(id, [...(leagues.get(id) ?? []), item]);
  }
  const eligible = [...leagues].filter(([, matches]) => matches.length >= 2);
  eligible.sort(([a], [b]) => rank(a) - rank(b) || a - b);
  const candidates = eligible[0]?.[1] ?? items;
  const ids = new Set(
    [...candidates]
      .sort((a, b) => rank(a.id) - rank(b.id) || a.id - b.id)
      .slice(0, 2)
      .map((item) => item.id),
  );
  return items.filter((item) => ids.has(item.id));
}
