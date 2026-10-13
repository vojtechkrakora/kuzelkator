import { z } from "zod";
import { playerSchema, teamSchema } from "./models";
export const competitionPlayerStandingSchema = z.object({
  round: z.number().int().positive(),
  type: z.enum(["ALL", "HOME", "AWAY"]),
  position: z.number().int(),
  matches: z.number().int().nonnegative(),
  averagePerformance: z.number().nullish(),
  teamPointsWon: z.number().nullish(),
  player: playerSchema,
  team: teamSchema,
});
export type CompetitionPlayerStanding = z.infer<
  typeof competitionPlayerStandingSchema
>;
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
          : value == null
            ? null
            : rank,
    };
  });
}
