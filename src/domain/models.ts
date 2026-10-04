import { z } from "zod";

export const teamSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string().nullish(),
  club: z
    .object({ id: z.number().int(), logo: z.string().nullish() })
    .nullish(),
});
export const competitionSchema = z.object({
  season: z.object({ id: z.number().int() }).nullish(),
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  discipline: z.string().optional(),
  category: z.string().optional(),
  regions: z
    .array(z.object({ id: z.number().int(), name: z.string() }))
    .optional(),
});
export const seasonSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  active: z.boolean(),
});
const score = z.number().nullable().optional();
export const playerSchema = z.object({
  id: z.number().int(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
});
export const playerResultSchema = z.object({
  position: z.number(),
  totalFull: score,
  totalSpare: score,
  totalErrors: score,
  totalPerformance: score,
  setPoints: score,
  teamPoints: score,
  isEmpty: z.boolean().optional(),
  player: playerSchema.nullish(),
  substitute: playerSchema.nullish(),
  substituteAtThrow: z.number().int().nullish(),
  laneResults: z
    .array(
      z.object({
        laneNumber: z.number().int(),
        full: score,
        spare: score,
        errors: score,
        total: score,
        setPoints: score,
      }),
    )
    .optional(),
});
const resultSchema = z.object({
  isHome: z.boolean(),
  teamPoints: score,
  totalPerformance: score,
  totalFull: score,
  totalSpare: score,
  totalErrors: score,
  totalSetPoints: score,
  playerResults: z.array(playerResultSchema).optional(),
  substitutions: z
    .array(
      z.object({
        id: z.number().int(),
        throwNumber: z.number().int().nullish(),
        playerOut: playerSchema.nullish(),
        playerIn: playerSchema.nullish(),
      }),
    )
    .optional(),
});
export const matchSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  round: z.number().nullable(),
  status: z.string(),
  discipline: z.string().nullable().optional(),
  homeTeam: teamSchema.nullish(),
  awayTeam: teamSchema.nullish(),
  competition: competitionSchema.nullish(),
  venue: z
    .object({ name: z.string(), city: z.string().nullable().optional() })
    .nullish(),
  results: z.array(resultSchema).optional(),
});
export const standingSchema = z.object({
  position: z.number(),
  matches: z.number(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  tablePoints: z.number(),
  averagePerformance: z.number().nullable(),
  team: teamSchema,
});
export const collection = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int().nonnegative() });
export type Team = z.infer<typeof teamSchema>;
export type Match = z.infer<typeof matchSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Standing = z.infer<typeof standingSchema>;
export type Resource<T> = { data: T; checkedAt: string; stale: boolean };

export function playerName(
  player: z.infer<typeof playerSchema> | null | undefined,
) {
  return (
    [player?.firstName, player?.lastName].filter(Boolean).join(" ").trim() ||
    "Jméno není k dispozici"
  );
}

export function resultFor(match: Match, home: boolean) {
  return match.results?.find((result) => result.isHome === home);
}
export function statusLabel(status: string) {
  return (
    (
      {
        FINISHED: "Dohráno",
        IN_PROGRESS: "Probíhá",
        SCHEDULED: "Naplánováno",
        PREPARATION: "Příprava",
        FORFEIT: "Kontumace",
      } as Record<string, string>
    )[status] ?? "Stav neuveden"
  );
}
