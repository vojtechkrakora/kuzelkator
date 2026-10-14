import { z } from "zod";
import type { Team } from "./models";
import type { PlayerHistory } from "./players";

export const bestPerformancesInput = z.object({
  competitionId: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  seasonId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  discipline: z.enum(["T200", "T120", "T100", "T60", "T40"]),
});
export type BestPerformancesInput = z.infer<typeof bestPerformancesInput>;
export type BestPerformance = {
  rank: number;
  performance: number;
  full: number | null;
  spare: number | null;
  errors: number | null;
  player: NonNullable<PlayerHistory["player"]>;
  team: Team;
  matchId: number;
  date: string | null;
  venue: string | null;
};
export type BestPerformances = { items: BestPerformance[] };

export function eligiblePerformance(
  row: PlayerHistory,
  input: BestPerformancesInput,
) {
  const result = row.teamMatchResult;
  const match = result?.teamMatch;
  const discipline = match?.discipline ?? match?.competition?.discipline;
  return !!(
    row.player &&
    result?.team &&
    row.isEmpty === false &&
    row.substitute === null &&
    row.substituteAtThrow === null &&
    Array.isArray(result.substitutions) &&
    !result.substitutions.some(
      (s) =>
        s.playerOut?.id === row.player!.id || s.playerIn?.id === row.player!.id,
    ) &&
    match?.status === "FINISHED" &&
    match.competition?.id === input.competitionId &&
    match.competition.season?.id === input.seasonId &&
    discipline === input.discipline &&
    typeof row.totalPerformance === "number" &&
    row.totalPerformance > 0
  );
}
