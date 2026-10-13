import { z } from "zod";
import type { Match } from "./models";

const pending = new Set([
  "SCHEDULED",
  "PREPARATION",
  "IN_PROGRESS",
  "POSTPONED",
]);
export function nextTeamMatch(matches: Match[], teamId: string, today: string) {
  const related = matches.filter((m) =>
    [m.homeTeam?.id, m.awayTeam?.id].some((id) => String(id) === teamId),
  );
  const unfinished = related.filter((m) => pending.has(m.status));
  const hasUnscheduled = unfinished.some((m) => !m.date);
  const match =
    unfinished
      .filter(
        (m) =>
          m.date &&
          (m.date.slice(0, 10) >= today || m.status === "IN_PROGRESS"),
      )
      .sort(
        (a, b) =>
          Number(b.status === "IN_PROGRESS") -
            Number(a.status === "IN_PROGRESS") ||
          `${a.date!.slice(0, 10)} ${a.time ?? "23:59"}`.localeCompare(
            `${b.date!.slice(0, 10)} ${b.time ?? "23:59"}`,
          ) ||
          a.id - b.id,
      )[0] ?? null;
  return { match, hasUnscheduled };
}

export const teamRecordsSchema = z.object({
  homeAveragePerformance: z.number().nonnegative().nullish(),
  awayAveragePerformance: z.number().nonnegative().nullish(),
});
export type TeamRecords = z.infer<typeof teamRecordsSchema>;
