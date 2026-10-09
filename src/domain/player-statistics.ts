import { z } from "zod";
import { competitionSchema, playerSchema, teamSchema } from "./models";
import type { PlayerHistory } from "./players";

const average = z.number().nullable();
export const playerStandingSchema = z.object({
  team: teamSchema,
  competition: competitionSchema,
  matches: z.number(),
  venuesPlayed: z.number(),
  teamPointsWon: z.number(),
  setPointsWon: z.number(),
});
export const playerAggregateSchema = z.object({
  player: playerSchema,
  type: z.enum(["TOTAL", "FULL", "SPARE", "ERRORS"]),
  matches: z.number(),
  substituteStarts: z.number(),
  averagePerformance: average,
  averageResult: average,
  homeAverage: average,
  awayAverage: average,
  positionStarts: z.union([
    z.record(z.string(), z.number()),
    z
      .array(z.never())
      .length(0)
      .transform(() => ({}) as Record<string, number>),
  ]),
});
export type PlayerAggregate = z.infer<typeof playerAggregateSchema>;
export type PlayerStatistics = z.infer<typeof playerStandingSchema> & {
  aggregates: PlayerAggregate[];
};
export const statMetrics = [
  { type: "TOTAL", label: "Celkem", field: "totalPerformance" },
  { type: "FULL", label: "Plné", field: "totalFull" },
  { type: "SPARE", label: "Dorážka", field: "totalSpare" },
  { type: "ERRORS", label: "Chyby", field: "totalErrors" },
] as const;

/** Shared substitute results must never be treated as an individual's performance. */
export function completePlayerPerformances(
  history: PlayerHistory[],
  playerId: number,
  stats: PlayerStatistics,
) {
  return history
    .filter((r) => {
      const result = r.teamMatchResult;
      const match = result?.teamMatch;
      return (
        r.player?.id === playerId &&
        !r.isEmpty &&
        !r.substitute &&
        r.substituteAtThrow == null &&
        !result?.substitutions?.some(
          (s) => s.playerOut?.id === playerId || s.playerIn?.id === playerId,
        ) &&
        match?.status === "FINISHED" &&
        result?.team?.id === stats.team.id &&
        match.competition?.id === stats.competition.id &&
        typeof r.totalPerformance === "number"
      );
    })
    .sort((a, b) =>
      (a.teamMatchResult?.teamMatch.date ?? "").localeCompare(
        b.teamMatchResult?.teamMatch.date ?? "",
      ),
    );
}

export type PlayerAverageView = "all" | "home" | "away";

/** A zero TOTAL side average is the API's missing-performance sentinel.
 * Use TOTAL to distinguish that from a genuine zero in errors/spares.
 */
export function teamPlayerAverage(
  row: PlayerAggregate | undefined,
  total: PlayerAggregate | undefined,
  view: PlayerAverageView,
): number | null {
  if (!row || row.matches <= 0) return null;
  if (view === "all") return row.averageResult;
  const field = view === "home" ? "homeAverage" : "awayAverage";
  if (
    !total ||
    total.matches <= 0 ||
    !(total[field] != null && total[field] > 0)
  )
    return null;
  return row[field];
}
