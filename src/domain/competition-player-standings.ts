import { z } from "zod";
import { playerSchema, teamSchema, type Match } from "./models";
export const competitionPlayerStandingSchema = z.object({
  round: z.number().int().positive(),
  type: z.enum(["ALL", "HOME", "AWAY"]),
  position: z.number().int(),
  matches: z.number().int().nonnegative(),
  venuesPlayed: z.number().int().nonnegative().nullish(),
  averagePerformance: z.number().nullish(),
  teamPointsWon: z.number().nullish(),
  player: playerSchema,
  team: teamSchema,
});
export type CompetitionPlayerStanding = z.infer<
  typeof competitionPlayerStandingSchema
> & { qualification?: PlayerQualification | null };
export type PlayerQualification = {
  teamVenuesPlayed: number;
  requiredVenues: number;
  eligible: boolean;
};

/** Distinct actually played venues; a postponed fixture counts only after completion. */
export function qualifyCompetitionPlayers(
  items: CompetitionPlayerStanding[],
  matches: Match[],
  competitionId: number,
  round: number,
  type: "ALL" | "HOME" | "AWAY",
): CompetitionPlayerStanding[] {
  return items.map((row) => {
    const venues = new Set<number>();
    let unknown = false;
    for (const match of matches) {
      if (
        match.competition?.id !== competitionId ||
        match.status !== "FINISHED" ||
        match.round == null ||
        match.round > round
      )
        continue;
      const home = match.homeTeam?.id === row.team.id;
      const away = match.awayTeam?.id === row.team.id;
      if (
        (!home && !away) ||
        (type === "HOME" && !home) ||
        (type === "AWAY" && !away)
      )
        continue;
      if (match.venue?.id == null) unknown = true;
      else venues.add(match.venue.id);
    }
    const requiredVenues = Math.ceil((venues.size * 3) / 5);
    return {
      ...row,
      qualification:
        unknown || venues.size === 0 || row.venuesPlayed == null
          ? null
          : {
              teamVenuesPlayed: venues.size,
              requiredVenues,
              eligible: row.venuesPlayed >= requiredVenues,
            },
    };
  });
}
export type CompetitionPlayerTable = {
  items: CompetitionPlayerStanding[];
  total: number;
  round: number | null;
  latestStartedRound: number | null;
};

export type PlayerRankingOrder = "average" | "official";
export function orderCompetitionPlayers(
  items: CompetitionPlayerStanding[],
  order: PlayerRankingOrder,
) {
  const average = (row: CompetitionPlayerStanding) =>
    row.matches > 0 ? (row.averagePerformance ?? null) : null;
  const rows = [...items].sort((a, b) => {
    if (order === "average") {
      const group = (row: CompetitionPlayerStanding) =>
        row.qualification === null
          ? 2
          : row.qualification?.eligible === false
            ? 1
            : 0;
      if (group(a) !== group(b)) return group(a) - group(b);
      const aa = average(a),
        bb = average(b);
      if (aa == null && bb != null) return 1;
      if (aa != null && bb == null) return -1;
      if (aa != null && bb != null && aa !== bb) return bb - aa;
    }
    return (
      (a.position > 0 ? a.position : Infinity) -
        (b.position > 0 ? b.position : Infinity) ||
      a.player.id - b.player.id ||
      a.team.id - b.team.id
    );
  });
  let previous: number | null = null,
    rank = 0;
  return rows.map((row, index) => {
    const value = average(row);
    if (value != null && value !== previous) rank = index + 1;
    previous = value;
    return {
      ...row,
      displayPosition:
        order === "official"
          ? row.position > 0
            ? row.position
            : null
          : value == null ||
              row.qualification === null ||
              row.qualification?.eligible === false
            ? null
            : rank,
    };
  });
}
